export type UpdateStatusCode =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error'
  | 'blocked'
  | 'unsupported-portable'
  | 'dev-disabled';

export interface UpdateStatus {
  status: UpdateStatusCode;
  currentVersion: string;
  latestVersion?: string;
  percent?: number;
  message: string;
  errorMessage?: string;
  isPortable?: boolean;
  canInstall?: boolean;
  canDownload?: boolean;
  blockedReason?: string;
}
