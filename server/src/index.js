import { config } from './config.js';
import { initDb, db } from './db.js';
import { migrate } from './migrate.js';
import { createApp } from './app.js';
import { logger } from './logger.js';

await initDb();
await migrate();

// Источники, «зависшие» в processing после перезапуска, отправляем на повторную индексацию
const { indexSourceInBackground } = await import('./services/knowledge.js');
const { rows: stuck } = await db.query(`SELECT id FROM knowledge_sources WHERE status = 'processing'`);
stuck.forEach((s) => indexSourceInBackground(s.id));

const server = createApp().listen(config.port, () => {
  logger.info('server started', {
    port: config.port,
    llm: config.llmProvider,
    model: config.anthropicModel,
    embeddings: config.embeddingProvider,
  });
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    server.close(() => db.end().finally(() => process.exit(0)));
  });
}
