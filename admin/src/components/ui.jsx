// Небольшой набор UI-примитивов на Tailwind
export const cx = (...c) => c.filter(Boolean).join(' ');

export function Button({ variant = 'primary', className, ...props }) {
  const styles = {
    primary: 'bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-sm shadow-indigo-600/25 ring-1 ring-inset ring-white/10 hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-50',
    secondary: 'bg-white text-slate-700 shadow-xs ring-1 ring-inset ring-slate-200 hover:bg-slate-50 hover:ring-slate-300 disabled:opacity-50',
    danger: 'bg-white text-red-600 shadow-xs ring-1 ring-inset ring-red-200 hover:bg-red-50 disabled:opacity-50',
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50',
  };
  return (
    <button
      type="button"
      className={cx('inline-flex items-center justify-center gap-2 h-9 rounded-lg px-3.5 text-sm font-medium transition-all active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed', styles[variant], className)}
      {...props}
    />
  );
}

export function Card({ className, children }) {
  return <div className={cx('rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_16px_-8px_rgba(15,23,42,0.08)]', className)}>{children}</div>;
}

export function Input({ label, hint, className, ...props }) {
  return (
    <label className={cx('block', className)}>
      {label && <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>}
      <input
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-xs outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
        {...props}
      />
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function Textarea({ label, className, ...props }) {
  return (
    <label className={cx('block', className)}>
      {label && <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>}
      <textarea
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-xs outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
        {...props}
      />
    </label>
  );
}

export function Select({ label, children, className, ...props }) {
  return (
    <label className={cx('block', className)}>
      {label && <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>}
      <select
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-xs outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export function Badge({ tone = 'slate', children }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700 ring-slate-500/10',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
    amber: 'bg-amber-50 text-amber-800 ring-amber-600/20',
    red: 'bg-red-50 text-red-700 ring-red-600/15',
    indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-600/15',
  };
  return <span className={cx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', tones[tone])}>{children}</span>;
}

export function Spinner({ className }) {
  return <span className={cx('inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent', className)} aria-label="Загрузка" />;
}

export function Empty({ title, children }) {
  return (
    <div className="px-6 py-12 text-center">
      <div className="mx-auto mb-3 grid size-10 place-items-center rounded-full bg-slate-100 text-slate-400">○</div>
      <p className="font-medium text-slate-700">{title}</p>
      {children && <div className="mt-1 text-sm text-slate-500">{children}</div>}
    </div>
  );
}

export function ErrorNote({ error }) {
  if (!error) return null;
  return <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{String(error.message || error)}</div>;
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
