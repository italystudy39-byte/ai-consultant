import { useState } from 'react';
import { useAuth } from '../auth.jsx';
import { Button, Card, ErrorNote, Input } from '../components/ui.jsx';

export default function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
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
    <div className="grid min-h-screen place-items-center px-4">
      <Card className="w-full max-w-sm p-6">
        <h1 className="text-xl font-semibold">AI-консультант</h1>
        <p className="mt-1 text-sm text-slate-500">
          {mode === 'login' ? 'Вход в панель управления' : 'Регистрация компании'}
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === 'register' && (
            <Input label="Название компании" value={form.companyName} onChange={set('companyName')} required />
          )}
          <Input label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} required />
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
          <Button type="submit" className="w-full" disabled={busy}>
            {mode === 'login' ? 'Войти' : 'Создать аккаунт'}
          </Button>
        </form>
        <button
          className="mt-4 w-full text-center text-sm text-indigo-600 hover:underline"
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }}
        >
          {mode === 'login' ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
        </button>
      </Card>
    </div>
  );
}
