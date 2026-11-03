// Formatação pt-BR feita à mão (independe do suporte a Intl do aparelho).

export function formatNumber(value: number, decimals = 1): string {
  const fixed = Math.abs(value).toFixed(decimals);
  let [int, frac] = fixed.split('.');
  int = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (frac !== undefined) frac = frac.replace(/0+$/, '');
  const sign = value < 0 ? '-' : '';
  return frac ? `${sign}${int},${frac}` : `${sign}${int}`;
}

export function formatKg(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${formatNumber(value, 2)} kg`;
}

export function formatRange(r: { min: number | null; max: number } | null, suffix = ''): string {
  if (!r) return '—';
  if (r.min === null) return `≤${formatNumber(r.max)}${suffix}`;
  if (r.min === r.max) return `${formatNumber(r.max)}${suffix}`;
  return `${formatNumber(r.min)}–${formatNumber(r.max)}${suffix}`;
}

export function parseDecimal(text: string): number | null {
  const t = text.trim().replace(/\./g, '').replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** 'YYYY-MM-DD' -> 'dd/MM' */
export function formatDateShort(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

export const WEEKDAY_NAMES = ['', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
export const WEEKDAY_SHORT = ['', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export function formatSeconds(total: number): string {
  const s = Math.max(0, Math.round(total));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}
