export const DEFAULT_BAR_KG = 20;
export const DEFAULT_PLATES_KG = [25, 20, 15, 10, 5, 2.5];
/** Barras comuns: olímpica (20), técnica/feminina (15) e de treino (10). */
export const DEFAULT_BARS_KG = [20, 15, 10];
/** Opções oferecidas nos Ajustes. */
export const ALL_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];
export const ALL_BARS_KG = [25, 20, 15, 12, 10, 7, 5];

/** Barras oferecidas na calculadora: as da academia e a padrão, sem repetir, da mais pesada para a mais leve. */
export function barChoices(bars: number[] | undefined, defaultBar: number): number[] {
  return [...new Set([...(bars ?? DEFAULT_BARS_KG), defaultBar])].filter((b) => b > 0).sort((a, b) => b - a);
}

export interface PlateResult {
  perSide: number[]; // anilhas de cada lado, da maior para a menor
  achievedKg: number;
  remainderKg: number; // quanto faltou (0 se exato)
}

/**
 * Calcula as anilhas por lado (guloso, das maiores para as menores).
 * `available` pode ter quantidades limitadas por par: { 25: 4 } = 4 pares de 25.
 */
export function platesFor(
  targetKg: number,
  barKg = DEFAULT_BAR_KG,
  plates: number[] = DEFAULT_PLATES_KG,
  pairsAvailable?: Record<number, number>,
): PlateResult {
  const perSide: number[] = [];
  let remaining = Math.round(((targetKg - barKg) / 2) * 1000) / 1000;
  if (remaining <= 0) return { perSide, achievedKg: Math.max(barKg, 0), remainderKg: Math.max(0, targetKg - barKg) };
  const sorted = [...plates].sort((a, b) => b - a);
  for (const p of sorted) {
    let count = 0;
    const limit = pairsAvailable?.[p] ?? Infinity;
    while (remaining + 1e-9 >= p && count < limit) {
      perSide.push(p);
      remaining = Math.round((remaining - p) * 1000) / 1000;
      count++;
    }
  }
  const achieved = barKg + 2 * perSide.reduce((a, b) => a + b, 0);
  return { perSide, achievedKg: achieved, remainderKg: Math.round((targetKg - achieved) * 1000) / 1000 };
}
