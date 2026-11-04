import type { SQLiteDatabase } from 'expo-sqlite';
import type { SetDraft } from '../domain/logging';
import { NO_RED_FLAGS, type CheckIn, type LoggedSession } from '../domain/rules';
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
  warmup: number;
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
    warmup: r.warmup === 1,
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
           rpe, grip, belt, failed, as_planned, warmup, note, done_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        d.warmup ? 1 : 0,
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

/** Apaga uma série e renumera as seguintes (ver `renumberAfterRemoval`), numa transação. */
export async function deleteSetAndRenumber(
  db: SQLiteDatabase,
  id: string | null,
  renumber: { id: string; setIndex: number }[],
): Promise<void> {
  await db.withTransactionAsync(async () => {
    if (id) await db.runAsync('DELETE FROM set_logs WHERE id = ?', id);
    for (const r of renumber) await db.runAsync('UPDATE set_logs SET set_index = ? WHERE id = ?', r.setIndex, r.id);
  });
}

/** Séries adicionadas ou removidas no treino do dia, por item (chave: id do item). */
export const setCountsKey = (sessionLogId: string) => `set-counts:${sessionLogId}`;

/** Linhas de aquecimento adicionadas no treino do dia, por item. */
export const warmupCountsKey = (sessionLogId: string) => `warmup-counts:${sessionLogId}`;

/** Ordem dos exercícios no treino do dia (ids do primeiro item de cada bloco). */
export const exerciseOrderKey = (sessionLogId: string) => `exercise-order:${sessionLogId}`;

// ---- Check-in ----

type CheckInRow = {
  date: string;
  low_back: number | null;
  knee: number | null;
  wrist: number | null;
  foot: number | null;
  sleep_h: number | null;
  red_flags: string;
  note: string | null;
};

function toCheckIn(r: CheckInRow): CheckIn {
  let redFlags = NO_RED_FLAGS;
  try {
    redFlags = { ...NO_RED_FLAGS, ...JSON.parse(r.red_flags) };
  } catch {
    // mantém sem sinais
  }
  return { date: r.date, lowBack: r.low_back, knee: r.knee, wrist: r.wrist, foot: r.foot, sleepH: r.sleep_h, redFlags, note: r.note };
}

export async function listCheckins(db: SQLiteDatabase, limit = 400): Promise<CheckIn[]> {
  const rows = await db.getAllAsync<CheckInRow>('SELECT * FROM checkins ORDER BY date DESC LIMIT ?', limit);
  return rows.map(toCheckIn);
}

export async function saveCheckin(db: SQLiteDatabase, c: CheckIn): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO checkins (date, low_back, knee, wrist, foot, sleep_h, red_flags, note, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    c.date,
    c.lowBack,
    c.knee,
    c.wrist,
    c.foot,
    c.sleepH,
    JSON.stringify(c.redFlags),
    c.note,
    new Date().toISOString(),
  );
}

// ---- Alertas ----

export type AlertDecision = 'accepted' | 'dismissed';

export async function listAlertDecisions(db: SQLiteDatabase, cycleId: string): Promise<Map<string, AlertDecision>> {
  const rows = await db.getAllAsync<{ key: string; status: AlertDecision }>(
    'SELECT key, status FROM alert_decisions WHERE cycle_id = ?',
    cycleId,
  );
  return new Map(rows.map((r) => [r.key, r.status]));
}

export async function decideAlert(db: SQLiteDatabase, cycleId: string, key: string, status: AlertDecision) {
  await db.runAsync(
    'INSERT OR REPLACE INTO alert_decisions (key, cycle_id, status, decided_at) VALUES (?, ?, ?, ?)',
    key,
    cycleId,
    status,
    new Date().toISOString(),
  );
}

/**
 * Todas as sessões do ciclo com suas séries de trabalho (entrada do motor de regras, das análises, do
 * pacote para o Claude e da exportação). O aquecimento fica de fora; o backup guarda tudo.
 */
export async function listLoggedSessions(db: SQLiteDatabase, cycleId: string): Promise<LoggedSession[]> {
  const logs = await listSessionLogs(db, cycleId);
  const rows = await db.getAllAsync<SetLogRow>(
    `SELECT s.* FROM set_logs s JOIN session_logs l ON l.id = s.session_log_id WHERE l.cycle_id = ? AND s.warmup = 0 ORDER BY s.set_index`,
    cycleId,
  );
  const bySession = new Map<string, SetLog[]>();
  for (const r of rows) {
    const list = bySession.get(r.session_log_id) ?? [];
    list.push(toSetLog(r));
    bySession.set(r.session_log_id, list);
  }
  return logs.map((log) => ({ log, sets: bySession.get(log.id) ?? [] }));
}

export interface CycleRow {
  cycle: Cycle;
  status: 'planned' | 'active' | 'done';
}

export async function listCycles(db: SQLiteDatabase): Promise<CycleRow[]> {
  const rows = await db.getAllAsync<{ data: string; status: CycleRow['status'] }>(
    'SELECT data, status FROM cycles ORDER BY start_date DESC',
  );
  return rows.map((r) => ({ cycle: JSON.parse(r.data) as Cycle, status: r.status }));
}

export async function setActiveCycle(db: SQLiteDatabase, id: string): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync("UPDATE cycles SET status = 'done' WHERE status = 'active'");
    await db.runAsync("UPDATE cycles SET status = 'active' WHERE id = ?", id);
  });
}

export async function exerciseNames(db: SQLiteDatabase): Promise<Map<string, string>> {
  const rows = await db.getAllAsync<{ id: string; name: string }>('SELECT id, name FROM exercises');
  return new Map(rows.map((r) => [r.id, r.name]));
}
