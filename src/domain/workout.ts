// Treino em andamento: um por vez, com início, fim e duração de verdade (spec 13). Tudo puro.

import type { SessionLog } from './types';

/** Depois de tantas horas sem concluir, o app pergunta se o treino ainda está valendo. */
export const STALE_AFTER_HOURS = 6;

/** Treino em andamento = começou (`startedAt`) e não foi concluído. */
export function isActiveWorkout(log: Pick<SessionLog, 'status' | 'startedAt'> | null | undefined): boolean {
  return !!log && log.status === 'in_progress' && log.startedAt !== null;
}

/**
 * Duração em segundos: do início até o fim; sem fim, até agora. Sem início não há duração (null).
 * Treino concluído não cresce mais.
 */
export function workoutDurationSec(log: Pick<SessionLog, 'startedAt' | 'endedAt'>, now: number = Date.now()): number | null {
  if (!log.startedAt) return null;
  const end = log.endedAt ? Date.parse(log.endedAt) : now;
  return Math.max(0, Math.round((end - Date.parse(log.startedAt)) / 1000));
}

/** Treino aberto há tempo demais (esquecido): vale perguntar se ainda está treinando. */
export function isStale(log: Pick<SessionLog, 'status' | 'startedAt'>, now: number = Date.now(), hours = STALE_AFTER_HOURS): boolean {
  return isActiveWorkout(log) && now - Date.parse(log.startedAt!) > hours * 3600 * 1000;
}

/** Texto curto da barra de treino em andamento ("34:12", "1:05:03"). */
export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const two = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${two(m)}:${two(sec)}` : `${m}:${two(sec)}`;
}
