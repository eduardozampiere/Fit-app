import { describe, expect, it } from 'vitest';
import type { SetRow } from '../analytics';
import { personalRecords } from '../exerciseStats';
import {
  computeRecordBook,
  countsForRecords,
  EMPTY_RECORD_BOOK,
  hitBadgeText,
  hitBeforeText,
  hitCaption,
  holderSubtitle,
  medalA11yLabel,
  normalizeRecordPrefs,
  noticeKey,
  recordBannerText,
  recordNotice,
  recordSetSubtitle,
  recordSheetTitle,
  recordTypesOf,
  recordValue,
  type RecordBook,
  type RecordInput,
} from '../records';
import { e1rmWithAssumedRpe, epley1rm } from '../rpe';

let n = 0;
const NOW = new Date('2026-11-20T12:00:00');
const row = (p: Partial<SetRow> = {}): SetRow => {
  n += 1;
  return {
    cycleId: 'c',
    cycleName: 'C',
    week: 1,
    block: 'Volume',
    sessionLogId: 's1',
    sessionId: 'w1-d1',
    itemId: null,
    sessionTitle: 'Supino',
    date: '2026-11-01',
    exerciseId: 'supino',
    exerciseName: 'Supino',
    lift: 'bench',
    kind: 'main',
    setIndex: 1,
    loadKg: 100,
    reps: 5,
    rpe: null,
    failed: false,
    setId: `set${n}`,
    setType: 'normal',
    doneAt: `2026-11-01T10:${String(n % 60).padStart(2, '0')}:00.000Z`,
    ...p,
  };
};
/** Série do treino `s<k>` (data crescente por k). */
const at = (k: number, p: Partial<SetRow> = {}): SetRow =>
  row({ sessionLogId: `s${k}`, date: `2026-11-${String(k).padStart(2, '0')}`, doneAt: `2026-11-${String(k).padStart(2, '0')}T10:00:00.000Z`, ...p });

const types = (book: RecordBook, r: RecordInput) => recordTypesOf(book, r.setId);

describe('estimativas de 1RM', () => {
  it('Epley, a conta de hoje', () => {
    expect(epley1rm(100, 1)).toBe(100);
    expect(epley1rm(100, 5)).toBe(117);
    expect(epley1rm(110, 3)).toBe(121);
    expect(epley1rm(100, 8)).toBe(127);
  });

  it('com RPE informado ou assumido como 10', () => {
    expect(e1rmWithAssumedRpe(100, 5, 8)).toEqual({ kg: 123.3, rpe: 8, assumed: false });
    expect(e1rmWithAssumedRpe(100, 5, null)).toEqual({ kg: 115.9, rpe: 10, assumed: true });
  });

  it('fora da tabela não tem valor', () => {
    expect(e1rmWithAssumedRpe(100, 11, null)).toBeNull();
    expect(e1rmWithAssumedRpe(100, 5, 5.5)).toBeNull();
    expect(e1rmWithAssumedRpe(0, 5, 8)).toBeNull();
  });
});

describe('countsForRecords', () => {
  it('tipos de série que contam', () => {
    for (const setType of ['normal', 'failure', 'dropset'] as const) expect(countsForRecords(row({ setType }))).toBe(true);
  });

  it('itens à parte do plano atual não contam; sem tipo de item conta', () => {
    for (const kind of ['activation_single', 'walkout', 'backoff', 'volume_doubles'] as const) {
      expect(countsForRecords(row({ kind }))).toBe(false);
    }
    expect(countsForRecords(row({ kind: null }))).toBe(true);
  });

  it('série inelegível', () => {
    expect(countsForRecords(row({ failed: true }))).toBe(false);
    expect(countsForRecords(row({ loadKg: null }))).toBe(false);
    expect(countsForRecords(row({ loadKg: 0 }))).toBe(false);
    expect(countsForRecords(row({ reps: null }))).toBe(false);
    expect(countsForRecords(row({ reps: 0 }))).toBe(false);
  });
});

describe('recordValue', () => {
  it('os quatro tipos', () => {
    const s = { loadKg: 100, reps: 5, rpe: 8 };
    expect(recordValue('maxLoad', s)?.value).toBe(100);
    expect(recordValue('setVolume', s)?.value).toBe(500);
    expect(recordValue('oneRm', s)?.value).toBe(117);
    expect(recordValue('oneRmRpe', s)).toEqual({ value: 123.3, rpe: 8, rpeAssumed: false });
  });

  it('volume com decimais não vira recorde por arredondamento', () => {
    expect(recordValue('setVolume', { loadKg: 22.7, reps: 3, rpe: null })?.value).toBe(68.1);
    expect(recordValue('setVolume', { loadKg: 34.05, reps: 2, rpe: null })?.value).toBe(68.1);
  });

  it('o RPE não muda o Maior 1RM', () => {
    for (const rpe of [null, 8, 10]) expect(recordValue('oneRm', { loadKg: 100, reps: 5, rpe })?.value).toBe(117);
  });

  it('sem RPE, o com RPE assume 10 e diz que assumiu', () => {
    expect(recordValue('oneRmRpe', { loadKg: 100, reps: 5, rpe: null })).toEqual({ value: 115.9, rpe: 10, rpeAssumed: true });
  });
});

describe('computeRecordBook', () => {
  it('CP1: maior peso, com o valor e a data de antes', () => {
    const a = at(1, { loadKg: 135, reps: 3 });
    const b = at(2, { loadKg: 140, reps: 3 });
    const book = computeRecordBook([a, b]);
    const hit = book.bySet.get(b.setId)!.hits.find((h) => h.type === 'maxLoad')!;
    expect(hit.previous.value).toBe(135);
    expect(hit.previous.date).toBe('2026-11-01');
    expect(hit.current).toBe(true);
    expect(types(book, a)).toEqual([]);
  });

  it('CP2: volume de série sem bater o peso', () => {
    const a = at(1, { loadKg: 110, reps: 5 });
    const b = at(2, { loadKg: 100, reps: 12 });
    expect(types(computeRecordBook([a, b]), b)).toEqual(['setVolume', 'oneRm']);
  });

  it('CP3: maior 1RM sem bater o peso', () => {
    const a = at(1, { loadKg: 110, reps: 3 });
    const b = at(2, { loadKg: 100, reps: 8 });
    const t = types(computeRecordBook([a, b]), b);
    expect(t).toContain('oneRm');
    expect(t).not.toContain('maxLoad');
  });

  it('CP4: 1RM com RPE só quando o valor supera o histórico', () => {
    const a = at(1, { loadKg: 100, reps: 5, rpe: 9 });
    const withRpe = at(2, { loadKg: 100, reps: 5, rpe: 8 });
    const without = at(2, { loadKg: 100, reps: 5, rpe: null });
    expect(types(computeRecordBook([a, withRpe]), withRpe)).toContain('oneRmRpe');
    expect(types(computeRecordBook([a, without]), without)).not.toContain('oneRmRpe');
  });

  it('CP4/CP21: mais de 10 repetições nunca tem o com RPE', () => {
    const a = at(1, { loadKg: 100, reps: 5 });
    const b = at(2, { loadKg: 100, reps: 11 });
    const t = types(computeRecordBook([a, b]), b);
    expect(t).toEqual(['setVolume', 'oneRm']);
    // sem referência com RPE, a série de 5 repetições não tem o que superar
    const c = at(1, { loadKg: 100, reps: 11 });
    const d = at(2, { loadKg: 100, reps: 5 });
    expect(types(computeRecordBook([c, d]), d)).not.toContain('oneRmRpe');
  });

  it('CP5: vários tipos na mesma série, na ordem dos tipos', () => {
    const a = at(1, { loadKg: 100, reps: 5, rpe: 8 });
    const b = at(2, { loadKg: 110, reps: 5, rpe: 8 });
    expect(types(computeRecordBook([a, b]), b)).toEqual(['maxLoad', 'setVolume', 'oneRm', 'oneRmRpe']);
  });

  it('CP6: empate não conta', () => {
    const a = at(1, { loadKg: 100, reps: 5, rpe: 8 });
    const b = at(2, { loadKg: 100, reps: 5, rpe: 8 });
    expect(computeRecordBook([a, b]).bySet.size).toBe(0);
  });

  it('CP7: o primeiro treino não tem medalha, mesmo com séries crescentes', () => {
    const sets = [100, 105, 110].map((loadKg) => at(1, { loadKg }));
    const book = computeRecordBook(sets);
    expect(book.bySet.size).toBe(0);
    const best = book.best.get('supino')!.maxLoad!;
    expect(best.value.value).toBe(110);
    expect(best.hasMedal).toBe(false);
  });

  it('CP8: só a melhor série do treino fica com a medalha', () => {
    const base = at(1, { loadKg: 95 });
    const [x, y, z] = [100, 105, 110].map((loadKg) => at(2, { loadKg }));
    expect(types(computeRecordBook([base, x, y, z]), z)).toContain('maxLoad');
    expect(types(computeRecordBook([base, x, y, z]), y)).not.toContain('maxLoad');
    expect(types(computeRecordBook([base, x, y]), y)).toContain('maxLoad');
    const [p, q] = [110, 110].map((loadKg, i) => at(2, { loadKg, setIndex: i + 1 }));
    const tie = computeRecordBook([base, p, q]);
    expect(types(tie, p)).toContain('maxLoad');
    expect(types(tie, q)).not.toContain('maxLoad');
  });

  it('CP9: single e série falhada não valem como referência', () => {
    const single = at(1, { loadKg: 180, reps: 1, kind: 'activation_single' });
    const failed = at(1, { loadKg: 200, reps: 1, failed: true });
    const normal = at(1, { loadKg: 150, reps: 3 });
    const next = at(2, { loadKg: 155, reps: 3 });
    const book = computeRecordBook([single, failed, normal, next]);
    expect(book.bySet.get(next.setId)!.hits.find((h) => h.type === 'maxLoad')!.previous.value).toBe(150);
  });

  it('CP9: falha e drop set contam', () => {
    for (const setType of ['failure', 'dropset'] as const) {
      const a = at(1, { loadKg: 130 });
      const b = at(2, { loadKg: 140, setType });
      expect(types(computeRecordBook([a, b]), b)).toContain('maxLoad');
    }
  });

  it('CP10: desmarcar a melhor passa a medalha para a outra', () => {
    const base = at(1, { loadKg: 100 });
    const y = at(2, { loadKg: 105 });
    const z = at(2, { loadKg: 110 });
    expect(types(computeRecordBook([base, y, z]), y)).not.toContain('maxLoad');
    expect(types(computeRecordBook([base, y]), y)).toContain('maxLoad');
  });

  it('CP13: só um recorde atual por tipo; os antigos dizem quem os superou', () => {
    const a = at(1, { loadKg: 100 });
    const b = at(2, { loadKg: 105 });
    const c = at(3, { loadKg: 110 });
    const book = computeRecordBook([a, b, c]);
    const hb = book.bySet.get(b.setId)!.hits.find((h) => h.type === 'maxLoad')!;
    const hc = book.bySet.get(c.setId)!.hits.find((h) => h.type === 'maxLoad')!;
    expect(hb.current).toBe(false);
    expect(hb.supersededBy?.date).toBe('2026-11-03');
    expect(hc.current).toBe(true);
  });

  it('CP14: a ordem das linhas e os treinos importados não mudam o resultado', () => {
    const a = at(1, { loadKg: 100 });
    const imp = at(2, { loadKg: 105, sessionLogId: 'extra:2026-11-02:Hevy' });
    const c = at(3, { loadKg: 110 });
    const ordered = computeRecordBook([a, imp, c]);
    const shuffled = computeRecordBook([c, a, imp]);
    expect([...shuffled.bySet.keys()].sort()).toEqual([...ordered.bySet.keys()].sort());
    expect(types(ordered, imp)).toContain('maxLoad');
  });

  it('CP14: dois treinos no mesmo dia pela hora do primeiro registro', () => {
    const early = row({ sessionLogId: 'a', date: '2026-11-05', doneAt: '2026-11-05T08:00:00.000Z', loadKg: 100 });
    const late = row({ sessionLogId: 'b', date: '2026-11-05', doneAt: '2026-11-05T18:00:00.000Z', loadKg: 110 });
    expect(types(computeRecordBook([late, early]), late)).toContain('maxLoad');
    expect(types(computeRecordBook([late, early]), early)).toEqual([]);
  });

  it('CP15: editar o passado recalcula os treinos seguintes', () => {
    const a = at(1, { loadKg: 120 });
    const b = at(2, { loadKg: 115 });
    const c = at(3, { loadKg: 118 });
    expect(computeRecordBook([a, b, c]).bySet.size).toBe(0);
    const book = computeRecordBook([b, c]);
    expect(book.bySet.get(c.setId)!.hits.find((h) => h.type === 'maxLoad')!.previous.value).toBe(115);
  });

  it('CP20: os recordes são por exercício', () => {
    const other = at(1, { exerciseId: 'outro', loadKg: 100 });
    const mine = at(2, { loadKg: 150 });
    expect(computeRecordBook([other, mine]).bySet.size).toBe(0);
  });

  it('CP24: 500 séries de um exercício e 2.000 de outros, rápido e determinístico', () => {
    const rows: SetRow[] = [];
    for (let s = 1; s <= 100; s++) {
      const day = `2026-${String(1 + Math.floor((s - 1) / 28)).padStart(2, '0')}-${String(1 + ((s - 1) % 28)).padStart(2, '0')}`;
      for (let i = 1; i <= 5; i++) {
        rows.push(row({ sessionLogId: `p${s}`, date: day, doneAt: `${day}T10:0${i}:00.000Z`, setIndex: i, loadKg: 60 + s + i, reps: 5, setId: `p${s}-${i}` }));
      }
      for (let j = 0; j < 4; j++) {
        for (let i = 1; i <= 5; i++) {
          rows.push(row({ exerciseId: `o${j}`, sessionLogId: `p${s}`, date: day, doneAt: `${day}T11:0${i}:00.000Z`, setIndex: i, loadKg: 40 + s, setId: `o${j}-${s}-${i}` }));
        }
      }
    }
    const t0 = performance.now();
    const book = computeRecordBook(rows);
    expect(performance.now() - t0).toBeLessThan(200);
    expect(book.bySet.size).toBeGreaterThan(0);
    expect([...computeRecordBook(rows).bySet.keys()]).toEqual([...book.bySet.keys()]);
  });
});

describe('recordNotice', () => {
  const base = at(1, { loadKg: 100 });
  const none = new Set<string>();

  it('CP1: avisa o que a série marcada ganhou', () => {
    const next = at(2, { loadKg: 105 });
    const before = computeRecordBook([base]);
    const after = computeRecordBook([base, next]);
    expect(recordNotice(before, after, [next.setId], none, null)).toEqual({
      setId: next.setId,
      types: ['maxLoad', 'setVolume', 'oneRm', 'oneRmRpe'],
    });
  });

  it('CP10: a medalha que volta ao desmarcar não avisa', () => {
    const y = at(2, { loadKg: 105 });
    const z = at(2, { loadKg: 110 });
    const before = computeRecordBook([base, y, z]);
    const after = computeRecordBook([base, y]);
    expect(recordNotice(before, after, [], none, null)).toBeNull();
  });

  it('CP15: cascata em série posterior não avisa', () => {
    const a = at(1, { loadKg: 120 });
    const b = at(2, { loadKg: 115 });
    const c = at(3, { loadKg: 118 });
    const before = computeRecordBook([a, b, c]);
    const after = computeRecordBook([b, c]);
    expect(recordNotice(before, after, [a.setId], none, null)).toBeNull();
  });

  it('CP4b(a): RPE depois do ✓ acrescenta o tipo na faixa visível', () => {
    const noRpe = at(2, { loadKg: 105, reps: 5, rpe: null });
    const prior = at(1, { loadKg: 100, reps: 6, rpe: 8 });
    const before = computeRecordBook([prior, noRpe]);
    const withRpe = { ...noRpe, rpe: 8 };
    const after = computeRecordBook([prior, withRpe]);
    const visible = { setId: noRpe.setId, types: recordTypesOf(before, noRpe.setId) };
    const notice = recordNotice(before, after, [noRpe.setId], new Set(visible.types.map((t) => noticeKey(noRpe.setId, t))), visible);
    expect(notice?.types).toEqual(recordTypesOf(after, noRpe.setId));
    expect(visible.types).toEqual(['maxLoad', 'oneRm']);
    expect(notice?.types).toContain('oneRmRpe');
  });

  it('CP4b(b): quem já tinha o tipo não reavisa', () => {
    const prior = at(1, { loadKg: 100, reps: 5, rpe: 8 });
    const s9 = at(2, { loadKg: 110, reps: 5, rpe: 9 });
    const s8 = { ...s9, rpe: 8 };
    expect(recordNotice(computeRecordBook([prior, s9]), computeRecordBook([prior, s8]), [s9.setId], none, null)).toBeNull();
  });

  it('CP4c: perder e recuperar o tipo não gera segunda faixa', () => {
    const prior = at(1, { loadKg: 100, reps: 5, rpe: 8 });
    const s8 = at(2, { loadKg: 100, reps: 5, rpe: 7 });
    const s95 = { ...s8, rpe: 9.5 };
    const announced = new Set([noticeKey(s8.setId, 'oneRmRpe')]);
    const low = computeRecordBook([prior, s95]);
    expect(recordNotice(computeRecordBook([prior, s8]), low, [s8.setId], announced, null)).toBeNull();
    expect(recordNotice(low, computeRecordBook([prior, s8]), [s8.setId], announced, null)).toBeNull();
  });

  it('lote: fica a última série com ganho', () => {
    const a = at(2, { loadKg: 105, setIndex: 1 });
    const b = at(2, { loadKg: 100, setIndex: 2 });
    const c = at(2, { loadKg: 110, setIndex: 3 });
    const before = computeRecordBook([base]);
    const after = computeRecordBook([base, a, b, c]);
    expect(recordNotice(before, after, [a.setId, b.setId, c.setId], none, null)?.setId).toBe(c.setId);
  });
});

describe('preferências', () => {
  it('padrão ligado e aviso só com medalhas', () => {
    expect(normalizeRecordPrefs(null)).toEqual({ medals: true, alerts: true });
    expect(normalizeRecordPrefs({ medals: false, alerts: true })).toEqual({ medals: false, alerts: false });
    expect(normalizeRecordPrefs({ alerts: false })).toEqual({ medals: true, alerts: false });
  });
});

describe('textos', () => {
  it('faixa com um tipo e com vários', () => {
    const a = at(1, { loadKg: 135, reps: 3 });
    const b = at(2, { loadKg: 140, reps: 3 });
    const book = computeRecordBook([a, b]);
    const one = recordBannerText({ setId: b.setId, types: ['maxLoad'] }, book);
    expect(one).toEqual({
      title: 'Novo recorde',
      line: 'Maior peso: 140 kg · antes 135 kg',
      a11y: 'Novo recorde. Maior peso: 140 quilos, antes 135 quilos',
    });
    const many = recordBannerText({ setId: b.setId, types: ['maxLoad', 'setVolume', 'oneRmRpe'] }, book);
    expect(many.title).toBe('Novos recordes (3)');
    expect(many.line).toBe('Maior peso · Maior volume de série · Maior 1RM com RPE');
  });

  it('rótulo do leitor de tela da medalha', () => {
    expect(medalA11yLabel(['maxLoad'])).toBe('Recorde: maior peso. Abrir detalhes.');
    expect(medalA11yLabel(['maxLoad', 'setVolume', 'oneRmRpe'])).toBe(
      'Recordes: maior peso, maior volume de série e maior 1RM com RPE. Abrir detalhes.',
    );
  });

  it('legendas que dizem se o RPE entra (CP4d)', () => {
    const a = at(1, { loadKg: 90, reps: 5, rpe: 8 });
    const rpe = at(2, { loadKg: 100, reps: 5, rpe: 8 });
    const bare = at(3, { loadKg: 120, reps: 5, rpe: null });
    const book = computeRecordBook([a, rpe, bare]);
    const hit = (s: RecordInput, type: 'oneRm' | 'oneRmRpe') => book.bySet.get(s.setId)!.hits.find((h) => h.type === type)!;
    expect(hitCaption(hit(rpe, 'oneRm'), rpe)).toBe('estimado, sem RPE: 100 kg × 5');
    expect(hitCaption(hit(rpe, 'oneRmRpe'), rpe)).toBe('calculado com RPE 8');
    expect(hitCaption(hit(bare, 'oneRmRpe'), bare)).toBe('RPE não informado: calculado como RPE 10 (esforço máximo)');
  });

  it('antes, selo e títulos da folha (CP13, CP16)', () => {
    const a = at(1, { loadKg: 100 });
    const b = at(2, { loadKg: 105 });
    const c = at(3, { loadKg: 110 });
    const book = computeRecordBook([a, b, c]);
    const hb = book.bySet.get(b.setId)!.hits[0];
    expect(hitBeforeText(hb, NOW)).toBe('antes: 100 kg em 01 nov');
    expect(hitBadgeText(hb, NOW)).toBe('Superado em 03 nov');
    expect(hitBadgeText(book.bySet.get(c.setId)!.hits[0], NOW)).toBe('Recorde atual');
    expect(recordSheetTitle([hb])).toBe('Recorde');
    expect(recordSheetTitle(book.bySet.get(b.setId)!.hits.concat(hb))).toBe('Recordes desta série');
    expect(recordSetSubtitle({ ...c, setIndex: 3, loadKg: 140, reps: 3 }, NOW)).toBe('série 3 · 140 kg × 3 · 03 nov');
  });

  it('subtítulo da lista (CP18)', () => {
    const a = at(1, { loadKg: 90 });
    const b = at(2, { loadKg: 100, reps: 5 });
    const best = computeRecordBook([a, b]).best.get('supino')!;
    expect(holderSubtitle('maxLoad', best.maxLoad!, NOW)).toBe('02 nov · 100 kg × 5');
    expect(holderSubtitle('oneRmRpe', best.oneRmRpe!, NOW)).toBe(
      '02 nov · 100 kg × 5 · estimado, rpe não informado (como RPE 10)',
    );
  });
});

describe('personalRecords = livro de recordes', () => {
  it('a lista e a medalha vêm da mesma conta, e itens à parte ficam de fora', () => {
    const a = at(1, { loadKg: 100 });
    const b = at(2, { loadKg: 110 });
    const backoff = at(2, { loadKg: 200, kind: 'backoff' });
    const list = personalRecords([a, b, backoff]);
    const book = computeRecordBook([a, b, backoff]);
    expect(list.maxLoad).toEqual(book.best.get('supino')!.maxLoad);
    expect(list.maxLoad?.hasMedal).toBe(true);
    expect(list.byReps.every((r) => r.kg <= 110)).toBe(true);
  });

  it('sem séries com carga e repetições', () => {
    const r = personalRecords([row({ loadKg: null })]);
    expect(r).toEqual({ maxLoad: null, oneRm: null, oneRmRpe: null, setVolume: null, bestSessionVolume: null, byReps: [] });
    expect(computeRecordBook([])).toEqual(EMPTY_RECORD_BOOK);
  });
});
