/**
 * Design tokens, lifted from the approved prototypes — the branch canvas (`[data-theme]` blocks)
 * and the driver canvas (`cw.css` `.cw-light` / `.cw-dark`).
 *
 * **Everything in this file is a value one of the two canvases actually states.** Nothing is
 * interpolated into a scale. An earlier draft had invented `space`, `radius` and font-size scales
 * that looked plausible and were not in either design; they are gone, because a made-up token that
 * sits next to real ones is worse than no token — it gets trusted. Screens use the literal values
 * their artboard uses until a repeated value earns a name here.
 *
 * The two canvases define almost the same palette under different names. Where they disagreed, the
 * **branch** canvas wins: it is the reference for the shared visual language (Ahmed's call).
 * Those six values are marked `[branch]` with the driver's variant beside them.
 *
 * Material colours are NOT here: `materials.color_light` / `materials.color_dark` hold them in the
 * database, and the seeded values already match both designs exactly. Only the soft tints, which
 * the database has no column for, live below.
 */

export type ThemeName = 'light' | 'dark';

// Literal artwork colours from Main.dc.html, shared by its scale thumbnail and schematic map.
export const branchArtwork = {
  photoTop: '#3A4A5E', photoBottom: '#1E2A38', display: '#0E1A12', digits: '#7CF0A8',
  locationDot: '#2E7BE0', locationRing: 'rgba(46,123,224,.18)',
  heroTile: 'rgba(255,255,255,.1)', heroLine: 'rgba(255,255,255,.08)',
  heroGoldLine: 'rgba(232,206,132,.22)', accountLine: 'rgba(255,255,255,.12)',
} as const;

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
    primarySoft: 'rgba(31,78,140,.10)', // [branch] driver had #E4ECF7
    onPrimary: '#FFFFFF',
    link: '#1F4E8C',

    accent: '#B08D2E',
    accentSoft: '#F7EFD9',
    accentText: '#6E5413', // [branch] driver had #7A5C0F

    success: '#19764A',
    successSoft: '#E3F3EA',
    onSuccess: '#FFFFFF',

    warning: '#8F5A0A',
    warningSoft: '#FBEFDC',

    danger: '#EF6B5E',
    dangerSoft: '#FDECEA', // [branch] driver had #FDEBE9
    dangerText: '#B3261E', // [branch] driver had #B3382C

    navy: '#0B2340',
    gold: '#E8CE84',

    ringTodo: '#D3DCE8',
    skeleton: '#E3E9F1',
    skeletonHighlight: '#F1F4F9',
    toast: '#0B1B2E',
    // The colours inside the canvas's two rgba() shadows: --ov-shadow under the sign-in card, and
    // .mode-on's lift under the selected half of a segmented switch. The opacity stays with the
    // shadow, since React Native keeps colour and opacity apart.
    overlayShadow: '#0B1B2E',
    modeShadow: '#1F4E8C',
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
    link: '#8DB6EA', // [branch] driver had #8DB8EE

    accent: '#E8CE84',
    accentSoft: 'rgba(232,206,132,.15)',
    accentText: '#E8CE84',

    success: '#46C489',
    successSoft: 'rgba(70,196,137,.14)',
    onSuccess: '#062014',

    warning: '#E0A346',
    warningSoft: 'rgba(224,163,70,.14)',

    danger: '#EF6B5E',
    dangerSoft: 'rgba(239,107,94,.14)', // [branch] driver had .16
    dangerText: '#F4978C', // [branch] driver had #F49A90

    navy: '#0B2340',
    gold: '#E8CE84',

    ringTodo: '#24425F',
    skeleton: '#17304A',
    skeletonHighlight: '#1F3B58',
    toast: '#EAF1F8',
    overlayShadow: '#000000',
    modeShadow: '#1F4E8C', // not themed: the canvas keeps the light blue here in dark mode too
    scrim: 'rgba(3,9,17,.72)', // [branch] driver had rgba(0,0,0,.62)

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
    plas: '#E2EEFA', // [branch] driver had #E3EEF8
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

/** Ring colour per visit outcome on the driver's home and plan screens, as its `RING` map sets it. */
export const outcomeRing = {
  full: 'success',
  partial: 'accent',
  failed: 'danger',
  todo: 'ringTodo',
} as const satisfies Record<string, keyof (typeof palette)['light']>;

/** Tajawal is the only family in either design. Weights and base size as the prototypes load them. */
export const type = {
  family: 'Tajawal',
  weight: { regular: '400', medium: '500', bold: '700', heavy: '800' },
  baseSize: 15,
  lineHeight: 1.5,
} as const;

/**
 * Not from the designs — the iOS and Android minimum touch target. Here because every screen has to
 * honour it and it is easy to forget, not because an artboard states it.
 */
export const minTouch = 44;

/**
 * A duotone icon's fill. The canvas draws it as `.ic .f { fill: currentColor; opacity: .2 }`,
 * so the fill is always the icon's own colour at a fifth — which in hex is the suffix 33. Pass the
 * result as an Icon's `tint`; without it the fill comes out solid and the icon reads as a block.
 */
export const softFill = (color: string) => color + '33';

export type Palette = (typeof palette)['light'];
