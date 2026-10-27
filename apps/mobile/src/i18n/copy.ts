import type { ar } from '@/i18n/ar';

export type Copy = { [Namespace in keyof typeof ar]: {
  [Key in keyof (typeof ar)[Namespace]]: string;
} };

export function interpolate(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) => String(values[key] ?? match));
}
