// Ajustes vindos do Claude (treinador) e edições do plano feitas no app.
// Formato: fitapp.adjustments/v1 — ver docs/claude-treinador.md.

import { LIFTS, liftOf } from './plan';
import { parseLoadText, parseRestText, parseRpeText, parseSetsText } from './parsing';
import { applySuggestion } from './rules';
import { slugify } from './text';
import type { Cycle, Exercise, ItemKind, Lift, Maxes, PlanWeek, PrescribedItem } from './types';

export interface ItemPatch {
  name?: string;
  /** Troca o exercício do item (precisa existir em `exercises` do ciclo). */
  exerciseId?: string;
  setsText?: string; // "4x4", "3x8-12"
  load?: string | number; // 140, "205-210", "100+", "—"
  rpe?: string; // "7-7.5", "≤8"
  rest?: string; // "5 min", "3-4 min"
  notes?: string;
  kind?: ItemKind;
}

export type AdjustmentOp =
  | { op: 'set_load'; week: number; lift: Lift; loadKg: number }
  | { op: 'edit_item'; itemId: string; patch: ItemPatch }
  | { op: 'add_item'; sessionId: string; afterItemId?: string; item: ItemPatch & { name: string; setsText: string } }
  | { op: 'remove_item'; itemId: string }
  | { op: 'add_note'; week: number; text: string }
  | { op: 'set_max'; lift: Lift; kg: number }
  | { op: 'deload'; week: number; volumeCut: number }
  | { op: 'skip_activation'; weeks: number[]; lift: Lift };

export interface Adjustments {
  format: 'fitapp.adjustments/v1';
  cycleId?: string;
  summary?: string;
  operations: AdjustmentOp[];
}

const LIFT_PT: Record<Lift, string> = { squat: 'agacho', bench: 'supino', deadlift: 'terra' };
const KINDS: ItemKind[] = ['main', 'variation', 'activation_single', 'walkout', 'backoff', 'volume_doubles', 'accessory', 'core'];

function findItem(cycle: Cycle, itemId: string): { week: PlanWeek; item: PrescribedItem } | null {
  for (const week of cycle.weeks) {
    const item = [...week.sessions.flatMap((s) => s.items), ...(week.core?.items ?? [])].find((i) => i.id === itemId);
    if (item) return { week, item };
  }
  return null;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  /** descrição em português de cada operação, para a pré-visualização */
  preview: string[];
  adjustments: Adjustments | null;
}

/** Valida o JSON colado/aberto. Não altera nada. */
export function validateAdjustments(input: unknown, cycle: Cycle): ValidationResult {
  const errors: string[] = [];
  const preview: string[] = [];
  const a = input as Partial<Adjustments> | null;
  if (!a || typeof a !== 'object') return { ok: false, errors: ['Não é um objeto JSON.'], preview, adjustments: null };
  if (a.format !== 'fitapp.adjustments/v1') errors.push('Campo "format" deve ser "fitapp.adjustments/v1".');
  if (a.cycleId && a.cycleId !== cycle.id) errors.push(`Ajustes são para o ciclo "${a.cycleId}", mas o ativo é "${cycle.id}".`);
  if (!Array.isArray(a.operations) || a.operations.length === 0) errors.push('Nenhuma operação em "operations".');
  const weekExists = (n: unknown) => typeof n === 'number' && cycle.weeks.some((w) => w.number === n);
  (a.operations ?? []).forEach((op, i) => {
    const where = `Operação ${i + 1}`;
    const o = op as AdjustmentOp;
    switch (o?.op) {
      case 'set_load':
        if (!weekExists(o.week)) errors.push(`${where}: semana ${o.week} não existe.`);
        if (!LIFTS.includes(o.lift)) errors.push(`${where}: "lift" deve ser squat, bench ou deadlift.`);
        if (typeof o.loadKg !== 'number' || o.loadKg <= 0) errors.push(`${where}: "loadKg" inválido.`);
        preview.push(`S${o.week}: ${LIFT_PT[o.lift] ?? o.lift} principal com ${o.loadKg} kg`);
        break;
      case 'edit_item': {
        const f = findItem(cycle, o.itemId);
        if (!f) errors.push(`${where}: item "${o.itemId}" não existe.`);
        if (!o.patch || typeof o.patch !== 'object') errors.push(`${where}: falta "patch".`);
        else if (o.patch.kind && !KINDS.includes(o.patch.kind)) errors.push(`${where}: "kind" inválido.`);
        if (o.patch?.exerciseId && !cycle.exercises.some((e) => e.id === o.patch.exerciseId)) {
          errors.push(`${where}: exercício "${o.patch.exerciseId}" não está em "exercises".`);
        }
        const parts = Object.entries(o.patch ?? {}).map(([k, v]) => `${k}: ${v}`);
        preview.push(`S${f?.week.number ?? '?'} ${f?.item.name ?? o.itemId} → ${parts.join(', ')}`);
        break;
      }
      case 'add_item': {
        const s = cycle.weeks.flatMap((w) => w.sessions.map((x) => ({ w, x }))).find((r) => r.x.id === o.sessionId);
        if (!s) errors.push(`${where}: sessão "${o.sessionId}" não existe.`);
        if (!o.item?.name || !o.item?.setsText) errors.push(`${where}: item precisa de "name" e "setsText".`);
        preview.push(`S${s?.w.number ?? '?'} ${s?.x.title ?? o.sessionId}: + ${o.item?.name} ${o.item?.setsText ?? ''}`);
        break;
      }
      case 'remove_item': {
        const f = findItem(cycle, o.itemId);
        if (!f) errors.push(`${where}: item "${o.itemId}" não existe.`);
        preview.push(`S${f?.week.number ?? '?'}: remover ${f?.item.name ?? o.itemId}`);
        break;
      }
      case 'add_note':
        if (!weekExists(o.week)) errors.push(`${where}: semana ${o.week} não existe.`);
        if (!o.text) errors.push(`${where}: falta "text".`);
        preview.push(`S${o.week}: nota "${o.text}"`);
        break;
      case 'set_max':
        if (!LIFTS.includes(o.lift)) errors.push(`${where}: "lift" inválido.`);
        if (typeof o.kg !== 'number' || o.kg <= 0) errors.push(`${where}: "kg" inválido.`);
        preview.push(`Máximo de referência do ${LIFT_PT[o.lift] ?? o.lift}: ${o.kg} kg (recalcula cargas por %)`);
        break;
      case 'deload':
        if (!weekExists(o.week)) errors.push(`${where}: semana ${o.week} não existe.`);
        if (typeof o.volumeCut !== 'number' || o.volumeCut <= 0 || o.volumeCut >= 1) errors.push(`${where}: "volumeCut" entre 0 e 1.`);
        preview.push(`S${o.week}: deload −${Math.round((o.volumeCut ?? 0) * 100)}% de volume, mesmas cargas`);
        break;
      case 'skip_activation':
        if (!Array.isArray(o.weeks) || !o.weeks.every(weekExists)) errors.push(`${where}: "weeks" inválido.`);
        if (!LIFTS.includes(o.lift)) errors.push(`${where}: "lift" inválido.`);
        preview.push(`Pular single de ativação do ${LIFT_PT[o.lift] ?? o.lift} nas semanas ${(o.weeks ?? []).join(', ')}`);
        break;
      default:
        errors.push(`${where}: operação desconhecida "${(op as { op?: string })?.op}".`);
    }
  });
  return { ok: errors.length === 0, errors, preview, adjustments: errors.length ? null : (a as Adjustments) };
}

/** Aplica um patch num item, reinterpretando os textos. */
export function patchItem(item: PrescribedItem, patch: ItemPatch): PrescribedItem {
  const next = { ...item };
  if (patch.name !== undefined) next.name = patch.name;
  if (patch.exerciseId !== undefined) next.exerciseId = patch.exerciseId;
  if (patch.kind !== undefined) next.kind = patch.kind;
  if (patch.notes !== undefined) next.notes = patch.notes;
  if (patch.setsText !== undefined) {
    const s = parseSetsText(patch.setsText);
    Object.assign(next, { setsText: s.text, sets: s.sets, reps: s.reps, durationSec: s.durationSec, perSide: s.perSide });
  }
  if (patch.load !== undefined) {
    const l = parseLoadText(patch.load);
    Object.assign(next, { load: l.load, loadText: l.loadText, loadMode: l.loadMode, pctBased: false });
  }
  if (patch.rpe !== undefined) Object.assign(next, { rpe: parseRpeText(patch.rpe), rpeText: patch.rpe || '—' });
  if (patch.rest !== undefined) Object.assign(next, { restSec: parseRestText(patch.rest), restText: patch.rest || '—' });
  return next;
}

/** Aplica `fn` aos itens de cada sessão e ao core/mobilidade da semana (id de sessão `core:<semana>`). */
function mapSessions(cycle: Cycle, fn: (week: PlanWeek, items: PrescribedItem[], sessionId: string) => PrescribedItem[]): Cycle {
  return {
    ...cycle,
    weeks: cycle.weeks.map((w) => ({
      ...w,
      sessions: w.sessions.map((s) => ({ ...s, items: fn(w, s.items, s.id) })),
      core: w.core ? { ...w.core, items: fn(w, w.core.items, `core:${w.number}`) } : null,
    })),
  };
}

/** Aplica as operações em ordem. Retorna o novo ciclo e os máximos (set_max). */
export function applyAdjustments(cycle: Cycle, maxes: Maxes, ops: AdjustmentOp[]): { cycle: Cycle; maxes: Maxes } {
  let c = cycle;
  let m = maxes;
  for (const o of ops) {
    switch (o.op) {
      case 'set_load':
        c = applySuggestion(c, { type: 'set_load', week: o.week, lift: o.lift, loadKg: o.loadKg });
        break;
      case 'deload':
        c = applySuggestion(c, { type: 'deload', week: o.week, volumeCut: o.volumeCut });
        break;
      case 'skip_activation':
        c = applySuggestion(c, { type: 'skip_activation', weeks: o.weeks, lift: o.lift });
        break;
      case 'set_max':
        m = { ...m, [o.lift]: o.kg };
        break;
      case 'add_note':
        c = { ...c, weeks: c.weeks.map((w) => (w.number === o.week ? { ...w, notes: [...w.notes, o.text] } : w)) };
        break;
      case 'edit_item':
        c = mapSessions(c, (_w, items) => items.map((it) => (it.id === o.itemId ? patchItem(it, o.patch) : it)));
        break;
      case 'remove_item':
        c = mapSessions(c, (_w, items) => items.filter((it) => it.id !== o.itemId).map((it) => (it.parentId === o.itemId ? { ...it, parentId: null } : it)));
        break;
      case 'add_item': {
        const exerciseId = slugify(o.item.name);
        const base: PrescribedItem = {
          id: `${o.sessionId}-c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
          exerciseId,
          name: o.item.name,
          kind: o.item.kind ?? 'accessory',
          parentId: null,
          setsText: '',
          sets: null,
          reps: null,
          durationSec: null,
          perSide: false,
          load: null,
          loadText: '—',
          loadMode: 'none',
          pctOfMax: null,
          pctBased: false,
          rpe: null,
          rpeText: '—',
          restSec: null,
          restText: '—',
          notes: '',
        };
        const item = patchItem(base, o.item);
        c = mapSessions(c, (_w, items, sid) => {
          if (sid !== o.sessionId) return items;
          const at = o.afterItemId ? items.findIndex((i) => i.id === o.afterItemId) : -1;
          return at >= 0 ? [...items.slice(0, at + 1), item, ...items.slice(at + 1)] : [...items, item];
        });
        if (!c.exercises.some((e) => e.id === exerciseId)) {
          c = { ...c, exercises: [...c.exercises, { id: exerciseId, name: o.item.name, lift: null, category: 'accessory' }] };
        }
        break;
      }
    }
  }
  return { cycle: c, maxes: m };
}

/** Validação mínima de um ciclo completo (fitapp.cycle/v1) vindo do Claude. */
export function validateCycle(input: unknown): { ok: boolean; errors: string[]; cycle: Cycle | null } {
  const c = input as Partial<Cycle> | null;
  const errors: string[] = [];
  if (!c || typeof c !== 'object') return { ok: false, errors: ['Não é um objeto JSON.'], cycle: null };
  if (c.format !== 'fitapp.cycle/v1') errors.push('Campo "format" deve ser "fitapp.cycle/v1".');
  if (!c.id) errors.push('Falta "id".');
  if (!c.name) errors.push('Falta "name".');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.startDate ?? '')) errors.push('"startDate" deve ser AAAA-MM-DD.');
  if (!c.maxes || !LIFTS.every((l) => typeof c.maxes?.[l] === 'number')) errors.push('"maxes" precisa de squat, bench e deadlift.');
  if (!c.ruleParams) errors.push('Falta "ruleParams".');
  if (!Array.isArray(c.weeks) || !c.weeks.length) errors.push('Falta "weeks".');
  if (!Array.isArray(c.exercises)) errors.push('Falta "exercises".');
  const ids = new Set<string>();
  for (const w of c.weeks ?? []) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(w.start ?? '')) errors.push(`Semana ${w.number}: "start" inválido.`);
    for (const s of w.sessions ?? []) {
      if (!s.id || ids.has(s.id)) errors.push(`Semana ${w.number}: sessão sem id ou id repetido (${s.id}).`);
      ids.add(s.id);
      for (const it of s.items ?? []) {
        if (!it.id || ids.has(it.id)) errors.push(`Item sem id ou id repetido (${it.id}).`);
        ids.add(it.id);
        if (!(c.exercises ?? []).some((e) => e.id === it.exerciseId)) errors.push(`Item ${it.id}: exercício "${it.exerciseId}" fora de "exercises".`);
      }
    }
  }
  if (errors.length) return { ok: false, errors: errors.slice(0, 20), cycle: null };
  const cyc = c as Cycle;
  return { ok: true, errors: [], cycle: { ...cyc, endDate: cyc.endDate ?? cyc.weeks[cyc.weeks.length - 1].start, notes: cyc.notes ?? [], rules: cyc.rules ?? [] } };
}

export type SwapScope = 'item' | 'forward';

/**
 * Troca o exercício de um item. `forward` troca também os itens do mesmo exercício nas semanas
 * seguintes (inclui a semana do item). Cadastra o exercício novo no ciclo e devolve os ids afetados
 * (o chamador acerta o histórico das séries já registradas desses itens).
 */
export function swapExercise(cycle: Cycle, itemId: string, exercise: Exercise, scope: SwapScope): { cycle: Cycle; itemIds: string[] } {
  const found = findItem(cycle, itemId);
  if (!found) return { cycle, itemIds: [] };
  const from = found.item.exerciseId;
  const itemIds =
    scope === 'item'
      ? [itemId]
      : cycle.weeks
          .filter((w) => w.number >= found.week.number)
          .flatMap((w) => [...w.sessions.flatMap((s) => s.items), ...(w.core?.items ?? [])])
          .filter((i) => i.exerciseId === from)
          .map((i) => i.id);
  const known = cycle.exercises.some((e) => e.id === exercise.id);
  const base = known ? cycle : { ...cycle, exercises: [...cycle.exercises, exercise] };
  const ops: AdjustmentOp[] = itemIds.map((id) => ({ op: 'edit_item', itemId: id, patch: { name: exercise.name, exerciseId: exercise.id } }));
  return { cycle: applyAdjustments(base, base.maxes, ops).cycle, itemIds };
}

/** Lift de um item (exposto para telas). */
export function itemLift(cycle: Cycle, item: PrescribedItem): Lift | null {
  return liftOf(cycle, item);
}

/** Extrai o JSON de uma resposta (aceita bloco ```json, texto em volta ou JSON puro). */
export function extractJson(text: string): unknown {
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const candidate = fence ? fence[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('Não encontrei um JSON na resposta.');
  return JSON.parse(candidate.slice(start, end + 1));
}
