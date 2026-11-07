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
  // Cartão retangular como o do Hevy (a cápsula do sistema não deixava mudar a forma).
  bar: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, overflow: 'hidden' },
  progress: { height: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 },
  center: { flex: 1, alignItems: 'center' },
  time: { fontSize: 30, fontWeight: '700', fontVariant: ['tabular-nums'] },
  label: { fontSize: 13 },
  btn: { minWidth: TOUCH, height: TOUCH, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  btnText: { fontSize: 18, fontWeight: '700' },
});
