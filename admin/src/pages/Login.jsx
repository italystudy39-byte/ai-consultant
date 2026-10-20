import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, BarChart3, BookOpen, Bot, MessageSquare } from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { Button, ErrorNote, Input } from '../components/ui.jsx';

const POINTS = [
  { icon: BookOpen, text: 'Отвечает только по вашей базе знаний' },
  { icon: MessageSquare, text: 'Виджет на сайт одной строкой кода' },
  { icon: BarChart3, text: 'Аналитика вопросов и заявки клиентов' },
];

export default function Login() {
  const { login, register } = useAuth();
  const [params] = useSearchParams();
  const [mode, setMode] = useState(params.get('mode') === 'register' ? 'register' : 'login');
  const [form, setForm] = useState({ companyName: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form.companyName, form.email, form.password);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* левая панель — в стиле лендинга */}
      <div className="relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col">
        <motion.div
          className="pointer-events-none absolute -left-32 -top-32 size-[30rem] rounded-full bg-indigo-600/40 blur-3xl"
          animate={{ x: [0, 40, 0], y: [0, 30, 0] }} transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="pointer-events-none absolute -bottom-24 -right-24 size-[24rem] rounded-full bg-fuchsia-500/30 blur-3xl"
          animate={{ x: [0, -30, 0], y: [0, -40, 0] }} transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />

        <Link to="/" className="relative flex items-center gap-2.5 font-semibold">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-lg shadow-indigo-500/30">
            <Bot className="size-5" />
          </span>
          AI-консультант
        </Link>

        <div className="relative my-auto max-w-md">
          <h2 className="text-4xl font-bold leading-tight tracking-tight">Консультант, который знает ваш бизнес</h2>
          <ul className="mt-8 space-y-4">
            {POINTS.map((p, i) => (
              <motion.li
                key={p.text}
                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.1 }}
                className="flex items-center gap-3 text-slate-300"
              >
                <span className="grid size-9 place-items-center rounded-lg border border-white/10 bg-white/5"><p.icon className="size-4 text-indigo-300" /></span>
                {p.text}
              </motion.li>
            ))}
          </ul>
        </div>
      </div>

      {/* форма */}
      <div className="relative flex flex-col bg-white px-6 py-8 sm:px-12">
        <Link to="/" className="inline-flex w-fit items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="size-4" /> На главную
        </Link>

        <div className="mx-auto my-auto w-full max-w-sm py-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <h1 className="text-3xl font-bold tracking-tight">{mode === 'login' ? 'С возвращением' : 'Создайте аккаунт'}</h1>
              <p className="mt-2 text-sm text-slate-500">
                {mode === 'login' ? 'Войдите в панель управления консультантом' : 'Регистрация компании займёт минуту'}
              </p>
            </motion.div>
          </AnimatePresence>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <AnimatePresence initial={false}>
              {mode === 'register' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <Input label="Название компании" value={form.companyName} onChange={set('companyName')} required />
                </motion.div>
              )}
            </AnimatePresence>
            <Input label="Email" type="email" autoComplete="email" placeholder="you@company.ru" value={form.email} onChange={set('email')} required />
            <Input
              label="Пароль"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={8}
              hint={mode === 'register' ? 'Не короче 8 символов' : undefined}
              value={form.password}
              onChange={set('password')}
              required
            />
            <ErrorNote error={error} />
            <Button type="submit" className="h-10 w-full" disabled={busy}>
              {busy ? 'Подождите…' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            {mode === 'login' ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
            <button
              className="font-medium text-indigo-600 hover:underline"
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }}
            >
              {mode === 'login' ? 'Зарегистрироваться' : 'Войти'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
