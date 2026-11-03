import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { checkinLine } from '../../components/CheckinSummary';
import { MeasurementsSection, WeightSection } from '../../components/BodySections';
import { RedFlagModal } from '../../components/RedFlagModal';
import { BigButton, Card, Chip, SectionTitle, Stepper, TextField } from '../../components/ui';
import { saveCheckin } from '../../db/repo';
import { addDays } from '../../domain/dates';
import { formatDateShort, formatNumber } from '../../domain/format';
import { hasRedFlags, NO_RED_FLAGS, type CheckIn, type RedFlags } from '../../domain/rules';
import { useAppData } from '../../state/AppData';
import { useCoach } from '../../state/useCoach';
import { useTheme } from '../../ui/theme';

const AREAS: { key: 'lowBack' | 'knee' | 'wrist' | 'foot'; label: string }[] = [
  { key: 'lowBack', label: 'Lombar' },
  { key: 'knee', label: 'Joelho' },
  { key: 'wrist', label: 'Punho' },
  { key: 'foot', label: 'Pé' },
];

const FLAGS: { key: keyof RedFlags; label: string }[] = [
  { key: 'saddleNumbness', label: 'Dormência na região da sela' },
  { key: 'bladderBowel', label: 'Alteração urinária ou intestinal' },
  { key: 'legWeakness', label: 'Fraqueza nas pernas' },
];

type Section = 'checkin' | 'peso' | 'medidas';

export default function BodyScreen() {
  const t = useTheme();
  const coach = useCoach();
  const [section, setSection] = useState<Section>('checkin');
  const [date, setDate] = useState(coach.today);
  const [alarm, setAlarm] = useState(false);
  if (!coach.ready) return <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} />;

  const existing = coach.checkins.find((c) => c.date === date) ?? null;
  const previous = coach.checkins.find((c) => c.date < date) ?? null;
  const yesterday = addDays(coach.today, -1);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={styles.body} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: t.text }]} accessibilityRole="header">
          Corpo
        </Text>
        <View style={styles.wrap}>
          <Chip label="Check-in" selected={section === 'checkin'} onPress={() => setSection('checkin')} />
          <Chip label="Peso" selected={section === 'peso'} onPress={() => setSection('peso')} />
          <Chip label="Medidas" selected={section === 'medidas'} onPress={() => setSection('medidas')} />
        </View>
        {section === 'peso' ? <WeightSection /> : null}
        {section === 'medidas' ? <MeasurementsSection /> : null}
        {section === 'checkin' ? (
        <>
        <View style={styles.wrap}>
          <Chip label={`Hoje ${formatDateShort(coach.today)}`} selected={date === coach.today} onPress={() => setDate(coach.today)} />
          <Chip label={`Ontem ${formatDateShort(yesterday)}`} selected={date === yesterday} onPress={() => setDate(yesterday)} />
        </View>
        {/* key: remonta o formulário ao trocar de dia ou depois de salvar */}
        <CheckinForm
          key={`${date}-${existing ? 'e' : 'n'}`}
          date={date}
          existing={existing}
          previous={previous}
          onRedFlags={() => setAlarm(true)}
        />

        <SectionTitle>Histórico</SectionTitle>
        {coach.checkins.slice(0, 21).map((c) => (
          <Card key={c.date} style={{ paddingVertical: 10 }}>
            <Text style={{ color: t.text, fontSize: 16, fontWeight: '700' }}>
              {formatDateShort(c.date)}
              {hasRedFlags(c) ? '  ⚠️' : ''}
            </Text>
            <Text style={{ color: t.muted, fontSize: 15 }}>{checkinLine(c)}</Text>
            {c.note ? <Text style={{ color: t.muted, fontSize: 14 }}>{c.note}</Text> : null}
          </Card>
        ))}
        {coach.checkins.length === 0 ? <Text style={{ color: t.muted }}>Nenhum check-in ainda.</Text> : null}
        </>
        ) : null}
      </ScrollView>
      <RedFlagModal visible={alarm} onClose={() => setAlarm(false)} />
    </SafeAreaView>
  );
}

function CheckinForm({
  date,
  existing,
  previous,
  onRedFlags,
}: {
  date: string;
  existing: CheckIn | null;
  previous: CheckIn | null;
  onRedFlags: () => void;
}) {
  const t = useTheme();
  const db = useSQLiteContext();
  const { bump } = useAppData();
  const base = existing ?? previous;
  const [c, setC] = useState<CheckIn>({
    date,
    lowBack: base?.lowBack ?? 0,
    knee: base?.knee ?? 0,
    wrist: base?.wrist ?? 0,
    foot: base?.foot ?? 0,
    sleepH: base?.sleepH ?? 7,
    redFlags: existing?.redFlags ?? NO_RED_FLAGS,
    note: existing?.note ?? null,
  });
  const [showFlags, setShowFlags] = useState(hasRedFlags(existing));
  const save = async () => {
    await saveCheckin(db, c);
    if (hasRedFlags(c)) onRedFlags();
    bump();
  };

  return (
    <>
      <Card>
        <Text style={{ color: t.muted, fontSize: 14 }}>
          {existing ? 'Check-in já feito: ajuste e salve de novo.' : previous ? `Valores do último check-in (${formatDateShort(previous.date)}). Mude só o que mudou.` : '0 = sem dor, 10 = dor máxima.'}
        </Text>
        {AREAS.map((a) => (
          <Stepper
            key={a.key}
            label={`${a.label} (0–10)`}
            value={c[a.key]}
            step={1}
            onChange={(v) => setC({ ...c, [a.key]: Math.min(10, v) })}
            format={(v) => (v === null ? '—' : `${v}`)}
          />
        ))}
        <Stepper
          label="Sono (horas)"
          value={c.sleepH}
          step={0.5}
          onChange={(v) => setC({ ...c, sleepH: Math.min(14, v) })}
          format={(v) => (v === null ? '—' : `${formatNumber(v)} h`)}
        />
        <TextField
          value={c.note ?? ''}
          onChangeText={(v) => setC({ ...c, note: v || null })}
          placeholder="Observação (opcional)"
          surface="bg"
          maxLength={200}
          accessibilityLabel="Observação do check-in"
        />
      </Card>

      <Card style={{ borderColor: t.danger }}>
        <Text style={{ color: t.danger, fontSize: 16, fontWeight: '800' }}>Sinais de alarme da lombar</Text>
        {showFlags ? (
          <View style={{ gap: 8 }}>
            {FLAGS.map((f) => (
              <Chip
                key={f.key}
                label={`${c.redFlags[f.key] ? '☑' : '☐'}  ${f.label}`}
                selected={c.redFlags[f.key]}
                onPress={() => setC({ ...c, redFlags: { ...c.redFlags, [f.key]: !c.redFlags[f.key] } })}
              />
            ))}
          </View>
        ) : (
          <BigButton label="Tenho algum sinal de alarme" compact variant="neutral" onPress={() => setShowFlags(true)} />
        )}
      </Card>

      <BigButton label={existing ? 'Atualizar check-in' : 'Salvar check-in'} variant="success" onPress={save} />
    </>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 12, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
