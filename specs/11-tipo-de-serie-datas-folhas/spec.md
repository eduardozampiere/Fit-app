# 11 — Tipo de série, datas e folhas que fecham arrastando

**Status:** 🟡 feito, falta verificar no iPhone

## Objetivo
Pedidos do usuário (capturas do Hevy, 05/11/2026): (1) tocar no número da série abre "Selecionar tipo de
série"; (2) datas no formato "05 nov" / "05 nov, 2025"; (3) nenhum modal com botão Cancelar: todos fecham
arrastando para baixo; (4) cabeçalho do treino mais enxuto.

## Escopo
- Entra: tipos de série (aquecimento, normal, até a falha, drop set), datas, folhas sem Cancelar, ajustes do cabeçalho.
- Não entra: `failure` e `dropset` na exportação para o Hevy e na importação (o importador do Hevy ainda trata tudo
  que não é aquecimento como normal); análises por tipo de série.

## Decisões
- **Tipo de série:** coluna nova `set_logs.set_type` (`normal` | `failure` | `dropset`, padrão `normal`; **migração v6**).
  O aquecimento continua na coluna `warmup` (v5): "tipo" para a tela é `choiceOf` = aquecimento ou `setType`.
  `failed` (não completou a repetição) é outra coisa e continua no editor de detalhes.
- **Folha "Selecionar tipo de série"** (`SetTypeSheet`): A aquecimento (laranja), número normal, F até a falha
  (vermelho), D drop set (azul), com "?" que explica cada um; mais "Detalhes (RPE, pegada, cinto, falha)" (o único
  caminho para o editor da série, por isso ficou) e "Remover série" em vermelho.
  Na tabela a letra F/D substitui o número da série; A continua no aquecimento (a captura do Hevy usa W).
- **Linha ainda não registrada:** o tipo escolhido (F/D) fica em memória da tela e vale quando a série é marcada; some
  se o app fechar antes ou se uma linha do exercício for removida/movida (os números mudam).
- **Passar entre aquecimento e trabalho:** a série vai para o fim do outro grupo e as seguintes do grupo de origem sobem
  uma posição; as contagens de linhas do dia acompanham (`moveSetToGroup`, `renumberAfterRemoval`).
- **Descanso:** aquecimento e drop set não disparam o cronômetro (`startsRest`); normal e até a falha disparam.
- **Datas** (`formatDate`): "05 nov" no ano corrente, "05 nov, 2025" nos outros; gráficos incluídos. O texto do pacote
  para o Claude continua `dd/MM` (`formatDayMonth`), porque não deve depender do ano em que é gerado.
- **Folhas:** `SheetHeader` perdeu o Cancelar (só "Voltar" para voltar de um passo dentro da folha, ex.: quantidade do
  alimento). Folhas de tela quase cheia (`pageSheet`) já fecham arrastando no iOS. As folhas baixas (`BottomSheet`:
  menus, descanso, tipo de série, avisos, nome de refeição) têm alça e fecham arrastando (por qualquer ponto nos
  menus; só pela alça onde há rolagem, como a roda do descanso) ou tocando no fundo. A caixa de nome virou folha.
  **Exceção:** a tela vermelha de alarme da lombar (`RedFlagModal`) mantém o botão, por segurança. Alertas do sistema
  (`Alert`, ex.: confirmar uma importação) também ficam como estão.
- **Cabeçalho do treino (versão final, padrão do Hevy):** só botões, à direita: símbolo de atenção (só quando a semana
  tem avisos), timer e Concluir. Duração · Volume · Séries ficam **fora do cabeçalho**, numa linha no topo da lista
  (rolam com ela). Sem o nome do treino (linha discreta abaixo dos dias). O aviso da semana (ex.: Finados) abre numa
  folha pelo símbolo. A duração sempre mostra os segundos ("1h 5min 13s").
- **Pílulas finas em todo o app:** `Chip` com 30 pt de altura e fonte 13 (área de toque de 44 pelo `hitSlop`). Fileiras
  de pílulas rolam na horizontal (`ChipRow`: Análises, Corpo, tela do exercício). Fontes da aba Plano reduzidas.
- **Gráficos:** linha e barras usam a mesma moldura (`ChartFrame`): o desenho sai da margem do cartão, altura 240.
- **Ordem da tela Hoje:** seletor de semana, seletor de dia (com o nome do treino), números do treino (Duração · Volume · Séries).

## Plano de execução
- [x] `formatDate`, troca em todas as telas e nos gráficos; testes
- [x] `SheetHeader` sem Cancelar; `BottomSheet` com alça e arraste; `ActionMenu` sem Cancelar
- [x] Migração v6, `setTypes.ts`, `moveSetToGroup`/`updateSetType`, `SetTypeSheet`, tabela e tela Hoje
- [x] Cabeçalho enxuto, folha de avisos, segundos sempre
- [x] Verificação no simulador (claro e escuro)

## Arquivos
- `src/domain/setTypes.ts`, `src/domain/format.ts` (`formatDate`, `formatWorkoutTime`), `src/db/schema.ts` (v6), `src/db/repo.ts`.
- `src/components/SetTypeSheet.tsx`, `ui.tsx` (`BottomSheet`, `SheetHeader`, `ChipRow`, `StatRow`), `WorkoutHeader.tsx`.

## Verificação
- Simulador do iOS 27 (claro e escuro): folha de tipo, F gravado no banco (`set_type = failure`), série passada para
  aquecimento (contagens e numeração certas), folhas baixas e `pageSheet` fechando arrastando, cabeçalho com horas.
- Não verificado: iPhone; fechar a folha de nome de refeição e os modais de comida arrastando.

## Andamento
| Data | Nota |
|---|---|
| 05/11/2026 | Feito e conferido no simulador, claro e escuro. |
| 05/11/2026 | Pedido: gráfico da tela do exercício maior e igual ao das Análises; ordem da tela Hoje = semana, dia, números do treino. Feito: `ChartFrame` único em `charts.tsx` (largura toda do cartão, altura 240, margem direita igual para uma ou várias séries; rótulo do fim da linha sempre acima do ponto, nome da série quando há 2+); `WorkoutStats` desceu para depois do seletor de dia. Conferido no simulador (escuro). |
| 05/11/2026 | Pedido: pílulas finas, fonte menor no Plano, cabeçalho só com botões e números fora dele. Feito e conferido (claro e escuro). |
