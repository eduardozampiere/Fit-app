# 08 — Visual inspirado no Hevy

**Status:** 🔨 em andamento (fases 1 a 3 feitas)

## Objetivo
O visual atual (cartões arredondados em tudo, botões pesados, muitos chips coloridos) não agrada. A meta
é um visual limpo e plano no estilo do Hevy, que o usuário já conhece: seções separadas por linhas finas,
azul só nas ações e nos nomes dos exercícios, e o registro numa **tabela de séries** com edição na própria
linha. O fluxo "Treino feito conforme o plano" e as regras de segurança continuam como estão.

## Escopo
- Entra: tokens de tema (cores, tipografia, espaçamento, raios), componentes base, tabela de séries com
  edição inline, cabeçalho do exercício, resumo do treino (tempo, volume, séries) e o novo visual em todas
  as telas, em fases.
- Não entra: ilustrações ou animações de exercícios, logo, nome ou qualquer ativo do Hevy (só os padrões
  de interface servem de referência); feed social; fotos de progresso; mudar regras, banco ou formatos de
  dados.

## Referência (o que copiar do Hevy como padrão de interface)
Tirado das capturas da App Store (03/11/2026):
- **Tela de treino:** barra de resumo no topo (*Tempo · Volume · Séries*: rótulo pequeno cinza, valor
  abaixo); cada exercício tem miniatura redonda, nome em azul, menu ⋮, nota em texto corrido e uma linha
  azul com o tempo de descanso.
- **Tabela de séries:** colunas `SÉRIE · ANTERIOR · KG · REPS · ✓`. A linha concluída fica com fundo
  verde claro e o check verde; a pendente tem o check cinza. Embaixo, "+ Adicionar série" num botão
  cinza de largura total.
- **Rotinas:** cartão com o título, os exercícios em cinza numa linha e o botão azul "Iniciar rotina".
- **Análises e medidas:** um gráfico por vez, com linha azul e pontos, grade leve e seletores em pílula
  abaixo (selecionado = azul preenchido). O histórico fica em lista com divisórias.
- **Geral:** fundo branco (escuro quase preto no modo escuro), botões secundários cinza-claros, título
  centralizado no topo com ← e ação à direita, peso de fonte 600 (não 800).

## Decisões
- **Edição inline na tabela** (escolha do usuário, 03/11/2026). Tocar em KG ou REPS abre o teclado
  numérico na própria célula. Com as células vazias, o ✓ registra conforme o plano (o comportamento de hoje).
  Com valores digitados, o ✓ grava com `asPlanned: false`. RPE, pegada, cinto, falha e observação saem
  da tela cheia e vão para um menu da série, aberto ao tocar no número da série.
- **Adicionar e remover séries** (pedido do usuário, 03/11/2026): "+ Adicionar série" embaixo da
  tabela e "Remover série" no menu da série. O número de séries do dia fica em
  `settings['set-counts:<sessão>']` (por item), sem mudar o plano; "conforme o plano" completa até esse
  número. Remover uma série do meio apaga a gravada e renumera as seguintes (`renumberAfterRemoval`).
  Desmarcar o ✓ apaga a série, mas mantém a linha.
- **Barra da calculadora** (pedido do usuário): os Ajustes têm a lista de barras da academia (padrão
  20/15/10) e a barra padrão; a calculadora mostra as barras em pílulas e lembra a escolha por exercício
  (`settings['bar:<exerciseId>']`).
- **Menus** (série, ⋮ do exercício, RPE) usam um `ActionMenu` próprio, que funciona igual no iOS e na
  prévia web. "Completar conforme o plano" saiu do cartão e foi para o ⋮.
- **Teclado:** a tela Hoje rola sozinha para a célula em edição (`automaticallyAdjustKeyboardInsets`);
  o teclado decimal aceita vírgula ou ponto (`parseDecimalInput`).
- **Coluna PLANO no lugar de ANTERIOR:** aqui a referência é a prescrição do ciclo (`150×1`), não o treino
  passado. O "anterior" pode entrar depois, no menu ⋮ do exercício.
- **Coluna RPE** só nos tipos que pedem RPE (`RPE_KINDS` de hoje). A célula do RPE pendente fica destacada
  em azul em vez da linha de chips "RPE da série N".
- **Tema segue o sistema** (escolha do usuário). Os dois temas ganham a paleta nova: claro com fundo branco
  e superfícies cinza-claras; escuro com fundo quase preto e superfícies grafite.
- **Toque na academia:** os botões principais mantêm `TOUCH` (56). As linhas da tabela têm no mínimo 48
  de altura; o check tem 36 de visual e `hitSlop` até 56. As células de entrada têm 44 de altura.
- **Ícones:** `@expo/vector-icons` (já instalado e funciona na prévia web). Não adiciona pacote nativo.
  As abas continuam com SF Symbols nas abas nativas.
- **Miniatura do exercício:** círculo com ícone por movimento (barra para agacho, supino e terra; halter
  para os acessórios). Nada de imagem do Hevy.
- **Compatibilidade:** `Card`, `BigButton`, `Chip`, `Badge`, `Stepper`, `TextField` e `SectionTitle`
  mantêm a API e mudam só o visual na fase 1, então todas as telas mudam juntas sem quebrar. Os componentes
  novos entram ao lado deles.
- **Gráficos:** continuam seguindo as regras atuais (um eixo, paleta validada, referência tracejada) e
  ganham o visual novo: linha mais fina, pontos, grade leve e seletor em pílula.
- **Por fases** (escolha do usuário): um commit por fase, cada um conferido no simulador (claro e escuro).

## Tokens novos (`src/ui/theme.ts`)
| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `bg` | `#FFFFFF` | `#0B0B0C` | fundo da tela |
| `surface` | `#F2F3F5` | `#28282B` | botão secundário, célula, pílula |
| `card` | `#FFFFFF` | `#151517` | cartão flutuante (alerta, rotina) |
| `separator` | `#E4E5E8` | `#2E2E31` | divisória fina |
| `text` / `muted` | `#111214` / `#6B7078` | `#F2F2F3` / `#9A9EA6` | texto |
| `accent` | `#2B7CF6` | `#3D8BFF` | ação principal, nome do exercício, links |
| `done` / `doneBg` | `#3FAE4F` / `#DDF6CF` | `#4CC262` / `#1D3320` | série concluída |
| `danger`, `warn` | como hoje, revisados | | falha, alertas |
| `series`, `grid`, `reference` | mantidos | | gráficos |

Novos grupos de token: `font` (`largeTitle 28/700`, `title 20/600`, `headline 17/600`, `body 16/400`,
`label 13/500`, `caption 12/600` maiúsculo), `space` (4, 8, 12, 16, 24) e `radius` (8 célula, 12 botão,
16 cartão e folha).

## Plano de execução

### Fase 1 — Base (tokens e componentes)
- [x] `theme.ts`: tokens acima, com `font`, `space` e `radius`; nomes antigos (`chip`, `border`,
  `success`, `successBg`) viraram apelidos até a fase 5
- [x] `ui.tsx`: novo visual de `BigButton` (primário azul, secundário cinza, peso 600, ícone opcional),
  `Chip` como pílula, `Card` mais leve, `TextField` preenchido sem borda (a prop `surface` saiu), `Stepper`
  com ícones
- [x] Componentes novos em `ui.tsx`: `Section` (título, ação azul "Ver tudo", divisórias),
  `ListRow` (título, valor e chevron), `StatRow` (rótulo sobre valor), `IconButton`, `Divider`
- [x] Verificação: Hoje, Comida, Corpo, Análises e Plano no simulador do iOS 27.2, claro e escuro

### Fase 2 — Tela Hoje e registro
- [x] Domínio: `sessionStats`, `setRowCount`, `plannedCountFor`, `renumberAfterRemoval`, `draftFromInput`
  (`logging.ts`), `parseDecimalInput` e `formatElapsed` (`format.ts`), `barChoices` (`plates.ts`), com
  testes em `__tests__/set-table.test.ts`
- [x] `SetTable` e `SetRow` (novos): colunas, estados (pendente, feita, falhou, bloqueada, opcional), ✓
  conforme o plano ou com os valores digitados, "+ Adicionar série" para as séries opcionais
- [x] Cabeçalho do exercício (dentro do `ExerciseCard`): miniatura, nome em azul, tipo em cinza, menu ⋮ (anilhas, editar, notas), linha de
  descanso em azul
- [x] `WorkoutStats` no topo da tela Hoje (Tempo · Volume · Séries)
- [x] `SetEditor` continua como "Detalhes da série" (RPE, pegada, cinto, falha, observação), aberto pelo menu da série
- [x] Seletor de dias, check-in e avisos (Finados, regras) como faixas compactas
- [x] Verificação no simulador: ✓ conforme o plano, carga digitada (132,5), RPE pendente destacado,
  adicionar e remover série, calculadora com barra de 15 kg, cronômetro no acessório. Falta conferir o
  bloqueio da 4ª série do terra e a falha no aparelho

### Fase 3 — Plano
- [x] Semanas em pílulas (S1…S14) e sessões da semana como cartões de rotina (título, dia, exercícios em
  cinza, botão azul "Abrir treino" ou "Ver treino" quando feito)
- [x] Edição de exercício pelo menu ⋯ do cartão (lista com `ListRow`); Ajustes e Claude como `IconButton` no topo

### Fase 4 — Análises, Corpo e Comida
- [ ] Análises: um gráfico por cartão com seletor em pílula (carga, e1RM, tonelagem, RPE), histórico em `ListRow`
- [ ] Corpo: peso no estilo "Medidas" (gráfico e histórico em lista), check-in como formulário agrupado
- [ ] Comida: refeições em `Section` e alimentos em `ListRow` com kcal e proteína à direita; totais em `StatRow`

### Fase 5 — Ajustes, Dados e modais
- [ ] Listas agrupadas no estilo de Ajustes do iOS; modais com barra Cancelar / título / Salvar
- [ ] Remover os apelidos de token antigos e os estilos que sobraram

Em todas as fases: `npm test && npm run test:import && npm run typecheck && npx expo lint`, simulador
claro e escuro, prévia web e atualização deste spec e do `PLANO.md`.

## Arquivos
- `src/ui/theme.ts`, `src/components/ui.tsx`
- Novos: `src/components/SetTable.tsx`, `ExerciseHeader.tsx`, `WorkoutStats.tsx`, `SetDetailsSheet.tsx`
- Alterados por fase: `src/app/(tabs)/*.tsx`, `src/app/ajustes.tsx`, `src/app/dados.tsx`,
  `src/components/ExerciseCard.tsx` (substituído por `ExerciseHeader` + `SetTable`), `charts.tsx`,
  `FoodModals.tsx`, `BodySections.tsx`, `AlertCard.tsx`, `RestTimerBar.tsx`
- `src/domain/logging.ts` (+ teste)

## Critérios de pronto
- Registrar um treino inteiro conforme o plano continua levando no máximo 2 toques.
- Registrar uma série diferente leva 3 toques ou menos (KG → digitar → ✓), sem abrir tela cheia.
- Nenhuma cor solta em tela (só `useTheme()`); claro e escuro conferidos em todas as telas.
- Nenhum ativo, nome ou logo do Hevy no app.

## Verificação
- Na nuvem: testes de domínio, tipos, lint, prévia web.
- No Mac: simulador do iOS 27 (`npx expo run:ios`), claro e escuro, em cada fase.
- No iPhone: legibilidade com luz forte e uso com uma mão.

## Andamento
| Data | Nota |
|---|---|
| 03/11/2026 | Spec criada a partir das capturas do Hevy na App Store. Decisões do usuário: edição inline, tema do sistema, por fases. |
| 03/11/2026 | Fase 3 feita: aba Plano com semanas em pílulas e cartões de rotina. |
| 03/11/2026 | Fase 2 feita: tabela de séries com edição inline, adicionar/remover série, resumo do treino e barra escolhida na calculadora. |
| 03/11/2026 | Fase 1 feita: tokens novos, componentes base e `@expo/vector-icons` de volta às dependências (só JS, sem entitlement novo). No escuro, `surface` subiu para `#28282B` para o botão secundário aparecer dentro do cartão. Os títulos do `ExerciseCard` ainda usam estilos próprios (fase 2). |
