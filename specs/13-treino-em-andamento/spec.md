# 13 — Treino em andamento: iniciar, não perder, cancelar

**Status:** 🟡 feito, falta verificar no iPhone (planejada e feita em 06/11/2026)

## Objetivo
Hoje o treino "existe" quando a primeira série é marcada e a duração conta daí, mesmo dias depois (já apareceu
"72h"). O usuário quer: **Concluir só ativo com o treino iniciado**, **nunca perder um treino em andamento** ao
fechar o app e **poder cancelar** um treino no meio.

## Situação atual (levantada no código)
- Cada série vai para o SQLite no ato (`insertSets`), então **fechar o app não perde séries**. O que falta é o
  app *lembrar que há um treino em andamento* e mostrá-lo.
- `session_logs.status` já tem `in_progress | done`, mas é criado por `ensureSessionLog` no primeiro toque e não guarda
  hora de início/fim; `WorkoutStats` usa a hora da primeira série (`sessionStats.startedAt`).
- Não existe "descartar treino": só apagar série a série.

## Decisões propostas
- **Início explícito ou implícito:** botão **"Iniciar treino"** no lugar do Concluir (Hevy faz assim) e, se o usuário
  marcar uma série sem iniciar, o treino inicia sozinho. `started_at` grava a hora. Concluir só habilita com treino iniciado
  e ≥ 1 série registrada (concluir sem série = descartar).
- **Banco v7:** `session_logs.started_at` e `ended_at` (TEXT, nulos nos antigos; `COALESCE` com a 1ª série para os já gravados).
  Migração nova (não editar as publicadas).
- **Cancelar = "Descartar treino"** (menu ⋯ do cabeçalho), com confirmação mostrando quantas séries serão apagadas; apaga
  `session_logs` e `set_logs` (cascata já existe) e a ordem/contagens do dia (`settings`). Sem lixeira de recuperação.
  Alternativa descartada: marcar como `discarded` e esconder — acumula lixo e confunde as análises.
- **Não sumir:** ao abrir o app, se há `session_log` `in_progress` com `started_at` recente, a tela Hoje abre **nele**
  (não no dia do calendário) e as outras abas mostram uma faixa "Treino em andamento · 42:10" que volta para ele
  (como o Hevy). Duração = agora − `started_at`.
- **Treino esquecido aberto:** se `started_at` tem mais de 6 h, a faixa pergunta "Ainda treinando?" com Concluir (hora
  da última série como fim), Continuar ou Descartar. Evita o "72h".
- **Duração concluída** passa a ser `ended_at − started_at` (ou a última série), e não cresce depois de concluir.

## Decisões do usuário (06/11/2026)
- **Um treino por vez.** Iniciar ou marcar série em outro dia com um treino em andamento mostra o aviso "Já existe um treino em
  andamento" (Ver treino, Descartar, Voltar). Concluído pode ser editado e reaberto sem conflito.
- **Treino em andamento como no Hevy:** cartão flutuante acima da barra de abas, em todas as abas menos a Hoje: bolinha verde,
  "Treino 34:12", nome do treino, seta para abrir e lixeira para descartar (`FloatingBars`).

## O que foi feito
- `src/domain/workout.ts` (`isActiveWorkout`, `workoutDurationSec`, `isStale`, `formatClock`) com testes.
- Banco v7: `session_logs.started_at` / `ended_at`. Backfill: início = 1ª série, fim (concluídos) = última; treinos "em andamento"
  sem série nas últimas 6 h voltam a "não iniciado" (as séries ficam; é só tocar em Iniciar de novo ou descartar).
- `repo.ts`: `getActiveWorkout`, `startSession`, `finishSession`, `reopenSession`, `discardSession` (apaga séries e ajustes do dia),
  `countSets`, `lastSetAt`. `AppData.activeWorkout`.
- Cabeçalho da Hoje: **Iniciar** → **Concluir** (+ lixeira) → **Reabrir**. Concluir sem série pergunta se descarta. O primeiro
  registro de série inicia o treino sozinho. Duração = fim − início; não cresce depois de concluir; "—" antes de iniciar.
- Treino esquecido (> 6 h): a barra mostra "Ainda treinando?" (Continuar, Concluir com a hora da última série, Descartar).

## Plano de execução
- [x] Domínio (testes)
- [x] Banco v7 + funções do repositório
- [x] Cabeçalho Iniciar / Concluir / Reabrir + lixeira; barra flutuante nas abas; um treino por vez
- [x] Reabrir mantém `started_at`
- [x] Verificação no simulador (escuro): migração, Iniciar, aviso de segundo treino, "Ainda treinando?" → Concluir (fim = última série)
- [ ] Não verificado: iPhone; fechar e reabrir o app no meio de um treino recente; Reabrir; Descartar pela barra; tema claro

## Perguntas em aberto
- (resolvida) Dois treinos ao mesmo tempo: **não**, só um por vez.
