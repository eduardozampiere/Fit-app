// Tabela de RPE de Mike Tuchscherer (RTS): % do 1RM por repetições (1–10) e RPE (6–10, de meio em meio).

export const RPE_VALUES = [10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6] as const;

/** RTS_TABLE[rpe][reps - 1] = % do 1RM */
export const RTS_TABLE: Readonly<Record<string, readonly number[]>> = {
  '10': [100.0, 95.5, 92.2, 89.2, 86.3, 83.7, 81.1, 78.6, 76.2, 73.9],
  '9.5': [97.8, 93.9, 90.7, 87.8, 85.0, 82.4, 79.9, 77.4, 75.1, 72.3],
  '9': [95.5, 92.2, 89.2, 86.3, 83.7, 81.1, 78.6, 76.2, 73.9, 70.7],
  '8.5': [93.9, 90.7, 87.8, 85.0, 82.4, 79.9, 77.4, 75.1, 72.3, 69.4],
  '8': [92.2, 89.2, 86.3, 83.7, 81.1, 78.6, 76.2, 73.9, 70.7, 68.0],
  '7.5': [90.7, 87.8, 85.0, 82.4, 79.9, 77.4, 75.1, 72.3, 69.4, 66.7],
  '7': [89.2, 86.3, 83.7, 81.1, 78.6, 76.2, 73.9, 70.7, 68.0, 65.3],
  '6.5': [87.8, 85.0, 82.4, 79.9, 77.4, 75.1, 72.3, 69.4, 66.7, 64.0],
  '6': [86.3, 83.7, 81.1, 78.6, 76.2, 73.9, 70.7, 68.0, 65.3, 62.6],
};

/** % do 1RM (0–100) para reps @ RPE, ou null fora da tabela. */
export function rtsPercent(reps: number, rpe: number): number | null {
  if (!Number.isInteger(reps) || reps < 1 || reps > 10) return null;
  if (rpe < 6 || rpe > 10 || Math.round(rpe * 2) !== rpe * 2) return null;
  const row = RTS_TABLE[String(rpe)];
  return row ? row[reps - 1] : null;
}

/** Máximo estimado (e1RM) pela tabela RTS. */
export function e1rm(loadKg: number, reps: number, rpe: number): number | null {
  const pct = rtsPercent(reps, rpe);
  if (pct === null || loadKg <= 0) return null;
  return Math.round((loadKg / (pct / 100)) * 10) / 10;
}

/** RPE considerado quando a série não tem RPE informado (esforço máximo, o mais conservador). */
export const ASSUMED_RPE = 10;

/** 1RM estimado pela fórmula de Epley (vale para qualquer série; não usa RPE). */
export function epley1rm(loadKg: number, reps: number): number {
  return Math.round(reps === 1 ? loadKg : loadKg * (1 + reps / 30));
}

/**
 * e1RM pela tabela RTS; sem RPE, calcula como RPE 10 (nunca grava esse RPE). `null` fora da tabela
 * (repetições fora de 1–10, RPE inválido ou carga ≤ 0).
 */
export function e1rmWithAssumedRpe(
  loadKg: number,
  reps: number,
  rpe: number | null,
): { kg: number; rpe: number; assumed: boolean } | null {
  const used = rpe ?? ASSUMED_RPE;
  const kg = e1rm(loadKg, reps, used);
  return kg === null ? null : { kg, rpe: used, assumed: rpe === null };
}

/** Melhor e1RM de uma lista de séries (ignora séries sem RPE ou falhadas). */
export function bestE1rm(
  sets: { loadKg: number | null; reps: number | null; rpe: number | null; failed?: boolean }[],
): number | null {
  let best: number | null = null;
  for (const s of sets) {
    if (s.failed || s.loadKg === null || s.reps === null || s.rpe === null) continue;
    const v = e1rm(s.loadKg, s.reps, s.rpe);
    if (v !== null && (best === null || v > best)) best = v;
  }
  return best;
}

export const RPE_CHOICES = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];
