import { useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ExerciseCard } from '../../components/ExerciseCard';
import { PlateCalculator } from '../../components/PlateCalculator';
import { RestTimerBar } from '../../components/RestTimerBar';
import { SetEditor, type EditableSet } from '../../components/SetEditor';
import { BigButton, Card, Chip } from '../../components/ui';
import {
  deleteSet,
  ensureSessionLog,
  insertSets,
  listSessionLogs,
  listSetLogs,
  setSessionStatus,
  updateSet,
} from '../../db/repo';
import { toISODate } from '../../domain/dates';
import { formatDateShort, formatNumber, WEEKDAY_NAMES, WEEKDAY_SHORT } from '../../domain/format';
import { asPlannedSets, plannedSet } from '../../domain/logging';
import {
  currentLoad,
  findSession,
  liftOf,
  nextSessionFrom,
  restSeconds,
  sessionForDate,
  sessionItems,
  type SessionRef,
} from '../../domain/plan';
import type { PrescribedItem, SessionLog, SetLog } from '../../domain/types';
import { useAppData } from '../../state/AppData';
import { useRestTimer } from '../../state/RestTimer';
import { useTheme } from '../../ui/theme';

const GENERIC_NOTE = /^(% calculado|Registro:)/;

export default function TodayScreen() {
  const t = useTheme();
  const db = useSQLiteContext();
  const { cycle, maxes, version, bump } = useAppData();
  const timer = useRestTimer();
  const params = useLocalSearchParams<{ sessionId?: string; at?: string }>();
  const today = toISODate(new Date());

  const defaultRef = useMemo<SessionRef | null>(() => {
    if (!cycle) return null;
    return (
      sessionForDate(cycle, today) ??
      nextSessionFrom(cycle, today) ??
      findSession(cycle, cycle.weeks[cycle.weeks.length - 1].sessions.slice(-1)[0].id)
    );
  }, [cycle, today]);

  const [selectedId, setSelectedId] = useState<string | null>(params.sessionId ?? null);
  // Navegação vinda da aba Plano: `at` muda a cada toque, então reabre mesmo a mesma sessão.
  const [lastNav, setLastNav] = useState(params.at);
  if (params.at !== lastNav) {
    setLastNav(params.at);
    setSelectedId(params.sessionId ?? null);
  }

  const ref = useMemo(() => {
    if (!cycle) return null;
    const id = selectedId ?? defaultRef?.session.id;
    return id ? findSession(cycle, id) : null;
  }, [cycle, selectedId, defaultRef]);

  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([]);
  const [setLogs, setSetLogs] = useState<SetLog[]>([]);
  const [editor, setEditor] = useState<{ item: PrescribedItem; draft: EditableSet; key: string } | null>(null);
  const [plateKg, setPlateKg] = useState<number | null | undefined>(undefined);

  const sessionLog = useMemo(
    () => (ref ? sessionLogs.find((l) => l.sessionId === ref.session.id) ?? null : null),
    [sessionLogs, ref],
  );

  useEffect(() => {
    if (!cycle) return;
    let alive = true;
    (async () => {
      const logs = await listSessionLogs(db, cycle.id);
      if (!alive) return;
      setSessionLogs(logs);
      const current = ref ? logs.find((l) => l.sessionId === ref.session.id) : undefined;
      setSetLogs(current ? await listSetLogs(db, current.id) : []);
    })();
    return () => {
      alive = false;
    };
  }, [db, cycle, ref, version]);

  const items = useMemo(() => (ref ? sessionItems(ref.week, ref.session) : []), [ref]);
  const loadOf = useCallback((item: PrescribedItem) => (cycle && maxes ? currentLoad(cycle, item, maxes) : item.load), [cycle, maxes]);
  const logsOf = useCallback((item: PrescribedItem) => setLogs.filter((l) => l.itemId === item.id), [setLogs]);

  const ensureLog = useCallback(async () => {
    if (!cycle || !ref) throw new Error('sem sessão');
    return sessionLog ?? (await ensureSessionLog(db, cycle.id, ref.week.number, ref.session.id, today));
  }, [db, cycle, ref, sessionLog, today]);

  const nextLabel = useCallback(
    (item: PrescribedItem, setIndex: number) => {
      const total = item.sets?.min ?? 1;
      if (setIndex < total) return `${item.name} — série ${setIndex + 1}`;
      const idx = items.findIndex((i) => i.id === item.id);
      const next = items.slice(idx + 1).find((i) => logsOf(i).length === 0);
      return next ? next.name : 'fim do treino';
    },
    [items, logsOf],
  );

  const startRest = useCallback(
    (item: PrescribedItem, setIndex: number) => timer.start(restSeconds(item), nextLabel(item, setIndex)),
    [timer, nextLabel],
  );

  const quickSet = async (item: PrescribedItem, idx: number) => {
    const log = await ensureLog();
    await insertSets(db, log.id, [plannedSet(item, loadOf(item), idx)]);
    startRest(item, idx);
    bump();
  };

  const allAsPlanned = async (item: PrescribedItem) => {
    const log = await ensureLog();
    await insertSets(db, log.id, asPlannedSets(item, loadOf(item), logsOf(item).map((l) => l.setIndex)));
    bump();
  };

  const sessionAsPlanned = async () => {
    const log = await ensureLog();
    const drafts = items.flatMap((item) => asPlannedSets(item, loadOf(item), logsOf(item).map((l) => l.setIndex)));
    await insertSets(db, log.id, drafts);
    await setSessionStatus(db, log.id, 'done');
    timer.stop();
    bump();
  };

  const finishSession = async () => {
    const log = await ensureLog();
    await setSessionStatus(db, log.id, sessionLog?.status === 'done' ? 'in_progress' : 'done');
    bump();
  };

  const quickRpe = async (item: PrescribedItem, rpe: number) => {
    const logs = logsOf(item);
    if (!logs.length) return;
    const last = logs.reduce((a, b) => (b.setIndex > a.setIndex ? b : a));
    await updateSet(db, { ...last, rpe });
    bump();
  };

  const openEditor = (item: PrescribedItem, idx: number, log: SetLog | null) => {
    setEditor({ item, draft: log ?? plannedSet(item, loadOf(item), idx), key: `${item.id}-${idx}-${log?.id ?? 'new'}` });
  };

  const saveEditor = async (s: EditableSet) => {
    if (!editor) return;
    const existing = setLogs.find((l) => l.id === s.id);
    if (existing) {
      await updateSet(db, { ...existing, ...s });
    } else {
      const log = await ensureLog();
      const { id: _id, ...draft } = s;
      await insertSets(db, log.id, [draft]);
      startRest(editor.item, s.setIndex);
    }
    setEditor(null);
    bump();
  };

  const removeFromEditor = async () => {
    if (editor?.draft.id) await deleteSet(db, editor.draft.id);
    setEditor(null);
    bump();
  };

  if (!cycle || !maxes || !ref) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: t.bg }]}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  const isToday = ref.date === today;
  const plannedToday = sessionForDate(cycle, today);
  const done = sessionLog?.status === 'done';
  const weekIdx = cycle.weeks.findIndex((w) => w.number === ref.week.number);
  const weekNotes = [ref.week.note, ...ref.week.notes.filter((n) => !GENERIC_NOTE.test(n))].filter(Boolean) as string[];
  const doneSessions = new Set(sessionLogs.filter((l) => l.status === 'done').map((l) => l.sessionId));
  const startedSessions = new Set(sessionLogs.map((l) => l.sessionId));

  const goWeek = (delta: number) => {
    const w = cycle.weeks[weekIdx + delta];
    if (w) setSelectedId(w.sessions[0].id);
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={styles.body} contentInsetAdjustmentBehavior="automatic">
        <View style={styles.weekNav}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Semana anterior"
            disabled={weekIdx <= 0}
            onPress={() => goWeek(-1)}
            style={[styles.navBtn, { backgroundColor: t.chip, opacity: weekIdx <= 0 ? 0.3 : 1 }]}
          >
            <Text style={[styles.navText, { color: t.text }]}>‹</Text>
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[styles.weekTitle, { color: t.text }]} accessibilityRole="header">
              Semana {ref.week.number} · {ref.week.block}
            </Text>
            <Text style={[styles.weekSub, { color: t.muted }]}>
              início {formatDateShort(ref.week.start)} · RPE alvo {ref.week.targetRpeText.replace(/\./g, ',')}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Próxima semana"
            disabled={weekIdx >= cycle.weeks.length - 1}
            onPress={() => goWeek(1)}
            style={[styles.navBtn, { backgroundColor: t.chip, opacity: weekIdx >= cycle.weeks.length - 1 ? 0.3 : 1 }]}
          >
            <Text style={[styles.navText, { color: t.text }]}>›</Text>
          </Pressable>
        </View>

        <View style={styles.days}>
          {ref.week.sessions.map((s) => (
            <Chip
              key={s.id}
              label={`${WEEKDAY_SHORT[s.weekday]}${doneSessions.has(s.id) ? ' ✓' : ''}`}
              selected={s.id === ref.session.id}
              tone={doneSessions.has(s.id) ? 'success' : startedSessions.has(s.id) ? 'warn' : undefined}
              onPress={() => setSelectedId(s.id)}
              accessibilityLabel={`${WEEKDAY_NAMES[s.weekday]}: ${s.title}${doneSessions.has(s.id) ? ', feito' : ''}`}
            />
          ))}
        </View>

        <View style={{ gap: 4 }}>
          <Text style={[styles.dayTitle, { color: t.text }]}>
            {WEEKDAY_NAMES[ref.session.weekday]} — {ref.session.title}
          </Text>
          <Text style={[styles.daySub, { color: t.muted }]}>
            {isToday ? 'Hoje' : `Planejado para ${formatDateShort(ref.date)}`}
            {sessionLog && sessionLog.date !== ref.date ? ` · feito em ${formatDateShort(sessionLog.date)}` : ''}
            {!isToday && !plannedToday && !sessionLog ? ' · hoje não tem treino no plano' : ''}
          </Text>
        </View>

        {weekNotes.length ? (
          <Card style={{ backgroundColor: t.warnBg, borderColor: t.warnBg }}>
            {weekNotes.map((n, i) => (
              <Text key={i} style={{ color: t.text, fontSize: 15, lineHeight: 20 }}>
                {n}
              </Text>
            ))}
          </Card>
        ) : null}

        {!done ? (
          <BigButton
            label="✓ Treino feito conforme o plano"
            variant="success"
            onPress={sessionAsPlanned}
            accessibilityHint="Registra todas as séries que faltam exatamente como no plano"
          />
        ) : (
          <Card style={{ backgroundColor: t.successBg, borderColor: t.success }}>
            <Text style={{ color: t.success, fontSize: 17, fontWeight: '700' }}>
              Treino concluído{sessionLog ? ` em ${formatDateShort(sessionLog.date)}` : ''}. Ajuste qualquer série tocando nela.
            </Text>
          </Card>
        )}

        {items.map((item) => (
          <ExerciseCard
            key={item.id}
            item={item}
            load={loadOf(item)}
            logs={logsOf(item)}
            isChild={!!item.parentId}
            onQuickSet={(idx) => quickSet(item, idx)}
            onEditSet={(idx, log) => openEditor(item, idx, log)}
            onAllAsPlanned={() => allAsPlanned(item)}
            onQuickRpe={(rpe) => quickRpe(item, rpe)}
            onPlates={(kg) => setPlateKg(kg)}
          />
        ))}

        {setLogs.length > 0 ? (
          <BigButton label={done ? 'Reabrir treino' : 'Finalizar treino'} variant="neutral" onPress={finishSession} />
        ) : null}
        <Text style={[styles.footer, { color: t.muted }]}>
          Máximos: agacho {formatNumber(maxes.squat)} · supino {formatNumber(maxes.bench)} · terra {formatNumber(maxes.deadlift)}
        </Text>
      </ScrollView>

      {/* No iOS o cronômetro fica no acessório da barra de abas (Liquid Glass). */}
      {Platform.OS !== 'ios' ? <RestTimerBar /> : null}

      {editor ? (
        <SetEditor
          key={editor.key}
          visible
          title={editor.item.name}
          initial={editor.draft}
          showGrip={liftOf(cycle, editor.item) === 'deadlift'}
          onSave={saveEditor}
          onDelete={editor.draft.id ? removeFromEditor : undefined}
          onClose={() => setEditor(null)}
        />
      ) : null}
      {plateKg !== undefined ? (
        <PlateCalculator visible initialKg={plateKg} onClose={() => setPlateKg(undefined)} />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 16, gap: 14, paddingBottom: 32 },
  weekNav: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  navBtn: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  navText: { fontSize: 30, fontWeight: '600', marginTop: -3 },
  weekTitle: { fontSize: 18, fontWeight: '800' },
  weekSub: { fontSize: 13 },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  dayTitle: { fontSize: 24, fontWeight: '800' },
  daySub: { fontSize: 15 },
  footer: { fontSize: 13, textAlign: 'center' },
});
