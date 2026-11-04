import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertCard } from '../../components/AlertCard';
import { prescriptionLine } from '../../components/ExerciseCard';
import { ItemEditor } from '../../components/ItemEditor';
import { ActionMenu, Badge, BigButton, Card, Chip, Divider, IconButton, ListRow, Section, type MenuOption } from '../../components/ui';
import { listSessionLogs } from '../../db/repo';
import { toISODate } from '../../domain/dates';
import { formatDateShort, WEEKDAY_NAMES } from '../../domain/format';
import { applyAdjustments, type AdjustmentOp } from '../../domain/adjustments';
import { currentLoad, sessionDate, weekForDate } from '../../domain/plan';
import type { PrescribedItem, SessionLog } from '../../domain/types';
import { useAppData } from '../../state/AppData';
import { useCoach } from '../../state/useCoach';
import { font, space, useTheme } from '../../ui/theme';

export default function PlanScreen() {
  const t = useTheme();
  const db = useSQLiteContext();
  const { cycle, maxes, version, updateCycle } = useAppData();
  const [logs, setLogs] = useState<SessionLog[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [openSession, setOpenSession] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ title: string; options: MenuOption[] } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [editing, setEditing] = useState<{ sessionId: string; item: PrescribedItem | null } | null>(null);
  const coach = useCoach();

  useEffect(() => {
    if (cycle) listSessionLogs(db, cycle.id).then(setLogs);
  }, [db, cycle, version]);

  if (!cycle || !maxes) return null;
  const openWeek = open ?? weekForDate(cycle, toISODate(new Date()))?.number ?? 1;
  const week = cycle.weeks.find((w) => w.number === openWeek) ?? cycle.weeks[0];
  const done = new Set(logs.filter((l) => l.status === 'done').map((l) => l.sessionId));
  const apply = async (op: AdjustmentOp) => {
    await updateCycle(applyAdjustments(cycle, maxes, [op]).cycle);
    setEditing(null);
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={styles.body} contentInsetAdjustmentBehavior="automatic">
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: t.text }]} accessibilityRole="header">
              Plano
            </Text>
            <Text style={[styles.cycleName, { color: t.muted }]}>{cycle.name}</Text>
          </View>
          <IconButton name="sparkles-outline" label="Dados e Claude" onPress={() => router.push('/dados')} color={t.accent} />
          <IconButton name="settings-outline" label="Ajustes" onPress={() => router.push('/ajustes')} color={t.accent} />
        </View>
        {cycle.goal ? <Text style={{ color: t.muted, fontSize: 15 }}>{cycle.goal}</Text> : null}

        {coach.pending.length ? (
          <Section title={`Sugestões pendentes (${coach.pending.length})`}>
            {coach.pending.map((a) => (
              <AlertCard key={a.key} alert={a} onDecide={(status) => coach.decide(a, status)} />
            ))}
          </Section>
        ) : null}
        {coach.decisions.size ? (
          <Pressable accessibilityRole="button" onPress={() => setShowHistory(!showHistory)} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text style={{ color: t.accent, fontSize: 15, fontWeight: '500' }}>
              {showHistory ? 'Esconder' : 'Ver'} decisões anteriores ({coach.decisions.size})
            </Text>
          </Pressable>
        ) : null}
        {showHistory
          ? coach.alerts
              .filter((a) => coach.decisions.has(a.key))
              .map((a) => <AlertCard key={a.key} alert={a} decision={coach.decisions.get(a.key)} />)
          : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weeks}>
          {cycle.weeks.map((w) => {
            const doneCount = w.sessions.filter((s) => done.has(s.id)).length;
            return (
              <Chip
                key={w.number}
                label={`S${w.number}`}
                selected={w.number === week.number}
                tone={doneCount === w.sessions.length ? 'success' : undefined}
                onPress={() => setOpen(w.number)}
                accessibilityLabel={`Semana ${w.number}, ${w.block}, ${doneCount} de ${w.sessions.length} treinos feitos`}
              />
            );
          })}
        </ScrollView>

        <View style={{ gap: 2 }}>
          <Text style={[styles.weekTitle, { color: t.text }]}>
            Semana {week.number} · {week.block}
          </Text>
          <Text style={{ color: t.muted, fontSize: 14 }}>
            {formatDateShort(week.start)} · RPE {week.targetRpeText.replace(/\./g, ',')}
            {week.note ? ` · ${week.note}` : ''}
          </Text>
        </View>

        {week.sessions.map((s) => {
          const sOpen = openSession === s.id;
          const isDone = done.has(s.id);
          return (
            <Card key={s.id}>
              <View style={styles.routineHeader}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.routineTitle, { color: t.text }]}>{s.title}</Text>
                  <Text style={{ color: t.muted, fontSize: 13 }}>
                    {WEEKDAY_NAMES[s.weekday]} {formatDateShort(sessionDate(week, s))}
                  </Text>
                </View>
                {isDone ? <Badge label="Feito" tone="success" /> : null}
                <IconButton
                  name="ellipsis-horizontal"
                  label={`Opções de ${s.title}`}
                  onPress={() =>
                    setMenu({
                      title: s.title,
                      options: [
                        { label: sOpen ? 'Esconder exercícios' : 'Editar exercícios', icon: 'create-outline', onPress: () => setOpenSession(sOpen ? null : s.id) },
                        { label: 'Adicionar exercício', icon: 'add-circle-outline', onPress: () => setEditing({ sessionId: s.id, item: null }) },
                      ],
                    })
                  }
                />
              </View>
              {sOpen ? (
                <View>
                  {s.items.map((it, i) => (
                    <View key={it.id} style={{ marginLeft: it.parentId ? space.md : 0 }}>
                      <ListRow
                        title={it.name}
                        subtitle={prescriptionLine(it, currentLoad(cycle, it, maxes))}
                        onPress={() => setEditing({ sessionId: s.id, item: it })}
                        last={i === s.items.length - 1}
                      />
                    </View>
                  ))}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setEditing({ sessionId: s.id, item: null })}
                    style={{ minHeight: 44, justifyContent: 'center' }}
                  >
                    <Text style={{ color: t.accent, fontWeight: '500', fontSize: 15 }}>+ Adicionar exercício</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Exercícios de ${s.title}. Toque para editar`}
                  onPress={() => setOpenSession(s.id)}
                >
                  <Text style={{ color: t.muted, fontSize: 15, lineHeight: 21 }} numberOfLines={2}>
                    {s.items.filter((it) => !it.parentId).map((it) => it.name).join(', ')}
                  </Text>
                </Pressable>
              )}
              <BigButton
                label={isDone ? 'Ver treino' : 'Abrir treino'}
                variant={isDone ? 'neutral' : 'primary'}
                compact
                onPress={() => router.navigate({ pathname: '/', params: { sessionId: s.id, at: String(Date.now()) } })}
              />
            </Card>
          );
        })}

        <Divider />
        <Section title="Regras do ciclo">
          {cycle.rules.map((r, i) => (
            <Text key={i} style={{ color: t.text, fontSize: 15, lineHeight: 21 }}>
              • {r}
            </Text>
          ))}
        </Section>
      </ScrollView>
      {menu ? <ActionMenu title={menu.title} options={menu.options} onClose={() => setMenu(null)} /> : null}
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
  body: { padding: space.lg, gap: space.md, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  title: { ...font.largeTitle },
  cycleName: { fontSize: 15 },
  weeks: { gap: space.sm, paddingVertical: space.xs },
  weekTitle: { ...font.title },
  routineHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  routineTitle: { ...font.headline, fontSize: 18 },
});
