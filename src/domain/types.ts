// Formato de ciclo do app (fitapp.cycle/v1). Ver docs/formato-ciclo.md.
// É o mesmo formato gerado pelo importador da planilha e pelo Claude (treinador).

export type Lift = 'squat' | 'bench' | 'deadlift';

export type Range = { min: number; max: number };
export type OpenRange = { min: number | null; max: number };

export type ItemKind =
  | 'main'
  | 'variation'
  | 'activation_single'
  | 'walkout'
  | 'backoff'
  | 'volume_doubles'
  | 'accessory'
  | 'core';

export type LoadMode = 'fixed' | 'progressive' | 'added' | 'bodyweight' | 'text' | 'none';

export type Maxes = Record<Lift, number>;

export interface Exercise {
  id: string;
  name: string;
  lift: Lift | null;
  category: 'powerlifting' | 'accessory' | 'core';
}

export interface PrescribedItem {
  id: string;
  exerciseId: string;
  name: string;
  kind: ItemKind;
  parentId: string | null;
  setsText: string;
  sets: Range | null;
  reps: Range | null;
  durationSec: Range | null;
  perSide: boolean;
  load: Range | null;
  loadText: string;
  loadMode: LoadMode;
  pctOfMax: Range | null;
  pctBased: boolean;
  rpe: OpenRange | null;
  rpeText: string;
  restSec: Range | null;
  restText: string;
  notes: string;
}

export interface PlanSession {
  id: string;
  weekday: number; // 1 = segunda … 7 = domingo
  title: string;
  items: PrescribedItem[];
}

export interface PlanWeek {
  number: number;
  title: string;
  start: string; // YYYY-MM-DD (segunda-feira)
  block: string;
  targetRpe: OpenRange | null;
  targetRpeText: string;
  note: string | null;
  notes: string[];
  sessions: PlanSession[];
  core: { title: string; weekdays: number[]; items: PrescribedItem[] } | null;
}

export interface RuleParams {
  loadRounding: number;
  brake: { rpeOverTarget: number };
  gates: {
    weeks: { from: number; to: number };
    gateWeek: number;
    lifts: Record<Lift, { gateLoad: number | null; maxRpe: number; nextLoad: number | null; fallbackLoad: number | null }>;
  };
  activationSingle: { fatigueRpe: number; suggestSkipWeeks: number[] };
  deadliftFourthSet: { weeks: number[]; maxRpeThirdSet: number };
  deadliftFailStopsLift: boolean;
  deloadOnDemand: {
    redSignals: number;
    painThreshold: number;
    shortSleepHours: number;
    shortSleepNights: number;
    rpeOverTarget: number;
    rpeOverSessions: number;
    volumeCut: number;
  };
  maxReview: { afterWeek: number; applyWeeks: { from: number; to: number }; rpeBelowTarget: number; incrementKg: number };
  grip: { hookStrapUntilWeek: number; hookFirstSets: number; stiffStrap: boolean };
}

export interface Cycle {
  format: 'fitapp.cycle/v1';
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  goal: string | null;
  notes: string[];
  maxes: Maxes;
  rules: string[];
  ruleParams: RuleParams;
  exercises: Exercise[];
  weeks: PlanWeek[];
  source?: { type: string; file?: string };
}

// ---- Registro ----

export type Grip = 'hook' | 'strap' | 'double';

/** Tipo de uma série de trabalho. O aquecimento é à parte (`SetLog.warmup`). */
export type SetType = 'normal' | 'failure' | 'dropset';

export interface SetLog {
  id: string;
  sessionLogId: string;
  itemId: string | null;
  exerciseId: string;
  setIndex: number; // 1-based
  loadKg: number | null;
  reps: number | null;
  durationSec: number | null;
  rpe: number | null;
  grip: Grip | null;
  belt: boolean | null;
  failed: boolean;
  asPlanned: boolean;
  /** Série de aquecimento: numeração própria (A1, A2…) e fora de volume, regras e análises. */
  warmup: boolean;
  /** Série até a falha (`failure`) ou drop set; `failed` (não completou) é outra coisa. */
  setType: SetType;
  note: string | null;
  doneAt: string; // ISO datetime
}

export interface SessionLog {
  id: string;
  cycleId: string;
  week: number;
  sessionId: string; // PlanSession.id
  date: string; // data real em que o treino foi feito
  status: 'in_progress' | 'done';
  note: string | null;
}
