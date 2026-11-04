import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatRange, formatSeconds } from '../domain/format';
import { KIND_LABEL } from '../domain/plan';
import type { SetLock } from '../domain/rules';
import type { PrescribedItem, Range, SetLog } from '../domain/types';
import { font, radius, space, useTheme } from '../ui/theme';
import { SetTable, type SetInput } from './SetTable';
import { IconButton } from './ui';

function loadLabel(item: PrescribedItem, load: Range | null): string {
  if (item.loadMode === 'fixed' || item.loadMode === 'progressive') {
    const base = load ? formatRange(load, ' kg') : item.loadText;
    return item.loadMode === 'progressive' ? `${base}+` : base;
  }
  if (item.loadMode === 'none') return '';
  return item.loadText;
}

export function prescriptionLine(item: PrescribedItem, load: Range | null): string {
  const parts = [item.setsText, loadLabel(item, load)];
  if (item.rpeText && item.rpeText !== '—') parts.push(`RPE ${item.rpeText.replace('.', ',')}`);
  return parts.filter(Boolean).join(' · ');
}

/**
 * Bloco de um exercício na tela de treino: miniatura, nome em azul, menu ⋮, prescrição, notas,
 * descanso e a tabela de séries.
 */
export function ExerciseCard({
  item,
  load,
  logs,
  isChild,
  isLift,
  rows,
  plannedCount,
  complete,
  restSec,
  showRpe,
  pendingRpeIndex,
  lock,
  onUnlock,
  tip,
  onMenu,
  onCheck,
  onUncheck,
  onEdit,
  onSetMenu,
  onRpe,
  onAdd,
}: {
  item: PrescribedItem;
  load: Range | null;
  logs: SetLog[];
  isChild: boolean;
  /** Agacho, supino ou terra (miniatura de barra). */
  isLift: boolean;
  rows: number;
  plannedCount: number;
  complete: boolean;
  restSec: number;
  showRpe: boolean;
  pendingRpeIndex: number | null;
  lock?: SetLock;
  onUnlock?: () => void;
  tip?: string | null;
  onMenu: () => void;
  onCheck: (setIndex: number, input: SetInput) => void;
  onUncheck: (log: SetLog) => void;
  onEdit: (log: SetLog, input: SetInput) => void;
  onSetMenu: (setIndex: number, log: SetLog | null) => void;
  onRpe: (log: SetLog) => void;
  onAdd: () => void;
}) {
  const t = useTheme();
  const prescription = prescriptionLine(item, load);

  return (
    <View style={[styles.block, isChild && { paddingLeft: space.md, borderLeftWidth: 2, borderLeftColor: t.separator }]}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: t.surface }]}>
          <Ionicons name={isLift ? 'barbell' : 'fitness'} size={22} color={complete ? t.done : t.accent} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.name, { color: t.accent }]} accessibilityRole="header">
            {item.name}
          </Text>
          <Text style={[styles.kind, { color: complete ? t.done : t.muted }]}>
            {KIND_LABEL[item.kind]}
            {complete ? ' · feito' : ''}
          </Text>
        </View>
        <IconButton name="ellipsis-vertical" label={`Opções de ${item.name}`} onPress={onMenu} size={20} />
      </View>

      {prescription ? <Text style={[styles.prescription, { color: t.text }]}>{prescription}</Text> : null}
      {item.notes ? <Text style={[styles.notes, { color: t.muted }]}>{item.notes}</Text> : null}
      {tip ? <Text style={[styles.tip, { color: t.accent }]}>{tip}</Text> : null}
      <View style={styles.restRow}>
        <Ionicons name="timer-outline" size={16} color={t.accent} />
        <Text style={[styles.rest, { color: t.accent }]}>
          Descanso: {item.restText && item.restText !== '—' ? item.restText : formatSeconds(restSec)}
        </Text>
      </View>

      {lock ? (
        <View style={[styles.lockBox, { backgroundColor: t.warnBg }]}>
          <Ionicons name="lock-closed" size={16} color={t.warn} />
          <Text style={{ color: t.warn, fontSize: 14, fontWeight: '600', flex: 1 }}>{lock.reason}</Text>
          {lock.undoable && onUnlock ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Desfazer bloqueio do terra"
              onPress={onUnlock}
              style={[styles.unlockBtn, { backgroundColor: t.surface }]}
            >
              <Text style={{ color: t.text, fontWeight: '600' }}>Desfazer</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <SetTable
        item={item}
        plannedLoad={load?.min ?? null}
        logs={logs}
        rows={rows}
        plannedCount={plannedCount}
        lock={lock}
        showRpe={showRpe}
        pendingRpeIndex={pendingRpeIndex}
        onCheck={onCheck}
        onUncheck={onUncheck}
        onEdit={onEdit}
        onSetMenu={onSetMenu}
        onRpe={onRpe}
        onAdd={onAdd}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.sm, paddingVertical: space.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  name: { ...font.headline },
  kind: { fontSize: 13 },
  prescription: { fontSize: 15, fontWeight: '500' },
  notes: { fontSize: 14, lineHeight: 19 },
  tip: { fontSize: 14, fontWeight: '600' },
  restRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  rest: { fontSize: 14, fontWeight: '500' },
  lockBox: { borderRadius: radius.button, padding: space.md, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  unlockBtn: { minHeight: 40, borderRadius: radius.cell, paddingHorizontal: space.md, justifyContent: 'center' },
});
