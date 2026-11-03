import type { SQLiteDatabase } from 'expo-sqlite';
import type { SetDraft } from '../domain/logging';
import type { Cycle, Maxes, SessionLog, SetLog } from '../domain/types';

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---- Ciclos ----

export async function getActiveCycle(db: SQLiteDatabase): Promise<Cycle | null> {
  const row = await db.getFirstAsync<{ data: string }>(
    "SELECT data FROM cycles WHERE status = 'active' ORDER BY start_date DESC LIMIT 1",
  );
  return row ? (JSON.parse(row.data) as Cycle) : null;
}

export async function saveCycleData(db: SQLiteDatabase, cycle: Cycle) {
  await db.runAsync('UPDATE cycles SET data = ?, name = ? WHERE id = ?', JSON.stringify(cycle), cycle.name, cycle.id);
}

// ---- Ajustes ----

export async function getSetting<T>(db: SQLiteDatabase, key: string, fallback: T): Promise<T> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

export async function setSetting(db: SQLiteDatabase, key: string, value: unknown) {
  await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', key, JSON.stringify(value));
}

export const maxesKey = (cycleId: string) => `maxes:${cycleId}`;

export async function getMaxes(db: SQLiteDatabase, cycle: Cycle): Promise<Maxes> {
  return getSetting(db, maxesKey(cycle.id), cycle.maxes);
}

// ---- Registro ----

type SessionLogRow = {
  id: string;
  cycle_id: string;
  week: number;
  session_id: string;
  date: string;
  status: SessionLog['status'];
  note: string | null;
};

function toSessionLog(r: SessionLogRow): SessionLog {
  return { id: r.id, cycleId: r.cycle_id, week: r.week, sessionId: r.session_id, date: r.date, status: r.status, note: r.note };
}

type SetLogRow = {
  id: string;
  session_log_id: string;
  item_id: string | null;
  exercise_id: string;
  set_index: number;
  load_kg: number | null;
  reps: number | null;
  duration_sec: number | null;
  rpe: number | null;
  grip: SetLog['grip'];
  belt: number | null;
  failed: number;
  as_planned: number;
  note: string | null;
  done_at: string;
};

function toSetLog(r: SetLogRow): SetLog {
  return {
    id: r.id,
    sessionLogId: r.session_log_id,
    itemId: r.item_id,
    exerciseId: r.exercise_id,
    setIndex: r.set_index,
    loadKg: r.load_kg,
    reps: r.reps,
    durationSec: r.duration_sec,
    rpe: r.rpe,
    grip: r.grip,
    belt: r.belt === null ? null : r.belt === 1,
    failed: r.failed === 1,
    asPlanned: r.as_planned === 1,
    note: r.note,
    doneAt: r.done_at,
  };
}

export async function listSessionLogs(db: SQLiteDatabase, cycleId: string): Promise<SessionLog[]> {
  const rows = await db.getAllAsync<SessionLogRow>(
    'SELECT * FROM session_logs WHERE cycle_id = ? ORDER BY date, created_at',
    cycleId,
  );
  return rows.map(toSessionLog);
}

export async function getSessionLog(db: SQLiteDatabase, cycleId: string, sessionId: string): Promise<SessionLog | null> {
  const row = await db.getFirstAsync<SessionLogRow>(
    'SELECT * FROM session_logs WHERE cycle_id = ? AND session_id = ? ORDER BY created_at LIMIT 1',
    cycleId,
    sessionId,
  );
  return row ? toSessionLog(row) : null;
}

export async function ensureSessionLog(
  db: SQLiteDatabase,
  cycleId: string,
  week: number,
  sessionId: string,
  date: string,
): Promise<SessionLog> {
  const existing = await getSessionLog(db, cycleId, sessionId);
  if (existing) return existing;
  const log: SessionLog = { id: newId(), cycleId, week, sessionId, date, status: 'in_progress', note: null };
  await db.runAsync(
    `INSERT INTO session_logs (id, cycle_id, week, session_id, date, status, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    log.id,
    cycleId,
    week,
    sessionId,
    date,
    log.status,
    null,
    new Date().toISOString(),
  );
  return log;
}

export async function setSessionStatus(db: SQLiteDatabase, id: string, status: SessionLog['status']) {
  await db.runAsync('UPDATE session_logs SET status = ? WHERE id = ?', status, id);
}

export async function setSessionDate(db: SQLiteDatabase, id: string, date: string) {
  await db.runAsync('UPDATE session_logs SET date = ? WHERE id = ?', date, id);
}

export async function listSetLogs(db: SQLiteDatabase, sessionLogId: string): Promise<SetLog[]> {
  const rows = await db.getAllAsync<SetLogRow>(
    'SELECT * FROM set_logs WHERE session_log_id = ? ORDER BY item_id, set_index',
    sessionLogId,
  );
  return rows.map(toSetLog);
}

export async function insertSets(db: SQLiteDatabase, sessionLogId: string, drafts: SetDraft[]): Promise<void> {
  if (drafts.length === 0) return;
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    for (const d of drafts) {
      await db.runAsync(
        `INSERT INTO set_logs (id, session_log_id, item_id, exercise_id, set_index, load_kg, reps, duration_sec,
           rpe, grip, belt, failed, as_planned, note, done_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        newId(),
        sessionLogId,
        d.itemId,
        d.exerciseId,
        d.setIndex,
        d.loadKg,
        d.reps,
        d.durationSec,
        d.rpe,
        d.grip,
        d.belt === null ? null : d.belt ? 1 : 0,
        d.failed ? 1 : 0,
        d.asPlanned ? 1 : 0,
        d.note,
        now,
      );
    }
  });
}

export async function updateSet(db: SQLiteDatabase, s: SetLog): Promise<void> {
  await db.runAsync(
    `UPDATE set_logs SET load_kg = ?, reps = ?, duration_sec = ?, rpe = ?, grip = ?, belt = ?, failed = ?,
       as_planned = ?, note = ? WHERE id = ?`,
    s.loadKg,
    s.reps,
    s.durationSec,
    s.rpe,
    s.grip,
    s.belt === null ? null : s.belt ? 1 : 0,
    s.failed ? 1 : 0,
    s.asPlanned ? 1 : 0,
    s.note,
    s.id,
  );
}

export async function deleteSet(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM set_logs WHERE id = ?', id);
}
