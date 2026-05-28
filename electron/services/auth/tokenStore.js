const { app, safeStorage } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');

const storeVersion = 1;

function getStorePath() {
  return path.join(app.getPath('userData'), 'auth-tokens.json');
}

function canEncrypt() {
  return Boolean(safeStorage?.isEncryptionAvailable?.());
}

function encryptValue(value) {
  const plain = String(value || '');
  if (!plain) return null;

  if (canEncrypt()) {
    return {
      mode: 'safeStorage',
      value: safeStorage.encryptString(plain).toString('base64')
    };
  }

  return {
    mode: 'base64-fallback',
    value: Buffer.from(plain, 'utf8').toString('base64')
  };
}

function decryptValue(secret) {
  if (!secret?.value) return '';
  if (secret.mode === 'safeStorage') return safeStorage.decryptString(Buffer.from(secret.value, 'base64'));
  if (secret.mode === 'base64-fallback') return Buffer.from(secret.value, 'base64').toString('utf8');
  return '';
}

async function readStore() {
  try {
    const raw = await fs.readFile(getStorePath(), 'utf8');
    const parsed = JSON.parse(raw);
  return {
    version: parsed.version || storeVersion,
      google: parsed.google || null,
      supabase: parsed.supabase || null
    };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return { version: storeVersion, google: null, supabase: null };
  }
}

async function writeStore(store) {
  const filePath = getStorePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify({ ...store, version: storeVersion }, null, 2), 'utf8');
}

async function saveGoogleSession(session) {
  const store = await readStore();
  store.google = {
    profile: session.profile || null,
    scope: session.scope || '',
    expiresAt: session.expiresAt || '',
    accessToken: encryptValue(session.accessToken),
    refreshToken: encryptValue(session.refreshToken)
  };
  await writeStore(store);
}

async function getGoogleSession({ includeSecrets = false } = {}) {
  const store = await readStore();
  if (!store.google) return null;
  const session = {
    profile: store.google.profile || null,
    scope: store.google.scope || '',
    expiresAt: store.google.expiresAt || ''
  };

  if (includeSecrets) {
    session.accessToken = decryptValue(store.google.accessToken);
    session.refreshToken = decryptValue(store.google.refreshToken);
  }

  return session;
}

async function clearGoogleSession() {
  const store = await readStore();
  store.google = null;
  await writeStore(store);
}

module.exports = {
  saveGoogleSession,
  getGoogleSession,
  clearGoogleSession,
  saveSupabaseSession,
  getSupabaseSession,
  clearSupabaseSession,
  canEncrypt
};

async function saveSupabaseSession(session) {
  const store = await readStore();
  store.supabase = {
    profile: session.profile || null,
    user: session.user || null,
    expiresAt: session.expiresAt || '',
    provider: 'supabase-google',
    supabaseUrl: session.supabaseUrl || '',
    anonKey: encryptValue(session.anonKey),
    accessToken: encryptValue(session.accessToken),
    refreshToken: encryptValue(session.refreshToken)
  };
  await writeStore(store);
}

async function getSupabaseSession({ includeSecrets = false } = {}) {
  const store = await readStore();
  if (!store.supabase) return null;
  const session = {
    profile: store.supabase.profile || null,
    user: store.supabase.user || null,
    provider: store.supabase.provider || 'supabase-google',
    supabaseUrl: store.supabase.supabaseUrl || '',
    expiresAt: store.supabase.expiresAt || ''
  };

  if (includeSecrets) {
    session.anonKey = decryptValue(store.supabase.anonKey);
    session.accessToken = decryptValue(store.supabase.accessToken);
    session.refreshToken = decryptValue(store.supabase.refreshToken);
  }

  return session;
}

async function clearSupabaseSession() {
  const store = await readStore();
  store.supabase = null;
  await writeStore(store);
}
