import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { prescriptionLine } from '../../components/ExerciseCard';
import { Badge, Card, SectionTitle } from '../../components/ui';
import { listSessionLogs } from '../../db/repo';
import { toISODate } from '../../domain/dates';
import { formatDateShort, WEEKDAY_NAMES } from '../../domain/format';
import { currentLoad, sessionDate, weekForDate } from '../../domain/plan';
import type { SessionLog } from '../../domain/types';
import { useAppData } from '../../state/AppData';
import { TOUCH, useTheme } from '../../ui/theme';

export default function PlanScreen() {
  const t = useTheme();
  const db = useSQLiteContext();
  const { cycle, maxes, version } = useAppData();
  const [logs, setLogs] = useState<SessionLog[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [openSession, setOpenSession] = useState<string | null>(null);

  useEffect(() => {
    if (cycle) listSessionLogs(db, cycle.id).then(setLogs);
  }, [db, cycle, version]);

  if (!cycle || !maxes) return null;
  const openWeek = open ?? weekForDate(cycle, toISODate(new Date()))?.number ?? 1;
  const done = new Set(logs.filter((l) => l.status === 'done').map((l) => l.sessionId));

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={[styles.title, { color: t.text }]} accessibilityRole="header">
          {cycle.name}
        </Text>
        {cycle.goal ? <Text style={{ color: t.muted, fontSize: 15 }}>{cycle.goal}</Text> : null}

        {cycle.weeks.map((w) => {
          const isOpen = openWeek === w.number;
          const doneCount = w.sessions.filter((s) => done.has(s.id)).length;
          return (
            <Card key={w.number}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: isOpen }}
                accessibilityLabel={`Semana ${w.number}, ${w.block}, ${doneCount} de ${w.sessions.length} treinos feitos`}
                onPress={() => setOpen(isOpen ? -1 : w.number)}
                style={styles.weekHeader}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.weekTitle, { color: t.text }]}>
                    S{w.number} · {w.block}
                  </Text>
                  <Text style={{ color: t.muted, fontSize: 14 }}>
                    {formatDateShort(w.start)} · RPE {w.targetRpeText.replace(/\./g, ',')}
                    {w.note ? ` · ${w.note}` : ''}
                  </Text>
                </View>
                <Badge label={`${doneCount}/${w.sessions.length}`} tone={doneCount === w.sessions.length ? 'success' : 'neutral'} />
              </Pressable>

              {isOpen
                ? w.sessions.map((s) => {
                    const sOpen = openSession === s.id;
                    return (
                      <View key={s.id} style={[styles.session, { borderColor: t.border }]}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`${WEEKDAY_NAMES[s.weekday]}, ${s.title}. Toque para ver os exercícios`}
                          onPress={() => setOpenSession(sOpen ? null : s.id)}
                          style={styles.sessionHeader}
                        >
                          <Text style={[styles.sessionTitle, { color: t.text }]}>
                            {done.has(s.id) ? '✓ ' : ''}
                            {WEEKDAY_NAMES[s.weekday]} {formatDateShort(sessionDate(w, s))} — {s.title}
                          </Text>
                        </Pressable>
                        {sOpen ? (
                          <View style={{ gap: 6 }}>
                            {s.items.map((it) => (
                              <Text key={it.id} style={{ color: t.text, fontSize: 15, marginLeft: it.parentId ? 14 : 0 }}>
                                <Text style={{ fontWeight: '700' }}>{it.name}</Text>
                                {'  '}
                                <Text style={{ color: t.muted }}>{prescriptionLine(it, currentLoad(cycle, it, maxes))}</Text>
                              </Text>
                            ))}
                            <Pressable
                              accessibilityRole="button"
                              onPress={() => router.navigate({ pathname: '/', params: { sessionId: s.id, at: String(Date.now()) } })}
                              style={[styles.openBtn, { backgroundColor: t.accent }]}
                            >
                              <Text style={{ color: t.accentText, fontWeight: '700', fontSize: 16 }}>Abrir este treino</Text>
                            </Pressable>
                          </View>
                        ) : null}
                      </View>
                    );
                  })
                : null}
            </Card>
          );
        })}

        <SectionTitle>Regras do ciclo</SectionTitle>
        <Card>
          {cycle.rules.map((r, i) => (
            <Text key={i} style={{ color: t.text, fontSize: 15, lineHeight: 21 }}>
              • {r}
            </Text>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 12, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '800' },
  weekHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
  weekTitle: { fontSize: 18, fontWeight: '800' },
  session: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, gap: 8 },
  sessionHeader: { minHeight: 44, justifyContent: 'center' },
  sessionTitle: { fontSize: 16, fontWeight: '700' },
  openBtn: { minHeight: TOUCH - 8, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
});
