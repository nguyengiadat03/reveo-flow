import type {
  ProviderPublicConfig,
  SaveProviderKeyInput,
  TestConnectionResult,
  TestProviderConnectionInput,
  VideoProviderDefinition,
} from './providerTypes';

function ensureDesktopAPI() {
  if (!window.desktopAPI) {
    throw new Error('Cấu hình API chỉ khả dụng trong ứng dụng desktop Electron.');
  }
  return window.desktopAPI;
}

export async function listProviders(): Promise<VideoProviderDefinition[]> {
  return ensureDesktopAPI().listProviders();
}

export async function getProviderConfig(providerId: string): Promise<ProviderPublicConfig> {
  return ensureDesktopAPI().getProviderConfig(providerId);
}

export async function saveProviderKey(input: SaveProviderKeyInput): Promise<ProviderPublicConfig> {
  return ensureDesktopAPI().saveProviderKey(input);
}

export async function removeProviderKey(providerId: string): Promise<ProviderPublicConfig> {
  return ensureDesktopAPI().removeProviderKey(providerId);
}

export async function testProviderConnection(input: TestProviderConnectionInput): Promise<TestConnectionResult> {
  return ensureDesktopAPI().testProviderConnection(input);
}

export async function setDefaultProvider(providerId: string): Promise<string> {
  return ensureDesktopAPI().setDefaultProvider(providerId);
}
