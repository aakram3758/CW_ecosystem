import type { ChainCode, CityCode, LocalizedText, MaterialCode, Reason, SubtypeCode } from './types';

/**
 * Reference lists (cities, districts, chains, materials, reasons) loaded from Supabase once after sign-in
 * by `loadCatalog()` — the app does not render any screen until they are filled.
 * The objects are filled in place so every module can keep importing them directly.
 */

export const CITIES: Record<CityCode, LocalizedText> = {};
export const CITY_ORDER: CityCode[] = [];

export const DISTRICTS: Record<string, { city: CityCode; name: LocalizedText; active: boolean }> = {};
export const districtsOf = (city: CityCode) => Object.keys(DISTRICTS).filter((id) => DISTRICTS[id].city === city && DISTRICTS[id].active);

export const CHAINS: Record<ChainCode, LocalizedText> = {};
export const CHAIN_ORDER: ChainCode[] = [];

export interface MaterialInfo {
  name: LocalizedText;
  colorLight: string;
  colorDark: string;
  icon: string; // SVG path, 24×24
  subtypes: SubtypeCode[];
  active?: boolean;
  /** Dashboard user who manages this material (gets its notifications). */
  managerId?: string | null;
  /** Number branches call from "contact the manager". */
  contactPhone?: string | null;
}

export const MATERIALS: Record<MaterialCode, MaterialInfo> = {};
export const MATERIAL_ORDER: MaterialCode[] = [];
export const SUBTYPES: Record<SubtypeCode, LocalizedText> = {};

/** Editable lists (managed from the "Editable lists" screen). */
export const CANCEL_REASONS: Reason[] = [];
export const CLOSE_REASONS: Reason[] = [];
/** Every reason (all kinds, active or not) by id — for showing the reason a driver picked. */
export const REASONS: Record<string, LocalizedText> = {};

/** The raw rows (active and inactive) — the admin screens edit these. */
export const REF: { rows: CatalogRows | null } = { rows: null };
/** Unified operations number (app_settings.ops_phone). */
export const SETTINGS: { opsPhone: string | null } = { opsPhone: null };

/** Database ids behind the codes the screens use. */
export const IDS = {
  city: {} as Record<CityCode, string>,
  chain: {} as Record<ChainCode, string>,
  material: {} as Record<MaterialCode, string>,
  subtype: {} as Record<SubtypeCode, string>,
};
/** Reverse lookups: database id → code. */
export const CODES = {
  city: {} as Record<string, CityCode>,
  chain: {} as Record<string, ChainCode>,
  material: {} as Record<string, MaterialCode>,
  subtype: {} as Record<string, SubtypeCode>,
};

/** Icon drawn for each material key (materials.icon). Unknown keys fall back to a cube. */
export const ICONS: Record<string, string> = {
  box: 'M3 8l9-4 9 4-9 4zM3 8v8l9 4 9-4V8M12 12v8',
  bottle: 'M10 3h4v3l2 3v11a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V9l2-3z',
  paper: 'M6 3h9l4 4v14H6zM15 3v4h4M9 12h7M9 16h7',
  hex: 'M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  bread: 'M5 11a4 4 0 0 1 1-7.8C8 3 10 3.5 12 3.5s4-.5 6-.3A4 4 0 0 1 19 11v9H5z',
  cube: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9',
  crate: 'M4 8h16v12H4zM2 4h20v4H2zM10 12h4',
};

/** Planning limit used for the load bar on driver cards (visits per day). */
export const MAX_VISITS_PER_DAY = 12;

const clear = (o: Record<string, unknown>) => Object.keys(o).forEach((k) => delete o[k]);
const fill = <T,>(arr: T[], items: T[]) => arr.splice(0, arr.length, ...items);

export interface CatalogRows {
  cities: { id: string; code: string; name_ar: string; name_en: string; sort_order: number; active: boolean }[];
  districts: { id: string; city_id: string; name_ar: string; name_en: string; active: boolean }[];
  chains: { id: string; code: string; name_ar: string; name_en: string; active: boolean }[];
  materials: { id: string; code: string; name_ar: string; name_en: string; color_light: string; color_dark: string; icon: string; sort_order: number; active: boolean; manager_id: string | null; contact_phone: string | null }[];
  subtypes: { id: string; code: string; material_id: string; name_ar: string; name_en: string; active: boolean }[];
  reasons: { id: string; kind: string; label_ar: string; label_en: string; sort_order: number; active: boolean }[];
  settings?: { key: string; value: string | null }[];
}

/** Replaces the lists with fresh rows. Inactive rows stay resolvable (old requests point at them) but never appear as options. */
export function setCatalog(rows: CatalogRows) {
  REF.rows = rows;
  SETTINGS.opsPhone = rows.settings?.find((x) => x.key === 'ops_phone')?.value ?? null;
  [CITIES, DISTRICTS, CHAINS, MATERIALS, SUBTYPES, REASONS, IDS.city, IDS.chain, IDS.material, IDS.subtype, CODES.city, CODES.chain, CODES.material, CODES.subtype].forEach(clear);

  const cities = [...rows.cities].sort((a, b) => a.sort_order - b.sort_order);
  cities.forEach((c) => {
    CITIES[c.code] = { ar: c.name_ar, en: c.name_en };
    IDS.city[c.code] = c.id;
    CODES.city[c.id] = c.code;
  });
  fill(CITY_ORDER, cities.filter((c) => c.active).map((c) => c.code));

  rows.districts
    .filter((d) => CODES.city[d.city_id])
    .sort((a, b) => a.name_ar.localeCompare(b.name_ar, 'ar'))
    .forEach((d) => (DISTRICTS[d.id] = { city: CODES.city[d.city_id], name: { ar: d.name_ar, en: d.name_en }, active: d.active }));

  rows.chains.forEach((c) => {
    CHAINS[c.code] = { ar: c.name_ar, en: c.name_en };
    IDS.chain[c.code] = c.id;
    CODES.chain[c.id] = c.code;
  });
  fill(CHAIN_ORDER, rows.chains.filter((c) => c.active).map((c) => c.code));

  const materials = [...rows.materials].sort((a, b) => a.sort_order - b.sort_order);
  materials.forEach((m) => {
    MATERIALS[m.code] = {
      name: { ar: m.name_ar, en: m.name_en },
      colorLight: m.color_light,
      colorDark: m.color_dark,
      icon: ICONS[m.icon] ?? ICONS.cube,
      subtypes: [],
      active: m.active,
      managerId: m.manager_id,
      contactPhone: m.contact_phone,
    };
    IDS.material[m.code] = m.id;
    CODES.material[m.id] = m.code;
  });
  fill(MATERIAL_ORDER, materials.filter((m) => m.active).map((m) => m.code));

  rows.subtypes.forEach((s) => {
    const material = CODES.material[s.material_id];
    if (!material) return;
    SUBTYPES[s.code] = { ar: s.name_ar, en: s.name_en };
    IDS.subtype[s.code] = s.id;
    CODES.subtype[s.id] = s.code;
    if (s.active) MATERIALS[material].subtypes.push(s.code);
  });

  rows.reasons.forEach((r) => (REASONS[r.id] = { ar: r.label_ar, en: r.label_en }));
  const reasons = (kind: string) =>
    rows.reasons
      .filter((r) => r.kind === kind && r.active)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((r) => ({ id: r.id, ar: r.label_ar, en: r.label_en }));
  fill(CANCEL_REASONS, reasons('cancel'));
  fill(CLOSE_REASONS, reasons('close'));
}

/** Fallback for a material that was deactivated after requests were made with it. */
export const materialInfo = (m: MaterialCode): MaterialInfo =>
  MATERIALS[m] ?? { name: { ar: m, en: m }, colorLight: '#5C6B7E', colorDark: '#9AA9BC', icon: ICONS.cube, subtypes: [] };
