import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getSetting, setSetting } from '../db/repo';
import { formatKg, formatNumber } from '../domain/format';
import { barChoices, platesFor } from '../domain/plates';
import { useAppData } from '../state/AppData';
import { font, radius, space, useTheme } from '../ui/theme';
import { BigButton, Chip, SectionTitle, Stepper } from './ui';

/** Barra escolhida por exercício (ex.: barra de 15 no supino inclinado), lembrada entre treinos. */
const barKey = (exerciseId: string) => `bar:${exerciseId}`;

export function PlateCalculator({
  visible,
  initialKg,
  exerciseId,
  onClose,
}: {
  visible: boolean;
  initialKg: number | null;
  exerciseId?: string;
  onClose: () => void;
}) {
  const t = useTheme();
  const db = useSQLiteContext();
  const { gym } = useAppData();
  const [kg, setKg] = useState(initialKg ?? 100);
  const [bar, setBar] = useState(gym.barKg);
  const choices = barChoices(gym.bars, gym.barKg);

  useEffect(() => {
    if (!exerciseId) return;
    let alive = true;
    getSetting<number | null>(db, barKey(exerciseId), null).then((saved) => {
      if (alive && saved !== null) setBar(saved);
    });
    return () => {
      alive = false;
    };
  }, [db, exerciseId]);

  const chooseBar = (b: number) => {
    setBar(b);
    if (exerciseId) setSetting(db, barKey(exerciseId), b);
  };

  const r = platesFor(kg, bar, gym.plates);
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={styles.body}>
        <Text style={[styles.title, { color: t.text }]}>Calculadora de anilhas</Text>
        <Stepper label="Carga total" value={kg} step={2.5} onChange={setKg} format={(v) => formatKg(v)} min={bar} />

        <SectionTitle>Barra</SectionTitle>
        <View style={styles.wrap}>
          {choices.map((b) => (
            <Chip
              key={b}
              label={`${formatNumber(b, 2)} kg`}
              selected={b === bar}
              onPress={() => chooseBar(b)}
              accessibilityLabel={`Barra de ${formatNumber(b, 2)} quilos`}
            />
          ))}
        </View>
        {exerciseId ? (
          <Text style={[styles.hint, { color: t.muted }]}>A barra escolhida fica salva para este exercício.</Text>
        ) : null}

        <SectionTitle>Por lado</SectionTitle>
        <View
          style={styles.plates}
          accessible
          accessibilityLabel={`Por lado: ${r.perSide.map((p) => formatNumber(p)).join(', ') || 'só a barra'}`}
        >
          {r.perSide.length === 0 ? (
            <Text style={[styles.empty, { color: t.muted }]}>Só a barra</Text>
          ) : (
            r.perSide.map((p, i) => (
              <View key={i} style={[styles.plate, { height: 50 + p * 3.2, backgroundColor: t.accent }]}>
                <Text style={[styles.plateText, { color: t.accentText }]}>{formatNumber(p)}</Text>
              </View>
            ))
          )}
        </View>
        {r.remainderKg > 0 ? (
          <Text style={[styles.warn, { color: t.warn }]}>
            Não fecha com as anilhas disponíveis: faltam {formatKg(r.remainderKg)} (fica {formatKg(r.achievedKg)}).
          </Text>
        ) : null}
        <BigButton label="Fechar" variant="neutral" onPress={onClose} />
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.xl - 4, gap: space.md },
  title: { ...font.title, fontSize: 22 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  hint: { fontSize: 13 },
  plates: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 140, flexWrap: 'wrap' },
  plate: { width: 44, borderRadius: radius.cell - 2, alignItems: 'center', justifyContent: 'center' },
  plateText: { fontWeight: '700', fontSize: 14 },
  empty: { fontSize: 18 },
  warn: { fontSize: 15, fontWeight: '600' },
});
