# 09 — Descanso editável e troca de exercício (catálogo)

**Status:** 🟡 feito, falta verificar no iPhone

## Objetivo
Na tela Hoje, o descanso estava fixo (vinha do plano ou do padrão do tipo) e o exercício não dava para
trocar (a máquina ocupada, a dor, a falta de equipamento). O usuário quer ajustar o tempo na hora e
trocar o exercício escolhendo de uma lista de exercícios pré-cadastrados, como no Hevy.

## Escopo
- Entra:
  - Editar o tempo de descanso de um exercício direto no cartão (toque na linha "Descanso").
  - Trocar o exercício por um do catálogo (413 exercícios em português, com grupo muscular e equipamento)
    ou por um exercício novo com nome livre.
  - Aproveitar o projeto `~/hevy-ia` (ver "O que veio do hevy-ia").
- Não entra:
  - Imagem dos exercícios no catálogo — entrou na [feature 10](../10-cabecalho-e-adicionar-exercicio/spec.md).
  - Escolher do catálogo na aba Plano (o `ItemEditor` continua com campo de texto) — fica no backlog.
  - Análises por grupo muscular (os dados já estão no catálogo; a tela fica para depois).

## O que veio do hevy-ia
Projeto: API Python/FastAPI + Postgres (drizzle) com usuários, periodizações geradas por LLM, RAG e chat.
- **Aproveitado:** `exercices.csv` (413 exercícios com equipamento, músculo principal e secundário) e a
  normalização `muscle_groups` / `equipment` → viraram filtros no seletor. O CSV foi copiado para
  `data/catalogo-hevy-ia.csv` e `tools/import_catalog.py` gera `assets/catalog/exercicios.json`.
- **Já tínhamos:** `set_type` (`warmup` = coluna `warmup` da v5; `failure` = `failed`). `dropset` não entrou.
- **Descartado:** `users`, `agents`, `periodizations`, `chats`, `knowledge_files`, `cycle_insights` (backend,
  Cognito, S3, pgvector): o app é offline e o Claude é o treinador por fora (ver CONTEXTO.md). `planned_sets`
  guarda uma linha por série; o `PrescribedItem` do app (faixas de séries, reps, RPE e descanso) é mais rico.
- **Tradução:** os nomes em inglês foram traduzidos para o português do Brasil em `tools/catalogo_pt.txt`
  (o nome original fica em `nameEn` e também entra na busca).

## Decisões
- **Descanso é um ajuste por exercício, não uma edição do plano.** Fica em `settings['rest-overrides']`
  (`{ [exerciseId]: segundos }`), vale para os próximos treinos desse exercício e tem "Voltar ao plano".
  Motivo: o plano tem um item por semana, então editar o item só valeria até a semana seguinte; e é uma
  preferência de quem treina (como a barra da calculadora, `bar:<exerciseId>`), não uma decisão do treinador.
  O backup já leva `settings`. Alternativa descartada: reescrever o descanso em todas as semanas do plano.
- **Descanso no cartão:** sem ajuste, mostra o texto do plano ("4-5 min"); com ajuste, "3 min · seu ajuste".
  O cronômetro usa o valor do ajuste ou, sem ele, o topo da faixa do plano (como antes).
  O editor é uma folha de baixo para cima com a altura do conteúdo (`BottomSheet`, base também do
  `ActionMenu`) e uma roda de tempos (`WheelPicker`, só JavaScript) de 15 s a 15 min, de 15 em 15 s, como o
  timer do Hevy; "Concluído" salva. Formato "2min 15s" (`formatRestDuration`).
- **Trocar exercício passa pelo mesmo caminho de edição do plano:** `ItemPatch` ganhou `exerciseId`
  (junto de `name`) e o `edit_item` o aplica; o Claude também pode usar. Exercício que ainda não está em
  `cycle.exercises` é cadastrado ali (categoria `accessory`, ou `core` para abdominais) e na tabela `exercises`.
- **Dois alcances:** "Só neste treino" (o item do dia) ou "Daqui para frente" (este item e os itens do mesmo
  exercício nas semanas seguintes). O padrão é só neste treino.
- **Séries já registradas** do item trocado passam para o exercício novo (`set_logs.exercise_id`), senão o
  histórico ficaria dividido entre dois exercícios dentro do mesmo item.
- **Exercício do catálogo com o mesmo nome de um que o ciclo já tem** reaproveita o id do ciclo (igualdade
  exata do nome ou do slug), para as análises não separarem o mesmo exercício em dois.
- **Os três movimentos:** trocar um item de agacho/supino/terra para um exercício do catálogo tira o movimento
  do item (`lift = null`): some o recálculo da carga por % e as regras desse movimento. O seletor avisa.
- Sem migração: o catálogo é um arquivo do app e os ajustes vão em `settings`.

## Plano de execução
- [x] Spec, `tools/import_catalog.py`, `assets/catalog/exercicios.json`
- [x] Domínio: `catalog.ts` (busca, filtros, rótulos, id), `restSeconds` com ajuste, `swapExercise`; testes
- [x] Banco: `saveCycleData` grava exercícios novos; `retagSetLogs`; chave `rest-overrides`
- [x] Telas: `RestEditor`, `ExercisePicker`, linha de descanso tocável, ⋮ "Trocar exercício"
- [x] Verificação: testes, `tsc`, lint, simulador
- [x] Atualizar CONTEXTO.md, PLANO.md, `docs/claude-treinador.md` (campo `exerciseId` no patch)

## Arquivos
- `data/catalogo-hevy-ia.csv`, `tools/catalogo_pt.txt`, `tools/import_catalog.py` — fonte e gerador.
- `assets/catalog/exercicios.json` — catálogo (`fitapp.catalog/v1`).
- `src/domain/catalog.ts` — tipos, rótulos, busca e conversão para `Exercise`.
- `src/domain/plan.ts` — `restSeconds` com ajuste.
- `src/domain/adjustments.ts` — `exerciseId` no `ItemPatch`.
- `src/db/repo.ts` — `restOverridesKey`, `retagSetLogs`; `saveCycleData` grava exercícios novos.
- `tools/test_import_catalog.py` — tradução completa, ids únicos, JSON em dia.
- `src/components/RestEditor.tsx`, `src/components/ExercisePicker.tsx` — folhas novas.

## Critérios de pronto
- Toco em "Descanso" de um exercício, escolho 2:30 e o cronômetro da próxima série usa 2:30.
- No ⋮ do exercício, "Trocar exercício" abre a lista, busco "puxada", escolho e o cartão passa a mostrar o novo.
- Séries já marcadas continuam na tabela, agora no exercício novo.

## Verificação
- Na nuvem: testes de domínio, importador, tipos, lint.
- No Mac: simulador do iOS 27.
- No iPhone: lista com a mão suada e teclado aberto.

## Andamento
| Data | Nota |
|---|---|
| 05/11/2026 | Spec criada; catálogo gerado a partir do `exercices.csv` do hevy-ia. |
| 05/11/2026 | Editor do descanso refeito como folha parcial com roda de tempos (pedido do usuário, a partir de capturas do Hevy). Conferido no simulador: abre na posição do valor atual, rola e encaixa (2:15 → 2:45), "Concluído" gravou 165 s. |
| 05/11/2026 | Feito e conferido no simulador: descanso 2:15 salvo e mostrado "seu ajuste"; troca de "Tríceps francês no cabo" por "Tríceps corda (Polia)" (só neste treino) e depois por "Tríceps pulley"; série já marcada acompanhou o exercício no banco; exercício novo entrou na tabela `exercises`. O alcance "Daqui para frente" está só nos testes de domínio. Não verificado: cronômetro com o ajuste, tema escuro, iPhone. |
