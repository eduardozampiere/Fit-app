import type { Lift, Maxes, PrescribedItem, Range } from './types';

/** Arredonda para o múltiplo mais próximo de `step` (padrão 5 kg). */
export function roundTo(value: number, step = 5): number {
  if (step <= 0) return value;
  return Math.round(value / step) * step;
}

/**
 * Carga prescrita considerando os máximos atuais. Itens com `pctBased` são recalculados
 * (% × máximo, arredondado); os demais mantêm a carga do plano.
 */
export function resolveLoad(
  item: Pick<PrescribedItem, 'load' | 'pctOfMax' | 'pctBased'>,
  lift: Lift | null,
  maxes: Maxes,
  step = 5,
): Range | null {
  if (!item.pctBased || !item.pctOfMax || !lift) return item.load;
  const max = maxes[lift];
  return {
    min: roundTo(item.pctOfMax.min * max, step),
    max: roundTo(item.pctOfMax.max * max, step),
  };
}

/** Carga sugerida para registrar "conforme o plano": o início da faixa. */
export function plannedLoadKg(range: Range | null): number | null {
  return range ? range.min : null;
}
