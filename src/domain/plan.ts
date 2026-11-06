import { addDays, diffDays } from './dates';
import { resolveLoad } from './loads';
import type { Cycle, Exercise, ItemKind, Lift, Maxes, PlanSession, PlanWeek, PrescribedItem, Range } from './types';

export function sessionDate(week: PlanWeek, session: PlanSession): string {
  return addDays(week.start, session.weekday - 1);
}

export function weekForDate(cycle: Cycle, date: string): PlanWeek | null {
  return cycle.weeks.find((w) => {
    const d = diffDays(date, w.start);
    return d >= 0 && d < 7;
  }) ?? null;
}

export interface SessionRef {
  week: PlanWeek;
  session: PlanSession;
  date: string; // data planejada
}

export function allSessions(cycle: Cycle): SessionRef[] {
  return cycle.weeks.flatMap((week) =>
    week.sessions.map((session) => ({ week, session, date: sessionDate(week, session) })),
  );
}

/** Sessão planejada para a data, ou null (fim de semana / dia sem treino / fora do ciclo). */
export function sessionForDate(cycle: Cycle, date: string): SessionRef | null {
  return allSessions(cycle).find((r) => r.date === date) ?? null;
}

/** Próxima sessão planejada a partir da data (inclusive). */
export function nextSessionFrom(cycle: Cycle, date: string): SessionRef | null {
  return allSessions(cycle).find((r) => diffDays(r.date, date) >= 0) ?? null;
}

export function findSession(cycle: Cycle, sessionId: string): SessionRef | null {
  return allSessions(cycle).find((r) => r.session.id === sessionId) ?? null;
}

export function exerciseMap(cycle: Cycle): Map<string, Exercise> {
  return new Map(cycle.exercises.map((e) => [e.id, e]));
}

export function liftOf(cycle: Cycle, item: PrescribedItem): Lift | null {
  return cycle.exercises.find((e) => e.id === item.exerciseId)?.lift ?? null;
}

/**
 * Carga a usar hoje: recalculada pelos máximos atuais só quando o máximo daquele
 * movimento mudou em relação ao do plano (assim a carga da planilha é preservada).
 */
export function currentLoad(cycle: Cycle, item: PrescribedItem, maxes: Maxes): Range | null {
  const lift = liftOf(cycle, item);
  if (!lift || maxes[lift] === cycle.maxes[lift]) return item.load;
  return resolveLoad(item, lift, maxes, cycle.ruleParams?.loadRounding ?? 5);
}

/** Itens da sessão + core/mobilidade quando o dia prevê. */
export function sessionItems(week: PlanWeek, session: PlanSession): PrescribedItem[] {
  const core = week.core && week.core.weekdays.includes(session.weekday) ? week.core.items : [];
  return [...session.items, ...core];
}

const DEFAULT_REST_BY_KIND: Record<ItemKind, number> = {
  main: 300,
  activation_single: 300,
  walkout: 210,
  variation: 270,
  backoff: 180,
  volume_doubles: 210,
  accessory: 90,
  core: 45,
};

/**
 * Tempo do cronômetro de descanso: o ajuste do usuário para o exercício, senão o topo da faixa do
 * plano, senão o padrão pelo tipo.
 */
export function restSeconds(item: Pick<PrescribedItem, 'restSec' | 'kind'>, override?: number | null): number {
  return override ?? item.restSec?.max ?? DEFAULT_REST_BY_KIND[item.kind];
}

/** Limites e atalhos do editor de descanso (segundos). */
export const REST_STEP_SEC = 15;
export const REST_MIN_SEC = 15;
export const REST_MAX_SEC = 15 * 60;
export const REST_PRESETS_SEC: readonly number[] = [60, 90, 120, 180, 240, 300];

/** Ajustes de descanso por exercício (`settings['rest-overrides']`): valor válido ou nada. */
export function restOverride(overrides: Record<string, number>, exerciseId: string): number | null {
  const v = overrides[exerciseId];
  return typeof v === 'number' && v >= REST_MIN_SEC && v <= REST_MAX_SEC ? v : null;
}

/** Novo mapa com o ajuste de um exercício; `null` volta ao plano. */
export function withRestOverride(overrides: Record<string, number>, exerciseId: string, sec: number | null): Record<string, number> {
  const { [exerciseId]: _old, ...rest } = overrides;
  return sec === null ? rest : { ...rest, [exerciseId]: Math.min(REST_MAX_SEC, Math.max(REST_MIN_SEC, Math.round(sec))) };
}

/** Séries a registrar como "conforme o plano" (início da faixa: 2-3x → 2). */
export function plannedSetCount(item: Pick<PrescribedItem, 'sets'>): number {
  return item.sets?.min ?? 1;
}

/** Número máximo de séries a exibir (topo da faixa). */
export function maxSetCount(item: Pick<PrescribedItem, 'sets'>): number {
  return item.sets?.max ?? 1;
}

/** Tipos de item em que o app pede o RPE depois da série (coluna RPE na tabela). */
export const RPE_KINDS: ReadonlySet<ItemKind> = new Set(['main', 'activation_single', 'variation', 'backoff', 'volume_doubles']);

export const KIND_LABEL: Record<ItemKind, string> = {
  main: 'Principal',
  variation: 'Variação',
  activation_single: 'Single de ativação',
  walkout: 'Walkout',
  backoff: 'Back-off',
  volume_doubles: 'Duplas de volume',
  accessory: 'Acessório',
  core: 'Core / mobilidade',
};

/** Os três movimentos, na ordem fixa usada em telas e gráficos (a cor segue o movimento). */
export const LIFTS: readonly Lift[] = ['squat', 'bench', 'deadlift'];

export const LIFT_LABEL: Record<Lift, string> = { squat: 'Agacho', bench: 'Supino', deadlift: 'Terra' };
