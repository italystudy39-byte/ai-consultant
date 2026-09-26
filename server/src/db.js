import pg from 'pg';
import { config } from './config.js';
import { logger } from './logger.js';

// Единый интерфейс: db.query(sql, params) -> { rows }, db.tx(fn)
// Поддерживается обычный PostgreSQL (pg) и встроенный PGlite (DATABASE_URL=pglite://./data)
// для локальной разработки без Docker.

function createPgDb(url) {
  const pool = new pg.Pool({ connectionString: url, max: 10 });
  pool.on('error', (err) => logger.error('pg pool error', { error: err.message }));
  return {
    kind: 'pg',
    query: (text, params) => pool.query(text, params),
    async tx(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const res = await fn({ query: (t, p) => client.query(t, p) });
        await client.query('COMMIT');
        return res;
      } catch (e) {
        await client.query('ROLLBACK').catch(() => {});
        throw e;
      } finally {
        client.release();
      }
    },
    end: () => pool.end(),
  };
}

async function createPgliteDb(url) {
  const { PGlite } = await import('@electric-sql/pglite');
  const { vector } = await import('@electric-sql/pglite/vector');
  const dataDir = url.replace('pglite://', '') || undefined;
  const lite = await PGlite.create(dataDir === 'memory' ? undefined : dataDir, {
    extensions: { vector },
  });
  return {
    kind: 'pglite',
    query: (text, params) => lite.query(text, params),
    tx: (fn) => lite.transaction((tx) => fn({ query: (t, p) => tx.query(t, p) })),
    exec: (sql) => lite.exec(sql),
    end: () => lite.close(),
  };
}

export let db;

export async function initDb(url = config.databaseUrl) {
  db = url.startsWith('pglite://') ? await createPgliteDb(url) : createPgDb(url);
  return db;
}

/** Преобразует массив чисел в литерал pgvector: '[0.1,0.2,...]' */
export const toVector = (arr) => `[${arr.join(',')}]`;
