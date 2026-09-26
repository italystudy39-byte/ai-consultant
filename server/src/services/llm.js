import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';
import { AiApiError } from './aiApiError.js';

let client;
function getClient() {
  if (!config.anthropicApiKey) throw new AiApiError('anthropic', 'chat', 'ANTHROPIC_API_KEY is not set');
  client ??= new Anthropic({ apiKey: config.anthropicApiKey, timeout: 60_000, maxRetries: 2 });
  return client;
}

/**
 * @param {{system: string, messages: {role:'user'|'assistant', content:string}[]}} req
 * @returns {Promise<string>}
 */
export async function generate({ system, messages }) {
  if (config.llmProvider === 'mock') return mockGenerate({ system, messages });

  try {
    const res = await getClient().messages.create({
      model: config.anthropicModel,
      max_tokens: config.maxAnswerTokens,
      system,
      messages,
    });
    return res.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
  } catch (err) {
    if (err instanceof AiApiError) throw err;
    throw new AiApiError('anthropic', 'chat', err.message, err.status);
  }
}

// Заглушка для разработки без ключа: «отвечает» первым найденным фрагментом контекста
function mockGenerate({ system }) {
  const ctx = system.split('<context>')[1]?.split('</context>')[0] ?? '';
  const first = ctx.match(/<fragment[^>]*>\n?([\s\S]*?)<\/fragment>/);
  if (!first) return '[NO_ANSWER] К сожалению, у меня нет информации по этому вопросу. Оставьте контакт — сотрудник свяжется с вами.';
  return `(mock) По нашей базе знаний: ${first[1].trim().slice(0, 400)}`;
}
