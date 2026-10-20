import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Bot, ExternalLink, LayoutDashboard, LogOut, Menu, MessageSquare, Settings, Users, X } from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { cx } from './ui.jsx';

const NAV = [
  { to: '/', label: 'Обзор', icon: LayoutDashboard, end: true },
  { to: '/conversations', label: 'Диалоги', icon: MessageSquare },
  { to: '/knowledge', label: 'База знаний', icon: BookOpen },
  { to: '/leads', label: 'Контакты', icon: Users },
  { to: '/settings', label: 'Настройки бота', icon: Settings },
];

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/30">
        <Bot className="size-5" />
      </span>
      <span className="font-semibold text-white">AI-консультант</span>
    </div>
  );
}

function Sidebar({ me, logout, onNavigate }) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-slate-950 p-4 text-slate-300">
      {/* мягкое свечение в углу, как на лендинге */}
      <div className="pointer-events-none absolute -left-20 -top-20 size-64 rounded-full bg-indigo-600/25 blur-3xl" />
      <div className="relative mb-8 px-2 pt-1"><Logo /></div>

      <div className="relative mb-6 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
        <div className="text-[11px] uppercase tracking-wider text-slate-500">Компания</div>
        <div className="truncate text-sm font-medium text-white" title={me?.company_name}>{me?.company_name}</div>
      </div>

      <nav className="relative flex flex-col gap-1">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            onClick={onNavigate}
            className={({ isActive }) => cx(
              'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive ? 'text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white',
            )}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-lg bg-gradient-to-r from-indigo-500/25 to-indigo-500/5 ring-1 ring-inset ring-indigo-400/30"
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}
                <n.icon className={cx('relative size-4', isActive ? 'text-indigo-300' : 'text-slate-500 group-hover:text-slate-300')} />
                <span className="relative">{n.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="relative mt-auto space-y-1 border-t border-white/10 pt-4">
        <a href="/landing" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white">
          <ExternalLink className="size-4" /> Лендинг
        </a>
        <button onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white">
          <LogOut className="size-4" /> Выйти
        </button>
        <div className="truncate px-3 pt-2 text-xs text-slate-500">{me?.email}</div>
      </div>
    </div>
  );
}

export default function Layout() {
  const { me, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      {/* мобильная шапка */}
      <div className="sticky top-0 z-30 flex items-center justify-between bg-slate-950 px-4 py-3 lg:hidden">
        <Logo />
        <button className="rounded-lg p-2 text-slate-300 hover:bg-white/10" onClick={() => setOpen(true)} aria-label="Меню">
          <Menu className="size-5" />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-72 lg:hidden"
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            >
              <button className="absolute right-3 top-4 z-10 rounded-lg p-1.5 text-slate-400 hover:bg-white/10" onClick={() => setOpen(false)} aria-label="Закрыть">
                <X className="size-5" />
              </button>
              <Sidebar me={me} logout={logout} onNavigate={() => setOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 lg:block">
        <Sidebar me={me} logout={logout} />
      </aside>

      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-10">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-6xl"
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}
