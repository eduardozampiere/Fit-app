import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatKg, formatNumber } from '../domain/format';
import { platesFor } from '../domain/plates';
import { useAppData } from '../state/AppData';
import { useTheme } from '../ui/theme';
import { BigButton, Stepper } from './ui';

export function PlateCalculator({ visible, initialKg, onClose }: { visible: boolean; initialKg: number | null; onClose: () => void }) {
  const t = useTheme();
  const { gym } = useAppData();
  const [kg, setKg] = useState(initialKg ?? 100);
  const r = platesFor(kg, gym.barKg, gym.plates);
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={styles.body}>
        <Text style={[styles.title, { color: t.text }]}>Calculadora de anilhas</Text>
        <Stepper label="Carga total" value={kg} step={5} onChange={setKg} format={(v) => formatKg(v)} min={gym.barKg} />
        <Text style={[styles.sub, { color: t.muted }]}>Barra de {formatNumber(gym.barKg)} kg · por lado:</Text>
        <View style={styles.plates} accessible accessibilityLabel={`Por lado: ${r.perSide.map((p) => formatNumber(p)).join(', ') || 'só a barra'}`}>
          {r.perSide.length === 0 ? (
            <Text style={[styles.empty, { color: t.muted }]}>Só a barra</Text>
          ) : (
            r.perSide.map((p, i) => (
              <View key={i} style={[styles.plate, { height: 50 + p * 3.2, backgroundColor: t.accent }]}>
                <Text style={styles.plateText}>{formatNumber(p)}</Text>
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
  body: { padding: 20, gap: 18 },
  title: { fontSize: 24, fontWeight: '800' },
  sub: { fontSize: 15 },
  plates: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 140, flexWrap: 'wrap' },
  plate: { width: 44, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  plateText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  empty: { fontSize: 18 },
  warn: { fontSize: 15, fontWeight: '600' },
});
