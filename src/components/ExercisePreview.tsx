import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { catalogSubtitle, type CatalogExercise } from '../domain/catalog';
import { font, radius, space, useTheme } from '../ui/theme';
import { ExerciseImage } from './ExerciseImage';
import { BigButton, BottomSheet } from './ui';

/** Imagem do exercício em tamanho grande (toque na miniatura do cartão). */
export function ExercisePreview({ exercise, name, onClose }: { exercise: CatalogExercise; name: string; onClose: () => void }) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const size = width - space.lg * 2 - space.lg * 2;
  return (
    <BottomSheet onClose={onClose} animation="slide">
      <View style={{ alignItems: 'center', gap: space.xs }}>
        <Text style={[styles.title, { color: t.text }]} accessibilityRole="header">
          {name}
        </Text>
        <Text style={{ color: t.muted, fontSize: 14 }}>{catalogSubtitle(exercise)}</Text>
      </View>
      {exercise.image ? (
        <View style={[styles.frame, { width: size, height: Math.round(size * 0.6), backgroundColor: t.accentText }]}>
          <ExerciseImage uri={exercise.image} width={size} height={Math.round(size * 0.6)} fit="contain" />
        </View>
      ) : null}
      <BigButton label="Fechar" variant="neutral" onPress={onClose} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { ...font.headline, textAlign: 'center' },
  frame: { alignSelf: 'center', borderRadius: radius.card, overflow: 'hidden' },
});
