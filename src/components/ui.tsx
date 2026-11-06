import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { font, radius, space, TOUCH, useTheme } from '../ui/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return <View style={[styles.card, { backgroundColor: t.card, borderColor: t.separator }, style]}>{children}</View>;
}

type Variant = 'primary' | 'success' | 'neutral' | 'danger';

export function BigButton({
  label,
  onPress,
  variant = 'primary',
  disabled,
  accessibilityHint,
  compact,
  icon,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  accessibilityHint?: string;
  compact?: boolean;
  icon?: IconName;
}) {
  const t = useTheme();
  const bg = { primary: t.accent, success: t.done, neutral: t.surface, danger: t.danger }[variant];
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
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.75 : 1 },
      ]}
    >
      {icon ? <Ionicons name={icon} size={compact ? 18 : 20} color={fg} /> : null}
      <Text style={[styles.buttonText, compact && styles.buttonTextCompact, { color: fg }]} maxFontSizeMultiplier={1.6}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Pílula: seletor (selecionada = azul preenchido) ou etiqueta de estado (`tone`). */
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
  const bg = selected ? t.accent : tone === 'success' ? t.doneBg : tone === 'warn' ? t.warnBg : t.surface;
  const fg = selected ? t.accentText : tone === 'success' ? t.done : tone === 'warn' ? t.warn : t.text;
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
    neutral: [t.surface, t.muted],
    accent: [t.accent, t.accentText],
    success: [t.doneBg, t.done],
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
      <Text style={[styles.fieldLabel, { color: t.muted }]}>{label}</Text>
      <View style={styles.stepperRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Diminuir ${label}`}
          onPress={() => onChange(Math.max(min, Math.round((v - step) * 100) / 100))}
          style={({ pressed }) => [styles.stepBtn, { backgroundColor: t.surface, opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="remove" size={26} color={t.text} />
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
          style={({ pressed }) => [styles.stepBtn, { backgroundColor: t.surface, opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="add" size={26} color={t.text} />
        </Pressable>
      </View>
    </View>
  );
}

/** Campo de texto preenchido (sem borda). `area`: várias linhas. `label`: rótulo acima do campo. */
export function TextField({
  label,
  area,
  style,
  accessibilityLabel,
  ...props
}: TextInputProps & { label?: string; area?: boolean }) {
  const t = useTheme();
  const input = (
    <TextInput
      placeholderTextColor={t.muted}
      multiline={area || props.multiline}
      accessibilityLabel={accessibilityLabel ?? label}
      {...props}
      style={[area ? styles.area : styles.input, { color: t.text, backgroundColor: t.surface }, style]}
    />
  );
  if (!label) return input;
  return (
    <View style={{ gap: space.xs + 2 }}>
      <Text style={[styles.fieldLabel, { color: t.muted }]}>{label}</Text>
      {input}
    </View>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  const t = useTheme();
  return <Text style={[styles.section, { color: t.muted }]}>{children}</Text>;
}

/** Bloco plano com título e ação opcional à direita ("Ver tudo"). */
export function Section({
  title,
  action,
  onAction,
  children,
  style,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  return (
    <View style={[{ gap: space.sm }, style]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionHeading, { color: t.text }]} accessibilityRole="header">
          {title}
        </Text>
        {action && onAction ? (
          <Pressable accessibilityRole="button" accessibilityLabel={action} onPress={onAction} hitSlop={12}>
            <Text style={[styles.link, { color: t.accent }]}>{action}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export function Divider({ inset = 0 }: { inset?: number }) {
  const t = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.separator, marginLeft: inset }} />;
}

/** Linha de lista: título (e subtítulo) à esquerda, valor e chevron à direita, divisória embaixo. */
export function ListRow({
  title,
  subtitle,
  value,
  onPress,
  icon,
  last,
}: {
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  icon?: IconName;
  last?: boolean;
}) {
  const t = useTheme();
  const content = (
    <View style={styles.listRow}>
      {icon ? <Ionicons name={icon} size={22} color={t.accent} /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.rowTitle, { color: t.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.rowSub, { color: t.muted }]}>{subtitle}</Text> : null}
      </View>
      {value ? <Text style={[styles.rowValue, { color: t.muted }]}>{value}</Text> : null}
      {onPress ? <Ionicons name="chevron-forward" size={18} color={t.muted} /> : null}
    </View>
  );
  return (
    <View>
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={[title, subtitle, value].filter(Boolean).join(', ')}
          onPress={onPress}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          {content}
        </Pressable>
      ) : (
        content
      )}
      {last ? null : <Divider />}
    </View>
  );
}

/** Resumo em colunas: rótulo pequeno em cima, valor embaixo (ex.: Tempo · Volume · Séries). */
export function StatRow({ items }: { items: { label: string; value: string; accent?: boolean }[] }) {
  const t = useTheme();
  return (
    <View style={styles.statRow}>
      {items.map((it) => (
        <View key={it.label} style={{ flex: 1, gap: 2 }} accessible accessibilityLabel={`${it.label}: ${it.value}`}>
          <Text style={[styles.statLabel, { color: t.muted }]}>{it.label}</Text>
          <Text style={[styles.statValue, { color: it.accent ? t.accent : t.text }]} maxFontSizeMultiplier={1.4}>
            {it.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Botão só de ícone; a área de toque chega a `TOUCH` mesmo com o ícone pequeno. */
export function IconButton({
  name,
  label,
  onPress,
  color,
  size = 24,
}: {
  name: IconName;
  label: string;
  onPress: () => void;
  color?: string;
  size?: number;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={(TOUCH - 44) / 2}
      style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Ionicons name={name} size={size} color={color ?? t.text} />
    </Pressable>
  );
}

/** Barra do topo das folhas (modais), como no iOS e no Hevy: Cancelar · título · ação. */
export function SheetHeader({
  title,
  onCancel,
  cancelLabel = 'Cancelar',
  action,
  onAction,
  actionDisabled,
}: {
  title: string;
  onCancel: () => void;
  cancelLabel?: string;
  action?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
}) {
  const t = useTheme();
  return (
    <View style={[styles.sheetHeader, { backgroundColor: t.bg, borderBottomColor: t.separator }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={cancelLabel} onPress={onCancel} hitSlop={12} style={styles.sheetSide}>
        <Text style={[styles.sheetLink, { color: t.accent }]}>{cancelLabel}</Text>
      </Pressable>
      <Text style={[styles.sheetTitle, { color: t.text }]} numberOfLines={1} accessibilityRole="header">
        {title}
      </Text>
      <View style={[styles.sheetSide, { alignItems: 'flex-end' }]}>
        {action && onAction ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={action}
            accessibilityState={{ disabled: !!actionDisabled }}
            disabled={actionDisabled}
            onPress={onAction}
            hitSlop={12}
          >
            <Text style={[styles.sheetLink, { color: actionDisabled ? t.muted : t.accent, fontWeight: '600' }]}>{action}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export interface MenuOption {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  icon?: IconName;
}

/**
 * Folha de baixo para cima com altura do conteúdo (não ocupa a tela toda), com fundo escurecido;
 * tocar fora fecha. Base do `ActionMenu` e do editor de descanso.
 */
export function BottomSheet({
  onClose,
  animation = 'fade',
  children,
}: {
  onClose: () => void;
  animation?: 'fade' | 'slide';
  children: ReactNode;
}) {
  const t = useTheme();
  return (
    <Modal visible transparent animationType={animation} onRequestClose={onClose}>
      <Pressable style={styles.menuBackdrop} onPress={onClose} accessibilityLabel="Fechar">
        <Pressable style={[styles.menuSheet, { backgroundColor: t.card }]} onPress={() => {}}>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/**
 * Folha de ações de baixo para cima (menu ⋮, menu da série, escolha de RPE). Funciona igual em
 * iOS, Android e na prévia web, ao contrário do `Alert` com botões.
 */
export function ActionMenu({
  title,
  options,
  onClose,
  columns,
}: {
  title?: string;
  options: MenuOption[];
  onClose: () => void;
  /** Opções em grade (ex.: valores de RPE) em vez de lista. */
  columns?: number;
}) {
  const t = useTheme();
  return (
    <BottomSheet onClose={onClose}>
      {title ? <Text style={[styles.menuTitle, { color: t.muted }]}>{title}</Text> : null}
      {columns ? (
        <View style={styles.menuGrid}>
          {options.map((o) => (
            <Pressable
              key={o.label}
              accessibilityRole="button"
              accessibilityLabel={o.label}
              onPress={() => {
                onClose();
                o.onPress();
              }}
              style={({ pressed }) => [
                styles.menuCell,
                { width: `${100 / columns - 2}%`, backgroundColor: t.surface, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[styles.menuCellText, { color: t.text }]}>{o.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        options.map((o, i) => (
          <View key={o.label}>
            {i > 0 ? <Divider /> : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={o.label}
              onPress={() => {
                onClose();
                o.onPress();
              }}
              style={({ pressed }) => [styles.menuRow, { opacity: pressed ? 0.6 : 1 }]}
            >
              {o.icon ? <Ionicons name={o.icon} size={22} color={o.destructive ? t.danger : t.accent} /> : null}
              <Text style={[styles.menuRowText, { color: o.destructive ? t.danger : t.text }]}>{o.label}</Text>
            </Pressable>
          </View>
        ))
      )}
      <BigButton label="Cancelar" variant="neutral" compact onPress={onClose} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetHeader: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetSide: { width: 96 },
  sheetLink: { fontSize: 17 },
  sheetTitle: { ...font.headline, flex: 1, textAlign: 'center' },
  menuBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  menuSheet: { borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card, padding: space.lg, paddingBottom: 36, gap: space.sm },
  menuTitle: { ...font.label, textAlign: 'center', marginBottom: space.xs },
  menuRow: { minHeight: TOUCH, flexDirection: 'row', alignItems: 'center', gap: space.md },
  menuRowText: { fontSize: 17 },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.sm, marginBottom: space.sm },
  menuCell: { minHeight: TOUCH, borderRadius: radius.button, alignItems: 'center', justifyContent: 'center' },
  menuCellText: { fontSize: 18, fontWeight: '600', fontVariant: ['tabular-nums'] },
  card: { borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, padding: space.lg, gap: space.md },
  button: {
    minHeight: TOUCH,
    borderRadius: radius.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
  },
  buttonCompact: { minHeight: 48 },
  buttonText: { fontSize: 17, fontWeight: '600' },
  buttonTextCompact: { fontSize: 16 },
  chip: { minHeight: 44, minWidth: 44, borderRadius: 22, paddingHorizontal: space.lg, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 15, fontWeight: '600' },
  badge: { borderRadius: 6, paddingHorizontal: space.sm, paddingVertical: 2, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '600' },
  stepper: { gap: space.sm },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  stepBtn: { width: TOUCH, height: TOUCH, borderRadius: radius.button, alignItems: 'center', justifyContent: 'center' },
  stepValue: { flex: 1, textAlign: 'center', fontSize: 26, fontWeight: '600', fontVariant: ['tabular-nums'] },
  input: { minHeight: 48, borderRadius: radius.button, paddingHorizontal: space.md + 2, fontSize: 17 },
  area: { minHeight: 120, maxHeight: 260, borderRadius: radius.button, padding: space.md, fontSize: 15, textAlignVertical: 'top' },
  fieldLabel: { ...font.label },
  section: { ...font.label, fontSize: 14, marginTop: space.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.sm },
  sectionHeading: { ...font.headline },
  link: { fontSize: 15, fontWeight: '500' },
  listRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm + 2 },
  rowTitle: { ...font.body },
  rowSub: { fontSize: 13 },
  rowValue: { fontSize: 16, fontVariant: ['tabular-nums'] },
  statRow: { flexDirection: 'row', gap: space.md },
  statLabel: { ...font.label },
  statValue: { fontSize: 17, fontWeight: '500', fontVariant: ['tabular-nums'] },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
