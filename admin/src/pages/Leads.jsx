import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fmtDate } from '../api.js';
import { Card, Empty, ErrorNote, PageHeader, Spinner } from '../components/ui.jsx';

export default function Leads() {
  const [leads, setLeads] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { api('/leads').then(setLeads).catch(setError); }, []);

  return (
    <>
      <PageHeader title="Контакты" subtitle="Посетители, которые оставили контакт в чате" />
      <ErrorNote error={error} />
      <Card className="overflow-x-auto">
        {!leads ? <div className="py-12 text-center text-slate-400"><Spinner /></div> : leads.length === 0 ? (
          <Empty title="Пока никто не оставил контакт">Бот предлагает оставить контакт, когда не знает ответа.</Empty>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Дата</th>
                <th className="px-4 py-2 font-medium">Контакт</th>
                <th className="px-4 py-2 font-medium">Имя</th>
                <th className="px-4 py-2 font-medium">Диалог</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.map((l) => (
                <tr key={l.id}>
                  <td className="whitespace-nowrap px-4 py-2 text-slate-500">{fmtDate(l.created_at)}</td>
                  <td className="px-4 py-2 font-medium">{l.contact}</td>
                  <td className="px-4 py-2">{l.name || '—'}</td>
                  <td className="px-4 py-2">
                    {l.conversation_id ? <Link className="text-indigo-600 hover:underline" to={`/conversations/${l.conversation_id}`}>Открыть</Link> : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
