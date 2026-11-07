// Tela do exercício: histórico, gráfico e recordes a partir das séries registradas (SetRow).

import type { Point, SetRow } from './analytics';

/** Séries de trabalho com carga e repetições (o que dá para comparar entre treinos). */
export function exerciseRows(rows: readonly SetRow[], exerciseId: string): SetRow[] {
  return rows.filter((r) => r.exerciseId === exerciseId);
}

const counts = (r: SetRow) => !r.failed && r.loadKg !== null && r.loadKg > 0 && r.reps !== null && r.reps > 0;

/** 1RM estimado pela fórmula de Epley (vale para qualquer série; sem RPE). */
export function epley1rm(loadKg: number, reps: number): number {
  return Math.round(reps === 1 ? loadKg : loadKg * (1 + reps / 30));
}

export type StatMetric = 'maxLoad' | 'oneRm' | 'sessionVolume';

export const STAT_METRIC_LABEL: Record<StatMetric, string> = {
  maxLoad: 'Maior peso',
  oneRm: '1RM estimado',
  sessionVolume: 'Volume da sessão',
};

/** Um ponto por treino para o gráfico, em ordem de data. */
export function exerciseSeries(rows: readonly SetRow[], metric: StatMetric): Point[] {
  const bySession = new Map<string, { date: string; sets: SetRow[] }>();
  for (const r of rows) {
    if (!counts(r)) continue;
    const s = bySession.get(r.sessionLogId) ?? { date: r.date, sets: [] };
    s.sets.push(r);
    bySession.set(r.sessionLogId, s);
  }
  const value = (sets: SetRow[]) =>
    metric === 'maxLoad'
      ? Math.max(...sets.map((s) => s.loadKg!))
      : metric === 'oneRm'
        ? Math.max(...sets.map((s) => epley1rm(s.loadKg!, s.reps!)))
        : Math.round(sets.reduce((sum, s) => sum + s.loadKg! * s.reps!, 0));
  return [...bySession.values()].map((s) => ({ x: s.date, y: value(s.sets) })).sort((a, b) => a.x.localeCompare(b.x));
}

export interface Record1 {
  kg: number;
  reps: number;
  date: string;
}

export interface PersonalRecords {
  maxLoad: Record1 | null;
  best1rm: { kg: number; date: string } | null;
  bestSetVolume: Record1 | null;
  bestSessionVolume: { kg: number; date: string } | null;
  /** Para cada número de repetições, a maior carga feita com pelo menos essas repetições. */
  byReps: { reps: number; kg: number; date: string }[];
}

export function personalRecords(rows: readonly SetRow[], maxRepRows = 15): PersonalRecords {
  const sets = rows.filter(counts);
  const pick = <T,>(items: T[], score: (x: T) => number): T | null =>
    items.reduce<T | null>((best, x) => (best === null || score(x) > score(best) ? x : best), null);
  const asRecord = (r: SetRow | null): Record1 | null => (r ? { kg: r.loadKg!, reps: r.reps!, date: r.date } : null);

  const top1rm = pick(sets, (s) => epley1rm(s.loadKg!, s.reps!));
  const sessions = new Map<string, { date: string; volume: number }>();
  for (const s of sets) {
    const cur = sessions.get(s.sessionLogId) ?? { date: s.date, volume: 0 };
    cur.volume += s.loadKg! * s.reps!;
    sessions.set(s.sessionLogId, cur);
  }
  const topSession = pick([...sessions.values()], (s) => s.volume);

  const byReps: PersonalRecords['byReps'] = [];
  const most = sets.reduce((m, s) => Math.max(m, s.reps!), 0);
  for (let reps = 1; reps <= Math.min(most, maxRepRows); reps++) {
    const best = pick(
      sets.filter((s) => s.reps! >= reps),
      (s) => s.loadKg!,
    );
    if (best) byReps.push({ reps, kg: best.loadKg!, date: best.date });
  }

  return {
    maxLoad: asRecord(pick(sets, (s) => s.loadKg!)),
    best1rm: top1rm ? { kg: epley1rm(top1rm.loadKg!, top1rm.reps!), date: top1rm.date } : null,
    bestSetVolume: asRecord(pick(sets, (s) => s.loadKg! * s.reps!)),
    bestSessionVolume: topSession ? { kg: Math.round(topSession.volume), date: topSession.date } : null,
    byReps,
  };
}

export interface HistorySession {
  sessionLogId: string;
  date: string;
  title: string;
  sets: SetRow[];
}

/** Treinos em que o exercício apareceu, do mais recente para o mais antigo, com as séries em ordem. */
export function exerciseHistory(rows: readonly SetRow[]): HistorySession[] {
  const by = new Map<string, HistorySession>();
  for (const r of rows) {
    const s = by.get(r.sessionLogId) ?? { sessionLogId: r.sessionLogId, date: r.date, title: r.sessionTitle, sets: [] };
    s.sets.push(r);
    by.set(r.sessionLogId, s);
  }
  return [...by.values()]
    .map((s) => ({ ...s, sets: [...s.sets].sort((a, b) => a.setIndex - b.setIndex) }))
    .sort((a, b) => b.date.localeCompare(a.date));
}
