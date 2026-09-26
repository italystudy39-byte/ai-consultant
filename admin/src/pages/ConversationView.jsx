import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, fmtDate } from '../api.js';
import { Badge, Button, Card, ErrorNote, Spinner, cx } from '../components/ui.jsx';

export default function ConversationView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [conv, setConv] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => { api(`/conversations/${id}`).then(setConv).catch(setError); }, [id]);

  const remove = async () => {
    if (!window.confirm('Удалить диалог безвозвратно?')) return;
    try { await api(`/conversations/${id}`, { method: 'DELETE' }); navigate('/conversations'); }
    catch (e) { setError(e); }
  };

  if (error) return <ErrorNote error={error} />;
  if (!conv) return <div className="py-20 text-center text-slate-400"><Spinner /></div>;

  const meta = conv.visitor_meta || {};

  return (
    <>
      <Link to="/conversations" className="text-sm text-indigo-600 hover:underline">← Все диалоги</Link>
      <div className="mt-3 grid gap-6 lg:grid-cols-[1fr_280px]">
        <Card className="p-4 sm:p-6">
          <div className="flex flex-col gap-3">
            {conv.messages.map((m) => (
              <div key={m.id} className={cx('flex flex-col', m.role === 'user' ? 'items-end' : 'items-start')}>
                <div
                  className={cx(
                    'max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm',
                    m.role === 'user' ? 'rounded-br-sm bg-indigo-600 text-white' : 'rounded-bl-sm bg-slate-100',
                  )}
                >
                  {m.text}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                  {fmtDate(m.created_at)}
                  {m.role === 'user' && m.answered === false && <Badge tone="amber">нет ответа в базе</Badge>}
                  {m.role === 'assistant' && m.latency_ms != null && <span>{(m.latency_ms / 1000).toFixed(1)} с</span>}
                  {m.role === 'assistant' && m.sources?.length > 0 && (
                    <details className="cursor-pointer">
                      <summary>источники ({m.sources.length})</summary>
                      <ul className="mt-1 space-y-0.5">
                        {m.sources.map((s) => <li key={s.chunkId}>{s.title} — {s.score}</li>)}
                      </ul>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="space-y-2 p-4 text-sm">
            <h2 className="font-medium">Информация</h2>
            <Row label="Начат" value={fmtDate(conv.started_at)} />
            <Row label="Посетитель" value={conv.visitor_id} mono />
            {meta.pageUrl && <Row label="Страница" value={meta.pageUrl} />}
            {meta.language && <Row label="Язык браузера" value={meta.language} />}
            <Row label="Сообщений" value={conv.message_count} />
          </Card>
          {conv.leads.length > 0 && (
            <Card className="space-y-2 p-4 text-sm">
              <h2 className="font-medium">Контакт посетителя</h2>
              {conv.leads.map((l) => (
                <div key={l.id}>
                  <div className="font-medium">{l.contact}</div>
                  {l.name && <div className="text-slate-600">{l.name}</div>}
                  {l.message && <div className="text-slate-600">{l.message}</div>}
                </div>
              ))}
            </Card>
          )}
          <Button variant="danger" className="w-full" onClick={remove}>Удалить диалог</Button>
        </div>
      </div>
    </>
  );
}

function Row({ label, value, mono }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className={cx('break-all', mono && 'font-mono text-xs')}>{value}</div>
    </div>
  );
}
