import { db } from '../db.js';
import { logger } from '../logger.js';

export { AiApiError } from './aiApiError.js';

/** Логирует ошибку AI API в stdout и в таблицу ai_errors (best-effort) */
export async function logAiError(err, { companyId = null, conversationId = null } = {}) {
  const entry = {
    provider: err.provider || 'unknown',
    operation: err.operation || 'unknown',
    statusCode: err.statusCode ?? err.status ?? null,
    message: String(err.message || err).slice(0, 2000),
  };
  logger.error('AI API error', { ...entry, companyId, conversationId });
  try {
    await db.query(
      `INSERT INTO ai_errors (company_id, conversation_id, provider, operation, status_code, message)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [companyId, conversationId, entry.provider, entry.operation, entry.statusCode, entry.message],
    );
  } catch (e) {
    logger.error('failed to persist ai_error', { error: e.message });
  }
}
