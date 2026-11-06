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

/**
 * Número digitado numa célula (carga, reps). Aceita vírgula ou ponto como decimal, porque o teclado
 * numérico muda conforme o idioma do aparelho; aqui não há separador de milhar.
 */
export function parseDecimalInput(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (t === '' || !/^\d*\.?\d*$/.test(t) || t === '.') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Duração de treino: "45 min", "1h 15min". */
export function formatElapsed(totalSeconds: number): string {
  const min = Math.max(0, Math.floor(totalSeconds / 60));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

/** 'YYYY-MM-DD' -> 'dd/MM' */
export function formatDateShort(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

export const WEEKDAY_NAMES = ['', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
export const WEEKDAY_SHORT = ['', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

/** "4min 0s", "1min 30s", "45s" (como o timer de descanso do Hevy). */
export function formatRestDuration(total: number): string {
  const s = Math.max(0, Math.round(total));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}min ${s % 60}s`;
}

/** Duração do treino: "45s", "6min 13s", "1h 15min". */
export function formatWorkoutTime(total: number): string {
  return total >= 3600 ? formatElapsed(total) : formatRestDuration(total);
}

export function formatSeconds(total: number): string {
  const s = Math.max(0, Math.round(total));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}
