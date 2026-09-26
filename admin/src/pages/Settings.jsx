import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Button, Card, ErrorNote, Input, PageHeader, Select, Spinner, Textarea } from '../components/ui.jsx';

export default function Settings() {
  const { reload } = useAuth();
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api('/settings')
      .then((d) => { setData(d); setForm({ companyName: d.companyName, ...d.botConfig, quickText: (d.botConfig.quickQuestions || []).join('\n') }); })
      .catch(setError);
  }, []);

  const set = (k) => (e) => {
    setSaved(false);
    setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { companyName, quickText, ...botConfig } = form;
      botConfig.quickQuestions = (quickText || '').split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 8);
      await api('/settings', { method: 'PUT', body: { companyName, botConfig } });
      setSaved(true);
      reload();
    } catch (err) { setError(err); } finally { setBusy(false); }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(data.embedSnippet); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  };

  if (!form) return error ? <ErrorNote error={error} /> : <div className="py-20 text-center text-slate-400"><Spinner /></div>;

  return (
    <>
      <PageHeader title="Настройки бота" />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card className="p-6">
          <form onSubmit={save} className="space-y-4">
            <Input label="Название компании" value={form.companyName} onChange={set('companyName')} required maxLength={120} />
            <Input label="Имя бота" value={form.botName} onChange={set('botName')} maxLength={60} />
            <Textarea label="Приветственное сообщение" rows={3} value={form.greeting} onChange={set('greeting')} maxLength={500} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Тон общения" value={form.tone} onChange={set('tone')}>
                <option value="friendly">Дружелюбный</option>
                <option value="formal">Официальный</option>
                <option value="neutral">Нейтральный</option>
              </Select>
              <Select label="Язык ответов" value={form.language} onChange={set('language')}>
                <option value="auto">Как у посетителя</option>
                <option value="ru">Русский</option>
                <option value="uz">O‘zbekcha</option>
                <option value="en">English</option>
              </Select>
            </div>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Цвет виджета</span>
              <div className="flex items-center gap-3">
                <input type="color" className="h-9 w-14 cursor-pointer rounded border border-slate-300" value={form.accentColor} onChange={set('accentColor')} />
                <span className="font-mono text-sm text-slate-600">{form.accentColor}</span>
              </div>
            </label>
            <div>
              <Textarea
                label="Меню быстрых вопросов (по одному в строке, до 8)"
                rows={5}
                value={form.quickText}
                onChange={set('quickText')}
                placeholder={'Сколько стоит доставка?\nКакой у вас режим работы?\nКакие способы оплаты?'}
              />
              <p className="mt-1 text-xs text-slate-500">Кнопки с этими вопросами посетитель видит в начале чата и по кнопке меню. Если оставить пустым, покажутся первые вопросы из FAQ базы знаний.</p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-indigo-600" checked={form.collectLeads} onChange={set('collectLeads')} />
              Предлагать оставить контакт, если ответа нет в базе знаний
            </label>
            <ErrorNote error={error} />
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={busy}>Сохранить</Button>
              {saved && <span className="text-sm text-emerald-600">Сохранено</span>}
            </div>
          </form>
        </Card>

        <div className="space-y-6">
          <Card className="p-4">
            <h2 className="font-medium">Установка на сайт</h2>
            <p className="mb-3 mt-1 text-sm text-slate-500">Вставьте код перед закрывающим тегом &lt;/body&gt;</p>
            <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-slate-900 p-3 text-xs text-slate-100">{data.embedSnippet}</pre>
            <div className="mt-3 flex gap-2">
              <Button variant="secondary" onClick={copy}>{copied ? 'Скопировано' : 'Копировать код'}</Button>
              <a
                href={data.previewUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Открыть чат
              </a>
            </div>
          </Card>
          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-3 text-sm font-medium">Предпросмотр</div>
            <iframe title="Предпросмотр виджета" src={data.previewUrl} className="h-[520px] w-full border-0" />
            <p className="px-4 py-2 text-xs text-slate-500">Сообщения из предпросмотра сохраняются как обычные диалоги.</p>
          </Card>
        </div>
      </div>
    </>
  );
}
