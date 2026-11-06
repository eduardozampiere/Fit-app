import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SET_CHOICES, type SetChoice } from '../domain/setTypes';
import { font, space, useTheme, type Theme } from '../ui/theme';
import { BottomSheet, Divider } from './ui';

/** Cor da letra/número da série conforme o tipo (aquecimento laranja, falha vermelho, drop set azul). */
export function setChoiceColor(t: Theme, choice: SetChoice): string {
  return choice === 'warmup' ? t.warn : choice === 'failure' ? t.danger : choice === 'dropset' ? t.accent : t.text;
}

/**
 * "Selecionar tipo de série" (toque no número da série): aquecimento, normal, até a falha ou drop set,
 * com a explicação de cada um no "?"; mais os detalhes da série e remover. Fecha arrastando para baixo.
 */
export function SetTypeSheet({
  current,
  index,
  onChoose,
  onDetails,
  onRemove,
  onClose,
}: {
  current: SetChoice;
  index: number;
  onChoose: (choice: SetChoice) => void;
  onDetails: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const t = useTheme();
  const [helpFor, setHelpFor] = useState<SetChoice | null>(null);
  return (
    <BottomSheet onClose={onClose} dragAnywhere>
      <Text style={[styles.title, { color: t.muted }]} accessibilityRole="header">
        Selecionar tipo de série
      </Text>
      {SET_CHOICES.map((c, i) => (
        <View key={c.key}>
          {i > 0 ? <Divider /> : null}
          <View style={styles.row}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: current === c.key }}
              accessibilityLabel={c.label}
              onPress={() => onChoose(c.key)}
              style={styles.main}
            >
              <Text style={[styles.letter, { color: setChoiceColor(t, c.key) }]}>{c.letter ?? index}</Text>
              <Text
                style={[
                  styles.label,
                  { color: current === c.key ? t.accent : t.text, fontWeight: current === c.key ? '700' : '400' },
                ]}
              >
                {c.label}
              </Text>
              {current === c.key ? <Ionicons name="checkmark" size={20} color={t.accent} /> : null}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`O que é: ${c.label}`}
              onPress={() => setHelpFor(helpFor === c.key ? null : c.key)}
              hitSlop={8}
              style={[styles.help, { backgroundColor: t.surface }]}
            >
              <Ionicons name="help" size={16} color={t.muted} />
            </Pressable>
          </View>
          {helpFor === c.key ? <Text style={[styles.helpText, { color: t.muted }]}>{c.help}</Text> : null}
        </View>
      ))}
      <Divider />
      <Pressable accessibilityRole="button" onPress={onDetails} style={styles.row}>
        <Ionicons name="create-outline" size={24} color={t.accent} style={styles.letterIcon} />
        <Text style={[styles.label, { color: t.text, flex: 1 }]}>Detalhes (RPE, pegada, cinto, falha)</Text>
      </Pressable>
      <Divider />
      <Pressable accessibilityRole="button" onPress={onRemove} style={styles.row}>
        <Ionicons name="close" size={26} color={t.danger} style={styles.letterIcon} />
        <Text style={[styles.label, { color: t.danger, flex: 1 }]}>Remover série</Text>
      </Pressable>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { ...font.label, textAlign: 'center', marginBottom: space.xs },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space.md },
  main: { flex: 1, minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space.md },
  letter: { width: 28, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  letterIcon: { width: 28, textAlign: 'center' },
  label: { fontSize: 17, flexShrink: 1 },
  help: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  helpText: { fontSize: 14, lineHeight: 19, paddingLeft: 28 + space.md, paddingBottom: space.sm },
});
