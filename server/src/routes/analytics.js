import { Router } from 'express';
import { db } from '../db.js';
import { ah } from '../middleware/errors.js';

const router = Router();

function range(query) {
  const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
  const to = isDate(query.to) ? query.to : new Date().toISOString().slice(0, 10);
  const from = isDate(query.from) ? query.from : new Date(Date.now() - 29 * 864e5).toISOString().slice(0, 10);
  return { from, to };
}

router.get('/', ah(async (req, res) => {
  const cid = req.user.companyId;
  const { from, to } = range(req.query);
  const p = [cid, from, to];
  const inRange = (col) => `${col} >= $2::date AND ${col} < ($3::date + 1)`;

  const [totals, daily, top, unanswered, leads] = await Promise.all([
    db.query(
      `SELECT
         (SELECT count(*)::int FROM conversations WHERE company_id = $1 AND ${inRange('started_at')}) AS conversations,
         (SELECT count(*)::int FROM messages WHERE company_id = $1 AND role = 'user' AND ${inRange('created_at')}) AS questions,
         (SELECT count(*)::int FROM messages WHERE company_id = $1 AND role = 'user' AND answered = false AND ${inRange('created_at')}) AS unanswered,
         (SELECT count(*)::int FROM leads WHERE company_id = $1 AND ${inRange('created_at')}) AS leads,
         (SELECT count(DISTINCT visitor_id)::int FROM conversations WHERE company_id = $1 AND ${inRange('started_at')}) AS visitors`,
      p,
    ),
    db.query(
      `SELECT to_char(d, 'YYYY-MM-DD') AS date,
              (SELECT count(*)::int FROM conversations c
                WHERE c.company_id = $1 AND c.started_at >= d AND c.started_at < d + interval '1 day') AS conversations
         FROM generate_series($2::date, $3::date, interval '1 day') AS d
        ORDER BY d`,
      p,
    ),
    // «Топ вопросов»: группировка по нормализованному тексту
    db.query(
      `SELECT min(text) AS question, count(*)::int AS count,
              bool_or(answered = false) AS has_unanswered
         FROM messages
        WHERE company_id = $1 AND role = 'user' AND ${inRange('created_at')}
        GROUP BY regexp_replace(lower(trim(text)), '[^[:alnum:][:space:]]', '', 'g')
        ORDER BY count(*) DESC, max(created_at) DESC
        LIMIT 10`,
      p,
    ),
    db.query(
      `SELECT id, conversation_id, text, created_at FROM messages
        WHERE company_id = $1 AND role = 'user' AND answered = false AND ${inRange('created_at')}
        ORDER BY created_at DESC LIMIT 30`,
      p,
    ),
    db.query(
      `SELECT id, conversation_id, name, contact, message, created_at FROM leads
        WHERE company_id = $1 ORDER BY created_at DESC LIMIT 10`,
      [cid],
    ),
  ]);

  const t = totals.rows[0];
  res.json({
    range: { from, to },
    totals: { ...t, answerRate: t.questions ? +((1 - t.unanswered / t.questions) * 100).toFixed(1) : null },
    daily: daily.rows,
    topQuestions: top.rows,
    unansweredQuestions: unanswered.rows,
    recentLeads: leads.rows,
  });
}));

export default router;
