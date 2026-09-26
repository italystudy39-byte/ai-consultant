import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export function signToken(user) {
  return jwt.sign({ sub: user.id, companyId: user.company_id }, config.jwtSecret, { expiresIn: config.jwtTtl });
}

/**
 * Проверяет JWT и кладёт req.user = { id, companyId }.
 * Все админские запросы дальше фильтруются по req.user.companyId — изоляция тенантов.
 */
export function requireAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : req.query.token; // token в query — для скачивания CSV
  if (!token) return res.status(401).json({ error: 'Требуется авторизация' });
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { id: payload.sub, companyId: payload.companyId };
    next();
  } catch {
    res.status(401).json({ error: 'Сессия истекла, войдите снова' });
  }
}
