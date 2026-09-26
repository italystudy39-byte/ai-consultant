import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, download, fmtDate, qs } from '../api.js';
import { Badge, Button, Card, Empty, ErrorNote, Input, PageHeader, Spinner } from '../components/ui.jsx';

const LIMIT = 20;

export default function Conversations() {
  const [sp, setSp] = useSearchParams();
  const filters = {
    q: sp.get('q') || '',
    from: sp.get('from') || '',
    to: sp.get('to') || '',
    unanswered: sp.get('unanswered') === 'true',
    page: Number(sp.get('page')) || 1,
  };
  const [search, setSearch] = useState(filters.q);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  const update = (patch) => {
    const next = { ...filters, page: 1, ...patch };
    const p = {};
    Object.entries(next).forEach(([k, v]) => { if (v && !(k === 'page' && v === 1)) p[k] = String(v); });
    setSp(p);
  };

  const key = sp.toString();
  useEffect(() => {
    setData(null);
    setError(null);
    api(`/conversations${qs({ ...filters, limit: LIMIT })}`).then(setData).catch(setError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const pages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;
  const { page: _p, ...exportFilters } = filters;

  const exportCsv = async () => {
    setExporting(true);
    try { await download(`/conversations/export.csv${qs(exportFilters)}`, `conversations-${new Date().toISOString().slice(0, 10)}.csv`); }
    catch (e) { setError(e); }
    finally { setExporting(false); }
  };

  return (
    <>
      <PageHeader
        title="Диалоги"
        subtitle={data ? `Найдено: ${data.total}` : ' '}
        actions={<Button variant="secondary" onClick={exportCsv} disabled={exporting}>{exporting ? <Spinner /> : null}Экспорт CSV</Button>}
      />

      <Card className="mb-4 p-4">
        <form
          className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-end"
          onSubmit={(e) => { e.preventDefault(); update({ q: search.trim() }); }}
        >
          <Input label="Поиск по тексту сообщений" placeholder="Например: доставка" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Input label="С" type="date" value={filters.from} onChange={(e) => update({ from: e.target.value })} />
          <Input label="По" type="date" value={filters.to} onChange={(e) => update({ to: e.target.value })} />
          <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
            <input type="checkbox" className="h-4 w-4 accent-indigo-600" checked={filters.unanswered} onChange={(e) => update({ unanswered: e.target.checked })} />
            Без ответа
          </label>
          <Button type="submit">Найти</Button>
        </form>
      </Card>

      <ErrorNote error={error} />

      <Card className="overflow-hidden">
        {!data ? (
          !error && <div className="py-16 text-center text-slate-400"><Spinner /></div>
        ) : data.items.length === 0 ? (
          <Empty title="Диалогов не найдено">Установите виджет на сайт или измените фильтры.</Empty>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.items.map((c) => (
              <li key={c.id}>
                <Link to={`/conversations/${c.id}`} className="flex flex-col gap-1 px-4 py-3 hover:bg-slate-50 sm:flex-row sm:items-center sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{c.first_question || <span className="text-slate-400">Без сообщений</span>}</div>
                    <div className="truncate text-xs text-slate-500">
                      Посетитель {c.visitor_id.slice(0, 10)}… {c.page_url && <>· {c.page_url}</>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {c.has_unanswered && <Badge tone="amber">без ответа</Badge>}
                    {c.has_lead && <Badge tone="green">контакт</Badge>}
                    <Badge>{c.message_count} сообщ.</Badge>
                    <span className="w-32 text-right text-xs text-slate-500">{fmtDate(c.last_message_at)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {data && pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <Button variant="secondary" disabled={filters.page <= 1} onClick={() => update({ page: filters.page - 1 })}>Назад</Button>
          <span className="tabular-nums text-slate-600">{filters.page} / {pages}</span>
          <Button variant="secondary" disabled={filters.page >= pages} onClick={() => update({ page: filters.page + 1 })}>Вперёд</Button>
        </div>
      )}
    </>
  );
}
