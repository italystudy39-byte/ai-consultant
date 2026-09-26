import path from 'node:path';

export const SUPPORTED = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
};

export class UnsupportedFileError extends Error {}

/** Извлекает текст из PDF / DOCX / TXT / MD */
export async function extractText(buffer, originalName) {
  const ext = path.extname(originalName || '').toLowerCase();
  switch (ext) {
    case '.pdf': {
      // импорт lib-файла напрямую: index.js pdf-parse читает тестовый PDF при загрузке
      const { default: pdfParse } = await import('pdf-parse/lib/pdf-parse.js');
      const res = await pdfParse(buffer);
      return res.text;
    }
    case '.docx': {
      const mammoth = await import('mammoth');
      const res = await (mammoth.default || mammoth).extractRawText({ buffer });
      return res.value;
    }
    case '.txt':
    case '.md':
      return buffer.toString('utf8').replace(/^﻿/, '');
    default:
      throw new UnsupportedFileError(`Неподдерживаемый формат: ${ext || 'без расширения'}. Разрешены PDF, DOCX, TXT.`);
  }
}
