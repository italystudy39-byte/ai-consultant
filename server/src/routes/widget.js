// Публичные эндпоинты для чат-виджета. Компания определяется по public_key.
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { db } from '../db.js';
import { config } from '../config.js';
import { ah, HttpError, isUuid } from '../middleware/errors.js';
import { answerQuestion } from '../services/chat.js';
import { mergeBotConfig } from '../services/prompt.js';

const router = Router();

// Rate limiting: по IP + ключу компании; отдельные окна на минуту и на сутки
const keyGen = (req) => `${req.ip}|${req.params.publicKey}`;
const limitMsg = { error: 'Слишком много сообщений. Пожалуйста, подождите немного.' };
const chatPerMinute = rateLimit({
  windowMs: 60_000, limit: config.chatRatePerMinute, keyGenerator: keyGen,
  standardHeaders: 'draft-7', legacyHeaders: false, message: limitMsg,
});
const chatPerDay = rateLimit({
  windowMs: 24 * 3600_000, limit: config.chatRatePerDay, keyGenerator: keyGen,
  standardHeaders: false, legacyHeaders: false, message: limitMsg,
});
const leadLimit = rateLimit({
  windowMs: 3600_000, limit: 5, keyGenerator: keyGen, standardHeaders: 'draft-7', legacyHeaders: false, message: limitMsg,
});

const VISITOR_RE = /^[A-Za-z0-9_-]{8,64}$/;

// Загружаем компанию по публичному ключу
router.param('publicKey', (req, res, next, key) => {
  (async () => {
    if (!/^pk_[a-f0-9]{32}$/.test(key)) throw new HttpError(404, 'Виджет не найден');
    const { rows } = await db.query('SELECT id, name, bot_config FROM companies WHERE public_key = $1', [key]);
    if (!rows[0]) throw new HttpError(404, 'Виджет не найден');
    req.company = rows[0];
  })().then(() => next(), next);
});

// Публичная конфигурация виджета (без внутренних настроек)
router.get('/:publicKey/config', (req, res) => {
  const c = mergeBotConfig(req.company.bot_config);
  res.set('Cache-Control', 'public, max-age=60');
  res.json({
    companyName: req.company.name,
    botName: c.botName,
    greeting: c.greeting,
    language: c.language,
    accentColor: c.accentColor,
    collectLeads: c.collectLeads,
  });
});

// Отправить сообщение
router.post('/:publicKey/chat', chatPerMinute, chatPerDay, ah(async (req, res) => {
  const { visitorId, conversationId, message, pageUrl } = req.body || {};
  if (!VISITOR_RE.test(visitorId || '')) throw new HttpError(400, 'Некорректный visitorId');
  const text = String(message || '').trim();
  if (!text) throw new HttpError(400, 'Пустое сообщение');
  if (text.length > config.maxMessageLength) {
    throw new HttpError(400, `Сообщение слишком длинное (максимум ${config.maxMessageLength} символов)`);
  }

  const result = await answerQuestion({
    company: req.company,
    visitorId,
    conversationId: isUuid(conversationId) ? conversationId : null,
    message: text,
    meta: {
      pageUrl: typeof pageUrl === 'string' ? pageUrl.slice(0, 500) : undefined,
      userAgent: req.get('user-agent')?.slice(0, 300),
      language: req.get('accept-language')?.slice(0, 50),
    },
  });
  res.json(result);
}));

// История диалога (восстановление после перезагрузки страницы)
router.get('/:publicKey/conversations/:conversationId', ah(async (req, res) => {
  const { conversationId } = req.params;
  const visitorId = String(req.query.visitorId || '');
  if (!isUuid(conversationId) || !VISITOR_RE.test(visitorId)) throw new HttpError(404, 'Диалог не найден');
  const { rows: conv } = await db.query(
    'SELECT id FROM conversations WHERE id = $1 AND company_id = $2 AND visitor_id = $3',
    [conversationId, req.company.id, visitorId],
  );
  if (!conv[0]) throw new HttpError(404, 'Диалог не найден');
  const { rows } = await db.query(
    `SELECT role, text, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at LIMIT 200`,
    [conversationId],
  );
  res.json({ conversationId, messages: rows });
}));

// Оставить контакт
router.post('/:publicKey/leads', leadLimit, ah(async (req, res) => {
  const { visitorId, conversationId, name, contact, message } = req.body || {};
  const c = String(contact || '').trim();
  if (c.length < 5 || c.length > 200) throw new HttpError(400, 'Укажите телефон или email');

  let convId = null;
  if (isUuid(conversationId) && VISITOR_RE.test(visitorId || '')) {
    const { rows } = await db.query(
      'SELECT id FROM conversations WHERE id = $1 AND company_id = $2 AND visitor_id = $3',
      [conversationId, req.company.id, visitorId],
    );
    convId = rows[0]?.id ?? null;
  }
  await db.query(
    `INSERT INTO leads (company_id, conversation_id, visitor_id, name, contact, message) VALUES ($1, $2, $3, $4, $5, $6)`,
    [req.company.id, convId, VISITOR_RE.test(visitorId || '') ? visitorId : null,
      String(name || '').trim().slice(0, 200) || null, c, String(message || '').trim().slice(0, 2000) || null],
  );
  res.status(201).json({ ok: true });
}));

export default router;
