import { describe, expect, it } from 'vitest';
import type { SetRow } from '../analytics';
import { epley1rm } from '../rpe';
import { exerciseHistory, exerciseRows, exerciseSeries, personalRecords } from '../exerciseStats';

let n = 0;
const row = (p: Partial<SetRow>): SetRow => ({
  cycleId: 'c',
  cycleName: 'C',
  week: 1,
  block: 'Volume',
  sessionLogId: 's1',
  sessionId: 'w1-d1',
  itemId: null,
  sessionTitle: 'Supino',
  date: '2026-11-02',
  exerciseId: 'supino',
  exerciseName: 'Supino',
  lift: 'bench',
  kind: 'main',
  setIndex: ++n,
  loadKg: 100,
  reps: 5,
  rpe: null,
  failed: false,
  setId: `id${n}`,
  setType: 'normal',
  doneAt: '2026-11-02T10:00:00.000Z',
  ...p,
});

const rows: SetRow[] = [
  row({ sessionLogId: 's1', date: '2026-11-02', setIndex: 1, loadKg: 100, reps: 5 }),
  row({ sessionLogId: 's1', date: '2026-11-02', setIndex: 2, loadKg: 110, reps: 3 }),
  row({ sessionLogId: 's1', date: '2026-11-02', setIndex: 3, loadKg: 120, reps: 1, failed: true }),
  row({ sessionLogId: 's2', date: '2026-11-05', setIndex: 1, loadKg: 105, reps: 5 }),
  row({ sessionLogId: 's2', date: '2026-11-05', setIndex: 2, loadKg: 105, reps: 4 }),
  row({ exerciseId: 'outro', sessionLogId: 's3', loadKg: 50, reps: 10 }),
];
const mine = exerciseRows(rows, 'supino');

describe('tela do exercício', () => {
  it('filtra pelo exercício', () => {
    expect(mine).toHaveLength(5);
  });

  it('1RM estimado (Epley)', () => {
    expect(epley1rm(100, 1)).toBe(100);
    expect(epley1rm(100, 5)).toBe(117);
    expect(epley1rm(110, 3)).toBe(121);
  });

  it('série por treino, ignorando falhas', () => {
    expect(exerciseSeries(mine, 'maxLoad')).toEqual([
      { x: '2026-11-02', y: 110 },
      { x: '2026-11-05', y: 105 },
    ]);
    expect(exerciseSeries(mine, 'oneRm')).toEqual([
      { x: '2026-11-02', y: 121 },
      { x: '2026-11-05', y: 123 },
    ]);
    expect(exerciseSeries(mine, 'sessionVolume')).toEqual([
      { x: '2026-11-02', y: 830 },
      { x: '2026-11-05', y: 945 },
    ]);
  });

  it('recordes pessoais', () => {
    const r = personalRecords(mine);
    expect([r.maxLoad?.value.value, r.maxLoad?.set.reps, r.maxLoad?.set.date]).toEqual([110, 3, '2026-11-02']);
    expect([r.oneRm?.value.value, r.oneRm?.set.date]).toEqual([123, '2026-11-05']);
    expect([r.setVolume?.value.value, r.setVolume?.set.date]).toEqual([525, '2026-11-05']);
    // sem RPE vale RPE 10: 105 kg × 5 → 105 / 0,863 = 121,7
    expect([r.oneRmRpe?.value.value, r.oneRmRpe?.value.rpeAssumed]).toEqual([121.7, true]);
    expect(r.bestSessionVolume).toEqual({ kg: 945, date: '2026-11-05' });
    // mais pesado com pelo menos N repetições: 1→110, 2→110, 3→110, 4→105, 5→105
    expect(r.byReps.map((x) => [x.reps, x.kg])).toEqual([
      [1, 110],
      [2, 110],
      [3, 110],
      [4, 105],
      [5, 105],
    ]);
  });

  it('sem séries com carga e repetições, tudo vazio', () => {
    const r = personalRecords([row({ loadKg: null, reps: 12 })]);
    expect(r).toEqual({ maxLoad: null, oneRm: null, oneRmRpe: null, setVolume: null, bestSessionVolume: null, byReps: [] });
    expect(exerciseSeries([row({ loadKg: null })], 'maxLoad')).toEqual([]);
  });

  it('histórico: treino mais recente primeiro, séries em ordem, falhas incluídas', () => {
    const h = exerciseHistory(mine);
    expect(h.map((s) => s.date)).toEqual(['2026-11-05', '2026-11-02']);
    expect(h[1].sets.map((s) => s.setIndex)).toEqual([1, 2, 3]);
    expect(h[1].sets[2].failed).toBe(true);
  });
});
