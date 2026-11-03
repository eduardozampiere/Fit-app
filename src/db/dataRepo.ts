import type { SQLiteDatabase } from 'expo-sqlite';
import type { WeightEntry } from '../domain/body';
import { BACKUP_FORMAT } from '../domain/exporters';
import type { WorkoutImportPlan } from '../domain/importers';
import type { MealEntry } from '../domain/nutrition';
import type { CheckIn } from '../domain/rules';
import type { Cycle } from '../domain/types';
import { newId, saveCheckin } from './repo';

export async function listSetSourceKeys(db: SQLiteDatabase): Promise<Set<string>> {
  const rows = await db.getAllAsync<{ source_key: string }>('SELECT source_key FROM set_logs WHERE source_key IS NOT NULL');
  return new Set(rows.map((r) => r.source_key));
}

export async function loggedSessionIds(db: SQLiteDatabase, cycleId: string): Promise<Set<string>> {
  const rows = await db.getAllAsync<{ session_id: string }>('SELECT session_id FROM session_logs WHERE cycle_id = ?', cycleId);
  return new Set(rows.map((r) => r.session_id));
}

/** Grava a importação de treinos. Exercícios novos entram no catálogo e no ciclo. */
export async function applyWorkoutImport(db: SQLiteDatabase, plan: WorkoutImportPlan, cycle: Cycle): Promise<{ sessions: number; sets: number; cycle: Cycle }> {
  let nextCycle = cycle;
  if (plan.newExercises.length) {
    nextCycle = { ...cycle, exercises: [...cycle.exercises, ...plan.newExercises.filter((e) => !cycle.exercises.some((x) => x.id === e.id))] };
  }
  let sets = 0;
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    for (const e of plan.newExercises) {
      await db.runAsync('INSERT OR IGNORE INTO exercises (id, name, lift, category) VALUES (?, ?, ?, ?)', e.id, e.name, e.lift, e.category);
    }
    if (nextCycle !== cycle) await db.runAsync('UPDATE cycles SET data = ? WHERE id = ?', JSON.stringify(nextCycle), cycle.id);
    for (const s of plan.sessions) {
      const existing = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM session_logs WHERE cycle_id = ? AND session_id = ? AND date = ? LIMIT 1',
        s.cycleId, s.sessionId, s.date,
      );
      const logId = existing?.id ?? newId();
      if (!existing) {
        await db.runAsync(
          `INSERT INTO session_logs (id, cycle_id, week, session_id, date, status, note, created_at) VALUES (?, ?, ?, ?, ?, 'done', ?, ?)`,
          logId, s.cycleId, s.week, s.sessionId, s.date, s.sessionId.startsWith('extra:') ? s.title : null, now,
        );
      }
      for (const x of s.sets) {
        await db.runAsync(
          `INSERT INTO set_logs (id, session_log_id, item_id, exercise_id, set_index, load_kg, reps, duration_sec, rpe, grip, belt,
             failed, as_planned, note, done_at, source_key)
           VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, NULL, 0, 0, ?, ?, ?)`,
          newId(), logId, x.itemId, x.exerciseId, x.setIndex, x.loadKg, x.reps, x.rpe, x.grip, x.note, now, x.sourceKey,
        );
        sets++;
      }
    }
  });
  return { sessions: plan.sessions.length, sets, cycle: nextCycle };
}

/** Check-ins: não sobrescreve dias que já têm check-in. */
export async function importCheckins(db: SQLiteDatabase, list: CheckIn[]): Promise<number> {
  const existing = new Set((await db.getAllAsync<{ date: string }>('SELECT date FROM checkins')).map((r) => r.date));
  let n = 0;
  for (const c of list) {
    if (existing.has(c.date)) continue;
    await saveCheckin(db, c);
    n++;
  }
  return n;
}

export async function importMeals(db: SQLiteDatabase, list: (Omit<MealEntry, 'id'> & { sourceKey: string })[]): Promise<number> {
  const keys = new Set(
    (await db.getAllAsync<{ source_key: string }>('SELECT source_key FROM meal_entries WHERE source_key IS NOT NULL')).map((r) => r.source_key),
  );
  const now = new Date().toISOString();
  let n = 0;
  await db.withTransactionAsync(async () => {
    for (const e of list) {
      if (keys.has(e.sourceKey)) continue;
      await db.runAsync(
        `INSERT INTO meal_entries (id, date, meal, kind, label, food_id, grams, kcal, protein, carbs, fat, created_at, source_key)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        newId(), e.date, e.meal, e.kind, e.label, e.foodId, e.grams, e.kcal, e.protein, e.carbs, e.fat, now, e.sourceKey,
      );
      n++;
    }
  });
  return n;
}

export async function importWeights(db: SQLiteDatabase, list: WeightEntry[]): Promise<number> {
  let n = 0;
  for (const w of list) {
    const r = await db.runAsync('INSERT OR IGNORE INTO body_weights (date, kg, note) VALUES (?, ?, ?)', w.date, w.kg, w.note);
    n += r.changes;
  }
  return n;
}

// ---- Backup completo ----

const TABLES = [
  'cycles',
  'exercises',
  'session_logs',
  'set_logs',
  'settings',
  'checkins',
  'alert_decisions',
  'foods',
  'meal_entries',
  'favorite_meals',
  'body_weights',
  'measurements',
] as const;

export interface Backup {
  format: typeof BACKUP_FORMAT;
  exportedAt: string;
  schemaVersion: number;
  tables: Record<string, Record<string, unknown>[]>;
}

export async function exportBackup(db: SQLiteDatabase): Promise<Backup> {
  const v = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const tables: Backup['tables'] = {};
  for (const t of TABLES) tables[t] = await db.getAllAsync<Record<string, unknown>>(`SELECT * FROM ${t}`);
  return { format: BACKUP_FORMAT, exportedAt: new Date().toISOString(), schemaVersion: v?.user_version ?? 0, tables };
}

/** Restaura um backup, substituindo todos os dados. */
export async function restoreBackup(db: SQLiteDatabase, b: Backup): Promise<void> {
  if (b?.format !== BACKUP_FORMAT || !b.tables) throw new Error('Arquivo não é um backup do app.');
  await db.withTransactionAsync(async () => {
    for (const t of TABLES) {
      const rows = b.tables[t];
      if (!Array.isArray(rows)) continue;
      await db.runAsync(`DELETE FROM ${t}`);
      const cols = (await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${t})`)).map((c) => c.name);
      for (const row of rows) {
        const keys = Object.keys(row).filter((k) => cols.includes(k));
        if (!keys.length) continue;
        await db.runAsync(
          `INSERT OR REPLACE INTO ${t} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
          keys.map((k) => row[k] as string | number | null),
        );
      }
    }
  });
}
