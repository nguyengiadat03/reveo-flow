import type { UpdateDiagnostics, UpdateStatus } from '../types/update';

function updateApi() {
  if (!window.desktopAPI?.update) {
    throw new Error('Auto-update chỉ khả dụng trong ứng dụng desktop.');
  }
  return window.desktopAPI.update;
}

export async function checkForUpdates(): Promise<UpdateStatus> {
  return updateApi().checkForUpdates();
}

export async function downloadUpdate(): Promise<UpdateStatus> {
  return updateApi().downloadUpdate();
}

export async function installUpdate(): Promise<UpdateStatus> {
  return updateApi().installUpdate();
}

export async function getUpdateStatus(): Promise<UpdateStatus> {
  return updateApi().getUpdateStatus();
}

export async function getUpdateDiagnostics(): Promise<UpdateDiagnostics> {
  return updateApi().getDiagnostics();
}

export function onUpdateStatus(callback: (status: UpdateStatus) => void): () => void {
  return updateApi().onUpdateStatus(callback);
}
