import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatKg, formatNumber, formatRange } from '../domain/format';
import { KIND_LABEL, maxSetCount, plannedSetCount } from '../domain/plan';
import { RPE_CHOICES } from '../domain/rpe';
import type { PrescribedItem, Range, SetLog } from '../domain/types';
import { TOUCH, useTheme } from '../ui/theme';
import { Badge, BigButton, Card, Chip } from './ui';

const RPE_KINDS = new Set(['main', 'activation_single', 'variation', 'backoff', 'volume_doubles']);

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
  if (item.restText && item.restText !== '—') parts.push(item.restText);
  return parts.filter(Boolean).join(' · ');
}

function setSummary(s: SetLog): string {
  const load = s.loadKg !== null ? formatNumber(s.loadKg) : '—';
  const work = s.durationSec !== null ? `${s.durationSec}s` : s.reps !== null ? String(s.reps) : '—';
  const rpe = s.rpe !== null ? ` @${formatNumber(s.rpe)}` : '';
  return `${load} × ${work}${rpe}${s.failed ? ' · falhou' : ''}`;
}

export function ExerciseCard({
  item,
  load,
  logs,
  isChild,
  onQuickSet,
  onEditSet,
  onAllAsPlanned,
  onQuickRpe,
  onPlates,
}: {
  item: PrescribedItem;
  load: Range | null;
  logs: SetLog[];
  isChild: boolean;
  onQuickSet: (setIndex: number) => void;
  onEditSet: (setIndex: number, log: SetLog | null) => void;
  onAllAsPlanned: () => void;
  onQuickRpe: (rpe: number) => void;
  onPlates: (kg: number | null) => void;
}) {
  const t = useTheme();
  const planned = plannedSetCount(item);
  const rows = Math.max(maxSetCount(item), logs.length ? Math.max(...logs.map((l) => l.setIndex)) : 0);
  const loggedCount = logs.length;
  const complete = loggedCount >= planned;
  const last = logs.length ? logs.reduce((a, b) => (b.setIndex > a.setIndex ? b : a)) : null;
  const askRpe = RPE_KINDS.has(item.kind) && last !== null && last.rpe === null;
  const plannedLoad = load?.min ?? null;
  const plannedWork = item.durationSec ? `${formatRange(item.durationSec)}s` : item.reps ? formatRange(item.reps) : '—';

  return (
    <Card style={[isChild && { marginLeft: 16 }, complete && { borderColor: t.success }]}>
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[styles.name, { color: t.text }]} accessibilityRole="header">
            {item.name}
          </Text>
          <View style={styles.badges}>
            <Badge label={KIND_LABEL[item.kind]} tone={item.kind === 'main' ? 'accent' : 'neutral'} />
            {complete ? <Badge label="Feito" tone="success" /> : null}
          </View>
        </View>
        {plannedLoad !== null ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Calculadora de anilhas para ${formatKg(plannedLoad)}`}
            onPress={() => onPlates(plannedLoad)}
            style={[styles.plateBtn, { backgroundColor: t.chip }]}
          >
            <Text style={[styles.plateBtnText, { color: t.text }]}>Anilhas</Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={[styles.prescription, { color: t.text }]}>{prescriptionLine(item, load)}</Text>
      {item.notes ? <Text style={[styles.notes, { color: t.muted }]}>{item.notes}</Text> : null}

      <View style={{ gap: 6 }}>
        {Array.from({ length: rows }, (_, i) => i + 1).map((idx) => {
          const log = logs.find((l) => l.setIndex === idx) ?? null;
          const optional = idx > planned;
          return (
            <View key={idx} style={styles.setRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  log ? `Série ${idx}: ${setSummary(log)}. Toque para editar` : `Série ${idx} planejada: ${plannedWork} repetições. Toque para registrar diferente`
                }
                onPress={() => onEditSet(idx, log)}
                style={[styles.setMain, { backgroundColor: log ? (log.failed ? t.dangerBg : t.successBg) : t.chip }]}
              >
                <Text style={[styles.setIdx, { color: t.muted }]}>{idx}</Text>
                <Text style={[styles.setText, { color: log ? t.text : t.muted }]}>
                  {log ? setSummary(log) : `${plannedLoad !== null ? formatNumber(plannedLoad) : '—'} × ${plannedWork}`}
                  {!log && optional ? '  (opcional)' : ''}
                </Text>
              </Pressable>
              {!log ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Concluir série ${idx} conforme o plano`}
                  onPress={() => onQuickSet(idx)}
                  style={[styles.checkBtn, { backgroundColor: t.accent }]}
                >
                  <Text style={styles.checkText}>✓</Text>
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </View>

      {askRpe ? (
        <View style={{ gap: 6 }}>
          <Text style={[styles.askRpe, { color: t.muted }]}>RPE da série {last!.setIndex}:</Text>
          <View style={styles.wrap}>
            {RPE_CHOICES.map((r) => (
              <Chip key={r} label={formatNumber(r)} onPress={() => onQuickRpe(r)} accessibilityLabel={`RPE ${formatNumber(r)} na série ${last!.setIndex}`} />
            ))}
          </View>
        </View>
      ) : null}

      {!complete ? <BigButton label="Feito conforme o plano" variant="primary" compact onPress={onAllAsPlanned} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  name: { fontSize: 19, fontWeight: '800' },
  badges: { flexDirection: 'row', gap: 6 },
  prescription: { fontSize: 17, fontWeight: '600' },
  notes: { fontSize: 14, lineHeight: 19 },
  plateBtn: { minHeight: 44, borderRadius: 12, paddingHorizontal: 12, justifyContent: 'center' },
  plateBtnText: { fontSize: 14, fontWeight: '700' },
  setRow: { flexDirection: 'row', gap: 8, alignItems: 'stretch' },
  setMain: { flex: 1, minHeight: TOUCH, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 12 },
  setIdx: { fontSize: 15, fontWeight: '800', width: 18 },
  setText: { fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  checkBtn: { width: TOUCH + 8, minHeight: TOUCH, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  checkText: { color: '#fff', fontSize: 26, fontWeight: '900' },
  askRpe: { fontSize: 14, fontWeight: '600' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
