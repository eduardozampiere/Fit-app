import Ionicons from '@expo/vector-icons/Ionicons';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { space, useTheme } from '../ui/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const SIZE = 40;

/**
 * Botão em Liquid Glass (iOS 26): só ícone (redondo) ou ícone + texto (pílula). Com `tint` o vidro
 * fica colorido e o conteúdo branco. Sem Liquid Glass (iOS antigo, Android, web) vira um botão liso.
 */
export function GlassButton({
  label,
  icon,
  onPress,
  accessibilityLabel,
  tint,
  color,
}: {
  label?: string;
  icon?: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  tint?: string;
  /** cor do ícone/texto quando não há `tint` */
  color?: string;
}) {
  const t = useTheme();
  const glass = isLiquidGlassAvailable();
  const fg = tint ? t.accentText : (color ?? t.accent);
  const shape = { borderRadius: SIZE / 2 };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.base, !label && styles.round, shape, { opacity: pressed ? 0.7 : 1 }]}
    >
      {glass ? (
        <GlassView pointerEvents="none" style={[StyleSheet.absoluteFill, shape]} glassEffectStyle="regular" tintColor={tint} />
      ) : (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, shape, { backgroundColor: tint ?? t.surface }]} />
      )}
      {icon ? <Ionicons name={icon} size={21} color={fg} /> : null}
      {label ? <Text style={[styles.label, { color: fg }]}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: SIZE,
    paddingHorizontal: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
  },
  round: { width: SIZE, paddingHorizontal: 0 },
  label: { fontSize: 15, fontWeight: '600' },
});
