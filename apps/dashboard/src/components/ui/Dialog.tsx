import * as RD from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import clsx from 'clsx';
import { useApp } from '../../lib/app-context';
import { Icon } from './Icon';

/**
 * Centered modal (Radix Dialog: focus trap, Esc to close, scroll lock) with the design's navy header.
 */
export function Dialog({
  open,
  onOpenChange,
  kicker,
  title,
  children,
  width = 540,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kicker?: ReactNode;
  title: ReactNode;
  children: ReactNode;
  width?: number;
}) {
  const { dir, t } = useApp();
  return (
    <RD.Root open={open} onOpenChange={onOpenChange}>
      <RD.Portal>
        <RD.Overlay className="fixed inset-0 z-[60] bg-[rgba(7,19,34,.55)]" />
        <RD.Content
          dir={dir}
          aria-describedby={undefined}
          style={{ width }}
          className="fixed start-1/2 top-1/2 z-[61] max-h-[calc(100vh-32px)] max-w-[calc(100vw-32px)] -translate-y-1/2 overflow-y-auto rounded-[22px] bg-surface text-ink shadow-[0_24px_60px_rgba(0,0,0,.35)] ltr:-translate-x-1/2 rtl:translate-x-1/2"
        >
          <div className="flex items-start gap-3 bg-navy px-6 py-5 text-white">
            <div className="flex-1">
              {kicker && <div className="text-[13px] text-side-muted">{kicker}</div>}
              <RD.Title className="m-0 text-[22px] font-extrabold leading-snug">{title}</RD.Title>
            </div>
            <RD.Close aria-label={t.close} className="inline-flex size-10 flex-none cursor-pointer items-center justify-center rounded-xl border-0 bg-white/10 text-white">
              <Icon name="close" size={18} />
            </RD.Close>
          </div>
          <div className="flex flex-col gap-3.5 px-6 pb-6 pt-5">{children}</div>
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}

/** Side drawer that slides from the inline-end edge (left in Arabic, right in English). */
export function Sheet({
  open,
  onOpenChange,
  title,
  header,
  children,
  width = 560,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  header: ReactNode;
  children: ReactNode;
  width?: number;
  className?: string;
}) {
  const { dir, t } = useApp();
  return (
    <RD.Root open={open} onOpenChange={onOpenChange}>
      <RD.Portal>
        <RD.Overlay className="fixed inset-0 z-50 bg-[rgba(7,19,34,.5)]" />
        <RD.Content
          dir={dir}
          aria-describedby={undefined}
          style={{ width }}
          className={clsx('fixed inset-y-0 end-0 z-[55] flex max-w-[100vw] flex-col overflow-y-auto bg-canvas text-ink shadow-[0_0_40px_rgba(0,0,0,.3)]', className)}
        >
          <div className="flex flex-col gap-2.5 rounded-b-3xl bg-navy px-6 pb-6 pt-5 text-white">
            <div className="flex items-start gap-2.5">
              <RD.Title className="m-0 flex-1 text-sm font-normal text-side-muted">{title}</RD.Title>
              <RD.Close aria-label={t.close} className="inline-flex size-11 flex-none cursor-pointer items-center justify-center rounded-[14px] border border-white/[.16] bg-white/[.06] text-white">
                <Icon name="close" />
              </RD.Close>
            </div>
            {header}
          </div>
          {children}
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}
