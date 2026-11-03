import * as Clipboard from 'expo-clipboard';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BigButton, Card, Chip, SectionTitle } from '../components/ui';
import {
  applyWorkoutImport,
  exportBackup,
  importCheckins,
  importMeals,
  importWeights,
  listSetSourceKeys,
  loggedSessionIds,
  restoreBackup,
  type Backup,
} from '../db/dataRepo';
import { importCycle } from '../db/schema';
import { listAllMealEntries, listMeasurements, listWeights } from '../db/nutritionRepo';
import {
  exerciseNames,
  getSetting,
  listAlertDecisions,
  listCheckins,
  listCycles,
  listLoggedSessions,
  setActiveCycle,
  setSetting,
  type CycleRow,
} from '../db/repo';
import { applyAdjustments, extractJson, validateAdjustments, validateCycle, type Adjustments } from '../domain/adjustments';
import { flattenSets, nutritionDays } from '../domain/analytics';
import { addDays, toISODate } from '../domain/dates';
import { checkinsCsv, mealsCsv, measurementsCsv, weightsCsv, workoutsCsv } from '../domain/exporters';
import { formatDateShort } from '../domain/format';
import {
  detectCsvKind,
  parseHevy,
  parseOldCheckins,
  parseOldMeals,
  parseOldWeights,
  parseOldWorkouts,
  planWorkoutImport,
  suggestMapping,
  type ImportedSet,
  type MappingChoice,
} from '../domain/importers';
import { slugify } from '../domain/nutrition';
import { weekForDate } from '../domain/plan';
import { buildCoachReport } from '../domain/report';
import { evaluateCycle } from '../domain/rules';
import type { Cycle } from '../domain/types';
import { useAppData } from '../state/AppData';
import { pickTextFile, shareText } from '../state/files';
import { TOUCH, useTheme } from '../ui/theme';

type Period = 'semana' | 'semana_plano' | 'ciclo';

export default function DataScreen() {
  const t = useTheme();
  const db = useSQLiteContext();
  const { cycle, maxes, targets, version, bump, updateCycle, setMaxes, reload } = useAppData();
  const today = toISODate(new Date());
  const [period, setPeriod] = useState<Period>('semana');
  const [cycles, setCycles] = useState<CycleRow[]>([]);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [mapping, setMapping] = useState<{ sets: ImportedSet[]; source: string } | null>(null);

  useEffect(() => {
    listCycles(db).then(setCycles);
  }, [db, version]);

  // ---------- Claude: pacote ----------
  const buildReport = async () => {
    if (!cycle || !maxes) return '';
    const names = await exerciseNames(db);
    const logged = await listLoggedSessions(db, cycle.id);
    const rows = flattenSets(cycle, logged, names);
    const [checkins, decisions, weights, meals] = await Promise.all([listCheckins(db), listAlertDecisions(db, cycle.id), listWeights(db), listAllMealEntries(db)]);
    const week = weekForDate(cycle, today);
    const range =
      period === 'ciclo'
        ? { from: cycle.startDate, to: today }
        : period === 'semana_plano' && week
          ? { from: week.start, to: addDays(week.start, 6) }
          : { from: addDays(today, -6), to: today };
    return buildCoachReport({
      cycle,
      maxes,
      rows,
      checkins,
      alerts: evaluateCycle(cycle, logged, checkins, today),
      decisions,
      weights,
      nutrition: nutritionDays(meals, cycle, targets),
      ...range,
      today,
    });
  };

  const shareReport = async () => {
    setBusy('report');
    try {
      await shareText(`treino-${today}.md`, await buildReport(), 'text/markdown');
    } finally {
      setBusy(null);
    }
  };

  const copyReport = async () => {
    await Clipboard.setStringAsync(await buildReport());
    Alert.alert('Copiado', 'Cole no projeto do Claude (treinador).');
  };

  // ---------- Claude: resposta ----------
  const parsedReply = useMemo(() => {
    if (!reply.trim() || !cycle) return null;
    try {
      const json = extractJson(reply) as { format?: string };
      if (json.format === 'fitapp.cycle/v1') return { kind: 'cycle' as const, result: validateCycle(json) };
      return { kind: 'adjustments' as const, result: validateAdjustments(json, cycle) };
    } catch (e) {
      return { kind: 'error' as const, message: (e as Error).message };
    }
  }, [reply, cycle]);

  const applyReply = async () => {
    if (!cycle || !maxes || !parsedReply || parsedReply.kind !== 'adjustments' || !parsedReply.result.ok) return;
    const adj = parsedReply.result.adjustments as Adjustments;
    const out = applyAdjustments(cycle, maxes, adj.operations);
    await updateCycle(out.cycle);
    if (JSON.stringify(out.maxes) !== JSON.stringify(maxes)) await setMaxes(out.maxes);
    setReply('');
    Alert.alert('Plano atualizado', `${adj.operations.length} ajuste(s) aplicados.`);
  };

  const importNewCycle = async (activate: boolean) => {
    if (!parsedReply || parsedReply.kind !== 'cycle' || !parsedReply.result.cycle) return;
    await importCycle(db, parsedReply.result.cycle, activate ? 'active' : 'planned');
    setReply('');
    reload();
    Alert.alert('Ciclo importado', activate ? 'Ciclo novo ativo.' : 'Ciclo salvo como planejado. Ative quando começar.');
  };

  // ---------- Importar ----------
  const importFile = async () => {
    const file = await pickTextFile();
    if (!file || !cycle) return;
    const text = file.text;
    if (file.name.endsWith('.json') || text.trimStart().startsWith('{')) {
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        Alert.alert('Arquivo inválido', 'Não consegui ler o JSON.');
        return;
      }
      const fmt = (json as { format?: string }).format;
      if (fmt === 'fitapp.backup/v1') {
        Alert.alert('Restaurar backup?', 'Isso substitui TODOS os dados do app pelos do arquivo.', [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Restaurar',
            style: 'destructive',
            onPress: async () => {
              await restoreBackup(db, json as Backup);
              reload();
              Alert.alert('Backup restaurado');
            },
          },
        ]);
      } else {
        setReply(text);
      }
      return;
    }
    const kind = detectCsvKind(text);
    if (kind === 'hevy' || kind === 'treinos') {
      const r = kind === 'hevy' ? parseHevy(text) : parseOldWorkouts(text);
      if (r.missingColumns.length) {
        Alert.alert('Colunas faltando', r.missingColumns.join(', '));
        return;
      }
      setMapping({ sets: r.items, source: kind === 'hevy' ? 'Hevy' : 'treinos.csv' });
      return;
    }
    let msg = '';
    if (kind === 'checkin') {
      const r = parseOldCheckins(text);
      msg = `${await importCheckins(db, r.items)} check-ins importados (${r.items.length} no arquivo; dias que já tinham check-in foram mantidos).`;
    } else if (kind === 'refeicoes') {
      const r = parseOldMeals(text);
      msg = `${await importMeals(db, r.items)} refeições importadas.`;
    } else if (kind === 'peso') {
      const r = parseOldWeights(text);
      msg = `${await importWeights(db, r.items)} pesagens importadas.`;
    } else {
      msg = 'Não reconheci o arquivo. Esperado: export do Hevy, treinos.csv, checkin.csv, refeicoes.csv ou peso.csv.';
    }
    bump();
    Alert.alert('Importação', msg);
  };

  // ---------- Exportar ----------
  const exportCsv = async (which: 'treinos' | 'checkin' | 'refeicoes' | 'peso' | 'medidas') => {
    let content = '';
    if (which === 'treinos') {
      const names = await exerciseNames(db);
      const all = [];
      for (const { cycle: cy } of cycles) {
        const logged = await listLoggedSessions(db, cy.id);
        const extra = new Map(logged.flatMap((l) => l.sets.map((s) => [s.id, s] as const)));
        const rows = flattenSets(cy, logged, names);
        // flattenSets não carrega pegada/cinto/obs: junta pelo índice
        let i = 0;
        for (const l of logged)
          for (const s of l.sets) {
            const e = extra.get(s.id)!;
            all.push({ ...rows[i++], grip: e.grip, belt: e.belt, note: e.note });
          }
      }
      content = workoutsCsv(all);
    } else if (which === 'checkin') content = checkinsCsv(await listCheckins(db, 100000));
    else if (which === 'refeicoes') content = mealsCsv(await listAllMealEntries(db));
    else if (which === 'peso') content = weightsCsv(await listWeights(db));
    else content = measurementsCsv(await listMeasurements(db));
    await shareText(`${which}-${today}.csv`, content, 'text/csv');
  };

  const exportJson = async () => {
    await shareText(`backup-diario-${today}.json`, JSON.stringify(await exportBackup(db)), 'application/json');
  };

  if (!cycle) return null;

  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <SectionTitle>Claude (treinador)</SectionTitle>
        <Card>
          <Text style={{ color: t.text, fontSize: 16, fontWeight: '700' }}>1. Mandar o pacote</Text>
          <Text style={{ color: t.muted, fontSize: 14 }}>Planejado × feito com RPE, check-ins, alertas, peso e alimentação, num arquivo pronto para o projeto do Claude.</Text>
          <View style={styles.wrap}>
            <Chip label="Últimos 7 dias" selected={period === 'semana'} onPress={() => setPeriod('semana')} />
            <Chip label="Semana do plano" selected={period === 'semana_plano'} onPress={() => setPeriod('semana_plano')} />
            <Chip label="Ciclo inteiro" selected={period === 'ciclo'} onPress={() => setPeriod('ciclo')} />
          </View>
          <BigButton label={busy === 'report' ? 'Gerando…' : 'Compartilhar pacote (.md)'} onPress={shareReport} disabled={busy !== null} />
          <BigButton label="Copiar pacote" variant="neutral" onPress={copyReport} />
        </Card>

        <Card>
          <Text style={{ color: t.text, fontSize: 16, fontWeight: '700' }}>2. Aplicar a resposta</Text>
          <Text style={{ color: t.muted, fontSize: 14 }}>Cole a resposta do Claude (ajustes ou ciclo novo em JSON). Você revisa antes de aplicar.</Text>
          <TextInput
            value={reply}
            onChangeText={setReply}
            multiline
            placeholder='```json { "format": "fitapp.adjustments/v1", … }'
            placeholderTextColor={t.muted}
            style={[styles.textarea, { color: t.text, backgroundColor: t.bg, borderColor: t.border }]}
            accessibilityLabel="Resposta do Claude"
          />
          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <BigButton label="Colar" compact variant="neutral" onPress={async () => setReply(await Clipboard.getStringAsync())} />
            </View>
            <View style={{ flex: 1 }}>
              <BigButton
                label="Abrir arquivo"
                compact
                variant="neutral"
                onPress={async () => {
                  const f = await pickTextFile();
                  if (f) setReply(f.text);
                }}
              />
            </View>
          </View>
          {parsedReply?.kind === 'error' ? <Text style={{ color: t.danger, fontSize: 14 }}>{parsedReply.message}</Text> : null}
          {parsedReply && parsedReply.kind !== 'error' && !parsedReply.result.ok ? (
            <View style={{ gap: 4 }}>
              {parsedReply.result.errors.map((e, i) => (
                <Text key={i} style={{ color: t.danger, fontSize: 14 }}>
                  • {e}
                </Text>
              ))}
            </View>
          ) : null}
          {parsedReply?.kind === 'adjustments' && parsedReply.result.ok ? (
            <View style={{ gap: 6 }}>
              {parsedReply.result.adjustments?.summary ? (
                <Text style={{ color: t.text, fontSize: 15, fontStyle: 'italic' }}>{parsedReply.result.adjustments.summary}</Text>
              ) : null}
              {parsedReply.result.preview.map((p, i) => (
                <Text key={i} style={{ color: t.text, fontSize: 15 }}>
                  • {p}
                </Text>
              ))}
              <BigButton label={`Aplicar ${parsedReply.result.preview.length} ajuste(s)`} variant="success" onPress={applyReply} />
            </View>
          ) : null}
          {parsedReply?.kind === 'cycle' && parsedReply.result.ok && parsedReply.result.cycle ? (
            <View style={{ gap: 6 }}>
              <Text style={{ color: t.text, fontSize: 15 }}>
                Ciclo “{parsedReply.result.cycle.name}”: {parsedReply.result.cycle.weeks.length} semanas, início {formatDateShort(parsedReply.result.cycle.startDate)}.
              </Text>
              <BigButton label="Salvar como próximo ciclo" variant="success" onPress={() => importNewCycle(false)} />
              <BigButton label="Importar e já ativar" variant="neutral" onPress={() => importNewCycle(true)} />
            </View>
          ) : null}
        </Card>

        <SectionTitle>Importar</SectionTitle>
        <Card>
          <Text style={{ color: t.muted, fontSize: 14 }}>
            Export do Hevy (CSV), CSVs do diário antigo (treinos, checkin, refeicoes, peso) ou um backup (JSON). O tipo é detectado pelo cabeçalho; o que já foi importado não duplica.
          </Text>
          <BigButton label="Escolher arquivo" onPress={importFile} />
        </Card>

        <SectionTitle>Exportar</SectionTitle>
        <Card>
          <BigButton label="Backup completo (JSON)" onPress={exportJson} />
          <Text style={{ color: t.muted, fontSize: 13 }}>Guarde no iCloud Drive: com ele você recupera tudo se reinstalar o app.</Text>
          <View style={styles.wrap}>
            {(['treinos', 'checkin', 'refeicoes', 'peso', 'medidas'] as const).map((w) => (
              <Chip key={w} label={`${w}.csv`} onPress={() => exportCsv(w)} />
            ))}
          </View>
        </Card>

        <SectionTitle>Ciclos</SectionTitle>
        {cycles.map(({ cycle: c, status }) => (
          <Card key={c.id} style={{ gap: 6 }}>
            <Text style={{ color: t.text, fontSize: 16, fontWeight: '800' }}>{c.name}</Text>
            <Text style={{ color: t.muted, fontSize: 14 }}>
              {formatDateShort(c.startDate)} a {formatDateShort(c.endDate)} · {c.weeks.length} semanas ·{' '}
              {status === 'active' ? 'ativo' : status === 'planned' ? 'planejado' : 'concluído'}
            </Text>
            {status !== 'active' ? (
              <BigButton
                label="Tornar ativo"
                compact
                variant="neutral"
                onPress={async () => {
                  await setActiveCycle(db, c.id);
                  reload();
                }}
              />
            ) : null}
          </Card>
        ))}
      </ScrollView>

      {mapping ? (
        <MappingModal
          sets={mapping.sets}
          source={mapping.source}
          cycle={cycle}
          onClose={() => setMapping(null)}
          onDone={async (choices) => {
            const plan = planWorkoutImport(mapping.sets, choices, cycle, await listSetSourceKeys(db), await loggedSessionIds(db, cycle.id));
            const res = await applyWorkoutImport(db, plan, cycle);
            if (res.cycle !== cycle) await updateCycle(res.cycle);
            setMapping(null);
            bump();
            Alert.alert(
              'Importação concluída',
              `${res.sessions} treino(s), ${res.sets} série(s).` +
                (plan.duplicates ? ` ${plan.duplicates} já existiam.` : '') +
                (plan.ignored ? ` ${plan.ignored} ignoradas.` : ''),
            );
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

/** Tela de mapeamento: nome no arquivo → exercício do catálogo (lembra a escolha). */
function MappingModal({
  sets,
  source,
  cycle,
  onDone,
  onClose,
}: {
  sets: ImportedSet[];
  source: string;
  cycle: Cycle;
  onDone: (choices: Record<string, MappingChoice>) => void;
  onClose: () => void;
}) {
  const t = useTheme();
  const db = useSQLiteContext();
  const names = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of sets) m.set(s.exerciseName, (m.get(s.exerciseName) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [sets]);
  const [choices, setChoices] = useState<Record<string, MappingChoice> | null>(null);
  const [picking, setPicking] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    getSetting<Record<string, MappingChoice>>(db, 'importMapping', {}).then((remembered) => {
      setChoices(Object.fromEntries(names.map(([n]) => [n, suggestMapping(n, cycle.exercises, remembered)])));
    });
  }, [db, names, cycle]);

  if (!choices) return null;
  const label = (c: MappingChoice) =>
    c.type === 'ignore' ? 'Ignorar' : c.type === 'new' ? 'Criar exercício novo' : (cycle.exercises.find((e) => e.id === c.exerciseId)?.name ?? c.exerciseId);
  const q = slugify(query);

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        {picking ? (
          <View style={{ flex: 1, padding: 16, gap: 10 }}>
            <Text style={{ color: t.text, fontSize: 20, fontWeight: '800' }}>{picking}</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar exercício do plano"
              placeholderTextColor={t.muted}
              style={[styles.input, { color: t.text, backgroundColor: t.card, borderColor: t.border }]}
            />
            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <BigButton label="Criar novo" compact variant="neutral" onPress={() => { setChoices({ ...choices, [picking]: { type: 'new' } }); setPicking(null); }} />
              </View>
              <View style={{ flex: 1 }}>
                <BigButton label="Ignorar" compact variant="neutral" onPress={() => { setChoices({ ...choices, [picking]: { type: 'ignore' } }); setPicking(null); }} />
              </View>
            </View>
            <FlatList
              data={cycle.exercises.filter((e) => slugify(e.name).includes(q))}
              keyExtractor={(e) => e.id}
              keyboardShouldPersistTaps="handled"
              ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setChoices({ ...choices, [picking]: { type: 'exercise', exerciseId: item.id } });
                    setPicking(null);
                    setQuery('');
                  }}
                  style={[styles.pick, { backgroundColor: t.card, borderColor: t.border }]}
                >
                  <Text style={{ color: t.text, fontSize: 16, fontWeight: '600' }}>{item.name}</Text>
                </Pressable>
              )}
            />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.body}>
            <Text style={{ color: t.text, fontSize: 22, fontWeight: '800' }}>Exercícios do {source}</Text>
            <Text style={{ color: t.muted, fontSize: 14 }}>Confira a correspondência com os exercícios do plano. As escolhas ficam lembradas para a próxima importação.</Text>
            {names.map(([name, count]) => (
              <Pressable
                key={name}
                accessibilityRole="button"
                accessibilityLabel={`${name}: ${label(choices[name])}. Toque para trocar`}
                onPress={() => setPicking(name)}
                style={[styles.pick, { backgroundColor: t.card, borderColor: t.border }]}
              >
                <Text style={{ color: t.text, fontSize: 16, fontWeight: '700' }}>
                  {name} <Text style={{ color: t.muted, fontWeight: '400' }}>({count} séries)</Text>
                </Text>
                <Text style={{ color: choices[name].type === 'ignore' ? t.muted : t.accent, fontSize: 15 }}>→ {label(choices[name])}</Text>
              </Pressable>
            ))}
            <BigButton
              label={`Importar ${sets.length} séries`}
              variant="success"
              onPress={async () => {
                const remembered = await getSetting<Record<string, MappingChoice>>(db, 'importMapping', {});
                await setSetting(db, 'importMapping', { ...remembered, ...choices });
                onDone(choices);
              }}
            />
            <BigButton label="Cancelar" variant="neutral" onPress={onClose} />
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 12, paddingBottom: 48 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row2: { flexDirection: 'row', gap: 8 },
  textarea: { minHeight: 120, maxHeight: 260, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 12, fontSize: 14, textAlignVertical: 'top' },
  input: { minHeight: 52, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, fontSize: 17 },
  pick: { minHeight: TOUCH, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 12, gap: 2 },
});
