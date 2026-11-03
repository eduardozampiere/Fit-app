import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertCard } from '../../components/AlertCard';
import { prescriptionLine } from '../../components/ExerciseCard';
import { ItemEditor } from '../../components/ItemEditor';
import { Badge, Card, SectionTitle } from '../../components/ui';
import { listSessionLogs } from '../../db/repo';
import { toISODate } from '../../domain/dates';
import { formatDateShort, WEEKDAY_NAMES } from '../../domain/format';
import { applyAdjustments, type AdjustmentOp } from '../../domain/adjustments';
import { currentLoad, sessionDate, weekForDate } from '../../domain/plan';
import type { PrescribedItem, SessionLog } from '../../domain/types';
import { useAppData } from '../../state/AppData';
import { useCoach } from '../../state/useCoach';
import { TOUCH, useTheme } from '../../ui/theme';

export default function PlanScreen() {
  const t = useTheme();
  const db = useSQLiteContext();
  const { cycle, maxes, version, updateCycle } = useAppData();
  const [logs, setLogs] = useState<SessionLog[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [openSession, setOpenSession] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [editing, setEditing] = useState<{ sessionId: string; item: PrescribedItem | null } | null>(null);
  const coach = useCoach();

  useEffect(() => {
    if (cycle) listSessionLogs(db, cycle.id).then(setLogs);
  }, [db, cycle, version]);

  if (!cycle || !maxes) return null;
  const openWeek = open ?? weekForDate(cycle, toISODate(new Date()))?.number ?? 1;
  const done = new Set(logs.filter((l) => l.status === 'done').map((l) => l.sessionId));
  const apply = async (op: AdjustmentOp) => {
    await updateCycle(applyAdjustments(cycle, maxes, [op]).cycle);
    setEditing(null);
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={styles.body} contentInsetAdjustmentBehavior="automatic">
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <Text style={[styles.title, { color: t.text, flex: 1 }]} accessibilityRole="header">
            {cycle.name}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dados e Claude"
            onPress={() => router.push('/dados')}
            style={[styles.dataBtn, { backgroundColor: t.chip }]}
          >
            <Text style={{ color: t.text, fontWeight: '700', fontSize: 15 }}>Claude</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ajustes"
            onPress={() => router.push('/ajustes')}
            style={[styles.gear, { backgroundColor: t.chip }]}
          >
            <Text style={{ fontSize: 22 }}>⚙︎</Text>
          </Pressable>
        </View>
        {cycle.goal ? <Text style={{ color: t.muted, fontSize: 15 }}>{cycle.goal}</Text> : null}

        {coach.pending.length ? <SectionTitle>Sugestões pendentes ({coach.pending.length})</SectionTitle> : null}
        {coach.pending.map((a) => (
          <AlertCard key={a.key} alert={a} onDecide={(status) => coach.decide(a, status)} />
        ))}
        {coach.decisions.size ? (
          <Pressable accessibilityRole="button" onPress={() => setShowHistory(!showHistory)} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text style={{ color: t.accent, fontSize: 15, fontWeight: '700' }}>
              {showHistory ? 'Esconder' : 'Ver'} decisões anteriores ({coach.decisions.size})
            </Text>
          </Pressable>
        ) : null}
        {showHistory
          ? coach.alerts
              .filter((a) => coach.decisions.has(a.key))
              .map((a) => <AlertCard key={a.key} alert={a} decision={coach.decisions.get(a.key)} />)
          : null}

        <SectionTitle>Semanas</SectionTitle>

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
                              <Pressable
                                key={it.id}
                                accessibilityRole="button"
                                accessibilityLabel={`${it.name}. Toque para editar`}
                                onPress={() => setEditing({ sessionId: s.id, item: it })}
                                style={{ minHeight: 40, justifyContent: 'center', marginLeft: it.parentId ? 14 : 0 }}
                              >
                                <Text style={{ color: t.text, fontSize: 15 }}>
                                  <Text style={{ fontWeight: '700' }}>{it.name}</Text>
                                  {'  '}
                                  <Text style={{ color: t.muted }}>{prescriptionLine(it, currentLoad(cycle, it, maxes))}</Text>
                                  {'  '}
                                  <Text style={{ color: t.accent }}>✎</Text>
                                </Text>
                              </Pressable>
                            ))}
                            <Pressable
                              accessibilityRole="button"
                              onPress={() => setEditing({ sessionId: s.id, item: null })}
                              style={{ minHeight: 40, justifyContent: 'center' }}
                            >
                              <Text style={{ color: t.accent, fontWeight: '700', fontSize: 15 }}>+ Adicionar exercício</Text>
                            </Pressable>
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
      {editing ? (
        <ItemEditor
          item={editing.item}
          onClose={() => setEditing(null)}
          onSave={(patch) =>
            apply(
              editing.item
                ? { op: 'edit_item', itemId: editing.item.id, patch }
                : { op: 'add_item', sessionId: editing.sessionId, item: patch },
            )
          }
          onDelete={editing.item ? () => apply({ op: 'remove_item', itemId: editing.item!.id }) : undefined}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 12, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '800' },
  dataBtn: { height: 48, borderRadius: 14, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  gear: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  weekHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
  weekTitle: { fontSize: 18, fontWeight: '800' },
  session: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, gap: 8 },
  sessionHeader: { minHeight: 44, justifyContent: 'center' },
  sessionTitle: { fontSize: 16, fontWeight: '700' },
  openBtn: { minHeight: TOUCH - 8, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
});
