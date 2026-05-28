const logs = [];
const maxLogs = 500;
const secretPatterns = [
  /(api[_-]?key\s*[:=]\s*)[^\s,"']+/gi,
  /(token\s*[:=]\s*)[^\s,"']+/gi,
  /(refresh[_-]?token\s*[:=]\s*)[^\s,"']+/gi,
  /(authorization\s*[:=]\s*)[^\n,]+/gi,
  /(cookie\s*[:=]\s*)[^\n,]+/gi,
  /(password\s*[:=]\s*)[^\s,"']+/gi,
  /(Bearer\s+)[A-Za-z0-9._-]+/gi
];

function redact(value) {
  const input = typeof value === 'string' ? value : safeStringify(value);
  return secretPatterns.reduce((text, pattern) => text.replace(pattern, '$1[hidden]'), input);
}

function safeStringify(value) {
  try {
    if (value instanceof Error) return `${value.name}: ${value.message}\n${value.stack || ''}`;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  } catch {
    return '[unserializable]';
  }
}

function write(level, scope, message, meta) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    scope: String(scope || 'app'),
    message: redact(message),
    meta: meta === undefined ? undefined : redact(meta)
  };
  logs.push(entry);
  if (logs.length > maxLogs) logs.splice(0, logs.length - maxLogs);

  const line = `[${entry.timestamp}] [${entry.level}] [${entry.scope}] ${entry.message}`;
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else if (level === 'debug') console.debug(line);
  else console.info(line);

  return entry;
}

function getLogs() {
  return logs.slice();
}

function getDiagnosticText(extra = {}) {
  const header = [
    'Video Flow Diagnostic Log',
    `Generated: ${new Date().toISOString()}`,
    `Extra: ${redact(extra)}`,
    ''
  ];
  const lines = logs.map((entry) => {
    const meta = entry.meta ? ` ${entry.meta}` : '';
    return `${entry.timestamp} ${entry.level.toUpperCase()} ${entry.scope}: ${entry.message}${meta}`;
  });
  return [...header, ...lines].join('\n');
}

module.exports = {
  debug: (scope, message, meta) => write('debug', scope, message, meta),
  info: (scope, message, meta) => write('info', scope, message, meta),
  warn: (scope, message, meta) => write('warn', scope, message, meta),
  error: (scope, message, meta) => write('error', scope, message, meta),
  redact,
  getLogs,
  getDiagnosticText
};
