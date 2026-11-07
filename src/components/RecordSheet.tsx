import { StyleSheet, Text, View } from 'react-native';
import {
  hitBadgeText,
  hitBeforeText,
  hitCaption,
  RECORD_LABEL,
  recordSetSubtitle,
  recordSheetTitle,
  recordValueText,
  type SetRecords,
} from '../domain/records';
import { font, space, useTheme } from '../ui/theme';
import { Badge, BigButton, BottomSheet, Divider } from './ui';

/** Detalhes dos recordes de uma série: um item por tipo, com o valor novo, o anterior e se ainda vale. */
export function RecordSheet({
  records,
  onOpenExercise,
  onClose,
}: {
  records: SetRecords;
  /** Só na tela Hoje; dentro da tela do exercício já se está nela. */
  onOpenExercise?: () => void;
  onClose: () => void;
}) {
  const t = useTheme();
  const { set, hits } = records;
  return (
    <BottomSheet onClose={onClose} dragAnywhere>
      <Text style={[styles.title, { color: t.text }]} accessibilityRole="header">
        {recordSheetTitle(hits)}
      </Text>
      <Text style={[styles.sub, { color: t.muted }]}>
        {set.exerciseName} · {recordSetSubtitle(set)}
      </Text>
      {hits.map((hit, i) => {
        const caption = hitCaption(hit, set);
        return (
          <View key={hit.type}>
            {i > 0 ? <Divider /> : null}
            <View style={styles.hit}>
              <View style={styles.hitHead}>
                <Text style={[styles.hitName, { color: t.text }]}>{RECORD_LABEL[hit.type]}</Text>
                <Text style={[styles.hitValue, { color: t.gold }]}>{recordValueText(hit.type, hit.value)}</Text>
              </View>
              {caption ? <Text style={[styles.sub, { color: t.muted }]}>{caption}</Text> : null}
              <Text style={[styles.sub, { color: t.muted }]}>{hitBeforeText(hit)}</Text>
              <Badge label={hitBadgeText(hit)} tone={hit.current ? 'success' : 'neutral'} />
            </View>
          </View>
        );
      })}
      {onOpenExercise ? (
        <BigButton
          label="Ver recordes do exercício"
          variant="neutral"
          onPress={() => {
            onClose();
            onOpenExercise();
          }}
        />
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { ...font.title, textAlign: 'center' },
  sub: { fontSize: 13 },
  hit: { gap: space.xs, paddingVertical: space.sm },
  hitHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: space.md },
  hitName: { ...font.headline, flex: 1 },
  hitValue: { fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
