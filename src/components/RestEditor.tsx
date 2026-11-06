import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatRestDuration } from '../domain/format';
import { nearestRestIndex, restChoices } from '../domain/plan';
import { font, space, useTheme } from '../ui/theme';
import { BigButton, BottomSheet } from './ui';
import { WheelPicker } from './WheelPicker';

/**
 * Folha do timer de descanso de um exercício (roda de tempos, como no Hevy). "Concluído" guarda o
 * ajuste para esse exercício (vale nos próximos treinos); "Voltar ao plano" apaga o ajuste.
 * O pai renderiza só aberto e passa `key`.
 */
export function RestEditor({
  title = 'Timer de descanso',
  confirmLabel = 'Concluído',
  name,
  planText,
  initialSec,
  hasOverride,
  onSave,
  onReset,
  onClose,
}: {
  title?: string;
  confirmLabel?: string;
  name: string;
  /** descanso do plano, só para mostrar ("4-5 min"); sem ele a linha some */
  planText?: string;
  initialSec: number;
  hasOverride: boolean;
  onSave: (sec: number) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const t = useTheme();
  const choices = useMemo(() => restChoices(), []);
  const labels = useMemo(() => choices.map(formatRestDuration), [choices]);
  const start = nearestRestIndex(initialSec);
  const [index, setIndex] = useState(start);
  return (
    <BottomSheet onClose={onClose} animation="slide">
      <View style={[styles.grabber, { backgroundColor: t.separator }]} />
      <View style={{ alignItems: 'center', gap: 2 }}>
        <Text style={[styles.title, { color: t.text }]} accessibilityRole="header">
          {title}
        </Text>
        <Text style={{ color: t.muted, fontSize: 15 }} numberOfLines={1}>
          {name}
        </Text>
        {planText ? <Text style={{ color: t.muted, fontSize: 13 }}>No plano: {planText}</Text> : null}
      </View>
      <WheelPicker labels={labels} index={start} onChange={setIndex} label="Tempo de descanso" />
      {hasOverride ? (
        <Pressable accessibilityRole="button" onPress={onReset} style={styles.reset}>
          <Text style={{ color: t.accent, fontSize: 16, fontWeight: '500' }}>Voltar ao descanso do plano</Text>
        </Pressable>
      ) : null}
      <BigButton label={confirmLabel} onPress={() => onSave(choices[index])} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, marginBottom: space.xs },
  title: { ...font.headline },
  reset: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
