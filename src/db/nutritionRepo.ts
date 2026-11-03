import type { SQLiteDatabase } from 'expo-sqlite';
import type { Measurement, WeightEntry } from '../domain/body';
import type { FavoriteMeal, Food, MealEntry, MealType } from '../domain/nutrition';
import { newId } from './repo';

// ---- Alimentos ----

export async function listFoods(db: SQLiteDatabase): Promise<Food[]> {
  return db.getAllAsync<Food>('SELECT id, name, kcal, protein, carbs, fat FROM foods ORDER BY name COLLATE NOCASE');
}

export async function saveFood(db: SQLiteDatabase, f: Food): Promise<void> {
  await db.runAsync(
    'INSERT OR REPLACE INTO foods (id, name, kcal, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?)',
    f.id, f.name, f.kcal, f.protein, f.carbs, f.fat,
  );
}

export async function deleteFood(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM foods WHERE id = ?', id);
}

// ---- Refeições ----

type MealRow = Omit<MealEntry, 'foodId'> & { food_id: string | null };

export async function listMealEntries(db: SQLiteDatabase, from: string, to: string): Promise<MealEntry[]> {
  const rows = await db.getAllAsync<MealRow>(
    `SELECT id, date, meal, kind, label, food_id, grams, kcal, protein, carbs, fat
     FROM meal_entries WHERE date >= ? AND date <= ? ORDER BY date, created_at`,
    from, to,
  );
  return rows.map(({ food_id, ...r }) => ({ ...r, foodId: food_id }));
}

export async function listAllMealEntries(db: SQLiteDatabase): Promise<MealEntry[]> {
  return listMealEntries(db, '0000-00-00', '9999-99-99');
}

export async function insertMealEntries(db: SQLiteDatabase, entries: Omit<MealEntry, 'id'>[]): Promise<void> {
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    for (const e of entries) {
      await db.runAsync(
        `INSERT INTO meal_entries (id, date, meal, kind, label, food_id, grams, kcal, protein, carbs, fat, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        newId(), e.date, e.meal, e.kind, e.label, e.foodId, e.grams, e.kcal, e.protein, e.carbs, e.fat, now,
      );
    }
  });
}

export async function deleteMealEntry(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM meal_entries WHERE id = ?', id);
}

export async function deleteOilEntries(db: SQLiteDatabase, date: string, meal: MealType): Promise<void> {
  await db.runAsync("DELETE FROM meal_entries WHERE date = ? AND meal = ? AND kind = 'oil'", date, meal);
}

// ---- Favoritas ----

export async function listFavorites(db: SQLiteDatabase): Promise<FavoriteMeal[]> {
  const rows = await db.getAllAsync<{ id: string; name: string; data: string }>('SELECT * FROM favorite_meals ORDER BY name');
  return rows.map((r) => {
    const d = JSON.parse(r.data) as { items: FavoriteMeal['items']; oilSpoons: number };
    return { id: r.id, name: r.name, items: d.items ?? [], oilSpoons: d.oilSpoons ?? 0 };
  });
}

export async function saveFavorite(db: SQLiteDatabase, f: FavoriteMeal): Promise<void> {
  await db.runAsync(
    'INSERT OR REPLACE INTO favorite_meals (id, name, data) VALUES (?, ?, ?)',
    f.id, f.name, JSON.stringify({ items: f.items, oilSpoons: f.oilSpoons }),
  );
}

export async function deleteFavorite(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM favorite_meals WHERE id = ?', id);
}

// ---- Peso e medidas ----

export async function listWeights(db: SQLiteDatabase): Promise<WeightEntry[]> {
  return db.getAllAsync<WeightEntry>('SELECT date, kg, note FROM body_weights ORDER BY date DESC');
}

export async function saveWeight(db: SQLiteDatabase, w: WeightEntry): Promise<void> {
  await db.runAsync('INSERT OR REPLACE INTO body_weights (date, kg, note) VALUES (?, ?, ?)', w.date, w.kg, w.note);
}

export async function deleteWeight(db: SQLiteDatabase, date: string): Promise<void> {
  await db.runAsync('DELETE FROM body_weights WHERE date = ?', date);
}

export async function listMeasurements(db: SQLiteDatabase): Promise<Measurement[]> {
  const rows = await db.getAllAsync<{ date: string; arm_cm: number | null; thigh_cm: number | null; waist_cm: number | null }>(
    'SELECT * FROM measurements ORDER BY date DESC',
  );
  return rows.map((r) => ({ date: r.date, armCm: r.arm_cm, thighCm: r.thigh_cm, waistCm: r.waist_cm }));
}

export async function saveMeasurement(db: SQLiteDatabase, m: Measurement): Promise<void> {
  await db.runAsync(
    'INSERT OR REPLACE INTO measurements (date, arm_cm, thigh_cm, waist_cm) VALUES (?, ?, ?, ?)',
    m.date, m.armCm, m.thighCm, m.waistCm,
  );
}
