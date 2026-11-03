// Datas como strings 'YYYY-MM-DD' (data local, sem fuso).

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toUTC(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const t = new Date(toUTC(iso) + days * 86_400_000);
  return t.toISOString().slice(0, 10);
}

export function diffDays(a: string, b: string): number {
  return Math.round((toUTC(a) - toUTC(b)) / 86_400_000);
}

/** 1 = segunda … 7 = domingo */
export function isoWeekday(iso: string): number {
  const wd = new Date(toUTC(iso)).getUTCDay();
  return wd === 0 ? 7 : wd;
}
