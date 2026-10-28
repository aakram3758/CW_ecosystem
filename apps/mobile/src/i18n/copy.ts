import type { ar } from '@/i18n/ar';

export type Copy = { [Namespace in keyof typeof ar]: {
  [Key in keyof (typeof ar)[Namespace]]: string;
} };

export function interpolate(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) => String(values[key] ?? match));
}

/**
 * Make a run of digits and Latin characters read left-to-right inside an Arabic paragraph.
 *
 * `0 / 200`, `2 / 3` and `+966 55 246 8135` are all digits and neutral punctuation, and the
 * Unicode bidirectional algorithm resolves those against the paragraph around them. In Arabic that
 * paragraph runs right-to-left, so they come out reversed on screen — `200 / 0`, `3 / 2`,
 * `8135 246 55 966+` — which is what Ahmed found on his phone.
 *
 * The obvious fix is `writingDirection: 'ltr'`, and it is a trap: React Native honours that style
 * **on iOS only**, so it silently does nothing on Android. This puts the instruction in the string
 * instead — U+2066 LEFT-TO-RIGHT ISOLATE opens a run with its own direction, U+2069 POP
 * DIRECTIONAL ISOLATE closes it — so it holds wherever and however the text is drawn.
 *
 * Use it for anything whose character order matters and isn't Arabic: counters, phone numbers,
 * coordinates, request numbers. Not for ordinary sentences.
 */
export const ltr = (text: string) => `⁦${text}⁩`;
