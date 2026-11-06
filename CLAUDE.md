@AGENTS.md

# Regras do projeto

Responda em português do Brasil, de forma direta. Código, comentários e textos da interface em
português; nomes de variáveis, funções e tipos em inglês (como já está no código).

## 1. Antes de começar

1. Leia `specs/CONTEXTO.md` (contexto, restrições, decisões) e `specs/PLANO.md` (status e próximo passo).
2. Feature nova: copie `specs/_modelo/` para `specs/NN-nome/`, preencha o `spec.md` e adicione a linha
   na tabela do `PLANO.md` **antes** de codar.
3. Decisões já tomadas e caminhos descartados estão no CONTEXTO.md. Não reabra sem um motivo novo; se
   reabrir, registre a mudança lá.

## 2. Camadas (de dentro para fora)

```
src/domain/      regras puras: sem React, sem expo-*, sem SQLite. Só TypeScript.
src/db/          SQLite: migrações (schema.ts) e consultas (*Repo.ts). Sem regra de negócio.
src/state/       contexto e hooks que juntam db + domain (AppData, useCoach, RestTimer, files).
src/components/  peças de UI reutilizáveis. Sem acesso direto ao banco, salvo seções autocontidas.
src/app/         telas (Expo Router). Orquestram: leem estado, chamam domain/db, renderizam componentes.
```

- **Dependência só para dentro:** `app → components/state → db → domain`. `domain` não importa nada
  das outras camadas.
- **Toda regra de negócio é função pura em `src/domain`, com teste** em `src/domain/__tests__`.
  Cálculo dentro de tela ou componente é sinal de que falta uma função no domínio.
- **Regras nunca alteram o plano sozinhas:** geram `Alert`/`Suggestion`, e a aplicação é explícita
  (`applySuggestion`, `applyAdjustments`), depois que o usuário confirma.
- **Os números das regras vêm do ciclo** (`cycle.ruleParams`). Nada de número mágico de plano no código.
- **Estado imutável:** funções que mudam o plano recebem um `Cycle` e devolvem outro (veja `mapItems`
  em `rules.ts` e `mapSessions` em `adjustments.ts`).

## 3. DRY — uma fonte para cada coisa

Antes de escrever um helper, procure se já existe (`grep`). Se existir, use; se existir quase igual,
generalize o que existe em vez de copiar. Ao precisar da mesma coisa em um segundo lugar, extraia
**na hora**, não "depois".

| Precisa de… | Use (não reescreva) |
|---|---|
| Datas `YYYY-MM-DD`, somar dias, dia da semana | `src/domain/dates.ts` |
| Número, kg, faixa, data `dd/MM`, segundos (pt-BR) | `src/domain/format.ts` |
| Ler texto do plano ("4x4", "205-210", "≤8", "5 min") e valores soltos de CSV | `src/domain/parsing.ts` |
| Ler/escrever CSV | `src/domain/csv.ts` |
| Tirar acento, slug, cabeçalho de CSV | `stripAccents` / `slugify` em `src/domain/text.ts` |
| Carga por % e arredondamento | `src/domain/loads.ts` |
| Sessão do dia, semana de uma data, carga atual, descanso, lista e rótulos dos movimentos e tipos | `src/domain/plan.ts` (`weekForDate`, `LIFTS`, `LIFT_LABEL`, `KIND_LABEL`) |
| e1RM / tabela RTS | `src/domain/rpe.ts` |
| Tonelagem, séries "conforme o plano" | `src/domain/logging.ts` |
| Editar o plano (qualquer origem: tela, Claude, regra) | `applyAdjustments` / `patchItem` em `src/domain/adjustments.ts` |
| Cores, alvo de toque, tipografia, espaçamento, raios | `src/ui/theme.ts` (`useTheme`, `TOUCH`, `font`, `space`, `radius`) |
| Botão, pílula, cartão, stepper, campo de texto, seção, linha de lista, resumo em colunas, ícone, menu de ações, cabeçalho de modal | `src/components/ui.tsx` (`BigButton`, `Chip`, `Card`, `Stepper`, `TextField`, `Section`, `ListRow`, `StatRow`, `IconButton`, `ActionMenu`, `SheetHeader`) |
| Tabela de séries do treino | `src/components/SetTable.tsx` |
| Recordes, série por treino e histórico de um exercício | `src/domain/exerciseStats.ts` |
| Botão em Liquid Glass (com reserva sem iOS 26) | `src/components/GlassButton.tsx` |
| Cabeçalho do treino (duração, volume, séries) | `src/components/WorkoutHeader.tsx` + `WorkoutStats.tsx` |
| Folha de baixo para cima (menus, editor de descanso) | `BottomSheet` em `src/components/ui.tsx` |
| Catálogo de exercícios, busca e troca de exercício | `src/domain/catalog.ts` + `swapExercise` em `src/domain/adjustments.ts` |
| Descanso (padrão, ajuste do usuário, limites) | `restSeconds`, `restOverride`, `withRestOverride` em `src/domain/plan.ts` |
| Lista reordenável (segurar e arrastar) | `src/components/DragList.tsx` + `src/domain/reorder.ts` |
| Gráficos | `src/components/charts.tsx` |
| Abrir/compartilhar arquivo | `src/state/files.ts` |
| Ler/gravar ajuste | `getSetting` / `setSetting` em `src/db/repo.ts` |

Regras de DRY:
- **Uma constante, um lugar.** Listas como movimentos (`squat/bench/deadlift`), refeições, tipos de
  item e rótulos vivem no domínio e são importadas.
- **Um caminho para mudar o plano.** Tela, Claude e regras passam pelas mesmas operações
  (`AdjustmentOp`); não crie um terceiro jeito de editar o `Cycle`.
- **Estilos repetidos viram componente ou token.** Campo de texto, linha de lista, botão pequeno:
  se aparecer em duas telas, vai para `src/components/ui.tsx`.
- **O formato de dados é um só por conceito:** ciclo (`fitapp.cycle/v1`), ajustes
  (`fitapp.adjustments/v1`), backup (`fitapp.backup/v1`). Mudou o formato, atualize os tipos, o
  validador, o doc em `docs/` e os testes juntos.
- **DRY não é abstração precoce:** duas coisas parecidas por acaso, com motivos diferentes para mudar,
  ficam separadas. A pergunta é "se uma mudar, a outra tem que mudar junto?".
- Duplicação encontrada e não corrigida na hora vai para o backlog do `specs/PLANO.md`.

## 4. Padrões de código

- **TypeScript estrito**, sem `any`. Tipos do domínio em `src/domain/types.ts` (ou no módulo dono do conceito).
- **Funções pequenas e nomeadas pelo que fazem**; comentário explica o porquê, não o quê.
- **Interface sempre em pt-BR** e formatada por `format.ts` (vírgula decimal, ponto de milhar, `dd/MM`).
  Nunca `toFixed` ou `toLocaleString` direto na tela.
- **React:**
  - Nada de `setState` síncrono dentro de `useEffect` para "sincronizar" props: remonte com `key`
    (veja `SetEditor`, `MaxesEditor`) ou derive no render.
  - Hooks sempre antes de qualquer `return` antecipado.
  - Modais de edição: o pai renderiza só quando abertos e passa `key`, e o estado inicial basta.
  - Recarregar dados: `bump()`/`version` do `AppData` como dependência de `useEffect`.
- **Acessibilidade e uso na academia:** alvo mínimo `TOUCH` (56) nos controles principais,
  `accessibilityRole` e `accessibilityLabel` em botões, textos com Dynamic Type.
- **Tema:** cores só via `useTheme()`; nada de hex solto em tela (exceção: a tela vermelha de alarme).
- **Gráficos:** um eixo só, cor pela entidade (ordem fixa da paleta), legenda com 2+ séries, rótulo
  direto, referência tracejada neutra.

## 5. Banco de dados

- Migrações em `src/db/schema.ts` por `PRAGMA user_version`. **Nunca edite uma migração publicada:**
  crie a próxima (`if (version === N) { …; version = N + 1 }`) e suba `DATABASE_VERSION`.
- Tabela nova entra também no backup (`TABLES` em `src/db/dataRepo.ts`).
- Importações gravam `source_key` para não duplicar.
- Macros de refeição são snapshot: não recalcule o passado.

## 6. Expo e iOS

- Siga o `AGENTS.md`: confira a documentação do **SDK 58** antes de usar uma API do Expo; instale com
  `npx expo install`.
- Só módulos que funcionam com o **Apple ID gratuito**. Depois de adicionar pacote ou plugin, rode
  `npx expo config --type introspect` e confirme que `ios.entitlements` continua `{}`.
- Nada de `ios/`/`android/` versionado: configuração vai no `app.json`/plugins.

## 7. Antes de dizer que terminou

```bash
npm test && npm run test:import && npm run typecheck && npx expo lint
```

- Mudou tela: confira na prévia web (`CONTEXTO.md` explica como) e diga o que falta ver no iPhone.
- Atualize o `spec.md` da feature (andamento, verificação) e o `specs/PLANO.md` **no mesmo commit**.
- Um commit por feature/incremento, mensagem em português, no branch `claude/chat-conversations-access-x7i6nh`.
  Sem PR, salvo pedido.
- Seja honesto sobre o que não foi testado (o iPhone só é testado numa sessão local no Mac).
