// Timer de descanso: o que guardar e como restaurar depois que o app foi fechado (spec 14). Tudo puro.

export interface SavedTimer {
  /** instante (ms desde 1970) em que o descanso acaba */
  endAt: number;
  totalSec: number;
  label: string | null;
}

/** Segundos que faltam (arredonda para cima, como o relógio na tela); nunca negativo. */
export function remainingSeconds(endAt: number, now: number): number {
  return Math.max(0, Math.ceil((endAt - now) / 1000));
}

/**
 * Lê o timer gravado. Só vale se ainda não acabou: se o descanso terminou com o app fechado, a notificação já
 * avisou e não há o que mostrar. Valor mal formado (arquivo antigo, outra versão) vira null.
 */
export function restoreTimer(saved: unknown, now: number): SavedTimer | null {
  if (!saved || typeof saved !== 'object') return null;
  const s = saved as Partial<SavedTimer>;
  if (typeof s.endAt !== 'number' || !Number.isFinite(s.endAt) || s.endAt <= now) return null;
  const total = typeof s.totalSec === 'number' && s.totalSec > 0 ? s.totalSec : remainingSeconds(s.endAt, now);
  return { endAt: s.endAt, totalSec: total, label: typeof s.label === 'string' ? s.label : null };
}
