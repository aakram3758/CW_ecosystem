/** Duotone line icons from the design (24×24): `l` = stroke path, `f` = soft fill path. */
const ICONS = {
  home: { l: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z', f: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z' },
  req: { l: 'M8 4h8v3H8zM6 5H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-1M8 12h8M8 16h5', f: 'M4 5h16v16H4z' },
  cal: { l: 'M4 6h16v15H4zM4 10h16M8 3v4M16 3v4', f: 'M4 6h16v4H4z' },
  warn: { l: 'M12 3 2 20h20zM12 10v4M12 17.5v.01', f: 'M12 3 2 20h20z' },
  bld: { l: 'M3 21h18M5 21V5l8-2v18M13 9h6v12M8 8h2M8 12h2M8 16h2M16 13h1M16 17h1', f: 'M5 21V5l8-2v18z' },
  pin: { l: 'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z', f: 'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z' },
  truck: { l: 'M2 7h11v9H2zM13 10h4l3 3v3h-7M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z', f: 'M2 7h11v9H2z' },
  cube: { l: 'M12 3 3 7.5v9L12 21l9-4.5v-9zM3 7.5 12 12l9-4.5M12 12v9', f: 'M12 3 3 7.5 12 12l9-4.5z' },
  lists: { l: 'M9 6h11M9 12h11M9 18h11M4 6h1M4 12h1M4 18h1', f: '' },
  chart: { l: 'M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6', f: '' },
  bell: { l: 'M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0', f: 'M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z' },
  sun: { l: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4', f: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' },
  moon: { l: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z', f: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z' },
  globe: { l: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z', f: '' },
  clock: { l: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2', f: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z' },
  check: { l: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12.5l3 3 5-6', f: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z' },
  tick: { l: 'M5 12.5 10 17l9-10', f: '' },
  x: { l: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9 9l6 6M15 9l-6 6', f: '' },
  spark: { l: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z', f: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z' },
  menu: { l: 'M4 6h16M4 12h16M4 18h16', f: '' },
  close: { l: 'M6 6l12 12M18 6 6 18', f: '' },
  search: { l: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4', f: '' },
  user: { l: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0', f: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' },
  phone: { l: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2', f: '' },
  refresh: { l: 'M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5', f: '' },
  lock: { l: 'M6 11h12v10H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3', f: 'M6 11h12v10H6z' },
  grip: { l: 'M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01', f: '' },
  chevDown: { l: 'M6 9l6 6 6-6', f: '' },
  plus: { l: 'M12 5v14M5 12h14', f: '' },
  edit: { l: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4', f: '' },
  key: { l: 'M8 15a4 4 0 1 1 3.5-6H21v3h-2v3h-3v-3h-4.5A4 4 0 0 1 8 15z', f: '' },
  power: { l: 'M12 3v8M7.5 6.3a7 7 0 1 0 9 0', f: '' },
  up: { l: 'M12 19V5M6 11l6-6 6 6', f: '' },
  down: { l: 'M12 5v14M6 13l6 6 6-6', f: '' },
  copy: { l: 'M8 8h12v12H8zM4 16V4h12', f: '' },
  download: { l: 'M12 4v11M7 10l5 5 5-5M5 20h14', f: '' },
  logout: { l: 'M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3M10 8l-4 4 4 4M6 12h10', f: '' },
  camera: { l: 'M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', f: '' },
} as const;

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function Icon({ name, size = 20, strokeWidth = 1.8, className }: IconProps) {
  const icon = ICONS[name];
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {icon.f && <path d={icon.f} fill="currentColor" opacity=".22" stroke="none" />}
      <path d={icon.l} />
    </svg>
  );
}

/** Points to the reading direction's "forward" (left in RTL, right in LTR). */
export function ChevronForward({ size = 18, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`ltr:-scale-x-100 ${className}`}>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

/** Small icon from a raw path (used for material icons). */
export function PathIcon({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
