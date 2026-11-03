import * as Notifications from 'expo-notifications';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { getSetting, setSetting } from '../db/repo';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BigButton, Card, Chip, SectionTitle, Stepper } from '../components/ui';
import { formatKg, formatNumber } from '../domain/format';
import { LIFT_LABEL, LIFTS } from '../domain/plan';
import type { Maxes } from '../domain/types';
import { useAppData } from '../state/AppData';
import { applyCheckinReminder, DEFAULT_REMINDER, type ReminderSettings } from '../state/reminders';
import { useTheme } from '../ui/theme';

const ALL_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

export default function SettingsScreen() {
  const t = useTheme();
  const { cycle, maxes, gym, setGym, targets } = useAppData();
  if (!cycle || !maxes) return null;

  const testNotification = async () => {
    const perm = await Notifications.requestPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Notificações bloqueadas', 'Libere as notificações do Expo Go nos Ajustes do iPhone para o cronômetro tocar com a tela bloqueada.');
      return;
    }
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Teste do cronômetro', body: 'Se você ouviu/viu isso, o descanso vai avisar.', sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5 },
    });
    Alert.alert('Agendado', 'Bloqueie a tela: a notificação chega em 5 segundos.');
  };

  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={styles.body} contentInsetAdjustmentBehavior="automatic">

        <SectionTitle>Máximos de referência</SectionTitle>
        <MaxesEditor key={JSON.stringify(maxes)} />

        <SectionTitle>Academia</SectionTitle>
        <Card>
          <Stepper label="Barra" value={gym.barKg} step={5} min={5} onChange={(v) => setGym({ ...gym, barKg: v })} format={formatKg} />
          <Text style={{ color: t.muted, fontSize: 14 }}>Anilhas disponíveis (toque para ligar/desligar):</Text>
          <View style={styles.wrap}>
            {ALL_PLATES.map((p) => {
              const on = gym.plates.includes(p);
              return (
                <Chip
                  key={p}
                  label={formatNumber(p, 2)}
                  selected={on}
                  accessibilityLabel={`Anilha de ${formatNumber(p, 2)} quilos, ${on ? 'disponível' : 'indisponível'}`}
                  onPress={() =>
                    setGym({ ...gym, plates: on ? gym.plates.filter((x) => x !== p) : [...gym.plates, p].sort((a, b) => b - a) })
                  }
                />
              );
            })}
          </View>
        </Card>

        <SectionTitle>Alimentação</SectionTitle>
        <TargetsEditor key={JSON.stringify(targets)} />

        <SectionTitle>Lembrete do check-in</SectionTitle>
        <ReminderEditor />

        <SectionTitle>Cronômetro de descanso</SectionTitle>
        <Card>
          <Text style={{ color: t.muted, fontSize: 14 }}>
            O aviso chega por notificação mesmo com a tela bloqueada. Teste uma vez na academia com o celular no silencioso.
          </Text>
          <BigButton label="Testar notificação (5 s)" variant="neutral" onPress={testNotification} />
        </Card>

        <Text style={{ color: t.muted, fontSize: 13, textAlign: 'center' }}>
          {cycle.name} · {cycle.weeks.length} semanas · dados salvos só neste aparelho
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function TargetsEditor() {
  const { targets, setTargets } = useAppData();
  const [d, setD] = useState(targets);
  const changed = JSON.stringify(d) !== JSON.stringify(targets);
  const fmt = (unit: string) => (v: number | null) => `${formatNumber(v ?? 0, 0)} ${unit}`;
  return (
    <Card>
      <Stepper label="Calorias em dia de treino" value={d.trainingKcal} step={50} onChange={(v) => setD({ ...d, trainingKcal: v })} format={fmt('kcal')} />
      <Stepper label="Calorias em dia de descanso" value={d.restKcal} step={50} onChange={(v) => setD({ ...d, restKcal: v })} format={fmt('kcal')} />
      <Stepper label="Proteína por dia" value={d.protein} step={5} onChange={(v) => setD({ ...d, protein: v })} format={fmt('g')} />
      <Stepper label="Óleo de preparo (por colher)" value={d.oilKcalPerSpoon} step={5} onChange={(v) => setD({ ...d, oilKcalPerSpoon: v })} format={fmt('kcal')} />
      <BigButton label="Salvar alvos" disabled={!changed} onPress={() => setTargets(d)} />
    </Card>
  );
}

function ReminderEditor() {
  const t = useTheme();
  const db = useSQLiteContext();
  const [r, setR] = useState<ReminderSettings | null>(null);
  useEffect(() => {
    getSetting(db, 'checkinReminder', DEFAULT_REMINDER).then(setR);
  }, [db]);
  if (!r) return null;
  const save = async (next: ReminderSettings) => {
    const ok = await applyCheckinReminder(next);
    if (!ok) {
      Alert.alert('Notificações bloqueadas', 'Libere as notificações do app nos Ajustes do iPhone.');
      return;
    }
    await setSetting(db, 'checkinReminder', next);
    setR(next);
  };
  const two = (n: number) => String(n).padStart(2, '0');
  return (
    <Card>
      <View style={styles.wrap}>
        <Chip label="Ligado" selected={r.enabled} onPress={() => save({ ...r, enabled: true })} />
        <Chip label="Desligado" selected={!r.enabled} onPress={() => save({ ...r, enabled: false })} />
      </View>
      {r.enabled ? (
        <>
          <Stepper label="Hora" value={r.hour} step={1} onChange={(v) => save({ ...r, hour: ((v % 24) + 24) % 24 })} format={(v) => two(v ?? 0)} />
          <Stepper label="Minuto" value={r.minute} step={15} onChange={(v) => save({ ...r, minute: ((v % 60) + 60) % 60 })} format={(v) => two(v ?? 0)} />
          <Text style={{ color: t.muted, fontSize: 14 }}>Todo dia às {two(r.hour)}:{two(r.minute)}.</Text>
        </>
      ) : null}
    </Card>
  );
}

function MaxesEditor() {
  const t = useTheme();
  const { cycle, maxes, setMaxes } = useAppData();
  const [draft, setDraft] = useState<Maxes>(maxes!);
  if (!cycle || !maxes) return null;
  const changed = LIFTS.some((l) => draft[l] !== maxes[l]);
  return (
    <Card>
      <Text style={{ color: t.muted, fontSize: 14 }}>
        Ao mudar um máximo, as cargas por % daquele movimento são recalculadas (múltiplos de {formatNumber(cycle.ruleParams.loadRounding)} kg).
        Plano original: agacho {cycle.maxes.squat} · supino {cycle.maxes.bench} · terra {cycle.maxes.deadlift}.
      </Text>
      {LIFTS.map((l) => (
        <Stepper key={l} label={LIFT_LABEL[l]} value={draft[l]} step={5} onChange={(v) => setDraft({ ...draft, [l]: v })} format={formatKg} />
      ))}
      <View style={{ gap: 8 }}>
        <BigButton label="Salvar máximos" disabled={!changed} onPress={() => setMaxes(draft)} />
        {LIFTS.some((l) => maxes[l] !== cycle.maxes[l]) ? (
          <BigButton label="Voltar aos máximos do plano" variant="neutral" onPress={() => setMaxes(cycle.maxes)} />
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 12, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
