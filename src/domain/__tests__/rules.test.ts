import { describe, expect, it } from 'vitest';
import cycleJson from '../../../assets/plan/ciclo_out26_jan27.json';
import { addDays } from '../dates';
import { liftOf, sessionDate } from '../plan';
import {
  activationAlerts,
  applySuggestion,
  brakeAndGateAlerts,
  deloadAlerts,
  evaluateCycle,
  gripForSet,
  gripTip,
  hasRedFlags,
  maxReviewAlerts,
  NO_RED_FLAGS,
  pain24hAlert,
  sessionLocks,
  weekRedSignals,
  type CheckIn,
  type LoggedSession,
} from '../rules';
import type { Cycle, Lift, PrescribedItem, SetLog } from '../types';

const cycle = cycleJson as unknown as Cycle;
const week = (n: number) => cycle.weeks.find((w) => w.number === n)!;
const session = (w: number, wd: number) => week(w).sessions.find((s) => s.weekday === wd)!;
const mainOf = (w: number, lift: Lift) => {
  for (const s of week(w).sessions) {
    const it = s.items.find((i) => i.kind === 'main' && liftOf(cycle, i) === lift);
    if (it) return { s, it };
  }
  throw new Error('sem principal');
};
const DAY = { squat: 1, bench: 2, deadlift: 3 } as const;

let seq = 0;
function set(item: PrescribedItem, setIndex: number, extra: Partial<SetLog> = {}): SetLog {
  return {
    id: `s${++seq}`,
    sessionLogId: 'x',
    itemId: item.id,
    exerciseId: item.exerciseId,
    setIndex,
    loadKg: item.load?.min ?? null,
    reps: item.reps?.min ?? null,
    durationSec: null,
    rpe: null,
    grip: null,
    belt: null,
    failed: false,
    asPlanned: false,
    warmup: false, setType: 'normal',
    note: null,
    doneAt: '2026-01-01T00:00:00Z',
    ...extra,
  };
}

/** Sessão registrada com todas as séries do item principal; a última com o RPE dado. */
function loggedMain(w: number, lift: Lift, lastRpe: number | null, allRpe?: number): LoggedSession {
  const { s, it } = mainOf(w, lift);
  const n = it.sets!.min;
  const sets = Array.from({ length: n }, (_, i) =>
    set(it, i + 1, { rpe: i === n - 1 ? lastRpe : (allRpe ?? null) }),
  );
  return {
    log: { id: `log-${w}-${lift}`, cycleId: cycle.id, week: w, sessionId: s.id, date: sessionDate(week(w), s), status: 'done', note: null, startedAt: null, endedAt: null },
    sets,
  };
}

function checkin(date: string, extra: Partial<CheckIn> = {}): CheckIn {
  return { date, lowBack: 0, knee: 0, wrist: 0, foot: 0, sleepH: 8, redFlags: NO_RED_FLAGS, note: null, ...extra };
}

describe('regra 1 — freio', () => {
  it('RPE ≥ alvo + 1 sugere repetir a carga na semana seguinte', () => {
    // S2 agacho 5x4 @145, alvo 7 → RPE 8 dispara
    const alerts = brakeAndGateAlerts(cycle, [loggedMain(2, 'squat', 8)]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].rule).toBe('brake');
    expect(alerts[0].suggestion).toEqual({ type: 'set_load', week: 3, lift: 'squat', loadKg: 145 });
  });

  it('dentro do alvo não dispara', () => {
    expect(brakeAndGateAlerts(cycle, [loggedMain(2, 'squat', 7.5)])).toHaveLength(0);
  });

  it('sem RPE não dispara', () => {
    expect(brakeAndGateAlerts(cycle, [loggedMain(2, 'squat', null)])).toHaveLength(0);
  });

  it('usa a última série com RPE', () => {
    const ls = loggedMain(2, 'squat', null, 8); // séries 1–4 em 8, a 5ª sem RPE
    expect(brakeAndGateAlerts(cycle, [ls])).toHaveLength(1);
  });
});

describe('regra 2 — portões', () => {
  it('S11: agacho 190 em RPE ≤ 8,5 libera o 200', () => {
    const a = brakeAndGateAlerts(cycle, [loggedMain(11, 'squat', 8.5)]);
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({ rule: 'gate', severity: 'info' });
    expect(a[0].suggestion).toBeUndefined();
  });

  it('S11: agacho 190 em RPE 9 sugere 195 na S12', () => {
    const a = brakeAndGateAlerts(cycle, [loggedMain(11, 'squat', 9)]);
    expect(a[0].suggestion).toEqual({ type: 'set_load', week: 12, lift: 'squat', loadKg: 195 });
  });

  it('mesma lógica no supino (165→175/170) e no terra (230→240/235)', () => {
    const a = brakeAndGateAlerts(cycle, [loggedMain(11, 'bench', 9.5), loggedMain(11, 'deadlift', 9)]);
    const byLift = Object.fromEntries(a.map((x) => [x.key.split(':')[2], x.suggestion]));
    expect(byLift.bench).toMatchObject({ week: 12, loadKg: 170 });
    expect(byLift.deadlift).toMatchObject({ week: 12, loadKg: 235 });
  });

  it('S9–S13 usa o rótulo de portão no freio', () => {
    const a = brakeAndGateAlerts(cycle, [loggedMain(9, 'squat', 9.5)]); // alvo 8 → 9,5 ≥ 9
    expect(a[0].title).toMatch(/^Portão/);
    expect(a[0].suggestion).toMatchObject({ week: 10, loadKg: 180 });
  });
});

describe('regra 3 — single de ativação', () => {
  function loggedActivation(w: number, lift: Lift, rpe: number): LoggedSession {
    const s = session(w, DAY[lift]);
    const it = s.items.find((i) => i.kind === 'activation_single')!;
    return {
      log: { id: `a-${w}`, cycleId: cycle.id, week: w, sessionId: s.id, date: sessionDate(week(w), s), status: 'done', note: null, startedAt: null, endedAt: null },
      sets: [set(it, 1, { rpe })],
    };
  }

  it('RPE ≥ 8 marca cansaço, sem sugestão fora da S7–S8', () => {
    const a = activationAlerts(cycle, [loggedActivation(2, 'squat', 8)]);
    expect(a).toHaveLength(1);
    expect(a[0].suggestion).toBeUndefined();
  });

  it('na S7 sugere pular os singles seguintes', () => {
    const a = activationAlerts(cycle, [loggedActivation(7, 'squat', 8.5)]);
    expect(a[0].suggestion).toEqual({ type: 'skip_activation', weeks: [8], lift: 'squat' });
  });

  it('RPE 7,5 não dispara', () => {
    expect(activationAlerts(cycle, [loggedActivation(2, 'squat', 7.5)])).toHaveLength(0);
  });
});

describe('regra 4 — 4ª série do terra (S4–S6)', () => {
  const w = week(5);
  const s = session(5, 3);
  const dl = s.items.find((i) => i.kind === 'main')!;

  it('bloqueia a 4ª sem a 3ª registrada', () => {
    expect(sessionLocks(cycle, w, s.items, []).get(dl.id)?.fromSet).toBe(4);
  });

  it('libera com a 3ª em RPE ≤ 8,5', () => {
    expect(sessionLocks(cycle, w, s.items, [set(dl, 3, { rpe: 8.5 })]).has(dl.id)).toBe(false);
  });

  it('mantém bloqueada com a 3ª em RPE 9 ou sem RPE', () => {
    expect(sessionLocks(cycle, w, s.items, [set(dl, 3, { rpe: 9 })]).get(dl.id)?.reason).toMatch(/para em 3/);
    expect(sessionLocks(cycle, w, s.items, [set(dl, 3)]).get(dl.id)?.reason).toMatch(/Informe o RPE/);
  });

  it('não vale fora das semanas 4–6', () => {
    const s2 = session(2, 3);
    expect(sessionLocks(cycle, week(2), s2.items, []).size).toBe(0);
  });
});

describe('regra 5 — falhou no terra', () => {
  const s = session(2, 3);
  const dl = s.items.find((i) => i.kind === 'main')!;
  const stiff = s.items.find((i) => i.name.startsWith('Stiff'))!;
  const row = s.items.find((i) => i.name.startsWith('Remada'))!;

  it('encerra as séries seguintes do terra e o stiff', () => {
    const locks = sessionLocks(cycle, week(2), s.items, [set(dl, 1), set(dl, 2, { failed: true })]);
    expect(locks.get(dl.id)).toMatchObject({ fromSet: 3, undoable: true });
    expect(locks.get(stiff.id)?.fromSet).toBe(1);
    expect(locks.has(row.id)).toBe(false);
  });

  it('pode desfazer', () => {
    expect(sessionLocks(cycle, week(2), s.items, [set(dl, 2, { failed: true })], true).size).toBe(0);
  });
});

describe('regra 6 — deload sob demanda', () => {
  const start = week(3).start;

  it('2 sinais (dor + sono) sugerem deload na semana seguinte', () => {
    const checkins = [
      checkin(start, { lowBack: 4, sleepH: 5.5 }),
      checkin(addDays(start, 1), { sleepH: 5 }),
      checkin(addDays(start, 2), { sleepH: 5.9 }),
    ];
    const s = weekRedSignals(cycle, 3, [], checkins);
    expect(s).toMatchObject({ pain: true, shortSleep: true, highRpe: false, count: 2 });
    const a = deloadAlerts(cycle, [], checkins);
    expect(a).toHaveLength(1);
    expect(a[0].suggestion).toEqual({ type: 'deload', week: 4, volumeCut: 0.4 });
  });

  it('RPE alto em 2 sessões conta como sinal', () => {
    const logged = [loggedMain(3, 'squat', 8.5), loggedMain(3, 'bench', 9)]; // alvo 7–7,5
    expect(weekRedSignals(cycle, 3, logged, []).highRpe).toBe(true);
  });

  it('1 sinal só não sugere', () => {
    expect(deloadAlerts(cycle, [], [checkin(start, { knee: 5 })])).toHaveLength(0);
  });
});

describe('regra 7 — revisão dos máximos', () => {
  const logged = [1, 2, 3, 4, 5, 6].map((w) => loggedMain(w, 'squat', null, 0)).map((ls, i) => {
    // top sets 1,5 ponto abaixo do meio do alvo da semana
    const w = i + 1;
    const t = week(w).sessions[0].items.find((x) => x.kind === 'main')!.rpe!;
    const mid = ((t.min ?? t.max) + t.max) / 2;
    return { ...ls, sets: ls.sets.map((s) => ({ ...s, rpe: Math.round((mid - 1.5) * 2) / 2 })) };
  });

  it('só avalia depois da semana 6', () => {
    expect(maxReviewAlerts(cycle, logged, '2026-12-01')).toHaveLength(0);
  });

  it('média ≥ 1 ponto abaixo sugere +5 kg para S7–S13', () => {
    const a = maxReviewAlerts(cycle, logged, '2026-12-06');
    expect(a).toHaveLength(1);
    expect(a[0].suggestion).toEqual({ type: 'increase_max', lift: 'squat', incrementKg: 5, weeks: { from: 7, to: 13 } });
  });

  it('na média: mantém', () => {
    const onTarget = [1, 2, 3, 4, 5, 6].map((w) => loggedMain(w, 'squat', null, 0)).map((ls, i) => {
      const t = week(i + 1).sessions[0].items.find((x) => x.kind === 'main')!.rpe!;
      return { ...ls, sets: ls.sets.map((s) => ({ ...s, rpe: t.max })) };
    });
    const a = maxReviewAlerts(cycle, onTarget, '2026-12-06');
    expect(a[0].severity).toBe('info');
    expect(a[0].suggestion).toBeUndefined();
  });
});

describe('regras 8 e 9 — check-in', () => {
  it('24 h: lombar pior que ontem alerta', () => {
    const a = pain24hAlert(cycle, [checkin('2026-11-02', { lowBack: 2 }), checkin('2026-11-03', { lowBack: 3 })], '2026-11-03');
    expect(a?.rule).toBe('pain_24h');
    expect(a?.week).toBe(2);
  });

  it('24 h: igual ou melhor não alerta; sem check-in anterior não alerta', () => {
    expect(pain24hAlert(cycle, [checkin('2026-11-02', { knee: 3 }), checkin('2026-11-03', { knee: 3 })], '2026-11-03')).toBeNull();
    expect(pain24hAlert(cycle, [checkin('2026-11-03', { knee: 3 })], '2026-11-03')).toBeNull();
  });

  it('sinais de alarme', () => {
    expect(hasRedFlags(checkin('2026-11-03'))).toBe(false);
    expect(hasRedFlags(checkin('2026-11-03', { redFlags: { ...NO_RED_FLAGS, legWeakness: true } }))).toBe(true);
  });
});

describe('regra 10 — pegada do terra', () => {
  const s2 = session(2, 3);
  const dl2 = s2.items.find((i) => i.kind === 'main')!;
  const stiff = s2.items.find((i) => i.name.startsWith('Stiff'))!;
  const dl8 = session(8, 3).items.find((i) => liftOf(cycle, i) === 'deadlift' && !i.name.startsWith('Stiff'))!;

  it('volume: hook nas 2 primeiras, strap no resto', () => {
    expect(gripForSet(cycle, week(2), dl2, 1)).toBe('hook');
    expect(gripForSet(cycle, week(2), dl2, 2)).toBe('hook');
    expect(gripForSet(cycle, week(2), dl2, 3)).toBe('strap');
    expect(gripTip(cycle, week(2), dl2)).toMatch(/hook nas 2/);
  });

  it('stiff sempre strap; S7+ hook em tudo', () => {
    expect(gripForSet(cycle, week(2), stiff, 1)).toBe('strap');
    expect(gripForSet(cycle, week(8), dl8, 4)).toBe('hook');
  });

  it('não se aplica fora do terra', () => {
    expect(gripTip(cycle, week(2), session(2, 1).items[1])).toBeNull();
  });
});

describe('aplicar sugestões', () => {
  it('set_load troca a carga do principal daquela semana', () => {
    const c = applySuggestion(cycle, { type: 'set_load', week: 12, lift: 'squat', loadKg: 195 });
    const it = c.weeks.find((w) => w.number === 12)!.sessions[0].items.find((i) => i.kind === 'main')!;
    expect(it.load).toEqual({ min: 195, max: 195 });
    expect(it.pctBased).toBe(false);
    expect(cycle.weeks.find((w) => w.number === 12)!.sessions[0].items.find((i) => i.kind === 'main')!.load!.min).toBe(200); // imutável
  });

  it('deload corta 40% das séries', () => {
    const c = applySuggestion(cycle, { type: 'deload', week: 4, volumeCut: 0.4 });
    const it = c.weeks.find((w) => w.number === 4)!.sessions[0].items.find((i) => i.kind === 'main')!; // 5x4
    expect(it.sets).toEqual({ min: 3, max: 3 });
    expect(it.setsText).toBe('3x4');
    expect(it.load).toEqual(week(4).sessions[0].items.find((i) => i.kind === 'main')!.load); // mesmas cargas
  });

  it('skip_activation remove os singles', () => {
    const c = applySuggestion(cycle, { type: 'skip_activation', weeks: [8], lift: 'squat' });
    const s = c.weeks.find((w) => w.number === 8)!.sessions[0];
    expect(s.items.some((i) => i.kind === 'activation_single')).toBe(false);
  });

  it('increase_max recalcula as cargas por % das semanas 7–13', () => {
    const c = applySuggestion(cycle, { type: 'increase_max', lift: 'squat', incrementKg: 5, weeks: { from: 7, to: 13 } });
    const it7 = c.weeks.find((w) => w.number === 7)!.sessions[0].items.find((i) => i.kind === 'main')!; // 85% de 205
    expect(it7.load).toEqual({ min: 175, max: 175 });
    const it6 = c.weeks.find((w) => w.number === 6)!.sessions[0].items.find((i) => i.kind === 'main')!;
    expect(it6.load).toEqual({ min: 165, max: 165 });
  });
});

describe('evaluateCycle', () => {
  it('junta alertas de todas as regras', () => {
    const a = evaluateCycle(cycle, [loggedMain(2, 'squat', 8)], [checkin('2026-11-02'), checkin('2026-11-03', { knee: 2 })], '2026-11-03');
    expect(a.map((x) => x.rule).sort()).toEqual(['brake', 'pain_24h']);
  });
});
