const apiKeyStore = require('../services/apiKeyStore');
const { getProviderDefinition } = require('../services/providerRegistry');
const { getProvider } = require('../services/videoProviders');
const updateService = require('../services/updateService');

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function sanitizeText(value, fallback = '') {
  return String(value || fallback).slice(0, 4000);
}

function sanitizeRenderRequest(input) {
  const value = asObject(input);
  const shot = asObject(value.shot);
  return {
    sceneId: sanitizeText(value.sceneId, `scene-${Date.now()}`).slice(0, 160),
    sceneIndex: Number.isFinite(Number(value.sceneIndex)) ? Number(value.sceneIndex) : 0,
    providerId: sanitizeText(value.providerId, ''),
    modelName: sanitizeText(value.modelName, ''),
    prompt: sanitizeText(value.prompt, value.topic || 'Video workflow'),
    negativePrompt: sanitizeText(value.negativePrompt, ''),
    topic: sanitizeText(value.topic, 'Video workflow'),
    durationSeconds: Number.isFinite(Number(value.durationSeconds || value.duration)) ? Number(value.durationSeconds || value.duration) : 8,
    aspectRatio: value.aspectRatio === '16:9' ? '16:9' : '9:16',
    shot: {
      id: sanitizeText(shot.id, ''),
      title: sanitizeText(shot.title, 'Cảnh video'),
      description: sanitizeText(shot.description, ''),
      action: sanitizeText(shot.action, '')
    },
    character: asObject(value.character),
    voice: asObject(value.voice),
    outfit: asObject(value.outfit),
    background: asObject(value.background),
    assets: Array.isArray(value.assets) ? value.assets.map(asObject).slice(0, 12) : [],
    references: asObject(value.references)
  };
}

function registerVideoRenderHandlers(ipcMain) {
  ipcMain.handle('video:renderScene', async (_event, input) => {
    const request = sanitizeRenderRequest(input);
    const providerId = request.providerId || await apiKeyStore.getDefaultProviderId();
    const definition = getProviderDefinition(providerId);
    if (!definition) throw new Error('Nhà cung cấp render không hợp lệ.');

    const provider = getProvider(providerId);
    if (!provider) throw new Error('Provider adapter không tồn tại.');

    const privateConfig = await apiKeyStore.getPrivateProviderConfig(providerId);
    const apiKey = privateConfig.apiKey;

    if (definition.requiresApiKey && !apiKey) {
      throw new Error(`Thiếu khóa API cho ${definition.shortName || definition.name}. Hãy mở Cấu hình API.`);
    }

    updateService.setUpdateBlocked('Đang render video');
    try {
      return await provider.renderVideo({
        ...request,
        providerId,
        modelName: request.modelName || privateConfig.modelName || definition.models?.[0]?.id || '',
        apiKey,
        providerConfig: privateConfig
      });
    } finally {
      updateService.clearUpdateBlocked();
    }
  });

  ipcMain.handle('video:getRenderStatus', async () => {
    return { status: 'not-tracked', message: 'Provider local render đồng bộ, chưa có job async.' };
  });
}

module.exports = { registerVideoRenderHandlers };
