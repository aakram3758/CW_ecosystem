import type { ReactNode } from 'react';
import { useApp } from '../../lib/app-context';
import { useMenu } from './Layout';
import { Icon } from '../ui/Icon';
import { NotificationsMenu } from './NotificationsMenu';

const toolButton =
  'inline-flex h-11 min-w-11 cursor-pointer items-center justify-center gap-1.5 rounded-[14px] border border-white/[.16] bg-white/[.06] text-on-dark transition-colors hover:bg-white/[.12] focus-visible:outline-2 focus-visible:outline-gold';

/**
 * The navy header band shared by every page: breadcrumb + toolbar, then the page title area.
 * Content after the hero overlaps it by 64px (`-mt-16` in PageBody).
 */
export function PageHero({ crumb, parent, children }: { crumb: string; parent?: string; children?: ReactNode }) {
  const { t, l, theme, toggleTheme, toggleLang, user } = useApp();
  const menu = useMenu();

  return (
    <section className="relative rounded-b-[28px] bg-navy px-4 pb-24 pt-4 text-white sm:px-8">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-b-[28px]">
        <div className="absolute -top-[230px] size-[440px] rounded-full border border-white/[.08] ltr:-right-[120px] rtl:-left-[120px]" />
        <div className="absolute -top-[70px] size-[260px] rounded-full border border-gold/[.22] ltr:right-[160px] rtl:left-[160px]" />
        <div className="absolute -bottom-[120px] size-[190px] rounded-full border border-white/[.08] ltr:left-[34%] rtl:right-[34%]" />
      </div>

      <div className="relative z-10 flex flex-wrap items-center gap-2.5">
        <button type="button" onClick={menu.open} aria-label={t.openMenu} className={`${toolButton} p-0 lg:hidden`}>
          <Icon name="menu" />
        </button>
        <div className="flex-1 sm:hidden" />
        <div className="hidden min-w-40 flex-1 text-sm text-side-muted sm:block">
          {parent ?? t.dashboard} <span className="opacity-50">/</span> <span className="font-bold text-white">{crumb}</span>
        </div>
        <button type="button" onClick={toggleLang} aria-label={t.switchLang} className={`${toolButton} px-3.5 text-[13px] font-bold leading-none`}>
          <Icon name="globe" size={18} />
          {t.langButton}
        </button>
        <button type="button" onClick={toggleTheme} aria-label={theme === 'dark' ? t.toLight : t.toDark} className={`${toolButton} p-0`}>
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
        </button>
        <NotificationsMenu />
        <div aria-hidden="true" className="flex size-11 items-center justify-center rounded-[14px] bg-gold text-[15px] font-extrabold text-navy-ink">
          {l(user.initials)}
        </div>
      </div>

      {children && <div className="relative z-[2] mt-7">{children}</div>}
    </section>
  );
}

/** "الطلبات / 30 طلبًا خلال آخر 30 يومًا" — the two-line page title used on inner pages. */
export function HeroTitle({ title, line }: { title: ReactNode; line?: ReactNode }) {
  return (
    <h1 className="m-0 text-[30px] font-extrabold leading-tight sm:text-[36px]">
      {title}
      {line !== undefined && (
        <>
          <br />
          <span className="text-gold">{line}</span>
        </>
      )}
    </h1>
  );
}

/** Page content area that overlaps the hero. */
export function PageBody({ children }: { children: ReactNode }) {
  return <div className="relative z-[2] -mt-16 flex flex-col gap-4 px-4 pb-12 sm:px-8">{children}</div>;
}
