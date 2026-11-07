# 12 — Single dentro do principal, arraste livre das folhas e lixeira

**Status:** 🟡 feito, falta verificar no iPhone

## Objetivo
Pedidos do usuário (06/11/2026): (1) o single de ativação não precisa ser um exercício à parte, deve ser um
tipo de série no mesmo exercício; (2) controlar o arraste das folhas de baixo para cima; (3) a lixeira de
apagar série estava com defeito.

## Escopo
- Entra:
  - **Single como linha "S" do principal.** Na tela Hoje, o item `activation_single` aparece como a primeira
    linha de trabalho do cartão do principal do mesmo movimento (depois do aquecimento, antes das séries 1…n),
    com a mesma tabela (KG, REPS, RPE, ✓). Sem cartão, nome, menu ou botões próprios.
  - **Folhas que seguem o dedo** (`BottomSheet`): ficam onde forem soltas; só fecham se passarem de 60% da altura
    ou forem puxadas rápido para baixo; um arremesso rápido para cima volta à posição aberta.
  - **Lixeira** da linha deslizada: o ícone ficava cortado (escala em torno do meio da linha).
- Entra também (pedido de 06/11): **escolher o tipo ao adicionar exercício** (ver abaixo).
- Não entra: mudar o formato do ciclo (`fitapp.cycle/v1`) ou o banco; criar o tipo "single" na folha de tipo de série.

## Decisões
- **Só apresentação, os dados não mudam.** O single continua sendo um item do plano (`kind: activation_single`,
  com carga, RPE e séries próprios). Assim o termômetro do single (regra de RPE), as análises, o importador,
  os registros já gravados e o pacote do Claude seguem iguais. A fusão é a função pura `attachSingles`
  (`src/domain/reorder.ts`): o bloco do single vai para o bloco do **próximo** principal do mesmo movimento;
  sem principal depois dele, o single continua sozinho, como cartão.
- **"S" não entra na folha de tipo de série.** O tipo vem do item (`activation_single`), não de uma coluna nova
  no banco (v6 continua). Alternativa descartada: `set_type = 'single'` — exigiria transferir o plano do single
  para dentro do principal e refazer regras e análises, sem ganho na tela.
- **Ordem do dia:** o bloco usa o id do single como chave (era o que a ordem salva já usava quando ele era um cartão).
- **Arraste livre:** a folha pode ficar parcialmente abaixo; tocar no fundo ainda fecha. Um estado de "meia altura"
  fixo (dois pontos de parada) foi descartado: o usuário pediu para soltar onde quiser.

## O que diferencia os tipos de exercício (resposta ao usuário)
- **Principal / Variação** são os levantamentos do powerlifting (e a variação de cada um): têm carga em % do
  máximo, RPE alvo, coluna de RPE na tabela, descanso padrão longo (4–5 min) e alimentam as Análises (carga dos
  principais, e1RM) e as regras do treinador. Para isso o exercício precisa ter o movimento (`lift`: agacho,
  supino ou terra).
- **Acessório:** sem % do máximo, descanso de 1,5 min, fora das análises dos levantamentos. **Core / mobilidade:**
  igual, mas não conta no volume. **Single de ativação** (agora linha "S") **e back-off / duplas** são séries
  especiais de um principal.
- **Como adicionar:** "Adicionar exercício" → escolhe o exercício → folha **Tipo**: Acessório, Variação ou Principal.
  Principal/Variação de um exercício que ainda não tem movimento perguntam **qual** (agacho, supino, terra) e
  gravam o movimento no exercício do ciclo (aí ele entra nas Análises). Um exercício que o ciclo já conhece com
  movimento não pergunta e mantém o dele. O tipo também muda em Plano → ⋯ → editar, ou pelo Claude (`edit_item`).
  Funções: `addExerciseToSession(…, {kind, lift})`, `needsLift`, `ADD_KINDS` em `adjustments.ts`.

## Plano de execução
- [x] `attachSingles` + teste
- [x] `SetTable` (`single`, `beforeWork`), `ExerciseCard` (`rowsOnly`, `before`), tela Hoje (`cardProps`)
- [x] `BottomSheet` com arraste livre; `SwipeToDelete` com o ícone no canto
- [x] Verificação: testes, `tsc`, lint, simulador (escuro)

## Arquivos
- `src/domain/reorder.ts` (`attachSingles`), `src/domain/__tests__/set-table.test.ts`.
- `src/components/SetTable.tsx`, `ExerciseCard.tsx`, `src/app/(tabs)/index.tsx`.
- `src/components/ui.tsx` (`BottomSheet`), `src/components/SwipeToDelete.tsx`.

## Critérios de pronto
- Segunda-feira da semana 2: o cartão "Agachamento (High Bar)" mostra "S 170×1" antes da série 1, e não há cartão
  separado do single.
- Marcar o ✓ do "S" registra a série do item do single, pede o RPE e inicia o descanso.
- A folha fica onde foi solta e fecha ao passar de 60% ou com puxão rápido.

## Verificação
- Simulador do iOS 27 (escuro): "S" dentro do cartão (visual e ✓ → RPE?, desmarcar), folha ficando parcialmente abaixo.
- Não verificado: iPhone; lixeira depois da correção (o código do ícone mudou, o gesto não foi repetido); tema claro;
  remover a linha "S" pela lixeira (depois não há como recolocá-la pelo cartão).

## Andamento
| Data | Nota |
|---|---|
| 06/11/2026 | Feito. Single como linha "S", folhas com arraste livre, ícone da lixeira no canto. |
| 06/11/2026 | Tipo na hora de adicionar exercício (folha Tipo → movimento), com testes; conferido no simulador (escuro) até a folha do movimento, sem confirmar a adição. |
