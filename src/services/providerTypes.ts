import type { ScriptShot } from '../types';

export type ProviderStatus = 'not-configured' | 'configured' | 'ok' | 'error';

export interface ProviderModel {
  id: string;
  name: string;
}

export interface ProviderPublicConfig {
  providerId: string;
  configured: boolean;
  hasApiKey: boolean;
  maskedKey: string;
  modelName: string;
  baseUrl: string;
  lastTestStatus: string;
  lastTestMessage: string;
  lastTestAt: string;
  isDefault: boolean;
  secureMode: string;
}

export interface VideoProviderDefinition {
  id: string;
  name: string;
  shortName: string;
  category: 'local' | 'ai-video' | 'custom';
  requiresApiKey: boolean;
  supportsImageReference: boolean;
  supportsAudioReference: boolean;
  supportsAspectRatio: boolean;
  supportsDuration: boolean;
  implemented: boolean;
  statusLabel: string;
  supportsBaseUrl?: boolean;
  models: ProviderModel[];
  config: ProviderPublicConfig;
  configured: boolean;
  hasApiKey: boolean;
  maskedKey: string;
  isDefault: boolean;
  lastTestStatus: string;
  lastTestMessage: string;
  lastTestAt: string;
}

export interface SaveProviderKeyInput {
  providerId: string;
  apiKey?: string;
  modelName?: string;
  baseUrl?: string;
  makeDefault?: boolean;
}

export interface TestProviderConnectionInput {
  providerId: string;
  apiKey?: string;
  modelName?: string;
  baseUrl?: string;
}

export interface TestConnectionResult {
  ok: boolean;
  message: string;
}

export interface WorkflowRenderRequest {
  sceneId: string;
  sceneIndex: number;
  providerId: string;
  modelName?: string;
  topic: string;
  prompt: string;
  negativePrompt?: string;
  durationSeconds: number;
  aspectRatio: '9:16' | '16:9';
  shot?: ScriptShot | null;
  character?: Record<string, unknown>;
  voice?: Record<string, unknown>;
  outfit?: Record<string, unknown>;
  background?: Record<string, unknown>;
  assets?: Array<Record<string, unknown>>;
  references?: Record<string, unknown>;
}

export interface RenderSceneResult {
  providerId: string;
  mediaId: string;
  base64: string;
  mimeType: 'video/mp4';
  filePath?: string;
  status: 'done' | 'queued' | 'processing' | 'error';
  jobId?: string;
}
