import { Component, type ReactNode } from 'react';
import clsx from 'clsx';
import { useApp } from '../../lib/app-context';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';

export const cardClass = 'rounded-[20px] border border-line bg-surface shadow-card';

export function EmptyState({
  icon = 'req',
  tone = 'muted',
  title,
  body,
  action,
  className,
}: {
  icon?: IconName;
  tone?: 'muted' | 'success';
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx(cardClass, 'flex flex-col items-center gap-3 px-6 py-14 text-center', className)}>
      <span className={clsx('inline-flex size-16 items-center justify-center rounded-[20px]', tone === 'success' ? 'bg-success-soft text-success' : 'bg-surface-2 text-muted')}>
        <Icon name={icon} size={30} strokeWidth={1.6} />
      </span>
      <h2 className="m-0 text-xl font-extrabold">{title}</h2>
      {body && <p className="m-0 max-w-[440px] text-[15px] text-muted">{body}</p>}
      {action && <div className="mt-1.5">{action}</div>}
    </div>
  );
}

export function ErrorState({ title, body, onRetry, className }: { title?: ReactNode; body: ReactNode; onRetry: () => void; className?: string }) {
  const { t } = useApp();
  return (
    <div role="alert" className={clsx(cardClass, 'flex flex-col items-center gap-3 px-6 py-14 text-center', className)}>
      <span className="inline-flex size-16 items-center justify-center rounded-[20px] bg-danger-soft text-danger-ink">
        <Icon name="warn" size={30} strokeWidth={1.6} />
      </span>
      <h2 className="m-0 text-xl font-extrabold">{title ?? t.loadError}</h2>
      <p className="m-0 text-[15px] text-muted">{body}</p>
      <Button variant="gold" size="lg" onClick={onRetry} className="mt-1.5">
        {t.retry}
      </Button>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('skeleton', className)} />;
}

export function LoadingBlock({ children }: { children: ReactNode }) {
  const { t } = useApp();
  return (
    <div aria-busy="true" aria-label={t.loading}>
      {children}
    </div>
  );
}

/** Striped placeholder where a photo will be shown once uploads exist. */
export function PhotoPlaceholder({ label, className }: { label: string; className?: string }) {
  return (
    <div role="img" aria-label={label} className={clsx('photo-placeholder flex items-end rounded-2xl border border-dashed border-line p-3', className)}>
      <span className="rounded-[10px] border border-line bg-surface px-2.5 py-1.5 text-[13px] font-bold">{label}</span>
    </div>
  );
}

/**
 * Catches a page that throws while rendering (or a lazy chunk that fails to load), so the sidebar
 * stays and the page shows the error state instead of the whole app going blank. Retry reloads:
 * a failed chunk needs a fresh load, and a render error has nothing to retry in place.
 */
export class PageErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <PageError /> : this.props.children;
  }
}

function PageError() {
  const { t } = useApp();
  return (
    <div className="p-6">
      <ErrorState body={t.pageErrorBody} onRetry={() => window.location.reload()} />
    </div>
  );
}
