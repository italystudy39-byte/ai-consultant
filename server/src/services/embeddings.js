import crypto from 'node:crypto';
import { config } from '../config.js';
import { AiApiError } from './aiApiError.js';

const BATCH = 64;

async function postJson(provider, operation, url, apiKey, body) {
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (e) {
    throw new AiApiError(provider, operation, `Network error: ${e.message}`);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new AiApiError(provider, operation, `HTTP ${res.status}: ${text.slice(0, 500)}`, res.status);
  }
  return res.json();
}

const providers = {
  // Voyage AI — рекомендуется Anthropic; хорошо работает с русским
  async voyage(texts, kind) {
    if (!config.voyageApiKey) throw new AiApiError('voyage', `embed_${kind}`, 'VOYAGE_API_KEY is not set');
    const data = await postJson('voyage', `embed_${kind}`, 'https://api.voyageai.com/v1/embeddings', config.voyageApiKey, {
      model: config.voyageModel,
      input: texts,
      input_type: kind, // 'document' | 'query'
      output_dimension: config.embeddingDim,
    });
    return data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
  },

  async openai(texts, kind) {
    if (!config.openaiApiKey) throw new AiApiError('openai', `embed_${kind}`, 'OPENAI_API_KEY is not set');
    const data = await postJson('openai', `embed_${kind}`, 'https://api.openai.com/v1/embeddings', config.openaiApiKey, {
      model: config.openaiEmbeddingModel,
      input: texts,
      dimensions: config.embeddingDim,
    });
    return data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
  },

  // Локальный детерминированный «эмбеддинг» (hashing trick по словам и триграммам).
  // Только для разработки и тестов без API-ключей — качество поиска низкое.
  async mock(texts) {
    return texts.map((t) => mockEmbed(t, config.embeddingDim));
  },
};

export function mockEmbed(text, dim = 1024) {
  const v = new Float64Array(dim);
  const words = String(text).toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  const add = (token, w) => {
    const h = crypto.createHash('md5').update(token).digest();
    const idx = h.readUInt32LE(0) % dim;
    v[idx] += (h[4] & 1 ? 1 : -1) * w;
  };
  for (const w of words) {
    add('w:' + w, 1);
    const padded = `#${w}#`;
    for (let i = 0; i + 3 <= padded.length; i++) add('t:' + padded.slice(i, i + 3), 0.5);
  }
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return Array.from(v, (x) => +(x / norm).toFixed(6));
}

/**
 * @param {string[]} texts
 * @param {'document'|'query'} kind
 * @returns {Promise<number[][]>}
 */
export async function embed(texts, kind = 'document') {
  const fn = providers[config.embeddingProvider];
  if (!fn) throw new Error(`Unknown EMBEDDING_PROVIDER: ${config.embeddingProvider}`);
  const out = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    out.push(...(await fn(texts.slice(i, i + BATCH), kind)));
  }
  return out;
}

export const embedQuery = async (text) => (await embed([text], 'query'))[0];
