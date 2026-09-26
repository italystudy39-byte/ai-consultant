# AI-консультант для бизнеса

SaaS: компания загружает базу знаний (FAQ, тексты, PDF/DOCX/TXT), посетители её сайта общаются с чат-ботом, который отвечает **только** на основе этой базы (RAG на Claude `claude-sonnet-4-6`).

```
ai-consultant/
├── server/                 Node.js 20+ · Express · PostgreSQL + pgvector
│   ├── src/migrations/     схема БД (001_init.sql)
│   ├── src/routes/         auth · knowledge · widget · conversations · analytics · settings · leads
│   ├── src/services/       chunker · parser · embeddings · knowledge (индексация/поиск) · prompt · llm · chat
│   ├── public/widget.js    встраиваемый <script>-сниппет
│   ├── public/widget/      содержимое iframe (chat.html + chat.js, без сборки)
│   └── test/               unit + e2e (PGlite, mock-AI)
├── admin/                  React 18 · Vite · Tailwind 4 — панель администратора
├── docker-compose.yml      pgvector/pgvector:pg16 + приложение
└── Dockerfile
```

## Быстрый старт

### Вариант A — Docker (рекомендуется)
```bash
cp .env.example .env        # впишите ANTHROPIC_API_KEY, VOYAGE_API_KEY (или OPENAI_API_KEY), JWT_SECRET
docker compose up --build
```
Админка: http://localhost:3000 → «Зарегистрироваться» → добавьте FAQ → Настройки бота → скопируйте код виджета.

### Вариант B — локальная разработка
```bash
docker compose up -d db                 # только Postgres с pgvector
cd server && cp .env.example .env && npm install && npm run dev     # :3000, миграции применяются при старте
cd admin  && npm install && npm run dev                              # :5173, /api проксируется на :3000
```
Без Docker вообще: `DATABASE_URL=pglite://./data` (встроенный Postgres с pgvector).
Без API-ключей: `LLM_PROVIDER=mock EMBEDDING_PROVIDER=mock` — бот «отвечает» найденным фрагментом, удобно для UI.

### Тесты
```bash
cd server && npm test      # unit + e2e: регистрация, база знаний, чат, изоляция тенантов, CSV, rate limit
```

## Как работает ответ (RAG)
1. **Индексация** (фоном после загрузки/правки): текст → чанки ~900 символов с перекрытием 150 (FAQ — один чанк «Вопрос/Ответ») → эмбеддинги (Voyage `voyage-3.5` или OpenAI `text-embedding-3-small`, 1024 измерения) → `knowledge_chunks` с `company_id`.
2. **Вопрос посетителя**: эмбеддинг запроса (короткие уточнения склеиваются с предыдущим вопросом) → top-k по косинусной близости **только внутри компании** (`WHERE company_id = $2`, HNSW-индекс) → отсечение по `RAG_MIN_SCORE`.
3. **Claude**: системный промпт с правилами + фрагменты в `<context>` + последние 6 реплик диалога. Если ответа нет — модель начинает ответ с маркера `[NO_ANSWER]`; сервер его вырезает, помечает вопрос `answered=false` и виджет предлагает оставить контакт.
4. **Сохранение**: вопрос и ответ в `messages` (с источниками, задержкой), счётчики в `conversations`.

Ошибки AI API (Claude и эмбеддинги) пишутся в stdout (JSON) и в таблицу `ai_errors`; посетитель получает вежливый fallback-ответ.

## Модель данных
| Таблица | Назначение |
|---|---|
| `companies` | тенант: `name`, `public_key` (для виджета), `bot_config` (jsonb) |
| `admin_users` | email/bcrypt-хеш, привязка к компании |
| `knowledge_sources` | `faq` / `text` / `file`, текст, путь к файлу, статус индексации |
| `knowledge_chunks` | текст чанка + `vector(1024)`, `company_id` денормализован для изоляции |
| `conversations` | `visitor_id`, метаданные (страница, UA), `has_unanswered` |
| `messages` | `role`, `text`, `answered` (для вопросов), `sources` (для ответов) |
| `leads` | контакты посетителей |
| `ai_errors` | журнал ошибок AI API |

## API

**Публичное (виджет, CORS открыт, rate limit по IP+ключу: 15/мин, 300/сутки)**
| | |
|---|---|
| `GET  /api/widget/:publicKey/config` | имя бота, приветствие, цвет, язык |
| `POST /api/widget/:publicKey/chat` | `{visitorId, conversationId?, message, pageUrl?}` → `{conversationId, reply, answered, offerContact}` |
| `GET  /api/widget/:publicKey/conversations/:id?visitorId=` | история (восстановление после перезагрузки) |
| `POST /api/widget/:publicKey/leads` | `{visitorId, conversationId, name?, contact}` |

**Админское (`Authorization: Bearer <JWT>`, все запросы фильтруются по компании из токена)**
| | |
|---|---|
| `POST /api/auth/register` · `POST /api/auth/login` · `GET /api/auth/me` | регистрация компании, вход |
| `GET/POST /api/knowledge/sources` | список; создать FAQ `{type:'faq',question,answer}` или текст `{type:'text',title,content}` |
| `POST /api/knowledge/sources/faq-bulk` | `{items:[{question,answer}]}` — массовый импорт |
| `POST /api/knowledge/upload` | multipart `file` (PDF/DOCX/TXT, до 15 МБ) |
| `GET/PUT/DELETE /api/knowledge/sources/:id` · `POST …/:id/reindex` · `GET …/:id/file` | просмотр, правка (с переиндексацией), удаление, скачать оригинал |
| `POST /api/knowledge/search` | `{query}` → какие фрагменты найдёт бот |
| `GET /api/conversations?q=&from=&to=&unanswered=&page=` | список с поиском и фильтрами |
| `GET /api/conversations/export.csv?…` | экспорт (те же фильтры, UTF-8 BOM для Excel) |
| `GET/DELETE /api/conversations/:id` | диалог целиком |
| `GET /api/analytics?from=&to=` | итоги, диалоги по дням, топ вопросов, вопросы без ответа |
| `GET/PUT /api/settings` | настройки бота + код для вставки |
| `GET /api/leads` | контакты |

## Установка виджета
```html
<script src="https://your-host/widget.js" data-key="pk_..." async></script>
```
Опции: `data-position="left"`, `data-open="true"`; JS API: `AIConsultant.open()` / `.close()`.
На экранах < 480px чат открывается на весь экран.

## Что стоит сделать перед продакшеном
- Хранить файлы в S3/объектном хранилище вместо локальной папки `uploads/`.
- Rate limit — в памяти процесса; при нескольких инстансах подключить Redis-store для `express-rate-limit`.
- Очередь (BullMQ) для индексации больших документов вместо `setImmediate`.
- Стриминг ответа (SSE) для более быстрого «ощущения» ответа.
- Проверка `Origin`/списка разрешённых доменов для виджета, сброс пароля, приглашение нескольких админов.
- OCR для сканированных PDF.
