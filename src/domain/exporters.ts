// Exportação em CSV (uma linha por série, por check-in etc.).

import type { SetRow } from './analytics';
import type { Measurement, WeightEntry } from './body';
import { toCsv } from './csv';
import { MEAL_LABEL, type MealEntry } from './nutrition';
import type { CheckIn } from './rules';

export const BACKUP_FORMAT = 'fitapp.backup/v1';

export function workoutsCsv(rows: (SetRow & { grip?: string | null; belt?: boolean | null; note?: string | null })[]): string {
  return toCsv(
    ['data', 'ciclo', 'bloco', 'semana', 'sessao', 'exercicio', 'tipo', 'serie', 'carga_kg', 'reps', 'rpe', 'falha', 'pegada', 'cinto', 'obs'],
    [...rows]
      .sort((a, b) => a.date.localeCompare(b.date) || a.sessionLogId.localeCompare(b.sessionLogId) || a.setIndex - b.setIndex)
      .map((r) => [
        r.date,
        r.cycleName,
        r.block ?? '',
        r.week ?? '',
        r.sessionTitle,
        r.exerciseName,
        r.kind ?? '',
        r.setIndex,
        r.loadKg ?? '',
        r.reps ?? '',
        r.rpe ?? '',
        r.failed ? 'sim' : 'nao',
        r.grip ?? '',
        r.belt === null || r.belt === undefined ? '' : r.belt ? 'sim' : 'nao',
        r.note ?? '',
      ]),
  );
}

export function checkinsCsv(list: CheckIn[]): string {
  return toCsv(
    ['data', 'lombar', 'joelho', 'punho', 'pe', 'sono_h', 'sinais_alarme', 'obs'],
    [...list]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((c) => [
        c.date,
        c.lowBack ?? '',
        c.knee ?? '',
        c.wrist ?? '',
        c.foot ?? '',
        c.sleepH ?? '',
        [c.redFlags.saddleNumbness && 'sela', c.redFlags.bladderBowel && 'urinaria/intestinal', c.redFlags.legWeakness && 'fraqueza'].filter(Boolean).join('|'),
        c.note ?? '',
      ]),
  );
}

export function mealsCsv(list: MealEntry[]): string {
  return toCsv(
    ['data', 'refeicao', 'alimento', 'gramas', 'kcal', 'proteina_g', 'carbo_g', 'gordura_g'],
    [...list].sort((a, b) => a.date.localeCompare(b.date)).map((e) => [e.date, MEAL_LABEL[e.meal], e.label, e.grams ?? '', e.kcal, e.protein, e.carbs, e.fat]),
  );
}

export function weightsCsv(list: WeightEntry[]): string {
  return toCsv(['data', 'peso_kg', 'obs'], [...list].sort((a, b) => a.date.localeCompare(b.date)).map((w) => [w.date, w.kg, w.note ?? '']));
}

export function measurementsCsv(list: Measurement[]): string {
  return toCsv(
    ['data', 'braco_cm', 'coxa_cm', 'abdomen_cm'],
    [...list].sort((a, b) => a.date.localeCompare(b.date)).map((m) => [m.date, m.armCm ?? '', m.thighCm ?? '', m.waistCm ?? '']),
  );
}
