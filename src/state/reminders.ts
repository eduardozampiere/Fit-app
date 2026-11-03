import * as Notifications from 'expo-notifications';

export interface ReminderSettings {
  enabled: boolean;
  hour: number;
  minute: number;
}

export const DEFAULT_REMINDER: ReminderSettings = { enabled: false, hour: 7, minute: 0 };
const ID = 'checkin-diario';

/** Agenda (ou cancela) o lembrete diário do check-in. Retorna false se a permissão foi negada. */
export async function applyCheckinReminder(r: ReminderSettings): Promise<boolean> {
  await Notifications.cancelScheduledNotificationAsync(ID).catch(() => {});
  if (!r.enabled) return true;
  const perm = await Notifications.requestPermissionsAsync();
  if (!perm.granted) return false;
  await Notifications.scheduleNotificationAsync({
    identifier: ID,
    content: { title: 'Check-in do dia', body: 'Lombar, joelho, punho, pé e sono: 10 segundos.', sound: true },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: r.hour, minute: r.minute },
  });
  return true;
}
