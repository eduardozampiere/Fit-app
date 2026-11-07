# 15 — Exercício único e máximos próprios (fim do "agacho/supino/terra" fixo)

> **Nota (06/11/2026): esta spec foi dividida em PBIs, que passam a ser o contrato de produto.** Ordem: [19 Modelo de treino v2](../19-formato-v2/pbi.md)
> (15a, 15b, 15d e a migração de dados do 15g; **agora também leva o "back-off, single de ativação e walkout viram tipo de série dentro do exercício; 'duplas de volume' não é tipo (vira back-off, a confirmar)"**, pedido do usuário em 06/11/2026)
> → [24 Séries com tipo](../24-series-com-tipo/pbi.md) (montar e editar esses grupos) → [20 Máximos próprios](../20-maximos-proprios/pbi.md) (15c e 15f)
> → [21 Histórico de máximos](../21-historico-de-maximos/pbi.md) (`max_history` do 15g) e [22 Análises por exercício](../22-analises-por-exercicio/pbi.md) (15e; depende só da 19);
> o que estava em "Fora do escopo" (evolução dos máximos) agora é o [PBI 23](../23-evolucao-dos-maximos/pbi.md). Nome do primeiro máximo: "Agachamento" (pedido do usuário).
> **Visão nova (06/11/2026):** o app deve servir também a quem só faz academia normal; máximos, regras e histórico passam a ser módulo avançado. Ver ordem em [PLANO.md](../PLANO.md).
> As decisões abaixo continuam valendo; o plano técnico de cada fatia nasce em `tech-plan.md` na pasta do PBI.

**Status:** ⏳ a fazer — planejada com o usuário em 06/11/2026 (entrevista de decisões) — **pré-requisito das specs 16 e 18**

## Objetivo
"Não deveria ter diferença entre terra, agacho e supino e os exercícios; todos são exercícios." Hoje três levantamentos fixos
têm poderes que os outros não têm (máximo, carga em %, e1RM, gráfico, regras). Depois desta spec: **qualquer exercício** pode
ser principal, ter carga em % de um máximo e aparecer nas Análises; o plano atual continua funcionando **idêntico**.

## O que está preso aos três levantamentos hoje (levantado no código)
| Onde | Dependência |
|---|---|
| `Cycle.maxes: Record<'squat'\|'bench'\|'deadlift', number>` | máximos só dos três |
| `Exercise.lift` + `liftOf()` | liga item → "família" → máximo. No plano atual são **21 exercícios** em 3 famílias (ex.: 7 do agacho: principal, pausa, single, walkout, back-off, duplas…) |
| `loads.resolveLoad`, `plan.currentLoad` | % × `maxes[lift]` |
| `analytics.ts`, `analises.tsx` | gráficos e cores fixos por `LIFTS` |
| `rules.ts` (542 linhas) + `RuleParams` | portões por levantamento; regras só do terra (4ª série, falha para o levantamento, pegada) |
| `reorder.attachSingles` | pareia single → principal pelo movimento |
| `ajustes.tsx`, `AppData`, `report.ts`, `import_plan.py`, `adjustments.ts` (`set_max`) | máximos, relatório, importador, Claude |

## Decisões (confirmadas pelo usuário)
1. **Lista de máximos separada dos exercícios.** Cada máximo tem **id estável** e **nome** ("Agachamento 200", "Supino 170",
   "Terra 240", + os que o usuário criar, ex.: "Barra fixa lastrada"). O item do treino tem o campo opcional **"Carga baseada
   em"** (um máximo da lista) + `pctOfMax`; sem ele, carga fixa em kg como hoje. Trocar ou apagar um exercício não mexe nos
   máximos. Os ids dos três atuais continuam `squat`, `bench`, `deadlift` (migração 1 para 1; ajustes antigos do Claude seguem válidos).
2. **Dois níveis de máximo.** (a) **Máximo da periodização**: base dos %; cada periodização tem os seus, e mudar um não reescreve as
   cargas de outra (como hoje, `cycle.maxes` = base do plano e `maxes:<cycleId>` em `settings` = valor atual). (b) **Histórico do
   usuário** (tabela `max_history`): **toda vez que um máximo muda** grava data, valor, origem (`import`, `manual`, `claude`,
   `rule`, `new_cycle`) e periodização — para análises futuras. Uma periodização nova começa do último valor do histórico.
3. **Apagar máximo em uso: não deixa.** Mostra quais itens usam e o usuário desliga um a um antes.
4. **Análises:** "Carga dos principais" tem **uma linha por exercício marcado como Principal** (`kind = main`), de qualquer exercício;
   trocar o exercício principal cria outra linha. Cores pela ordem fixa da paleta; com muitas linhas, mostra as mais recentes e
   há seletor. e1RM pelo mesmo critério. O termômetro do single lê o single pelo `parentId`.
5. **Single pareado por `parentId`** (`single.parentId = id do principal`), não pelo movimento. A migração preenche com o
   principal seguinte da mesma família; `attachSingles` passa a usar `parentId`.
6. **Sem pergunta de movimento** ao adicionar exercício: a folha de tipo termina em Acessório / Variação / Principal
   (some `needsLift`). A miniatura de barra vale para `kind = main` ou item com máximo.
7. **Regras (escopo desta spec): só trocar a chave.** `RuleParams` passa a ser **por máximo** (`gates.maxes[maxId]`,
   `perMax[maxId].{fourthSet, failStopsLift, grip}`) e `ruleParams` fica **opcional** (`null` = sem alertas do treinador).
   O comportamento do plano atual **não muda**. A tela para criar e editar regras é a **spec 18**.
8. **Formato `fitapp.cycle/v2`:** v1 continua sendo lido e convertido (importação, JSON do Claude, backup).

## Formato v2 (resumo)
```
maxes:   { <maxId>: { name: string, kg: number } }          // base da periodização
exercises[]: { id, name, category: 'accessory'|'core' }      // sem `lift`; 'powerlifting' vira 'accessory'
items[]: + maxRef: <maxId> | null                            // "carga baseada em"
         parentId: single/back-off/duplas -> principal
ruleParams: RuleParams | null                                // por máximo
```
Banco v8: tabela `max_history(id, max_id, name, kg, date, source, cycle_id)`; reescreve `cycles.data` (v1→v2); `settings`
`maxes:<cycleId>` não muda (mesmas chaves). Backup: `max_history` entra em `TABLES` (`dataRepo.ts`).

## Plano de execução (commits pequenos, testes verdes a cada um)
- [ ] **15a — Rede de segurança:** teste "dourado" sobre `assets/plan/ciclo_out26_jan27.json`: alertas por regra, cargas do dia
  (`currentLoad`), séries das Análises e e1RM. Tem que passar **idêntico** em todas as etapas seguintes.
- [ ] **15b — Tipos v2 + `migrateCycleV1ToV2`** (função pura, testes, inclui singles→`parentId`); importador Python emite v2; docs
  (`formato-ciclo.md`, `claude-treinador.md`).
- [ ] **15c — Cargas:** `resolveLoad`/`currentLoad` por `maxRef`; `set_max` do Claude por `maxId`.
- [ ] **15d — Regras por máximo:** `RuleParams` reorganizado, `ruleParams` opcional; golden verde.
- [ ] **15e — Análises:** linhas por exercício principal; termômetro por `parentId`; `attachSingles` por `parentId`.
- [ ] **15f — Telas:** tela de **Máximos** (Ajustes agora; vira item do menu da periodização na spec 16): criar, renomear, editar kg,
  apagar (bloqueado se em uso); "Carga baseada em" + % no `ItemEditor`; fim da pergunta de movimento ao adicionar exercício.
- [ ] **15g — Banco v8 + histórico:** `max_history`, `recordMax` em todo ponto que muda máximo; migração de `cycles.data`; backup.
  **Antes de migrar, exportar um backup automático** (JSON `fitapp.backup/v1`) para o usuário poder voltar.
- [ ] Verificação: testes (incl. dourado), `tsc`, lint, simulador **com o banco atual** (migração real), iPhone.

## Riscos e cuidados
- **Maior mudança do roteiro** (regras de ~540 linhas, formato, banco, Claude): por isso a rede de segurança primeiro.
- Migração é via única: backup automático antes (15g) e teste de idempotência (rodar duas vezes = mesmo resultado).
- Claude/treinador: `fitapp.adjustments/v1` com `set_max`/`lift` por movimento continua aceito (traduz `lift` → `maxId` igual).

## Fora do escopo (backlog)
- Tela de **Evolução dos máximos** (usa `max_history`) nas Análises.
- Sugerir máximo a partir dos treinos (e1RM) — hoje só a regra de revisão do plano atual.
