# Plano de execução

> Painel do andamento. Cada feature tem uma subpasta em `specs/` com o seu `spec.md`
> (modelo em [_modelo/spec.md](_modelo/spec.md)). Atualize a tabela e o `spec.md` da feature no mesmo
> commit em que mudar o código.

## Status das features

Legenda: ✅ feito · 🟡 feito, falta verificar no iPhone · 🔨 em andamento · ⏳ a fazer · ⛔ bloqueado

| # | Feature | Status | Spec |
|---|---|---|---|
| 01 | Plano importado, tela Hoje, registro de séries, cronômetro | 🟡 | [01-plano-e-registro](01-plano-e-registro/spec.md) |
| 02 | Instalação no iPhone com Apple ID gratuito | 🟡 | [02-instalacao-iphone](02-instalacao-iphone/spec.md) |
| 03 | Liquid Glass (abas nativas, cronômetro no acessório) | 🟡 | [03-liquid-glass](03-liquid-glass/spec.md) |
| 04 | Check-in e regras de segurança | 🟡 | [04-checkin-e-regras](04-checkin-e-regras/spec.md) |
| 05 | Alimentação, peso e medidas | 🟡 | [05-alimentacao-e-corpo](05-alimentacao-e-corpo/spec.md) |
| 06 | Análises (gráficos, agrupamentos, cartões por dia) | 🟡 | [06-analises](06-analises/spec.md) |
| 07 | Importação, exportação, backup e integração com o Claude | 🟡 | [07-dados-e-claude](07-dados-e-claude/spec.md) |
| 08 | Visual inspirado no Hevy (tabela de séries inline, tokens novos) | 🟡 | [08-design-hevy](08-design-hevy/spec.md) |

Nada foi testado num iPhone de verdade ainda. Em 03/11/2026 o app rodou no simulador do iOS 27.2 (Mac,
Xcode 27.2, `npx expo run:ios`). O que foi verificado em cada feature está no `spec.md` dela.

## Próximo passo

**Primeira instalação no iPhone**, numa sessão local no Mac (não na nuvem):
1. `git clone` e `git checkout claude/chat-conversations-access-x7i6nh`, `npm install`, `npm run iphone`.
2. Roteiro de teste no aparelho: [02-instalacao-iphone/spec.md](02-instalacao-iphone/spec.md#roteiro-de-teste-no-iphone).
3. Registrar o resultado em cada `spec.md` e passar de 🟡 para ✅, ou abrir correções.

## Backlog (ideias e pendências, sem ordem fixa)

| Item | Origem | Observação |
|---|---|---|
| "Desfazer" para sugestão aceita | revisão do incremento 2 | Hoje aceitar aplica direto no plano, sem volta. |
| Validar com um export real do Hevy | feature 07 | O parser segue o formato documentado; ajustar se o arquivo real for diferente. |
| Live Activity do descanso (tela bloqueada / Dynamic Island) | conversa sobre Swift | Exige módulo nativo; possível com instalação pelo Mac. Verificar se o Apple ID gratuito permite. |
| App do Apple Watch (registrar série, ver descanso) | conversa sobre Swift | Só em Swift, ao lado do app atual. |
| Aviso de validade da instalação (7 dias) | feature 02 | iOS não expõe a data com facilidade; hoje a sugestão é um lembrete semanal no iPhone. |
| Fase 2 do prompt original: CloudKit, HealthKit, widgets | prompt original | ⛔ Exigem a conta paga da Apple. |

## Decisões em aberto (o usuário pode querer revisar)

1. Freio dispara com RPE **≥** alvo + 1 (com alvo 7, RPE 8 já dispara).
2. Revisão dos máximos compara com o **meio** da faixa de RPE alvo.
3. Deload −40% arredonda as séries (5 → 3).
4. Treino importado só entra no treino do plano se a data e algum exercício baterem e o dia ainda não tiver registro; senão vira "treino avulso".
5. Check-in antigo com texto livre: extrai o número e guarda o texto na observação.

## Histórico

| Data | O que mudou | Commit |
|---|---|---|
| 03/11/2026 | Incremento 1 | `a035494` |
| 03/11/2026 | Instalação com Apple ID gratuito | `96019db` |
| 03/11/2026 | Liquid Glass | `99ca017` |
| 03/11/2026 | Incremento 2 | `3e0477c` |
| 03/11/2026 | Incrementos 3, 4 e 5 | `11b4a12`, `fd90e02`, `96411c0` |
| 03/11/2026 | Pasta `specs/` criada (contexto, plano, uma spec por feature) | `46f64c8` |
| 03/11/2026 | CLAUDE.md com padrões de projeto e DRY | `444a54b` |
| 03/11/2026 | Remoção das duplicações: `text.ts` (slug), `LIFTS` e `weekForDate` únicos, `TextField` | `5fbb676` |
| 03/11/2026 | Visual Hevy, fase 1: tokens novos e componentes base | `b064878` |
| 03/11/2026 | Visual Hevy, fase 2: tabela de séries, adicionar/remover série, barra da calculadora | `de84e48` |
| 03/11/2026 | Visual Hevy, fase 3: aba Plano no estilo de rotinas | `3cdd66c` |
| 03/11/2026 | Visual Hevy, fase 4: Análises, Corpo e Comida | `299e9c9` |
| 03/11/2026 | Visual Hevy, fase 5: modais, Ajustes/Dados e limpeza dos apelidos | `978b6c2` |
| 03/11/2026 | Arrastar para apagar série e séries de aquecimento (banco v5) | `6a3d222` |
| 03/11/2026 | Reordenar exercícios e séries arrastando | este commit |
