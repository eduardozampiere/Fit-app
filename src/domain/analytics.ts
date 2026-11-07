// Análises: linhas de série achatadas, agrupamentos e séries para gráficos.

import { kcalTarget, sumMacros, type MealEntry, type NutritionTargets } from './nutrition';
import { formatDate } from './format';
import { e1rm } from './rpe';
import type { CheckIn, LoggedSession } from './rules';
import type { Cycle, ItemKind, Lift } from './types';
import { sessionForDate } from './plan';

export interface SetRow {
  cycleId: string;
  cycleName: string;
  week: number | null;
  block: string | null;
  sessionLogId: string;
  sessionId: string;
  itemId: string | null;
  sessionTitle: string;
  date: string;
  exerciseId: string;
  exerciseName: string;
  lift: Lift | null;
  kind: ItemKind | null;
  setIndex: number;
  loadKg: number | null;
  reps: number | null;
  rpe: number | null;
  failed: boolean;
}

/** Achata as séries de um ciclo, com o contexto do plano (semana, bloco, sessão, tipo). */
export function flattenSets(cycle: Cycle, logged: LoggedSession[], exerciseNames: Map<string, string>): SetRow[] {
  const items = new Map<string, { kind: ItemKind; name: string }>();
  const sessions = new Map<string, { week: number; block: string; title: string }>();
  for (const w of cycle.weeks) {
    for (const s of w.sessions) {
      sessions.set(s.id, { week: w.number, block: w.block, title: s.title });
      for (const it of s.items) items.set(it.id, { kind: it.kind, name: it.name });
    }
    for (const it of w.core?.items ?? []) items.set(it.id, { kind: it.kind, name: it.name });
  }
  const lifts = new Map(cycle.exercises.map((e) => [e.id, e.lift]));
  const rows: SetRow[] = [];
  for (const ls of logged) {
    const sess = sessions.get(ls.log.sessionId);
    for (const s of ls.sets) {
      const it = s.itemId ? items.get(s.itemId) : undefined;
      rows.push({
        cycleId: cycle.id,
        cycleName: cycle.name,
        week: sess?.week ?? ls.log.week ?? null,
        block: sess?.block ?? null,
        sessionLogId: ls.log.id,
        sessionId: ls.log.sessionId,
        itemId: s.itemId,
        sessionTitle: sess?.title ?? 'Treino avulso',
        date: ls.log.date,
        exerciseId: s.exerciseId,
        exerciseName: it?.name ?? exerciseNames.get(s.exerciseId) ?? s.exerciseId,
        lift: lifts.get(s.exerciseId) ?? null,
        kind: it?.kind ?? null,
        setIndex: s.setIndex,
        loadKg: s.loadKg,
        reps: s.reps,
        rpe: s.rpe,
        failed: s.failed,
      });
    }
  }
  return rows;
}

export type GroupBy = 'cycle' | 'block' | 'week' | 'session' | 'exercise';

export const GROUP_LABEL: Record<GroupBy, string> = {
  cycle: 'Ciclo',
  block: 'Bloco',
  week: 'Semana',
  session: 'Treino',
  exercise: 'Exercício',
};

export interface GroupStats {
  key: string;
  label: string;
  sortKey: string;
  sessions: number;
  sets: number;
  reps: number;
  tonnage: number;
  maxLoad: number | null;
  avgRpe: number | null;
}

function groupKey(r: SetRow, by: GroupBy): { key: string; label: string; sortKey: string } {
  switch (by) {
    case 'cycle':
      return { key: r.cycleId, label: r.cycleName, sortKey: r.cycleId };
    case 'block':
      return { key: `${r.cycleId}|${r.block}`, label: r.block ?? 'Sem bloco', sortKey: `${r.cycleId}|${String(r.week ?? 0).padStart(3, '0')}` };
    case 'week':
      return { key: `${r.cycleId}|${r.week}`, label: r.week ? `Semana ${r.week}` : 'Sem semana', sortKey: `${r.cycleId}|${String(r.week ?? 0).padStart(3, '0')}` };
    case 'session':
      return { key: r.sessionLogId, label: `${formatDate(r.date)} · ${r.sessionTitle}`, sortKey: r.date };
    case 'exercise':
      return { key: r.exerciseId, label: r.exerciseName, sortKey: r.exerciseName };
  }
}

/** Nº de treinos, séries, reps, tonelagem (séries × reps × carga), carga máxima e RPE médio por grupo. */
export function groupStats(rows: SetRow[], by: GroupBy): GroupStats[] {
  const m = new Map<string, GroupStats & { rpeSum: number; rpeN: number; sessionIds: Set<string> }>();
  for (const r of rows) {
    const g = groupKey(r, by);
    let acc = m.get(g.key);
    if (!acc) {
      acc = { ...g, sessions: 0, sets: 0, reps: 0, tonnage: 0, maxLoad: null, avgRpe: null, rpeSum: 0, rpeN: 0, sessionIds: new Set() };
      m.set(g.key, acc);
    }
    acc.sessionIds.add(r.sessionLogId);
    acc.sets += 1;
    if (!r.failed && r.reps) acc.reps += r.reps;
    if (!r.failed && r.reps && r.loadKg) acc.tonnage += r.reps * r.loadKg;
    if (!r.failed && r.loadKg !== null && (acc.maxLoad === null || r.loadKg > acc.maxLoad)) acc.maxLoad = r.loadKg;
    if (r.rpe !== null) {
      acc.rpeSum += r.rpe;
      acc.rpeN += 1;
    }
  }
  return [...m.values()]
    .map(({ rpeSum, rpeN, sessionIds, ...g }) => ({
      ...g,
      sessions: sessionIds.size,
      tonnage: Math.round(g.tonnage),
      avgRpe: rpeN ? Math.round((rpeSum / rpeN) * 10) / 10 : null,
    }))
    .sort((a, b) => (by === 'session' ? b.sortKey.localeCompare(a.sortKey) : a.sortKey.localeCompare(b.sortKey)));
}

export interface Point {
  x: string; // data (YYYY-MM-DD) ou rótulo da semana
  y: number;
}

/** Carga do top set do principal de um movimento, por sessão. */
export function mainLoadSeries(rows: SetRow[], lift: Lift): Point[] {
  return perSession(rows, lift, (sets) => {
    const loads = sets.filter((s) => !s.failed && s.loadKg !== null).map((s) => s.loadKg!);
    return loads.length ? Math.max(...loads) : null;
  });
}

/** e1RM pela tabela RTS a partir da melhor série principal com RPE de cada sessão. */
export function e1rmSeries(rows: SetRow[], lift: Lift): Point[] {
  return perSession(rows, lift, (sets) => {
    let best: number | null = null;
    for (const s of sets) {
      if (s.failed || s.loadKg === null || s.reps === null || s.rpe === null) continue;
      const v = e1rm(s.loadKg, s.reps, s.rpe);
      if (v !== null && (best === null || v > best)) best = v;
    }
    return best;
  });
}

function perSession(rows: SetRow[], lift: Lift, fn: (sets: SetRow[]) => number | null): Point[] {
  const by = new Map<string, SetRow[]>();
  for (const r of rows) {
    if (r.lift !== lift || r.kind !== 'main') continue;
    const list = by.get(r.sessionLogId) ?? [];
    list.push(r);
    by.set(r.sessionLogId, list);
  }
  const out: Point[] = [];
  for (const sets of by.values()) {
    const y = fn(sets);
    if (y !== null) out.push({ x: sets[0].date, y });
  }
  return out.sort((a, b) => a.x.localeCompare(b.x));
}

/** RPE do single de ativação por semana (o "termômetro" de recuperação). */
export function activationRpeByWeek(rows: SetRow[], lift: Lift): Point[] {
  const by = new Map<number, number>();
  for (const r of rows) {
    if (r.lift !== lift || r.kind !== 'activation_single' || r.rpe === null || r.week === null) continue;
    by.set(r.week, Math.max(by.get(r.week) ?? 0, r.rpe));
  }
  return [...by.entries()].sort((a, b) => a[0] - b[0]).map(([w, y]) => ({ x: `S${w}`, y }));
}

export interface PlannedVsDone {
  week: number;
  plannedSets: number;
  doneSets: number;
  plannedTonnage: number;
  doneTonnage: number;
}

/** Planejado × feito por semana (sem core/mobilidade). Só semanas até a data informada. */
export function plannedVsDone(cycle: Cycle, rows: SetRow[], untilDate: string): PlannedVsDone[] {
  const out: PlannedVsDone[] = [];
  for (const w of cycle.weeks) {
    if (w.start > untilDate) break;
    let plannedSets = 0;
    let plannedTonnage = 0;
    for (const s of w.sessions)
      for (const it of s.items) {
        if (it.kind === 'core') continue;
        const sets = it.sets?.min ?? 0;
        plannedSets += sets;
        if (it.load && it.reps) plannedTonnage += sets * it.reps.min * it.load.min;
      }
    const done = rows.filter((r) => r.cycleId === cycle.id && r.week === w.number && r.kind !== 'core');
    out.push({
      week: w.number,
      plannedSets,
      doneSets: done.filter((r) => !r.failed).length,
      plannedTonnage: Math.round(plannedTonnage),
      doneTonnage: Math.round(done.reduce((a, r) => (r.failed || !r.loadKg || !r.reps ? a : a + r.loadKg * r.reps), 0)),
    });
  }
  return out;
}

export interface NutritionDay {
  date: string;
  kcal: number;
  protein: number;
  kcalTarget: number;
  proteinTarget: number;
  training: boolean;
}

export function nutritionDays(entries: MealEntry[], cycle: Cycle | null, targets: NutritionTargets): NutritionDay[] {
  const by = new Map<string, MealEntry[]>();
  for (const e of entries) by.set(e.date, [...(by.get(e.date) ?? []), e]);
  return [...by.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, list]) => {
      const total = sumMacros(list);
      const training = !!cycle && !!sessionForDate(cycle, date);
      return { date, kcal: total.kcal, protein: total.protein, kcalTarget: kcalTarget(targets, training), proteinTarget: targets.protein, training };
    });
}

export interface TrainingCard {
  sessionLogId: string;
  date: string;
  title: string;
  week: number | null;
  sets: number;
  tonnage: number;
  tops: { name: string; loadKg: number; reps: number | null; rpe: number | null }[];
  checkin: CheckIn | null;
}

/** Cartões de treino por dia, mais recentes primeiro, com o check-in do dia. */
export function trainingCards(rows: SetRow[], checkins: CheckIn[]): TrainingCard[] {
  const by = new Map<string, SetRow[]>();
  for (const r of rows) by.set(r.sessionLogId, [...(by.get(r.sessionLogId) ?? []), r]);
  const cards: TrainingCard[] = [];
  for (const [id, sets] of by) {
    const mains = new Map<string, SetRow>();
    for (const s of sets) {
      if (s.kind !== 'main' || s.failed || s.loadKg === null) continue;
      const cur = mains.get(s.exerciseId);
      if (!cur || s.loadKg > (cur.loadKg ?? 0)) mains.set(s.exerciseId, s);
    }
    cards.push({
      sessionLogId: id,
      date: sets[0].date,
      title: sets[0].sessionTitle,
      week: sets[0].week,
      sets: sets.filter((s) => !s.failed && s.kind !== 'core').length,
      tonnage: Math.round(sets.reduce((a, r) => (r.failed || !r.loadKg || !r.reps ? a : a + r.loadKg * r.reps), 0)),
      tops: [...mains.values()].map((s) => ({ name: s.exerciseName, loadKg: s.loadKg!, reps: s.reps, rpe: s.rpe })),
      checkin: checkins.find((c) => c.date === sets[0].date) ?? null,
    });
  }
  return cards.sort((a, b) => b.date.localeCompare(a.date));
}
