import { describe, expect, it } from 'vitest';
import { formatClock, isActiveWorkout, isStale, workoutDurationSec } from '../workout';

const T0 = Date.parse('2026-11-06T20:00:00Z');
const log = (over: Partial<{ status: 'in_progress' | 'done'; startedAt: string | null; endedAt: string | null }> = {}) => ({
  status: 'in_progress' as const,
  startedAt: '2026-11-06T20:00:00Z' as string | null,
  endedAt: null as string | null,
  ...over,
});

describe('treino em andamento', () => {
  it('só está em andamento quem começou e não foi concluído', () => {
    expect(isActiveWorkout(log())).toBe(true);
    expect(isActiveWorkout(log({ startedAt: null }))).toBe(false);
    expect(isActiveWorkout(log({ status: 'done' }))).toBe(false);
    expect(isActiveWorkout(null)).toBe(false);
  });

  it('duração: corre até agora; concluído para no fim; sem início não existe', () => {
    expect(workoutDurationSec(log(), T0 + 34 * 60_000 + 12_000)).toBe(34 * 60 + 12);
    expect(workoutDurationSec(log({ status: 'done', endedAt: '2026-11-06T21:05:03Z' }), T0 + 99 * 3600_000)).toBe(3600 + 5 * 60 + 3);
    expect(workoutDurationSec(log({ startedAt: null }), T0)).toBeNull();
  });

  it('esquecido aberto passa de 6 h; concluído nunca', () => {
    expect(isStale(log(), T0 + 5 * 3600_000)).toBe(false);
    expect(isStale(log(), T0 + 7 * 3600_000)).toBe(true);
    expect(isStale(log({ status: 'done' }), T0 + 72 * 3600_000)).toBe(false);
  });

  it('relógio curto', () => {
    expect(formatClock(34 * 60 + 12)).toBe('34:12');
    expect(formatClock(3600 + 5 * 60 + 3)).toBe('1:05:03');
    expect(formatClock(-4)).toBe('0:00');
  });
});
