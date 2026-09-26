import { db } from '../db.js';
import { config } from '../config.js';
import { searchKnowledge } from './knowledge.js';
import { generate } from './llm.js';
import { logAiError } from './aiErrors.js';
import { buildSystemPrompt, parseAnswer, toClaudeMessages, mergeBotConfig } from './prompt.js';

const FALLBACK = {
  ru: 'Извините, сейчас я не могу ответить — произошла техническая ошибка. Попробуйте ещё раз через минуту или оставьте контакт, и мы свяжемся с вами.',
  en: 'Sorry, I can’t answer right now due to a technical issue. Please try again in a minute or leave your contact details.',
  uz: "Kechirasiz, texnik nosozlik tufayli hozir javob bera olmayman. Birozdan so'ng qayta urinib ko'ring yoki kontaktingizni qoldiring.",
};

/** Находит диалог посетителя или создаёт новый (с проверкой принадлежности компании) */
async function getOrCreateConversation(company, visitorId, conversationId, meta) {
  if (conversationId) {
    const { rows } = await db.query(
      'SELECT * FROM conversations WHERE id = $1 AND company_id = $2 AND visitor_id = $3',
      [conversationId, company.id, visitorId],
    );
    if (rows[0]) return rows[0];
  }
  const { rows } = await db.query(
    `INSERT INTO conversations (company_id, visitor_id, visitor_meta) VALUES ($1, $2, $3::jsonb) RETURNING *`,
    [company.id, visitorId, JSON.stringify(meta || {})],
  );
  return rows[0];
}

/**
 * Полный цикл ответа на вопрос посетителя:
 * сохранить вопрос → найти чанки → Claude → сохранить ответ.
 */
export async function answerQuestion({ company, visitorId, conversationId, message, meta }) {
  const started = Date.now();
  const conv = await getOrCreateConversation(company, visitorId, conversationId, meta);
  const botConfig = mergeBotConfig(company.bot_config);

  // история до текущего вопроса (последние N реплик)
  const { rows: historyDesc } = await db.query(
    `SELECT role, text FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [conv.id, config.historyTurns * 2],
  );
  const history = historyDesc.reverse();

  const { rows: [userMsg] } = await db.query(
    `INSERT INTO messages (conversation_id, company_id, role, text) VALUES ($1, $2, 'user', $3) RETURNING id`,
    [conv.id, company.id, message],
  );

  let replyText;
  let answered = false;
  let sources = [];
  let failed = false;

  try {
    // Сначала ищем по самому вопросу. Если ничего не нашлось, а вопрос короткий
    // уточняющий («а сколько стоит?»), повторяем поиск вместе с предыдущим вопросом.
    let chunks = await searchKnowledge(company.id, message);
    const prevUser = [...history].reverse().find((m) => m.role === 'user');
    if (!chunks.length && prevUser && message.length < 40) {
      chunks = await searchKnowledge(company.id, `${prevUser.text}\n${message}`);
    }
    sources = chunks.map((c) => ({ chunkId: c.id, sourceId: c.source_id, title: c.title, score: +c.score.toFixed(3) }));

    const raw = await generate({
      system: buildSystemPrompt({ companyName: company.name, botConfig, chunks }),
      messages: toClaudeMessages(history, message),
    });
    ({ text: replyText, answered } = parseAnswer(raw));
    if (!replyText) throw Object.assign(new Error('Empty model response'), { provider: 'anthropic', operation: 'chat' });
  } catch (err) {
    failed = true;
    await logAiError(err, { companyId: company.id, conversationId: conv.id });
    const lang = ['ru', 'en', 'uz'].includes(botConfig.language) ? botConfig.language : 'ru';
    replyText = FALLBACK[lang];
    answered = false;
  }

  const latency = Date.now() - started;
  await db.tx(async (tx) => {
    // при технической ошибке оставляем answered = NULL, чтобы не портить аналитику «без ответа»
    await tx.query('UPDATE messages SET answered = $2 WHERE id = $1', [userMsg.id, failed ? null : answered]);
    await tx.query(
      `INSERT INTO messages (conversation_id, company_id, role, text, sources, latency_ms)
       VALUES ($1, $2, 'assistant', $3, $4::jsonb, $5)`,
      [conv.id, company.id, replyText, JSON.stringify(sources), latency],
    );
    await tx.query(
      `UPDATE conversations
          SET message_count = message_count + 2,
              last_message_at = now(),
              has_unanswered = has_unanswered OR $2
        WHERE id = $1`,
      [conv.id, !failed && !answered],
    );
  });

  return {
    conversationId: conv.id,
    reply: replyText,
    answered,
    offerContact: !answered && botConfig.collectLeads !== false,
    error: failed || undefined,
  };
}
