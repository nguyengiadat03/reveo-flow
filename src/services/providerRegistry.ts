import type { VideoProviderDefinition } from './providerTypes';

export function getDefaultProvider(providers: VideoProviderDefinition[]): VideoProviderDefinition | null {
  return providers.find((provider) => provider.isDefault) || providers.find((provider) => provider.id === 'local-ffmpeg') || providers[0] || null;
}

export function getProviderStatusLabel(provider: VideoProviderDefinition): string {
  if (provider.id === 'local-ffmpeg') return 'Mock Only';
  if (provider.lastTestStatus === 'ok') return 'Kết nối OK';
  if (provider.lastTestStatus === 'error') return 'Lỗi kết nối';
  if (!provider.implemented) return 'Chưa hỗ trợ chính thức';
  if (provider.configured) return 'Ready';
  return provider.requiresApiKey ? 'Missing API Key' : 'Ready';
}
