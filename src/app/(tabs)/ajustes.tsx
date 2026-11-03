import * as Notifications from 'expo-notifications';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BigButton, Card, Chip, SectionTitle, Stepper } from '../../components/ui';
import { formatKg, formatNumber } from '../../domain/format';
import { LIFT_LABEL } from '../../domain/plan';
import type { Lift, Maxes } from '../../domain/types';
import { useAppData } from '../../state/AppData';
import { useTheme } from '../../ui/theme';

const ALL_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
const LIFTS: Lift[] = ['squat', 'bench', 'deadlift'];

export default function SettingsScreen() {
  const t = useTheme();
  const { cycle, maxes, gym, setGym } = useAppData();
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
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={[styles.title, { color: t.text }]} accessibilityRole="header">
          Ajustes
        </Text>

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
