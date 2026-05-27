const { app, safeStorage } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');

const storeVersion = 1;

function getStorePath() {
  return path.join(app.getPath('userData'), 'provider-settings.json');
}

function canEncrypt() {
  return Boolean(safeStorage?.isEncryptionAvailable?.());
}

function encryptSecret(value) {
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

function decryptSecret(secret) {
  if (!secret?.value) return '';

  if (secret.mode === 'safeStorage') {
    return safeStorage.decryptString(Buffer.from(secret.value, 'base64'));
  }

  if (secret.mode === 'base64-fallback') {
    return Buffer.from(secret.value, 'base64').toString('utf8');
  }

  return '';
}

function maskSecret(value) {
  const key = String(value || '');
  if (!key) return '';
  if (key.length <= 8) return `${key.slice(0, 2)}****${key.slice(-2)}`;
  return `${key.slice(0, 4)}****${key.slice(-4)}`;
}

async function readStore() {
  try {
    const raw = await fs.readFile(getStorePath(), 'utf8');
    const parsed = JSON.parse(raw);
    return {
      version: parsed.version || storeVersion,
      defaultProviderId: parsed.defaultProviderId || 'local-ffmpeg',
      providers: parsed.providers || {}
    };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return { version: storeVersion, defaultProviderId: 'local-ffmpeg', providers: {} };
  }
}

async function writeStore(store) {
  const filePath = getStorePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify({ ...store, version: storeVersion }, null, 2), 'utf8');
}

function publicConfig(providerId, entry, defaultProviderId) {
  const apiKey = decryptSecret(entry?.secret);
  return {
    providerId,
    configured: Boolean(apiKey) || providerId === 'local-ffmpeg',
    hasApiKey: Boolean(apiKey),
    maskedKey: maskSecret(apiKey),
    modelName: entry?.modelName || '',
    baseUrl: entry?.baseUrl || '',
    lastTestStatus: entry?.lastTestStatus || '',
    lastTestMessage: entry?.lastTestMessage || '',
    lastTestAt: entry?.lastTestAt || '',
    isDefault: defaultProviderId === providerId,
    secureMode: entry?.secret?.mode || (canEncrypt() ? 'safeStorage' : 'base64-fallback')
  };
}

async function getProviderPublicConfig(providerId) {
  const store = await readStore();
  return publicConfig(providerId, store.providers[providerId] || {}, store.defaultProviderId);
}

async function listPublicConfigs(providerIds) {
  const store = await readStore();
  return providerIds.reduce((result, providerId) => {
    result[providerId] = publicConfig(providerId, store.providers[providerId] || {}, store.defaultProviderId);
    return result;
  }, {});
}

async function saveProviderConfig(providerId, input) {
  const store = await readStore();
  const previous = store.providers[providerId] || {};
  const next = {
    ...previous,
    modelName: input.modelName || previous.modelName || '',
    baseUrl: input.baseUrl || '',
    updatedAt: new Date().toISOString()
  };

  if (typeof input.apiKey === 'string' && input.apiKey.trim()) {
    next.secret = encryptSecret(input.apiKey.trim());
  }

  store.providers[providerId] = next;
  if (input.makeDefault) store.defaultProviderId = providerId;
  await writeStore(store);
  return publicConfig(providerId, next, store.defaultProviderId);
}

async function saveTestResult(providerId, result) {
  const store = await readStore();
  const previous = store.providers[providerId] || {};
  const next = {
    ...previous,
    lastTestStatus: result.ok ? 'ok' : 'error',
    lastTestMessage: String(result.message || ''),
    lastTestAt: new Date().toISOString()
  };
  store.providers[providerId] = next;
  await writeStore(store);
  return publicConfig(providerId, next, store.defaultProviderId);
}

async function removeProviderKey(providerId) {
  const store = await readStore();
  const previous = store.providers[providerId] || {};
  delete previous.secret;
  previous.lastTestStatus = '';
  previous.lastTestMessage = '';
  previous.updatedAt = new Date().toISOString();
  store.providers[providerId] = previous;
  await writeStore(store);
  return publicConfig(providerId, previous, store.defaultProviderId);
}

async function setDefaultProvider(providerId) {
  const store = await readStore();
  store.defaultProviderId = providerId;
  await writeStore(store);
  return store.defaultProviderId;
}

async function getApiKey(providerId) {
  const store = await readStore();
  return decryptSecret(store.providers[providerId]?.secret);
}

async function getPrivateProviderConfig(providerId) {
  const store = await readStore();
  const entry = store.providers[providerId] || {};
  return {
    providerId,
    apiKey: decryptSecret(entry.secret),
    modelName: entry.modelName || '',
    baseUrl: entry.baseUrl || '',
    defaultProviderId: store.defaultProviderId
  };
}

async function getDefaultProviderId() {
  const store = await readStore();
  return store.defaultProviderId || 'local-ffmpeg';
}

module.exports = {
  getProviderPublicConfig,
  listPublicConfigs,
  saveProviderConfig,
  saveTestResult,
  removeProviderKey,
  setDefaultProvider,
  getApiKey,
  getPrivateProviderConfig,
  getDefaultProviderId
};
