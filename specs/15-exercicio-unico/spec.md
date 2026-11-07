# 15 — Exercício único: todos os exercícios são iguais (fim do "agacho/supino/terra" fixo)

**Status:** ⏳ a fazer (planejada em 06/11/2026) — **pré-requisito das specs 16 (criar plano pela UI)**

## Objetivo
Pedido do usuário (06/11/2026): "não deveria ter diferença entre terra, agacho e supino e os exercícios; todos são
exercícios". Hoje três levantamentos fixos têm poderes que os outros não têm. Qualquer exercício deve poder ter
**máximo (1RM), carga em % do máximo, e1RM, gráfico de carga e RPE** — e "principal/variação/acessório" é só o **papel
do exercício dentro do treino**.

## O que está preso aos três levantamentos hoje (levantado no código)
| Onde | Dependência |
|---|---|
| `Cycle.maxes: Record<'squat'\|'bench'\|'deadlift', number>` | máximos só dos três |
| `Exercise.lift` + `liftOf()` | liga item → movimento → máximo (carga em %), miniatura de barra, pergunta "qual movimento?" |
| `loads.resolveLoad`, `plan.currentLoad` | % × `maxes[lift]` |
| `analytics.ts` (`mainLoadSeries`, `e1rmSeries`, `activationRpeByWeek`), `analises.tsx` | gráficos e cores fixos por `LIFTS` |
| `rules.ts` (542 linhas, ~32 usos) + `RuleParams` | portões por levantamento; regras só do terra (4ª série, falha para o levantamento, pegada) |
| `reorder.attachSingles` | pareia single → principal pelo movimento |
| `ajustes.tsx`, `AppData`, `report.ts`, `import_plan.py` | máximos, relatório e importador |

## Decisões propostas
1. **Formato `fitapp.cycle/v2`** (v1 continua sendo lido e convertido):
   - `maxes: Record<exerciseId, kg>` — máximo **por exercício**; qualquer exercício pode ganhar um.
   - `PrescribedItem.maxOf: exerciseId | null` — de qual máximo vem o % (a variação "Supino pausa 3s" aponta para o
     máximo do supino de competição; sem `maxOf`, usa o do próprio exercício, se houver).
   - `PrescribedItem.parentId` passa a ligar **single → principal** (hoje só back-off/duplas usam), no lugar de parear por movimento.
   - `Exercise.lift` e a categoria `powerlifting` somem.
2. **Regras do treinador viram opcionais por ciclo:** `ruleParams: RuleParams | null`. Planos criados pela UI começam
   **sem regras** (sem alertas do treinador); o plano importado continua com elas. `gates.lifts` passa a usar `exerciseId`;
   as regras "só do terra" viram parâmetros por exercício (`fourthSet`, `failStopsExercise`, `grip`) em vez de `'deadlift'` no código.
3. **Análises por exercício principal:** "Carga dos principais" e e1RM agrupam todo exercício que aparece como `main`
   (cor pela ordem fixa da paleta, legenda quando 2+). O termômetro do single lê o single pelo `parentId`.
4. **Tela de máximos** (hoje em Ajustes): lista de exercícios com máximo + "Adicionar máximo" (qualquer exercício).
   O rodapé "Máximos: agacho 200 · supino 170 · terra 240" vira a lista dos máximos do ciclo.
5. **Migração** `migrateCycleV1ToV2` (função pura, com testes) aplicada em: migração do banco (v8: reescreve `cycles.data`
   e as chaves `maxes:<cycleId>` em `settings`), importação (JSON do Claude/arquivo) e restauração de backup.
   Cada levantamento vira o `exerciseId` do seu principal; itens do mesmo movimento ganham `maxOf` dele.
6. **Sem pergunta de movimento** ao adicionar exercício: a folha de tipo termina em Acessório/Variação/Principal
   (remover `needsLift`, `ADD_KINDS` com movimento).

## Plano de execução (em PRs/commits pequenos, testes verdes a cada um)
- [ ] **15a — Teste de regressão dourado:** capturar alertas, cargas do dia e séries das Análises do plano atual
  (`assets/plan/ciclo_out26_jan27.json`) antes de mexer; o resultado tem que ser idêntico depois.
- [ ] **15b — Tipos v2 + `migrateCycleV1ToV2` + testes**; importador Python emite v2; docs (`formato-ciclo.md`, `claude-treinador.md`).
- [ ] **15c — Cargas:** `resolveLoad`/`currentLoad` por `maxOf`; `set_max` do Claude por `exerciseId`.
- [ ] **15d — Regras:** `RuleParams` por `exerciseId`; `ruleParams` opcional; regras do terra parametrizadas.
- [ ] **15e — Análises e telas:** gráficos por principal; tela de máximos; fim da pergunta de movimento; `attachSingles` por `parentId`.
- [ ] **15f — Banco v8 + backup:** migra `cycles.data`/`settings`; restaura backups antigos.
- [ ] Verificação: testes (incl. dourado), `tsc`, lint, simulador com banco antigo (migração real), iPhone.

## Riscos
- **É a mudança maior do roteiro** (regras de ~540 linhas, formato do ciclo, banco, Claude). Por isso em 15a–15f.
- Quebrar o plano em uso: migração é uma via só; fazer **backup automático** (exportar JSON) antes de migrar o banco.
- Claude/treinador: ajustes (`fitapp.adjustments/v1`) com `set_max` por movimento continuam aceitos (traduzidos para o exercício de referência).
