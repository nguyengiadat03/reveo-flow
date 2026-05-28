const tokenStore = require('./auth/tokenStore');
const logger = require('./logger');

function sanitizeError(error, fallback = 'Supabase không phản hồi.') {
  return logger.redact(String(error?.message || error || fallback));
}

async function getSession() {
  const session = await tokenStore.getSupabaseSession({ includeSecrets: true });
  if (!session?.accessToken || !session?.supabaseUrl || !session?.anonKey) {
    throw new Error('Bạn cần đăng nhập Google qua Supabase trước.');
  }
  return session;
}

async function supabaseRest(pathname, options = {}) {
  const session = await getSession();
  const response = await fetch(`${session.supabaseUrl}/rest/v1${pathname}`, {
    ...options,
    headers: {
      apikey: session.anonKey,
      Authorization: `Bearer ${session.accessToken}`,
      'Content-Type': 'application/json',
      Prefer: options.prefer || 'return=representation',
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    let message = `Supabase DB HTTP ${response.status}.`;
    try {
      const body = await response.json();
      message = body.message || body.details || message;
    } catch {
      // Keep fallback.
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function ensureProfile() {
  const session = await getSession();
  const profile = session.profile || {};
  const userId = session.user?.id || profile.id;
  if (!userId) throw new Error('Không xác định được user id.');

  await supabaseRest('/profiles?on_conflict=id', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=representation',
    body: JSON.stringify({
      id: userId,
      email: profile.email || session.user?.email || '',
      full_name: profile.name || '',
      avatar_url: profile.picture || '',
      provider: 'google',
      updated_at: new Date().toISOString()
    })
  });

  return { userId, profile };
}

async function ensureWorkspace(name = 'Personal Workspace') {
  const { userId } = await ensureProfile();
  const existing = await supabaseRest(`/workspaces?owner_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`, {
    method: 'GET',
    headers: { Prefer: '' }
  });

  if (Array.isArray(existing) && existing[0]) return existing[0];

  const created = await supabaseRest('/workspaces', {
    method: 'POST',
    body: JSON.stringify({
      owner_id: userId,
      name
    })
  });
  return Array.isArray(created) ? created[0] : created;
}

async function listWorkflows() {
  const { userId } = await ensureProfile();
  return supabaseRest(`/workflows?owner_id=eq.${encodeURIComponent(userId)}&select=id,name,version,created_at,updated_at&order=updated_at.desc`, {
    method: 'GET',
    headers: { Prefer: '' }
  });
}

async function saveWorkflow(input = {}) {
  const workspace = await ensureWorkspace();
  const { userId } = await ensureProfile();
  const name = String(input.name || 'Untitled workflow').slice(0, 120);
  const graphJson = input.graphJson || input.workflow || {};
  const workflowId = typeof input.id === 'string' && input.id ? input.id : undefined;
  const payload = {
    ...(workflowId ? { id: workflowId } : {}),
    workspace_id: workspace.id,
    owner_id: userId,
    name,
    graph_json: graphJson,
    version: String(input.version || graphJson.version || '1.0.0'),
    updated_at: new Date().toISOString()
  };

  const result = await supabaseRest('/workflows', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=representation',
    body: JSON.stringify(payload)
  });
  return Array.isArray(result) ? result[0] : result;
}

async function getWorkflow(workflowId) {
  const id = String(workflowId || '');
  if (!id) throw new Error('Workflow id không hợp lệ.');
  const result = await supabaseRest(`/workflows?id=eq.${encodeURIComponent(id)}&select=*`, {
    method: 'GET',
    headers: { Prefer: '' }
  });
  return Array.isArray(result) ? result[0] : result;
}

async function createRenderJob(input = {}) {
  const { userId } = await ensureProfile();
  const result = await supabaseRest('/render_jobs', {
    method: 'POST',
    body: JSON.stringify({
      workflow_id: input.workflowId || null,
      owner_id: userId,
      provider_id: String(input.providerId || ''),
      model_name: String(input.modelName || ''),
      status: String(input.status || 'queued'),
      progress: Number(input.progress || 0),
      request_json: input.requestJson || {},
      result_url: input.resultUrl || null,
      error_message: input.errorMessage || null
    })
  });
  return Array.isArray(result) ? result[0] : result;
}

module.exports = {
  ensureProfile,
  listWorkflows,
  saveWorkflow,
  getWorkflow,
  createRenderJob,
  sanitizeError
};
