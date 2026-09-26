import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { cx } from './ui.jsx';

const NAV = [
  { to: '/', label: 'Обзор', end: true },
  { to: '/conversations', label: 'Диалоги' },
  { to: '/knowledge', label: 'База знаний' },
  { to: '/leads', label: 'Контакты' },
  { to: '/settings', label: 'Настройки бота' },
];

export default function Layout() {
  const { me, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="flex flex-col gap-1">
      {NAV.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.end}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            cx('rounded-lg px-3 py-2 text-sm font-medium', isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100')
          }
        >
          {n.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen lg:flex">
      {/* мобильная шапка */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <span className="font-semibold">AI-консультант</span>
        <button className="rounded-lg p-2 hover:bg-slate-100" onClick={() => setOpen(!open)} aria-label="Меню">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
      </div>
      {open && <div className="border-b border-slate-200 bg-white p-3 lg:hidden">{nav}</div>}

      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white p-4 lg:flex">
        <div className="mb-6 px-3">
          <div className="font-semibold">AI-консультант</div>
          <div className="truncate text-xs text-slate-500" title={me?.company_name}>{me?.company_name}</div>
        </div>
        {nav}
        <div className="mt-auto border-t border-slate-100 px-3 pt-4">
          <div className="truncate text-xs text-slate-500">{me?.email}</div>
          <button className="mt-1 text-sm text-slate-600 hover:text-slate-900" onClick={logout}>Выйти</button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
