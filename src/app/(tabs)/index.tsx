import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertCard } from '../../components/AlertCard';
import { CheckinSummary } from '../../components/CheckinSummary';
import { DragList } from '../../components/DragList';
import { ExercisePicker } from '../../components/ExercisePicker';
import { ExerciseCard } from '../../components/ExerciseCard';
import { RestEditor } from '../../components/RestEditor';
import { PlateCalculator } from '../../components/PlateCalculator';
import { RedFlagModal } from '../../components/RedFlagModal';
import { RestTimerBar } from '../../components/RestTimerBar';
import { SetEditor, type EditableSet } from '../../components/SetEditor';
import type { SetInput, SetKind } from '../../components/SetTable';
import { ActionMenu, BigButton, BottomSheet, Card, Chip, Divider, IconButton, type MenuOption } from '../../components/ui';
import { WorkoutHeader, type WorkoutMode } from '../../components/WorkoutHeader';
import { WorkoutStats } from '../../components/WorkoutStats';
import {
  deleteSet,
  deleteSetAndRenumber,
  moveSetToGroup,
  updateSetType,
  ensureSessionLog,
  exerciseOrderKey,
  getSetting,
  insertSets,
  listSessionLogs,
  listSessionsWithSets,
  listSetLogs,
  restOverridesKey,
  retagSetLogs,
  setCountsKey,
  warmupCountsKey,
  startSession,
  finishSession as finishLog,
  reopenSession,
  setSetting,
  updateSet,
} from '../../db/repo';
import { ADD_KINDS, addExerciseToSession, needsLift, swapExercise } from '../../domain/adjustments';
import { toISODate } from '../../domain/dates';
import { formatDate, formatNumber, formatRestDuration, WEEKDAY_NAMES, WEEKDAY_SHORT } from '../../domain/format';
import type { SwapScope } from '../../domain/adjustments';
import {
  asPlannedSets,
  draftFromInput,
  plannedCountFor,
  plannedSet,
  renumberAfterMove,
  renumberAfterRemoval,
  sessionStats,
  setRowCount,
  warmupRowCount,
  warmupSet,
} from '../../domain/logging';
import {
  currentLoad,
  findSession,
  KIND_LABEL,
  LIFT_LABEL,
  LIFTS,
  liftOf,
  nextSessionFrom,
  restOverride,
  restSeconds,
  withRestOverride,
  RPE_KINDS,
  sessionForDate,
  sessionItems,
  type SessionRef,
} from '../../domain/plan';
import { gripForSet, gripTip, hasRedFlags, sessionLocks } from '../../domain/rules';
import type { Exercise, ItemKind, Lift, PrescribedItem, SessionLog, SetLog, SetType } from '../../domain/types';
import { choiceOf, startsRest, type SetChoice } from '../../domain/setTypes';
import { isActiveWorkout } from '../../domain/workout';
import { confirmDiscard } from '../../state/workoutActions';
import { SetTypeSheet } from '../../components/SetTypeSheet';
import { useAppData } from '../../state/AppData';
import { useRestTimer } from '../../state/RestTimer';
import { useCoach } from '../../state/useCoach';
import { attachSingles, itemBlocks, moveItem, orderBlocks } from '../../domain/reorder';
import { RPE_CHOICES } from '../../domain/rpe';
import { font, space, useTheme } from '../../ui/theme';

const GENERIC_NOTE = /^(% calculado|Registro:)/;

export default function TodayScreen() {
  const t = useTheme();
  const db = useSQLiteContext();
  const { cycle, maxes, gym, version, bump, updateCycle, activeWorkout } = useAppData();
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
  // Treinos da periodização com alguma série registrada (para a cor dos dias).
  const [withSets, setWithSets] = useState<Set<string>>(new Set());
  const [setLogs, setSetLogs] = useState<SetLog[]>([]);
  const [editor, setEditor] = useState<{ item: PrescribedItem; draft: EditableSet; key: string } | null>(null);
  const [plates, setPlates] = useState<{ kg: number | null; exerciseId: string } | null>(null);
  const [menu, setMenu] = useState<{ title?: string; options: MenuOption[]; columns?: number } | null>(null);
  // Séries adicionadas/removidas no treino do dia, por item.
  const [setCounts, setSetCounts] = useState<Record<string, number>>({});
  const [warmupCounts, setWarmupCounts] = useState<Record<string, number>>({});
  // Ordem dos exercícios mudada no dia (arrastando), salva por sessão.
  const [exerciseOrder, setExerciseOrder] = useState<string[]>([]);
  // Arraste em andamento: trava a rolagem; arrastando exercício, os cartões ficam só com o cabeçalho.
  const [dragging, setDragging] = useState<'exercise' | 'set' | null>(null);
  // Descanso ajustado pelo usuário, por exercício (vale em todos os treinos).
  const [restOverrides, setRestOverrides] = useState<Record<string, number>>({});
  const [restEditing, setRestEditing] = useState<PrescribedItem | null>(null);
  const [swapping, setSwapping] = useState<PrescribedItem | null>(null);
  // Tipo escolhido para linhas ainda não registradas: `${itemId}:${nº da série}` → falha ou drop set.
  const [pendingTypes, setPendingTypes] = useState<Record<string, SetType>>({});
  const [typeSheet, setTypeSheet] = useState<{ item: PrescribedItem; kind: SetKind; idx: number; log: SetLog | null } | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [freeTimer, setFreeTimer] = useState(false);
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
      const rests = await getSetting<Record<string, number>>(db, restOverridesKey, {});
      if (!alive) return;
      setRestOverrides(rests);
      setSessionLogs(logs);
      setWithSets(await listSessionsWithSets(db, cycle.id));
      const current = ref ? logs.find((l) => l.sessionId === ref.session.id) : undefined;
      setSetLogs(current ? await listSetLogs(db, current.id) : []);
      setFailUnlocked(current ? await getSetting(db, `unlock-fail:${current.id}`, false) : false);
      setSetCounts(current ? await getSetting<Record<string, number>>(db, setCountsKey(current.id), {}) : {});
      setWarmupCounts(current ? await getSetting<Record<string, number>>(db, warmupCountsKey(current.id), {}) : {});
      setExerciseOrder(current ? await getSetting<string[]>(db, exerciseOrderKey(current.id), []) : []);
    })();
    return () => {
      alive = false;
    };
  }, [db, cycle, ref, version]);

  // Blocos = exercício + filhos (andam juntos no arraste), na ordem do dia.
  // O single de ativação entra no bloco do principal do mesmo movimento (é uma série dele).
  const blocks = useMemo(
    () =>
      ref && cycle
        ? orderBlocks(attachSingles(itemBlocks(sessionItems(ref.week, ref.session)), (i) => liftOf(cycle, i)), exerciseOrder)
        : [],
    [ref, cycle, exerciseOrder],
  );
  const items = useMemo(() => blocks.flat(), [blocks]);
  const loadOf = useCallback((item: PrescribedItem) => (cycle && maxes ? currentLoad(cycle, item, maxes) : item.load), [cycle, maxes]);
  // O aquecimento tem numeração própria e fica fora das regras, do resumo e do "conforme o plano".
  const workLogs = useMemo(() => setLogs.filter((l) => !l.warmup), [setLogs]);
  const logsOf = useCallback((item: PrescribedItem) => workLogs.filter((l) => l.itemId === item.id), [workLogs]);
  const warmupsOf = useCallback(
    (item: PrescribedItem) => setLogs.filter((l) => l.warmup && l.itemId === item.id),
    [setLogs],
  );
  // Regras 4 e 5: séries bloqueadas (4ª do terra, terra falhou).
  const locks = useMemo(
    () => (cycle && ref ? sessionLocks(cycle, ref.week, items, workLogs, failUnlocked) : new Map()),
    [cycle, ref, items, workLogs, failUnlocked],
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
  const warmupDraftsOf = useCallback(
    (item: PrescribedItem) => {
      const n = warmupRowCount(warmupCounts[item.id], warmupsOf(item).map((l) => l.setIndex));
      return Array.from({ length: n }, (_, i) => warmupSet(item, loadOf(item)?.min ?? null, i + 1, n, gym.barKg));
    },
    [warmupCounts, warmupsOf, loadOf, gym.barKg],
  );
  const missingPlanned = useCallback(
    (item: PrescribedItem) => {
      const lock = locks.get(item.id);
      return asPlannedSets(item, loadOf(item), logsOf(item).map((l) => l.setIndex), plannedCountOf(item))
        .filter((d) => !lock || d.setIndex < lock.fromSet)
        .map((d) => planned(item, d.setIndex));
    },
    [locks, loadOf, logsOf, planned, plannedCountOf],
  );

  // Só um treino em andamento por vez: marcar série em outro dia pede para concluir ou descartar o atual.
  const warnBusy = useCallback(() => {
    if (!activeWorkout || !cycle) return;
    const title = findSession(cycle, activeWorkout.sessionId)?.session.title ?? 'outro treino';
    Alert.alert('Já existe um treino em andamento', `Você está treinando "${title}". Conclua ou descarte esse antes de começar outro.`, [
      { text: 'Ver treino', onPress: () => setSelectedId(activeWorkout.sessionId) },
      {
        text: 'Descartar',
        style: 'destructive',
        onPress: () => void confirmDiscard(db, activeWorkout, () => { timer.stop(); bump(); }),
      },
      { text: 'Voltar', style: 'cancel' },
    ]);
  }, [activeWorkout, cycle, db, bump, timer]);

  // O primeiro registro inicia o treino. Devolve null (e avisa) se já há outro em andamento.
  const ensureLog = useCallback(async (): Promise<SessionLog | null> => {
    if (!cycle || !ref) throw new Error('sem sessão');
    if (sessionLog?.status === 'done') return sessionLog; // ajustar um treino já concluído
    if (activeWorkout && activeWorkout.id !== sessionLog?.id) {
      warnBusy();
      return null;
    }
    const log = sessionLog ?? (await ensureSessionLog(db, cycle.id, ref.week.number, ref.session.id, today));
    if (log.startedAt === null) {
      const at = new Date().toISOString();
      await startSession(db, log.id, at);
      bump();
      return { ...log, startedAt: at };
    }
    return log;
  }, [db, cycle, ref, sessionLog, activeWorkout, today, warnBusy, bump]);

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

  const restOf = useCallback(
    (item: PrescribedItem) => restSeconds(item, restOverride(restOverrides, item.exerciseId)),
    [restOverrides],
  );
  const startRest = useCallback(
    (item: PrescribedItem, setIndex: number) => timer.start(restOf(item), nextLabel(item, setIndex)),
    [timer, restOf, nextLabel],
  );

  const draftFor = (kind: SetKind, item: PrescribedItem, idx: number) =>
    kind === 'warmup' ? warmupDraftsOf(item)[idx - 1] : planned(item, idx);

  const checkSet = async (kind: SetKind, item: PrescribedItem, idx: number, input: SetInput) => {
    const log = await ensureLog();
    if (!log) return;
    const pendingKey = `${item.id}:${idx}`;
    const setType: SetType = kind === 'work' ? (pendingTypes[pendingKey] ?? 'normal') : 'normal';
    await insertSets(db, log.id, [{ ...draftFromInput(draftFor(kind, item, idx), input), setType }]);
    clearPending(item.id);
    // Aquecimento e drop set não disparam o descanso: a próxima série vem logo.
    if (startsRest(kind === 'warmup' ? 'warmup' : setType)) startRest(item, idx);
    bump();
  };

  /** Esquece os tipos escolhidos de um exercício (os números das linhas mudam quando uma é removida ou movida). */
  const clearPending = (itemId: string) =>
    setPendingTypes((p) => Object.fromEntries(Object.entries(p).filter(([k]) => !k.startsWith(`${itemId}:`))));

  const pendingOf = (item: PrescribedItem): Record<number, SetType> =>
    Object.fromEntries(Object.entries(pendingTypes).filter(([k]) => k.startsWith(`${item.id}:`)).map(([k, v]) => [Number(k.split(':')[1]), v]));

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

  /** Número de linhas do dia por item: séries de trabalho ou de aquecimento. */
  const saveCount = async (kind: SetKind, item: PrescribedItem, count: number) => {
    const log = await ensureLog();
    if (!log) return;
    const current = kind === 'warmup' ? warmupCounts : setCounts;
    const next = { ...current, [item.id]: Math.max(0, count) };
    await setSetting(db, kind === 'warmup' ? warmupCountsKey(log.id) : setCountsKey(log.id), next);
    if (kind === 'warmup') setWarmupCounts(next);
    else setSetCounts(next);
  };

  const rowsOfKind = (kind: SetKind, item: PrescribedItem) => (kind === 'warmup' ? warmupDraftsOf(item).length : rowsOf(item));

  const addSet = async (item: PrescribedItem, kind: SetKind = 'work') => {
    await saveCount(kind, item, rowsOfKind(kind, item) + 1);
    bump();
  };

  /** Remove a linha `idx` (e a série gravada nela, se houver); as seguintes do mesmo tipo sobem uma posição. */
  const removeSet = async (kind: SetKind, item: PrescribedItem, idx: number, log: SetLog | null) => {
    const sameKind = kind === 'warmup' ? warmupsOf(item) : logsOf(item);
    await deleteSetAndRenumber(db, log?.id ?? null, renumberAfterRemoval(sameKind, idx));
    await saveCount(kind, item, rowsOfKind(kind, item) - 1);
    clearPending(item.id);
    bump();
  };

  /** Escolha na folha "tipo de série": muda o tipo ou passa a série entre aquecimento e trabalho. */
  const chooseSetType = async (sheet: NonNullable<typeof typeSheet>, choice: SetChoice) => {
    const { item, kind, idx, log } = sheet;
    setTypeSheet(null);
    const current: SetChoice = log ? choiceOf(log) : kind === 'warmup' ? 'warmup' : (pendingTypes[`${item.id}:${idx}`] ?? 'normal');
    if (choice === current) return;
    const toWarmup = choice === 'warmup';
    if ((kind === 'warmup') === toWarmup) {
      // Continua no mesmo grupo: só muda o tipo (gravado, ou guardado até registrar a série).
      if (log) await updateSetType(db, log.id, choice as SetType);
      else setPendingTypes((p) => ({ ...p, [`${item.id}:${idx}`]: choice as SetType }));
      bump();
      return;
    }
    // Troca de grupo: vai para o fim do outro grupo e as seguintes do grupo de origem sobem uma posição.
    const toKind: SetKind = toWarmup ? 'warmup' : 'work';
    const fromLogs = kind === 'warmup' ? warmupsOf(item) : logsOf(item);
    const newIndex = rowsOfKind(toKind, item) + 1;
    const newType: SetType = toWarmup ? 'normal' : (choice as SetType);
    await moveSetToGroup(db, log?.id ?? null, { warmup: toWarmup, setIndex: newIndex, setType: newType }, renumberAfterRemoval(fromLogs, idx));
    await saveCount(kind, item, rowsOfKind(kind, item) - 1);
    await saveCount(toKind, item, newIndex);
    clearPending(item.id);
    if (!log && !toWarmup && newType !== 'normal') setPendingTypes((p) => ({ ...p, [`${item.id}:${newIndex}`]: newType }));
    bump();
  };

  /** Muda a ordem dos exercícios só neste treino; o plano continua igual. */
  const moveExercise = async (from: number, to: number) => {
    const next = moveItem(blocks, from, to).map((b) => b[0].id);
    setExerciseOrder(next);
    const log = await ensureLog();
    if (!log) return;
    await setSetting(db, exerciseOrderKey(log.id), next);
    bump();
  };

  /** Arrasta a série `from` para `to` (posições do mesmo tipo); as registradas no caminho andam uma posição. */
  const moveSet = async (kind: SetKind, item: PrescribedItem, from: number, to: number) => {
    const changes = renumberAfterMove(kind === 'warmup' ? warmupsOf(item) : logsOf(item), from, to);
    if (!changes.length) return;
    // Otimista: a tabela já aparece na ordem nova, sem voltar ao lugar antes de o banco responder.
    const byId = new Map(changes.map((c) => [c.id, c.setIndex]));
    setSetLogs((prev) => prev.map((l) => (byId.has(l.id) ? { ...l, setIndex: byId.get(l.id)! } : l)));
    await deleteSetAndRenumber(db, null, changes);
    bump();
  };

  /** `null` volta ao descanso do plano. */
  const saveRest = async (item: PrescribedItem, sec: number | null) => {
    const next = withRestOverride(restOverrides, item.exerciseId, sec);
    setRestOverrides(next);
    setRestEditing(null);
    await setSetting(db, restOverridesKey, next);
  };

  /** Troca o exercício do item e leva as séries já registradas junto (antes de recarregar o plano). */
  const swapItem = async (item: PrescribedItem, exercise: Exercise, scope: SwapScope) => {
    if (!cycle) return;
    const out = swapExercise(cycle, item.id, exercise, scope);
    setSwapping(null);
    await retagSetLogs(db, out.itemIds, exercise.id);
    await updateCycle(out.cycle);
  };

  /** Acrescenta um exercício ao fim do treino do dia (só esta sessão do plano). */
  const commitExercise = async (exercise: Exercise, kind: ItemKind, lift: Lift | null) => {
    if (!cycle || !ref) return;
    await updateCycle(addExerciseToSession(cycle, ref.session.id, exercise, { kind, lift }).cycle);
  };

  // Escolhido o exercício: pergunta o tipo e, para principal/variação sem movimento, qual é.
  const addExercise = (exercise: Exercise) => {
    if (!cycle) return;
    setAdding(false);
    const chooseKind = (kind: ItemKind) => {
      if (!needsLift(cycle, exercise, kind)) {
        void commitExercise(exercise, kind, null);
        return;
      }
      setMenu({
        title: `${KIND_LABEL[kind]}: qual movimento?`,
        options: LIFTS.map((l) => ({ label: LIFT_LABEL[l], icon: 'barbell-outline', onPress: () => void commitExercise(exercise, kind, l) })),
      });
    };
    setMenu({
      title: `Tipo de ${exercise.name}`,
      options: ADD_KINDS.map((k) => ({ label: KIND_LABEL[k], icon: k === 'accessory' ? 'fitness-outline' : 'barbell-outline', onPress: () => chooseKind(k) })),
    });
  };

  const allAsPlanned = async (item: PrescribedItem) => {
    const log = await ensureLog();
    if (!log) return;
    await insertSets(db, log.id, missingPlanned(item));
    bump();
  };

  const sessionAsPlanned = async () => {
    const log = await ensureLog();
    if (!log) return;
    const drafts = items.flatMap((item) => missingPlanned(item));
    await insertSets(db, log.id, drafts);
    await finishLog(db, log.id);
    timer.stop();
    bump();
  };

  // Iniciar / Concluir / Reabrir, conforme o estado do treino deste dia.
  const primaryAction = async () => {
    if (!sessionLog || sessionLog.startedAt === null) {
      await ensureLog(); // inicia (ou avisa que há outro em andamento)
      bump();
      return;
    }
    if (sessionLog.status === 'done') {
      if (activeWorkout && activeWorkout.id !== sessionLog.id) return warnBusy();
      await reopenSession(db, sessionLog.id);
    } else if (stats.sets === 0) {
      // Treino iniciado sem nenhuma série: concluir seria guardar um treino vazio.
      await confirmDiscard(db, sessionLog, () => { timer.stop(); bump(); });
      return;
    } else {
      await finishLog(db, sessionLog.id);
      timer.stop();
    }
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

  const openSetMenu = (kind: SetKind, item: PrescribedItem, idx: number, log: SetLog | null) => setTypeSheet({ item, kind, idx, log });

  const openExerciseMenu = (item: PrescribedItem) => {
    const kg = loadOf(item)?.min ?? null;
    setMenu({
      title: item.name,
      options: [
        { label: 'Trocar exercício', icon: 'swap-horizontal-outline', onPress: () => setSwapping(item) },
        { label: 'Tempo de descanso', icon: 'timer-outline', onPress: () => setRestEditing(item) },
        { label: 'Calculadora de anilhas', icon: 'calculator-outline', onPress: () => setPlates({ kg, exerciseId: item.exerciseId }) },
        { label: 'Completar conforme o plano', icon: 'checkmark-done-outline', onPress: () => allAsPlanned(item) },
        { label: 'Adicionar série', icon: 'add-circle-outline', onPress: () => addSet(item) },
        { label: 'Adicionar aquecimento', icon: 'flame-outline', onPress: () => addSet(item, 'warmup') },
      ],
    });
  };

  const openEditor = (item: PrescribedItem, idx: number, log: SetLog | null, kind: SetKind = 'work') => {
    setEditor({ item, draft: log ?? { ...draftFor(kind, item, idx), setType: pendingTypes[`${item.id}:${idx}`] ?? 'normal' }, key: `${item.id}-${kind}-${idx}-${log?.id ?? 'new'}` });
  };

  const saveEditor = async (s: EditableSet) => {
    if (!editor) return;
    const existing = setLogs.find((l) => l.id === s.id);
    if (existing) {
      await updateSet(db, { ...existing, ...s });
    } else {
      const log = await ensureLog();
      if (!log) return;
      const { id: _id, ...draft } = s;
      await insertSets(db, log.id, [draft]);
      clearPending(editor.item.id);
      if (startsRest(choiceOf(draft))) startRest(editor.item, s.setIndex);
    }
    setEditor(null);
    bump();
  };

  const toggleFailLock = async (unlocked: boolean) => {
    const log = await ensureLog();
    if (!log) return;
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
  const running = isActiveWorkout(sessionLog);
  const mode: WorkoutMode = done ? 'reopen' : running ? 'finish' : 'start';
  const weekIdx = cycle.weeks.findIndex((w) => w.number === ref.week.number);
  const weekNotes = [ref.week.note, ...ref.week.notes.filter((n) => !GENERIC_NOTE.test(n))].filter(Boolean) as string[];
  const doneSessions = new Set(sessionLogs.filter((l) => l.status === 'done').map((l) => l.sessionId));
  // Cor do dia: verde = concluído, laranja cheio = o treino em andamento (só um), contorno laranja = tem séries mas
  // não foi concluído, cinza = sem séries.
  const dayTone = (sessionId: string): 'success' | 'warn' | 'partial' | undefined =>
    doneSessions.has(sessionId)
      ? 'success'
      : activeWorkout?.cycleId === cycle.id && activeWorkout.sessionId === sessionId
        ? 'warn'
        : withSets.has(sessionId)
          ? 'partial'
          : undefined;
  // Alertas desta semana e da anterior (portões aparecem na semana seguinte) + regra das 24 h de hoje.
  const sessionAlerts = coach.pending.filter((a) =>
    a.rule === 'pain_24h' ? isToday : a.week === ref.week.number || a.week === ref.week.number - 1,
  );
  const redFlagToday = hasRedFlags(coach.todayCheckin);

  const goWeek = (delta: number) => {
    const w = cycle.weeks[weekIdx + delta];
    if (w) setSelectedId(w.sessions[0].id);
  };

  const stats = sessionStats(workLogs);
  const plannedSets = items.reduce((acc, it) => acc + plannedCountOf(it), 0);

  // Tudo o que um cartão de exercício precisa, menos o arraste do bloco (alça, recolher) e o single.
  const cardProps = (item: PrescribedItem) => {
    const logs = logsOf(item);
    const lock = locks.get(item.id);
    const plannedCount = plannedCountOf(item);
    const effective = lock ? Math.min(plannedCount, lock.fromSet - 1) : plannedCount;
    const showRpe = RPE_KINDS.has(item.kind);
    const last = logs.length ? logs.reduce((a, b) => (b.setIndex > a.setIndex ? b : a)) : null;
    return {
      item,
      load: loadOf(item),
      logs,
      isChild: !!item.parentId,
      isLift: liftOf(cycle, item) !== null,
      rows: rowsOf(item),
      plannedCount,
      warmups: warmupsOf(item),
      warmupDrafts: warmupDraftsOf(item),
      complete: logs.length >= effective && (logs.length > 0 || effective === 0),
      restSec: restOf(item),
      restOverridden: restOverride(restOverrides, item.exerciseId) !== null,
      onRest: () => setRestEditing(item),
      onOpen: () => router.push({ pathname: '/exercicio', params: { id: item.exerciseId, name: item.name } }),
      showRpe,
      pendingRpeIndex: showRpe && last && last.rpe === null ? last.setIndex : null,
      lock,
      onUnlock: () => toggleFailLock(true),
      tip: gripTip(cycle, ref.week, item),
      onMenu: () => openExerciseMenu(item),
      onCheck: (kind: SetKind, idx: number, input: SetInput) => checkSet(kind, item, idx, input),
      onUncheck: uncheckSet,
      onEdit: editSet,
      onRemove: (kind: SetKind, idx: number, log: SetLog | null) => removeSet(kind, item, idx, log),
      onSetMenu: (kind: SetKind, idx: number, log: SetLog | null) => openSetMenu(kind, item, idx, log),
      onRpe: openRpeMenu,
      onAdd: () => addSet(item),
      onAddWarmup: () => addSet(item, 'warmup'),
      pendingTypes: pendingOf(item),
      onMoveSet: (kind: SetKind, from: number, to: number) => moveSet(kind, item, from, to),
      onSetDrag: (on: boolean) => setDragging(on ? 'set' : null),
    };
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: t.bg }}>
      <WorkoutHeader
        mode={mode}
        hasNotes={weekNotes.length > 0}
        onNotes={() => setNotesOpen(true)}
        onTimer={() => setFreeTimer(true)}
        onPrimary={primaryAction}
        onDiscard={sessionLog ? () => void confirmDiscard(db, sessionLog, () => { timer.stop(); bump(); }) : undefined}
      />
      <ScrollView
        contentContainerStyle={styles.body}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        scrollEnabled={dragging === null}
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
              início {formatDate(ref.week.start)} · RPE alvo {ref.week.targetRpeText.replace(/\./g, ',')}
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
              tone={dayTone(s.id)}
              onPress={() => setSelectedId(s.id)}
              accessibilityLabel={`${WEEKDAY_NAMES[s.weekday]}: ${s.title}${doneSessions.has(s.id) ? ', feito' : dayTone(s.id) === 'warn' ? ', em andamento' : dayTone(s.id) === 'partial' ? ', parcial' : ''}`}
            />
          ))}
        </View>
        {/* O nome do treino saiu do cabeçalho fixo; aqui fica como uma linha discreta. */}
        <Text style={{ color: t.muted, fontSize: 14, textAlign: 'center' }}>
          {WEEKDAY_NAMES[ref.session.weekday]} — {ref.session.title} · {isToday ? 'Hoje' : `Planejado para ${formatDate(ref.date)}`}
          {sessionLog && sessionLog.date !== ref.date ? ` · feito em ${formatDate(sessionLog.date)}` : ''}
          {!isToday && !plannedToday && !sessionLog ? ' · hoje não tem treino no plano' : ''}
        </Text>

        {/* Ordem da tela: semana, dia, depois os números do treino do dia. */}
        <WorkoutStats stats={stats} plannedSets={plannedSets} running={running} startedAt={sessionLog?.startedAt ?? null} endedAt={sessionLog?.endedAt ?? null} />
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
              Treino concluído{sessionLog ? ` em ${formatDate(sessionLog.date)}` : ''}. Dá para ajustar qualquer série na tabela.
            </Text>
          </Card>
        )}

        <DragList
          items={blocks}
          keyOf={(b) => b[0].id}
          onMove={moveExercise}
          onDragChange={(on) => setDragging(on ? 'exercise' : null)}
          renderItem={(block, i, handle) => (
            <View>
              {i > 0 ? <Divider /> : null}
              {block.map((item, j) => {
                // O single de ativação aparece como a linha "S" dentro do cartão do principal.
                const attached = block.some((x) => x.kind === 'main') && item.kind === 'activation_single';
                if (attached) return null;
                const single = block.find((x) => x.kind === 'activation_single');
                const singleRows =
                  item.kind === 'main' && single ? (
                    <ExerciseCard {...cardProps(single)} rowsOnly handle={undefined} collapsed={false} />
                  ) : undefined;
                return (
                  <View key={item.id}>
                    {j > 0 && !(j === 1 && block[0] === single && single !== item && block.some((x) => x.kind === 'main')) ? <Divider /> : null}
                    <ExerciseCard {...cardProps(item)} handle={handle} collapsed={dragging === 'exercise'} before={singleRows} />
                  </View>
                );
              })}
            </View>
          )}
        />

        <BigButton label="Adicionar exercício" icon="add" onPress={() => setAdding(true)} />
        <Text style={[styles.footer, { color: t.muted }]}>
          Máximos: agacho {formatNumber(maxes.squat)} · supino {formatNumber(maxes.bench)} · terra {formatNumber(maxes.deadlift)}
        </Text>
      </ScrollView>

      {/* No celular o cronômetro é um cartão flutuante (FloatingBars); aqui só na prévia web. */}
      {Platform.OS === 'web' ? <RestTimerBar /> : null}

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
      {restEditing ? (
        <RestEditor
          key={restEditing.id}
          name={restEditing.name}
          planText={restEditing.restText && restEditing.restText !== '—' ? restEditing.restText : formatRestDuration(restSeconds(restEditing))}
          initialSec={restOf(restEditing)}
          hasOverride={restOverride(restOverrides, restEditing.exerciseId) !== null}
          onSave={(sec) => saveRest(restEditing, sec)}
          onReset={() => saveRest(restEditing, null)}
          onClose={() => setRestEditing(null)}
        />
      ) : null}
      {notesOpen ? (
        <BottomSheet onClose={() => setNotesOpen(false)} dragAnywhere>
          <Text style={{ color: t.text, fontSize: 18, fontWeight: '700' }} accessibilityRole="header">
            Avisos da semana {ref.week.number}
          </Text>
          {weekNotes.map((n, i) => (
            <Text key={i} style={{ color: t.text, fontSize: 16, lineHeight: 22 }}>
              {n}
            </Text>
          ))}
        </BottomSheet>
      ) : null}
      {typeSheet ? (
        <SetTypeSheet
          current={
            typeSheet.log ? choiceOf(typeSheet.log) : typeSheet.kind === 'warmup' ? 'warmup' : (pendingTypes[`${typeSheet.item.id}:${typeSheet.idx}`] ?? 'normal')
          }
          index={typeSheet.idx}
          onChoose={(choice) => chooseSetType(typeSheet, choice)}
          onDetails={() => {
            const s = typeSheet;
            setTypeSheet(null);
            openEditor(s.item, s.idx, s.log, s.kind);
          }}
          onRemove={() => {
            const s = typeSheet;
            setTypeSheet(null);
            removeSet(s.kind, s.item, s.idx, s.log);
          }}
          onClose={() => setTypeSheet(null)}
        />
      ) : null}
      {adding ? (
        <ExercisePicker mode="add" cycleExercises={cycle.exercises} onPick={(exercise) => addExercise(exercise)} onClose={() => setAdding(false)} />
      ) : null}
      {freeTimer ? (
        <RestEditor
          key="free-timer"
          title="Timer de descanso"
          name="Timer livre"
          confirmLabel="Iniciar"
          initialSec={120}
          hasOverride={false}
          onSave={(sec) => {
            setFreeTimer(false);
            timer.start(sec, 'Descanso');
          }}
          onReset={() => {}}
          onClose={() => setFreeTimer(false)}
        />
      ) : null}
      {swapping ? (
        <ExercisePicker
          key={swapping.id}
          currentName={swapping.name}
          isLift={liftOf(cycle, swapping) !== null}
          cycleExercises={cycle.exercises}
          onPick={(exercise, scope) => swapItem(swapping, exercise, scope)}
          onClose={() => setSwapping(null)}
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
  footer: { fontSize: 13, textAlign: 'center' },
});
