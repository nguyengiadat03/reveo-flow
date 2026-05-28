type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface RendererLogEntry {
  timestamp: string;
  level: LogLevel;
  scope: string;
  message: string;
}

const logs: RendererLogEntry[] = [];
const maxLogs = 300;
const secretPattern = /(api[_-]?key|token|refresh[_-]?token|authorization|cookie|password)(\s*[:=]\s*)[^\s,"']+/gi;

export function redact(value: unknown): string {
  let text = '';
  try {
    text = value instanceof Error ? `${value.name}: ${value.message}\n${value.stack || ''}` : typeof value === 'string' ? value : JSON.stringify(value);
  } catch {
    text = '[unserializable]';
  }
  return String(text || '').replace(secretPattern, '$1$2[hidden]');
}

export function log(level: LogLevel, scope: string, message: unknown): void {
  logs.push({
    timestamp: new Date().toISOString(),
    level,
    scope,
    message: redact(message),
  });
  if (logs.length > maxLogs) logs.splice(0, logs.length - maxLogs);
}

export function getRendererDiagnosticLog(): string {
  return logs.map((entry) => `${entry.timestamp} ${entry.level.toUpperCase()} ${entry.scope}: ${entry.message}`).join('\n');
}
