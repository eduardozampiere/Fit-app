import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { decideAlert, listAlertDecisions, listCheckins, listLoggedSessions, type AlertDecision } from '../db/repo';
import { toISODate } from '../domain/dates';
import { applySuggestion, evaluateCycle, type Alert, type CheckIn, type LoggedSession } from '../domain/rules';
import { useAppData } from './AppData';

export interface CoachState {
  ready: boolean;
  today: string;
  checkins: CheckIn[]; // mais recente primeiro
  todayCheckin: CheckIn | null;
  alerts: Alert[];
  pending: Alert[];
  decisions: Map<string, AlertDecision>;
  logged: LoggedSession[];
  /** Aceitar aplica a sugestão no plano; ignorar só registra. */
  decide: (alert: Alert, status: AlertDecision) => Promise<void>;
}

/** Junta registros, check-ins e decisões e roda o motor de regras. */
export function useCoach(): CoachState {
  const db = useSQLiteContext();
  const { cycle, version, bump, updateCycle } = useAppData();
  const today = toISODate(new Date());
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [logged, setLogged] = useState<LoggedSession[]>([]);
  const [decisions, setDecisions] = useState<Map<string, AlertDecision>>(new Map());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!cycle) return;
    let alive = true;
    (async () => {
      const [c, l, d] = await Promise.all([listCheckins(db), listLoggedSessions(db, cycle.id), listAlertDecisions(db, cycle.id)]);
      if (!alive) return;
      setCheckins(c);
      setLogged(l);
      setDecisions(d);
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [db, cycle, version]);

  const alerts = useMemo(() => (cycle ? evaluateCycle(cycle, logged, checkins, today) : []), [cycle, logged, checkins, today]);
  const pending = useMemo(() => alerts.filter((a) => !decisions.has(a.key)), [alerts, decisions]);

  const decide = useCallback(
    async (alert: Alert, status: AlertDecision) => {
      if (!cycle) return;
      if (status === 'accepted' && alert.suggestion) await updateCycle(applySuggestion(cycle, alert.suggestion));
      await decideAlert(db, cycle.id, alert.key, status);
      bump();
    },
    [db, cycle, updateCycle, bump],
  );

  return {
    ready,
    today,
    checkins,
    todayCheckin: checkins.find((c) => c.date === today) ?? null,
    alerts,
    pending,
    decisions,
    logged,
    decide,
  };
}
