import { StyleSheet, Text, View } from 'react-native';
import type { AlertDecision } from '../db/repo';
import type { Alert } from '../domain/rules';
import { useTheme } from '../ui/theme';
import { BigButton, Card } from './ui';

export function AlertCard({
  alert,
  decision,
  onDecide,
}: {
  alert: Alert;
  decision?: AlertDecision;
  onDecide?: (status: AlertDecision) => void;
}) {
  const t = useTheme();
  const [bg, fg] =
    alert.severity === 'danger' ? [t.dangerBg, t.danger] : alert.severity === 'warn' ? [t.warnBg, t.warn] : [t.doneBg, t.done];
  return (
    <Card style={{ backgroundColor: bg, borderColor: bg }}>
      <Text style={[styles.title, { color: fg }]} accessibilityRole="header">
        {alert.title}
      </Text>
      <Text style={[styles.msg, { color: t.text }]}>{alert.message}</Text>
      {decision ? (
        <Text style={[styles.decided, { color: t.muted }]}>{decision === 'accepted' ? '✓ Aceito' : 'Ignorado'}</Text>
      ) : onDecide ? (
        <View style={styles.row}>
          {alert.suggestion ? (
            <>
              <View style={{ flex: 1 }}>
                <BigButton label="Aplicar no plano" compact onPress={() => onDecide('accepted')} />
              </View>
              <View style={{ flex: 1 }}>
                <BigButton label="Ignorar" compact variant="neutral" onPress={() => onDecide('dismissed')} />
              </View>
            </>
          ) : (
            <View style={{ flex: 1 }}>
              <BigButton label="Ok, entendi" compact variant="neutral" onPress={() => onDecide('dismissed')} />
            </View>
          )}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 17, fontWeight: '700' },
  msg: { fontSize: 15, lineHeight: 21 },
  decided: { fontSize: 14, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 8 },
});
