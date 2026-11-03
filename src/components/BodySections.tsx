import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { listMeasurements, listWeights, saveMeasurement, saveWeight, deleteWeight } from '../db/nutritionRepo';
import { movingAverage7, nextMeasurementDate, weeklyTrend, type Measurement, type WeightEntry } from '../domain/body';
import { toISODate } from '../domain/dates';
import { formatDateShort, formatKg, formatNumber } from '../domain/format';
import { useAppData } from '../state/AppData';
import { useTheme } from '../ui/theme';
import { BigButton, Card, SectionTitle, Stepper } from './ui';

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
      <Card>
        <Text style={{ color: t.muted, fontSize: 13, fontWeight: '700' }}>MÉDIA MÓVEL (7 DIAS)</Text>
        <Text style={{ color: t.text, fontSize: 28, fontWeight: '800' }}>{avg === null ? '—' : formatKg(avg)}</Text>
        <Text style={{ color: t.muted, fontSize: 15 }}>
          Tendência:{' '}
          {trend === null ? 'precisa de 2 semanas de pesagens' : `${trend > 0 ? '+' : ''}${formatNumber(trend, 2)} kg/semana`}
        </Text>
      </Card>
      <SectionTitle>Pesagens</SectionTitle>
      {weights.slice(0, 30).map((w) => (
        <Card key={w.date} style={{ paddingVertical: 10, flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: t.text, fontSize: 16, fontWeight: '700', flex: 1 }}>{formatDateShort(w.date)}</Text>
          <Text style={{ color: t.text, fontSize: 16 }}>{formatKg(w.kg)}</Text>
          <Text style={{ color: t.muted, fontSize: 14, width: 90, textAlign: 'right' }}>
            méd. {formatNumber(movingAverage7(weights, w.date) ?? w.kg, 1)}
          </Text>
        </Card>
      ))}
      {weights.length === 0 ? <Text style={{ color: t.muted }}>Nenhuma pesagem ainda.</Text> : null}
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
          <Text style={{ color: t.danger, fontWeight: '700' }}>Apagar pesagem de hoje</Text>
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
          {next ? (next <= today ? 'Está na hora de medir.' : `Próxima: ${formatDateShort(next)}.`) : 'Primeira medição.'}
        </Text>
      </Card>
      <MeasurementForm key={last?.date ?? 'novo'} last={last ?? null} today={today} />
      <SectionTitle>Histórico</SectionTitle>
      {measurements.map((m) => (
        <Card key={m.date} style={{ paddingVertical: 10 }}>
          <Text style={{ color: t.text, fontSize: 16, fontWeight: '700' }}>{formatDateShort(m.date)}</Text>
          <Text style={{ color: t.muted, fontSize: 15 }}>
            Braço {cm(m.armCm)} · Coxa {cm(m.thighCm)} · Abdômen {cm(m.waistCm)}
          </Text>
        </Card>
      ))}
      {measurements.length === 0 ? <Text style={{ color: t.muted }}>Nenhuma medida ainda.</Text> : null}
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
