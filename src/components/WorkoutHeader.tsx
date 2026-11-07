import { StyleSheet, View } from 'react-native';
import { space, useTheme } from '../ui/theme';
import { GlassButton } from './GlassButton';

/**
 * Cabeçalho fixo do treino (como no Hevy): só botões, à direita: avisos da semana (quando há), timer de
 * descanso, lixeira (treino em andamento) e Iniciar/Concluir/Reabrir. Duração, volume e séries ficam fora dele, no começo da lista.
 */
export type WorkoutMode = 'start' | 'finish' | 'reopen';

export function WorkoutHeader({
  mode,
  hasNotes,
  onNotes,
  onTimer,
  onPrimary,
  onDiscard,
}: {
  /** Iniciar (ainda não começou), Concluir (em andamento) ou Reabrir (concluído) */
  mode: WorkoutMode;
  /** há avisos da semana (ex.: feriado) para mostrar atrás do símbolo de atenção */
  hasNotes: boolean;
  onNotes: () => void;
  onTimer: () => void;
  onPrimary: () => void;
  /** lixeira: só aparece com o treino em andamento */
  onDiscard?: () => void;
}) {
  const t = useTheme();
  const label = mode === 'start' ? 'Iniciar' : mode === 'finish' ? 'Concluir' : 'Reabrir';
  return (
    <View style={[styles.wrap, { backgroundColor: t.bg, borderBottomColor: t.separator }]}>
      {hasNotes ? <GlassButton icon="alert-circle-outline" color={t.warn} accessibilityLabel="Avisos da semana" onPress={onNotes} /> : null}
      <GlassButton icon="alarm-outline" accessibilityLabel="Timer de descanso" onPress={onTimer} />
      {mode === 'finish' && onDiscard ? <GlassButton icon="trash-outline" color={t.danger} accessibilityLabel="Descartar treino" onPress={onDiscard} /> : null}
      <GlassButton
        label={label}
        accessibilityLabel={`${label} treino`}
        onPress={onPrimary}
        tint={mode === 'reopen' ? undefined : t.accent}
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
