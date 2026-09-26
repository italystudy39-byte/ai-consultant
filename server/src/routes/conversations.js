import { Router } from 'express';
import { db } from '../db.js';
import { ah, HttpError, isUuid } from '../middleware/errors.js';

const router = Router();

/** Общие фильтры для списка и экспорта: q, from, to, unanswered */
function buildFilters(companyId, query) {
  const params = [companyId];
  const where = ['c.company_id = $1'];
  const add = (v) => { params.push(v); return `$${params.length}`; };

  const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
  if (isDate(query.from)) where.push(`c.started_at >= ${add(query.from)}::date`);
  if (isDate(query.to)) where.push(`c.started_at < (${add(query.to)}::date + 1)`);
  if (query.unanswered === 'true') where.push('c.has_unanswered');
  const q = String(query.q || '').trim();
  if (q) {
    const p = add(`%${q.replace(/[\\%_]/g, (m) => '\\' + m)}%`);
    where.push(`(c.visitor_id ILIKE ${p} OR EXISTS (
      SELECT 1 FROM messages m WHERE m.conversation_id = c.id AND m.text ILIKE ${p}))`);
  }
  return { where: where.join(' AND '), params, add };
}

// Список диалогов с поиском, фильтрами и пагинацией
router.get('/', ah(async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const { where, params, add } = buildFilters(req.user.companyId, req.query);

  const { rows: [{ total }] } = await db.query(
    `SELECT count(*)::int AS total FROM conversations c WHERE ${where}`, params,
  );
  const { rows } = await db.query(
    `SELECT c.id, c.visitor_id, c.started_at, c.last_message_at, c.message_count, c.has_unanswered,
            c.visitor_meta->>'pageUrl' AS page_url,
            (SELECT text FROM messages m WHERE m.conversation_id = c.id AND m.role = 'user'
              ORDER BY m.created_at LIMIT 1) AS first_question,
            EXISTS (SELECT 1 FROM leads l WHERE l.conversation_id = c.id) AS has_lead
       FROM conversations c
      WHERE ${where}
      ORDER BY c.last_message_at DESC
      LIMIT ${add(limit)} OFFSET ${add((page - 1) * limit)}`,
    params,
  );
  res.json({ items: rows, total, page, limit });
}));

// Экспорт в CSV (до 50 000 сообщений) — те же фильтры, что и у списка
router.get('/export.csv', ah(async (req, res) => {
  const { where, params } = buildFilters(req.user.companyId, req.query);
  const { rows } = await db.query(
    `SELECT c.id AS conversation_id, c.visitor_id, c.started_at, m.role, m.text, m.answered, m.created_at
       FROM conversations c JOIN messages m ON m.conversation_id = c.id
      WHERE ${where}
      ORDER BY c.started_at DESC, m.created_at
      LIMIT 50000`,
    params,
  );
  const esc = (v) => {
    if (v === null || v === undefined) return '';
    const s = v instanceof Date ? v.toISOString() : String(v);
    // защита от CSV-инъекций в Excel
    const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    return /[",\n\r;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const header = ['conversation_id', 'visitor_id', 'conversation_started_at', 'role', 'text', 'answered', 'message_created_at'];
  const lines = rows.map((r) =>
    [r.conversation_id, r.visitor_id, r.started_at, r.role, r.text, r.answered, r.created_at].map(esc).join(','),
  );
  const date = new Date().toISOString().slice(0, 10);
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="conversations-${date}.csv"`);
  res.send('﻿' + [header.join(','), ...lines].join('\r\n')); // BOM — чтобы Excel понял UTF-8
}));

// Один диалог целиком
router.get('/:id', ah(async (req, res) => {
  if (!isUuid(req.params.id)) throw new HttpError(404, 'Диалог не найден');
  const { rows: [conv] } = await db.query(
    'SELECT * FROM conversations WHERE id = $1 AND company_id = $2',
    [req.params.id, req.user.companyId],
  );
  if (!conv) throw new HttpError(404, 'Диалог не найден');
  const [{ rows: messages }, { rows: leads }] = await Promise.all([
    db.query(
      `SELECT id, role, text, answered, sources, latency_ms, created_at
         FROM messages WHERE conversation_id = $1 ORDER BY created_at`, [conv.id],
    ),
    db.query('SELECT id, name, contact, message, created_at FROM leads WHERE conversation_id = $1', [conv.id]),
  ]);
  res.json({ ...conv, messages, leads });
}));

router.delete('/:id', ah(async (req, res) => {
  if (!isUuid(req.params.id)) throw new HttpError(404, 'Диалог не найден');
  await db.query('DELETE FROM conversations WHERE id = $1 AND company_id = $2', [req.params.id, req.user.companyId]);
  res.status(204).end();
}));

export default router;
