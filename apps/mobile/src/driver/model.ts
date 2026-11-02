import type { RequestListRow } from '@/data/rows';
import type { Photo } from '@/data/device';

export type Outcome = 'full' | 'partial' | 'failed';
export type Draft = { kind: Outcome | null; photo: Photo | null; photoPath: string | null;
  reasonId: string | null; other: boolean; reasonText: string; note: string };
export const emptyDraft = (): Draft => ({ kind: null, photo: null, photoPath: null, reasonId: null, other: false, reasonText: '', note: '' });
export function validDraft(d: Draft) {
  if (d.kind === 'full') return !!d.photo;
  if (d.kind === 'partial') return !!d.photo && (!!d.reasonId || d.note.trim().length >= 3);
  if (d.kind === 'failed') return d.other ? d.reasonText.trim().length >= 3 : !!d.reasonId;
  return false;
}
export function stopState(row: RequestListRow, today: string): Outcome | 'todo' {
  return row.last_attempt_day === today && ['full', 'partial', 'failed'].includes(row.last_outcome ?? '')
    ? row.last_outcome as Outcome : 'todo';
}
export function suggest(rows: RequestListRow[], today: string) {
  const todo = rows.filter(r => stopState(r, today) === 'todo');
  const last = rows.filter(r => stopState(r, today) !== 'todo' && r.last_attempt_at)
    .sort((a, b) => b.last_attempt_at!.localeCompare(a.last_attempt_at!))[0];
  const same = last?.district_id ? todo.find(r => r.district_id === last.district_id) : undefined;
  return todo.length ? { row: same ?? todo[0], same: !!same } : null;
}
export function groupStops(rows: RequestListRow[], language: 'ar' | 'en') {
  const groups = new Map<string, { id: string; name: string; rows: RequestListRow[] }>();
  for (const row of rows) {
    const id = row.district_id ?? '';
    if (!groups.has(id)) groups.set(id, { id, name: (language === 'ar' ? row.district_name_ar : row.district_name_en) ?? row.district_name_ar ?? '', rows: [] });
    groups.get(id)!.rows.push(row);
  }
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name, language)).map(g => ({ ...g,
    rows: g.rows.sort((a, b) => (a.chain_code ?? '').localeCompare(b.chain_code ?? '')
      || (a.branch_number ?? '').localeCompare(b.branch_number ?? '', 'en', { numeric: true })) }));
}
export function shiftDay(day: string, offset: number) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
