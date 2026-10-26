import { Fragment } from 'react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { NAV_ITEMS } from './navigation';
import { useApp } from '../../lib/app-context';
import { useRequests } from '../../data/queries';
import { materialInfo } from '../../data/catalog';
import { Icon } from '../ui/Icon';
import logo from '../../assets/logo.png';

/** "Needs decision" count in the user's scope: GM = every material, supervisor = own material. */
export function useDecisionCount() {
  const { user } = useApp();
  const { data } = useRequests();
  return (data ?? []).filter((r) => r.status === 'needs_decision' && (!user.material || r.material === user.material)).length;
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { t, l, lang, user, signOut } = useApp();
  const decisionCount = useDecisionCount();
  const mats = user.materials?.length ? user.materials : user.material ? [user.material] : [];
  const roleLabel = user.role === 'gm' ? t.roles.gm : t.roles.supervisor(mats.map((m) => l(materialInfo(m).name)).join(lang === 'ar' ? '، ' : ', '));

  return (
    <div className="flex h-full flex-col gap-1 bg-side px-3.5 py-[22px] text-on-dark">
      <div className="flex justify-center px-2.5 pb-5 pt-1">
        <img src={logo} alt={t.logoAlt} className="h-[78px] w-auto" />
      </div>

      <nav aria-label={t.mainMenu} className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => (
          <Fragment key={item.key}>
            {item.section && <div className="px-3 pb-1.5 pt-4 text-xs font-bold text-side-label ltr:uppercase ltr:tracking-wider">{t.nav[item.section]}</div>}
            <NavLink
              to={item.path}
              end={item.path === '/'}
              onClick={onNavigate}
              className={({ isActive }) =>
                clsx(
                  'flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] no-underline transition-colors hover:bg-white/[.07] focus-visible:outline-2 focus-visible:outline-gold',
                  isActive ? 'bg-gold/[.14] font-bold text-gold' : 'font-medium text-side-text',
                )
              }
            >
              <Icon name={item.icon} />
              <span className="flex-1">{t.nav[item.key]}</span>
              {item.showDecisionBadge && decisionCount > 0 && (
                <span className="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-coral px-[7px] text-xs font-extrabold text-navy-ink">
                  {decisionCount}
                </span>
              )}
            </NavLink>
          </Fragment>
        ))}
      </nav>

      <div className="min-h-6 flex-1" />

      <div className="flex items-center gap-2.5 rounded-[14px] border border-white/[.08] bg-white/[.05] p-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-gold text-[15px] font-extrabold text-navy-ink">{l(user.initials)}</div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold">{l(user.name)}</div>
          <div className="truncate text-xs text-side-muted">{roleLabel}</div>
        </div>
        <button
          type="button"
          onClick={signOut}
          title={t.signOut}
          aria-label={t.signOut}
          className="inline-flex size-10 flex-none cursor-pointer items-center justify-center rounded-xl border-0 bg-white/[.06] text-side-text transition-colors hover:bg-white/[.12] hover:text-white focus-visible:outline-2 focus-visible:outline-gold"
        >
          <Icon name="logout" size={18} />
        </button>
      </div>
    </div>
  );
}
