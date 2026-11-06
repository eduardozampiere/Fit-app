import { StyleSheet, View } from 'react-native';
import { space, useTheme } from '../ui/theme';
import { GlassButton } from './GlassButton';

/**
 * Cabeçalho fixo do treino (como no Hevy): só botões, à direita: avisos da semana (quando há), timer de
 * descanso e Concluir/Reabrir. Duração, volume e séries ficam fora dele, no começo da lista.
 */
export function WorkoutHeader({
  done,
  hasNotes,
  onNotes,
  onTimer,
  onFinish,
}: {
  done: boolean;
  /** há avisos da semana (ex.: feriado) para mostrar atrás do símbolo de atenção */
  hasNotes: boolean;
  onNotes: () => void;
  onTimer: () => void;
  onFinish: () => void;
}) {
  const t = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: t.bg, borderBottomColor: t.separator }]}>
      {hasNotes ? <GlassButton icon="alert-circle-outline" color={t.warn} accessibilityLabel="Avisos da semana" onPress={onNotes} /> : null}
      <GlassButton icon="alarm-outline" accessibilityLabel="Timer de descanso" onPress={onTimer} />
      <GlassButton
        label={done ? 'Reabrir' : 'Concluir'}
        accessibilityLabel={done ? 'Reabrir treino' : 'Concluir treino'}
        onPress={onFinish}
        tint={done ? undefined : t.accent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
