import { Router } from 'express';
import { db } from '../db.js';
import { config } from '../config.js';
import { ah, HttpError } from '../middleware/errors.js';
import { mergeBotConfig } from '../services/prompt.js';

const router = Router();

const embedSnippet = (key) =>
  `<script src="${config.publicUrl}/widget.js" data-key="${key}" async></script>`;

router.get('/', ah(async (req, res) => {
  const { rows: [c] } = await db.query('SELECT name, public_key, bot_config FROM companies WHERE id = $1', [req.user.companyId]);
  res.json({
    companyName: c.name,
    publicKey: c.public_key,
    botConfig: mergeBotConfig(c.bot_config),
    embedSnippet: embedSnippet(c.public_key),
    previewUrl: `${config.publicUrl}/widget/chat.html?key=${c.public_key}`,
  });
}));

router.put('/', ah(async (req, res) => {
  const b = req.body?.botConfig || {};
  const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined);
  const next = {};

  if (b.botName !== undefined) next.botName = str(b.botName, 60) || 'AI-консультант';
  if (b.greeting !== undefined) next.greeting = str(b.greeting, 500) || '';
  if (b.tone !== undefined) {
    if (!['friendly', 'formal', 'neutral'].includes(b.tone)) throw new HttpError(400, 'Некорректный тон');
    next.tone = b.tone;
  }
  if (b.language !== undefined) {
    if (!['auto', 'ru', 'en', 'uz'].includes(b.language)) throw new HttpError(400, 'Некорректный язык');
    next.language = b.language;
  }
  if (b.accentColor !== undefined) {
    if (!/^#[0-9a-fA-F]{6}$/.test(b.accentColor)) throw new HttpError(400, 'Цвет в формате #RRGGBB');
    next.accentColor = b.accentColor;
  }
  if (b.collectLeads !== undefined) next.collectLeads = Boolean(b.collectLeads);

  const companyName = str(req.body?.companyName, 120);

  const { rows: [c] } = await db.query(
    `UPDATE companies
        SET bot_config = bot_config || $2::jsonb,
            name = COALESCE($3, name)
      WHERE id = $1
      RETURNING name, bot_config`,
    [req.user.companyId, JSON.stringify(next), companyName || null],
  );
  res.json({ companyName: c.name, botConfig: mergeBotConfig(c.bot_config) });
}));

export default router;
