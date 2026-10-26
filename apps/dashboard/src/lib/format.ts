import type { Actor, Branch, DashboardUser, Driver, Lang, LocalizedText, MaterialCode, SubtypeCode } from '../data/types';
import { CHAINS, DISTRICTS, MATERIALS, SUBTYPES, CITIES } from '../data/catalog';
import { COMMON } from '../i18n/common';

/** Display helpers shared by every screen. Pure functions so they work outside React too. */

export const branchLabel = (b: Branch, lang: Lang) =>
  `${CHAINS[b.chain]?.[lang] ?? b.chain} #${b.number} – ${b.name || (DISTRICTS[b.district]?.name[lang] ?? '')}`;

/** Login name shown to ops when they contact a branch (chain + branch number). */
export const branchLogin = (b: Branch, lang: Lang) => `${CHAINS[b.chain][lang]} ${b.number}`;

export const districtName = (id: string, lang: Lang) => DISTRICTS[id]?.name[lang] ?? id;
export const cityName = (b: Branch, lang: Lang) => CITIES[b.city][lang];

/** "بلاستيك · مكس" */
export const materialLabel = (m: MaterialCode, sub: SubtypeCode | null, lang: Lang) =>
  MATERIALS[m].name[lang] + (sub ? ` · ${SUBTYPES[sub][lang]}` : '');

/** The subtype, or the material name when it has no subtypes. */
export const typeLabel = (m: MaterialCode, sub: SubtypeCode | null, lang: Lang) => (sub ? SUBTYPES[sub][lang] : MATERIALS[m].name[lang]);

export const materialColor = (m: MaterialCode, dark: boolean) => (dark ? MATERIALS[m].colorDark : MATERIALS[m].colorLight);

export const textOf = (v: LocalizedText | string | undefined, lang: Lang) => (v === undefined ? '' : typeof v === 'string' ? v : v[lang]);

/** "م ح" — two initials from a person's name (skips the Arabic article). */
export function initials(name: string) {
  const parts = name.split(' ').filter(Boolean);
  const first = parts[0]?.charAt(0) ?? '';
  const second = (parts[1] ?? '').replace(/^ال/, '').charAt(0);
  return `${first}${second}`;
}

export function actorName(actor: Actor, lang: Lang, users: DashboardUser[], drivers: Driver[]) {
  const t = COMMON[lang];
  switch (actor.kind) {
    case 'branch':
      return t.actor.branch(actor.name);
    case 'user': {
      const u = users.find((x) => x.id === actor.userId);
      return u ? u.name[lang] : '—';
    }
    case 'driver': {
      const d = drivers.find((x) => x.id === actor.driverId);
      return d ? d.name[lang] : '—';
    }
    case 'system':
      return t.actor.system;
  }
}

/** Saudi mobile → wa.me link with a prefilled message. */
export function whatsappLink(phone: string, message: string) {
  const intl = phone.startsWith('0') ? `966${phone.slice(1)}` : phone;
  return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
}
