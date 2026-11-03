// Peso corporal (média móvel e tendência) e medidas.

import { addDays, diffDays } from './dates';

export interface WeightEntry {
  date: string;
  kg: number;
  note: string | null;
}

export interface Measurement {
  date: string;
  armCm: number | null;
  thighCm: number | null;
  waistCm: number | null; // abdômen
}

export const MEASUREMENT_INTERVAL_DAYS = 14;

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Média das pesagens nos 7 dias que terminam em `date` (inclusive). null se não houver nenhuma. */
export function movingAverage7(entries: WeightEntry[], date: string): number | null {
  const window = entries.filter((e) => {
    const d = diffDays(date, e.date);
    return d >= 0 && d < 7;
  });
  if (!window.length) return null;
  return r2(window.reduce((a, b) => a + b.kg, 0) / window.length);
}

/** Série diária da média móvel, só nos dias com pesagem. */
export function movingAverageSeries(entries: WeightEntry[]): { date: string; kg: number; avg7: number }[] {
  return [...entries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => ({ date: e.date, kg: e.kg, avg7: movingAverage7(entries, e.date)! }));
}

/** Tendência semanal (kg/semana): média móvel de hoje − média móvel de 7 dias atrás. */
export function weeklyTrend(entries: WeightEntry[], date: string): number | null {
  const now = movingAverage7(entries, date);
  const before = movingAverage7(entries, addDays(date, -7));
  if (now === null || before === null) return null;
  return r2(now - before);
}

export function nextMeasurementDate(measurements: Measurement[]): string | null {
  const last = [...measurements].sort((a, b) => b.date.localeCompare(a.date))[0];
  return last ? addDays(last.date, MEASUREMENT_INTERVAL_DAYS) : null;
}
