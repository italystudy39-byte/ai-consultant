import { logger } from '../logger.js';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Оборачивает async-хендлер, чтобы ошибки попадали в errorHandler */
export const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v);

export function notFound(req, res) {
  res.status(404).json({ error: 'Не найдено' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'Файл слишком большой' });
  const status = err.status || 500;
  if (status >= 500) logger.error('unhandled error', { path: req.path, error: err.message, stack: err.stack });
  res.status(status).json({ error: status >= 500 ? 'Внутренняя ошибка сервера' : err.message });
}
