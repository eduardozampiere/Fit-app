import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FavoritePicker, FoodEditor, FoodPicker, FoodsManager, macroLine, NamePrompt } from '../../components/FoodModals';
import { BigButton, Card } from '../../components/ui';
import {
  deleteFavorite,
  deleteFood,
  deleteMealEntry,
  deleteOilEntries,
  insertMealEntries,
  listFavorites,
  listFoods,
  listMealEntries,
  saveFavorite,
  saveFood,
} from '../../db/nutritionRepo';
import { newId } from '../../db/repo';
import { addDays, isoWeekday, toISODate } from '../../domain/dates';
import { formatDateShort, formatNumber, WEEKDAY_NAMES } from '../../domain/format';
import {
  favoriteEntries,
  kcalTarget,
  MEALS,
  oilEntry,
  sumMacros,
  type FavoriteMeal,
  type Food,
  type MealEntry,
  type MealType,
} from '../../domain/nutrition';
import { sessionForDate } from '../../domain/plan';
import { useAppData } from '../../state/AppData';
import { useTheme } from '../../ui/theme';

type ModalState =
  | { kind: 'picker'; meal: MealType }
  | { kind: 'favorites'; meal: MealType }
  | { kind: 'saveFavorite'; meal: MealType }
  | { kind: 'foods' }
  | { kind: 'foodEditor'; food: Food | null; back?: ModalState }
  | null;

export default function FoodScreen() {
  const t = useTheme();
  const db = useSQLiteContext();
  const { cycle, targets, version, bump } = useAppData();
  const today = toISODate(new Date());
  const [date, setDate] = useState(today);
  const [foods, setFoods] = useState<Food[]>([]);
  const [favorites, setFavorites] = useState<FavoriteMeal[]>([]);
  const [entries, setEntries] = useState<MealEntry[]>([]);
  const [modal, setModal] = useState<ModalState>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([listFoods(db), listFavorites(db), listMealEntries(db, date, date)]).then(([f, fav, e]) => {
      if (!alive) return;
      setFoods(f);
      setFavorites(fav);
      setEntries(e);
    });
    return () => {
      alive = false;
    };
  }, [db, date, version]);

  const isTraining = !!cycle && !!sessionForDate(cycle, date);
  const total = useMemo(() => sumMacros(entries), [entries]);
  const kcalGoal = kcalTarget(targets, isTraining);

  const add = async (list: Omit<MealEntry, 'id'>[]) => {
    await insertMealEntries(db, list);
    bump();
  };

  const setOil = async (meal: MealType, spoons: number) => {
    await deleteOilEntries(db, date, meal);
    if (spoons > 0) await insertMealEntries(db, [oilEntry(date, meal, spoons, targets.oilKcalPerSpoon)]);
    bump();
  };

  const saveMealAsFavorite = async (meal: MealType, name: string) => {
    const list = entries.filter((e) => e.meal === meal);
    const fav: FavoriteMeal = {
      id: newId(),
      name,
      items: list.filter((e) => e.kind === 'food' && e.foodId && e.grams).map((e) => ({ foodId: e.foodId!, grams: e.grams! })),
      oilSpoons: list.filter((e) => e.kind === 'oil').reduce((a, e) => a + (e.grams ?? 0), 0),
    };
    await saveFavorite(db, fav);
    setModal(null);
    bump();
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={styles.body} contentInsetAdjustmentBehavior="automatic">
        <View style={styles.header}>
          <Text style={[styles.title, { color: t.text, flex: 1 }]} accessibilityRole="header">
            Comida
          </Text>
          <Pressable accessibilityRole="button" onPress={() => setModal({ kind: 'foods' })} style={[styles.smallBtn, { backgroundColor: t.chip }]}>
            <Text style={{ color: t.text, fontWeight: '700' }}>Alimentos</Text>
          </Pressable>
        </View>

        <View style={styles.dateNav}>
          <Pressable accessibilityRole="button" accessibilityLabel="Dia anterior" onPress={() => setDate(addDays(date, -1))} style={[styles.navBtn, { backgroundColor: t.chip }]}>
            <Text style={[styles.navText, { color: t.text }]}>‹</Text>
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: t.text, fontSize: 18, fontWeight: '800' }}>
              {date === today ? 'Hoje' : WEEKDAY_NAMES[isoWeekday(date)]} {formatDateShort(date)}
            </Text>
            <Text style={{ color: t.muted, fontSize: 14 }}>{isTraining ? 'Dia de treino' : 'Dia de descanso'}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Próximo dia"
            disabled={date >= today}
            onPress={() => setDate(addDays(date, 1))}
            style={[styles.navBtn, { backgroundColor: t.chip, opacity: date >= today ? 0.3 : 1 }]}
          >
            <Text style={[styles.navText, { color: t.text }]}>›</Text>
          </Pressable>
        </View>

        <Card>
          <Goal label="Calorias" value={total.kcal} goal={kcalGoal} unit="kcal" />
          <Goal label="Proteína" value={total.protein} goal={targets.protein} unit="g" />
          <Text style={{ color: t.muted, fontSize: 14 }}>
            Carbo {formatNumber(total.carbs)} g · Gordura {formatNumber(total.fat)} g
          </Text>
        </Card>

        {MEALS.map((m) => {
          const list = entries.filter((e) => e.meal === m.id);
          const oil = list.filter((e) => e.kind === 'oil').reduce((a, e) => a + (e.grams ?? 0), 0);
          const sub = sumMacros(list);
          return (
            <Card key={m.id}>
              <View style={styles.header}>
                <Text style={{ color: t.text, fontSize: 18, fontWeight: '800', flex: 1 }} accessibilityRole="header">
                  {m.label}
                </Text>
                {list.length ? <Text style={{ color: t.muted, fontSize: 14 }}>{formatNumber(sub.kcal, 0)} kcal</Text> : null}
              </View>
              {list
                .filter((e) => e.kind !== 'oil')
                .map((e) => (
                  <View key={e.id} style={styles.entry}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: t.text, fontSize: 16, fontWeight: '600' }}>
                        {e.grams ? `${formatNumber(e.grams, 0)} g ` : ''}
                        {e.label}
                      </Text>
                      <Text style={{ color: t.muted, fontSize: 13 }}>{macroLine(e)}</Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remover ${e.label}`}
                      onPress={async () => {
                        await deleteMealEntry(db, e.id);
                        bump();
                      }}
                      style={[styles.delBtn, { backgroundColor: t.chip }]}
                    >
                      <Text style={{ color: t.muted, fontSize: 18 }}>✕</Text>
                    </Pressable>
                  </View>
                ))}
              {list.length ? (
              <View style={styles.oilRow}>
                <Text style={{ color: t.muted, fontSize: 14, flex: 1 }}>
                  Óleo de preparo: {formatNumber(oil)} colher{oil === 1 ? '' : 'es'} ({formatNumber(oil * targets.oilKcalPerSpoon, 0)} kcal)
                </Text>
                <Pressable accessibilityRole="button" accessibilityLabel={`Menos óleo no ${m.label}`} onPress={() => setOil(m.id, Math.max(0, oil - 0.5))} style={[styles.oilBtn, { backgroundColor: t.chip }]}>
                  <Text style={{ color: t.text, fontSize: 20, fontWeight: '700' }}>−</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={`Mais óleo no ${m.label}`} onPress={() => setOil(m.id, oil + 0.5)} style={[styles.oilBtn, { backgroundColor: t.chip }]}>
                  <Text style={{ color: t.text, fontSize: 20, fontWeight: '700' }}>+</Text>
                </Pressable>
              </View>
              ) : null}
              <View style={styles.actions}>
                <View style={{ flex: 1 }}>
                  <BigButton label="+ Alimento" compact onPress={() => setModal({ kind: 'picker', meal: m.id })} />
                </View>
                <View style={{ flex: 1 }}>
                  <BigButton label="Favorita" compact variant="neutral" onPress={() => setModal({ kind: 'favorites', meal: m.id })} />
                </View>
              </View>
              {list.some((e) => e.kind === 'food') ? (
                <Pressable accessibilityRole="button" onPress={() => setModal({ kind: 'saveFavorite', meal: m.id })} style={{ minHeight: 40, justifyContent: 'center' }}>
                  <Text style={{ color: t.accent, fontWeight: '700' }}>Salvar como favorita</Text>
                </Pressable>
              ) : null}
            </Card>
          );
        })}
      </ScrollView>

      {modal?.kind === 'picker' ? (
        <FoodPicker
          visible
          foods={foods}
          meal={modal.meal}
          date={date}
          onAdd={(e) => add([e])}
          onNewFood={() => setModal({ kind: 'foodEditor', food: null, back: modal })}
          onClose={() => setModal(null)}
        />
      ) : null}
      {modal?.kind === 'favorites' ? (
        <FavoritePicker
          favorites={favorites}
          foods={foods}
          onPick={async (f) => {
            await add(favoriteEntries(f, foods, modal.meal, date, targets.oilKcalPerSpoon));
            setModal(null);
          }}
          onDelete={async (f) => {
            await deleteFavorite(db, f.id);
            bump();
          }}
          onClose={() => setModal(null)}
        />
      ) : null}
      {modal?.kind === 'saveFavorite' ? (
        <NamePrompt title="Nome da refeição favorita" onSave={(name) => saveMealAsFavorite(modal.meal, name)} onClose={() => setModal(null)} />
      ) : null}
      {modal?.kind === 'foods' ? (
        <FoodsManager
          foods={foods}
          onEdit={(f) => setModal({ kind: 'foodEditor', food: f, back: { kind: 'foods' } })}
          onNew={() => setModal({ kind: 'foodEditor', food: null, back: { kind: 'foods' } })}
          onClose={() => setModal(null)}
        />
      ) : null}
      {modal?.kind === 'foodEditor' ? (
        <FoodEditor
          initial={modal.food}
          onSave={async (f) => {
            await saveFood(db, f);
            bump();
            setModal(modal.back ?? null);
          }}
          onDelete={
            modal.food
              ? async () => {
                  await deleteFood(db, modal.food!.id);
                  bump();
                  setModal(modal.back ?? null);
                }
              : undefined
          }
          onClose={() => setModal(modal.back ?? null)}
        />
      ) : null}
    </SafeAreaView>
  );
}

function Goal({ label, value, goal, unit }: { label: string; value: number; goal: number; unit: string }) {
  const t = useTheme();
  const pct = goal > 0 ? value / goal : 0;
  const over = pct > 1.05;
  return (
    <View style={{ gap: 4 }} accessible accessibilityLabel={`${label}: ${formatNumber(value, 0)} de ${formatNumber(goal, 0)} ${unit}`}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <Text style={{ color: t.text, fontSize: 16, fontWeight: '700', flex: 1 }}>{label}</Text>
        <Text style={{ color: t.text, fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
          {formatNumber(value, 0)} <Text style={{ color: t.muted, fontSize: 14, fontWeight: '600' }}>/ {formatNumber(goal, 0)} {unit}</Text>
        </Text>
      </View>
      <View style={[styles.bar, { backgroundColor: t.chip }]}>
        <View style={[styles.barFill, { width: `${Math.min(100, pct * 100)}%`, backgroundColor: over ? t.warn : t.accent }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 12, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  smallBtn: { minHeight: 44, borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center' },
  dateNav: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  navBtn: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  navText: { fontSize: 30, fontWeight: '600', marginTop: -3 },
  entry: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  delBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  oilRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  oilBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 8 },
  bar: { height: 10, borderRadius: 5, overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 5 },
});

