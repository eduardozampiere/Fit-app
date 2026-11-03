// Interpretação de textos do plano (espelha tools/import_plan.py) e de valores soltos dos CSVs.

import type { LoadMode, OpenRange, Range } from './types';

export function parseRange(text: string): Range | null {
  const m = /^\s*(\d+(?:[.,]\d+)?)\s*(?:[-–]\s*(\d+(?:[.,]\d+)?))?\s*$/.exec(text);
  if (!m) return null;
  const lo = Number(m[1].replace(',', '.'));
  const hi = m[2] ? Number(m[2].replace(',', '.')) : lo;
  return { min: lo, max: hi };
}

export interface SetsInfo {
  text: string;
  sets: Range | null;
  reps: Range | null;
  durationSec: Range | null;
  perSide: boolean;
}

/** "5x4", "3x8-12", "2-3x12-15", "1x (5-8s)", "3x20-30s/lado", "3x, segura 5-10s". */
export function parseSetsText(raw: string): SetsInfo {
  const text = raw.trim();
  const out: SetsInfo = { text, sets: null, reps: null, durationSec: null, perSide: false };
  const m = /^(\d+(?:-\d+)?)\s*[x×]\s*(.*)$/i.exec(text);
  if (!m) return out;
  out.sets = parseRange(m[1]);
  let rest = m[2].trim();
  if (rest.endsWith('/lado')) {
    out.perSide = true;
    rest = rest.slice(0, -5).trim();
  }
  rest = rest.replace(/^\(|\)$/g, '').trim().replace(/^,?\s*segura\s*/, '');
  const sec = /^(\d+(?:-\d+)?)\s*s$/.exec(rest);
  if (sec) out.durationSec = parseRange(sec[1]);
  else out.reps = parseRange(rest);
  return out;
}

export interface LoadInfo {
  load: Range | null;
  loadText: string;
  loadMode: LoadMode;
}

export function parseLoadText(raw: string | number | null | undefined): LoadInfo {
  if (raw === null || raw === undefined || raw === '') return { load: null, loadText: '—', loadMode: 'none' };
  if (typeof raw === 'number') return { load: { min: raw, max: raw }, loadText: String(raw), loadMode: 'fixed' };
  const t = raw.trim();
  if (['—', '–', '-'].includes(t)) return { load: null, loadText: '—', loadMode: 'none' };
  const r = parseRange(t.replace(/\s*kg$/i, ''));
  if (r) return { load: r, loadText: t, loadMode: 'fixed' };
  let m = /^(\d+(?:[.,]\d+)?)\s*\+$/.exec(t);
  if (m) {
    const v = Number(m[1].replace(',', '.'));
    return { load: { min: v, max: v }, loadText: t, loadMode: 'progressive' };
  }
  m = /^\+\s*(\d+(?:[.,]\d+)?)\s*kg$/i.exec(t);
  if (m) {
    const v = Number(m[1].replace(',', '.'));
    return { load: { min: v, max: v }, loadText: t, loadMode: 'added' };
  }
  if (t.toLowerCase() === 'peso corporal') return { load: null, loadText: t, loadMode: 'bodyweight' };
  return { load: null, loadText: t, loadMode: 'text' };
}

export function parseRpeText(raw: string | null | undefined): OpenRange | null {
  if (!raw) return null;
  const t = raw.trim();
  if (['—', '–', '-', ''].includes(t)) return null;
  if (t.startsWith('≤') || t.startsWith('<=')) {
    const r = parseRange(t.replace(/^(≤|<=)/, ''));
    return r ? { min: null, max: r.max } : null;
  }
  return parseRange(t);
}

export function parseRestText(raw: string | null | undefined): Range | null {
  if (!raw) return null;
  const m = /^(\d+(?:-\d+)?)\s*min$/.exec(raw.trim());
  if (!m) return null;
  const r = parseRange(m[1])!;
  return { min: r.min * 60, max: r.max * 60 };
}

// ---- valores soltos (CSV) ----

/** "7,5" / "7.5" / "1.234,5" → número; vazio/texto → null. */
export function parseNumberLoose(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  let t = raw.trim().replace(/\s*kg$/i, '');
  if (!t) return null;
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, '').replace(',', '.');
  else t = t.replace(',', '.');
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Primeiro número de um texto livre ("dor 3/10" → 3). */
export function extractNumber(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const m = /(\d+(?:[.,]\d+)?)/.exec(raw);
  return m ? Number(m[1].replace(',', '.')) : null;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, fev: 2, mar: 3, apr: 4, abr: 4, may: 5, mai: 5, jun: 6, jul: 7, aug: 8, ago: 8,
  sep: 9, set: 9, oct: 10, out: 10, nov: 11, dec: 12, dez: 12,
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Datas: ISO, "dd/mm/aaaa", "dd/mm/aa", "26 Oct 2026, 18:30" (Hevy), "26 out 2026". */
export function parseDateLoose(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = raw.trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(t);
  if (m) {
    const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    return `${y}-${pad(Number(m[2]))}-${pad(Number(m[1]))}`;
  }
  m = /^(\d{1,2})\s+([A-Za-zçÇ]{3})[a-zç.]*\s+(\d{4})/.exec(t);
  if (m) {
    const mon = MONTHS[m[2].toLowerCase()];
    if (mon) return `${m[3]}-${pad(mon)}-${pad(Number(m[1]))}`;
  }
  m = /^([A-Za-z]{3})[a-z]*\s+(\d{1,2}),?\s+(\d{4})/.exec(t); // "Oct 26, 2026"
  if (m) {
    const mon = MONTHS[m[1].toLowerCase()];
    if (mon) return `${m[3]}-${pad(mon)}-${pad(Number(m[2]))}`;
  }
  return null;
}
