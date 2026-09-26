import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errors.js';
import authRoutes from './routes/auth.js';
import knowledgeRoutes from './routes/knowledge.js';
import conversationRoutes from './routes/conversations.js';
import analyticsRoutes from './routes/analytics.js';
import settingsRoutes from './routes/settings.js';
import leadsRoutes from './routes/leads.js';
import widgetRoutes from './routes/widget.js';

const root = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();
  app.set('trust proxy', config.trustProxy);
  app.disable('x-powered-by');
  app.use(express.json({ limit: '2mb' }));

  app.get('/health', (req, res) => res.json({ ok: true }));

  // ── Публичное API виджета: CORS открыт (виджет встраивается на любые сайты)
  app.use('/api/widget', cors({ origin: true, methods: ['GET', 'POST'] }), widgetRoutes);

  // ── Админское API (JWT)
  app.use('/api/auth', authRoutes);
  app.use('/api/knowledge', requireAuth, knowledgeRoutes);
  app.use('/api/conversations', requireAuth, conversationRoutes);
  app.use('/api/analytics', requireAuth, analyticsRoutes);
  app.use('/api/settings', requireAuth, settingsRoutes);
  app.use('/api/leads', requireAuth, leadsRoutes);
  app.use('/api', notFound);

  // ── Статика виджета: widget.js (сниппет) и widget/chat.html (содержимое iframe)
  const pub = path.join(root, '..', 'public');
  app.get('/widget.js', (req, res) => {
    res.set('Cache-Control', 'public, max-age=300');
    res.sendFile(path.join(pub, 'widget.js'));
  });
  app.use('/widget', express.static(path.join(pub, 'widget'), { maxAge: '5m' }));

  // ── Собранная админ-панель (admin/dist), если есть
  const adminDist = process.env.ADMIN_DIST || path.join(root, '..', '..', 'admin', 'dist');
  if (fs.existsSync(adminDist)) {
    app.use(express.static(adminDist, {
      setHeaders: (res) => res.set('X-Frame-Options', 'DENY'),
    }));
    app.get('*', (req, res) => {
      res.set('X-Frame-Options', 'DENY');
      res.sendFile(path.join(adminDist, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
