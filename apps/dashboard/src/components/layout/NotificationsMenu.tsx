import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { useApp } from '../../lib/app-context';
import { useMarkAllRead, useNotifications } from '../../data/queries';
import { materialInfo } from '../../data/catalog';
import { formatRelative } from '../../lib/dates';
import type { NotificationKind } from '../../data/types';
import { Icon, type IconName } from '../ui/Icon';

const KIND_STYLE: Record<NotificationKind, { icon: IconName; tone: string }> = {
  stale_decisions: { icon: 'clock', tone: 'bg-danger-soft text-danger-ink' },
  visit_failed: { icon: 'warn', tone: 'bg-danger-soft text-danger-ink' },
  partial_pickup: { icon: 'warn', tone: 'bg-accent-soft text-accent-ink' },
  branch_cancelled: { icon: 'x', tone: 'bg-accent-soft text-accent-ink' },
  visit_no_result: { icon: 'clock', tone: 'bg-primary-soft text-primary' },
  plan_completed: { icon: 'check', tone: 'bg-success-soft text-success' },
  other: { icon: 'bell', tone: 'bg-surface-2 text-muted' },
};

export function NotificationsMenu() {
  const { t, l, lang, dir, user } = useApp();
  const [open, setOpen] = useState(false);
  const { data } = useNotifications(user);
  const markAll = useMarkAllRead(user);
  const items = data ?? [];
  const unread = items.filter((n) => !n.read).length;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        aria-label={unread > 0 ? `${t.notifications} — ${t.unreadCount(unread)}` : t.notifications}
        className="relative inline-flex size-11 cursor-pointer items-center justify-center rounded-[14px] border border-white/[.16] bg-white/[.06] p-0 text-on-dark transition-colors hover:bg-white/[.12] focus-visible:outline-2 focus-visible:outline-gold"
      >
        <Icon name="bell" />
        {unread > 0 && (
          <span className="absolute -end-1.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-navy bg-coral px-1.5 text-[11px] font-extrabold text-navy-ink">
            {unread}
          </span>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          dir={dir}
          align="end"
          sideOffset={10}
          collisionPadding={16}
          className="z-40 box-border w-[400px] max-w-[calc(100vw-32px)] rounded-[18px] border border-line bg-surface p-2 text-ink shadow-pop"
        >
          <div className="flex items-center justify-between px-2.5 pb-1 pt-2">
            <div className="text-base font-extrabold">{t.notifications}</div>
            {unread > 0 && (
              <button type="button" onClick={() => markAll.mutate()} className="cursor-pointer border-0 bg-transparent p-2 text-[13px] font-bold text-primary hover:text-primary-hover">
                {t.markAllRead}
              </button>
            )}
          </div>
          <div className="px-2.5 pb-2 text-xs text-muted">{user.material ? t.notifScopeOne(l(materialInfo(user.material).name)) : t.notifScopeAll}</div>
          {items.length === 0 ? (
            <p className="m-0 px-3 pb-4 pt-1 text-sm text-muted">{t.noNotifications}</p>
          ) : (
            <ul className="m-0 flex max-h-[60vh] list-none flex-col gap-0.5 overflow-y-auto p-0">
              {items.map((n) => {
                const style = KIND_STYLE[n.kind];
                return (
                  <li key={n.id}>
                    <Link
                      to={n.href}
                      onClick={() => setOpen(false)}
                      className={clsx('flex items-start gap-3 rounded-[14px] p-3 text-ink no-underline transition-colors hover:bg-surface-2', !n.read && 'bg-surface-2')}
                    >
                      <span className={clsx('inline-flex size-9 flex-none items-center justify-center rounded-xl', style.tone)}>
                        <Icon name={style.icon} size={18} />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-sm font-bold">{l(n.title)}</span>
                        <span className="text-[13px] text-muted">{l(n.detail)}</span>
                        <span className="text-xs text-muted">{formatRelative(n.createdAt, lang)}</span>
                      </span>
                      {!n.read && <span aria-label={t.unread} className="mt-1.5 size-2 flex-none rounded-full bg-coral" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
