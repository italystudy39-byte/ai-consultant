import { Router } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { db } from '../db.js';
import { config } from '../config.js';
import { ah, HttpError, isUuid } from '../middleware/errors.js';
import { extractText, SUPPORTED, UnsupportedFileError } from '../services/parser.js';
import { normalizeText } from '../services/chunker.js';
import { indexSourceInBackground, searchKnowledge } from '../services/knowledge.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadMb * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    // multer отдаёт имя в latin1 — восстанавливаем UTF-8 (кириллица в названиях файлов)
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const ok = Object.hasOwn(SUPPORTED, path.extname(file.originalname).toLowerCase());
    cb(ok ? null : new HttpError(400, 'Разрешены только PDF, DOCX, TXT'), ok);
  },
});

const LIST_COLUMNS = `id, type, title, question, left(content, 300) AS preview, file_name, mime_type,
                      status, error, chunk_count, created_at, updated_at`;

async function getOwnedSource(companyId, id) {
  if (!isUuid(id)) throw new HttpError(404, 'Источник не найден');
  const { rows } = await db.query('SELECT * FROM knowledge_sources WHERE id = $1 AND company_id = $2', [id, companyId]);
  if (!rows[0]) throw new HttpError(404, 'Источник не найден');
  return rows[0];
}

// Список источников
router.get('/sources', ah(async (req, res) => {
  const params = [req.user.companyId];
  let where = 'company_id = $1';
  if (['faq', 'text', 'file'].includes(req.query.type)) {
    params.push(req.query.type);
    where += ` AND type = $${params.length}`;
  }
  const { rows } = await db.query(
    `SELECT ${LIST_COLUMNS} FROM knowledge_sources WHERE ${where} ORDER BY created_at DESC`,
    params,
  );
  res.json(rows);
}));

router.get('/sources/:id', ah(async (req, res) => {
  const s = await getOwnedSource(req.user.companyId, req.params.id);
  res.json(s);
}));

// Создание FAQ или текстового источника
//  { type: 'faq', question, answer }  |  { type: 'text', title, content }
router.post('/sources', ah(async (req, res) => {
  const { type } = req.body || {};
  let title, question = null, content;

  if (type === 'faq') {
    question = normalizeText(req.body.question);
    content = normalizeText(req.body.answer);
    if (!question || !content) throw new HttpError(400, 'Заполните вопрос и ответ');
    title = question.slice(0, 200);
  } else if (type === 'text') {
    title = normalizeText(req.body.title) || 'Без названия';
    content = normalizeText(req.body.content);
    if (!content) throw new HttpError(400, 'Текст пуст');
  } else {
    throw new HttpError(400, 'type должен быть faq или text');
  }

  const { rows: [src] } = await db.query(
    `INSERT INTO knowledge_sources (company_id, type, title, question, content)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [req.user.companyId, type, title, question, content],
  );
  indexSourceInBackground(src.id);
  res.status(201).json(src);
}));

// Массовый импорт FAQ: { items: [{question, answer}] }
router.post('/sources/faq-bulk', ah(async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  const clean = items
    .map((i) => ({ q: normalizeText(i.question), a: normalizeText(i.answer) }))
    .filter((i) => i.q && i.a)
    .slice(0, 500);
  if (!clean.length) throw new HttpError(400, 'Нет корректных пар вопрос-ответ');
  const created = [];
  for (const i of clean) {
    const { rows: [src] } = await db.query(
      `INSERT INTO knowledge_sources (company_id, type, title, question, content)
       VALUES ($1, 'faq', $2, $3, $4) RETURNING id`,
      [req.user.companyId, i.q.slice(0, 200), i.q, i.a],
    );
    created.push(src.id);
    indexSourceInBackground(src.id);
  }
  res.status(201).json({ created: created.length });
}));

// Загрузка файла PDF / DOCX / TXT
router.post('/upload', upload.single('file'), ah(async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Файл не передан (поле file)');
  const { originalname, buffer, mimetype } = req.file;

  let text;
  try {
    text = normalizeText(await extractText(buffer, originalname));
  } catch (e) {
    if (e instanceof UnsupportedFileError) throw new HttpError(400, e.message);
    throw new HttpError(422, 'Не удалось прочитать файл. Возможно, он повреждён или защищён паролем.');
  }
  if (!text) throw new HttpError(422, 'В файле не найден текст (скан без OCR?)');

  // Сохраняем оригинал: uploads/<company_id>/<random>.<ext>
  const ext = path.extname(originalname).toLowerCase();
  const dir = path.join(config.uploadDir, req.user.companyId);
  await fs.mkdir(dir, { recursive: true });
  const stored = `${crypto.randomUUID()}${ext}`;
  await fs.writeFile(path.join(dir, stored), buffer);

  const title = normalizeText(req.body?.title) || path.basename(originalname, ext);
  const { rows: [src] } = await db.query(
    `INSERT INTO knowledge_sources (company_id, type, title, content, file_url, file_name, mime_type)
     VALUES ($1, 'file', $2, $3, $4, $5, $6) RETURNING ${LIST_COLUMNS}`,
    [req.user.companyId, title, text, `${req.user.companyId}/${stored}`, originalname, mimetype],
  );
  indexSourceInBackground(src.id);
  res.status(201).json(src);
}));

// Скачать оригинал файла
router.get('/sources/:id/file', ah(async (req, res) => {
  const s = await getOwnedSource(req.user.companyId, req.params.id);
  if (!s.file_url) throw new HttpError(404, 'У источника нет файла');
  res.download(path.resolve(config.uploadDir, s.file_url), s.file_name);
}));

// Редактирование: меняем поля и переиндексируем
router.put('/sources/:id', ah(async (req, res) => {
  const s = await getOwnedSource(req.user.companyId, req.params.id);
  const b = req.body || {};
  let title = s.title, question = s.question, content = s.content;

  if (s.type === 'faq') {
    question = b.question !== undefined ? normalizeText(b.question) : question;
    content = b.answer !== undefined ? normalizeText(b.answer) : content;
    if (!question || !content) throw new HttpError(400, 'Заполните вопрос и ответ');
    title = question.slice(0, 200);
  } else {
    if (b.title !== undefined) title = normalizeText(b.title) || s.title;
    // для файлов можно поправить извлечённый текст
    if (b.content !== undefined) content = normalizeText(b.content);
    if (!content) throw new HttpError(400, 'Текст пуст');
  }

  const { rows: [updated] } = await db.query(
    `UPDATE knowledge_sources
        SET title = $3, question = $4, content = $5, status = 'processing', error = NULL, updated_at = now()
      WHERE id = $1 AND company_id = $2 RETURNING *`,
    [s.id, req.user.companyId, title, question, content],
  );
  indexSourceInBackground(s.id);
  res.json(updated);
}));

// Повторная индексация (например, после ошибки эмбеддингов)
router.post('/sources/:id/reindex', ah(async (req, res) => {
  const s = await getOwnedSource(req.user.companyId, req.params.id);
  await db.query(`UPDATE knowledge_sources SET status = 'processing', error = NULL WHERE id = $1`, [s.id]);
  indexSourceInBackground(s.id);
  res.json({ ok: true });
}));

router.delete('/sources/:id', ah(async (req, res) => {
  const s = await getOwnedSource(req.user.companyId, req.params.id);
  await db.query('DELETE FROM knowledge_sources WHERE id = $1 AND company_id = $2', [s.id, req.user.companyId]);
  if (s.file_url) await fs.unlink(path.resolve(config.uploadDir, s.file_url)).catch(() => {});
  res.status(204).end();
}));

// Проверка поиска: какие фрагменты найдёт бот по запросу (отладка базы знаний)
router.post('/search', ah(async (req, res) => {
  const query = normalizeText(req.body?.query);
  if (!query) throw new HttpError(400, 'Пустой запрос');
  const results = await searchKnowledge(req.user.companyId, query, { minScore: 0 });
  res.json(results.map((r) => ({ ...r, score: +r.score.toFixed(3) })));
}));

export default router;
