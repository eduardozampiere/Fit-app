# 01 — Plano importado, tela Hoje, registro de séries e cronômetro

**Status:** 🟡 feito, falta verificar no iPhone

## Objetivo
Levar o ciclo da planilha para o app e registrar o treino entre séries com o mínimo de toques. O fluxo
principal é "abrir o app → Hoje → Feito conforme o plano".

## Escopo
- Entra: importação da planilha, máximos editáveis com recálculo por %, tela Hoje, registro série a
  série, cronômetro de descanso com notificação, calculadora de anilhas, regras do plano visíveis.
- Não entra: edição do plano (feita na feature 07), regras automáticas (feature 04).

## Decisões
- **Formato único de ciclo** (`fitapp.cycle/v1`): a planilha e o Claude geram o mesmo JSON.
- **Detecção do tipo de item** no importador: nome ("— single de ativação", "— walkout"), dois espaços
  no início (back-off/duplas), obs "principal" ou título do dia ("Terra Pesado").
- **Recálculo por %** só para itens `pctBased` e só quando o máximo do movimento difere do máximo do
  plano. Assim a carga da planilha é preservada exatamente; o stiff não é por %.
- **"Conforme o plano"** grava o início da faixa (2-3x → 2 séries; 8-12 → 8 reps) e **sem RPE**.
- **Cronômetro:** topo da faixa de descanso do plano. Notificação local agendada, vibração com o app aberto.
- **Data do registro** = dia em que foi feito, não o dia planejado (treino de segunda feito na terça).
- Anilhas padrão: 25, 20, 15, 10, 5, 2,5 (sem 1,25); barra de 20 kg; ambos configuráveis.

## Arquivos
- `tools/import_plan.py`, `tools/test_import_plan.py`, `assets/plan/ciclo_out26_jan27.json`, `data/ciclo_out26_jan27.xlsx`
- `src/domain/`: `types.ts`, `plan.ts`, `loads.ts`, `logging.ts`, `rpe.ts` (tabela RTS e e1RM), `plates.ts`, `format.ts`, `dates.ts`
- `src/db/schema.ts` (v1), `src/db/repo.ts`
- `src/app/(tabs)/index.tsx` (Hoje), `src/components/ExerciseCard.tsx`, `SetEditor.tsx`, `PlateCalculator.tsx`, `RestTimerBar.tsx`, `src/state/RestTimer.tsx`

## Verificação
- Na nuvem: testes de domínio e do importador; um teste confere que o recálculo com os máximos originais
  reproduz todas as cargas da planilha. Telas conferidas na prévia web (claro e escuro).
- No iPhone: falta. Ver o roteiro em [02-instalacao-iphone](../02-instalacao-iphone/spec.md#roteiro-de-teste-no-iphone).

## Andamento
| Data | Nota |
|---|---|
| 03/11/2026 | Implementado (`a035494`). |
