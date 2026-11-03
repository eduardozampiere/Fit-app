export const DEFAULT_BAR_KG = 20;
export const DEFAULT_PLATES_KG = [25, 20, 15, 10, 5, 2.5];

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
