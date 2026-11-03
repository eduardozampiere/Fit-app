// Motor de regras do plano: funções puras que geram alertas e sugestões.
// Nunca alteram o plano sozinhas — a aplicação de uma sugestão é explícita (applySuggestion).

import { addDays, diffDays } from './dates';
import { formatNumber } from './format';
import { roundTo } from './loads';
import { LIFT_LABEL, liftOf } from './plan';
import type { Cycle, Lift, OpenRange, PlanSession, PlanWeek, PrescribedItem, SessionLog, SetLog } from './types';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface CheckIn {
  date: string; // YYYY-MM-DD
  lowBack: number | null; // 0–10, 0 = sem dor
  knee: number | null;
  wrist: number | null;
  foot: number | null;
  sleepH: number | null;
  redFlags: RedFlags;
  note: string | null;
}

export interface RedFlags {
  saddleNumbness: boolean; // dormência em sela
  bladderBowel: boolean; // alteração urinária ou intestinal
  legWeakness: boolean; // fraqueza nas pernas
}

export const NO_RED_FLAGS: RedFlags = { saddleNumbness: false, bladderBowel: false, legWeakness: false };

export type RuleId =
  | 'brake'
  | 'gate'
  | 'activation_fatigue'
  | 'deload'
  | 'max_review'
  | 'pain_24h'
  | 'red_flags';

export type Suggestion =
  | { type: 'set_load'; week: number; lift: Lift; loadKg: number }
  | { type: 'skip_activation'; weeks: number[]; lift: Lift }
  | { type: 'deload'; week: number; volumeCut: number }
  | { type: 'increase_max'; lift: Lift; incrementKg: number; weeks: { from: number; to: number } };

export interface Alert {
  key: string; // estável: guarda a decisão (aceito/ignorado) entre recálculos
  rule: RuleId;
  week: number;
  severity: 'info' | 'warn' | 'danger';
  title: string;
  message: string;
  suggestion?: Suggestion;
}

export interface LoggedSession {
  log: SessionLog;
  sets: SetLog[];
}

const LIFTS: Lift[] = ['squat', 'bench', 'deadlift'];

// ---------------------------------------------------------------------------
// Auxiliares
// ---------------------------------------------------------------------------

function weekOf(cycle: Cycle, n: number): PlanWeek | undefined {
  return cycle.weeks.find((w) => w.number === n);
}

function sessionOf(cycle: Cycle, sessionId: string): { week: PlanWeek; session: PlanSession } | null {
  for (const week of cycle.weeks) {
    const session = week.sessions.find((s) => s.id === sessionId);
    if (session) return { week, session };
  }
  return null;
}

/** Alvo de RPE do item (ou da semana). Para "≤7,5" o alvo é 7,5. */
export function targetRpe(item: PrescribedItem, week: PlanWeek): OpenRange | null {
  return item.rpe ?? week.targetRpe;
}

function targetMax(item: PrescribedItem, week: PlanWeek): number | null {
  return targetRpe(item, week)?.max ?? null;
}

function targetMid(item: PrescribedItem, week: PlanWeek): number | null {
  const t = targetRpe(item, week);
  if (!t) return null;
  return t.min === null ? t.max : (t.min + t.max) / 2;
}

/** RPE da última série (maior índice) que tem RPE informado. */
export function lastSetRpe(sets: SetLog[]): number | null {
  const withRpe = sets.filter((s) => s.rpe !== null).sort((a, b) => b.setIndex - a.setIndex);
  return withRpe[0]?.rpe ?? null;
}

/** Série mais pesada com RPE (top set). */
function topSet(sets: SetLog[]): SetLog | null {
  const withRpe = sets.filter((s) => s.rpe !== null && s.loadKg !== null && !s.failed);
  if (!withRpe.length) return null;
  return withRpe.reduce((a, b) => ((b.loadKg ?? 0) > (a.loadKg ?? 0) ? b : a));
}

function mainItems(cycle: Cycle, session: PlanSession, lift: Lift): PrescribedItem[] {
  return session.items.filter((i) => i.kind === 'main' && liftOf(cycle, i) === lift);
}

function setsOf(ls: LoggedSession, item: PrescribedItem): SetLog[] {
  return ls.sets.filter((s) => s.itemId === item.id);
}

function nextWeekMainLoad(cycle: Cycle, week: number, lift: Lift): number | null {
  const w = weekOf(cycle, week);
  if (!w) return null;
  for (const s of w.sessions) for (const it of mainItems(cycle, s, lift)) if (it.load) return it.load.min;
  return null;
}

/** Todas as execuções de principal de um movimento: (semana, item, séries). */
function mainExecutions(cycle: Cycle, logged: LoggedSession[], lift: Lift) {
  const out: { week: PlanWeek; item: PrescribedItem; sets: SetLog[]; log: SessionLog }[] = [];
  for (const ls of logged) {
    const ref = sessionOf(cycle, ls.log.sessionId);
    if (!ref) continue;
    for (const item of mainItems(cycle, ref.session, lift)) {
      const sets = setsOf(ls, item);
      if (sets.length) out.push({ week: ref.week, item, sets, log: ls.log });
    }
  }
  return out;
}

const fmt = (n: number) => formatNumber(n);

// ---------------------------------------------------------------------------
// Regras 1 e 2 — Freio e portões
// ---------------------------------------------------------------------------

export function brakeAndGateAlerts(cycle: Cycle, logged: LoggedSession[]): Alert[] {
  const p = cycle.ruleParams;
  const alerts: Alert[] = [];
  for (const lift of LIFTS) {
    for (const ex of mainExecutions(cycle, logged, lift)) {
      const rpe = lastSetRpe(ex.sets);
      const tMax = targetMax(ex.item, ex.week);
      if (rpe === null || tMax === null) continue;
      const w = ex.week.number;
      const isGateWeek = w === p.gates.gateWeek;
      const inGates = w >= p.gates.weeks.from && w <= p.gates.weeks.to;

      // Semana-portão: regra explícita por movimento.
      const gate = p.gates.lifts[lift];
      if (isGateWeek && gate.gateLoad !== null && gate.nextLoad !== null) {
        if (rpe <= gate.maxRpe) {
          alerts.push({
            key: `gate:${w}:${lift}`,
            rule: 'gate',
            week: w,
            severity: 'info',
            title: `Portão liberado: ${LIFT_LABEL[lift]} ${fmt(gate.nextLoad)}`,
            message: `${LIFT_LABEL[lift]} ${fmt(gate.gateLoad)} saiu em RPE ${fmt(rpe)} (≤ ${fmt(gate.maxRpe)}). O ${fmt(gate.nextLoad)} da semana ${w + 1} está liberado.`,
          });
        } else if (gate.fallbackLoad !== null) {
          alerts.push({
            key: `gate:${w}:${lift}`,
            rule: 'gate',
            week: w,
            severity: 'warn',
            title: `Portão fechado: ${LIFT_LABEL[lift]} vai para ${fmt(gate.fallbackLoad)}`,
            message: `${LIFT_LABEL[lift]} ${fmt(gate.gateLoad)} saiu em RPE ${fmt(rpe)}. Sugestão: ${fmt(gate.fallbackLoad)} na semana ${w + 1} em vez de ${fmt(gate.nextLoad)}.`,
            suggestion: { type: 'set_load', week: w + 1, lift, loadKg: gate.fallbackLoad },
          });
        }
        continue;
      }

      // Freio (todas as semanas) / portão (S9–S13): RPE ≥ alvo + 1 → repetir a carga.
      if (rpe >= tMax + p.brake.rpeOverTarget) {
        const load = ex.item.load?.min ?? topSet(ex.sets)?.loadKg ?? null;
        const nextLoad = nextWeekMainLoad(cycle, w + 1, lift);
        if (load === null || nextLoad === null || nextLoad <= load) continue;
        alerts.push({
          key: `brake:${w}:${lift}`,
          rule: 'brake',
          week: w,
          severity: 'warn',
          title: `${inGates ? 'Portão' : 'Freio'}: repetir ${LIFT_LABEL[lift].toLowerCase()} ${fmt(load)}`,
          message: `Última série do ${LIFT_LABEL[lift].toLowerCase()} em RPE ${fmt(rpe)} (alvo ${fmt(tMax)}). Sugestão: repetir ${fmt(load)} kg na semana ${w + 1} em vez de ${fmt(nextLoad)} kg.`,
          suggestion: { type: 'set_load', week: w + 1, lift, loadKg: load },
        });
      }
    }
  }
  return dedupe(alerts);
}

// ---------------------------------------------------------------------------
// Regra 3 — Single de ativação
// ---------------------------------------------------------------------------

export function activationAlerts(cycle: Cycle, logged: LoggedSession[]): Alert[] {
  const p = cycle.ruleParams.activationSingle;
  const alerts: Alert[] = [];
  for (const ls of logged) {
    const ref = sessionOf(cycle, ls.log.sessionId);
    if (!ref) continue;
    for (const item of ref.session.items) {
      if (item.kind !== 'activation_single') continue;
      const lift = liftOf(cycle, item);
      const rpe = lastSetRpe(setsOf(ls, item));
      if (!lift || rpe === null || rpe < p.fatigueRpe) continue;
      const w = ref.week.number;
      const inSkipWindow = p.suggestSkipWeeks.includes(w);
      const laterWeeks = cycle.weeks
        .filter((wk) => wk.number > w)
        .filter((wk) => wk.sessions.some((s) => s.items.some((i) => i.kind === 'activation_single' && liftOf(cycle, i) === lift)))
        .map((wk) => wk.number);
      alerts.push({
        key: `activation:${w}:${lift}`,
        rule: 'activation_fatigue',
        week: w,
        severity: 'warn',
        title: `Sinal de cansaço no single de ${LIFT_LABEL[lift].toLowerCase()}`,
        message:
          `Single de ativação em RPE ${fmt(rpe)} (≥ ${fmt(p.fatigueRpe)}). Faça o volume normal e anote.` +
          (inSkipWindow && laterWeeks.length ? ` Sugestão: pular o single nas semanas ${laterWeeks.join(', ')}.` : ''),
        suggestion: inSkipWindow && laterWeeks.length ? { type: 'skip_activation', weeks: laterWeeks, lift } : undefined,
      });
    }
  }
  return dedupe(alerts);
}

// ---------------------------------------------------------------------------
// Regra 6 — Deload sob demanda
// ---------------------------------------------------------------------------

export interface RedSignals {
  pain: boolean;
  shortSleep: boolean;
  highRpe: boolean;
  count: number;
}

export function weekRedSignals(cycle: Cycle, weekNo: number, logged: LoggedSession[], checkins: CheckIn[]): RedSignals {
  const p = cycle.ruleParams.deloadOnDemand;
  const week = weekOf(cycle, weekNo);
  if (!week) return { pain: false, shortSleep: false, highRpe: false, count: 0 };
  const inWeek = (d: string) => {
    const diff = diffDays(d, week.start);
    return diff >= 0 && diff < 7;
  };
  const weekCheckins = checkins.filter((c) => inWeek(c.date));
  const pain = weekCheckins.some((c) => (c.lowBack ?? 0) >= p.painThreshold || (c.knee ?? 0) >= p.painThreshold);
  const shortSleep = weekCheckins.filter((c) => c.sleepH !== null && c.sleepH < p.shortSleepHours).length >= p.shortSleepNights;
  let highRpeSessions = 0;
  for (const ls of logged) {
    const ref = sessionOf(cycle, ls.log.sessionId);
    if (!ref || ref.week.number !== weekNo) continue;
    const over = ref.session.items
      .filter((i) => i.kind === 'main')
      .some((i) => {
        const rpe = lastSetRpe(setsOf(ls, i));
        const t = targetMax(i, ref.week);
        return rpe !== null && t !== null && rpe >= t + p.rpeOverTarget;
      });
    if (over) highRpeSessions++;
  }
  const highRpe = highRpeSessions >= p.rpeOverSessions;
  return { pain, shortSleep, highRpe, count: [pain, shortSleep, highRpe].filter(Boolean).length };
}

export function deloadAlerts(cycle: Cycle, logged: LoggedSession[], checkins: CheckIn[]): Alert[] {
  const p = cycle.ruleParams.deloadOnDemand;
  const alerts: Alert[] = [];
  for (const week of cycle.weeks) {
    const s = weekRedSignals(cycle, week.number, logged, checkins);
    if (s.count < p.redSignals || !weekOf(cycle, week.number + 1)) continue;
    const reasons = [
      s.pain && `lombar ou joelho ≥ ${p.painThreshold}/10`,
      s.shortSleep && `${p.shortSleepNights}+ noites com menos de ${p.shortSleepHours} h de sono`,
      s.highRpe && `RPE ≥ alvo + ${p.rpeOverTarget} em ${p.rpeOverSessions}+ treinos`,
    ].filter(Boolean);
    alerts.push({
      key: `deload:${week.number}`,
      rule: 'deload',
      week: week.number,
      severity: 'warn',
      title: `Deload sob demanda na semana ${week.number + 1}`,
      message: `${s.count} sinais vermelhos na semana ${week.number}: ${reasons.join('; ')}. Sugestão: semana ${week.number + 1} com −${Math.round(p.volumeCut * 100)}% de volume, mesmas cargas.`,
      suggestion: { type: 'deload', week: week.number + 1, volumeCut: p.volumeCut },
    });
  }
  return alerts;
}

// ---------------------------------------------------------------------------
// Regra 7 — Revisão dos máximos
// ---------------------------------------------------------------------------

export function maxReviewAlerts(cycle: Cycle, logged: LoggedSession[], today: string): Alert[] {
  const p = cycle.ruleParams.maxReview;
  const reviewWeek = weekOf(cycle, p.afterWeek);
  if (!reviewWeek) return [];
  // Só depois do último treino da semana de revisão.
  const lastSession = reviewWeek.sessions[reviewWeek.sessions.length - 1];
  const reviewReady = diffDays(today, addDays(reviewWeek.start, lastSession.weekday - 1)) >= 0;
  if (!reviewReady) return [];
  const alerts: Alert[] = [];
  for (const lift of LIFTS) {
    const diffs: number[] = [];
    for (const ex of mainExecutions(cycle, logged, lift)) {
      if (ex.week.number > p.afterWeek) continue;
      const top = topSet(ex.sets);
      const mid = targetMid(ex.item, ex.week);
      if (top?.rpe == null || mid === null) continue;
      diffs.push(mid - top.rpe);
    }
    if (diffs.length < 3) continue; // poucos dados para decidir
    const avgBelow = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    const raise = avgBelow >= p.rpeBelowTarget;
    alerts.push({
      key: `max_review:${p.afterWeek}:${lift}`,
      rule: 'max_review',
      week: p.afterWeek,
      severity: raise ? 'warn' : 'info',
      title: raise
        ? `Revisão: +${fmt(p.incrementKg)} kg no máximo do ${LIFT_LABEL[lift].toLowerCase()}`
        : `Revisão: manter o máximo do ${LIFT_LABEL[lift].toLowerCase()}`,
      message: `Top sets do volume em média ${fmt(Math.round(avgBelow * 10) / 10)} ponto(s) abaixo do RPE alvo (${diffs.length} treinos).` +
        (raise ? ` Sugestão: +${fmt(p.incrementKg)} kg no máximo de referência para as semanas ${p.applyWeeks.from}–${p.applyWeeks.to}.` : ' Mantém.'),
      suggestion: raise ? { type: 'increase_max', lift, incrementKg: p.incrementKg, weeks: p.applyWeeks } : undefined,
    });
  }
  return alerts;
}

// ---------------------------------------------------------------------------
// Regras 8 e 9 — Check-in (24 h e sinais de alarme)
// ---------------------------------------------------------------------------

/** Regra das 24 h: lombar ou joelho pior que no check-in anterior. */
export function pain24hAlert(cycle: Cycle, checkins: CheckIn[], date: string): Alert | null {
  const sorted = [...checkins].sort((a, b) => a.date.localeCompare(b.date));
  const today = sorted.find((c) => c.date === date);
  const prev = sorted.filter((c) => c.date < date).pop();
  if (!today || !prev) return null;
  const worse: string[] = [];
  if ((today.lowBack ?? 0) > (prev.lowBack ?? 0)) worse.push(`lombar ${prev.lowBack ?? 0}→${today.lowBack}`);
  if ((today.knee ?? 0) > (prev.knee ?? 0)) worse.push(`joelho ${prev.knee ?? 0}→${today.knee}`);
  if (!worse.length) return null;
  const week = cycle.weeks.find((w) => {
    const d = diffDays(date, w.start);
    return d >= 0 && d < 7;
  });
  return {
    key: `pain_24h:${date}`,
    rule: 'pain_24h',
    week: week?.number ?? 0,
    severity: 'warn',
    title: 'Regra das 24 h: reduzir agacho e terra hoje',
    message: `Pior que no check-in anterior (${worse.join(', ')}). Reduza o volume de agacho e terra hoje.`,
  };
}

export function hasRedFlags(c: CheckIn | null | undefined): boolean {
  return !!c && (c.redFlags.saddleNumbness || c.redFlags.bladderBowel || c.redFlags.legWeakness);
}

// ---------------------------------------------------------------------------
// Regras do dia — 4ª série do terra, terra falhou, pegada
// ---------------------------------------------------------------------------

export interface SetLock {
  fromSet: number; // séries a partir desta ficam bloqueadas
  reason: string;
  undoable: boolean;
}

/**
 * Bloqueios de séries na sessão:
 * - Regra 4: terra principal nas semanas configuradas — 4ª série só se a 3ª saiu em RPE ≤ limite.
 * - Regra 5: falhou uma série de terra → encerra terra e stiff do dia (a menos que `failUnlocked`).
 */
export function sessionLocks(
  cycle: Cycle,
  week: PlanWeek,
  items: PrescribedItem[],
  sets: SetLog[],
  failUnlocked = false,
): Map<string, SetLock> {
  const p = cycle.ruleParams;
  const locks = new Map<string, SetLock>();

  // Regra 4
  if (p.deadliftFourthSet.weeks.includes(week.number)) {
    for (const item of items) {
      if (item.kind !== 'main' || liftOf(cycle, item) !== 'deadlift' || (item.sets?.max ?? 0) < 4) continue;
      const third = sets.find((s) => s.itemId === item.id && s.setIndex === 3);
      const ok = third && !third.failed && third.rpe !== null && third.rpe <= p.deadliftFourthSet.maxRpeThirdSet;
      if (!ok) {
        locks.set(item.id, {
          fromSet: 4,
          reason: !third
            ? `4ª série liberada só se a 3ª sair em RPE ≤ ${fmt(p.deadliftFourthSet.maxRpeThirdSet)}`
            : third.rpe === null
              ? 'Informe o RPE da 3ª série para liberar a 4ª'
              : `3ª série em RPE ${fmt(third.rpe)}: para em 3 séries`,
          undoable: false,
        });
      }
    }
  }

  // Regra 5
  if (p.deadliftFailStopsLift && !failUnlocked) {
    const deadliftIds = new Set(items.filter((i) => liftOf(cycle, i) === 'deadlift').map((i) => i.id));
    const failed = sets.find((s) => s.failed && s.itemId !== null && deadliftIds.has(s.itemId));
    if (failed) {
      const failedIdx = items.findIndex((i) => i.id === failed.itemId);
      items.forEach((item, idx) => {
        if (!deadliftIds.has(item.id) || idx < failedIdx) return;
        const fromSet = item.id === failed.itemId ? failed.setIndex + 1 : 1;
        locks.set(item.id, { fromSet, reason: 'Falhou no terra: terra do dia encerrado', undoable: true });
      });
    }
  }
  return locks;
}

/** Regra 10 — dica de pegada para itens do terra. */
export function gripTip(cycle: Cycle, week: PlanWeek, item: PrescribedItem): string | null {
  if (liftOf(cycle, item) !== 'deadlift') return null;
  const g = cycle.ruleParams.grip;
  if (item.name.toLowerCase().startsWith('stiff')) return g.stiffStrap ? 'Pegada: strap' : null;
  if (week.number <= g.hookStrapUntilWeek && item.kind === 'main') {
    return `Pegada: hook nas ${g.hookFirstSets} primeiras séries, strap no resto`;
  }
  return 'Pegada: hook';
}

export function gripForSet(cycle: Cycle, week: PlanWeek, item: PrescribedItem, setIndex: number): 'hook' | 'strap' | null {
  if (liftOf(cycle, item) !== 'deadlift') return null;
  const g = cycle.ruleParams.grip;
  if (item.name.toLowerCase().startsWith('stiff')) return g.stiffStrap ? 'strap' : null;
  if (week.number <= g.hookStrapUntilWeek && item.kind === 'main') return setIndex <= g.hookFirstSets ? 'hook' : 'strap';
  return 'hook';
}

// ---------------------------------------------------------------------------
// Tudo junto
// ---------------------------------------------------------------------------

export function evaluateCycle(cycle: Cycle, logged: LoggedSession[], checkins: CheckIn[], today: string): Alert[] {
  const pain = pain24hAlert(cycle, checkins, today);
  return [
    ...brakeAndGateAlerts(cycle, logged),
    ...activationAlerts(cycle, logged),
    ...deloadAlerts(cycle, logged, checkins),
    ...maxReviewAlerts(cycle, logged, today),
    ...(pain ? [pain] : []),
  ].sort((a, b) => b.week - a.week);
}

function dedupe(alerts: Alert[]): Alert[] {
  const m = new Map<string, Alert>();
  for (const a of alerts) m.set(a.key, a); // a última execução vence
  return [...m.values()];
}

// ---------------------------------------------------------------------------
// Aplicar sugestão (só quando eu confirmo)
// ---------------------------------------------------------------------------

function mapItems(cycle: Cycle, weekFilter: (w: PlanWeek) => boolean, fn: (item: PrescribedItem) => PrescribedItem | null): Cycle {
  return {
    ...cycle,
    weeks: cycle.weeks.map((w) =>
      weekFilter(w)
        ? {
            ...w,
            sessions: w.sessions.map((s) => ({
              ...s,
              items: s.items.map(fn).filter((i): i is PrescribedItem => i !== null),
            })),
          }
        : w,
    ),
  };
}

function scaleRange(r: { min: number; max: number } | null, factor: number) {
  if (!r) return r;
  return { min: Math.max(1, Math.round(r.min * factor)), max: Math.max(1, Math.round(r.max * factor)) };
}

export function applySuggestion(cycle: Cycle, s: Suggestion): Cycle {
  switch (s.type) {
    case 'set_load':
      return mapItems(
        cycle,
        (w) => w.number === s.week,
        (it) =>
          it.kind === 'main' && liftOf(cycle, it) === s.lift
            ? { ...it, load: { min: s.loadKg, max: s.loadKg }, loadText: String(s.loadKg), pctBased: false }
            : it,
      );
    case 'skip_activation':
      return mapItems(
        cycle,
        (w) => s.weeks.includes(w.number),
        (it) => (it.kind === 'activation_single' && liftOf(cycle, it) === s.lift ? null : it),
      );
    case 'deload': {
      const factor = 1 - s.volumeCut;
      return mapItems(
        cycle,
        (w) => w.number === s.week,
        (it) => {
          if (it.kind === 'core' || !it.sets) return it;
          const sets = scaleRange(it.sets, factor)!;
          const setsText = it.setsText.replace(/^\d+(?:-\d+)?/, sets.min === sets.max ? String(sets.min) : `${sets.min}-${sets.max}`);
          return { ...it, sets, setsText, notes: `${it.notes ? `${it.notes} · ` : ''}deload −${Math.round(s.volumeCut * 100)}% volume` };
        },
      );
    }
    case 'increase_max': {
      const step = cycle.ruleParams.loadRounding;
      const max = cycle.maxes[s.lift] + s.incrementKg;
      return mapItems(
        cycle,
        (w) => w.number >= s.weeks.from && w.number <= s.weeks.to,
        (it) => {
          if (!it.pctBased || !it.pctOfMax || liftOf(cycle, it) !== s.lift) return it;
          const load = { min: roundTo(it.pctOfMax.min * max, step), max: roundTo(it.pctOfMax.max * max, step) };
          return { ...it, load, loadText: load.min === load.max ? String(load.min) : `${load.min}-${load.max}`, pctBased: false };
        },
      );
    }
  }
}
