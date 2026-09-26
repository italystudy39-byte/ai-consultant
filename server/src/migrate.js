import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, initDb } from './db.js';
import { logger } from './logger.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

/** Применяет ещё не применённые SQL-миграции по порядку имён файлов */
export async function migrate() {
  await db.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
  const { rows } = await db.query('SELECT name FROM schema_migrations');
  const applied = new Set(rows.map((r) => r.name));
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await fs.readFile(path.join(dir, file), 'utf8');
    // Многооператорный SQL: pg выполняет простым протоколом, у PGlite — exec()
    if (db.exec) await db.exec(sql);
    else await db.query(sql);
    await db.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
    logger.info('migration applied', { file });
  }
}

// Запуск как скрипт: npm run migrate
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await initDb();
  await migrate();
  await db.end();
}
