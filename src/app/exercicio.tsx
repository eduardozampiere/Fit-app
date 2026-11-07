import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChartCard, LineChart } from '../components/charts';
import { ExerciseImage } from '../components/ExerciseImage';
import { RecordMedal } from '../components/RecordMedal';
import { RecordSheet } from '../components/RecordSheet';
import { Card, Chip, ChipRow, IconButton, ListRow, Section } from '../components/ui';
import { findCatalogExercise, MUSCLE_LABEL, type Catalog } from '../domain/catalog';
import { formatDate, formatKg, formatNumber } from '../domain/format';
import {
  exerciseHistory,
  exerciseRows,
  exerciseSeries,
  personalRecords,
  STAT_METRIC_LABEL,
  type StatMetric,
} from '../domain/exerciseStats';
import { holderSubtitle, RECORD_LABEL, recordTypesOf, recordValueText, type RecordType } from '../domain/records';
import { useAppData } from '../state/AppData';
import { useRecordBook } from '../state/useRecords';
import { font, space, TOUCH, useTheme } from '../ui/theme';
import catalogJson from '../../assets/catalog/exercicios.json';

const catalog = catalogJson as unknown as Catalog;
type Tab = 'resumo' | 'historico';
const TABS: { key: Tab; label: string }[] = [
  { key: 'resumo', label: 'Resumo' },
  { key: 'historico', label: 'Histórico' },
];
const METRICS = Object.keys(STAT_METRIC_LABEL) as StatMetric[];
/** Ordem das linhas de recorde com valor (o volume de sessão, sem medalha, vem por último). */
const RECORD_ROWS: readonly RecordType[] = ['maxLoad', 'oneRm', 'oneRmRpe', 'setVolume'];

/** Tela do exercício (toque no cartão do treino): imagem, gráfico, recordes e histórico. */
export default function ExerciseScreen() {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const { cycle, recordPrefs } = useAppData();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { rows: allRows, book } = useRecordBook();
  const rows = useMemo(() => (allRows ? exerciseRows(allRows, id) : null), [allRows, id]);
  const [recordSheet, setRecordSheet] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('resumo');
  const [metric, setMetric] = useState<StatMetric>('maxLoad');

  const exercise = cycle?.exercises.find((e) => e.id === id);
  const title = exercise?.name ?? name ?? 'Exercício';
  const info = findCatalogExercise(catalog, exercise ?? { id, name: title });
  const series = useMemo(() => exerciseSeries(rows ?? [], metric), [rows, metric]);
  const records = useMemo(() => personalRecords(rows ?? []), [rows]);
  const history = useMemo(() => exerciseHistory(rows ?? []), [rows]);
  const imageHeight = Math.round(width * 0.6);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: t.bg }}>
      {/* Cabeçalho próprio: o nativo do iOS 26 não segue o tema escuro nesta tela. */}
      <View style={styles.header}>
        <IconButton name="chevron-back" label="Voltar" onPress={() => router.back()} color={t.accent} />
        <Text style={[styles.headerTitle, { color: t.text }]} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        <View style={{ width: TOUCH }} />
      </View>
      <View style={[styles.tabs, { borderBottomColor: t.separator }]}>
        {TABS.map((x) => (
          <Pressable
            key={x.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === x.key }}
            onPress={() => setTab(x.key)}
            style={[styles.tab, tab === x.key && { borderBottomColor: t.accent }]}
          >
            <Text style={{ color: tab === x.key ? t.accent : t.muted, fontSize: 16, fontWeight: '600' }}>{x.label}</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} contentInsetAdjustmentBehavior="automatic">
        {tab === 'resumo' ? (
          <>
            {info?.image ? (
              <View style={{ backgroundColor: t.accentText }}>
                <ExerciseImage uri={info.image} width={width} height={imageHeight} fit="contain" />
              </View>
            ) : null}
            <View style={styles.body}>
              <View style={{ gap: space.xs }}>
                <Text style={[styles.title, { color: t.text }]} accessibilityRole="header">
                  {title}
                </Text>
                {info ? (
                  <>
                    <Text style={{ color: t.muted, fontSize: 15 }}>Primário: {MUSCLE_LABEL[info.muscle] ?? info.muscle}</Text>
                    {info.secondary.length ? (
                      <Text style={{ color: t.muted, fontSize: 15 }}>
                        Secundário: {info.secondary.map((m) => MUSCLE_LABEL[m] ?? m).join(', ')}
                      </Text>
                    ) : null}
                  </>
                ) : null}
              </View>

              {rows === null ? null : history.length === 0 ? (
                <Card>
                  <Text style={{ color: t.muted, fontSize: 15 }}>
                    Nenhuma série registrada deste exercício ainda. Os gráficos e recordes aparecem depois do primeiro treino.
                  </Text>
                </Card>
              ) : (
                <>
                  <ChartCard title={STAT_METRIC_LABEL[metric]} subtitle="Um ponto por treino">
                    <LineChart
                      series={[{ name: STAT_METRIC_LABEL[metric], slot: 0, points: series }]}
                      yFormat={(v) => `${formatNumber(v, 0)}`}
                      empty="Sem séries com carga e repetições."
                    />
                  </ChartCard>
                  <ChipRow>
                    {METRICS.map((m) => (
                      <Chip key={m} label={STAT_METRIC_LABEL[m]} selected={metric === m} onPress={() => setMetric(m)} />
                    ))}
                  </ChipRow>

                  <Section title="Recordes pessoais">
                    {records.maxLoad ? (
                      <View>
                        {recordPrefs.medals ? (
                          <Text style={{ color: t.muted, fontSize: 13 }}>
                            A medalha marca as séries que superaram todos os treinos anteriores.
                          </Text>
                        ) : null}
                        {RECORD_ROWS.map((type) => {
                          const holder = records[type];
                          return (
                            <ListRow
                              key={type}
                              title={RECORD_LABEL[type]}
                              subtitle={holder ? holderSubtitle(type, holder) : undefined}
                              value={holder ? recordValueText(type, holder.value) : '—'}
                              onPress={holder?.hasMedal && recordPrefs.medals ? () => setRecordSheet(holder.set.setId) : undefined}
                            />
                          );
                        })}
                        <ListRow
                          title="Maior volume de sessão"
                          subtitle={records.bestSessionVolume ? formatDate(records.bestSessionVolume.date) : undefined}
                          value={records.bestSessionVolume ? formatKg(records.bestSessionVolume.kg) : '—'}
                          last
                        />
                      </View>
                    ) : (
                      <Text style={{ color: t.muted, fontSize: 15 }}>Sem séries com carga e repetições.</Text>
                    )}
                  </Section>

                  {records.byReps.length ? (
                    <Section title="Recordes por repetições">
                      <Text style={{ color: t.muted, fontSize: 13 }}>Maior carga feita com pelo menos essas repetições.</Text>
                      <View>
                        {records.byReps.map((r, i) => (
                          <ListRow
                            key={r.reps}
                            title={`${r.reps} ${r.reps === 1 ? 'repetição' : 'repetições'}`}
                            subtitle={formatDate(r.date)}
                            value={formatKg(r.kg)}
                            last={i === records.byReps.length - 1}
                          />
                        ))}
                      </View>
                    </Section>
                  ) : null}
                </>
              )}
            </View>
          </>
        ) : (
          <View style={styles.body}>
            {history.length === 0 ? (
              <Text style={{ color: t.muted, fontSize: 15 }}>
                {rows === null ? 'Carregando…' : 'Nenhuma série registrada deste exercício ainda.'}
              </Text>
            ) : (
              history.map((s) => (
                <Card key={s.sessionLogId}>
                  <Text style={{ color: t.text, fontSize: 17, fontWeight: '600' }}>{s.title}</Text>
                  <Text style={{ color: t.muted, fontSize: 13 }}>{formatDate(s.date)}</Text>
                  {s.sets.map((x) => (
                    <View key={x.setId} style={styles.setLine}>
                      <Text style={[styles.setIdx, { color: t.muted }]}>{x.setIndex}</Text>
                      <Text style={{ color: t.text, fontSize: 16, flex: 1, fontVariant: ['tabular-nums'] }}>
                        {x.loadKg !== null ? formatKg(x.loadKg) : '—'} × {x.reps ?? '—'}
                        {x.rpe !== null ? ` · RPE ${formatNumber(x.rpe)}` : ''}
                      </Text>
                      {recordPrefs.medals && recordTypesOf(book, x.setId).length > 0 ? (
                        <RecordMedal types={recordTypesOf(book, x.setId)} onPress={() => setRecordSheet(x.setId)} />
                      ) : null}
                      {x.failed ? <Text style={{ color: t.danger, fontSize: 14, fontWeight: '600' }}>falhou</Text> : null}
                    </View>
                  ))}
                </Card>
              ))
            )}
          </View>
        )}
      </ScrollView>
      {recordSheet && book.bySet.get(recordSheet) ? (
        <RecordSheet records={book.bySet.get(recordSheet)!} onClose={() => setRecordSheet(null)} />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.sm, minHeight: 52 },
  headerTitle: { ...font.headline, flex: 1, textAlign: 'center' },
  tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: space.sm },
  tab: {
    minHeight: 48,
    paddingHorizontal: space.lg,
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  body: { padding: space.lg, gap: space.lg },
  title: { ...font.title },
  setLine: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 32 },
  setIdx: { width: 24, fontSize: 15, fontWeight: '600', textAlign: 'center' },
});
