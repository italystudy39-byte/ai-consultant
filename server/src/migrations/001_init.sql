-- AI-консультант: начальная схема
-- Требуется PostgreSQL 13+ и расширение pgvector (0.5+ для HNSW)

CREATE EXTENSION IF NOT EXISTS vector;

-- ─── Компании (тенанты) ──────────────────────────────────────────────
CREATE TABLE companies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  -- публичный ключ для виджета (не раскрываем внутренний id)
  public_key  text NOT NULL UNIQUE,
  settings    jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- { botName, greeting, tone, language, accentColor, collectLeads }
  bot_config  jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── Администраторы компании ─────────────────────────────────────────
CREATE TABLE admin_users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email         text NOT NULL,
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX admin_users_email_uq ON admin_users (lower(email));
CREATE INDEX admin_users_company_idx ON admin_users (company_id);

-- ─── Источники базы знаний ───────────────────────────────────────────
CREATE TABLE knowledge_sources (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('faq', 'text', 'file')),
  title       text NOT NULL,
  question    text,                 -- только для type = 'faq'
  content     text NOT NULL,        -- ответ FAQ / текст / извлечённый из файла текст
  file_url    text,                 -- путь к оригиналу файла
  file_name   text,
  mime_type   text,
  status      text NOT NULL DEFAULT 'processing'
                CHECK (status IN ('processing', 'ready', 'error')),
  error       text,
  chunk_count integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX knowledge_sources_company_idx ON knowledge_sources (company_id, created_at DESC);

-- ─── Чанки с эмбеддингами ────────────────────────────────────────────
-- company_id денормализован: поиск всегда фильтруется по тенанту без JOIN
CREATE TABLE knowledge_chunks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id   uuid NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  text        text NOT NULL,
  embedding   vector(1024) NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX knowledge_chunks_company_idx ON knowledge_chunks (company_id);
CREATE INDEX knowledge_chunks_source_idx ON knowledge_chunks (source_id);
CREATE INDEX knowledge_chunks_embedding_idx
  ON knowledge_chunks USING hnsw (embedding vector_cosine_ops);

-- ─── Диалоги ─────────────────────────────────────────────────────────
CREATE TABLE conversations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  visitor_id      text NOT NULL,
  visitor_meta    jsonb NOT NULL DEFAULT '{}'::jsonb,  -- page_url, user_agent, language
  started_at      timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  message_count   integer NOT NULL DEFAULT 0,
  has_unanswered  boolean NOT NULL DEFAULT false
);
CREATE INDEX conversations_company_idx ON conversations (company_id, last_message_at DESC);
CREATE INDEX conversations_visitor_idx ON conversations (company_id, visitor_id);

-- ─── Сообщения ───────────────────────────────────────────────────────
CREATE TABLE messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN ('user', 'assistant')),
  text            text NOT NULL,
  -- для role='user': удалось ли ответить из базы знаний (NULL — ещё не обработано)
  answered        boolean,
  -- для role='assistant': какие чанки использовались [{chunkId, sourceId, score}]
  sources         jsonb,
  latency_ms      integer,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_conversation_idx ON messages (conversation_id, created_at);
CREATE INDEX messages_company_role_idx ON messages (company_id, role, created_at);

-- ─── Контакты посетителей (лиды) ─────────────────────────────────────
CREATE TABLE leads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  visitor_id      text,
  name            text,
  contact         text NOT NULL,
  message         text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX leads_company_idx ON leads (company_id, created_at DESC);

-- ─── Журнал ошибок AI API ────────────────────────────────────────────
CREATE TABLE ai_errors (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid REFERENCES companies(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  provider        text NOT NULL,     -- anthropic | voyage | openai
  operation       text NOT NULL,     -- chat | embed_query | embed_document
  status_code     integer,
  message         text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_errors_created_idx ON ai_errors (created_at DESC);
