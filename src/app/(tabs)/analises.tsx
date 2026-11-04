import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart, ChartCard, LineChart } from '../../components/charts';
import { checkinLine } from '../../components/CheckinSummary';
import { Card, Chip, StatRow } from '../../components/ui';
import { listAllMealEntries, listWeights } from '../../db/nutritionRepo';
import { exerciseNames, listCheckins, listCycles, listLoggedSessions } from '../../db/repo';
import {
  activationRpeByWeek,
  e1rmSeries,
  flattenSets,
  GROUP_LABEL,
  groupStats,
  mainLoadSeries,
  nutritionDays,
  plannedVsDone,
  trainingCards,
  type GroupBy,
  type SetRow,
} from '../../domain/analytics';
import { movingAverageSeries, type WeightEntry } from '../../domain/body';
import { isoWeekday, toISODate } from '../../domain/dates';
import { formatDateShort, formatKg, formatNumber, WEEKDAY_NAMES } from '../../domain/format';
import { MEAL_LABEL, sumMacros, type MealEntry } from '../../domain/nutrition';
import { LIFT_LABEL, LIFTS } from '../../domain/plan';
import type { CheckIn } from '../../domain/rules';
import { useAppData } from '../../state/AppData';
import { font, space, useTheme } from '../../ui/theme';

type Mode = 'graficos' | 'grupos' | 'dias';
type TrainingChart = 'carga' | 'e1rm' | 'single' | 'pvd';
type BodyChart = 'peso' | 'kcal' | 'proteina';

const TRAINING_CHARTS: { key: TrainingChart; label: string }[] = [
  { key: 'carga', label: 'Carga' },
  { key: 'e1rm', label: 'e1RM' },
  { key: 'single', label: 'Single' },
  { key: 'pvd', label: 'Planejado × feito' },
];
const BODY_CHARTS: { key: BodyChart; label: string }[] = [
  { key: 'peso', label: 'Peso' },
  { key: 'kcal', label: 'Calorias' },
  { key: 'proteina', label: 'Proteína' },
];

export default function AnalysisScreen() {
  const t = useTheme();
  const db = useSQLiteContext();
  const { cycle, targets, version } = useAppData();
  const [view, setView] = useState<Mode>('graficos');
  const [groupBy, setGroupBy] = useState<GroupBy>('week');
  const [cardKind, setCardKind] = useState<'treino' | 'comida'>('treino');
  const [trainingChart, setTrainingChart] = useState<TrainingChart>('carga');
  const [bodyChart, setBodyChart] = useState<BodyChart>('peso');
  const [rows, setRows] = useState<SetRow[]>([]);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [cycles, names, m, w, c] = await Promise.all([listCycles(db), exerciseNames(db), listAllMealEntries(db), listWeights(db), listCheckins(db)]);
      const all: SetRow[] = [];
      for (const { cycle: cy } of cycles) all.push(...flattenSets(cy, await listLoggedSessions(db, cy.id), names));
      if (!alive) return;
      setRows(all);
      setMeals(m);
      setWeights(w);
      setCheckins(c);
    })();
    return () => {
      alive = false;
    };
  }, [db, version]);

  const today = toISODate(new Date());
  const cycleRows = useMemo(() => rows.filter((r) => r.cycleId === cycle?.id), [rows, cycle]);
  const groups = useMemo(() => groupStats(rows, groupBy), [rows, groupBy]);
  const pvd = useMemo(() => (cycle ? plannedVsDone(cycle, rows, today) : []), [cycle, rows, today]);
  const days = useMemo(() => nutritionDays(meals, cycle, targets).slice(-21), [meals, cycle, targets]);
  const weightSeries = useMemo(() => movingAverageSeries(weights).slice(-60), [weights]);
  const cards = useMemo(() => trainingCards(rows, checkins), [rows, checkins]);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={styles.body} contentInsetAdjustmentBehavior="automatic">
        <Text style={[styles.title, { color: t.text }]} accessibilityRole="header">
          Análises
        </Text>
        <View style={styles.wrap}>
          <Chip label="Gráficos" selected={view === 'graficos'} onPress={() => setView('graficos')} />
          <Chip label="Agrupar" selected={view === 'grupos'} onPress={() => setView('grupos')} />
          <Chip label="Por dia" selected={view === 'dias'} onPress={() => setView('dias')} />
        </View>

        {view === 'graficos' ? (
          <>
            {trainingChart === 'carga' ? (
              <ChartCard title="Carga dos principais" subtitle="Top set de cada sessão (kg)">
                <LineChart series={LIFTS.map((l, i) => ({ name: LIFT_LABEL[l], slot: i, points: mainLoadSeries(cycleRows, l) }))} />
              </ChartCard>
            ) : trainingChart === 'e1rm' ? (
              <ChartCard title="Máximo estimado (e1RM)" subtitle="Tabela RTS, melhor série principal com RPE (kg)">
                <LineChart
                  series={LIFTS.map((l, i) => ({ name: LIFT_LABEL[l], slot: i, points: e1rmSeries(cycleRows, l) }))}
                  empty="Informe o RPE do principal para ver o e1RM."
                />
              </ChartCard>
            ) : trainingChart === 'single' ? (
              <ChartCard title="Termômetro: single de ativação" subtitle="RPE por semana — subir é sinal de cansaço">
                <LineChart
                  series={LIFTS.map((l, i) => ({ name: LIFT_LABEL[l], slot: i, points: activationRpeByWeek(cycleRows, l) }))}
                  yFormat={(v) => formatNumber(v, 1)}
                  empty="Sem singles de ativação com RPE ainda."
                />
              </ChartCard>
            ) : (
              <ChartCard title="Planejado × feito" subtitle="Séries por semana (sem core)">
                <BarChart data={pvd.map((p) => ({ x: `S${p.week}`, value: p.doneSets, ref: p.plannedSets }))} refLabel="planejado" />
              </ChartCard>
            )}
            <View style={styles.wrap}>
              {TRAINING_CHARTS.map((c) => (
                <Chip key={c.key} label={c.label} selected={trainingChart === c.key} onPress={() => setTrainingChart(c.key)} />
              ))}
            </View>

            {bodyChart === 'peso' ? (
              <ChartCard title="Peso" subtitle="Pesagens (pontos) e média móvel de 7 dias (linha)">
                <LineChart
                  series={[
                    { name: 'Pesagem', slot: 0, style: 'dots', points: weightSeries.map((w) => ({ x: w.date, y: w.kg })) },
                    { name: 'Média 7 dias', slot: 1, style: 'line', points: weightSeries.map((w) => ({ x: w.date, y: w.avg7 })) },
                  ]}
                  yFormat={(v) => formatNumber(v, 1)}
                />
              </ChartCard>
            ) : bodyChart === 'kcal' ? (
              <ChartCard title="Calorias por dia" subtitle="Últimos 21 dias registrados">
                <BarChart data={days.map((d) => ({ x: d.date, value: d.kcal, ref: d.kcalTarget }))} />
              </ChartCard>
            ) : (
              <ChartCard title="Proteína por dia" subtitle="g · alvo diário">
                <BarChart data={days.map((d) => ({ x: d.date, value: d.protein, ref: d.proteinTarget }))} slot={2} />
              </ChartCard>
            )}
            <View style={styles.wrap}>
              {BODY_CHARTS.map((c) => (
                <Chip key={c.key} label={c.label} selected={bodyChart === c.key} onPress={() => setBodyChart(c.key)} />
              ))}
            </View>
          </>
        ) : null}

        {view === 'grupos' ? (
          <>
            <View style={styles.wrap}>
              {(Object.keys(GROUP_LABEL) as GroupBy[]).map((g) => (
                <Chip key={g} label={GROUP_LABEL[g]} selected={groupBy === g} onPress={() => setGroupBy(g)} />
              ))}
            </View>
            {groups.map((g) => (
              <Card key={g.key} style={{ gap: space.md }}>
                <Text style={[styles.cardTitle, { color: t.text }]}>{g.label}</Text>
                <StatRow
                  items={[
                    { label: 'Treinos', value: formatNumber(g.sessions, 0) },
                    { label: 'Séries', value: formatNumber(g.sets, 0) },
                    { label: 'Reps', value: formatNumber(g.reps, 0) },
                  ]}
                />
                <StatRow
                  items={[
                    { label: 'Volume', value: `${formatNumber(g.tonnage, 0)} kg` },
                    { label: 'Carga máx.', value: g.maxLoad === null ? '—' : formatKg(g.maxLoad) },
                    { label: 'RPE médio', value: g.avgRpe === null ? '—' : formatNumber(g.avgRpe) },
                  ]}
                />
              </Card>
            ))}
            {groups.length === 0 ? <Text style={{ color: t.muted }}>Nenhum treino registrado ainda.</Text> : null}
          </>
        ) : null}

        {view === 'dias' ? (
          <>
            <View style={styles.wrap}>
              <Chip label="Treino" selected={cardKind === 'treino'} onPress={() => setCardKind('treino')} />
              <Chip label="Alimentação" selected={cardKind === 'comida'} onPress={() => setCardKind('comida')} />
            </View>
            {cardKind === 'treino'
              ? cards.map((c) => (
                  <Card key={c.sessionLogId} style={{ gap: 6 }}>
                    <Text style={[styles.cardTitle, { color: t.text }]}>{c.title}</Text>
                    <Text style={{ color: t.muted, fontSize: 13 }}>
                      {WEEKDAY_NAMES[isoWeekday(c.date)]} {formatDateShort(c.date)}
                      {c.week ? ` · S${c.week}` : ''}
                    </Text>
                    <StatRow
                      items={[
                        { label: 'Séries', value: formatNumber(c.sets, 0) },
                        { label: 'Volume', value: `${formatNumber(c.tonnage, 0)} kg` },
                      ]}
                    />
                    {c.tops.map((s) => (
                      <Text key={s.name} style={{ color: t.text, fontSize: 15 }}>
                        {s.name}: {formatNumber(s.loadKg)} × {s.reps ?? '—'}
                        {s.rpe !== null ? ` @${formatNumber(s.rpe)}` : ''}
                      </Text>
                    ))}
                    <View style={[styles.footer, { borderTopColor: t.separator }]}>
                      <Text style={{ color: t.muted, fontSize: 13 }}>
                        {c.checkin ? `Check-in: ${checkinLine(c.checkin)}` : 'Sem check-in neste dia'}
                      </Text>
                    </View>
                  </Card>
                ))
              : [...new Set(meals.map((m) => m.date))]
                  .sort()
                  .reverse()
                  .slice(0, 30)
                  .map((date) => {
                    const list = meals.filter((m) => m.date === date);
                    const total = sumMacros(list);
                    const day = days.find((d) => d.date === date);
                    return (
                      <Card key={date} style={{ gap: 6 }}>
                        <Text style={[styles.cardTitle, { color: t.text }]}>
                          {WEEKDAY_NAMES[isoWeekday(date)]} {formatDateShort(date)}
                        </Text>
                        <Text style={{ color: t.muted, fontSize: 14 }}>
                          {formatNumber(total.kcal, 0)}
                          {day ? ` / ${formatNumber(day.kcalTarget, 0)}` : ''} kcal · {formatNumber(total.protein, 0)} / {formatNumber(targets.protein, 0)} g de proteína
                        </Text>
                        {Object.entries(
                          list.reduce<Record<string, number>>((acc, e) => ({ ...acc, [e.meal]: (acc[e.meal] ?? 0) + e.kcal }), {}),
                        ).map(([meal, kcal]) => (
                          <Text key={meal} style={{ color: t.text, fontSize: 15 }}>
                            {MEAL_LABEL[meal as keyof typeof MEAL_LABEL] ?? meal}: {formatNumber(kcal, 0)} kcal
                          </Text>
                        ))}
                      </Card>
                    );
                  })}
            {cardKind === 'treino' && cards.length === 0 ? <Text style={{ color: t.muted }}>Nenhum treino registrado ainda.</Text> : null}
            {cardKind === 'comida' && meals.length === 0 ? <Text style={{ color: t.muted }}>Nenhuma refeição registrada ainda.</Text> : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.lg, gap: space.md, paddingBottom: 40 },
  title: { ...font.largeTitle },
  cardTitle: { ...font.headline },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 6, marginTop: 2 },
});
