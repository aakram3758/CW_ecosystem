import type { IconName } from '../ui/Icon';
import type { CommonDict } from '../../i18n/common';

export interface NavItem {
  key: keyof CommonDict['nav'];
  path: string;
  icon: IconName;
  /** Starts a new labelled group in the sidebar. */
  section?: keyof CommonDict['nav'];
  /** Shows the "needs decision" count badge. */
  showDecisionBadge?: boolean;
  /** Built in this phase (others show "Coming soon"). */
  built?: boolean;
}

/** Every dashboard user has general-manager permissions, so every item is visible to everyone. */
export const NAV_ITEMS: NavItem[] = [
  { key: 'overview', path: '/', icon: 'home', built: true },
  { key: 'requests', path: '/requests', icon: 'req', built: true },
  { key: 'scheduling', path: '/scheduling', icon: 'cal', built: true },
  { key: 'decisions', path: '/decisions', icon: 'warn', showDecisionBadge: true, built: true },
  { key: 'branches', path: '/branches', icon: 'bld', section: 'adminSection', built: true },
  { key: 'districts', path: '/districts', icon: 'pin', built: true },
  { key: 'drivers', path: '/drivers', icon: 'truck', built: true },
  { key: 'materials', path: '/materials', icon: 'cube', built: true },
  { key: 'lists', path: '/lists', icon: 'lists', built: true },
  { key: 'reports', path: '/reports', icon: 'chart', built: true },
];
