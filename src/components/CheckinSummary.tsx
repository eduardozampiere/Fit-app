import { router } from 'expo-router';
import { Text } from 'react-native';
import { formatNumber } from '../domain/format';
import { hasRedFlags, type CheckIn } from '../domain/rules';
import { useTheme } from '../ui/theme';
import { BigButton, Card } from './ui';

export function checkinLine(c: CheckIn): string {
  const v = (n: number | null) => (n === null ? '—' : String(n));
  return `Lombar ${v(c.lowBack)} · Joelho ${v(c.knee)} · Punho ${v(c.wrist)} · Pé ${v(c.foot)} · Sono ${c.sleepH === null ? '—' : `${formatNumber(c.sleepH)} h`}`;
}

/** Check-in do dia no topo do treino (ou o atalho para fazer). */
export function CheckinSummary({ checkin }: { checkin: CheckIn | null }) {
  const t = useTheme();
  if (!checkin) {
    return <BigButton label="Fazer check-in (10 s)" variant="neutral" onPress={() => router.navigate('/corpo')} />;
  }
  return (
    <Card style={{ paddingVertical: 10 }}>
      <Text style={{ color: t.muted, fontSize: 13, fontWeight: '700' }}>CHECK-IN DE HOJE{hasRedFlags(checkin) ? '  ⚠️' : ''}</Text>
      <Text style={{ color: t.text, fontSize: 15 }}>{checkinLine(checkin)}</Text>
    </Card>
  );
}
