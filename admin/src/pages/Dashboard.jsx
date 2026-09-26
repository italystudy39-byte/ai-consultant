import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fmtDate, qs } from '../api.js';
import { Badge, Card, Empty, ErrorNote, Input, PageHeader, Spinner } from '../components/ui.jsx';

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

function Stat({ label, value, hint }) {
  return (
    <Card className="p-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">{value ?? '—'}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </Card>
  );
}

/** Столбчатая диаграмма диалогов по дням (одна серия, hover-подсказка, табличный вид) */
function DailyChart({ data }) {
  const [hover, setHover] = useState(null);
  const [asTable, setAsTable] = useState(false);
  const max = Math.max(1, ...data.map((d) => d.conversations));
  const ticks = [...new Set([0, Math.ceil(max / 2), max])];

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium">Диалоги по дням</h2>
        <button className="text-xs text-slate-500 hover:text-slate-800" onClick={() => setAsTable(!asTable)}>
          {asTable ? 'График' : 'Таблица'}
        </button>
      </div>
      {asTable ? (
        <div className="max-h-56 overflow-auto text-sm">
          <table className="w-full">
            <thead className="text-left text-slate-500"><tr><th className="py-1 font-normal">Дата</th><th className="py-1 text-right font-normal">Диалогов</th></tr></thead>
            <tbody>{data.map((d) => (
              <tr key={d.date} className="border-t border-slate-100"><td className="py-1">{d.date}</td><td className="py-1 text-right tabular-nums">{d.conversations}</td></tr>
            ))}</tbody>
          </table>
        </div>
      ) : (
        <div className="relative flex h-48 gap-2">
          <div className="flex flex-col justify-between pb-5 text-right text-[11px] tabular-nums text-slate-400">
            {[...ticks].reverse().map((t) => <span key={t}>{t}</span>)}
          </div>
          <div className="relative flex-1">
            <div className="absolute inset-x-0 top-0 bottom-5 flex flex-col justify-between">
              {ticks.map((t) => <div key={t} className="border-t border-slate-100" />)}
            </div>
            <div className="absolute inset-x-0 top-0 bottom-5 flex items-end gap-[2px]" onMouseLeave={() => setHover(null)}>
              {data.map((d, i) => (
                <div
                  key={d.date}
                  className="group relative flex h-full flex-1 items-end"
                  onMouseEnter={() => setHover(i)}
                >
                  <div
                    className={`w-full rounded-t ${hover === i ? 'bg-indigo-700' : 'bg-indigo-500'}`}
                    style={{ height: `${(d.conversations / max) * 100}%`, minHeight: d.conversations ? 2 : 0 }}
                  />
                </div>
              ))}
            </div>
            {hover !== null && (
              <div
                className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white shadow"
                style={{ left: `${((hover + 0.5) / data.length) * 100}%` }}
              >
                {data[hover].date}: <b className="tabular-nums">{data[hover].conversations}</b>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 flex justify-between text-[11px] text-slate-400">
              <span>{data[0]?.date.slice(5)}</span>
              <span>{data.at(-1)?.date.slice(5)}</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function Dashboard() {
  const [range, setRange] = useState({ from: daysAgo(29), to: today() });
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setError(null);
    api(`/analytics${qs(range)}`).then(setData).catch(setError);
  }, [range]);

  const t = data?.totals;

  return (
    <>
      <PageHeader
        title="Обзор"
        subtitle="Активность AI-консультанта за период"
        actions={
          <div className="flex items-end gap-2">
            <Input type="date" value={range.from} max={range.to} onChange={(e) => setRange({ ...range, from: e.target.value })} aria-label="С" />
            <Input type="date" value={range.to} min={range.from} onChange={(e) => setRange({ ...range, to: e.target.value })} aria-label="По" />
          </div>
        }
      />
      <ErrorNote error={error} />
      {!data ? (
        !error && <div className="py-20 text-center text-slate-400"><Spinner /></div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Диалогов" value={t.conversations} hint={`${t.visitors} уникальных посетителей`} />
            <Stat label="Вопросов" value={t.questions} />
            <Stat label="Без ответа" value={t.unanswered} hint={t.answerRate !== null ? `Доля ответов: ${t.answerRate}%` : undefined} />
            <Stat label="Оставили контакт" value={t.leads} />
          </div>

          <DailyChart data={data.daily} />

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h2 className="border-b border-slate-100 px-4 py-3 font-medium">Топ вопросов</h2>
              {data.topQuestions.length === 0 ? <Empty title="Пока нет вопросов" /> : (
                <ol className="divide-y divide-slate-100">
                  {data.topQuestions.map((q, i) => (
                    <li key={i} className="flex items-start gap-3 px-4 py-2.5 text-sm">
                      <span className="w-5 shrink-0 text-slate-400 tabular-nums">{i + 1}.</span>
                      <span className="flex-1">{q.question}</span>
                      {q.has_unanswered && <Badge tone="amber">без ответа</Badge>}
                      <span className="shrink-0 font-medium tabular-nums">{q.count}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>

            <Card>
              <div className="border-b border-slate-100 px-4 py-3">
                <h2 className="font-medium">Вопросы без ответа</h2>
                <p className="text-xs text-slate-500">Добавьте ответы на них в базу знаний</p>
              </div>
              {data.unansweredQuestions.length === 0 ? <Empty title="Все вопросы получили ответ" /> : (
                <ul className="max-h-96 divide-y divide-slate-100 overflow-auto">
                  {data.unansweredQuestions.map((q) => (
                    <li key={q.id} className="px-4 py-2.5 text-sm">
                      <Link to={`/conversations/${q.conversation_id}`} className="hover:text-indigo-700">{q.text}</Link>
                      <div className="text-xs text-slate-400">{fmtDate(q.created_at)}</div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
