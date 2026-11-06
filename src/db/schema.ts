import type { SQLiteDatabase } from 'expo-sqlite';
import bundledCycle from '../../assets/plan/ciclo_out26_jan27.json';
import { DEFAULT_FAVORITES, DEFAULT_FOODS } from '../domain/nutrition';
import type { Cycle } from '../domain/types';

const DATABASE_VERSION = 6;

/** Migrações por PRAGMA user_version. Nunca editar uma migração já publicada: criar a próxima. */
export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  if (version >= DATABASE_VERSION) return;

  if (version === 0) {
    await db.execAsync(`
PRAGMA journal_mode = 'wal';
CREATE TABLE IF NOT EXISTS cycles (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  status TEXT NOT NULL,            -- planned | active | done
  data TEXT NOT NULL,              -- JSON fitapp.cycle/v1 (editável)
  imported_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  lift TEXT,
  category TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS session_logs (
  id TEXT PRIMARY KEY NOT NULL,
  cycle_id TEXT NOT NULL,
  week INTEGER NOT NULL,
  session_id TEXT NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL,            -- in_progress | done
  note TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_session_logs_cycle ON session_logs(cycle_id, session_id);
CREATE INDEX IF NOT EXISTS idx_session_logs_date ON session_logs(date);
CREATE TABLE IF NOT EXISTS set_logs (
  id TEXT PRIMARY KEY NOT NULL,
  session_log_id TEXT NOT NULL REFERENCES session_logs(id) ON DELETE CASCADE,
  item_id TEXT,
  exercise_id TEXT NOT NULL,
  set_index INTEGER NOT NULL,
  load_kg REAL,
  reps INTEGER,
  duration_sec INTEGER,
  rpe REAL,
  grip TEXT,
  belt INTEGER,
  failed INTEGER NOT NULL DEFAULT 0,
  as_planned INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  done_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_set_logs_session ON set_logs(session_log_id);
CREATE INDEX IF NOT EXISTS idx_set_logs_exercise ON set_logs(exercise_id);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
`);
    await importCycle(db, bundledCycle as unknown as Cycle, 'active');
    version = 1;
  }

  if (version === 1) {
    await db.execAsync(`
CREATE TABLE IF NOT EXISTS checkins (
  date TEXT PRIMARY KEY NOT NULL,   -- um check-in por dia
  low_back INTEGER,
  knee INTEGER,
  wrist INTEGER,
  foot INTEGER,
  sleep_h REAL,
  red_flags TEXT NOT NULL,          -- JSON RedFlags
  note TEXT,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS alert_decisions (
  key TEXT PRIMARY KEY NOT NULL,    -- Alert.key
  cycle_id TEXT NOT NULL,
  status TEXT NOT NULL,             -- accepted | dismissed
  decided_at TEXT NOT NULL
);
`);
    version = 2;
  }

  if (version === 2) {
    await db.execAsync(`
CREATE TABLE IF NOT EXISTS foods (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  kcal REAL NOT NULL,              -- por 100 g
  protein REAL NOT NULL,
  carbs REAL NOT NULL,
  fat REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS meal_entries (
  id TEXT PRIMARY KEY NOT NULL,
  date TEXT NOT NULL,
  meal TEXT NOT NULL,
  kind TEXT NOT NULL,              -- food | oil | custom
  label TEXT NOT NULL,
  food_id TEXT,
  grams REAL,
  kcal REAL NOT NULL,
  protein REAL NOT NULL,
  carbs REAL NOT NULL,
  fat REAL NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_meal_entries_date ON meal_entries(date);
CREATE TABLE IF NOT EXISTS favorite_meals (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  data TEXT NOT NULL               -- JSON { items, oilSpoons }
);
CREATE TABLE IF NOT EXISTS body_weights (
  date TEXT PRIMARY KEY NOT NULL,
  kg REAL NOT NULL,
  note TEXT
);
CREATE TABLE IF NOT EXISTS measurements (
  date TEXT PRIMARY KEY NOT NULL,
  arm_cm REAL,
  thigh_cm REAL,
  waist_cm REAL
);
`);
    for (const f of DEFAULT_FOODS) {
      await db.runAsync(
        'INSERT OR IGNORE INTO foods (id, name, kcal, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?)',
        f.id, f.name, f.kcal, f.protein, f.carbs, f.fat,
      );
    }
    for (const fav of DEFAULT_FAVORITES) {
      await db.runAsync(
        'INSERT OR IGNORE INTO favorite_meals (id, name, data) VALUES (?, ?, ?)',
        fav.id, fav.name, JSON.stringify({ items: fav.items, oilSpoons: fav.oilSpoons }),
      );
    }
    version = 3;
  }

  if (version === 3) {
    // Origem da importação (Hevy/CSV antigo): evita duplicar ao importar de novo.
    await db.execAsync(`
ALTER TABLE set_logs ADD COLUMN source_key TEXT;
ALTER TABLE meal_entries ADD COLUMN source_key TEXT;
CREATE INDEX IF NOT EXISTS idx_set_logs_source ON set_logs(source_key);
CREATE INDEX IF NOT EXISTS idx_meal_entries_source ON meal_entries(source_key);
`);
    version = 4;
  }

  if (version === 4) {
    // Séries de aquecimento: numeração própria e fora de volume, regras e análises.
    await db.execAsync(`ALTER TABLE set_logs ADD COLUMN warmup INTEGER NOT NULL DEFAULT 0;`);
    version = 5;
  }

  if (version === 5) {
    // Tipo da série de trabalho: normal, até a falha ou drop set (aquecimento continua na coluna warmup).
    await db.execAsync(`ALTER TABLE set_logs ADD COLUMN set_type TEXT NOT NULL DEFAULT 'normal';`);
    version = 6;
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}

/** Grava um ciclo e mescla seus exercícios no catálogo global. */
export async function importCycle(db: SQLiteDatabase, cycle: Cycle, status: 'planned' | 'active' | 'done') {
  await db.withTransactionAsync(async () => {
    if (status === 'active') await db.runAsync("UPDATE cycles SET status = 'done' WHERE status = 'active'");
    await db.runAsync(
      `INSERT OR REPLACE INTO cycles (id, name, start_date, end_date, status, data, imported_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      cycle.id,
      cycle.name,
      cycle.startDate,
      cycle.endDate,
      status,
      JSON.stringify(cycle),
      new Date().toISOString(),
    );
    for (const e of cycle.exercises) {
      await db.runAsync(
        'INSERT OR IGNORE INTO exercises (id, name, lift, category) VALUES (?, ?, ?, ?)',
        e.id,
        e.name,
        e.lift,
        e.category,
      );
    }
  });
}
