import { useCallback, useEffect, useRef, useState } from 'react';
import { api, fmtDate } from '../api.js';
import { Badge, Button, Card, Empty, ErrorNote, Input, PageHeader, Spinner, Textarea, cx } from '../components/ui.jsx';

const TYPE_LABEL = { faq: 'FAQ', text: 'Текст', file: 'Файл' };
const STATUS = {
  processing: { tone: 'indigo', label: 'индексируется…' },
  ready: { tone: 'green', label: 'готово' },
  error: { tone: 'red', label: 'ошибка' },
};

function AddPanel({ onAdded }) {
  const [tab, setTab] = useState('faq');
  const [faq, setFaq] = useState({ question: '', answer: '' });
  const [text, setText] = useState({ title: '', content: '' });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef();

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (tab === 'faq') {
        await api('/knowledge/sources', { method: 'POST', body: { type: 'faq', ...faq } });
        setFaq({ question: '', answer: '' });
      } else if (tab === 'text') {
        await api('/knowledge/sources', { method: 'POST', body: { type: 'text', ...text } });
        setText({ title: '', content: '' });
      } else {
        const form = new FormData();
        form.append('file', file);
        await api('/knowledge/upload', { method: 'POST', form });
        setFile(null);
        if (fileRef.current) fileRef.current.value = '';
      }
      onAdded();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const tabs = [['faq', 'Вопрос-ответ'], ['text', 'Текст'], ['file', 'Файл']];

  return (
    <Card className="p-4">
      <div className="mb-4 flex gap-1 rounded-lg bg-slate-100 p-1 text-sm" role="tablist">
        {tabs.map(([k, l]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => { setTab(k); setError(null); }}
            className={cx('flex-1 rounded-md px-3 py-1.5 font-medium', tab === k ? 'bg-white shadow-sm' : 'text-slate-600')}
          >
            {l}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="space-y-3">
        {tab === 'faq' && (
          <>
            <Input label="Вопрос" value={faq.question} onChange={(e) => setFaq({ ...faq, question: e.target.value })} placeholder="Сколько стоит доставка?" required />
            <Textarea label="Ответ" rows={4} value={faq.answer} onChange={(e) => setFaq({ ...faq, answer: e.target.value })} required />
          </>
        )}
        {tab === 'text' && (
          <>
            <Input label="Заголовок" value={text.title} onChange={(e) => setText({ ...text, title: e.target.value })} placeholder="Условия доставки" />
            <Textarea label="Текст" rows={8} value={text.content} onChange={(e) => setText({ ...text, content: e.target.value })} required />
          </>
        )}
        {tab === 'file' && (
          <label className="block rounded-lg border-2 border-dashed border-slate-300 p-6 text-center text-sm text-slate-600 hover:border-indigo-400">
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.txt,.md"
              className="sr-only"
              onChange={(e) => setFile(e.target.files[0] || null)}
              required
            />
            {file ? <span className="font-medium text-slate-900">{file.name}</span> : <>Выберите файл <b>PDF, DOCX или TXT</b> (до 15 МБ)</>}
          </label>
        )}
        <ErrorNote error={error} />
        <Button type="submit" disabled={busy || (tab === 'file' && !file)}>
          {busy && <Spinner />} {tab === 'file' ? 'Загрузить' : 'Добавить'}
        </Button>
      </form>
    </Card>
  );
}

function EditSource({ source, onClose, onSaved }) {
  const [full, setFull] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api(`/knowledge/sources/${source.id}`)
      .then((s) => setFull({ ...s, answer: s.content }))
      .catch(setError);
  }, [source.id]);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const body = full.type === 'faq'
        ? { question: full.question, answer: full.answer }
        : { title: full.title, content: full.content };
      await api(`/knowledge/sources/${source.id}`, { method: 'PUT', body });
      onSaved();
    } catch (err) { setError(err); setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
      <Card className="max-h-[90vh] overflow-auto p-6">
        <form onSubmit={save} className="space-y-3">
          <h2 className="text-lg font-semibold">Редактирование</h2>
          {!full ? <Spinner /> : full.type === 'faq' ? (
            <>
              <Input label="Вопрос" value={full.question} onChange={(e) => setFull({ ...full, question: e.target.value })} required />
              <Textarea label="Ответ" rows={6} value={full.answer} onChange={(e) => setFull({ ...full, answer: e.target.value })} required />
            </>
          ) : (
            <>
              <Input label="Заголовок" value={full.title} onChange={(e) => setFull({ ...full, title: e.target.value })} />
              <Textarea
                label={full.type === 'file' ? `Извлечённый текст (${full.file_name})` : 'Текст'}
                rows={14}
                value={full.content}
                onChange={(e) => setFull({ ...full, content: e.target.value })}
                required
              />
            </>
          )}
          <ErrorNote error={error} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>Отмена</Button>
            <Button type="submit" disabled={busy || !full}>Сохранить и переиндексировать</Button>
          </div>
        </form>
      </Card>
      </div>
    </div>
  );
}

function SearchTest() {
  const [q, setQ] = useState('');
  const [res, setRes] = useState(null);
  const [error, setError] = useState(null);
  const run = async (e) => {
    e.preventDefault();
    setError(null);
    try { setRes(await api('/knowledge/search', { method: 'POST', body: { query: q } })); } catch (err) { setError(err); }
  };
  return (
    <Card className="p-4">
      <h2 className="font-medium">Проверка поиска</h2>
      <p className="mb-3 text-xs text-slate-500">Какие фрагменты бот найдёт по вопросу посетителя</p>
      <form onSubmit={run} className="flex gap-2">
        <Input className="flex-1" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Вопрос посетителя" required />
        <Button type="submit" variant="secondary">Найти</Button>
      </form>
      <ErrorNote error={error} />
      {res && (
        <ul className="mt-3 space-y-2 text-sm">
          {res.length === 0 && <li className="text-slate-500">Ничего не найдено</li>}
          {res.map((r) => (
            <li key={r.id} className="rounded-lg bg-slate-50 p-2">
              <div className="mb-1 flex justify-between text-xs text-slate-500"><span className="truncate">{r.title}</span><span className="tabular-nums">{r.score}</span></div>
              <div className="line-clamp-3 whitespace-pre-wrap">{r.text}</div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function Knowledge() {
  const [sources, setSources] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('');

  const load = useCallback(() => api('/knowledge/sources').then(setSources).catch(setError), []);
  useEffect(() => { load(); }, [load]);

  // пока что-то индексируется — опрашиваем каждые 2 секунды
  const processing = sources?.some((s) => s.status === 'processing');
  useEffect(() => {
    if (!processing) return;
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, [processing, load]);

  const remove = async (s) => {
    if (!window.confirm(`Удалить «${s.title}»?`)) return;
    try { await api(`/knowledge/sources/${s.id}`, { method: 'DELETE' }); load(); } catch (e) { setError(e); }
  };
  const reindex = async (s) => {
    try { await api(`/knowledge/sources/${s.id}/reindex`, { method: 'POST' }); load(); } catch (e) { setError(e); }
  };

  const shown = sources?.filter((s) => !filter || s.type === filter) ?? [];

  return (
    <>
      <PageHeader title="База знаний" subtitle="Бот отвечает только на основе этих материалов" />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <ErrorNote error={error} />
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="font-medium">Источники {sources && <span className="text-slate-400">({sources.length})</span>}</h2>
              <select className="rounded-md border border-slate-200 px-2 py-1 text-sm" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Тип">
                <option value="">Все типы</option>
                <option value="faq">FAQ</option>
                <option value="text">Тексты</option>
                <option value="file">Файлы</option>
              </select>
            </div>
            {!sources ? <div className="py-12 text-center text-slate-400"><Spinner /></div> : shown.length === 0 ? (
              <Empty title="База знаний пуста">Добавьте вопросы-ответы, текст или загрузите файл с описанием услуг.</Empty>
            ) : (
              <ul className="divide-y divide-slate-100">
                {shown.map((s) => (
                  <li key={s.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge>{TYPE_LABEL[s.type]}</Badge>
                        <Badge tone={STATUS[s.status].tone}>{STATUS[s.status].label}</Badge>
                        <span className="font-medium">{s.title}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">{s.preview}</p>
                      <div className="mt-1 text-xs text-slate-400">
                        {fmtDate(s.updated_at)} · фрагментов: {s.chunk_count}
                        {s.error && <span className="text-red-600"> · {s.error}</span>}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {s.status === 'error' && <Button variant="ghost" onClick={() => reindex(s)}>Повторить</Button>}
                      <Button variant="ghost" onClick={() => setEditing(s)}>Изменить</Button>
                      <Button variant="ghost" className="text-red-600" onClick={() => remove(s)}>Удалить</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <div className="space-y-6">
          <AddPanel onAdded={load} />
          <SearchTest />
        </div>
      </div>
      {editing && (
        <EditSource source={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      )}
    </>
  );
}
