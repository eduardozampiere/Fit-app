import { NativeTabs } from 'expo-router/native-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatSeconds } from '../domain/format';
import { useRestTimer } from '../state/RestTimer';
import { TOUCH, useTheme } from '../ui/theme';

export function RestTimerBar() {
  const t = useTheme();
  const { endAt, remainingSec, totalSec, label, add, stop } = useRestTimer();
  if (endAt === null) return null;
  const done = remainingSec === 0;
  const progress = totalSec > 0 ? 1 - remainingSec / totalSec : 1;
  return (
    <View
      style={[styles.bar, { backgroundColor: done ? t.done : t.card, borderColor: t.separator }]}
      accessibilityLiveRegion="polite"
    >
      <View style={[styles.progress, { width: `${Math.min(100, progress * 100)}%`, backgroundColor: done ? t.done : t.accent }]} />
      <View style={styles.row}>
        <Pressable accessibilityRole="button" accessibilityLabel="Menos 30 segundos" onPress={() => add(-30)} style={[styles.btn, { backgroundColor: t.surface }]}>
          <Text style={[styles.btnText, { color: t.text }]}>−30</Text>
        </Pressable>
        <View style={styles.center} accessible accessibilityLabel={done ? 'Descanso acabou' : `Descanso: ${formatSeconds(remainingSec)} restantes`}>
          <Text style={[styles.time, { color: done ? t.accentText : t.text }]}>{done ? 'Bora!' : formatSeconds(remainingSec)}</Text>
          {label ? (
            <Text numberOfLines={1} style={[styles.label, { color: done ? t.accentText : t.muted }]}>
              {label}
            </Text>
          ) : null}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Mais 30 segundos" onPress={() => add(30)} style={[styles.btn, { backgroundColor: t.surface }]}>
          <Text style={[styles.btnText, { color: t.text }]}>+30</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Fechar cronômetro" onPress={stop} style={[styles.btn, { backgroundColor: t.surface }]}>
          <Text style={[styles.btnText, { color: t.text }]}>✕</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderTopWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  progress: { height: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 },
  center: { flex: 1, alignItems: 'center' },
  time: { fontSize: 32, fontWeight: '700', fontVariant: ['tabular-nums'] },
  label: { fontSize: 13 },
  btn: { minWidth: TOUCH, height: TOUCH, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  btnText: { fontSize: 18, fontWeight: '700' },
});

/**
 * Versão para o "bottom accessory" das abas nativas (iOS 26+): o sistema desenha o vidro;
 * aqui só o conteúdo. Duas instâncias são renderizadas (regular e inline): o estado vem do contexto.
 */
export function RestTimerAccessory() {
  const t = useTheme();
  const placement = NativeTabs.BottomAccessory.usePlacement();
  const { endAt, remainingSec, label, add, stop } = useRestTimer();
  if (endAt === null) return null;
  const done = remainingSec === 0;
  const time = done ? 'Bora!' : formatSeconds(remainingSec);
  const a11y = done ? 'Descanso acabou' : `Descanso: ${formatSeconds(remainingSec)} restantes`;

  if (placement === 'inline') {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={`${a11y}. Toque para fechar`} onPress={stop} style={accStyles.inline}>
        <Text style={[accStyles.inlineTime, { color: done ? t.done : t.text }]}>⏱ {time}</Text>
      </Pressable>
    );
  }
  return (
    <View style={accStyles.regular} accessibilityLiveRegion="polite">
      <Pressable accessibilityRole="button" accessibilityLabel="Menos 30 segundos" onPress={() => add(-30)} style={accStyles.btn}>
        <Text style={[accStyles.btnText, { color: t.text }]}>−30</Text>
      </Pressable>
      <View style={accStyles.center} accessible accessibilityLabel={a11y}>
        <Text style={[accStyles.time, { color: done ? t.done : t.text }]}>{time}</Text>
        {label ? (
          <Text numberOfLines={1} style={[accStyles.label, { color: t.muted }]}>
            {label}
          </Text>
        ) : null}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Mais 30 segundos" onPress={() => add(30)} style={accStyles.btn}>
        <Text style={[accStyles.btnText, { color: t.text }]}>+30</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Fechar cronômetro" onPress={stop} style={accStyles.btn}>
        <Text style={[accStyles.btnText, { color: t.text }]}>✕</Text>
      </Pressable>
    </View>
  );
}

const accStyles = StyleSheet.create({
  regular: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 4 },
  center: { flex: 1, alignItems: 'center' },
  time: { fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },
  label: { fontSize: 11 },
  btn: { minWidth: 48, height: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  btnText: { fontSize: 17, fontWeight: '700' },
  inline: { flex: 1, justifyContent: 'center', paddingHorizontal: 12 },
  inlineTime: { fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
