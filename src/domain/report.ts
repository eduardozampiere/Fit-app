// Pacote para o Claude (treinador): relatório em Markdown com tudo o que ele precisa para acompanhar.

import type { NutritionDay, SetRow } from './analytics';
import { e1rmSeries } from './analytics';
import { movingAverage7, weeklyTrend, type WeightEntry } from './body';
import { addDays, diffDays } from './dates';
import { formatDateShort, formatNumber, WEEKDAY_NAMES } from './format';
import { LIFT_LABEL, sessionDate } from './plan';
import type { Alert, CheckIn } from './rules';
import type { Cycle, Lift, Maxes, PrescribedItem } from './types';

export interface ReportInput {
  cycle: Cycle;
  maxes: Maxes;
  rows: SetRow[]; // séries do ciclo
  checkins: CheckIn[];
  alerts: Alert[];
  decisions: Map<string, 'accepted' | 'dismissed'>;
  weights: WeightEntry[];
  nutrition: NutritionDay[];
  from: string;
  to: string;
  today: string;
}

const LIFTS: Lift[] = ['squat', 'bench', 'deadlift'];
const n1 = (v: number) => formatNumber(v, 1);
const dm = formatDateShort;

function planned(it: PrescribedItem): string {
  const parts = [it.setsText];
  if (it.loadText && it.loadText !== '—') parts.push(`${it.loadText}${/^\d/.test(it.loadText) && it.loadMode === 'fixed' ? ' kg' : ''}`);
  if (it.rpeText && it.rpeText !== '—') parts.push(`RPE ${it.rpeText}`);
  return parts.join(' · ');
}

function doneText(sets: SetRow[]): string {
  if (!sets.length) return '—';
  return sets
    .sort((a, b) => a.setIndex - b.setIndex)
    .map((s) => `${s.loadKg ?? '—'}×${s.reps ?? '—'}${s.rpe !== null ? ` @${n1(s.rpe)}` : ''}${s.failed ? ' FALHOU' : ''}`)
    .join(', ');
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function buildCoachReport(input: ReportInput): string {
  const { cycle, maxes, rows, checkins, alerts, decisions, weights, nutrition, from, to, today } = input;
  const inRange = (d: string) => d >= from && d <= to;
  const L: string[] = [];
  const weeks = cycle.weeks.filter((w) => w.start <= to && addDays(w.start, 6) >= from);

  L.push('# Diário de treino — pacote para o treinador');
  L.push('');
  L.push(`Gerado em ${dm(today)}. Período: ${dm(from)} a ${dm(to)}. Ciclo: **${cycle.name}** (\`${cycle.id}\`).`);
  L.push(
    `Máximos de referência atuais: agacho ${maxes.squat} · supino ${maxes.bench} · terra ${maxes.deadlift} kg` +
      (LIFTS.some((l) => maxes[l] !== cycle.maxes[l]) ? ` (no plano: ${cycle.maxes.squat} · ${cycle.maxes.bench} · ${cycle.maxes.deadlift}).` : '.'),
  );
  L.push('');

  // ---- Resumo
  const sessionsDone = new Set(rows.filter((r) => inRange(r.date)).map((r) => r.sessionLogId));
  const plannedCount = weeks.flatMap((w) => w.sessions.filter((s) => inRange(sessionDate(w, s)))).length;
  const pc = checkins.filter((c) => inRange(c.date));
  const pn = nutrition.filter((d) => inRange(d.date));
  L.push('## Resumo');
  L.push(`- Treinos registrados: ${sessionsDone.size} (planejados no período: ${plannedCount}).`);
  for (const l of LIFTS) {
    const s = e1rmSeries(rows, l);
    const last = s[s.length - 1];
    if (last) L.push(`- e1RM ${LIFT_LABEL[l].toLowerCase()}: ${n1(last.y)} kg (${dm(last.x)}, tabela RTS).`);
  }
  const w7 = movingAverage7(weights, to);
  const tr = weeklyTrend(weights, to);
  if (w7 !== null) L.push(`- Peso: média de 7 dias ${n1(w7)} kg${tr !== null ? `, tendência ${tr > 0 ? '+' : ''}${formatNumber(tr, 2)} kg/semana` : ''}.`);
  if (pn.length) {
    L.push(
      `- Alimentação (${pn.length} dias): média ${formatNumber(avg(pn.map((d) => d.kcal))!, 0)} kcal ` +
        `(alvo médio ${formatNumber(avg(pn.map((d) => d.kcalTarget))!, 0)}), proteína ${formatNumber(avg(pn.map((d) => d.protein))!, 0)} g (alvo ${pn[0].proteinTarget}).`,
    );
  }
  if (pc.length) {
    const m = (k: 'lowBack' | 'knee' | 'wrist' | 'foot') => {
      const v = avg(pc.map((c) => c[k]).filter((x): x is number => x !== null));
      return v === null ? '—' : n1(v);
    };
    const sleep = pc.map((c) => c.sleepH).filter((x): x is number => x !== null);
    L.push(
      `- Check-ins (${pc.length}): médias lombar ${m('lowBack')}, joelho ${m('knee')}, punho ${m('wrist')}, pé ${m('foot')}; ` +
        `sono médio ${sleep.length ? n1(avg(sleep)!) : '—'} h, ${sleep.filter((h) => h < 6).length} noite(s) < 6 h.`,
    );
    if (pc.some((c) => c.redFlags.saddleNumbness || c.redFlags.bladderBowel || c.redFlags.legWeakness)) {
      L.push('- ⚠️ **Houve sinal de alarme da lombar no período.**');
    }
  }
  L.push('');

  // ---- Semanas
  const rowsBySession = new Map<string, SetRow[]>();
  for (const r of rows) rowsBySession.set(r.sessionId, [...(rowsBySession.get(r.sessionId) ?? []), r]);
  for (const w of weeks) {
    L.push(`## Semana ${w.number} — ${w.block} (início ${dm(w.start)}, RPE alvo ${w.targetRpeText})`);
    if (w.note) L.push(`> ${w.note}`);
    for (const s of w.sessions) {
      const d = sessionDate(w, s);
      const done = rowsBySession.get(s.id) ?? [];
      const doneDate = done[0]?.date;
      L.push('');
      L.push(
        `### ${WEEKDAY_NAMES[s.weekday]} ${dm(d)} — ${s.title} (\`${s.id}\`) · ` +
          (doneDate ? `feito em ${dm(doneDate)}` : diffDays(d, today) > 0 ? 'ainda não chegou' : '**não registrado**'),
      );
      L.push('');
      L.push('| id | Exercício | Planejado | Feito |');
      L.push('|---|---|---|---|');
      for (const it of s.items) {
        L.push(`| \`${it.id}\` | ${it.name} | ${planned(it)} | ${doneText(done.filter((r) => r.itemId === it.id))} |`);
      }
      const extras = done.filter((r) => !r.itemId || !s.items.some((it) => it.id === r.itemId));
      const byEx = new Map<string, SetRow[]>();
      for (const r of extras) byEx.set(r.exerciseName, [...(byEx.get(r.exerciseName) ?? []), r]);
      for (const [name, list] of byEx) L.push(`| — | ${name} (fora do plano) | — | ${doneText(list)} |`);
      const ci = doneDate ? checkins.find((c) => c.date === doneDate) : undefined;
      if (ci) L.push(`\nCheck-in do dia: lombar ${ci.lowBack ?? '—'}, joelho ${ci.knee ?? '—'}, punho ${ci.wrist ?? '—'}, pé ${ci.foot ?? '—'}, sono ${ci.sleepH ?? '—'} h${ci.note ? ` — ${ci.note}` : ''}.`);
    }
    L.push('');
  }

  // ---- Treinos avulsos (fora do plano) no período
  const extraSessions = [...rowsBySession.entries()].filter(([sid, list]) => sid.startsWith('extra:') && inRange(list[0].date));
  if (extraSessions.length) {
    L.push('## Treinos fora do plano');
    for (const [, list] of extraSessions) {
      L.push(`- ${dm(list[0].date)} ${list[0].sessionTitle}: ${[...new Set(list.map((r) => r.exerciseName))].map((n) => `${n} ${doneText(list.filter((r) => r.exerciseName === n))}`).join('; ')}`);
    }
    L.push('');
  }

  // ---- Alertas
  if (alerts.length) {
    L.push('## Alertas das regras do plano');
    for (const a of alerts) {
      const st = decisions.get(a.key);
      L.push(`- [${st === 'accepted' ? 'aceito' : st === 'dismissed' ? 'ignorado' : 'pendente'}] S${a.week} · ${a.title} — ${a.message}`);
    }
    L.push('');
  }

  // ---- Tabelas
  if (pc.length) {
    L.push('## Check-ins');
    L.push('| Data | Lombar | Joelho | Punho | Pé | Sono (h) | Obs |');
    L.push('|---|---|---|---|---|---|---|');
    for (const c of [...pc].sort((a, b) => a.date.localeCompare(b.date))) {
      L.push(`| ${dm(c.date)} | ${c.lowBack ?? '—'} | ${c.knee ?? '—'} | ${c.wrist ?? '—'} | ${c.foot ?? '—'} | ${c.sleepH ?? '—'} | ${c.note ?? ''} |`);
    }
    L.push('');
  }
  const pw = weights.filter((x) => inRange(x.date)).sort((a, b) => a.date.localeCompare(b.date));
  if (pw.length) {
    L.push('## Peso');
    L.push('| Data | Peso (kg) | Média 7 dias |');
    L.push('|---|---|---|');
    for (const x of pw) L.push(`| ${dm(x.date)} | ${n1(x.kg)} | ${n1(movingAverage7(weights, x.date) ?? x.kg)} |`);
    L.push('');
  }
  if (pn.length) {
    L.push('## Alimentação');
    L.push('| Data | Dia | kcal | Alvo | Proteína (g) |');
    L.push('|---|---|---|---|---|');
    for (const d of pn) L.push(`| ${dm(d.date)} | ${d.training ? 'treino' : 'descanso'} | ${formatNumber(d.kcal, 0)} | ${d.kcalTarget} | ${formatNumber(d.protein, 0)} |`);
    L.push('');
  }

  L.push('## Como responder com ajustes');
  L.push(
    'Para o app aplicar mudanças no plano, responda com um bloco ```json no formato `fitapp.adjustments/v1` ' +
      '(operações: set_load, edit_item, add_item, remove_item, add_note, set_max, deload, skip_activation), ' +
      `usando os ids acima (\`cycleId\`: "${cycle.id}"). Para um ciclo novo inteiro, use \`fitapp.cycle/v1\`. ` +
      'Eu reviso e confirmo antes de aplicar.',
  );
  return L.join('\n');
}

/** Período padrão: últimos 7 dias até hoje. */
export function lastWeekRange(today: string): { from: string; to: string } {
  return { from: addDays(today, -6), to: today };
}
