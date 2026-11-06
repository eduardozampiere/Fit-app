import { describe, expect, it } from 'vitest';
import { formatRestDuration, formatWorkoutTime } from '../format';
import catalogJson from '../../../assets/catalog/exercicios.json';
import cycleJson from '../../../assets/plan/ciclo_out26_jan27.json';
import { NEW_ITEM_SETS, addExerciseToSession, swapExercise, validateAdjustments } from '../adjustments';
import {
  EQUIPMENT_LABEL,
  MUSCLE_LABEL,
  catalogSubtitle,
  exerciseFromCatalog,
  exerciseFromName,
  findCatalogExercise,
  findCycleExercise,
  searchCatalog,
  type Catalog,
} from '../catalog';
import {
  REST_MAX_SEC,
  REST_MIN_SEC,
  liftOf,
  nearestRestIndex,
  restChoices,
  restOverride,
  restSeconds,
  sessionItems,
  withRestOverride,
} from '../plan';
import type { Cycle, PrescribedItem } from '../types';

const catalog = catalogJson as unknown as Catalog;
const cycle = cycleJson as unknown as Cycle;
const find = (c: Cycle, id: string): PrescribedItem | undefined =>
  c.weeks.flatMap((w) => [...w.sessions.flatMap((s) => s.items), ...(w.core?.items ?? [])]).find((i) => i.id === id);

describe('catálogo', () => {
  it('ids únicos e todo grupo/equipamento tem rótulo em português', () => {
    const ids = catalog.exercises.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThan(400);
    for (const e of catalog.exercises) {
      expect(MUSCLE_LABEL[e.muscle], e.name).toBeTruthy();
      expect(EQUIPMENT_LABEL[e.equipment], e.name).toBeTruthy();
      e.secondary.forEach((m) => expect(MUSCLE_LABEL[m]).toBeTruthy());
    }
  });

  it('busca sem acento, em português ou inglês, com todas as palavras', () => {
    const names = (q: string, m: string | null = null) => searchCatalog(catalog.exercises, q, m).map((e) => e.name);
    expect(names('puxada alta')).toContain('Puxada alta (Polia)');
    expect(names('PUXADA')).toEqual(names('puxada'));
    expect(names('lat pulldown')).toContain('Puxada alta (Polia)');
    expect(names('desenvolvimento halter').every((n) => n.includes('Halter'))).toBe(true);
    expect(names('xyz-nada')).toEqual([]);
  });

  it('quem começa com a busca vem primeiro; filtro por grupo muscular', () => {
    const r = searchCatalog(catalog.exercises, 'supino').map((e) => e.name);
    expect(r[0].toLowerCase().startsWith('supino')).toBe(true);
    const chest = searchCatalog(catalog.exercises, '', 'chest');
    expect(chest.length).toBeGreaterThan(20);
    expect(chest.every((e) => e.muscle === 'chest')).toBe(true);
    expect(searchCatalog(catalog.exercises, '').length).toBe(catalog.exercises.length);
  });

  it('subtítulo com grupo e equipamento', () => {
    const e = catalog.exercises.find((x) => x.name === 'Supino reto (Barra)')!;
    expect(catalogSubtitle(e)).toBe('Peito · Barra');
  });

  it('imagem: link https de um jpg, ou nenhuma (vídeo não entra)', () => {
    const withImage = catalog.exercises.filter((e) => e.image);
    expect(withImage.length).toBeGreaterThan(100);
    for (const e of withImage) {
      expect(e.image!.startsWith('https://')).toBe(true);
      expect(e.image!.endsWith('.jpg')).toBe(true);
    }
  });

  it('acha o item do catálogo de um exercício do ciclo pelo id ou pelo nome', () => {
    const bench = catalog.exercises.find((e) => e.name === 'Supino reto (Barra)')!;
    expect(findCatalogExercise(catalog.exercises, { id: bench.id, name: 'qualquer' })).toBe(bench);
    expect(findCatalogExercise(catalog.exercises, { id: 'x', name: 'Supino reto (Barra)' })).toBe(bench);
    expect(findCatalogExercise(catalog.exercises, { id: 'puxada-aberta', name: 'Puxada aberta' })).toBeNull();
  });

  it('reaproveita o exercício do ciclo de mesmo nome; senão cria sem movimento', () => {
    expect(findCycleExercise(cycle.exercises, 'puxada ABERTA')?.id).toBe('puxada-aberta');
    expect(findCycleExercise(cycle.exercises, 'Puxada')).toBeNull();
    const own = { id: 'x', name: 'Elevação lateral', muscle: 'shoulders', equipment: 'dumbbell', nameEn: '', secondary: [], image: null };
    expect(exerciseFromCatalog(cycle.exercises, own).id).toBe('elevacao-lateral');
    const abs = catalog.exercises.find((e) => e.muscle === 'abdominals')!;
    expect(exerciseFromCatalog(cycle.exercises, abs)).toMatchObject({ id: abs.id, lift: null, category: 'core' });
    expect(exerciseFromName(cycle.exercises, '  Remada na argola ')).toMatchObject({ id: 'remada-na-argola', name: 'Remada na argola', lift: null });
  });
});

describe('descanso editável', () => {
  it('o ajuste manda; sem ele vale o plano e o padrão do tipo', () => {
    expect(restSeconds({ restSec: { min: 180, max: 240 }, kind: 'variation' }, 150)).toBe(150);
    expect(restSeconds({ restSec: { min: 180, max: 240 }, kind: 'variation' }, null)).toBe(240);
    expect(restSeconds({ restSec: null, kind: 'accessory' }, undefined)).toBe(90);
  });

  it('guarda, limita e remove o ajuste por exercício', () => {
    const a = withRestOverride({}, 'rosca', 150);
    expect(a).toEqual({ rosca: 150 });
    expect(restOverride(a, 'rosca')).toBe(150);
    expect(restOverride(a, 'outro')).toBeNull();
    expect(withRestOverride(a, 'rosca', 5).rosca).toBe(REST_MIN_SEC);
    expect(withRestOverride(a, 'rosca', 99999).rosca).toBe(REST_MAX_SEC);
    expect(withRestOverride(a, 'rosca', null)).toEqual({});
    expect(restOverride({ x: 3 }, 'x')).toBeNull();
  });

  it('roda de tempos: de 15 s a 15 min, de 15 em 15, e acha o mais próximo', () => {
    const c = restChoices();
    expect(c[0]).toBe(REST_MIN_SEC);
    expect(c[c.length - 1]).toBe(REST_MAX_SEC);
    expect(c).toHaveLength(60);
    expect(c[nearestRestIndex(240)]).toBe(240);
    expect(c[nearestRestIndex(137)]).toBe(135);
    expect(nearestRestIndex(0)).toBe(0);
    expect(nearestRestIndex(99999)).toBe(59);
  });

  it('formata o tempo como o Hevy', () => {
    expect(formatRestDuration(240)).toBe('4min 0s');
    expect(formatRestDuration(90)).toBe('1min 30s');
    expect(formatRestDuration(45)).toBe('45s');
    expect(formatWorkoutTime(373)).toBe('6min 13s');
    expect(formatWorkoutTime(75 * 60)).toBe('1h 15min');
  });
});

describe('adicionar exercício ao treino', () => {
  const row = catalog.exercises.find((e) => e.name === 'Remada curvada (Barra)')!;
  const ex = exerciseFromCatalog(cycle.exercises, row);

  it('entra no fim da sessão, só naquele dia, com 3 séries e o exercício cadastrado', () => {
    const before = cycle.weeks[1].sessions[1].items.length;
    const out = addExerciseToSession(cycle, 'w2-d2', ex);
    expect(out.itemId).toBeTruthy();
    const items = out.cycle.weeks[1].sessions[1].items;
    expect(items).toHaveLength(before + 1);
    expect(items[items.length - 1]).toMatchObject({ id: out.itemId, name: ex.name, exerciseId: ex.id, setsText: NEW_ITEM_SETS, kind: 'accessory' });
    expect(out.cycle.weeks[2].sessions[1].items).toHaveLength(cycle.weeks[2].sessions[1].items.length);
    expect(out.cycle.exercises.filter((e) => e.id === ex.id)).toHaveLength(1);
    expect(cycle.weeks[1].sessions[1].items).toHaveLength(before); // imutável
  });

  it('exercício que o ciclo já tem não duplica; abdominal vira core; sessão inexistente não muda nada', () => {
    const known = cycle.exercises.find((e) => e.id === 'puxada-aberta')!;
    expect(addExerciseToSession(cycle, 'w2-d2', known).cycle.exercises).toHaveLength(cycle.exercises.length);
    const abs = exerciseFromCatalog(cycle.exercises, catalog.exercises.find((e) => e.muscle === 'abdominals')!);
    const out = addExerciseToSession(cycle, 'w2-d2', abs);
    expect(find(out.cycle, out.itemId!)).toMatchObject({ kind: 'core' });
    expect(out.cycle.exercises.find((e) => e.id === abs.id)?.category).toBe('core');
    expect(addExerciseToSession(cycle, 'nada', ex)).toEqual({ cycle, itemId: null });
  });
});

describe('trocar exercício', () => {
  const lateral = catalog.exercises.find((e) => e.name === 'Elevação lateral (Polia)')!;
  const next = exerciseFromCatalog(cycle.exercises, lateral);

  it('só neste item: troca nome e exercício, cadastra o novo, não mexe no resto', () => {
    const before = find(cycle, 'w2-d2-5')!;
    const out = swapExercise(cycle, 'w2-d2-5', next, 'item');
    expect(out.itemIds).toEqual(['w2-d2-5']);
    const after = find(out.cycle, 'w2-d2-5')!;
    expect(after).toMatchObject({ name: 'Elevação lateral (Polia)', exerciseId: next.id, setsText: before.setsText, notes: before.notes });
    expect(find(out.cycle, 'w3-d2-5')!.exerciseId).toBe('elevacao-lateral');
    expect(out.cycle.exercises.some((e) => e.id === next.id)).toBe(true);
    expect(find(cycle, 'w2-d2-5')!.exerciseId).toBe('elevacao-lateral'); // imutável
  });

  it('daqui para frente: a semana do item e as seguintes, em todas as sessões; as anteriores ficam', () => {
    const out = swapExercise(cycle, 'w2-d2-5', next, 'forward');
    expect(out.itemIds).toContain('w2-d2-5');
    expect(out.itemIds).toContain('w2-d3-5');
    expect(out.itemIds).toContain('w3-d2-5');
    expect(out.itemIds).not.toContain('w1-d2-5');
    for (const id of out.itemIds) expect(find(out.cycle, id)!.exerciseId).toBe(next.id);
    expect(find(out.cycle, 'w1-d2-5')!.exerciseId).toBe('elevacao-lateral');
  });

  it('funciona com o core/mobilidade da semana', () => {
    const coreItem = find(cycle, 'w2-core-1')!;
    const out = swapExercise(cycle, coreItem.id, next, 'item');
    expect(find(out.cycle, coreItem.id)!.exerciseId).toBe(next.id);
    expect(sessionItems(out.cycle.weeks[1], out.cycle.weeks[1].sessions[0]).some((i) => i.exerciseId === next.id)).toBe(true);
  });

  it('trocar um dos três movimentos tira o movimento do item', () => {
    const bench = cycle.weeks[1].sessions[0].items.find((i) => liftOf(cycle, i) === 'bench')!;
    const out = swapExercise(cycle, bench.id, next, 'item');
    expect(liftOf(out.cycle, find(out.cycle, bench.id)!)).toBeNull();
  });

  it('item que não existe não muda nada', () => {
    expect(swapExercise(cycle, 'nada', next, 'item')).toEqual({ cycle, itemIds: [] });
  });

  it('o Claude pode trocar o exercício por um que já está no ciclo, e não por um desconhecido', () => {
    const ok = validateAdjustments(
      { format: 'fitapp.adjustments/v1', operations: [{ op: 'edit_item', itemId: 'w2-d2-5', patch: { exerciseId: 'puxada-aberta' } }] },
      cycle,
    );
    expect(ok.ok).toBe(true);
    const bad = validateAdjustments(
      { format: 'fitapp.adjustments/v1', operations: [{ op: 'edit_item', itemId: 'w2-d2-5', patch: { exerciseId: 'nao-existe' } }] },
      cycle,
    );
    expect(bad.ok).toBe(false);
    expect(bad.errors[0]).toContain('nao-existe');
  });
});
