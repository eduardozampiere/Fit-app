import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatRange, formatRestDuration } from '../domain/format';
import { KIND_LABEL } from '../domain/plan';
import type { SetLock } from '../domain/rules';
import type { PrescribedItem, Range, SetLog } from '../domain/types';
import { font, radius, space, useTheme } from '../ui/theme';
import type { SetDraft } from '../domain/logging';
import type { DragHandleProps } from './DragList';
import { SetTable, type SetInput, type SetKind } from './SetTable';
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
  warmups,
  warmupDrafts,
  complete,
  restSec,
  restOverridden,
  onRest,
  onOpen,
  showRpe,
  pendingRpeIndex,
  lock,
  onUnlock,
  tip,
  onMenu,
  onCheck,
  onUncheck,
  onEdit,
  onRemove,
  onSetMenu,
  onRpe,
  onAdd,
  onAddWarmup,
  onMoveSet,
  onSetDrag,
  handle,
  collapsed,
}: {
  item: PrescribedItem;
  load: Range | null;
  logs: SetLog[];
  isChild: boolean;
  /** Agacho, supino ou terra (miniatura de barra). */
  isLift: boolean;
  rows: number;
  plannedCount: number;
  warmups: SetLog[];
  warmupDrafts: SetDraft[];
  complete: boolean;
  /** descanso em vigor (ajuste do usuário ou plano) */
  restSec: number;
  restOverridden: boolean;
  onRest: () => void;
  /** abre a tela do exercício (toque no cabeçalho do cartão) */
  onOpen: () => void;
  showRpe: boolean;
  pendingRpeIndex: number | null;
  lock?: SetLock;
  onUnlock?: () => void;
  tip?: string | null;
  onMenu: () => void;
  onCheck: (kind: SetKind, setIndex: number, input: SetInput) => void;
  onUncheck: (log: SetLog) => void;
  onEdit: (log: SetLog, input: SetInput) => void;
  onRemove: (kind: SetKind, setIndex: number, log: SetLog | null) => void;
  onSetMenu: (kind: SetKind, setIndex: number, log: SetLog | null) => void;
  onRpe: (log: SetLog) => void;
  onAdd: () => void;
  onAddWarmup: () => void;
  onMoveSet: (kind: SetKind, from: number, to: number) => void;
  onSetDrag: (dragging: boolean) => void;
  /** Segurar o cabeçalho para arrastar o exercício. */
  handle?: DragHandleProps;
  /** Durante o arraste de exercícios, só o cabeçalho aparece. */
  collapsed?: boolean;
}) {
  const t = useTheme();
  const prescription = prescriptionLine(item, load);
  const restLabel = restOverridden
    ? `${formatRestDuration(restSec)} · seu ajuste`
    : item.restText && item.restText !== '—'
      ? item.restText
      : formatRestDuration(restSec);

  return (
    <View style={[styles.block, collapsed && styles.blockCollapsed, isChild && { paddingLeft: space.md, borderLeftWidth: 2, borderLeftColor: t.separator }]}>
      <View style={styles.header}>
        <Pressable
          style={styles.title}
          accessibilityRole="button"
          accessibilityLabel={`${item.name}, ${KIND_LABEL[item.kind]}${complete ? ', feito' : ''}. Abrir o exercício`}
          accessibilityHint={handle ? 'Segure e arraste para mudar a ordem dos exercícios' : undefined}
          onPress={onOpen}
          {...handle}
        >
          <View style={[styles.avatar, { backgroundColor: t.surface }]}>
            <Ionicons name={isLift ? 'barbell' : 'fitness'} size={22} color={complete ? t.done : t.accent} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.name, { color: t.accent }]}>{item.name}</Text>
            <Text style={[styles.kind, { color: complete ? t.done : t.muted }]}>
              {KIND_LABEL[item.kind]}
              {complete ? ' · feito' : ''}
            </Text>
          </View>
        </Pressable>
        {collapsed ? (
          <Ionicons name="reorder-three" size={26} color={t.muted} />
        ) : (
          <IconButton name="ellipsis-vertical" label={`Opções de ${item.name}`} onPress={onMenu} size={20} />
        )}
      </View>
      {collapsed ? null : (
        <>
          {prescription ? <Text style={[styles.prescription, { color: t.text }]}>{prescription}</Text> : null}
          {item.notes ? <Text style={[styles.notes, { color: t.muted }]}>{item.notes}</Text> : null}
          {tip ? <Text style={[styles.tip, { color: t.accent }]}>{tip}</Text> : null}
          <Pressable
            style={styles.restRow}
            accessibilityRole="button"
            accessibilityLabel={`Descanso: ${restLabel}. Editar`}
            onPress={onRest}
            hitSlop={8}
          >
            <Ionicons name="timer-outline" size={16} color={t.accent} />
            <Text style={[styles.rest, { color: t.accent }]}>Descanso: {restLabel}</Text>
            <Ionicons name="create-outline" size={14} color={t.accent} />
          </Pressable>

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
            warmups={warmups}
            warmupDrafts={warmupDrafts}
            lock={lock}
            showRpe={showRpe}
            pendingRpeIndex={pendingRpeIndex}
            onCheck={onCheck}
            onUncheck={onUncheck}
            onEdit={onEdit}
            onRemove={onRemove}
            onSetMenu={onSetMenu}
            onRpe={onRpe}
            onAdd={onAdd}
            onAddWarmup={onAddWarmup}
            onMoveSet={onMoveSet}
            onDragChange={onSetDrag}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.sm, paddingVertical: space.lg },
  blockCollapsed: { paddingVertical: space.sm },
  title: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  name: { ...font.headline },
  kind: { fontSize: 13 },
  prescription: { fontSize: 15, fontWeight: '500' },
  notes: { fontSize: 14, lineHeight: 19 },
  tip: { fontSize: 14, fontWeight: '600' },
  restRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 28 },
  rest: { fontSize: 14, fontWeight: '500' },
  lockBox: { borderRadius: radius.button, padding: space.md, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  unlockBtn: { minHeight: 40, borderRadius: radius.cell, paddingHorizontal: space.md, justifyContent: 'center' },
});
