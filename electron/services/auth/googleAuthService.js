const { shell } = require('electron');
const crypto = require('node:crypto');
const { URL, URLSearchParams } = require('node:url');
const tokenStore = require('./tokenStore');
const apiKeyStore = require('../apiKeyStore');
const logger = require('../logger');

const defaultProtocol = 'flowgraph';
const defaultRedirectPath = 'auth/callback';

let currentStatus = {
  status: 'unauthenticated',
  provider: '',
  profile: null,
  message: 'Chưa đăng nhập.',
  capabilities: []
};
let statusListener = null;
let pendingAuth = null;
let authTimeout = null;

function sanitizeError(error, fallback = 'Không thể đăng nhập Google.') {
  return logger.redact(String(error?.message || error || fallback));
}

function emitStatus(patch = {}) {
  currentStatus = { ...currentStatus, ...patch };
  if (typeof statusListener === 'function') statusListener(currentStatus);
  return currentStatus;
}

function normalizeSupabaseUrl(url) {
  const value = String(url || '').trim().replace(/\/+$/, '');
  if (!value) return '';
  if (!/^https:\/\/[a-z0-9.-]+\.supabase\.co$/i.test(value) && !/^http:\/\/127\.0\.0\.1:/i.test(value) && !/^http:\/\/localhost:/i.test(value)) {
    throw new Error('SUPABASE_URL không hợp lệ.');
  }
  return value;
}

function normalizeProtocol(input) {
  return String(input || process.env.APP_DEEP_LINK_PROTOCOL || defaultProtocol)
    .trim()
    .replace('://', '')
    .replace(':', '') || defaultProtocol;
}

function getRedirectUri(protocol) {
  return `${normalizeProtocol(protocol)}://${defaultRedirectPath}`;
}

function getSupabaseConfig(input = {}) {
  const supabaseUrl = normalizeSupabaseUrl(input.supabaseUrl || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '');
  const anonKey = String(input.anonKey || process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
  const protocol = normalizeProtocol(input.protocol);
  return { supabaseUrl, anonKey, protocol, redirectUri: getRedirectUri(protocol) };
}

function base64Url(buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function createPkcePair() {
  const verifier = base64Url(crypto.randomBytes(48));
  const challenge = base64Url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

async function supabaseAuthFetch(config, pathname, options = {}) {
  const response = await fetch(`${config.supabaseUrl}${pathname}`, {
    ...options,
    headers: {
      apikey: config.anonKey,
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    let message = `Supabase Auth HTTP ${response.status}.`;
    try {
      const body = await response.json();
      message = body.error_description || body.msg || body.message || body.error || message;
    } catch {
      // Keep fallback.
    }
    throw new Error(message);
  }

  return response.json();
}

async function exchangeSupabaseCode(config, code, verifier) {
  return supabaseAuthFetch(config, '/auth/v1/token?grant_type=pkce', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_code: code,
      code_verifier: verifier
    })
  });
}

async function refreshSupabaseSession(session) {
  if (!session?.refreshToken) throw new Error('Phiên đăng nhập đã hết hạn.');
  const config = {
    supabaseUrl: normalizeSupabaseUrl(session.supabaseUrl),
    anonKey: session.anonKey
  };
  return supabaseAuthFetch(config, '/auth/v1/token?grant_type=refresh_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: session.refreshToken })
  });
}

function mapSupabaseUser(user) {
  const metadata = user?.user_metadata || {};
  return {
    id: user?.id || '',
    email: user?.email || '',
    name: metadata.full_name || metadata.name || user?.email || 'Google user',
    picture: metadata.avatar_url || metadata.picture || ''
  };
}

async function saveSupabaseSession(config, session) {
  const profile = mapSupabaseUser(session.user);
  await tokenStore.saveSupabaseSession({
    supabaseUrl: config.supabaseUrl,
    anonKey: config.anonKey,
    user: session.user,
    profile,
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: new Date(Date.now() + Number(session.expires_in || 3600) * 1000).toISOString()
  });
  return profile;
}

async function getProviderCapabilities() {
  const gemini = await apiKeyStore.getProviderPublicConfig('gemini-veo');
  return [
    {
      id: 'local-ffmpeg',
      label: 'Local FFmpeg',
      status: 'mock-only',
      message: 'Xuất MP4 offline, không cần credits.'
    },
    {
      id: 'gemini-veo',
      label: 'Gemini / Veo API',
      status: gemini.configured || Boolean(process.env.GEMINI_API_KEY) ? 'ready' : 'missing-api-key',
      message: gemini.configured || Boolean(process.env.GEMINI_API_KEY)
        ? 'Sẵn sàng gọi Gemini/Veo API bằng API key chính thức.'
        : 'Cần Gemini API key hoặc Google Cloud/Vertex AI hợp lệ.'
    },
    {
      id: 'google-flow',
      label: 'Google Flow credits',
      status: 'not-officially-supported',
      message: 'Đăng nhập Google không đồng nghĩa với việc dùng được credits Google Flow. Chưa có API chính thức cho app bên thứ ba.'
    },
    {
      id: 'cloud-backend',
      label: 'Supabase cloud sync',
      status: 'ready',
      message: 'Dùng Supabase Auth/Database để đồng bộ profile, workflow và render job.'
    }
  ];
}

async function getStatus() {
  const stored = await tokenStore.getSupabaseSession({ includeSecrets: true });
  const capabilities = await getProviderCapabilities();
  if (!stored?.profile) {
    return emitStatus({
      status: 'unauthenticated',
      provider: '',
      profile: null,
      message: 'Chưa đăng nhập.',
      capabilities
    });
  }

  const expiresAt = stored.expiresAt ? Date.parse(stored.expiresAt) : 0;
  if (expiresAt && expiresAt - Date.now() < 60000 && stored.refreshToken) {
    try {
      const refreshed = await refreshSupabaseSession(stored);
      const profile = await saveSupabaseSession(stored, refreshed);
      return emitStatus({
        status: 'authenticated',
        provider: 'supabase-google',
        profile,
        message: 'Đã đăng nhập Google qua Supabase.',
        capabilities
      });
    } catch (error) {
      logger.warn('auth', 'Không thể refresh Supabase session.', error);
    }
  }

  return emitStatus({
    status: 'authenticated',
    provider: 'supabase-google',
    profile: stored.profile,
    message: 'Đã đăng nhập Google qua Supabase.',
    capabilities
  });
}

async function loginGoogle(input = {}) {
  let config;
  try {
    config = getSupabaseConfig(input);
    if (!config.supabaseUrl || !config.anonKey) {
      return emitStatus({
        status: 'error',
        provider: 'supabase-google',
        profile: null,
        message: 'Thiếu VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY. Bạn vẫn có thể dùng chế độ local.',
        capabilities: await getProviderCapabilities()
      });
    }
  } catch (error) {
    return emitStatus({
      status: 'error',
      provider: 'supabase-google',
      profile: null,
      message: sanitizeError(error),
      capabilities: await getProviderCapabilities()
    });
  }

  const pkce = createPkcePair();
  const state = base64Url(crypto.randomBytes(24));
  pendingAuth = {
    config,
    verifier: pkce.verifier,
    state,
    startedAt: Date.now()
  };

  if (authTimeout) clearTimeout(authTimeout);
  authTimeout = setTimeout(() => {
    pendingAuth = null;
    emitStatus({
      status: 'error',
      provider: 'supabase-google',
      profile: null,
      message: 'Đăng nhập quá thời gian. Hãy thử lại.',
      capabilities: currentStatus.capabilities
    });
  }, 180000);

  const authUrl = new URL(`${config.supabaseUrl}/auth/v1/authorize`);
  authUrl.search = new URLSearchParams({
    provider: 'google',
    redirect_to: config.redirectUri,
    code_challenge: pkce.challenge,
    code_challenge_method: 's256',
    state
  }).toString();

  emitStatus({
    status: 'authenticating',
    provider: 'supabase-google',
    message: 'Đang mở trình duyệt để đăng nhập Google...',
    capabilities: await getProviderCapabilities()
  });

  await shell.openExternal(authUrl.toString());
  return currentStatus;
}

async function handleCallback(callbackUrl) {
  try {
    if (!pendingAuth) throw new Error('Không có phiên đăng nhập đang chờ.');
    const url = new URL(callbackUrl);
    const error = url.searchParams.get('error') || url.searchParams.get('error_description');
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    if (error) throw new Error(error);
    if (!code) throw new Error('OAuth callback thiếu code.');
    if (state !== pendingAuth.state) throw new Error('OAuth callback state không hợp lệ.');

    const session = await exchangeSupabaseCode(pendingAuth.config, code, pendingAuth.verifier);
    if (!session?.access_token || !session?.user) throw new Error('Supabase không trả về session hợp lệ.');
    const profile = await saveSupabaseSession(pendingAuth.config, session);
    pendingAuth = null;
    if (authTimeout) clearTimeout(authTimeout);
    authTimeout = null;

    return emitStatus({
      status: 'authenticated',
      provider: 'supabase-google',
      profile,
      message: 'Đã đăng nhập Google qua Supabase.',
      capabilities: await getProviderCapabilities()
    });
  } catch (error) {
    pendingAuth = null;
    if (authTimeout) clearTimeout(authTimeout);
    authTimeout = null;
    logger.warn('auth', 'OAuth callback failed.', error);
    return emitStatus({
      status: 'error',
      provider: 'supabase-google',
      profile: null,
      message: sanitizeError(error),
      capabilities: await getProviderCapabilities()
    });
  }
}

async function logout() {
  await tokenStore.clearSupabaseSession();
  await tokenStore.clearGoogleSession();
  return emitStatus({
    status: 'unauthenticated',
    provider: '',
    profile: null,
    message: 'Đã đăng xuất. Workflow local vẫn được giữ nguyên.',
    capabilities: await getProviderCapabilities()
  });
}

async function refresh() {
  return getStatus();
}

function getCurrentUser() {
  return getStatus();
}

function onStatusChanged(callback) {
  statusListener = callback;
}

module.exports = {
  getStatus,
  loginGoogle,
  handleCallback,
  logout,
  refresh,
  getCurrentUser,
  getProviderCapabilities,
  onStatusChanged
};
