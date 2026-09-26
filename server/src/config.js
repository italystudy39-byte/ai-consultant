// Централизованная конфигурация из переменных окружения
const env = process.env;

function int(name, def) {
  const v = parseInt(env[name] ?? '', 10);
  return Number.isFinite(v) ? v : def;
}

export const config = {
  env: env.NODE_ENV || 'development',
  port: int('PORT', 3000),
  publicUrl: (env.PUBLIC_URL || env.RENDER_EXTERNAL_URL || `http://localhost:${int('PORT', 3000)}`).replace(/\/$/, ''),
  databaseUrl: env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/ai_consultant',
  jwtSecret: env.JWT_SECRET || 'dev-secret-change-me',
  jwtTtl: env.JWT_TTL || '7d',
  trustProxy: env.TRUST_PROXY || 'loopback',
  uploadDir: env.UPLOAD_DIR || './uploads',
  maxUploadMb: int('MAX_UPLOAD_MB', 15),

  // LLM
  llmProvider: env.LLM_PROVIDER || 'anthropic', // anthropic | mock
  anthropicApiKey: env.ANTHROPIC_API_KEY,
  anthropicModel: env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
  maxAnswerTokens: int('MAX_ANSWER_TOKENS', 800),

  // Эмбеддинги (размерность должна совпадать с vector(1024) в миграции)
  embeddingProvider: env.EMBEDDING_PROVIDER || 'voyage', // voyage | openai | mock
  embeddingDim: 1024,
  voyageApiKey: env.VOYAGE_API_KEY,
  voyageModel: env.VOYAGE_MODEL || 'voyage-3.5',
  openaiApiKey: env.OPENAI_API_KEY,
  openaiEmbeddingModel: env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',

  // RAG
  ragTopK: int('RAG_TOP_K', 6),
  ragMinScore: parseFloat(env.RAG_MIN_SCORE || '0.3'),
  historyTurns: int('RAG_HISTORY_TURNS', 6),
  chunkSize: int('CHUNK_SIZE', 900),
  chunkOverlap: int('CHUNK_OVERLAP', 150),

  // Rate limiting виджета
  chatRatePerMinute: int('CHAT_RATE_PER_MINUTE', 15),
  chatRatePerDay: int('CHAT_RATE_PER_DAY', 300),
  maxMessageLength: int('MAX_MESSAGE_LENGTH', 2000),
};

if (config.env === 'production' && config.jwtSecret === 'dev-secret-change-me') {
  throw new Error('JWT_SECRET must be set in production');
}
