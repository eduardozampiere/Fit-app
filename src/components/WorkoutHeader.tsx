import { StyleSheet, Text, View } from 'react-native';
import type { SessionStats } from '../domain/logging';
import { font, space, useTheme } from '../ui/theme';
import { GlassButton } from './GlassButton';
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
        <GlassButton icon="alarm-outline" accessibilityLabel="Timer de descanso" onPress={onTimer} />
        <GlassButton
          label={done ? 'Reabrir' : 'Concluir'}
          accessibilityLabel={done ? 'Reabrir treino' : 'Concluir treino'}
          onPress={onFinish}
          tint={done ? undefined : t.accent}
        />
      </View>
      <WorkoutStats stats={stats} plannedSets={plannedSets} running={running} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.md, gap: space.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  bar: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  title: { ...font.headline },
});
