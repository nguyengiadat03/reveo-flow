const apiKeyStore = require('../services/apiKeyStore');
const { listProviderDefinitions, getProviderDefinition } = require('../services/providerRegistry');
const { getProvider } = require('../services/videoProviders');

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function requireProvider(providerId) {
  const id = String(providerId || '');
  const definition = getProviderDefinition(id);
  if (!definition) throw new Error('Nhà cung cấp không hợp lệ.');
  return definition;
}

function sanitizeProviderConfig(input) {
  const value = asObject(input);
  return {
    providerId: String(value.providerId || ''),
    apiKey: typeof value.apiKey === 'string' ? value.apiKey : '',
    modelName: typeof value.modelName === 'string' ? value.modelName : '',
    baseUrl: typeof value.baseUrl === 'string' ? value.baseUrl : '',
    makeDefault: Boolean(value.makeDefault)
  };
}

function publicProvider(definition, config) {
  return {
    ...definition,
    config,
    configured: config.configured,
    hasApiKey: config.hasApiKey,
    maskedKey: config.maskedKey,
    isDefault: config.isDefault,
    lastTestStatus: config.lastTestStatus,
    lastTestMessage: config.lastTestMessage,
    lastTestAt: config.lastTestAt
  };
}

function registerApiSettingsHandlers(ipcMain) {
  ipcMain.handle('api-settings:listProviders', async () => {
    const definitions = listProviderDefinitions();
    const configs = await apiKeyStore.listPublicConfigs(definitions.map((provider) => provider.id));
    return definitions.map((definition) => publicProvider(definition, configs[definition.id]));
  });

  ipcMain.handle('api-settings:getProviderConfig', async (_event, providerId) => {
    const definition = requireProvider(providerId);
    return apiKeyStore.getProviderPublicConfig(definition.id);
  });

  ipcMain.handle('api-settings:saveProviderKey', async (_event, input) => {
    const payload = sanitizeProviderConfig(input);
    requireProvider(payload.providerId);
    return apiKeyStore.saveProviderConfig(payload.providerId, payload);
  });

  ipcMain.handle('api-settings:removeProviderKey', async (_event, providerId) => {
    const definition = requireProvider(providerId);
    return apiKeyStore.removeProviderKey(definition.id);
  });

  ipcMain.handle('api-settings:setDefaultProvider', async (_event, providerId) => {
    const definition = requireProvider(providerId);
    return apiKeyStore.setDefaultProvider(definition.id);
  });

  ipcMain.handle('api-settings:testConnection', async (_event, input) => {
    const payload = sanitizeProviderConfig(input);
    const definition = requireProvider(payload.providerId);
    const provider = getProvider(definition.id);
    if (!provider) throw new Error('Provider adapter không tồn tại.');

    const stored = await apiKeyStore.getPrivateProviderConfig(definition.id);
    const apiKey = payload.apiKey.trim() || stored.apiKey;
    const result = await provider.testConnection(apiKey, {
      baseUrl: payload.baseUrl || stored.baseUrl,
      modelName: payload.modelName || stored.modelName
    });

    await apiKeyStore.saveTestResult(definition.id, result);
    return result;
  });
}

module.exports = { registerApiSettingsHandlers };
