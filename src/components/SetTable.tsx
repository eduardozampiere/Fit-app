import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { formatNumber, formatRange } from '../domain/format';
import type { SetLock } from '../domain/rules';
import type { PrescribedItem, SetLog } from '../domain/types';
import { radius, space, useTheme } from '../ui/theme';
import { BigButton } from './ui';

export interface SetInput {
  load: string;
  work: string;
}

const COL = { set: 34, load: 66, work: 54, rpe: 48, check: 44 } as const;

/**
 * Tabela de séries no estilo do Hevy: SÉRIE · PLANO · KG · REPS · (RPE) · ✓.
 * Célula vazia mostra o valor do plano em cinza; ✓ registra o que foi digitado ou, sem nada digitado,
 * conforme o plano. Tocar no número da série abre o menu (detalhes, remover).
 */
export function SetTable({
  item,
  plannedLoad,
  logs,
  rows,
  plannedCount,
  lock,
  showRpe,
  pendingRpeIndex,
  onCheck,
  onUncheck,
  onEdit,
  onSetMenu,
  onRpe,
  onAdd,
}: {
  item: PrescribedItem;
  plannedLoad: number | null;
  logs: SetLog[];
  rows: number;
  plannedCount: number;
  lock?: SetLock;
  showRpe: boolean;
  /** Série cujo RPE o app está pedindo (destacada). */
  pendingRpeIndex: number | null;
  onCheck: (setIndex: number, input: SetInput) => void;
  onUncheck: (log: SetLog) => void;
  onEdit: (log: SetLog, input: SetInput) => void;
  onSetMenu: (setIndex: number, log: SetLog | null) => void;
  onRpe: (log: SetLog) => void;
  onAdd: () => void;
}) {
  const t = useTheme();
  const isDuration = !!item.durationSec && !item.reps;
  const plannedWork = isDuration ? formatRange(item.durationSec) : item.reps ? formatRange(item.reps) : '—';
  const plannedText = `${plannedLoad !== null ? formatNumber(plannedLoad) : '—'}×${plannedWork}`;

  return (
    <View style={{ gap: 2 }}>
      <View style={styles.headRow} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Text style={[styles.head, { width: COL.set, color: t.muted }]}>SÉRIE</Text>
        <Text style={[styles.head, styles.flex, { color: t.muted }]}>PLANO</Text>
        <Text style={[styles.head, styles.center, { width: COL.load, color: t.muted }]}>KG</Text>
        <Text style={[styles.head, styles.center, { width: COL.work, color: t.muted }]}>{isDuration ? 'SEG' : 'REPS'}</Text>
        {showRpe ? <Text style={[styles.head, styles.center, { width: COL.rpe, color: t.muted }]}>RPE</Text> : null}
        <View style={{ width: COL.check, alignItems: 'center' }}>
          <Ionicons name="checkmark" size={16} color={t.muted} />
        </View>
      </View>

      {Array.from({ length: rows }, (_, i) => i + 1).map((idx) => {
        const log = logs.find((l) => l.setIndex === idx) ?? null;
        const locked = !log && !!lock && idx >= lock.fromSet;
        if (locked) {
          return (
            <View
              key={idx}
              style={[styles.row, { backgroundColor: t.surface, opacity: 0.6 }]}
              accessible
              accessibilityLabel={`Série ${idx} bloqueada: ${lock!.reason}`}
            >
              <Text style={[styles.setIdx, { width: COL.set, color: t.muted }]}>{idx}</Text>
              <Ionicons name="lock-closed" size={16} color={t.muted} />
              <Text style={[styles.lockedText, { color: t.muted }]}>bloqueada</Text>
            </View>
          );
        }
        return (
          <SetRow
            key={`${idx}-${log?.id ?? 'new'}-${log?.loadKg}-${log?.reps}-${log?.durationSec}`}
            idx={idx}
            log={log}
            optional={idx > plannedCount}
            plannedText={plannedText}
            plannedLoad={plannedLoad}
            plannedWork={plannedWork}
            isDuration={isDuration}
            showRpe={showRpe}
            rpePending={pendingRpeIndex === idx}
            onCheck={(input) => onCheck(idx, input)}
            onUncheck={onUncheck}
            onEdit={onEdit}
            onMenu={() => onSetMenu(idx, log)}
            onRpe={onRpe}
          />
        );
      })}

      <View style={{ marginTop: space.sm }}>
        <BigButton label="Adicionar série" icon="add" variant="neutral" compact onPress={onAdd} />
      </View>
    </View>
  );
}

function SetRow({
  idx,
  log,
  optional,
  plannedText,
  plannedLoad,
  plannedWork,
  isDuration,
  showRpe,
  rpePending,
  onCheck,
  onUncheck,
  onEdit,
  onMenu,
  onRpe,
}: {
  idx: number;
  log: SetLog | null;
  optional: boolean;
  plannedText: string;
  plannedLoad: number | null;
  plannedWork: string;
  isDuration: boolean;
  showRpe: boolean;
  rpePending: boolean;
  onCheck: (input: SetInput) => void;
  onUncheck: (log: SetLog) => void;
  onEdit: (log: SetLog, input: SetInput) => void;
  onMenu: () => void;
  onRpe: (log: SetLog) => void;
}) {
  const t = useTheme();
  const loggedWork = log ? (isDuration ? log.durationSec : log.reps) : null;
  // A tabela remonta a linha (key) quando a série gravada muda, então o estado inicial basta.
  const [load, setLoad] = useState(log?.loadKg != null ? formatNumber(log.loadKg, 2) : '');
  const [work, setWork] = useState(loggedWork != null ? String(loggedWork) : '');
  const rowBg = log ? (log.failed ? t.dangerBg : t.doneBg) : 'transparent';
  const cellBg = log ? 'transparent' : t.surface;
  const commitEdit = () => {
    if (log) onEdit(log, { load, work });
  };

  return (
    <View style={[styles.row, { backgroundColor: rowBg }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Série ${idx}${optional ? ', opcional' : ''}. Abrir menu da série`}
        onPress={onMenu}
        hitSlop={8}
        style={[styles.setIdxBtn, { width: COL.set }]}
      >
        <Text style={[styles.setIdx, { color: optional && !log ? t.muted : t.text }]}>{idx}</Text>
      </Pressable>
      <Text style={[styles.planned, styles.flex, { color: t.muted }]} numberOfLines={1}>
        {log?.failed ? 'falhou' : optional && !log ? `${plannedText} opc.` : plannedText}
      </Text>
      <TextInput
        value={load}
        onChangeText={setLoad}
        onEndEditing={commitEdit}
        placeholder={plannedLoad !== null ? formatNumber(plannedLoad, 2) : '—'}
        placeholderTextColor={t.muted}
        keyboardType="decimal-pad"
        selectTextOnFocus
        accessibilityLabel={`Carga da série ${idx} em quilos`}
        style={[styles.cell, { width: COL.load, color: t.text, backgroundColor: cellBg }]}
      />
      <TextInput
        value={work}
        onChangeText={setWork}
        onEndEditing={commitEdit}
        placeholder={plannedWork}
        placeholderTextColor={t.muted}
        keyboardType="number-pad"
        selectTextOnFocus
        accessibilityLabel={`${isDuration ? 'Segundos' : 'Repetições'} da série ${idx}`}
        style={[styles.cell, { width: COL.work, color: t.text, backgroundColor: cellBg }]}
      />
      {showRpe ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={log ? `RPE da série ${idx}: ${log.rpe !== null ? formatNumber(log.rpe) : 'não informado'}` : `RPE da série ${idx}`}
          disabled={!log}
          onPress={() => log && onRpe(log)}
          style={[
            styles.rpeCell,
            { width: COL.rpe },
            rpePending && { borderColor: t.accent, borderWidth: 2 },
          ]}
        >
          <Text style={[styles.rpeText, { color: rpePending ? t.accent : log?.rpe != null ? t.text : t.muted }]}>
            {log?.rpe != null ? formatNumber(log.rpe) : rpePending ? 'RPE?' : '—'}
          </Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={log ? `Série ${idx} feita. Desmarcar` : `Concluir série ${idx}`}
        accessibilityState={{ checked: !!log }}
        onPress={() => (log ? onUncheck(log) : onCheck({ load, work }))}
        hitSlop={10}
        style={[styles.checkWrap, { width: COL.check }]}
      >
        <View style={[styles.check, { backgroundColor: log ? (log.failed ? t.danger : t.done) : t.surface }]}>
          <Ionicons name={log?.failed ? 'close' : 'checkmark'} size={22} color={log ? t.accentText : t.muted} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.xs, marginBottom: 2 },
  head: { fontSize: 11, fontWeight: '600', letterSpacing: 0.4 },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.xs, borderRadius: radius.cell },
  setIdxBtn: { height: 44, justifyContent: 'center' },
  setIdx: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  planned: { fontSize: 14, fontVariant: ['tabular-nums'] },
  cell: { height: 40, borderRadius: radius.cell, textAlign: 'center', fontSize: 17, fontWeight: '600', fontVariant: ['tabular-nums'], padding: 0 },
  rpeCell: { height: 40, borderRadius: radius.cell, alignItems: 'center', justifyContent: 'center' },
  rpeText: { fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
  checkWrap: { height: 44, alignItems: 'center', justifyContent: 'center' },
  check: { width: 36, height: 36, borderRadius: radius.cell, alignItems: 'center', justifyContent: 'center' },
  lockedText: { fontSize: 14, marginLeft: space.xs },
});
