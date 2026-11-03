import { describe, expect, it } from 'vitest';
import cycleJson from '../../../assets/plan/ciclo_out26_jan27.json';
import { addDays, diffDays, isoWeekday } from '../dates';
import { formatKg, formatNumber, formatDateShort, parseDecimal, formatSeconds } from '../format';
import { resolveLoad, roundTo } from '../loads';
import { asPlannedSets, tonnage } from '../logging';
import {
  allSessions,
  currentLoad,
  liftOf,
  nextSessionFrom,
  restSeconds,
  sessionForDate,
  sessionItems,
  weekForDate,
} from '../plan';
import { platesFor } from '../plates';
import { bestE1rm, e1rm, RPE_VALUES, RTS_TABLE, rtsPercent } from '../rpe';
import type { Cycle } from '../types';

const cycle = cycleJson as unknown as Cycle;

describe('tabela RTS', () => {
  it('tem 9 linhas de RPE com 10 reps cada', () => {
    expect(Object.keys(RTS_TABLE)).toHaveLength(9);
    for (const r of RPE_VALUES) expect(RTS_TABLE[String(r)]).toHaveLength(10);
  });

  it('bate com os exemplos do enunciado', () => {
    expect(rtsPercent(1, 10)).toBe(100);
    expect(rtsPercent(1, 9)).toBe(95.5);
    expect(rtsPercent(3, 8)).toBe(86.3);
    expect(rtsPercent(5, 8)).toBe(81.1);
    expect(rtsPercent(4, 7)).toBe(81.1);
  });

  it('é diagonal: +1 rep equivale a −1 RPE', () => {
    for (let reps = 1; reps < 10; reps++) {
      for (const rpe of RPE_VALUES) {
        if (rpe - 1 < 6) continue;
        expect(rtsPercent(reps + 1, rpe)).toBe(rtsPercent(reps, rpe - 1));
      }
    }
  });

  it('decresce com reps e com RPE menor', () => {
    for (const rpe of RPE_VALUES) {
      const row = RTS_TABLE[String(rpe)];
      for (let i = 1; i < row.length; i++) expect(row[i]).toBeLessThan(row[i - 1]);
    }
  });

  it('rejeita valores fora da tabela', () => {
    expect(rtsPercent(0, 8)).toBeNull();
    expect(rtsPercent(11, 8)).toBeNull();
    expect(rtsPercent(3, 5.5)).toBeNull();
    expect(rtsPercent(3, 8.25)).toBeNull();
  });

  it('calcula e1RM e escolhe a melhor série', () => {
    expect(e1rm(200, 1, 10)).toBe(200);
    expect(e1rm(170, 3, 8)).toBe(197); // 170 / 0,863
    expect(
      bestE1rm([
        { loadKg: 160, reps: 4, rpe: 7 },
        { loadKg: 170, reps: 3, rpe: 8 },
        { loadKg: 180, reps: 3, rpe: null },
        { loadKg: 190, reps: 1, rpe: 8, failed: true },
      ]),
    ).toBe(197.3); // 160 x4 @7 = 160 / 0,811
  });
});

describe('cargas', () => {
  it('arredonda para múltiplos de 5', () => {
    expect(roundTo(133.9)).toBe(135);
    expect(roundTo(132.4)).toBe(130);
    expect(roundTo(132.5)).toBe(135);
    expect(roundTo(101, 2.5)).toBe(100);
  });

  it('recalcula pelo % quando o máximo muda', () => {
    const item = { load: { min: 130, max: 130 }, pctOfMax: { min: 0.765, max: 0.765 }, pctBased: true };
    expect(resolveLoad(item, 'bench', { squat: 200, bench: 175, deadlift: 240 })).toEqual({ min: 135, max: 135 });
    expect(resolveLoad({ ...item, pctBased: false }, 'bench', { squat: 200, bench: 175, deadlift: 240 })).toEqual(item.load);
  });

  it('com os máximos do plano, o recálculo reproduz as cargas da planilha', () => {
    const mismatches: string[] = [];
    for (const w of cycle.weeks)
      for (const s of w.sessions)
        for (const it of s.items) {
          if (!it.pctBased) continue;
          const r = resolveLoad(it, liftOf(cycle, it), cycle.maxes);
          if (r?.min !== it.load?.min || r?.max !== it.load?.max) mismatches.push(`${it.id} ${it.name}`);
        }
    expect(mismatches).toEqual([]);
  });

  it('currentLoad preserva a carga se o máximo não mudou e recalcula se mudou', () => {
    const it = cycle.weeks[0].sessions[0].items[1]; // agacho 4x4 140 (70%)
    expect(currentLoad(cycle, it, cycle.maxes)).toEqual({ min: 140, max: 140 });
    expect(currentLoad(cycle, it, { ...cycle.maxes, squat: 210 })).toEqual({ min: 145, max: 145 });
  });
});

describe('anilhas', () => {
  it('calcula por lado', () => {
    expect(platesFor(140).perSide).toEqual([25, 25, 10]);
    // 102,5: 41,25 por lado → 25 + 15 e sobra 1,25 por lado (não há anilha de 1,25)
    expect(platesFor(102.5).perSide).toEqual([25, 15]);
    expect(platesFor(102.5).remainderKg).toBe(2.5);
    expect(platesFor(20).perSide).toEqual([]);
    expect(platesFor(225).perSide).toEqual([25, 25, 25, 25, 2.5]);
  });

  it('respeita quantidade de pares disponível', () => {
    const r = platesFor(140, 20, [25, 20, 10], { 25: 1 });
    expect(r.perSide[0]).toBe(25);
    expect(r.perSide.filter((p) => p === 25)).toHaveLength(1);
    expect(r.achievedKg + r.remainderKg).toBe(140);
  });
});

describe('datas e plano', () => {
  it('helpers de data', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(diffDays('2027-01-04', '2026-12-28')).toBe(7);
    expect(isoWeekday('2026-10-26')).toBe(1);
    expect(isoWeekday('2026-11-01')).toBe(7);
  });

  it('acha a sessão do dia', () => {
    const ref = sessionForDate(cycle, '2026-11-03')!;
    expect(ref.week.number).toBe(2);
    expect(ref.session.weekday).toBe(2);
    expect(sessionForDate(cycle, '2026-11-07')).toBeNull(); // sábado
    expect(weekForDate(cycle, '2026-11-08')?.number).toBe(2);
    expect(nextSessionFrom(cycle, '2026-11-07')?.date).toBe('2026-11-09');
    expect(allSessions(cycle)).toHaveLength(13 * 5 + 3);
  });

  it('inclui core/mobilidade só nos dias previstos', () => {
    const w = cycle.weeks[0];
    const seg = sessionItems(w, w.sessions[0]);
    const ter = sessionItems(w, w.sessions[1]);
    expect(seg.some((i) => i.kind === 'core')).toBe(true);
    expect(ter.some((i) => i.kind === 'core')).toBe(false);
  });

  it('tempo de descanso vem do plano ou do tipo', () => {
    expect(restSeconds({ restSec: { min: 180, max: 240 }, kind: 'variation' })).toBe(240);
    expect(restSeconds({ restSec: null, kind: 'main' })).toBe(300);
    expect(restSeconds({ restSec: null, kind: 'accessory' })).toBe(90);
  });
});

describe('registro', () => {
  it('"feito conforme o plano" gera as séries do plano sem RPE', () => {
    const it = cycle.weeks[1].sessions[0].items[1]; // S2 agacho 5x4 145
    const sets = asPlannedSets(it, it.load);
    expect(sets).toHaveLength(5);
    expect(sets[0]).toMatchObject({ setIndex: 1, loadKg: 145, reps: 4, rpe: null, asPlanned: true });
    expect(asPlannedSets(it, it.load, [1, 3]).map((s) => s.setIndex)).toEqual([2, 4, 5]);
  });

  it('faixa de séries usa o início (2-3x → 2)', () => {
    const acc = cycle.weeks[10].sessions[0].items.find((i) => i.setsText.startsWith('2-3x'))!;
    expect(asPlannedSets(acc, null)).toHaveLength(2);
  });

  it('tonelagem ignora falhas e séries sem carga', () => {
    expect(
      tonnage([
        { loadKg: 140, reps: 4, failed: false },
        { loadKg: 140, reps: 4, failed: true },
        { loadKg: null, reps: 10, failed: false },
      ]),
    ).toBe(560);
  });
});

describe('formatação pt-BR', () => {
  it('números, kg e datas', () => {
    expect(formatNumber(1234.5)).toBe('1.234,5');
    expect(formatNumber(140)).toBe('140');
    expect(formatKg(132.5)).toBe('132,5 kg');
    expect(formatDateShort('2026-11-03')).toBe('03/11');
    expect(parseDecimal('132,5')).toBe(132.5);
    expect(parseDecimal('1.234,5')).toBe(1234.5);
    expect(parseDecimal('')).toBeNull();
    expect(formatSeconds(305)).toBe('5:05');
  });
});
