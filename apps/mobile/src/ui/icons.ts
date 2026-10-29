/**
 * The branch canvas's icon set, lifted verbatim from its `I` object. Each entry is SVG path data on
 * a 24×24 viewBox: `s` is the stroked outline, `f` the filled shape (empty when the icon is
 * stroke-only). Render with react-native-svg:
 *
 *   <Svg viewBox="0 0 24 24" width={24} height={24}>
 *     {icon.f ? <Path d={icon.f} fill={tint} /> : null}
 *     <Path d={icon.s} stroke={colour} strokeWidth={1.6} strokeLinecap="round"
 *           strokeLinejoin="round" fill="none" />
 *   </Svg>
 *
 * OPEN DECISION — the driver canvas does not use these. It uses the Phosphor icon font
 * (duotone / bold / fill, ~80 glyphs, declared in its `cw.css`), which cannot be extracted as paths
 * because the glyphs live inside woff2 files. So the app needs either `phosphor-react-native` for
 * the driver side alongside this set, or Phosphor for both roles — which would change the branch
 * icons slightly. Not decided yet; see PLAN.md.
 */

export interface IconPath {
  /** Stroked outline. */
  s: string;
  /** Filled shape, '' when the icon is stroke-only. */
  f: string;
}

export const icons: Record<string, IconPath> = {
  bell: {
    s: 'M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z M10 20.5a2 2 0 0 0 4 0',
    f: 'M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z',
  },
  headset: {
    s: 'M4 14v-2a8 8 0 0 1 16 0v2 M4 14h3v5H5a1 1 0 0 1-1-1z M20 14h-3v5h2a1 1 0 0 0 1-1z M17 19c0 1.4-2 2-5 2',
    f: 'M4 14h3v5H5a1 1 0 0 1-1-1z M20 14h-3v5h2a1 1 0 0 0 1-1z',
  },
  pin: {
    s: 'M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
    f: 'M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z',
  },
  pinOff: {
    s: 'M3 3l18 18 M8.2 5.2A6.5 6.5 0 0 1 18.5 10c0 1.7-.6 3.4-1.5 5 M14.6 17.8C13.2 19.7 12 21 12 21s-6.5-5.6-6.5-11c0-.9.2-1.7.5-2.5',
    f: '',
  },
  plus: { s: 'M12 5v14 M5 12h14', f: '' },
  minus: { s: 'M5 12h14', f: '' },
  caretR: { s: 'M9 5l7 7-7 7', f: '' },
  caretL: { s: 'M15 5l-7 7 7 7', f: '' },
  caretD: { s: 'M6 9l6 6 6-6', f: '' },
  check: { s: 'M5 12.5l4.5 4.5L19 7.5', f: '' },
  // The canvas's unmet password rule — the `check`'s pair, drawn in the same 22px circle: a plain
  // dash, so a rule that is not satisfied yet reads as waiting rather than as failing.
  dash: { s: 'M8 12h8', f: '' },
  checks: { s: 'M2.5 12.5l4 4L15 8 M10.5 15.5l1 1L21 7', f: '' },
  x: { s: 'M6 6l12 12 M18 6L6 18', f: '' },
  box: {
    s: 'M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5z M3.5 7.5L12 12l8.5-4.5 M12 12v9 M7.8 5.2l8.4 4.6',
    f: 'M3.5 7.5L12 12v9l-8.5-4.5z',
  },
  bottle: {
    s: 'M10 2.5h4 M10.5 2.5v3L8 9v11a1.5 1.5 0 0 0 1.5 1.5h5A1.5 1.5 0 0 0 16 20V9l-2.5-3.5v-3 M8 12.5h8',
    f: 'M8 12.5h8V20a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 8 20z',
  },
  paper: {
    s: 'M5 4h11v15a2 2 0 0 0 2 2H6a1 1 0 0 1-1-1z M16 9h3v10a2 2 0 0 1-2 2 M8 8h5 M8 11.5h5 M8 15h5',
    f: 'M5 4h11v15a2 2 0 0 0 2 2H6a1 1 0 0 1-1-1z',
  },
  can: {
    s: 'M6 5.5C6 4.1 8.7 3 12 3s6 1.1 6 2.5v13c0 1.4-2.7 2.5-6 2.5s-6-1.1-6-2.5z M6 5.5C6 6.9 8.7 8 12 8s6-1.1 6-2.5 M6 10c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5',
    f: 'M6 10c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v8.5c0 1.4-2.7 2.5-6 2.5s-6-1.1-6-2.5z',
  },
  bread: {
    s: 'M5 11a3 3 0 0 1-1.5-2.6C3.5 6 7.3 4 12 4s8.5 2 8.5 4.4A3 3 0 0 1 19 11v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z M9 9.5l1.5 1.5 M12.5 8.5l1.5 1.5',
    f: 'M5 11a3 3 0 0 1-1.5-2.6C3.5 6 7.3 4 12 4s8.5 2 8.5 4.4A3 3 0 0 1 19 11v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z',
  },
  camera: {
    s: 'M4 8.5A1.5 1.5 0 0 1 5.5 7h2.2l1.6-2.5h5.4L16.3 7h2.2A1.5 1.5 0 0 1 20 8.5V18a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18z M12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
    f: 'M4 8.5A1.5 1.5 0 0 1 5.5 7h2.2l1.6-2.5h5.4L16.3 7h2.2A1.5 1.5 0 0 1 20 8.5V18a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18z',
  },
  image: {
    s: 'M4 5h16v14H4z M4 16l5-5 4 4 2.5-2.5L20 17 M15.5 9.5h.01',
    f: 'M4 16l5-5 4 4 2.5-2.5L20 17v2H4z',
  },
  cal: { s: 'M4.5 6h15v14h-15z M4.5 10.5h15 M8.5 3.5V7.5 M15.5 3.5V7.5', f: 'M4.5 6h15v4.5h-15z' },
  clock: { s: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7.5V12l3 2', f: '' },
  phone: {
    s: 'M5 4.5h3.5l1.5 4-2 1.3a10 10 0 0 0 6.2 6.2l1.3-2 4 1.5V19a1.5 1.5 0 0 1-1.6 1.5C10.4 20 4 13.6 3.5 6.1A1.5 1.5 0 0 1 5 4.5z',
    f: 'M5 4.5h3.5l1.5 4-2 1.3a10 10 0 0 0 6.2 6.2l1.3-2 4 1.5V19a1.5 1.5 0 0 1-1.6 1.5C10.4 20 4 13.6 3.5 6.1A1.5 1.5 0 0 1 5 4.5z',
  },
  chat: {
    s: 'M4 20.5l1.4-4A8.5 8.5 0 1 1 8.6 19.4z M9 9.2c0 3.1 2.6 5.6 5.7 5.6',
    f: 'M4 20.5l1.4-4A8.5 8.5 0 1 1 8.6 19.4z',
  },
  user: {
    s: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4.5 20.5c1-3.7 4-5.5 7.5-5.5s6.5 1.8 7.5 5.5',
    f: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  },
  house: { s: 'M4 10.5L12 4l8 6.5V20h-5v-5.5H9V20H4z', f: 'M4 10.5L12 4l8 6.5V20h-5v-5.5H9V20H4z' },
  clip: {
    s: 'M8 4.5H6a1 1 0 0 0-1 1V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V5.5a1 1 0 0 0-1-1h-2 M9 3h6v3.5H9z M8.5 11h7 M8.5 14.5h7 M8.5 18h4',
    f: 'M5 5.5a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z',
  },
  info: { s: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 11v5.5 M12 7.6v.1', f: '' },
  warn: { s: 'M12 4l9 16H3z M12 10v4.5 M12 17.4v.1', f: '' },
  wifiOff: {
    s: 'M3 3l18 18 M8.5 15.8a5 5 0 0 1 7 0 M5.5 12.6a9 9 0 0 1 4-2.2 M14.6 10.5a9 9 0 0 1 3.9 2.1 M2.5 9.4A13.5 13.5 0 0 1 7 6.6 M11 5.6a13.5 13.5 0 0 1 10.5 3.8 M12 19.5v.1',
    f: '',
  },
  cloudX: {
    s: 'M7 18.5a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 10a4.3 4.3 0 0 1-.5 8.5z M10 11.5l4 4 M14 11.5l-4 4',
    f: '',
  },
  lock: { s: 'M6 10.5h12v10H6z M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5 M12 14.5v2.5', f: 'M6 10.5h12v10H6z' },
  eye: {
    s: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    f: '',
  },
  pencil: {
    s: 'M4 20l1-4.5L15.5 5a2 2 0 0 1 2.8 0l.7.7a2 2 0 0 1 0 2.8L8.5 19z M13.5 7l3.5 3.5',
    f: '',
  },
  seal: {
    s: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M8 12.3l2.8 2.7L16 9.6',
    f: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  },
  truck: {
    s: 'M2.5 6h11v10h-11z M13.5 9.5h4l3 3.5V16h-7 M7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M17 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    f: 'M2.5 6h11v10h-11z',
  },
  stack: {
    s: 'M12 4l8.5 4.5L12 13 3.5 8.5z M3.5 12.5L12 17l8.5-4.5 M3.5 16.5L12 21l8.5-4.5',
    f: 'M12 4l8.5 4.5L12 13 3.5 8.5z',
  },
  scale: {
    s: 'M4 20h16l-1.5-10.5h-13z M12 9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M9.5 15h5',
    f: 'M4 20h16l-1.5-10.5h-13z',
  },
  note: { s: 'M5 4h14v11l-5 5H5z M14 20v-5h5 M8.5 9h7 M8.5 12.5h4', f: 'M5 4h14v11l-5 5H5z' },
  store: {
    s: 'M3.5 9.5L5 4.5h14l1.5 5 M4.5 9.5V20h15V9.5 M3.5 9.5a2.8 2.8 0 0 0 5.6 0 2.8 2.8 0 0 0 5.8 0 2.8 2.8 0 0 0 5.6 0 M10 20v-5h4v5',
    f: 'M4.5 11.5V20h15v-8.5z',
  },
  key: {
    s: 'M14.5 14a5 5 0 1 0-4.6-3L3.5 17.4V20.5H7v-2h2v-2h2l1.6-1.6 M16 8.5h.01',
    f: 'M14.5 14a5 5 0 1 0-4.6-3',
  },
  globe: {
    s: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M3 12h18 M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z',
    f: '',
  },
  moon: {
    s: 'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z',
    f: 'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z',
  },
  out: { s: 'M10 4.5H5.5v15H10 M15 8l4 4-4 4 M19 12H9.5', f: '' },
  retry: { s: 'M19.5 12a7.5 7.5 0 1 1-2.2-5.3 M19.5 4.5V9H15', f: '' },
  target: {
    s: 'M12 19a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M12 2.5V5 M12 19v2.5 M2.5 12H5 M19 12h2.5 M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
    f: '',
  },
  send: { s: 'M20.5 3.5L3.5 10.5l7 3 3 7z M10.5 13.5l4-4', f: 'M20.5 3.5L3.5 10.5l7 3 3 7z' },
  copy: { s: 'M8.5 8.5h11v12h-11z M5 15.5V3.5h11', f: '' },
};

/**
 * `materials.icon` holds a key chosen by the database seed: box, bottle, paper, hex, bread.
 * Everything maps straight onto the set above except `hex` (metal), which the branch canvas drew
 * as a can — so that is what it maps to. No icon was invented for it.
 */
export const materialIcon: Record<string, keyof typeof icons> = {
  box: 'box',
  bottle: 'bottle',
  paper: 'paper',
  hex: 'can',
  bread: 'bread',
};

export type IconName = keyof typeof icons;
