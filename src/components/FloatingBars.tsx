import Ionicons from '@expo/vector-icons/Ionicons';
import { router, usePathname } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { findSession } from '../domain/plan';
import { formatClock, isStale, workoutDurationSec } from '../domain/workout';
import { useAppData } from '../state/AppData';
import { useRestTimer } from '../state/RestTimer';
import { askStillTraining, confirmDiscard } from '../state/workoutActions';
import { radius, space, useTheme } from '../ui/theme';
import { RestTimerBar } from './RestTimerBar';

/** Altura aproximada da barra de abas flutuante (sem a área segura); as barras ficam logo acima dela. */
const TAB_BAR = 62;

/**
 * Cartões que flutuam acima da barra de abas em todas as abas: o treino em andamento (como no Hevy:
 * toque abre o treino, lixeira descarta) e, por cima dele, o timer de descanso.
 */
export function FloatingBars() {
  const insets = useSafeAreaInsets();
  const timer = useRestTimer();
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + TAB_BAR }]}>
      {timer.endAt !== null ? <RestTimerBar /> : null}
      <WorkoutBar />
    </View>
  );
}

function WorkoutBar() {
  const t = useTheme();
  const db = useSQLiteContext();
  const pathname = usePathname();
  const { activeWorkout, cycle, bump } = useAppData();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!activeWorkout) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [activeWorkout]);

  // Na aba Hoje o treino já está na tela.
  if (!activeWorkout || pathname === '/' || pathname === '/index') return null;
  const elapsed = workoutDurationSec(activeWorkout, now) ?? 0;
  const stale = isStale(activeWorkout, now);
  const title = cycle ? (findSession(cycle, activeWorkout.sessionId)?.session.title ?? 'Treino') : 'Treino';
  const open = () => router.navigate({ pathname: '/', params: { sessionId: activeWorkout.sessionId, at: String(Date.now()) } });
  const onPress = stale ? () => askStillTraining(db, activeWorkout, Math.round(elapsed / 3600), bump, open) : open;

  return (
    <View style={[styles.bar, { backgroundColor: t.card, borderColor: t.separator }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Treino em andamento, ${formatClock(elapsed)}. Abrir ${title}`}
        onPress={onPress}
        style={styles.main}
      >
        <View style={[styles.icon, { backgroundColor: t.surface }]}>
          <Ionicons name="chevron-up" size={22} color={t.text} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={styles.titleRow}>
            <View style={[styles.dot, { backgroundColor: stale ? t.warn : t.done }]} />
            <Text style={[styles.time, { color: stale ? t.warn : t.text }]}>Treino {formatClock(elapsed)}</Text>
          </View>
          <Text numberOfLines={1} style={{ color: t.muted, fontSize: 14 }}>
            {stale ? 'Ainda treinando? Toque para decidir' : title}
          </Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Descartar treino"
        onPress={() => void confirmDiscard(db, activeWorkout, bump)}
        style={[styles.icon, { backgroundColor: t.dangerBg }]}
      >
        <Ionicons name="trash-outline" size={22} color={t.danger} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: space.md, right: space.md, gap: space.sm, paddingBottom: space.sm },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.sm,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
  },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md },
  icon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  dot: { width: 12, height: 12, borderRadius: 6 },
  time: { fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
