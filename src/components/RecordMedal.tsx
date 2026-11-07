import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text } from 'react-native';
import { medalA11yLabel, type RecordType } from '../domain/records';
import { useTheme } from '../ui/theme';

/**
 * Medalha dourada da série que bateu um ou mais recordes. Com 2 ou mais, mostra o número ao lado.
 * O ícone tem ~20 pt; o hitSlop leva a área de toque a 44 pt sem ocupar essa largura na linha.
 */
export function RecordMedal({
  types,
  onPress,
  size = 20,
}: {
  types: readonly RecordType[];
  onPress: () => void;
  size?: number;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={medalA11yLabel(types)}
      onPress={onPress}
      hitSlop={12}
      style={({ pressed }) => [styles.medal, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Ionicons name="medal" size={size} color={t.gold} />
      {types.length >= 2 ? (
        <Text style={[styles.count, { color: t.gold }]} maxFontSizeMultiplier={1.2}>
          {types.length}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  medal: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  count: { fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
