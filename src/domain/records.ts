// Recordes pessoais com medalha: derivados do histórico a cada leitura, nunca gravados.
// Quatro tipos por exercício: maior peso, maior volume de série, maior 1RM (Epley, sem RPE)
// e maior 1RM com RPE (tabela RTS; sem RPE, calcula como RPE 10).

import type { SetRow } from './analytics';
import { formatDate, formatKg, formatNumber } from './format';
import { e1rmWithAssumedRpe, epley1rm } from './rpe';
import type { ItemKind, SetType } from './types';

export type RecordType = 'maxLoad' | 'setVolume' | 'oneRm' | 'oneRmRpe';

export const RECORD_TYPES: readonly RecordType[] = ['maxLoad', 'setVolume', 'oneRm', 'oneRmRpe'];

export const RECORD_LABEL: Record<RecordType, string> = {
  maxLoad: 'Maior peso',
  setVolume: 'Maior volume de série',
  oneRm: 'Maior 1RM',
  oneRmRpe: 'Maior 1RM com RPE',
};

/**
 * Itens do plano atual que ficam de fora dos recordes (são exercícios à parte, antes do PBI 19).
 * Treino importado ou avulso não tem `kind` e conta.
 */
export const RECORD_KIND_COUNTS: Record<ItemKind, boolean> = {
  main: true,
  variation: true,
  accessory: true,
  core: true,
  activation_single: false,
  walkout: false,
  backoff: false,
  volume_doubles: false,
};

/** Tipos de série que contam. Ponto de extensão do PBI 19: novos tipos obrigam a preencher esta tabela. */
export const RECORD_SET_TYPE_COUNTS: Record<SetType, boolean> = {
  normal: true,
  failure: true,
  dropset: true,
};

export type RecordInput = Pick<
  SetRow,
  | 'setId'
  | 'sessionLogId'
  | 'exerciseId'
  | 'exerciseName'
  | 'date'
  | 'doneAt'
  | 'setIndex'
  | 'loadKg'
  | 'reps'
  | 'rpe'
  | 'failed'
  | 'kind'
  | 'setType'
>;

/** Série com carga e repetições positivas e não falhada (o que dá para comparar entre treinos). */
export const hasLoadAndReps = (r: Pick<SetRow, 'failed' | 'loadKg' | 'reps'>) =>
  !r.failed && r.loadKg !== null && r.loadKg > 0 && r.reps !== null && r.reps > 0;

export function countsForRecords(s: Pick<SetRow, 'failed' | 'loadKg' | 'reps' | 'kind' | 'setType'>): boolean {
  if (!hasLoadAndReps(s)) return false;
  if (s.kind !== null && !RECORD_KIND_COUNTS[s.kind]) return false;
  return RECORD_SET_TYPE_COUNTS[s.setType];
}

export interface RecordValue {
  value: number;
  /** RPE usado na conta; só em `oneRmRpe`. */
  rpe: number | null;
  rpeAssumed: boolean;
}

/** Valor de uma série para o tipo, ou null se ela não é elegível a esse tipo (ex.: 11 repetições no com RPE). */
export function recordValue(type: RecordType, s: Pick<SetRow, 'loadKg' | 'reps' | 'rpe'>): RecordValue | null {
  const { loadKg, reps } = s;
  if (loadKg === null || reps === null || loadKg <= 0 || reps <= 0) return null;
  switch (type) {
    case 'maxLoad':
      return { value: loadKg, rpe: null, rpeAssumed: false };
    case 'setVolume':
      // 2 casas evitam "recorde" por erro de ponto flutuante (34,05 × 2 contra 22,7 × 3)
      return { value: Math.round(loadKg * reps * 100) / 100, rpe: null, rpeAssumed: false };
    case 'oneRm':
      return { value: epley1rm(loadKg, reps), rpe: null, rpeAssumed: false };
    case 'oneRmRpe': {
      const e = e1rmWithAssumedRpe(loadKg, reps, s.rpe);
      return e ? { value: e.kg, rpe: e.rpe, rpeAssumed: e.assumed } : null;
    }
  }
}

export interface RecordRef {
  setId: string;
  sessionLogId: string;
  date: string;
  value: number;
}

export interface RecordHit {
  type: RecordType;
  value: RecordValue;
  /** O melhor valor de todos os treinos anteriores. */
  previous: RecordRef;
  /** O hit seguinte do mesmo tipo e exercício, se houve. */
  supersededBy: RecordRef | null;
  /** Só o último hit de cada tipo é o recorde atual. */
  current: boolean;
}

export interface SetRecords {
  set: RecordInput;
  /** Na ordem de `RECORD_TYPES`. */
  hits: RecordHit[];
}

export interface RecordHolder {
  set: RecordInput;
  value: RecordValue;
  hasMedal: boolean;
}

export interface RecordBook {
  /** Só séries com pelo menos um recorde, por `setId`. */
  bySet: ReadonlyMap<string, SetRecords>;
  /** Melhor valor de cada tipo, por `exerciseId`. */
  best: ReadonlyMap<string, Record<RecordType, RecordHolder | null>>;
}

export const EMPTY_RECORD_BOOK: RecordBook = { bySet: new Map(), best: new Map() };

const refOf = (s: RecordInput, value: number): RecordRef => ({
  setId: s.setId,
  sessionLogId: s.sessionLogId,
  date: s.date,
  value,
});

const bySetOrder = (a: RecordInput, b: RecordInput) =>
  a.doneAt.localeCompare(b.doneAt) || a.setIndex - b.setIndex || a.setId.localeCompare(b.setId);

interface Candidate {
  set: RecordInput;
  value: RecordValue;
}

/**
 * Livro de recordes de todo o histórico. Para cada exercício, em ordem cronológica dos treinos:
 * a melhor série do treino (a primeira, no empate) ganha o tipo se for **estritamente maior** que o
 * melhor de todos os treinos anteriores. O primeiro treino do exercício só vira referência (sem medalha).
 * Séries que não contam (`countsForRecords`) nunca entram, nem como referência.
 */
export function computeRecordBook(rows: readonly RecordInput[]): RecordBook {
  const byExercise = new Map<string, Map<string, RecordInput[]>>();
  for (const r of rows) {
    if (!countsForRecords(r)) continue;
    const sessions = byExercise.get(r.exerciseId) ?? new Map<string, RecordInput[]>();
    const list = sessions.get(r.sessionLogId) ?? [];
    list.push(r);
    sessions.set(r.sessionLogId, list);
    byExercise.set(r.exerciseId, sessions);
  }

  const bySet = new Map<string, SetRecords>();
  const best = new Map<string, Record<RecordType, RecordHolder | null>>();

  for (const [exerciseId, sessions] of byExercise) {
    const ordered = [...sessions.entries()]
      .map(([id, sets]) => {
        const sorted = [...sets].sort(bySetOrder);
        return { id, date: sorted[0].date, firstAt: sorted[0].doneAt, sets: sorted };
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.firstAt.localeCompare(b.firstAt) || a.id.localeCompare(b.id));

    const holders: Record<RecordType, Candidate | null> = { maxLoad: null, setVolume: null, oneRm: null, oneRmRpe: null };
    const chains: Record<RecordType, { hit: RecordHit; set: RecordInput }[]> = {
      maxLoad: [],
      setVolume: [],
      oneRm: [],
      oneRmRpe: [],
    };

    for (const session of ordered) {
      for (const type of RECORD_TYPES) {
        let top: Candidate | null = null;
        for (const s of session.sets) {
          const value = recordValue(type, s);
          if (value && (top === null || value.value > top.value.value)) top = { set: s, value };
        }
        if (!top) continue;
        const prev = holders[type];
        if (prev && top.value.value > prev.value.value) {
          const hit: RecordHit = {
            type,
            value: top.value,
            previous: refOf(prev.set, prev.value.value),
            supersededBy: null,
            current: true,
          };
          chains[type].push({ hit, set: top.set });
          const entry = bySet.get(top.set.setId) ?? { set: top.set, hits: [] };
          entry.hits.push(hit);
          bySet.set(top.set.setId, entry);
        }
        if (!prev || top.value.value > prev.value.value) holders[type] = top;
      }
    }

    const entry = { maxLoad: null, setVolume: null, oneRm: null, oneRmRpe: null } as Record<RecordType, RecordHolder | null>;
    for (const type of RECORD_TYPES) {
      const chain = chains[type];
      chain.forEach(({ hit }, i) => {
        const next = chain[i + 1];
        if (next) {
          hit.supersededBy = refOf(next.set, next.hit.value.value);
          hit.current = false;
        }
      });
      const h = holders[type];
      if (h) {
        const hasMedal = chain.some((c) => c.set.setId === h.set.setId);
        entry[type] = { set: h.set, value: h.value, hasMedal };
      }
    }
    best.set(exerciseId, entry);
  }

  for (const entry of bySet.values()) {
    entry.hits.sort((a, b) => RECORD_TYPES.indexOf(a.type) - RECORD_TYPES.indexOf(b.type));
  }
  return { bySet, best };
}

export function recordTypesOf(book: RecordBook, setId: string): RecordType[] {
  return book.bySet.get(setId)?.hits.map((h) => h.type) ?? [];
}

// ---------- Aviso (faixa) ----------

export interface RecordNotice {
  setId: string;
  types: RecordType[];
}

export const noticeKey = (setId: string, type: RecordType) => `${setId}:${type}`;

/**
 * Tipos que as séries da ação do usuário ganharam (antes → depois), sem os já avisados neste treino.
 * Só olha `actingIds`: desmarcar, cascata e retroativo nunca avisam. Com vários ids (lote "conforme o
 * plano"), fica a última série com ganho. Se a faixa visível é da mesma série, o aviso a substitui
 * com todos os tipos atuais dela.
 */
export function recordNotice(
  before: RecordBook,
  after: RecordBook,
  actingIds: readonly string[],
  announced: ReadonlySet<string>,
  visible: RecordNotice | null,
): RecordNotice | null {
  let chosen: { setId: string; gains: RecordType[] } | null = null;
  for (const id of actingIds) {
    const was = new Set(recordTypesOf(before, id));
    const gains = recordTypesOf(after, id).filter((t) => !was.has(t) && !announced.has(noticeKey(id, t)));
    if (gains.length > 0) chosen = { setId: id, gains };
  }
  if (!chosen) return null;
  if (visible?.setId === chosen.setId) return { setId: chosen.setId, types: recordTypesOf(after, chosen.setId) };
  return { setId: chosen.setId, types: chosen.gains };
}

// ---------- Preferências ----------

export interface RecordPrefs {
  medals: boolean;
  alerts: boolean;
}

export const DEFAULT_RECORD_PREFS: RecordPrefs = { medals: true, alerts: true };

/** Sem medalhas não há aviso: `alerts` só vale com `medals` ligado. */
export function normalizeRecordPrefs(p: Partial<RecordPrefs> | null): RecordPrefs {
  const medals = p?.medals ?? DEFAULT_RECORD_PREFS.medals;
  const alerts = medals && (p?.alerts ?? DEFAULT_RECORD_PREFS.alerts);
  return { medals, alerts };
}

// ---------- Textos da interface ----------

export function recordValueText(_type: RecordType, v: RecordValue): string {
  return formatKg(v.value);
}

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
}

export function recordBannerText(
  notice: RecordNotice,
  book: RecordBook,
): { title: string; line: string; a11y: string } {
  const labels = notice.types.map((t) => RECORD_LABEL[t]);
  if (notice.types.length === 1) {
    const type = notice.types[0];
    const hit = book.bySet.get(notice.setId)?.hits.find((h) => h.type === type);
    const line = hit
      ? `${RECORD_LABEL[type]}: ${recordValueText(type, hit.value)} · antes ${formatKg(hit.previous.value)}`
      : RECORD_LABEL[type];
    return { title: 'Novo recorde', line, a11y: `Novo recorde. ${line.replace(/ kg/g, ' quilos').replace(' · ', ', ')}` };
  }
  return {
    title: `Novos recordes (${notice.types.length})`,
    line: labels.join(' · '),
    a11y: `Novos recordes. ${joinNames(labels.map(lowerFirst))}`,
  };
}

export function medalA11yLabel(types: readonly RecordType[]): string {
  const names = types.map((t) => lowerFirst(RECORD_LABEL[t]));
  return types.length === 1
    ? `Recorde: ${names[0]}. Abrir detalhes.`
    : `Recordes: ${joinNames(names)}. Abrir detalhes.`;
}

export const recordSheetTitle = (hits: readonly RecordHit[]) => (hits.length === 1 ? 'Recorde' : 'Recordes desta série');

export function recordSetSubtitle(set: RecordInput, now: Date = new Date()): string {
  return `série ${set.setIndex} · ${formatKg(set.loadKg)} × ${set.reps} · ${formatDate(set.date, now)}`;
}

export const hitBeforeText = (hit: RecordHit, now: Date = new Date()) =>
  `antes: ${formatKg(hit.previous.value)} em ${formatDate(hit.previous.date, now)}`;

export const hitBadgeText = (hit: RecordHit, now: Date = new Date()) =>
  hit.current || !hit.supersededBy ? 'Recorde atual' : `Superado em ${formatDate(hit.supersededBy.date, now)}`;

const RPE_NOT_INFORMED = 'RPE não informado';

/** Legenda que diz se o valor considera o RPE (CP4d). */
export function hitCaption(hit: RecordHit, set: RecordInput): string | null {
  const setText = `${formatKg(set.loadKg)} × ${set.reps}`;
  switch (hit.type) {
    case 'oneRm':
      return `estimado, sem RPE: ${setText}`;
    case 'oneRmRpe':
      return hit.value.rpeAssumed
        ? `${RPE_NOT_INFORMED}: calculado como RPE 10 (esforço máximo)`
        : `calculado com RPE ${formatNumber(hit.value.rpe ?? 10)}`;
    case 'setVolume':
      return setText;
    case 'maxLoad':
      return null;
  }
}

/** Subtítulo de uma linha da lista "Recordes pessoais". */
export function holderSubtitle(type: RecordType, holder: RecordHolder, now: Date = new Date()): string {
  const s = holder.set;
  const base = `${formatDate(s.date, now)} · ${formatKg(s.loadKg)} × ${s.reps}`;
  if (type === 'oneRm') return `${base} · estimado, sem RPE`;
  if (type === 'oneRmRpe') {
    return holder.value.rpeAssumed
      ? `${base} · estimado, ${RPE_NOT_INFORMED.toLowerCase()} (como RPE 10)`
      : `${base} · estimado, com RPE ${formatNumber(holder.value.rpe ?? 10)}`;
  }
  return base;
}
