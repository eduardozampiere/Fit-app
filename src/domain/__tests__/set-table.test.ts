import { describe, expect, it } from 'vitest';
import cycleJson from '../../../assets/plan/ciclo_out26_jan27.json';
import { formatElapsed, parseDecimalInput } from '../format';
import {
  asPlannedSets,
  draftFromInput,
  plannedCountFor,
  plannedSet,
  renumberAfterRemoval,
  sessionStats,
  setRowCount,
} from '../logging';
import { barChoices, platesFor } from '../plates';
import type { Cycle } from '../types';

const cycle = cycleJson as unknown as Cycle;
const squat = cycle.weeks[1].sessions[0].items[1]; // S2 agacho 5x4 145

describe('tabela de séries', () => {
  it('sem ajuste, mostra o topo da faixa e completa o início', () => {
    const acc = { sets: { min: 2, max: 3 } };
    expect(setRowCount(acc, undefined, [])).toBe(3);
    expect(plannedCountFor(acc)).toBe(2);
  });

  it('séries adicionadas ou removidas no dia mudam linhas e o "conforme o plano"', () => {
    expect(setRowCount(squat, 6, [])).toBe(6);
    expect(plannedCountFor(squat, 6)).toBe(6);
    expect(asPlannedSets(squat, squat.load, [1], 6).map((s) => s.setIndex)).toEqual([2, 3, 4, 5, 6]);
    expect(asPlannedSets(squat, squat.load, [], 3)).toHaveLength(3);
  });

  it('nunca esconde uma série já registrada', () => {
    expect(setRowCount(squat, 3, [1, 2, 4])).toBe(4);
    expect(setRowCount({ sets: null }, 0, [])).toBe(0);
  });

  it('remover uma série do meio renumera as seguintes', () => {
    const logs = [
      { id: 'a', setIndex: 1 },
      { id: 'd', setIndex: 4 },
      { id: 'c', setIndex: 3 },
    ];
    expect(renumberAfterRemoval(logs, 2)).toEqual([
      { id: 'c', setIndex: 2 },
      { id: 'd', setIndex: 3 },
    ]);
    expect(renumberAfterRemoval(logs, 4)).toEqual([]);
  });

  it('valores digitados viram a série; vazio fica conforme o plano', () => {
    const p = plannedSet(squat, squat.load, 2);
    expect(draftFromInput(p, { load: '', work: '' })).toBe(p);
    expect(draftFromInput(p, { load: '147,5', work: '' })).toMatchObject({ loadKg: 147.5, reps: 4, asPlanned: false });
    expect(draftFromInput(p, { load: '', work: '3' })).toMatchObject({ loadKg: 145, reps: 3, asPlanned: false });
    const plank = { ...p, loadKg: null, reps: null, durationSec: 45 };
    expect(draftFromInput(plank, { load: '', work: '60' })).toMatchObject({ durationSec: 60, reps: null });
  });

  it('resumo do treino: séries, volume e início', () => {
    expect(sessionStats([])).toEqual({ sets: 0, volumeKg: 0, startedAt: null });
    const s = sessionStats([
      { loadKg: 100, reps: 5, failed: false, doneAt: '2026-11-03T10:05:00Z' },
      { loadKg: 100, reps: 5, failed: true, doneAt: '2026-11-03T10:00:00Z' },
    ]);
    expect(s).toEqual({ sets: 2, volumeKg: 500, startedAt: '2026-11-03T10:00:00Z' });
  });
});

describe('entrada e formatação', () => {
  it('aceita vírgula ou ponto e recusa lixo', () => {
    expect(parseDecimalInput('137,5')).toBe(137.5);
    expect(parseDecimalInput('137.5')).toBe(137.5);
    expect(parseDecimalInput(' 8 ')).toBe(8);
    expect(parseDecimalInput('')).toBeNull();
    expect(parseDecimalInput('abc')).toBeNull();
    expect(parseDecimalInput('.')).toBeNull();
    expect(parseDecimalInput('1.2.3')).toBeNull();
  });

  it('formata a duração do treino', () => {
    expect(formatElapsed(59)).toBe('0 min');
    expect(formatElapsed(45 * 60)).toBe('45 min');
    expect(formatElapsed(75 * 60)).toBe('1h 15min');
    expect(formatElapsed(120 * 60)).toBe('2h');
  });
});

describe('barras da calculadora', () => {
  it('lista as barras sem repetir, da mais pesada para a mais leve', () => {
    expect(barChoices(undefined, 20)).toEqual([20, 15, 10]);
    expect(barChoices([15, 25], 20)).toEqual([25, 20, 15]);
  });

  it('barra mais leve muda as anilhas', () => {
    expect(platesFor(100, 20).perSide).toEqual([25, 15]);
    expect(platesFor(100, 15).perSide).toEqual([25, 15, 2.5]);
    expect(platesFor(100, 10).perSide).toEqual([25, 20]);
  });
});
