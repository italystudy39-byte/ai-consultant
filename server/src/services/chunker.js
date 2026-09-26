// Разбиение текста на чанки: по абзацам, затем по предложениям,
// с перекрытием, чтобы не терять контекст на границах.

export function normalizeText(text) {
  return String(text || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t ]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function splitLong(piece, size) {
  // Абзац длиннее size режем по предложениям, а если и они длинные — по словам
  const sentences = piece.match(/[^.!?…]+[.!?…]*\s*/g) || [piece];
  const out = [];
  let buf = '';
  for (const s of sentences) {
    if (s.length > size) {
      if (buf) { out.push(buf.trim()); buf = ''; }
      const words = s.split(' ');
      for (const w of words) {
        if ((buf + ' ' + w).length > size && buf) { out.push(buf.trim()); buf = ''; }
        buf += (buf ? ' ' : '') + w;
      }
      continue;
    }
    if ((buf + s).length > size && buf) { out.push(buf.trim()); buf = ''; }
    buf += s;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

/**
 * @param {string} text
 * @param {{size?: number, overlap?: number, prefix?: string}} opts
 *   prefix — заголовок источника, добавляется к каждому чанку для лучшего поиска
 */
export function chunkText(text, { size = 900, overlap = 150, prefix = '' } = {}) {
  const clean = normalizeText(text);
  if (!clean) return [];

  const pieces = clean
    .split(/\n\s*\n/)
    .flatMap((p) => (p.length > size ? splitLong(p, size) : [p.trim()]))
    .filter(Boolean);

  const chunks = [];
  let current = '';
  for (const p of pieces) {
    if (current && (current + '\n\n' + p).length > size) {
      chunks.push(current);
      // перекрытие: хвост предыдущего чанка (по границе слова)
      const tail = current.slice(-overlap);
      const cut = tail.indexOf(' ');
      current = (cut >= 0 ? tail.slice(cut + 1) : tail) + '\n\n' + p;
      if (current.length > size * 1.3) current = p;
    } else {
      current = current ? current + '\n\n' + p : p;
    }
  }
  if (current) chunks.push(current);

  return prefix ? chunks.map((c) => `${prefix}\n${c}`) : chunks;
}

/** FAQ-пара всегда один чанк: вопрос и ответ ищутся вместе */
export function faqChunk(question, answer) {
  return `Вопрос: ${normalizeText(question)}\nОтвет: ${normalizeText(answer)}`;
}
