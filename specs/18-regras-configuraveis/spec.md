# 18 — Regras do treinador configuráveis pela interface (antes "15b")

**Status:** ⏳ a fazer (planejada em 06/11/2026) — depende da spec 15; **escopo a detalhar com o usuário antes de começar**

## Objetivo
Pedido do usuário (06/11/2026): "generalizar todas as regras e configurar pela interface". Qualquer periodização pode ter
regras (portões, freio, deload etc.), criadas e editadas na tela, sem importar planilha nem depender do Claude.

## Inventário das regras atuais (`src/domain/rules.ts`, `RuleParams`)
| Regra | Depende de exercício/máximo? | Parâmetros hoje |
|---|---|---|
| Freio (RPE acima do alvo) | por máximo | `brake.rpeOverTarget` |
| Portões (semana-portão: libera ou recua a carga) | por máximo | `gates.weeks`, `gateWeek`, por máximo: `gateLoad`, `maxRpe`, `nextLoad`, `fallbackLoad` |
| Fadiga do single de ativação | por máximo (single→principal) | `activationSingle.fatigueRpe`, `suggestSkipWeeks` |
| Revisão de máximo | por máximo | `maxReview.afterWeek`, `applyWeeks`, `rpeBelowTarget`, `incrementKg` |
| 4ª série liberada (hoje só terra) | por exercício/máximo | `fourthSet.weeks`, `maxRpeThirdSet` |
| Falha encerra o levantamento (hoje só terra) | por máximo | `failStopsLift` |
| Pegada (hook/strap, hoje só terra) | por máximo | `grip.*` |
| Deload sob demanda | **global** (check-ins + RPE) | `deloadOnDemand.*` |
| Dor 24 h / sinais de alarme | **global** (check-ins) | limites |

## Ideias para a entrevista (decisões a tomar antes de implementar)
- Tela **"Regras"** na periodização: lista de cartões (liga/desliga) com os parâmetros; cada regra por máximo escolhe a quais máximos vale.
- **Ligar regra a máximo ou a exercício?** (proposta: a máximo, que já é a "família" da carga.)
- **Padrões prontos** (modelo "Powerlifting 14 semanas" com as regras atuais) e **regras personalizadas** (ex.: "se RPE do último set ≥ X em N sessões, sugerir −Y%").
- Regras globais (deload, dor) numa seção própria, ligadas por padrão em periodizações novas?
- Como o Claude enxerga/edita as regras (hoje `fitapp.adjustments/v1` não tem operação para elas).

## Plano de execução
- [ ] Entrevista de escopo com o usuário (itens acima)
- [ ] Domínio: regras como dados (`RuleParams` por máximo) + testes; editor puro de parâmetros
- [ ] Telas: lista de regras, edição, modelos
- [ ] Docs, CONTEXTO, PLANO
