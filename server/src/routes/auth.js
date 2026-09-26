import { Router } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { db } from '../db.js';
import { ah, HttpError } from '../middleware/errors.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { DEFAULT_BOT_CONFIG } from '../services/prompt.js';

const router = Router();

// защита от перебора паролей
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false });

// хеш-заглушка для выравнивания времени ответа при несуществующем email
const DUMMY_HASH = bcrypt.hashSync('dummy-password', 12);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateCreds(email, password) {
  if (!EMAIL_RE.test(email || '')) throw new HttpError(400, 'Некорректный email');
  if (!password || password.length < 8) throw new HttpError(400, 'Пароль должен быть не короче 8 символов');
}

// Регистрация: создаёт компанию (тенанта) и её первого администратора
router.post('/register', authLimiter, ah(async (req, res) => {
  const { companyName, email, password } = req.body || {};
  validateCreds(email, password);
  if (!companyName?.trim()) throw new HttpError(400, 'Укажите название компании');

  const exists = await db.query('SELECT 1 FROM admin_users WHERE lower(email) = lower($1)', [email]);
  if (exists.rows.length) throw new HttpError(409, 'Пользователь с таким email уже существует');

  const hash = await bcrypt.hash(password, 12);
  const publicKey = 'pk_' + crypto.randomBytes(16).toString('hex');
  const botConfig = {
    ...DEFAULT_BOT_CONFIG,
    greeting: `Здравствуйте! Я AI-консультант компании «${companyName.trim()}». Чем могу помочь?`,
  };

  const user = await db.tx(async (tx) => {
    const { rows: [company] } = await tx.query(
      `INSERT INTO companies (name, public_key, bot_config) VALUES ($1, $2, $3::jsonb) RETURNING id`,
      [companyName.trim(), publicKey, JSON.stringify(botConfig)],
    );
    const { rows: [u] } = await tx.query(
      `INSERT INTO admin_users (company_id, email, password_hash) VALUES ($1, $2, $3) RETURNING id, company_id, email`,
      [company.id, email.trim(), hash],
    );
    return u;
  });

  res.status(201).json({ token: signToken(user), user: { id: user.id, email: user.email } });
}));

router.post('/login', authLimiter, ah(async (req, res) => {
  const { email, password } = req.body || {};
  const { rows } = await db.query('SELECT * FROM admin_users WHERE lower(email) = lower($1)', [email || '']);
  const user = rows[0];
  // сравнение выполняется всегда — одинаковое время ответа для существующих и несуществующих email
  const ok = await bcrypt.compare(password || '', user?.password_hash || DUMMY_HASH);
  if (!user || !ok) throw new HttpError(401, 'Неверный email или пароль');
  res.json({ token: signToken(user), user: { id: user.id, email: user.email } });
}));

router.get('/me', requireAuth, ah(async (req, res) => {
  const { rows } = await db.query(
    `SELECT u.id, u.email, c.id AS company_id, c.name AS company_name, c.public_key
       FROM admin_users u JOIN companies c ON c.id = u.company_id WHERE u.id = $1`,
    [req.user.id],
  );
  if (!rows[0]) throw new HttpError(401, 'Пользователь не найден');
  res.json(rows[0]);
}));

export default router;
