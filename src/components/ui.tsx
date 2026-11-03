import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { TOUCH, useTheme } from '../ui/theme';

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }, style]}>{children}</View>;
}

type Variant = 'primary' | 'success' | 'neutral' | 'danger';

export function BigButton({
  label,
  onPress,
  variant = 'primary',
  disabled,
  accessibilityHint,
  compact,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  accessibilityHint?: string;
  compact?: boolean;
}) {
  const t = useTheme();
  const bg = { primary: t.accent, success: t.success, neutral: t.chip, danger: t.danger }[variant];
  const fg = variant === 'neutral' ? t.text : t.accentText;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.8 : 1 },
      ]}
    >
      <Text style={[styles.buttonText, compact && styles.buttonTextCompact, { color: fg }]} maxFontSizeMultiplier={1.6}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  accessibilityLabel,
  tone,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  tone?: 'success' | 'warn';
}) {
  const t = useTheme();
  const bg = selected ? t.accent : tone === 'success' ? t.successBg : tone === 'warn' ? t.warnBg : t.chip;
  const fg = selected ? t.accentText : tone === 'success' ? t.success : tone === 'warn' ? t.warn : t.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, { backgroundColor: bg, opacity: pressed ? 0.75 : 1 }]}
    >
      <Text style={[styles.chipText, { color: fg }]} maxFontSizeMultiplier={1.6}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'accent' | 'success' | 'warn' }) {
  const t = useTheme();
  const map = {
    neutral: [t.chip, t.muted],
    accent: [t.accent, t.accentText],
    success: [t.successBg, t.success],
    warn: [t.warnBg, t.warn],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function Stepper({
  label,
  value,
  onChange,
  step,
  format,
  min = 0,
}: {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
  step: number;
  format: (v: number | null) => string;
  min?: number;
}) {
  const t = useTheme();
  const v = value ?? 0;
  return (
    <View style={styles.stepper}>
      <Text style={[styles.stepperLabel, { color: t.muted }]}>{label}</Text>
      <View style={styles.stepperRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Diminuir ${label}`}
          onPress={() => onChange(Math.max(min, Math.round((v - step) * 100) / 100))}
          style={[styles.stepBtn, { backgroundColor: t.chip }]}
        >
          <Text style={[styles.stepBtnText, { color: t.text }]}>−</Text>
        </Pressable>
        <Text
          style={[styles.stepValue, { color: t.text }]}
          accessibilityLabel={`${label}: ${format(value)}`}
          maxFontSizeMultiplier={1.4}
        >
          {format(value)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Aumentar ${label}`}
          onPress={() => onChange(Math.round((v + step) * 100) / 100)}
          style={[styles.stepBtn, { backgroundColor: t.chip }]}
        >
          <Text style={[styles.stepBtnText, { color: t.text }]}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  const t = useTheme();
  return <Text style={[styles.section, { color: t.muted }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 10 },
  button: { minHeight: TOUCH, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  buttonCompact: { minHeight: 48 },
  buttonText: { fontSize: 18, fontWeight: '700' },
  buttonTextCompact: { fontSize: 16 },
  chip: { minHeight: 44, minWidth: 44, borderRadius: 22, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 16, fontWeight: '600' },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  stepper: { gap: 6 },
  stepperLabel: { fontSize: 14, fontWeight: '600' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: { width: TOUCH, height: TOUCH, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontSize: 28, fontWeight: '600' },
  stepValue: { flex: 1, textAlign: 'center', fontSize: 26, fontWeight: '700', fontVariant: ['tabular-nums'] },
  section: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 8 },
});
