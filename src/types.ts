import type { Edge, Node } from '@xyflow/react';
import type { AuthStatus } from './types/auth';
import type { HealthCheckReport } from './types/health';
import type { UpdateDiagnostics } from './types/update';
import type { UpdateStatus } from './types/update';

export type NodeType =
  | 'character'
  | 'script'
  | 'scene'
  | 'export'
  | 'asset'
  | 'voice'
  | 'outfit'
  | 'background';

export interface WorkflowState {
  isProcessing: boolean;
  progress: number;
}

export interface CharacterData {
  name: string;
  description: string;
  mediaId?: string;
  base64?: string;
}

export interface VoiceData {
  name: string;
  mediaId?: string;
  base64?: string;
  tone?: string;
}

export interface OutfitData {
  mediaId?: string;
  base64?: string;
}

export interface BackgroundData {
  label: string;
  mediaId?: string;
  base64?: string;
  description: string;
}

export interface ScriptShot {
  id: string;
  title: string;
  description: string;
  action: string;
}

export interface ScriptData {
  topic: string;
  style: 'drama' | 'review' | 'cinematic' | 'comedy';
  duration: number;
  shotCount: number;
  aspectRatio: '9:16' | '16:9';
  shots: ScriptShot[];
}

export interface AssetData {
  name: string;
  mediaId?: string;
  base64?: string;
  type: 'image' | 'product';
}

export interface SceneOutput {
  mediaId?: string;
  base64?: string;
  status: 'idle' | 'processing' | 'done' | 'error';
  sceneIndex: number;
  error?: string;
}

export interface WorkflowFile {
  nodes: Node[];
  edges: Edge[];
  version: string;
  timestamp: number;
}

export type MediaFilter = 'image' | 'audio' | 'video';

export interface SelectedMedia {
  name: string;
  mediaId: string;
  mimeType: string;
  base64: string;
}

export interface DesktopAPI {
  platform: string;
  saveWorkflow: (data: string, defaultName?: string) => Promise<{ canceled: boolean; filePath?: string }>;
  openWorkflow: () => Promise<{ canceled: boolean; filePath?: string; content?: string }>;
  selectMedia: (filter: MediaFilter) => Promise<SelectedMedia | null>;
  renderSceneVideo: (options: unknown) => Promise<any>;
  getRenderStatus: (jobId?: string) => Promise<any>;
  saveBase64File: (options: {
    base64: string;
    mimeType: string;
    defaultName?: string;
  }) => Promise<{ canceled: boolean; filePath?: string }>;
  listProviders: () => Promise<any>;
  getProviderConfig: (providerId: string) => Promise<any>;
  saveProviderKey: (options: unknown) => Promise<any>;
  removeProviderKey: (providerId: string) => Promise<any>;
  testProviderConnection: (options: unknown) => Promise<any>;
  setDefaultProvider: (providerId: string) => Promise<string>;
  auth: {
    getStatus: () => Promise<AuthStatus>;
    loginGoogle: (options?: unknown) => Promise<AuthStatus>;
    handleCallback: (url: string) => Promise<AuthStatus>;
    logout: () => Promise<AuthStatus>;
    refresh: () => Promise<AuthStatus>;
    getCurrentUser: () => Promise<AuthStatus>;
    getProviderCapabilities: () => Promise<AuthStatus['capabilities']>;
    onStatusChanged: (callback: (status: AuthStatus) => void) => () => void;
  };
  cloud: {
    ensureProfile: () => Promise<any>;
    listWorkflows: () => Promise<any[]>;
    saveWorkflow: (input: unknown) => Promise<any>;
    getWorkflow: (workflowId: string) => Promise<any>;
    createRenderJob: (input: unknown) => Promise<any>;
  };
  update: {
    checkForUpdates: () => Promise<UpdateStatus>;
    downloadUpdate: () => Promise<UpdateStatus>;
    installUpdate: () => Promise<UpdateStatus>;
    getUpdateStatus: () => Promise<UpdateStatus>;
    getDiagnostics: () => Promise<UpdateDiagnostics>;
    setBlocked: (reason: string) => Promise<UpdateStatus>;
    clearBlocked: () => Promise<UpdateStatus>;
    onUpdateStatus: (callback: (status: UpdateStatus) => void) => () => void;
  };
  system: {
    runHealthCheck: (input?: unknown) => Promise<HealthCheckReport>;
    getDiagnosticLog: (extra?: unknown) => Promise<string>;
    restartApp: () => Promise<void>;
  };
}
