/**
 * Design tokens, lifted from the approved prototypes — the branch canvas (`[data-theme]` blocks)
 * and the driver canvas (`cw.css` `.cw-light` / `.cw-dark`). Do not invent values here: a colour
 * that isn't in this file isn't in the designs.
 *
 * The two canvases define almost the same palette under different names. Where they disagreed,
 * the driver canvas won (it is the newer of the two) — those six values are marked `[driver]`.
 *
 * Material colours are NOT here: `materials.color_light` / `materials.color_dark` hold them in the
 * database, and the seeded values already match both designs exactly. Only the soft tints, which
 * the database has no column for, live below.
 */

export type ThemeName = 'light' | 'dark';

export const palette = {
  light: {
    bg: '#F4F6FA',
    surface: '#FFFFFF',
    surface2: '#EDF1F7',
    line: '#DFE6EF',
    text: '#0B1B2E',
    muted: '#566A82',

    primary: '#1F4E8C',
    primary2: '#163A66',
    primarySoft: '#E4ECF7', // [driver] branch had rgba(31,78,140,.10)
    onPrimary: '#FFFFFF',
    link: '#1F4E8C',

    accent: '#B08D2E',
    accentSoft: '#F7EFD9',
    accentText: '#7A5C0F', // [driver] branch had #6E5413

    success: '#19764A',
    successSoft: '#E3F3EA',
    onSuccess: '#FFFFFF',

    warning: '#8F5A0A',
    warningSoft: '#FBEFDC',

    danger: '#EF6B5E',
    dangerSoft: '#FDEBE9', // [driver] branch had #FDECEA
    dangerText: '#B3382C', // [driver] branch had #B3261E

    navy: '#0B2340',
    gold: '#E8CE84',

    ringTodo: '#D3DCE8',
    skeleton: '#E3E9F1',
    skeletonHighlight: '#F1F4F9',
    toast: '#0B1B2E',
    scrim: 'rgba(11,27,46,.48)',

    // The branch location map only
    mapBg: '#E4EAF1',
    mapBlock: '#D3DCE7',
    mapRoad: '#FFFFFF',
  },
  dark: {
    bg: '#071322',
    surface: '#0F2136',
    surface2: '#17304A',
    line: '#1D3B58',
    text: '#EAF1F8',
    muted: '#9BB0C6',

    primary: '#2E6BB8',
    primary2: '#24579A',
    primarySoft: 'rgba(46,107,184,.20)',
    onPrimary: '#FFFFFF',
    link: '#8DB8EE', // [driver] branch had #8DB6EA

    accent: '#E8CE84',
    accentSoft: 'rgba(232,206,132,.15)',
    accentText: '#E8CE84',

    success: '#46C489',
    successSoft: 'rgba(70,196,137,.14)',
    onSuccess: '#062014',

    warning: '#E0A346',
    warningSoft: 'rgba(224,163,70,.14)',

    danger: '#EF6B5E',
    dangerSoft: 'rgba(239,107,94,.16)',
    dangerText: '#F49A90', // [driver] branch had #F4978C

    navy: '#0B2340',
    gold: '#E8CE84',

    ringTodo: '#24425F',
    skeleton: '#17304A',
    skeletonHighlight: '#1F3B58',
    toast: '#EAF1F8',
    scrim: 'rgba(0,0,0,.62)',

    mapBg: '#10253C',
    mapBlock: '#17304A',
    mapRoad: '#24496E',
  },
} as const;

/**
 * Soft background tint per material, keyed by `materials.code` as seeded
 * (card, plas, paper, metal, bread). The solid colour comes from the database row.
 */
export const materialSoft = {
  light: {
    card: '#F6EBDD',
    plas: '#E3EEF8', // [driver] branch had #E2EEFA
    paper: '#E2F2E9',
    metal: '#E9EDF2',
    bread: '#DDF1F1',
  },
  dark: {
    card: 'rgba(216,154,91,.16)',
    plas: 'rgba(92,155,224,.16)',
    paper: 'rgba(79,191,134,.15)',
    metal: 'rgba(154,169,188,.15)',
    bread: 'rgba(60,194,194,.15)',
  },
} as const;

/** The ring colour for a visit's outcome on the driver's home and plan screens. */
export const outcomeRing = {
  full: 'success',
  partial: 'accent',
  failed: 'danger',
  todo: 'ringTodo',
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 22,
  pill: 999,
  tile: 18,
  phone: 28,
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/** Tajawal, the only family in both designs. Weights as loaded by the prototypes. */
export const type = {
  family: 'Tajawal',
  weight: { regular: '400', medium: '500', bold: '700', heavy: '800' },
  size: { xs: 12, sm: 13, base: 15, md: 17, lg: 20, xl: 24, display: 32 },
  lineHeight: 1.5,
} as const;

/** Minimum touch target, held across both designs. */
export const minTouch = 44;

export type Palette = (typeof palette)['light'];
