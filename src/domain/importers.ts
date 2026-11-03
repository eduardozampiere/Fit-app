// Importação: Hevy (CSV), CSVs do diário antigo (treinos, checkin, refeicoes, peso).

import type { WeightEntry } from './body';
import { normalizeHeader, parseCsvObjects } from './csv';
import type { MealEntry, MealType } from './nutrition';
import { extractNumber, parseDateLoose, parseNumberLoose, parseSetsText } from './parsing';
import { sessionForDate, weekForDate } from './plan';
import { NO_RED_FLAGS, type CheckIn } from './rules';
import { slugify } from './text';
import type { Cycle, Exercise, Grip } from './types';

export interface ImportedSet {
  date: string;
  title: string; // título do treino (Hevy) ou sessão (diário antigo)
  exerciseName: string;
  setIndex: number;
  loadKg: number | null;
  reps: number | null;
  rpe: number | null;
  grip: Grip | null;
  note: string | null;
  sourceKey: string; // evita duplicar ao reimportar
}

export interface ParseResult<T> {
  items: T[];
  missingColumns: string[];
  skipped: number; // linhas ignoradas (aquecimento, sem data etc.)
}

const has = (header: string[], cols: string[]) => cols.filter((c) => !header.includes(c));

// ---------------------------------------------------------------------------
// Hevy
// ---------------------------------------------------------------------------

/** Export CSV do Hevy. Colunas detectadas pelo cabeçalho; aquecimento ignorado. */
export function parseHevy(text: string): ParseResult<ImportedSet> {
  const { header, rows } = parseCsvObjects(text);
  const weightCol = header.includes('weight_kg') ? 'weight_kg' : header.includes('weight_lbs') ? 'weight_lbs' : 'weight_kg';
  const missing = has(header, ['start_time', 'exercise_title', 'reps']).concat(header.includes(weightCol) ? [] : [weightCol]);
  if (missing.length) return { items: [], missingColumns: missing, skipped: rows.length };
  const items: ImportedSet[] = [];
  let skipped = 0;
  const counters = new Map<string, number>();
  for (const r of rows) {
    const date = parseDateLoose(r.start_time);
    const setType = (r.set_type ?? '').toLowerCase();
    if (!date || setType === 'warmup' || !r.exercise_title) {
      skipped++;
      continue;
    }
    let load = parseNumberLoose(r[weightCol]);
    if (load !== null && weightCol === 'weight_lbs') load = Math.round(load * 0.45359237 * 10) / 10;
    const title = r.title || 'Treino Hevy';
    const exKey = `${date}|${title}|${r.exercise_title}`;
    const idx = r.set_index !== undefined && r.set_index !== '' ? Number(r.set_index) + 1 : (counters.get(exKey) ?? 0) + 1;
    counters.set(exKey, idx);
    items.push({
      date,
      title,
      exerciseName: r.exercise_title,
      setIndex: idx,
      loadKg: load,
      reps: parseNumberLoose(r.reps),
      rpe: parseNumberLoose(r.rpe),
      grip: null,
      note: r.exercise_notes || r.notes || null,
      sourceKey: `hevy|${r.start_time}|${r.exercise_title}|${idx}`,
    });
  }
  return { items, missingColumns: [], skipped };
}

// ---------------------------------------------------------------------------
// Diário antigo
// ---------------------------------------------------------------------------

function gripOf(raw: string | undefined): Grip | null {
  const t = (raw ?? '').toLowerCase();
  if (t.includes('hook')) return 'hook';
  if (t.includes('strap')) return 'strap';
  if (t.includes('dupla') || t.includes('double') || t.includes('mista')) return 'double';
  return null;
}

/** treinos.csv: data,ciclo,bloco,semana,sessao,exercicio,principal,series_reps,carga_kg,rpe,pegada,obs (uma linha por exercício). */
export function parseOldWorkouts(text: string): ParseResult<ImportedSet> {
  const { header, rows } = parseCsvObjects(text);
  const missing = has(header, ['data', 'exercicio', 'series_reps']);
  if (missing.length) return { items: [], missingColumns: missing, skipped: rows.length };
  const items: ImportedSet[] = [];
  let skipped = 0;
  for (const r of rows) {
    const date = parseDateLoose(r.data);
    const info = parseSetsText(r.series_reps ?? '');
    if (!date || !r.exercicio) {
      skipped++;
      continue;
    }
    const n = info.sets?.min ?? 1;
    const reps = info.reps?.min ?? extractNumber(r.series_reps);
    const rpe = parseNumberLoose(r.rpe);
    for (let i = 1; i <= n; i++) {
      items.push({
        date,
        title: r.sessao || 'Treino',
        exerciseName: r.exercicio,
        setIndex: i,
        loadKg: parseNumberLoose(r.carga_kg),
        reps,
        rpe: i === n ? rpe : null, // RPE anotado é o da última série
        grip: gripOf(r.pegada),
        note: i === n ? r.obs || null : null,
        sourceKey: `treinos|${date}|${r.sessao}|${r.exercicio}|${i}`,
      });
    }
  }
  return { items, missingColumns: [], skipped };
}

/** checkin.csv: data,lombar,joelho,punho,pe,sono_h,obs — texto livre: extrai número, senão vai para a observação. */
export function parseOldCheckins(text: string): ParseResult<CheckIn> {
  const { header, rows } = parseCsvObjects(text);
  const missing = has(header, ['data']);
  if (missing.length) return { items: [], missingColumns: missing, skipped: rows.length };
  const items: CheckIn[] = [];
  let skipped = 0;
  for (const r of rows) {
    const date = parseDateLoose(r.data);
    if (!date) {
      skipped++;
      continue;
    }
    const extra: string[] = [];
    const num = (key: string, label: string, max: number) => {
      const raw = r[key] ?? '';
      const n = extractNumber(raw);
      if (raw && (n === null || n > max)) extra.push(`${label}: ${raw}`);
      else if (raw && !/^\s*\d+(?:[.,]\d+)?\s*(\/\s*10)?\s*h?\s*$/i.test(raw)) extra.push(`${label}: ${raw}`);
      return n !== null && n <= max ? n : null;
    };
    const c: CheckIn = {
      date,
      lowBack: num('lombar', 'lombar', 10),
      knee: num('joelho', 'joelho', 10),
      wrist: num('punho', 'punho', 10),
      foot: num('pe', 'pé', 10),
      sleepH: num('sono_h', 'sono', 16),
      redFlags: NO_RED_FLAGS,
      note: [r.obs, ...extra].filter(Boolean).join(' · ') || null,
    };
    items.push(c);
  }
  return { items, missingColumns: [], skipped };
}

export function mealTypeOf(raw: string): MealType {
  const t = slugify(raw);
  if (t.includes('pre')) return 'pre_treino';
  if (t.includes('pos')) return 'pos_treino';
  if (t.includes('almoco')) return 'almoco';
  if (t.includes('jantar') || t.includes('janta')) return 'jantar';
  return 'lanche';
}

/** refeicoes.csv: data,tipo_dia,refeicao,alimentos,kcal,proteina_g,carbo_g,gordura_g. */
export function parseOldMeals(text: string): ParseResult<Omit<MealEntry, 'id'> & { sourceKey: string }> {
  const { header, rows } = parseCsvObjects(text);
  const missing = has(header, ['data', 'kcal']);
  if (missing.length) return { items: [], missingColumns: missing, skipped: rows.length };
  const items: (Omit<MealEntry, 'id'> & { sourceKey: string })[] = [];
  let skipped = 0;
  rows.forEach((r, i) => {
    const date = parseDateLoose(r.data);
    const kcal = parseNumberLoose(r.kcal);
    if (!date || kcal === null) {
      skipped++;
      return;
    }
    items.push({
      date,
      meal: mealTypeOf(r.refeicao ?? ''),
      kind: 'custom',
      label: r.alimentos || r.refeicao || 'Refeição',
      foodId: null,
      grams: null,
      kcal: Math.round(kcal),
      protein: parseNumberLoose(r.proteina_g) ?? 0,
      carbs: parseNumberLoose(r.carbo_g) ?? 0,
      fat: parseNumberLoose(r.gordura_g) ?? 0,
      sourceKey: `refeicoes|${date}|${r.refeicao}|${r.alimentos}|${i}`,
    });
  });
  return { items, missingColumns: [], skipped };
}

/** peso.csv: data,peso_kg,obs. */
export function parseOldWeights(text: string): ParseResult<WeightEntry> {
  const { header, rows } = parseCsvObjects(text);
  const missing = has(header, ['data', 'peso_kg']);
  if (missing.length) return { items: [], missingColumns: missing, skipped: rows.length };
  const items: WeightEntry[] = [];
  let skipped = 0;
  for (const r of rows) {
    const date = parseDateLoose(r.data);
    const kg = parseNumberLoose(r.peso_kg);
    if (!date || kg === null) {
      skipped++;
      continue;
    }
    items.push({ date, kg, note: r.obs || null });
  }
  return { items, missingColumns: [], skipped };
}

/** Qual arquivo é este? Pelo cabeçalho. */
export type CsvKind = 'hevy' | 'treinos' | 'checkin' | 'refeicoes' | 'peso' | 'desconhecido';

export function detectCsvKind(text: string): CsvKind {
  const first = text.replace(/^﻿/, '').split(/\r?\n/, 1)[0] ?? '';
  const h = first.split(/[,;\t]/).map((c) => normalizeHeader(c.replace(/"/g, '')));
  if (h.includes('exercise_title')) return 'hevy';
  if (h.includes('series_reps')) return 'treinos';
  if (h.includes('lombar')) return 'checkin';
  if (h.includes('kcal') && h.includes('refeicao')) return 'refeicoes';
  if (h.includes('peso_kg')) return 'peso';
  return 'desconhecido';
}

// ---------------------------------------------------------------------------
// Mapeamento de nomes de exercício → catálogo
// ---------------------------------------------------------------------------

export type MappingChoice = { type: 'exercise'; exerciseId: string } | { type: 'new' } | { type: 'ignore' };

/** Sugestão: escolha lembrada > mesmo nome > nome contido. */
export function suggestMapping(name: string, catalog: Pick<Exercise, 'id' | 'name'>[], remembered: Record<string, MappingChoice>): MappingChoice {
  if (remembered[name]) return remembered[name];
  const s = slugify(name);
  const exact = catalog.find((e) => slugify(e.name) === s || e.id === s);
  if (exact) return { type: 'exercise', exerciseId: exact.id };
  const contained = catalog
    .filter((e) => s.includes(slugify(e.name)) || slugify(e.name).includes(s))
    .sort((a, b) => b.name.length - a.name.length)[0];
  return contained ? { type: 'exercise', exerciseId: contained.id } : { type: 'new' };
}

export interface ImportSet {
  exerciseId: string;
  itemId: string | null;
  setIndex: number;
  loadKg: number | null;
  reps: number | null;
  rpe: number | null;
  grip: Grip | null;
  note: string | null;
  sourceKey: string;
}

export interface ImportSession {
  date: string;
  title: string;
  cycleId: string;
  week: number;
  sessionId: string; // sessão do plano, ou "extra:<data>:<título>"
  sets: ImportSet[];
}

export interface WorkoutImportPlan {
  sessions: ImportSession[];
  newExercises: Exercise[];
  duplicates: number;
  ignored: number;
}

/**
 * Monta a importação: aplica o mapeamento, descarta duplicadas (sourceKey) e liga ao treino do
 * plano daquele dia quando os exercícios batem e o treino ainda não foi registrado.
 */
export function planWorkoutImport(
  sets: ImportedSet[],
  mapping: Record<string, MappingChoice>,
  cycle: Cycle,
  existingKeys: Set<string>,
  loggedSessionIds: Set<string>,
): WorkoutImportPlan {
  const newExercises = new Map<string, Exercise>();
  const groups = new Map<string, ImportedSet[]>();
  let duplicates = 0;
  let ignored = 0;
  for (const s of sets) {
    if (existingKeys.has(s.sourceKey)) {
      duplicates++;
      continue;
    }
    const choice = mapping[s.exerciseName] ?? { type: 'new' };
    if (choice.type === 'ignore') {
      ignored++;
      continue;
    }
    const k = `${s.date}|${s.title}`;
    groups.set(k, [...(groups.get(k) ?? []), s]);
  }

  const resolveId = (name: string): string => {
    const c = mapping[name] ?? { type: 'new' };
    if (c.type === 'exercise') return c.exerciseId;
    const id = slugify(name);
    if (!cycle.exercises.some((e) => e.id === id) && !newExercises.has(id)) {
      newExercises.set(id, { id, name, lift: null, category: 'accessory' });
    }
    return id;
  };

  const sessions: ImportSession[] = [];
  for (const list of groups.values()) {
    const { date, title } = list[0];
    const planned = sessionForDate(cycle, date);
    const exIds = list.map((s) => resolveId(s.exerciseName));
    const attach =
      planned && !loggedSessionIds.has(planned.session.id) && planned.session.items.some((it) => exIds.includes(it.exerciseId));
    const week = planned?.week.number ?? weekForDate(cycle, date)?.number ?? 0;
    sessions.push({
      date,
      title: attach ? planned!.session.title : title,
      cycleId: cycle.id,
      week,
      sessionId: attach ? planned!.session.id : `extra:${date}:${slugify(title)}`,
      sets: list.map((s, i) => {
        const exerciseId = exIds[i];
        const item = attach ? planned!.session.items.find((it) => it.exerciseId === exerciseId) : undefined;
        return {
          exerciseId,
          itemId: item?.id ?? null,
          setIndex: s.setIndex,
          loadKg: s.loadKg,
          reps: s.reps,
          rpe: s.rpe,
          grip: s.grip,
          note: s.note,
          sourceKey: s.sourceKey,
        };
      }),
    });
  }
  return { sessions: sessions.sort((a, b) => a.date.localeCompare(b.date)), newExercises: [...newExercises.values()], duplicates, ignored };
}
