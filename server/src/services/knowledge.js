import { db, toVector } from '../db.js';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { chunkText, faqChunk } from './chunker.js';
import { embed, embedQuery } from './embeddings.js';
import { logAiError } from './aiErrors.js';

/** Строит список чанков для источника в зависимости от типа */
export function buildChunks(source) {
  if (source.type === 'faq') return [faqChunk(source.question, source.content)];
  return chunkText(source.content, {
    size: config.chunkSize,
    overlap: config.chunkOverlap,
    prefix: source.title ? `[${source.title}]` : '',
  });
}

/**
 * (Пере)индексирует источник: удаляет старые чанки, считает эмбеддинги, сохраняет новые.
 * Статус источника: processing -> ready | error
 */
export async function indexSource(sourceId) {
  const { rows } = await db.query('SELECT * FROM knowledge_sources WHERE id = $1', [sourceId]);
  const source = rows[0];
  if (!source) return;

  try {
    const chunks = buildChunks(source);
    if (!chunks.length) throw new Error('Источник не содержит текста');
    const vectors = await embed(chunks, 'document');

    await db.tx(async (tx) => {
      await tx.query('DELETE FROM knowledge_chunks WHERE source_id = $1', [sourceId]);
      for (let i = 0; i < chunks.length; i++) {
        await tx.query(
          `INSERT INTO knowledge_chunks (source_id, company_id, chunk_index, text, embedding)
           VALUES ($1, $2, $3, $4, $5::vector)`,
          [sourceId, source.company_id, i, chunks[i], toVector(vectors[i])],
        );
      }
      await tx.query(
        `UPDATE knowledge_sources SET status = 'ready', error = NULL, chunk_count = $2, updated_at = now()
         WHERE id = $1`,
        [sourceId, chunks.length],
      );
    });
    logger.info('source indexed', { sourceId, chunks: chunks.length });
  } catch (err) {
    if (err.provider) await logAiError(err, { companyId: source.company_id });
    else logger.error('indexing failed', { sourceId, error: err.message });
    await db.query(
      `UPDATE knowledge_sources SET status = 'error', error = $2, updated_at = now() WHERE id = $1`,
      [sourceId, err.provider ? 'Ошибка сервиса эмбеддингов, попробуйте позже' : err.message],
    );
  }
}

/** Индексация в фоне — HTTP-ответ не ждёт эмбеддингов */
export function indexSourceInBackground(sourceId) {
  setImmediate(() => indexSource(sourceId).catch((e) => logger.error('bg index', { error: e.message })));
}

/**
 * Семантический поиск по базе знаний ОДНОЙ компании.
 * Фильтр company_id обязателен — это граница изоляции тенантов.
 */
export async function searchKnowledge(companyId, query, { topK = config.ragTopK, minScore = config.ragMinScore } = {}) {
  const vec = await embedQuery(query);
  const { rows } = await db.query(
    `SELECT c.id, c.source_id, c.text, s.title,
            1 - (c.embedding <=> $1::vector) AS score
       FROM knowledge_chunks c
       JOIN knowledge_sources s ON s.id = c.source_id
      WHERE c.company_id = $2 AND s.status = 'ready'
      ORDER BY c.embedding <=> $1::vector
      LIMIT $3`,
    [toVector(vec), companyId, topK],
  );
  return rows
    .map((r) => ({ ...r, score: Number(r.score) }))
    .filter((r) => r.score >= minScore);
}
