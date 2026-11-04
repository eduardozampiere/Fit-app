import { useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertCard } from '../../components/AlertCard';
import { CheckinSummary } from '../../components/CheckinSummary';
import { ExerciseCard } from '../../components/ExerciseCard';
import { PlateCalculator } from '../../components/PlateCalculator';
import { RedFlagModal } from '../../components/RedFlagModal';
import { RestTimerBar } from '../../components/RestTimerBar';
import { SetEditor, type EditableSet } from '../../components/SetEditor';
import type { SetInput } from '../../components/SetTable';
import { ActionMenu, BigButton, Card, Chip, Divider, IconButton, type MenuOption } from '../../components/ui';
import { WorkoutStats } from '../../components/WorkoutStats';
import {
  deleteSet,
  deleteSetAndRenumber,
  ensureSessionLog,
  getSetting,
  insertSets,
  listSessionLogs,
  listSetLogs,
  setCountsKey,
  setSessionStatus,
  setSetting,
  updateSet,
} from '../../db/repo';
import { toISODate } from '../../domain/dates';
import { formatDateShort, formatNumber, WEEKDAY_NAMES, WEEKDAY_SHORT } from '../../domain/format';
import {
  asPlannedSets,
  draftFromInput,
  plannedCountFor,
  plannedSet,
  renumberAfterRemoval,
  sessionStats,
  setRowCount,
} from '../../domain/logging';
import {
  currentLoad,
  findSession,
  liftOf,
  nextSessionFrom,
  restSeconds,
  RPE_KINDS,
  sessionForDate,
  sessionItems,
  type SessionRef,
} from '../../domain/plan';
import { gripForSet, gripTip, hasRedFlags, sessionLocks } from '../../domain/rules';
import type { PrescribedItem, SessionLog, SetLog } from '../../domain/types';
import { useAppData } from '../../state/AppData';
import { useRestTimer } from '../../state/RestTimer';
import { useCoach } from '../../state/useCoach';
import { RPE_CHOICES } from '../../domain/rpe';
import { font, space, useTheme } from '../../ui/theme';

const GENERIC_NOTE = /^(% calculado|Registro:)/;

export default function TodayScreen() {
  const t = useTheme();
  const db = useSQLiteContext();
  const { cycle, maxes, version, bump } = useAppData();
  const timer = useRestTimer();
  const coach = useCoach();
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
  const [plates, setPlates] = useState<{ kg: number | null; exerciseId: string } | null>(null);
  const [menu, setMenu] = useState<{ title?: string; options: MenuOption[]; columns?: number } | null>(null);
  // Séries adicionadas/removidas no treino do dia, por item.
  const [setCounts, setSetCounts] = useState<Record<string, number>>({});
  const [failUnlocked, setFailUnlocked] = useState(false);
  const [redFlagSeen, setRedFlagSeen] = useState(false);

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
      setFailUnlocked(current ? await getSetting(db, `unlock-fail:${current.id}`, false) : false);
      setSetCounts(current ? await getSetting<Record<string, number>>(db, setCountsKey(current.id), {}) : {});
    })();
    return () => {
      alive = false;
    };
  }, [db, cycle, ref, version]);

  const items = useMemo(() => (ref ? sessionItems(ref.week, ref.session) : []), [ref]);
  const loadOf = useCallback((item: PrescribedItem) => (cycle && maxes ? currentLoad(cycle, item, maxes) : item.load), [cycle, maxes]);
  const logsOf = useCallback((item: PrescribedItem) => setLogs.filter((l) => l.itemId === item.id), [setLogs]);
  // Regras 4 e 5: séries bloqueadas (4ª do terra, terra falhou).
  const locks = useMemo(
    () => (cycle && ref ? sessionLocks(cycle, ref.week, items, setLogs, failUnlocked) : new Map()),
    [cycle, ref, items, setLogs, failUnlocked],
  );
  // "Conforme o plano" já com a pegada sugerida (regra 10).
  const planned = useCallback(
    (item: PrescribedItem, idx: number) => ({
      ...plannedSet(item, loadOf(item), idx),
      grip: cycle && ref ? gripForSet(cycle, ref.week, item, idx) : null,
    }),
    [cycle, ref, loadOf],
  );
  const rowsOf = useCallback(
    (item: PrescribedItem) => setRowCount(item, setCounts[item.id], logsOf(item).map((l) => l.setIndex)),
    [setCounts, logsOf],
  );
  const plannedCountOf = useCallback((item: PrescribedItem) => plannedCountFor(item, setCounts[item.id]), [setCounts]);
  const missingPlanned = useCallback(
    (item: PrescribedItem) => {
      const lock = locks.get(item.id);
      return asPlannedSets(item, loadOf(item), logsOf(item).map((l) => l.setIndex), plannedCountOf(item))
        .filter((d) => !lock || d.setIndex < lock.fromSet)
        .map((d) => planned(item, d.setIndex));
    },
    [locks, loadOf, logsOf, planned, plannedCountOf],
  );

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

  const checkSet = async (item: PrescribedItem, idx: number, input: SetInput) => {
    const log = await ensureLog();
    await insertSets(db, log.id, [draftFromInput(planned(item, idx), input)]);
    startRest(item, idx);
    bump();
  };

  const uncheckSet = async (log: SetLog) => {
    await deleteSet(db, log.id);
    bump();
  };

  const editSet = async (log: SetLog, input: SetInput) => {
    const next = draftFromInput(log, input);
    if (next.loadKg === log.loadKg && next.reps === log.reps && next.durationSec === log.durationSec) return;
    await updateSet(db, { ...log, ...next });
    bump();
  };

  const saveSetCount = async (item: PrescribedItem, count: number) => {
    const log = await ensureLog();
    const next = { ...setCounts, [item.id]: Math.max(0, count) };
    await setSetting(db, setCountsKey(log.id), next);
    setSetCounts(next);
  };

  const addSet = async (item: PrescribedItem) => {
    await saveSetCount(item, rowsOf(item) + 1);
    bump();
  };

  /** Remove a linha `idx` (e a série gravada nela, se houver); as seguintes sobem uma posição. */
  const removeSet = async (item: PrescribedItem, idx: number, log: SetLog | null) => {
    await deleteSetAndRenumber(db, log?.id ?? null, renumberAfterRemoval(logsOf(item), idx));
    await saveSetCount(item, rowsOf(item) - 1);
    bump();
  };

  const allAsPlanned = async (item: PrescribedItem) => {
    const log = await ensureLog();
    await insertSets(db, log.id, missingPlanned(item));
    bump();
  };

  const sessionAsPlanned = async () => {
    const log = await ensureLog();
    const drafts = items.flatMap((item) => missingPlanned(item));
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

  const setRpe = async (log: SetLog, rpe: number | null) => {
    await updateSet(db, { ...log, rpe });
    bump();
  };

  const openRpeMenu = (log: SetLog) =>
    setMenu({
      title: `RPE da série ${log.setIndex}`,
      columns: 4,
      options: [
        ...RPE_CHOICES.map((r) => ({ label: formatNumber(r), onPress: () => setRpe(log, r) })),
        { label: '—', onPress: () => setRpe(log, null) },
      ],
    });

  const openSetMenu = (item: PrescribedItem, idx: number, log: SetLog | null) =>
    setMenu({
      title: `${item.name} · série ${idx}`,
      options: [
        {
          label: log ? 'Detalhes (RPE, pegada, cinto, falha)' : 'Registrar com detalhes',
          icon: 'create-outline',
          onPress: () => openEditor(item, idx, log),
        },
        { label: 'Remover série', icon: 'trash-outline', destructive: true, onPress: () => removeSet(item, idx, log) },
      ],
    });

  const openExerciseMenu = (item: PrescribedItem) => {
    const kg = loadOf(item)?.min ?? null;
    setMenu({
      title: item.name,
      options: [
        { label: 'Calculadora de anilhas', icon: 'calculator-outline', onPress: () => setPlates({ kg, exerciseId: item.exerciseId }) },
        { label: 'Completar conforme o plano', icon: 'checkmark-done-outline', onPress: () => allAsPlanned(item) },
        { label: 'Adicionar série', icon: 'add-circle-outline', onPress: () => addSet(item) },
      ],
    });
  };

  const openEditor = (item: PrescribedItem, idx: number, log: SetLog | null) => {
    setEditor({ item, draft: log ?? planned(item, idx), key: `${item.id}-${idx}-${log?.id ?? 'new'}` });
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

  const toggleFailLock = async (unlocked: boolean) => {
    const log = await ensureLog();
    await setSetting(db, `unlock-fail:${log.id}`, unlocked);
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
  // Alertas desta semana e da anterior (portões aparecem na semana seguinte) + regra das 24 h de hoje.
  const sessionAlerts = coach.pending.filter((a) =>
    a.rule === 'pain_24h' ? isToday : a.week === ref.week.number || a.week === ref.week.number - 1,
  );
  const redFlagToday = hasRedFlags(coach.todayCheckin);

  const goWeek = (delta: number) => {
    const w = cycle.weeks[weekIdx + delta];
    if (w) setSelectedId(w.sessions[0].id);
  };

  const stats = sessionStats(setLogs);
  const plannedSets = items.reduce((acc, it) => acc + plannedCountOf(it), 0);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView
        contentContainerStyle={styles.body}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
      >
        <View style={styles.weekNav}>
          <View style={{ opacity: weekIdx <= 0 ? 0.3 : 1 }}>
            <IconButton name="chevron-back" label="Semana anterior" onPress={() => goWeek(-1)} color={t.accent} />
          </View>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[styles.weekTitle, { color: t.text }]} accessibilityRole="header">
              Semana {ref.week.number} · {ref.week.block}
            </Text>
            <Text style={[styles.weekSub, { color: t.muted }]}>
              início {formatDateShort(ref.week.start)} · RPE alvo {ref.week.targetRpeText.replace(/\./g, ',')}
            </Text>
          </View>
          <View style={{ opacity: weekIdx >= cycle.weeks.length - 1 ? 0.3 : 1 }}>
            <IconButton name="chevron-forward" label="Próxima semana" onPress={() => goWeek(1)} color={t.accent} />
          </View>
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

        <View style={{ gap: 2 }}>
          <Text style={[styles.dayTitle, { color: t.text }]}>
            {WEEKDAY_NAMES[ref.session.weekday]} — {ref.session.title}
          </Text>
          <Text style={[styles.daySub, { color: t.muted }]}>
            {isToday ? 'Hoje' : `Planejado para ${formatDateShort(ref.date)}`}
            {sessionLog && sessionLog.date !== ref.date ? ` · feito em ${formatDateShort(sessionLog.date)}` : ''}
            {!isToday && !plannedToday && !sessionLog ? ' · hoje não tem treino no plano' : ''}
          </Text>
        </View>

        <WorkoutStats stats={stats} plannedSets={plannedSets} running={!done && stats.sets > 0} />
        <Divider />

        {redFlagToday ? (
          <Card style={{ backgroundColor: t.dangerBg, borderColor: t.danger }}>
            <Text style={{ color: t.danger, fontSize: 17, fontWeight: '700' }}>
              Sinal de alarme da lombar no check-in de hoje. Não treine: procure um pronto-socorro.
            </Text>
            <BigButton label="Ver orientação" variant="danger" compact onPress={() => setRedFlagSeen(false)} />
          </Card>
        ) : null}

        {isToday ? <CheckinSummary checkin={coach.todayCheckin} /> : null}

        {sessionAlerts.map((a) => (
          <AlertCard key={a.key} alert={a} onDecide={(status) => coach.decide(a, status)} />
        ))}

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
            label="Treino feito conforme o plano"
            icon="checkmark-done"
            onPress={sessionAsPlanned}
            accessibilityHint="Registra todas as séries que faltam exatamente como no plano"
          />
        ) : (
          <Card style={{ backgroundColor: t.doneBg, borderColor: t.doneBg }}>
            <Text style={{ color: t.done, fontSize: 16, fontWeight: '600' }}>
              Treino concluído{sessionLog ? ` em ${formatDateShort(sessionLog.date)}` : ''}. Dá para ajustar qualquer série na tabela.
            </Text>
          </Card>
        )}

        <View>
          {items.map((item, i) => {
            const logs = logsOf(item);
            const lock = locks.get(item.id);
            const plannedCount = plannedCountOf(item);
            const effective = lock ? Math.min(plannedCount, lock.fromSet - 1) : plannedCount;
            const showRpe = RPE_KINDS.has(item.kind);
            const last = logs.length ? logs.reduce((a, b) => (b.setIndex > a.setIndex ? b : a)) : null;
            return (
              <View key={item.id}>
                {i > 0 ? <Divider /> : null}
                <ExerciseCard
                  item={item}
                  load={loadOf(item)}
                  logs={logs}
                  isChild={!!item.parentId}
                  isLift={liftOf(cycle, item) !== null}
                  rows={rowsOf(item)}
                  plannedCount={plannedCount}
                  complete={logs.length >= effective && (logs.length > 0 || effective === 0)}
                  restSec={restSeconds(item)}
                  showRpe={showRpe}
                  pendingRpeIndex={showRpe && last && last.rpe === null ? last.setIndex : null}
                  lock={lock}
                  onUnlock={() => toggleFailLock(true)}
                  tip={gripTip(cycle, ref.week, item)}
                  onMenu={() => openExerciseMenu(item)}
                  onCheck={(idx, input) => checkSet(item, idx, input)}
                  onUncheck={uncheckSet}
                  onEdit={editSet}
                  onSetMenu={(idx, log) => openSetMenu(item, idx, log)}
                  onRpe={openRpeMenu}
                  onAdd={() => addSet(item)}
                />
              </View>
            );
          })}
        </View>

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
      {menu ? <ActionMenu title={menu.title} options={menu.options} columns={menu.columns} onClose={() => setMenu(null)} /> : null}
      <RedFlagModal visible={redFlagToday && !redFlagSeen} onClose={() => setRedFlagSeen(true)} />
      {plates ? (
        <PlateCalculator visible initialKg={plates.kg} exerciseId={plates.exerciseId} onClose={() => setPlates(null)} />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { padding: space.lg, gap: space.md, paddingBottom: 32 },
  weekNav: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  weekTitle: { ...font.headline },
  weekSub: { fontSize: 13 },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'center' },
  dayTitle: { fontSize: 22, fontWeight: '700' },
  daySub: { fontSize: 15 },
  footer: { fontSize: 13, textAlign: 'center' },
});
