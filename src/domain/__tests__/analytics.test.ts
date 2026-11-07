import { describe, expect, it } from 'vitest';
import cycleJson from '../../../assets/plan/ciclo_out26_jan27.json';
import {
  activationRpeByWeek,
  e1rmSeries,
  flattenSets,
  groupStats,
  mainLoadSeries,
  nutritionDays,
  plannedVsDone,
  trainingCards,
} from '../analytics';
import { DEFAULT_TARGETS, type MealEntry } from '../nutrition';
import { sessionDate } from '../plan';
import { NO_RED_FLAGS, type LoggedSession } from '../rules';
import type { Cycle, PrescribedItem, SetLog } from '../types';

const cycle = cycleJson as unknown as Cycle;
const week = (n: number) => cycle.weeks.find((w) => w.number === n)!;

let seq = 0;
function set(item: PrescribedItem, setIndex: number, extra: Partial<SetLog> = {}): SetLog {
  return {
    id: `s${++seq}`,
    sessionLogId: 'x',
    itemId: item.id,
    exerciseId: item.exerciseId,
    setIndex,
    loadKg: item.load?.min ?? null,
    reps: item.reps?.min ?? null,
    durationSec: null,
    rpe: null,
    grip: null,
    belt: null,
    failed: false,
    asPlanned: true,
    warmup: false, setType: 'normal',
    note: null,
    doneAt: '',
    ...extra,
  };
}

function logged(w: number, weekday: number, build: (items: PrescribedItem[]) => SetLog[]): LoggedSession {
  const s = week(w).sessions.find((x) => x.weekday === weekday)!;
  return {
    log: { id: `L${w}-${weekday}`, cycleId: cycle.id, week: w, sessionId: s.id, date: sessionDate(week(w), s), status: 'done', note: null, startedAt: null, endedAt: null },
    sets: build(s.items),
  };
}

// S1 segunda: single 170 @7; agacho 4x4 140, última @7; supino pausa 3x4 125
const mon1 = logged(1, 1, (it) => [
  set(it[0], 1, { rpe: 7 }),
  ...[1, 2, 3, 4].map((i) => set(it[1], i, { rpe: i === 4 ? 7 : null })),
  ...[1, 2, 3].map((i) => set(it[2], i)),
]);
// S2 segunda: agacho 5x4 145, uma falha, última @7,5
const mon2 = logged(2, 1, (it) => [
  set(it[0], 1, { rpe: 8 }),
  ...[1, 2, 3, 4].map((i) => set(it[1], i, { rpe: i === 4 ? 7.5 : null })),
  set(it[1], 5, { failed: true }),
]);

const rows = flattenSets(cycle, [mon1, mon2], new Map());

describe('agrupamentos', () => {
  it('achata com semana, bloco, tipo e movimento', () => {
    expect(rows).toHaveLength(8 + 6);
    expect(rows[1]).toMatchObject({ week: 1, block: 'Volume', kind: 'main', lift: 'squat', exerciseName: 'Agachamento (High Bar)' });
  });

  it('por exercício: treinos, séries, reps, tonelagem, carga máxima e RPE médio', () => {
    const g = groupStats(rows, 'exercise').find((x) => x.key === 'agachamento-high-bar')!;
    expect(g.sessions).toBe(2);
    expect(g.sets).toBe(9); // conta a falha como série tentada
    expect(g.reps).toBe(32); // falha não conta
    expect(g.tonnage).toBe(4 * 4 * 140 + 4 * 4 * 145);
    expect(g.maxLoad).toBe(145);
    expect(g.avgRpe).toBe(7.3); // (7 + 7,5) / 2 = 7,25
  });

  it('por semana e por ciclo', () => {
    const w = groupStats(rows, 'week');
    expect(w.map((x) => x.label)).toEqual(['Semana 1', 'Semana 2']);
    expect(groupStats(rows, 'cycle')).toHaveLength(1);
    expect(groupStats(rows, 'cycle')[0].sessions).toBe(2);
  });

  it('por treino: mais recente primeiro', () => {
    expect(groupStats(rows, 'session')[0].key).toBe('L2-1');
  });

  it('por bloco', () => {
    expect(groupStats(rows, 'block')[0].label).toBe('Volume');
  });
});

describe('séries para gráficos', () => {
  it('carga do principal por sessão', () => {
    expect(mainLoadSeries(rows, 'squat')).toEqual([
      { x: '2026-10-26', y: 140 },
      { x: '2026-11-02', y: 145 },
    ]);
  });

  it('e1RM pela melhor série com RPE', () => {
    const s = e1rmSeries(rows, 'squat');
    expect(s[0].y).toBe(172.6); // 140 x4 @7 → 140 / 0,811
    expect(s[1].y).toBe(176); // 145 x4 @7,5 → 145 / 0,824
  });

  it('termômetro: RPE do single por semana', () => {
    expect(activationRpeByWeek(rows, 'squat')).toEqual([
      { x: 'S1', y: 7 },
      { x: 'S2', y: 8 },
    ]);
  });

  it('planejado × feito', () => {
    const p = plannedVsDone(cycle, rows, '2026-11-03');
    expect(p.map((x) => x.week)).toEqual([1, 2]);
    expect(p[0].doneSets).toBe(8);
    expect(p[0].plannedSets).toBeGreaterThan(p[0].doneSets);
  });

  it('calorias e proteína por dia contra o alvo do tipo de dia', () => {
    const e = (date: string, kcal: number, protein: number): MealEntry => ({
      id: date + kcal, date, meal: 'almoco', kind: 'custom', label: 'x', foodId: null, grams: null, kcal, protein, carbs: 0, fat: 0,
    });
    const d = nutritionDays([e('2026-11-02', 1000, 80), e('2026-11-02', 1500, 100), e('2026-11-07', 2000, 150)], cycle, DEFAULT_TARGETS);
    expect(d[0]).toMatchObject({ date: '2026-11-02', kcal: 2500, protein: 180, kcalTarget: 2600, training: true });
    expect(d[1]).toMatchObject({ kcalTarget: 2200, training: false });
  });

  it('cartões por dia com top sets e check-in', () => {
    const cards = trainingCards(rows, [
      { date: '2026-11-02', lowBack: 1, knee: 0, wrist: 0, foot: 0, sleepH: 7, redFlags: NO_RED_FLAGS, note: null },
    ]);
    expect(cards[0].date).toBe('2026-11-02');
    expect(cards[0].tops[0]).toMatchObject({ loadKg: 145, reps: 4 });
    expect(cards[0].checkin?.lowBack).toBe(1);
    expect(cards[1].checkin).toBeNull();
  });
});
