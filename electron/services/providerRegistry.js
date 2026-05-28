const providerDefinitions = [
  {
    id: 'local-ffmpeg',
    name: 'Local FFmpeg Mock Renderer',
    shortName: 'Local FFmpeg',
    category: 'local',
    requiresApiKey: false,
    supportsImageReference: false,
    supportsAudioReference: false,
    supportsAspectRatio: true,
    supportsDuration: true,
    implemented: true,
    statusLabel: 'Renderer local, không phải AI video thật',
    models: [
      { id: 'ffmpeg-storyboard-v1', name: 'Storyboard MP4 v1' }
    ]
  },
  {
    id: 'gemini-veo',
    name: 'Gemini / Google AI / Veo',
    shortName: 'Gemini/Veo',
    category: 'ai-video',
    requiresApiKey: true,
    supportsImageReference: true,
    supportsAudioReference: false,
    supportsAspectRatio: true,
    supportsDuration: true,
    implemented: true,
    statusLabel: 'Dùng Gemini API chính thức để tạo video Veo',
    models: [
      { id: 'veo-3.1-generate-preview', name: 'Veo 3.1 Preview' },
      { id: 'veo-3.1-fast-generate-preview', name: 'Veo 3.1 Fast Preview' },
      { id: 'veo-3.0-generate-001', name: 'Veo 3' },
      { id: 'veo-3.0-fast-generate-001', name: 'Veo 3 Fast' }
    ]
  },
  {
    id: 'google-flow',
    name: 'Google Flow',
    shortName: 'Google Flow',
    category: 'ai-video',
    requiresApiKey: false,
    supportsImageReference: true,
    supportsAudioReference: true,
    supportsAspectRatio: true,
    supportsDuration: true,
    implemented: false,
    statusLabel: 'Chưa có API chính thức để dùng credits qua app bên thứ ba',
    models: [
      { id: 'google-flow-official-api-unavailable', name: 'Official API unavailable' }
    ]
  },
  {
    id: 'kling',
    name: 'Kling AI',
    shortName: 'Kling',
    category: 'ai-video',
    requiresApiKey: true,
    supportsImageReference: true,
    supportsAudioReference: false,
    supportsAspectRatio: true,
    supportsDuration: true,
    implemented: false,
    statusLabel: 'Chưa có endpoint chính thức được cấu hình',
    models: [
      { id: 'kling-default', name: 'Kling default' }
    ]
  },
  {
    id: 'runway',
    name: 'Runway',
    shortName: 'Runway',
    category: 'ai-video',
    requiresApiKey: true,
    supportsImageReference: true,
    supportsAudioReference: false,
    supportsAspectRatio: true,
    supportsDuration: true,
    implemented: false,
    statusLabel: 'Chưa có SDK/API chính thức trong project',
    models: [
      { id: 'runway-default', name: 'Runway default' }
    ]
  },
  {
    id: 'pika',
    name: 'Pika',
    shortName: 'Pika',
    category: 'ai-video',
    requiresApiKey: true,
    supportsImageReference: true,
    supportsAudioReference: false,
    supportsAspectRatio: true,
    supportsDuration: true,
    implemented: false,
    statusLabel: 'Chưa có endpoint chính thức được cấu hình',
    models: [
      { id: 'pika-default', name: 'Pika default' }
    ]
  },
  {
    id: 'custom',
    name: 'Custom Provider',
    shortName: 'Custom',
    category: 'custom',
    requiresApiKey: true,
    supportsImageReference: true,
    supportsAudioReference: true,
    supportsAspectRatio: true,
    supportsDuration: true,
    implemented: false,
    statusLabel: 'Cần backend endpoint tương thích để render thật',
    models: [
      { id: 'custom-model', name: 'Custom model' }
    ],
    supportsBaseUrl: true
  }
];

function listProviderDefinitions() {
  return providerDefinitions.map((provider) => ({ ...provider, models: [...provider.models] }));
}

function getProviderDefinition(providerId) {
  return providerDefinitions.find((provider) => provider.id === providerId) || null;
}

module.exports = {
  listProviderDefinitions,
  getProviderDefinition
};
