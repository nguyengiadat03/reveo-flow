import type { HealthCheckReport } from '../types/health';

function systemApi() {
  if (!window.desktopAPI?.system) {
    throw new Error('Kiểm tra hệ thống chỉ khả dụng trong ứng dụng desktop.');
  }
  return window.desktopAPI.system;
}

export async function runHealthCheck(input?: unknown): Promise<HealthCheckReport> {
  return systemApi().runHealthCheck(input);
}

export async function getDiagnosticLog(extra?: unknown): Promise<string> {
  return systemApi().getDiagnosticLog(extra);
}

export async function restartApp(): Promise<void> {
  return systemApi().restartApp();
}
