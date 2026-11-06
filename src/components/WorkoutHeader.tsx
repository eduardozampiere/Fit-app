import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { SessionStats } from '../domain/logging';
import { font, space, useTheme } from '../ui/theme';
import { IconButton } from './ui';
import { WorkoutStats } from './WorkoutStats';

/**
 * Cabeçalho fixo do treino (como no Hevy): o dia e a semana, o timer de descanso e "Concluir" em
 * cima; Duração · Volume · Séries embaixo. Fica no topo enquanto a lista rola.
 */
export function WorkoutHeader({
  title,
  subtitle,
  stats,
  plannedSets,
  running,
  done,
  onTimer,
  onFinish,
}: {
  title: string;
  subtitle: string;
  stats: SessionStats;
  plannedSets: number;
  running: boolean;
  done: boolean;
  onTimer: () => void;
  onFinish: () => void;
}) {
  const t = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: t.bg, borderBottomColor: t.separator }]}>
      <View style={styles.bar}>
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={[styles.title, { color: t.text }]} numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
          <Text style={{ color: t.muted, fontSize: 13 }} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <IconButton name="alarm-outline" label="Timer de descanso" onPress={onTimer} color={t.accent} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={done ? 'Reabrir treino' : 'Concluir treino'}
          onPress={onFinish}
          style={({ pressed }) => [styles.finish, { backgroundColor: done ? t.surface : t.accent, opacity: pressed ? 0.8 : 1 }]}
        >
          <Text style={{ color: done ? t.text : t.accentText, fontSize: 16, fontWeight: '600' }}>{done ? 'Reabrir' : 'Concluir'}</Text>
        </Pressable>
      </View>
      <WorkoutStats stats={stats} plannedSets={plannedSets} running={running} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.md, gap: space.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  bar: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  title: { ...font.headline },
  finish: { minHeight: 44, borderRadius: 22, paddingHorizontal: space.lg, justifyContent: 'center' },
});
