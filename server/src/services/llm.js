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

// Заглушка для разработки без ключа: «отвечает» самым релевантным фрагментом контекста.
// Берём ПОСЛЕДНИЙ тег <context>: слово «<context>» встречается и в тексте правил.
function mockGenerate({ system }) {
  const start = system.lastIndexOf('<context>');
  const end = system.lastIndexOf('</context>');
  const ctx = start >= 0 && end > start ? system.slice(start + 9, end) : '';
  const first = ctx.match(/<fragment[^>]*>\n?([\s\S]*?)<\/fragment>/);
  if (!first) return '[NO_ANSWER] К сожалению, у меня нет информации по этому вопросу. Оставьте контакт — сотрудник свяжется с вами.';
  let text = first[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
  const answer = text.match(/(?:^|\n)Ответ:\s*([\s\S]*)$/);
  if (answer) text = answer[1];
  else text = text.replace(/^\[[^\]\n]*\]\n/, ''); // убираем префикс [Заголовок]
  return text.slice(0, 600).trim();
}
