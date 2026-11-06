import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatSeconds } from '../domain/format';
import { REST_MAX_SEC, REST_MIN_SEC, REST_PRESETS_SEC, REST_STEP_SEC } from '../domain/plan';
import { space, useTheme } from '../ui/theme';
import { BigButton, Chip, SheetHeader, Stepper } from './ui';

/**
 * Editar o descanso de um exercício. Salvar guarda o ajuste para esse exercício (vale nos próximos
 * treinos); "Voltar ao plano" apaga o ajuste. O pai renderiza só aberto e passa `key`.
 */
export function RestEditor({
  name,
  planText,
  initialSec,
  hasOverride,
  onSave,
  onReset,
  onClose,
}: {
  name: string;
  /** descanso do plano, só para mostrar ("4-5 min") */
  planText: string;
  initialSec: number;
  hasOverride: boolean;
  onSave: (sec: number) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const t = useTheme();
  const [sec, setSec] = useState(initialSec);
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <SheetHeader title="Descanso" onCancel={onClose} action="Salvar" onAction={() => onSave(sec)} />
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={{ color: t.muted, fontSize: 15 }}>
            {name} · no plano: {planText}
          </Text>
          <Stepper label="Tempo de descanso" value={sec} onChange={(v) => setSec(Math.min(REST_MAX_SEC, v))} step={REST_STEP_SEC} min={REST_MIN_SEC} format={(v) => formatSeconds(Math.min(REST_MAX_SEC, v ?? 0))} />
          <View style={styles.wrap}>
            {REST_PRESETS_SEC.map((p) => (
              <Chip key={p} label={formatSeconds(p)} selected={sec === p} onPress={() => setSec(p)} accessibilityLabel={`${formatSeconds(p)} minutos`} />
            ))}
          </View>
          <Text style={{ color: t.muted, fontSize: 13 }}>
            O ajuste vale para este exercício nos próximos treinos. O plano em si não muda.
          </Text>
          {hasOverride ? <BigButton label="Voltar ao descanso do plano" variant="neutral" onPress={onReset} /> : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.xl, gap: space.lg, paddingBottom: 48 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
