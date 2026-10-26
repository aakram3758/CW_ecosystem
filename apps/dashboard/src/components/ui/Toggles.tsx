import type { ReactNode } from 'react';
import clsx from 'clsx';
import { CountBadge } from './Badges';

export interface ToggleOption<T extends string> {
  value: T;
  label: ReactNode;
  count?: number;
}

/**
 * A row of mutually exclusive toggle buttons (aria-pressed).
 * `tone="dark"` for the navy hero band, `tone="light"` for cards, `tone="chips"` for rounded filter chips with counts.
 */
export function ToggleGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  tone = 'light',
  className,
}: {
  label: string;
  options: ToggleOption<T>[];
  value: T;
  onChange: (v: T) => void;
  tone?: 'dark' | 'light' | 'chips';
  className?: string;
}) {
  if (tone === 'chips') {
    return (
      <div role="group" aria-label={label} className={clsx('flex flex-wrap items-center gap-2', className)}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(o.value)}
              className={clsx(
                'inline-flex min-h-[38px] cursor-pointer items-center gap-2 rounded-full border px-3.5 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-primary',
                on ? 'border-side bg-side text-white' : 'border-line bg-surface text-ink hover:bg-surface-2',
              )}
            >
              {o.label}
              {o.count !== undefined && <CountBadge n={o.count} on={on} />}
            </button>
          );
        })}
      </div>
    );
  }

  const dark = tone === 'dark';
  return (
    <div
      role="group"
      aria-label={label}
      className={clsx(
        'flex flex-wrap gap-1 p-1',
        dark ? 'rounded-2xl border border-white/[.12] bg-white/[.07]' : 'rounded-[14px] bg-surface-2',
        className,
      )}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={clsx(
              'inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-[10px] border-0 px-3.5 text-sm font-bold transition-colors focus-visible:outline-2',
              dark
                ? on
                  ? 'bg-gold text-navy-ink focus-visible:outline-white'
                  : 'bg-transparent text-side-text hover:bg-white/[.08] focus-visible:outline-gold'
                : on
                  ? 'bg-side text-white focus-visible:outline-primary'
                  : 'bg-transparent text-ink hover:bg-surface focus-visible:outline-primary',
            )}
          >
            {o.label}
            {o.count !== undefined && <CountBadge n={o.count} on={on} />}
          </button>
        );
      })}
    </div>
  );
}
