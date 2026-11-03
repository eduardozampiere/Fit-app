import { plannedLoadKg } from './loads';
import { plannedSetCount } from './plan';
import type { PrescribedItem, Range, SetLog } from './types';

export type SetDraft = Omit<SetLog, 'id' | 'sessionLogId' | 'doneAt'>;

/**
 * Séries "feitas conforme o plano": carga do início da faixa, reps do início da faixa,
 * sem RPE (RPE só existe se eu informar).
 */
export function asPlannedSets(item: PrescribedItem, load: Range | null, loggedIndexes: number[] = []): SetDraft[] {
  const count = plannedSetCount(item);
  const logged = new Set(loggedIndexes);
  const drafts: SetDraft[] = [];
  for (let i = 1; i <= count; i++) {
    if (logged.has(i)) continue;
    drafts.push(plannedSet(item, load, i));
  }
  return drafts;
}

/** Uma série específica "conforme o plano". */
export function plannedSet(item: PrescribedItem, load: Range | null, setIndex: number): SetDraft {
  return {
      itemId: item.id,
      exerciseId: item.exerciseId,
      setIndex,
      loadKg: plannedLoadKg(load),
      reps: item.reps?.min ?? null,
      durationSec: item.durationSec?.min ?? null,
      rpe: null,
      grip: null,
      belt: null,
      failed: false,
      asPlanned: true,
      note: null,
  };
}

/** Tonelagem: soma de carga × reps (séries falhadas não contam). */
export function tonnage(sets: Pick<SetLog, 'loadKg' | 'reps' | 'failed'>[]): number {
  return sets.reduce((acc, s) => (s.failed || !s.loadKg || !s.reps ? acc : acc + s.loadKg * s.reps), 0);
}
