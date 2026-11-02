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
}

/** Every dashboard user has general-manager permissions, so every item is visible to everyone. */
export const NAV_ITEMS: NavItem[] = [
  { key: 'overview', path: '/', icon: 'home' },
  { key: 'requests', path: '/requests', icon: 'req' },
  { key: 'scheduling', path: '/scheduling', icon: 'cal' },
  { key: 'decisions', path: '/decisions', icon: 'warn', showDecisionBadge: true },
  { key: 'branches', path: '/branches', icon: 'bld', section: 'adminSection' },
  { key: 'districts', path: '/districts', icon: 'pin' },
  { key: 'drivers', path: '/drivers', icon: 'truck' },
  { key: 'materials', path: '/materials', icon: 'cube' },
  { key: 'lists', path: '/lists', icon: 'lists' },
  { key: 'reports', path: '/reports', icon: 'chart' },
];
