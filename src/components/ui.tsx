import React from 'react';
import { clsx } from 'clsx';

export function Card({ title, subtitle, children, className }: { title?: React.ReactNode; subtitle?: React.ReactNode; children: React.ReactNode; className?: string; }) {
  return (
    <div className={clsx('glass rounded-3xl p-4', className)}>
      {(title || subtitle) && (
        <div className="mb-3">
          {title && <div className="font-title text-lg text-mint-900">{title}</div>}
          {subtitle && <div className="text-xs text-mint-900/70">{subtitle}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="font-title text-base text-mint-900">{children}</div>;
}

export function Field({ label, hint, children }: { label: React.ReactNode; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-semibold text-mint-900/80">{label}</div>
      {children}
      {hint && <div className="mt-1 text-[11px] text-mint-900/60">{hint}</div>}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        'w-full rounded-2xl border border-mint-200 bg-white/70 px-3 py-2 text-sm text-mint-950 shadow-sm outline-none transition focus:border-mint-400 focus:ring-4 focus:ring-mint-200/50',
        props.className
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={clsx(
        'w-full rounded-2xl border border-mint-200 bg-white/70 px-3 py-2 text-sm text-mint-950 shadow-sm outline-none transition focus:border-mint-400 focus:ring-4 focus:ring-mint-200/50',
        props.className
      )}
    />
  );
}

export function Button({ variant = 'primary', className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' | 'soft' }) {
  const base = 'rounded-2xl px-4 py-2 text-sm font-semibold transition active:scale-[0.99]';
  const variants: Record<string, string> = {
    primary: 'bg-gradient-to-br from-mint-500 to-mint-700 text-white shadow hover:from-mint-400 hover:to-mint-700',
    soft: 'bg-white/70 text-mint-950 ring-1 ring-mint-200 hover:bg-white',
    ghost: 'bg-transparent text-mint-900 hover:bg-mint-100',
    danger: 'bg-gradient-to-br from-red-500 to-red-700 text-white shadow hover:from-red-400 hover:to-red-700'
  };
  return <button {...props} className={clsx(base, variants[variant], className)} />;
}

export function Toggle({ checked, onChange, label, emoji }: { checked: boolean; onChange: (v: boolean) => void; label: React.ReactNode; emoji?: string; }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={clsx(
        'flex w-full items-center justify-between gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold transition',
        checked ? 'border-mint-400 bg-mint-100 text-mint-950' : 'border-mint-200 bg-white/60 text-mint-900 hover:bg-white'
      )}
    >
      <div className="flex items-center gap-2">
        {emoji && <span>{emoji}</span>}
        <span>{label}</span>
      </div>
      <div
        className={clsx(
          'h-6 w-11 rounded-full p-1 transition',
          checked ? 'bg-gradient-to-br from-mint-400 to-mint-600' : 'bg-mint-200'
        )}
      >
        <div
          className={clsx(
            'h-4 w-4 rounded-full bg-white shadow transition',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
          style={{ transformOrigin: 'center' }}
        />
      </div>
    </button>
  );
}

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'red' | 'orange' | 'yellow' | 'green'; children: React.ReactNode }) {
  const map: Record<string, string> = {
    neutral: 'bg-white/70 text-mint-900 ring-1 ring-mint-200',
    red: 'bg-red-50 text-red-800 ring-1 ring-red-200',
    orange: 'bg-orange-50 text-orange-800 ring-1 ring-orange-200',
    yellow: 'bg-yellow-50 text-yellow-900 ring-1 ring-yellow-200',
    green: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
  };
  return <span className={clsx('inline-flex items-center rounded-2xl px-2 py-1 text-xs font-bold', map[tone])}>{children}</span>;
}
