// Небольшой набор UI-примитивов на Tailwind
export const cx = (...c) => c.filter(Boolean).join(' ');

export function Button({ variant = 'primary', className, ...props }) {
  const styles = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300',
    secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 disabled:opacity-50',
    danger: 'bg-white text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50',
    ghost: 'text-slate-600 hover:bg-slate-100 disabled:opacity-50',
  };
  return (
    <button
      type="button"
      className={cx('inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed', styles[variant], className)}
      {...props}
    />
  );
}

export function Card({ className, children }) {
  return <div className={cx('rounded-xl border border-slate-200 bg-white shadow-sm', className)}>{children}</div>;
}

export function Input({ label, hint, className, ...props }) {
  return (
    <label className={cx('block', className)}>
      {label && <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>}
      <input
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
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
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
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
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export function Badge({ tone = 'slate', children }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-800',
    red: 'bg-red-50 text-red-700',
    indigo: 'bg-indigo-50 text-indigo-700',
  };
  return <span className={cx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', tones[tone])}>{children}</span>;
}

export function Spinner({ className }) {
  return <span className={cx('inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent', className)} aria-label="Загрузка" />;
}

export function Empty({ title, children }) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="font-medium text-slate-700">{title}</p>
      {children && <div className="mt-1 text-sm text-slate-500">{children}</div>}
    </div>
  );
}

export function ErrorNote({ error }) {
  if (!error) return null;
  return <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{String(error.message || error)}</div>;
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
