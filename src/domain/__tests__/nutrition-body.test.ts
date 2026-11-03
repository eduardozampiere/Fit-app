import { describe, expect, it } from 'vitest';
import { movingAverage7, movingAverageSeries, nextMeasurementDate, weeklyTrend, type WeightEntry } from '../body';
import {
  DEFAULT_FAVORITES,
  DEFAULT_FOODS,
  DEFAULT_TARGETS,
  favoriteEntries,
  kcalTarget,
  macrosFor,
  oilMacros,
  slugify,
  sumMacros,
} from '../nutrition';

const food = (id: string) => DEFAULT_FOODS.find((f) => f.id === id)!;

describe('alimentação', () => {
  it('banco inicial tem os 13 alimentos do enunciado', () => {
    expect(DEFAULT_FOODS).toHaveLength(13);
    for (const f of DEFAULT_FOODS) {
      // energia coerente com os macros (4/4/9 kcal), tolerância de 15%
      const est = f.protein * 4 + f.carbs * 4 + f.fat * 9;
      expect(Math.abs(est - f.kcal) / f.kcal).toBeLessThan(0.15);
    }
  });

  it('macros por grama', () => {
    expect(macrosFor(food('arroz-branco-cozido'), 400)).toEqual({ kcal: 512, protein: 10, carbs: 112.4, fat: 0.8 });
    expect(macrosFor(food('frango-peito-grelhado'), 200)).toEqual({ kcal: 318, protein: 64, carbs: 0, fat: 5 });
  });

  it('óleo de preparo: 1 colher ≈ 90 kcal, tudo gordura', () => {
    expect(oilMacros(1, 90)).toEqual({ kcal: 90, protein: 0, carbs: 0, fat: 10 });
    expect(oilMacros(0.5, 90).kcal).toBe(45);
  });

  it('almoço padrão = 400 g de arroz + 200 g de frango + óleo', () => {
    const entries = favoriteEntries(DEFAULT_FAVORITES[0], DEFAULT_FOODS, 'almoco', '2026-11-03', 90);
    expect(entries).toHaveLength(3);
    expect(sumMacros(entries)).toEqual({ kcal: 920, protein: 74, carbs: 112.4, fat: 15.8 });
  });

  it('alvo de kcal depende do tipo de dia', () => {
    expect(kcalTarget(DEFAULT_TARGETS, true)).toBe(2600);
    expect(kcalTarget(DEFAULT_TARGETS, false)).toBe(2200);
  });

  it('slug sem acentos', () => {
    expect(slugify('Pão de Queijo')).toBe('pao-de-queijo');
  });
});

describe('peso', () => {
  const w = (date: string, kg: number): WeightEntry => ({ date, kg, note: null });
  const entries = [
    w('2026-11-01', 108.0),
    w('2026-11-02', 108.4),
    w('2026-11-03', 107.8),
    w('2026-11-05', 108.2),
    w('2026-11-08', 107.6),
    w('2026-11-09', 107.4),
    w('2026-11-10', 107.5),
  ];

  it('média móvel de 7 dias usa só as pesagens da janela', () => {
    expect(movingAverage7(entries, '2026-11-03')).toBe(108.07);
    // janela 04/11–10/11: 108,2; 107,6; 107,4; 107,5
    expect(movingAverage7(entries, '2026-11-10')).toBe(107.68);
    expect(movingAverage7([], '2026-11-10')).toBeNull();
  });

  it('tendência semanal compara com a média de 7 dias antes', () => {
    // média em 03/11 = 108,07 → 107,68 − 108,07
    expect(weeklyTrend(entries, '2026-11-10')).toBe(-0.39);
    expect(weeklyTrend(entries, '2026-11-02')).toBeNull();
  });

  it('série ordenada com média', () => {
    const s = movingAverageSeries([...entries].reverse());
    expect(s[0].date).toBe('2026-11-01');
    expect(s[0].avg7).toBe(108);
  });
});

describe('medidas', () => {
  it('próxima medida em 14 dias', () => {
    expect(
      nextMeasurementDate([
        { date: '2026-11-01', armCm: 42, thighCm: 70, waistCm: 98 },
        { date: '2026-10-18', armCm: 42, thighCm: 70, waistCm: 99 },
      ]),
    ).toBe('2026-11-15');
    expect(nextMeasurementDate([])).toBeNull();
  });
});
