// Alimentação: banco de alimentos por 100 g, refeições, óleo de preparo e totais do dia.

export interface Food {
  id: string;
  name: string;
  kcal: number; // por 100 g
  protein: number;
  carbs: number;
  fat: number;
}

export type MealType = 'almoco' | 'pre_treino' | 'pos_treino' | 'jantar' | 'lanche';

export const MEALS: { id: MealType; label: string }[] = [
  { id: 'almoco', label: 'Almoço' },
  { id: 'pre_treino', label: 'Pré-treino' },
  { id: 'pos_treino', label: 'Pós-treino' },
  { id: 'jantar', label: 'Jantar' },
  { id: 'lanche', label: 'Lanche' },
];

export const MEAL_LABEL: Record<MealType, string> = Object.fromEntries(MEALS.map((m) => [m.id, m.label])) as Record<
  MealType,
  string
>;

export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** Registro de uma refeição. Os macros ficam gravados (snapshot): editar o alimento não muda o passado. */
export interface MealEntry extends Macros {
  id: string;
  date: string;
  meal: MealType;
  kind: 'food' | 'oil' | 'custom';
  label: string;
  foodId: string | null;
  grams: number | null;
}

export interface FavoriteMeal {
  id: string;
  name: string;
  items: { foodId: string; grams: number }[];
  oilSpoons: number;
}

export interface NutritionTargets {
  trainingKcal: number;
  restKcal: number;
  protein: number;
  oilKcalPerSpoon: number;
}

export const DEFAULT_TARGETS: NutritionTargets = { trainingKcal: 2600, restKcal: 2200, protein: 200, oilKcalPerSpoon: 90 };

/**
 * Alimentos iniciais (por 100 g). Valores aproximados de tabelas de composição (TACO/USDA)
 * e de rótulos típicos; todos editáveis no app.
 */
export const DEFAULT_FOODS: Food[] = [
  { id: 'arroz-branco-cozido', name: 'Arroz branco cozido', kcal: 128, protein: 2.5, carbs: 28.1, fat: 0.2 },
  { id: 'frango-peito-grelhado', name: 'Frango grelhado (peito)', kcal: 159, protein: 32, carbs: 0, fat: 2.5 },
  { id: 'macarrao-cozido', name: 'Macarrão cozido', kcal: 158, protein: 5.8, carbs: 30.9, fat: 0.9 },
  { id: 'molho-tomate-pronto', name: 'Molho de tomate pronto', kcal: 40, protein: 1.4, carbs: 7.6, fat: 0.6 },
  { id: 'leite-desnatado', name: 'Leite desnatado', kcal: 35, protein: 3.4, carbs: 4.9, fat: 0.2 },
  { id: 'whey', name: 'Whey', kcal: 400, protein: 80, carbs: 8, fat: 6 },
  { id: 'margarina', name: 'Margarina', kcal: 596, protein: 0, carbs: 0, fat: 67.4 },
  { id: 'ovo', name: 'Ovo', kcal: 146, protein: 13.3, carbs: 0.6, fat: 9.5 },
  { id: 'banana', name: 'Banana', kcal: 98, protein: 1.3, carbs: 26, fat: 0.1 },
  { id: 'aveia', name: 'Aveia', kcal: 394, protein: 13.9, carbs: 66.6, fat: 8.5 },
  { id: 'iogurte-natural', name: 'Iogurte natural', kcal: 51, protein: 4.1, carbs: 1.9, fat: 3 },
  { id: 'azeite', name: 'Azeite', kcal: 884, protein: 0, carbs: 0, fat: 100 },
  { id: 'pao-frances', name: 'Pão francês', kcal: 300, protein: 8, carbs: 58.6, fat: 3.1 },
];

export const DEFAULT_FAVORITES: FavoriteMeal[] = [
  {
    id: 'almoco-padrao',
    name: 'Almoço padrão',
    items: [
      { foodId: 'arroz-branco-cozido', grams: 400 },
      { foodId: 'frango-peito-grelhado', grams: 200 },
    ],
    oilSpoons: 1,
  },
];

const r1 = (n: number) => Math.round(n * 10) / 10;

export function macrosFor(food: Food, grams: number): Macros {
  const f = grams / 100;
  return { kcal: Math.round(food.kcal * f), protein: r1(food.protein * f), carbs: r1(food.carbs * f), fat: r1(food.fat * f) };
}

/** Óleo de preparo: estimativa fixa por colher (tudo gordura). */
export function oilMacros(spoons: number, kcalPerSpoon: number): Macros {
  const kcal = Math.round(spoons * kcalPerSpoon);
  return { kcal, protein: 0, carbs: 0, fat: r1(kcal / 9) };
}

export function sumMacros(items: Macros[]): Macros {
  const t = items.reduce(
    (a, b) => ({ kcal: a.kcal + b.kcal, protein: a.protein + b.protein, carbs: a.carbs + b.carbs, fat: a.fat + b.fat }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
  return { kcal: Math.round(t.kcal), protein: r1(t.protein), carbs: r1(t.carbs), fat: r1(t.fat) };
}

export function kcalTarget(targets: NutritionTargets, isTrainingDay: boolean): number {
  return isTrainingDay ? targets.trainingKcal : targets.restKcal;
}

/** Entradas de uma refeição favorita (sem id/data). */
export function favoriteEntries(
  fav: FavoriteMeal,
  foods: Food[],
  meal: MealType,
  date: string,
  kcalPerSpoon: number,
): Omit<MealEntry, 'id'>[] {
  const byId = new Map(foods.map((f) => [f.id, f]));
  const out: Omit<MealEntry, 'id'>[] = [];
  for (const it of fav.items) {
    const food = byId.get(it.foodId);
    if (!food) continue;
    out.push({ date, meal, kind: 'food', label: food.name, foodId: food.id, grams: it.grams, ...macrosFor(food, it.grams) });
  }
  if (fav.oilSpoons > 0) out.push(oilEntry(date, meal, fav.oilSpoons, kcalPerSpoon));
  return out;
}

export function oilEntry(date: string, meal: MealType, spoons: number, kcalPerSpoon: number): Omit<MealEntry, 'id'> {
  return {
    date,
    meal,
    kind: 'oil',
    label: `Óleo de preparo (${spoons} colher${spoons === 1 ? '' : 'es'})`,
    foodId: null,
    grams: spoons,
    ...oilMacros(spoons, kcalPerSpoon),
  };
}
