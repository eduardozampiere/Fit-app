import { describe, expect, it } from 'vitest';
import cycleJson from '../../../assets/plan/ciclo_out26_jan27.json';
import { applyAdjustments, patchItem, validateAdjustments, validateCycle } from '../adjustments';
import { flattenSets, nutritionDays } from '../analytics';
import { parseCsv, parseCsvObjects, toCsv } from '../csv';
import { checkinsCsv, weightsCsv, workoutsCsv } from '../exporters';
import {
  detectCsvKind,
  mealTypeOf,
  parseHevy,
  parseOldCheckins,
  parseOldMeals,
  parseOldWeights,
  parseOldWorkouts,
  planWorkoutImport,
  suggestMapping,
} from '../importers';
import { DEFAULT_TARGETS } from '../nutrition';
import { extractNumber, parseDateLoose, parseLoadText, parseNumberLoose, parseRpeText, parseSetsText } from '../parsing';
import { buildCoachReport } from '../report';
import { NO_RED_FLAGS } from '../rules';
import type { Cycle } from '../types';

const cycle = cycleJson as unknown as Cycle;

describe('CSV', () => {
  it('aspas, vírgula dentro de campo, CRLF e BOM', () => {
    const rows = parseCsv('﻿a,b,c\r\n1,"x, y",3\r\n"aspas ""duplas""",,\r\n');
    expect(rows).toEqual([
      ['a', 'b', 'c'],
      ['1', 'x, y', '3'],
      ['aspas "duplas"', '', ''],
    ]);
  });

  it('separador ; e cabeçalho normalizado', () => {
    const { header, rows } = parseCsvObjects('Data;Peso (kg);Obs\n03/11/2026;108,4;manhã\n');
    expect(header).toEqual(['data', 'peso_kg', 'obs']);
    expect(rows[0].peso_kg).toBe('108,4');
  });

  it('ida e volta', () => {
    const csv = toCsv(['a', 'b'], [['1', 'x, "y"']]);
    expect(parseCsv(csv)).toEqual([
      ['a', 'b'],
      ['1', 'x, "y"'],
    ]);
  });
});

describe('interpretação de textos', () => {
  it('séries × reps, carga e RPE (igual ao importador Python)', () => {
    expect(parseSetsText('2-3x12-15')).toMatchObject({ sets: { min: 2, max: 3 }, reps: { min: 12, max: 15 } });
    expect(parseSetsText('1x (5-8s)').durationSec).toEqual({ min: 5, max: 8 });
    expect(parseLoadText('205-210')).toMatchObject({ load: { min: 205, max: 210 }, loadMode: 'fixed' });
    expect(parseLoadText('100+').loadMode).toBe('progressive');
    expect(parseRpeText('≤7.5')).toEqual({ min: null, max: 7.5 });
  });

  it('números e datas soltos', () => {
    expect(parseNumberLoose('7,5')).toBe(7.5);
    expect(parseNumberLoose('1.234,5')).toBe(1234.5);
    expect(parseNumberLoose('142.5')).toBe(142.5);
    expect(parseNumberLoose('')).toBeNull();
    expect(extractNumber('dor 3/10')).toBe(3);
    expect(parseDateLoose('26 Oct 2026, 18:30')).toBe('2026-10-26');
    expect(parseDateLoose('2026-10-26T18:30:00Z')).toBe('2026-10-26');
    expect(parseDateLoose('03/11/2026')).toBe('2026-11-03');
    expect(parseDateLoose('3/1/27')).toBe('2027-01-03');
    expect(parseDateLoose('Oct 26, 2026')).toBe('2026-10-26');
  });
});

const HEVY = `"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"
"Agacho pesado","27 Oct 2026, 18:05","27 Oct 2026, 19:40","","Squat (Barbell)",,"",0,"warmup",60,5,,,
"Agacho pesado","27 Oct 2026, 18:05","27 Oct 2026, 19:40","","Squat (Barbell)",,"",1,"normal",140,4,,,7
"Agacho pesado","27 Oct 2026, 18:05","27 Oct 2026, 19:40","","Squat (Barbell)",,"boa",2,"normal",140,4,,,7.5
"Agacho pesado","27 Oct 2026, 18:05","27 Oct 2026, 19:40","","Lying Leg Curl (Machine)",,"",0,"normal",50,12,,,
`;

describe('Hevy', () => {
  it('detecta colunas, ignora aquecimento e lê RPE', () => {
    expect(detectCsvKind(HEVY)).toBe('hevy');
    const r = parseHevy(HEVY);
    expect(r.missingColumns).toEqual([]);
    expect(r.skipped).toBe(1);
    expect(r.items).toHaveLength(3);
    expect(r.items[0]).toMatchObject({ date: '2026-10-27', exerciseName: 'Squat (Barbell)', setIndex: 2, loadKg: 140, reps: 4, rpe: 7 });
  });

  it('avisa colunas faltando', () => {
    expect(parseHevy('title,foo\nx,y\n').missingColumns).toContain('exercise_title');
  });

  it('mapeia para o plano e não duplica', () => {
    const r = parseHevy(HEVY);
    const mapping = {
      'Squat (Barbell)': { type: 'exercise' as const, exerciseId: 'agachamento-high-bar' },
      'Lying Leg Curl (Machine)': { type: 'new' as const },
    };
    // 27/10 é terça (S1): sessão de supino, que tem "Agachamento pausa", não high bar → treino avulso
    const plan = planWorkoutImport(r.items, mapping, cycle, new Set(), new Set());
    expect(plan.sessions).toHaveLength(1);
    expect(plan.sessions[0].sessionId).toBe('extra:2026-10-27:agacho-pesado');
    expect(plan.newExercises.map((e) => e.id)).toEqual(['lying-leg-curl-machine']);

    const again = planWorkoutImport(r.items, mapping, cycle, new Set(r.items.map((i) => i.sourceKey)), new Set());
    expect(again.sessions).toHaveLength(0);
    expect(again.duplicates).toBe(3);
  });

  it('liga ao treino do plano quando a data e o exercício batem', () => {
    const items = parseHevy(HEVY.replace(/27 Oct 2026/g, '26 Oct 2026')).items; // segunda S1: agacho high bar
    const plan = planWorkoutImport(items, { 'Squat (Barbell)': { type: 'exercise', exerciseId: 'agachamento-high-bar' }, 'Lying Leg Curl (Machine)': { type: 'ignore' } }, cycle, new Set(), new Set());
    expect(plan.sessions[0].sessionId).toBe('w1-d1');
    expect(plan.sessions[0].sets[0].itemId).toBe('w1-d1-2');
    expect(plan.ignored).toBe(1);
    // já registrado no app → vira avulso para não misturar
    const p2 = planWorkoutImport(items, { 'Squat (Barbell)': { type: 'exercise', exerciseId: 'agachamento-high-bar' } }, cycle, new Set(), new Set(['w1-d1']));
    expect(p2.sessions[0].sessionId.startsWith('extra:')).toBe(true);
  });

  it('sugestão de mapeamento: lembrada > igual > contida', () => {
    const cat = cycle.exercises;
    expect(suggestMapping('Agachamento (High Bar)', cat, {})).toEqual({ type: 'exercise', exerciseId: 'agachamento-high-bar' });
    expect(suggestMapping('Squat (Barbell)', cat, {})).toEqual({ type: 'new' });
    expect(suggestMapping('Squat (Barbell)', cat, { 'Squat (Barbell)': { type: 'ignore' } })).toEqual({ type: 'ignore' });
  });
});

describe('CSVs do diário antigo', () => {
  it('treinos.csv expande séries e põe o RPE na última', () => {
    const text = 'data,ciclo,bloco,semana,sessao,exercicio,principal,series_reps,carga_kg,rpe,pegada,obs\n2026-09-01,Ago,Volume,3,Seg,Agachamento (High Bar),sim,4x5,130,7.5,,ok\n';
    expect(detectCsvKind(text)).toBe('treinos');
    const r = parseOldWorkouts(text);
    expect(r.items).toHaveLength(4);
    expect(r.items.map((i) => i.rpe)).toEqual([null, null, null, 7.5]);
    expect(r.items[3]).toMatchObject({ loadKg: 130, reps: 5, note: 'ok' });
  });

  it('checkin.csv extrai número e guarda texto como observação', () => {
    const text = 'data,lombar,joelho,punho,pe,sono_h,obs\n02/09/2026,2,"leve, 1",0,sem dor,7h,\n';
    const r = parseOldCheckins(text);
    expect(r.items[0]).toMatchObject({ date: '2026-09-02', lowBack: 2, knee: 1, wrist: 0, foot: null, sleepH: 7 });
    expect(r.items[0].note).toContain('joelho: leve, 1');
    expect(r.items[0].note).toContain('pé: sem dor');
  });

  it('refeicoes.csv vira registro com macros fixos', () => {
    const text = 'data,tipo_dia,refeicao,alimentos,kcal,proteina_g,carbo_g,gordura_g\n2026-09-02,treino,Pós-treino,whey + banana,250,30,30,2\n';
    const r = parseOldMeals(text);
    expect(r.items[0]).toMatchObject({ meal: 'pos_treino', kind: 'custom', label: 'whey + banana', kcal: 250, protein: 30 });
    expect(mealTypeOf('Almoço')).toBe('almoco');
    expect(mealTypeOf('Café da manhã')).toBe('lanche');
  });

  it('peso.csv', () => {
    const r = parseOldWeights('data,peso_kg,obs\n2026-09-02,108.4,\n2026-09-03,,\n');
    expect(r.items).toEqual([{ date: '2026-09-02', kg: 108.4, note: null }]);
    expect(r.skipped).toBe(1);
  });
});

describe('ajustes do Claude', () => {
  const adj = {
    format: 'fitapp.adjustments/v1',
    cycleId: cycle.id,
    operations: [
      { op: 'set_load', week: 3, lift: 'squat', loadKg: 145 },
      { op: 'edit_item', itemId: 'w3-d1-4', patch: { name: 'Remada cavalinho', setsText: '4x10-12' } },
      { op: 'add_item', sessionId: 'w3-d4', item: { name: 'Face pull', setsText: '3x15-20', rest: '1 min' } },
      { op: 'remove_item', itemId: 'w3-d1-6' },
      { op: 'add_note', week: 3, text: 'Semana leve de cardio' },
      { op: 'set_max', lift: 'bench', kg: 175 },
    ],
  };

  it('valida e descreve', () => {
    const v = validateAdjustments(adj, cycle);
    expect(v.errors).toEqual([]);
    expect(v.preview).toHaveLength(6);
    expect(v.preview[0]).toBe('S3: agacho principal com 145 kg');
  });

  it('rejeita ids, semanas e formatos errados', () => {
    const v = validateAdjustments({ ...adj, operations: [{ op: 'edit_item', itemId: 'nao-existe', patch: {} }, { op: 'set_load', week: 99, lift: 'x', loadKg: 0 }, { op: 'voar' }] }, cycle);
    expect(v.ok).toBe(false);
    expect(v.errors.length).toBeGreaterThanOrEqual(4);
    expect(validateAdjustments({ format: 'x', operations: [] }, cycle).ok).toBe(false);
  });

  it('aplica em ordem e devolve os máximos', () => {
    const { cycle: c, maxes } = applyAdjustments(cycle, cycle.maxes, validateAdjustments(adj, cycle).adjustments!.operations);
    const w3 = c.weeks.find((w) => w.number === 3)!;
    const mon = w3.sessions.find((s) => s.weekday === 1)!;
    expect(mon.items.find((i) => i.kind === 'main')!.load).toEqual({ min: 145, max: 145 });
    expect(mon.items.find((i) => i.id === 'w3-d1-4')).toMatchObject({ name: 'Remada cavalinho', sets: { min: 4, max: 4 }, reps: { min: 10, max: 12 } });
    expect(mon.items.some((i) => i.id === 'w3-d1-6')).toBe(false);
    const thu = w3.sessions.find((s) => s.weekday === 4)!;
    expect(thu.items[thu.items.length - 1]).toMatchObject({ name: 'Face pull', restSec: { min: 60, max: 60 }, kind: 'accessory' });
    expect(c.exercises.some((e) => e.id === 'face-pull')).toBe(true);
    expect(w3.notes).toContain('Semana leve de cardio');
    expect(maxes.bench).toBe(175);
  });

  it('patchItem reinterpreta textos e tira o vínculo com %', () => {
    const it = cycle.weeks[0].sessions[0].items[1];
    const p = patchItem(it, { load: '150', rpe: '7-7.5', rest: '4 min' });
    expect(p).toMatchObject({ load: { min: 150, max: 150 }, pctBased: false, rpe: { min: 7, max: 7.5 }, restSec: { min: 240, max: 240 } });
  });

  it('valida ciclo completo', () => {
    expect(validateCycle(cycle).ok).toBe(true);
    expect(validateCycle({ ...cycle, format: 'x' }).ok).toBe(false);
    const broken = { ...cycle, weeks: [{ ...cycle.weeks[0], sessions: [cycle.weeks[0].sessions[0], cycle.weeks[0].sessions[0]] }] };
    expect(validateCycle(broken).errors.join(' ')).toMatch(/repetido/);
  });
});

describe('pacote para o Claude e exportação', () => {
  const s = cycle.weeks[1].sessions[0];
  const logged = [
    {
      log: { id: 'L1', cycleId: cycle.id, week: 2, sessionId: s.id, date: '2026-11-03', status: 'done' as const, note: null },
      sets: [1, 2, 3, 4, 5].map((i) => ({
        id: `s${i}`, sessionLogId: 'L1', itemId: s.items[1].id, exerciseId: s.items[1].exerciseId, setIndex: i,
        loadKg: 145, reps: 4, durationSec: null, rpe: i === 5 ? 8 : null, grip: null, belt: null, failed: false, asPlanned: true, warmup: false, setType: 'normal' as const, note: null, doneAt: '',
      })),
    },
  ];
  const rows = flattenSets(cycle, logged, new Map());
  const checkins = [{ date: '2026-11-03', lowBack: 2, knee: 1, wrist: 0, foot: 0, sleepH: 6.5, redFlags: NO_RED_FLAGS, note: 'ok' }];
  const report = buildCoachReport({
    cycle,
    maxes: cycle.maxes,
    rows,
    checkins,
    alerts: [{ key: 'brake:2:squat', rule: 'brake', week: 2, severity: 'warn', title: 'Freio: repetir agacho 145', message: 'm' }],
    decisions: new Map([['brake:2:squat', 'accepted']]),
    weights: [{ date: '2026-11-03', kg: 108.2, note: null }],
    nutrition: nutritionDays(
      [{ id: 'e', date: '2026-11-03', meal: 'almoco', kind: 'custom', label: 'x', foodId: null, grams: null, kcal: 2500, protein: 190, carbs: 0, fat: 0 }],
      cycle,
      DEFAULT_TARGETS,
    ),
    from: '2026-11-02',
    to: '2026-11-08',
    today: '2026-11-03',
  });

  it('relatório tem planejado × feito com ids, check-in, alertas e instruções', () => {
    expect(report).toContain('## Semana 2 — Volume');
    expect(report).toContain(`| \`${s.items[1].id}\` | Agachamento (High Bar) | 5x4 · 145 kg · RPE 7 | 145×4, 145×4, 145×4, 145×4, 145×4 @8 |`);
    expect(report).toContain('feito em 03/11');
    expect(report).toContain('[aceito] S2 · Freio: repetir agacho 145');
    expect(report).toContain('Check-in do dia: lombar 2');
    expect(report).toContain('fitapp.adjustments/v1');
    expect(report).toContain('e1RM agacho: 173,2 kg'); // 145 x4 @8 → 145 / 0,837
  });

  it('exporta CSVs', () => {
    const csv = workoutsCsv(rows);
    expect(csv.split('\n')[0]).toBe('data,ciclo,bloco,semana,sessao,exercicio,tipo,serie,carga_kg,reps,rpe,falha,pegada,cinto,obs');
    expect(csv.split('\n')).toHaveLength(7);
    expect(checkinsCsv(checkins)).toContain('2026-11-03,2,1,0,0,6.5,,ok');
    expect(weightsCsv([{ date: '2026-11-03', kg: 108.2, note: null }])).toBe('data,peso_kg,obs\n2026-11-03,108.2,\n');
  });
});

describe('extrair JSON da resposta do Claude', () => {
  it('aceita bloco ```json com texto em volta', async () => {
    const { extractJson } = await import('../adjustments');
    expect(extractJson('Aqui vai:\n```json\n{"format":"fitapp.adjustments/v1","operations":[]}\n```\nAbraço')).toEqual({
      format: 'fitapp.adjustments/v1',
      operations: [],
    });
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
    expect(() => extractJson('sem json')).toThrow();
  });
});
