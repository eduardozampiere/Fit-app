import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { AppState, Vibration } from 'react-native';
import { getSetting, setSetting } from '../db/repo';
import { remainingSeconds, restoreTimer } from '../domain/restTimer';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface TimerValue {
  endAt: number | null;
  totalSec: number;
  label: string | null;
  remainingSec: number;
  start: (seconds: number, label: string) => void;
  add: (seconds: number) => void;
  stop: () => void;
}

const Ctx = createContext<TimerValue | null>(null);

let permissionAsked = false;
async function ensurePermission() {
  if (permissionAsked) return;
  permissionAsked = true;
  const current = await Notifications.getPermissionsAsync();
  if (!current.granted) await Notifications.requestPermissionsAsync();
}

const NOTIFICATION_ID = 'rest-timer';
const SAVED_KEY = 'rest-timer';

export function RestTimerProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [endAt, setEndAt] = useState<number | null>(null);
  const [totalSec, setTotalSec] = useState(0);
  const [label, setLabel] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const notifId = useRef<string | null>(null);
  const firedFor = useRef<number | null>(null);

  // Id fixo: depois que o app reabre e restaura o timer, ainda dá para cancelar o aviso já agendado.
  const cancelNotification = useCallback(async () => {
    notifId.current = null;
    await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_ID).catch(() => {});
  }, []);

  const schedule = useCallback(
    async (end: number, what: string) => {
      await cancelNotification();
      const seconds = Math.max(1, Math.round((end - Date.now()) / 1000));
      try {
        await ensurePermission();
        notifId.current = await Notifications.scheduleNotificationAsync({
          identifier: NOTIFICATION_ID,
          content: { title: 'Descanso acabou', body: `Próxima série: ${what}`, sound: true },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds },
        });
      } catch {
        notifId.current = null;
      }
    },
    [cancelNotification],
  );

  const start = useCallback(
    (seconds: number, what: string) => {
      const end = Date.now() + seconds * 1000;
      setNow(Date.now());
      setEndAt(end);
      setTotalSec(seconds);
      setLabel(what);
      firedFor.current = null;
      void schedule(end, what);
    },
    [schedule],
  );

  const add = useCallback(
    (seconds: number) => {
      if (endAt === null) return;
      const end = Math.max(Date.now() + 1000, endAt + seconds * 1000);
      setEndAt(end);
      setTotalSec((t) => Math.max(1, t + seconds));
      firedFor.current = null;
      void schedule(end, label ?? '');
    },
    [schedule, label, endAt],
  );

  const stop = useCallback(() => {
    setEndAt(null);
    setLabel(null);
    void cancelNotification();
  }, [cancelNotification]);

  // Restaura o descanso que estava rodando quando o app foi fechado (só se ainda não acabou).
  useEffect(() => {
    let alive = true;
    (async () => {
      const saved = restoreTimer(await getSetting<unknown>(db, SAVED_KEY, null), Date.now());
      if (!alive || !saved) return;
      setNow(Date.now());
      setEndAt(saved.endAt);
      setTotalSec(saved.totalSec);
      setLabel(saved.label);
    })();
    return () => {
      alive = false;
    };
  }, [db]);

  // Guarda o descanso em andamento para sobreviver ao fechamento do app.
  const loaded = useRef(false);
  useEffect(() => {
    // O primeiro disparo é o estado vazio de antes da restauração: não pode apagar o que foi gravado.
    if (!loaded.current) {
      loaded.current = true;
      return;
    }
    void setSetting(db, SAVED_KEY, endAt === null ? null : { endAt, totalSec, label });
  }, [db, endAt, totalSec, label]);

  useEffect(() => {
    if (endAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [endAt]);

  // Fim com o app aberto: vibra e mantém a barra em "0:00" até eu fechar.
  useEffect(() => {
    if (endAt !== null && now >= endAt && firedFor.current !== endAt && AppState.currentState === 'active') {
      firedFor.current = endAt;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Vibration.vibrate([0, 400, 200, 400]);
    }
  }, [now, endAt]);

  const remainingSec = endAt === null ? 0 : remainingSeconds(endAt, now);

  return (
    <Ctx.Provider value={{ endAt, totalSec, label, remainingSec, start, add, stop }}>{children}</Ctx.Provider>
  );
}

export function useRestTimer(): TimerValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useRestTimer fora do RestTimerProvider');
  return v;
}
