// Catálogo de exercícios pré-cadastrados (fitapp.catalog/v1), gerado por tools/import_catalog.py
// a partir do exercices.csv do projeto hevy-ia. Funções puras de busca e conversão.

import { slugify } from './text';
import type { Exercise } from './types';

export interface CatalogExercise {
  /** slug do nome em português */
  id: string;
  name: string;
  /** nome original (inglês), também entra na busca */
  nameEn: string;
  equipment: string;
  muscle: string;
  secondary: string[];
  /** link da imagem (jpg), hospedada fora do app (precisa de internet na primeira vez) */
  image: string | null;
}

export interface Catalog {
  format: 'fitapp.catalog/v1';
  exercises: CatalogExercise[];
}

export const MUSCLE_LABEL: Record<string, string> = {
  chest: 'Peito',
  'upper-back': 'Costas (alta)',
  lats: 'Dorsais',
  'lower-back': 'Lombar',
  shoulders: 'Ombros',
  traps: 'Trapézio',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  forearms: 'Antebraço',
  quadriceps: 'Quadríceps',
  hamstrings: 'Posteriores',
  glutes: 'Glúteos',
  calves: 'Panturrilha',
  abductors: 'Abdutores',
  adductors: 'Adutores',
  abdominals: 'Abdômen',
  neck: 'Pescoço',
  'full-body': 'Corpo todo',
  cardio: 'Cardio',
  other: 'Outros',
};

/** Ordem dos filtros: os grupos mais usados primeiro. */
export const MUSCLE_ORDER: readonly string[] = Object.keys(MUSCLE_LABEL);

export const EQUIPMENT_LABEL: Record<string, string> = {
  barbell: 'Barra',
  dumbbell: 'Halter',
  machine: 'Máquina / polia',
  kettlebell: 'Kettlebell',
  'resistance-band': 'Elástico',
  suspension: 'Suspensão',
  plate: 'Anilha',
  other: 'Outro',
  none: 'Peso corporal',
};

function normalize(text: string): string {
  return slugify(text, '-').replace(/-/g, ' ');
}

/**
 * Busca por nome (português ou inglês). Todas as palavras digitadas precisam aparecer; quem começa
 * com a busca vem primeiro. `muscle` filtra pelo grupo principal. Sem busca, devolve a lista na ordem.
 */
export function searchCatalog(list: readonly CatalogExercise[], query: string, muscle: string | null = null): CatalogExercise[] {
  const words = normalize(query).split(' ').filter(Boolean);
  const matches = list.filter((e) => {
    if (muscle && e.muscle !== muscle) return false;
    const haystack = `${normalize(e.name)} ${normalize(e.nameEn)}`;
    return words.every((w) => haystack.includes(w));
  });
  if (!words.length) return matches;
  const first = words[0];
  const starts = (e: CatalogExercise) => (normalize(e.name).startsWith(first) ? 0 : 1);
  return [...matches].sort((a, b) => starts(a) - starts(b));
}

/** Item do catálogo de um exercício do ciclo (mesmo id ou mesmo nome), para mostrar a imagem e o grupo muscular. */
export function findCatalogExercise(list: readonly CatalogExercise[], exercise: Pick<Exercise, 'id' | 'name'>): CatalogExercise | null {
  const s = slugify(exercise.name);
  return list.find((e) => e.id === exercise.id || e.id === s) ?? null;
}

/** "Peito · Barra" */
export function catalogSubtitle(e: Pick<CatalogExercise, 'muscle' | 'equipment'>): string {
  return `${MUSCLE_LABEL[e.muscle] ?? e.muscle} · ${EQUIPMENT_LABEL[e.equipment] ?? e.equipment}`;
}

/** Exercício do ciclo que já tem esse nome (igualdade exata do nome ou do slug), para não duplicar. */
export function findCycleExercise(exercises: readonly Exercise[], name: string): Exercise | null {
  const s = slugify(name);
  return exercises.find((e) => e.id === s || slugify(e.name) === s) ?? null;
}

/** Exercício do ciclo para o item do catálogo: reaproveita o que já existe, senão cria (sem movimento). */
export function exerciseFromCatalog(exercises: readonly Exercise[], c: CatalogExercise): Exercise {
  return findCycleExercise(exercises, c.name) ?? { id: c.id, name: c.name, lift: null, category: c.muscle === 'abdominals' ? 'core' : 'accessory' };
}

/** Exercício digitado à mão (fora do catálogo). */
export function exerciseFromName(exercises: readonly Exercise[], name: string): Exercise {
  const clean = name.trim();
  return findCycleExercise(exercises, clean) ?? { id: slugify(clean), name: clean, lift: null, category: 'accessory' };
}
