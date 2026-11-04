import { parseDecimalInput } from './format';
import { plannedLoadKg } from './loads';
import { maxSetCount, plannedSetCount } from './plan';
import type { PrescribedItem, Range, SetLog } from './types';

export type SetDraft = Omit<SetLog, 'id' | 'sessionLogId' | 'doneAt'>;

/**
 * Séries "feitas conforme o plano": carga do início da faixa, reps do início da faixa,
 * sem RPE (RPE só existe se eu informar). `count` troca o número de séries do plano quando o
 * treino do dia teve séries adicionadas ou removidas.
 */
export function asPlannedSets(
  item: PrescribedItem,
  load: Range | null,
  loggedIndexes: number[] = [],
  count = plannedSetCount(item),
): SetDraft[] {
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

// ---- Tabela de séries do dia ----

/**
 * Séries que o dia pede: o número ajustado no treino (séries adicionadas ou removidas) ou o do plano.
 * É o que "conforme o plano" completa.
 */
export function plannedCountFor(item: Pick<PrescribedItem, 'sets'>, override?: number): number {
  return override ?? plannedSetCount(item);
}

/**
 * Linhas da tabela: o número ajustado no treino ou o topo da faixa do plano (as séries acima do
 * início da faixa aparecem como opcionais). Nunca esconde uma série já registrada.
 */
export function setRowCount(item: Pick<PrescribedItem, 'sets'>, override: number | undefined, loggedIndexes: number[]): number {
  const base = override ?? maxSetCount(item);
  return Math.max(base, 0, ...loggedIndexes);
}

/**
 * Remover a série `removed` da tabela: as séries registradas depois dela sobem uma posição
 * (a 4ª vira 3ª), como no Hevy. Devolve só as que mudam de número.
 */
export function renumberAfterRemoval(
  logs: Pick<SetLog, 'id' | 'setIndex'>[],
  removed: number,
): { id: string; setIndex: number }[] {
  return logs
    .filter((l) => l.setIndex > removed)
    .sort((a, b) => a.setIndex - b.setIndex)
    .map((l) => ({ id: l.id, setIndex: l.setIndex - 1 }));
}

/**
 * Série registrada a partir dos valores digitados na tabela. Célula vazia usa o valor do plano;
 * se nada foi digitado, a série continua "conforme o plano".
 */
export function draftFromInput(planned: SetDraft, input: { load: string; work: string }): SetDraft {
  const load = parseDecimalInput(input.load);
  const work = parseDecimalInput(input.work);
  if (load === null && work === null) return planned;
  const isDuration = planned.durationSec !== null && planned.reps === null;
  return {
    ...planned,
    loadKg: load ?? planned.loadKg,
    reps: isDuration ? planned.reps : work !== null ? Math.round(work) : planned.reps,
    durationSec: isDuration ? (work !== null ? Math.round(work) : planned.durationSec) : planned.durationSec,
    asPlanned: false,
  };
}

export interface SessionStats {
  sets: number;
  volumeKg: number;
  /** Primeira série registrada (ISO), para o tempo de treino. */
  startedAt: string | null;
}

/** Resumo do topo da tela de treino: séries feitas, volume (tonelagem) e início. */
export function sessionStats(logs: Pick<SetLog, 'loadKg' | 'reps' | 'failed' | 'doneAt'>[]): SessionStats {
  const startedAt = logs.reduce<string | null>((min, l) => (min === null || l.doneAt < min ? l.doneAt : min), null);
  return { sets: logs.length, volumeKg: tonnage(logs), startedAt };
}
