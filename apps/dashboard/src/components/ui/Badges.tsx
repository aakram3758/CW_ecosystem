import clsx from 'clsx';
import type { MaterialCode, RequestStatus, SubtypeCode, VisitOutcome } from '../../data/types';
import { MATERIALS } from '../../data/catalog';
import { useApp } from '../../lib/app-context';
import { materialColor, materialLabel } from '../../lib/format';
import { PathIcon } from './Icon';

const pill = 'inline-flex items-center self-start justify-self-start whitespace-nowrap rounded-full px-2.5 py-1 font-bold';

const STATUS_TONE: Record<RequestStatus, string> = {
  waiting: 'bg-accent-soft text-accent-ink',
  scheduled: 'bg-primary-soft text-primary',
  needs_decision: 'bg-danger-soft text-danger-ink',
  completed: 'bg-success-soft text-success',
  closed: 'bg-surface-2 text-muted',
  cancelled: 'border border-line bg-transparent text-muted',
};

export function StatusPill({ status, className }: { status: RequestStatus; className?: string }) {
  const { t } = useApp();
  return <span className={clsx(pill, 'text-[13px]', STATUS_TONE[status], className)}>{t.status[status]}</span>;
}

const OUTCOME_TONE: Record<VisitOutcome | 'pending', string> = {
  pending: 'bg-surface-2 text-muted',
  full: 'bg-success-soft text-success',
  partial: 'bg-accent-soft text-accent-ink',
  failed: 'bg-danger-soft text-danger-ink',
  no_result: 'bg-primary-soft text-primary',
};

export function OutcomePill({ outcome, className }: { outcome: VisitOutcome | 'pending'; className?: string }) {
  const { t } = useApp();
  return (
    <span className={clsx(pill, 'text-xs font-extrabold', OUTCOME_TONE[outcome], className)}>
      {outcome === 'pending' ? t.outcomePending : t.outcome[outcome]}
    </span>
  );
}

/** Coloured chip with the material icon: "🟫 بلاستيك · مكس". */
export function MaterialChip({ material, subtype }: { material: MaterialCode; subtype: SubtypeCode | null }) {
  const { lang, theme } = useApp();
  const c = materialColor(material, theme === 'dark');
  return (
    <span className={clsx(pill, 'gap-1.5 ps-2 text-[13px]')} style={{ color: c, background: `${c}1F` }}>
      <PathIcon d={MATERIALS[material].icon} size={14} />
      <span className="text-ink">{materialLabel(material, subtype, lang)}</span>
    </span>
  );
}

/** Square icon tile in the material's colour. */
export function MaterialTile({ material, size = 32 }: { material: MaterialCode; size?: number }) {
  const { theme } = useApp();
  const c = materialColor(material, theme === 'dark');
  return (
    <span
      className="inline-flex flex-none items-center justify-center"
      style={{ width: size, height: size, borderRadius: Math.round(size / 3.2), color: c, background: `${c}22` }}
    >
      <PathIcon d={MATERIALS[material].icon} size={Math.round(size / 2)} />
    </span>
  );
}

export function CountBadge({ n, on }: { n: number; on: boolean }) {
  return <span className={clsx('rounded-full px-2 py-px text-xs', on ? 'bg-gold text-navy-ink' : 'bg-surface-2 text-muted')}>{n}</span>;
}
