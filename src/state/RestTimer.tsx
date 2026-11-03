import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Vibration } from 'react-native';

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

export function RestTimerProvider({ children }: { children: ReactNode }) {
  const [endAt, setEndAt] = useState<number | null>(null);
  const [totalSec, setTotalSec] = useState(0);
  const [label, setLabel] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const notifId = useRef<string | null>(null);
  const firedFor = useRef<number | null>(null);

  const cancelNotification = useCallback(async () => {
    if (notifId.current) {
      await Notifications.cancelScheduledNotificationAsync(notifId.current).catch(() => {});
      notifId.current = null;
    }
  }, []);

  const schedule = useCallback(
    async (end: number, what: string) => {
      await cancelNotification();
      const seconds = Math.max(1, Math.round((end - Date.now()) / 1000));
      try {
        await ensurePermission();
        notifId.current = await Notifications.scheduleNotificationAsync({
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

  const remainingSec = endAt === null ? 0 : Math.max(0, Math.ceil((endAt - now) / 1000));

  return (
    <Ctx.Provider value={{ endAt, totalSec, label, remainingSec, start, add, stop }}>{children}</Ctx.Provider>
  );
}

export function useRestTimer(): TimerValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useRestTimer fora do RestTimerProvider');
  return v;
}
