import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { listMeasurements, listWeights, saveMeasurement, saveWeight, deleteWeight } from '../db/nutritionRepo';
import { movingAverage7, movingAverageSeries, nextMeasurementDate, weeklyTrend, type Measurement, type WeightEntry } from '../domain/body';
import { toISODate } from '../domain/dates';
import { formatDate, formatKg, formatNumber } from '../domain/format';
import { useAppData } from '../state/AppData';
import { useTheme } from '../ui/theme';
import { ChartCard, LineChart } from './charts';
import { BigButton, Card, ListRow, Section, Stepper, StatRow } from './ui';

function useBodyData() {
  const db = useSQLiteContext();
  const { version } = useAppData();
  const [weights, setWeights] = useState<WeightEntry[] | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[] | null>(null);
  useEffect(() => {
    let alive = true;
    Promise.all([listWeights(db), listMeasurements(db)]).then(([w, m]) => {
      if (!alive) return;
      setWeights(w);
      setMeasurements(m);
    });
    return () => {
      alive = false;
    };
  }, [db, version]);
  return { weights, measurements };
}

export function WeightSection() {
  const t = useTheme();
  const { weights } = useBodyData();
  if (!weights) return null;
  const today = toISODate(new Date());
  const avg = movingAverage7(weights, today);
  const trend = weeklyTrend(weights, today);
  return (
    <>
      <WeightForm key={weights.find((w) => w.date === today)?.kg ?? 'novo'} weights={weights} today={today} />
      <StatRow
        items={[
          { label: 'Média 7 dias', value: avg === null ? '—' : formatKg(avg) },
          {
            label: 'Tendência',
            value: trend === null ? '—' : `${trend > 0 ? '+' : ''}${formatNumber(trend, 2)} kg/sem`,
          },
        ]}
      />
      {trend === null ? <Text style={{ color: t.muted, fontSize: 13 }}>A tendência precisa de 2 semanas de pesagens.</Text> : null}
      <ChartCard title="Peso corporal (kg)">
        <LineChart
          series={[{ name: 'Média 7 dias', slot: 0, style: 'line+dots', points: movingAverageSeries(weights).slice(-60).map((w) => ({ x: w.date, y: w.avg7 })) }]}
          yFormat={(v) => formatNumber(v, 1)}
        />
      </ChartCard>
      <Section title="Histórico">
        <View>
          {weights.slice(0, 30).map((w, i, arr) => (
            <ListRow
              key={w.date}
              title={formatDate(w.date)}
              subtitle={`média ${formatNumber(movingAverage7(weights, w.date) ?? w.kg, 1)} kg`}
              value={formatKg(w.kg)}
              last={i === arr.length - 1}
            />
          ))}
        </View>
        {weights.length === 0 ? <Text style={{ color: t.muted }}>Nenhuma pesagem ainda.</Text> : null}
      </Section>
    </>
  );
}

function WeightForm({ weights, today }: { weights: WeightEntry[]; today: string }) {
  const t = useTheme();
  const db = useSQLiteContext();
  const { bump } = useAppData();
  const todays = weights.find((w) => w.date === today);
  const [kg, setKg] = useState<number>(todays?.kg ?? weights[0]?.kg ?? 108);
  return (
    <Card>
      <Text style={{ color: t.muted, fontSize: 14 }}>Peso de hoje, de manhã, em jejum.</Text>
      <Stepper label="Peso" value={kg} step={0.1} onChange={setKg} format={formatKg} />
      <BigButton
        label={todays ? 'Atualizar peso de hoje' : 'Salvar peso de hoje'}
        variant="success"
        onPress={async () => {
          await saveWeight(db, { date: today, kg: Math.round(kg * 10) / 10, note: null });
          bump();
        }}
      />
      {todays ? (
        <Pressable
          accessibilityRole="button"
          onPress={async () => {
            await deleteWeight(db, today);
            bump();
          }}
          style={{ minHeight: 44, justifyContent: 'center', alignItems: 'center' }}
        >
          <Text style={{ color: t.danger, fontWeight: '600' }}>Apagar pesagem de hoje</Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

export function MeasurementsSection() {
  const t = useTheme();
  const { measurements } = useBodyData();
  if (!measurements) return null;
  const today = toISODate(new Date());
  const next = nextMeasurementDate(measurements);
  const last = measurements[0];
  return (
    <>
      <Card>
        <Text style={{ color: t.muted, fontSize: 14 }}>
          A cada 2 semanas, sempre no mesmo horário.{' '}
          {next ? (next <= today ? 'Está na hora de medir.' : `Próxima: ${formatDate(next)}.`) : 'Primeira medição.'}
        </Text>
      </Card>
      <MeasurementForm key={last?.date ?? 'novo'} last={last ?? null} today={today} />
      <Section title="Histórico">
        <View>
          {measurements.map((m, i) => (
            <ListRow
              key={m.date}
              title={formatDate(m.date)}
              subtitle={`Braço ${cm(m.armCm)} · Coxa ${cm(m.thighCm)} · Abdômen ${cm(m.waistCm)}`}
              last={i === measurements.length - 1}
            />
          ))}
        </View>
        {measurements.length === 0 ? <Text style={{ color: t.muted }}>Nenhuma medida ainda.</Text> : null}
      </Section>
    </>
  );
}

const cm = (v: number | null) => (v === null ? '—' : `${formatNumber(v)} cm`);

function MeasurementForm({ last, today }: { last: Measurement | null; today: string }) {
  const db = useSQLiteContext();
  const { bump } = useAppData();
  const [m, setM] = useState<Measurement>({
    date: today,
    armCm: last?.armCm ?? 40,
    thighCm: last?.thighCm ?? 65,
    waistCm: last?.waistCm ?? 100,
  });
  const fmt = (v: number | null) => cm(v);
  return (
    <Card>
      <Stepper label="Braço" value={m.armCm} step={0.5} onChange={(v) => setM({ ...m, armCm: v })} format={fmt} />
      <Stepper label="Coxa" value={m.thighCm} step={0.5} onChange={(v) => setM({ ...m, thighCm: v })} format={fmt} />
      <Stepper label="Abdômen" value={m.waistCm} step={0.5} onChange={(v) => setM({ ...m, waistCm: v })} format={fmt} />
      <View>
        <BigButton
          label={last?.date === today ? 'Atualizar medidas de hoje' : 'Salvar medidas de hoje'}
          variant="success"
          onPress={async () => {
            await saveMeasurement(db, { ...m, date: today });
            bump();
          }}
        />
      </View>
    </Card>
  );
}
