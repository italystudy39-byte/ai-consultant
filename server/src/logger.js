// Минимальный структурированный логгер (JSON в stdout — удобно для Docker/облака)
function write(level, msg, meta) {
  const line = { ts: new Date().toISOString(), level, msg, ...meta };
  (level === 'error' ? console.error : console.log)(JSON.stringify(line));
}

export const logger = {
  info: (msg, meta = {}) => write('info', msg, meta),
  warn: (msg, meta = {}) => write('warn', msg, meta),
  error: (msg, meta = {}) => write('error', msg, meta),
};
