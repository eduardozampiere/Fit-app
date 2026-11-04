import { describe, expect, it } from 'vitest';
import cycleJson from '../../../assets/plan/ciclo_out26_jan27.json';
import { formatElapsed, parseDecimalInput } from '../format';
import {
  asPlannedSets,
  draftFromInput,
  plannedCountFor,
  plannedSet,
  renumberAfterMove,
  renumberAfterRemoval,
  sessionStats,
  setRowCount,
  warmupRowCount,
  warmupSet,
} from '../logging';
import { barChoices, platesFor } from '../plates';
import { dragShift, dropIndex, itemBlocks, moveItem, orderBlocks, settleOffset, slotSize } from '../reorder';
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

describe('aquecimento', () => {
  it('rampa de 40% a 85% da carga de trabalho, com reps caindo', () => {
    const sets = [1, 2, 3].map((i) => warmupSet(squat, 145, i, 3, 20));
    expect(sets.map((s) => s.loadKg)).toEqual([57.5, 90, 122.5]);
    expect(sets.map((s) => s.reps)).toEqual([5, 3, 2]);
    expect(sets.every((s) => s.warmup && !s.asPlanned)).toBe(true);
  });

  it('um aquecimento só fica em 60%; nunca abaixo da barra', () => {
    expect(warmupSet(squat, 145, 1, 1, 20).loadKg).toBe(87.5);
    expect(warmupSet(squat, 30, 1, 3, 20).loadKg).toBe(20);
  });

  it('sem carga de trabalho, sugere só as reps do plano', () => {
    expect(warmupSet({ ...squat, reps: { min: 10, max: 12 } }, null, 1, 2, 20)).toMatchObject({ loadKg: null, reps: 10 });
  });

  it('linhas de aquecimento: adicionadas no dia ou as já registradas', () => {
    expect(warmupRowCount(undefined, [])).toBe(0);
    expect(warmupRowCount(2, [])).toBe(2);
    expect(warmupRowCount(1, [1, 3])).toBe(3);
  });
});

describe('reordenar', () => {
  it('arrastar uma série renumera só as do caminho', () => {
    const logs = [
      { id: 'a', setIndex: 1 },
      { id: 'b', setIndex: 2 },
      { id: 'c', setIndex: 4 },
    ];
    expect(renumberAfterMove(logs, 4, 1)).toEqual([
      { id: 'a', setIndex: 2 },
      { id: 'b', setIndex: 3 },
      { id: 'c', setIndex: 1 },
    ]);
    expect(renumberAfterMove(logs, 1, 3)).toEqual([
      { id: 'a', setIndex: 3 },
      { id: 'b', setIndex: 1 },
    ]);
    expect(renumberAfterMove(logs, 3, 3)).toEqual([]);
  });

  it('exercício anda junto com os filhos e respeita a ordem salva do dia', () => {
    const items = [
      { id: 'p', parentId: null },
      { id: 'p1', parentId: 'p' },
      { id: 'q', parentId: null },
      { id: 'r', parentId: 'sumiu' },
    ];
    const blocks = itemBlocks(items);
    expect(blocks.map((b) => b.map((i) => i.id))).toEqual([['p', 'p1'], ['q'], ['r']]);
    expect(orderBlocks(blocks, ['q', 'p']).map((b) => b[0].id)).toEqual(['q', 'p', 'r']);
    expect(orderBlocks(blocks, undefined)).toBe(blocks);
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
  });

  it('geometria: onde o item cai e quanto os outros abrem espaço', () => {
    const slots = [0, 1, 2, 3].map((i) => ({ y: i * 60, h: 52 }));
    expect(slotSize(slots, 0)).toBe(60);
    expect(dropIndex(slots, 0, 10)).toBe(0);
    expect(dropIndex(slots, 0, 150)).toBe(2);
    expect(dropIndex(slots, 3, 0)).toBe(0);
    expect([0, 1, 2, 3].map((i) => dragShift(i, 0, 2, 60))).toEqual([0, -60, -60, 0]);
    expect([0, 1, 2, 3].map((i) => dragShift(i, 3, 1, 60))).toEqual([0, 60, 60, 0]);
    expect(settleOffset(slots, 0, 2)).toBe(120);
    expect(settleOffset(slots, 3, 1)).toBe(-120);
    expect(settleOffset(slots, 1, 1)).toBe(0);
  });
});
