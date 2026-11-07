# 13 — Treino em andamento: iniciar, não perder, cancelar

**Status:** ⏳ a fazer (planejada em 06/11/2026)

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

## Plano de execução
- [ ] Domínio: estado do treino (`naoIniciado | emAndamento | concluido`), `workoutDuration`, `isStale` (testes)
- [ ] Banco v7 + `startSession`, `finishSession`, `discardSession`
- [ ] Cabeçalho: Iniciar / Concluir desativado / ⋯ Descartar; faixa de treino em andamento nas abas
- [ ] Reabrir treino concluído (já existe) mantém `started_at`
- [ ] Verificação: simulador (fechar e reabrir o app no meio do treino), testes, tsc, lint

## Perguntas em aberto
- Treino de outro dia pode estar em andamento junto com o de hoje? Proposta: **só um** em andamento por vez (iniciar outro
  pergunta se descarta ou conclui o atual).
