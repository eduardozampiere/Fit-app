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
| 09 | Descanso editável e troca de exercício (catálogo do hevy-ia) | 🟡 | [09-descanso-e-catalogo](09-descanso-e-catalogo/spec.md) |
| 10 | Cabeçalho do treino, adicionar exercício e tela do exercício | 🟡 | [10-cabecalho-e-adicionar-exercicio](10-cabecalho-e-adicionar-exercicio/spec.md) |
| 11 | Tipo de série, datas "05 nov" e folhas que fecham arrastando | 🟡 | [11-tipo-de-serie-datas-folhas](11-tipo-de-serie-datas-folhas/spec.md) |
| 12 | Single dentro do principal, arraste livre das folhas, lixeira e tipo ao adicionar exercício | 🟡 | [12-single-na-tabela-e-arraste-livre](12-single-na-tabela-e-arraste-livre/spec.md) |
| 13 | Treino em andamento: iniciar, não perder, cancelar; Concluir só com treino iniciado | 🟡 | [13-treino-em-andamento](13-treino-em-andamento/spec.md) |
| 14 | Timer de descanso retangular, persistente, com notificação | 🔨 | [14-timer-de-descanso-e-notificacao](14-timer-de-descanso-e-notificacao/spec.md) |
| 15 | Exercício único: máximos, % e análises para qualquer exercício (formato v2) | ⏳ | [15-exercicio-unico](15-exercicio-unico/spec.md) |
| 16 | Periodizações: várias, uma ativa; criar plano e treinos pela UI | ⏳ | [16-periodizacoes](16-periodizacoes/spec.md) |
| 17 | Live Activity do timer na Dynamic Island (começa por teste de viabilidade) | ⏳ | [17-live-activity](17-live-activity/spec.md) |

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
| Escolher do catálogo também no editor da aba Plano | feature 09 | O `ItemEditor` ainda tem só campo de texto para o nome. |
| Figura do corpo com os músculos trabalhados (como no cabeçalho do Hevy) | feature 10 | Precisa do desenho do corpo e do mapa exercício → músculo; as imagens do catálogo já mostram os músculos em vermelho. |
| Imagem para os exercícios que só têm vídeo no catálogo (222) | feature 10 | Tirar o primeiro quadro de cada mp4 (ffmpeg já instalado no Mac) e embutir no app. Exige baixar ~223 vídeos (~93 MB) do bucket de terceiros e guardar ~8 MB de imagens no repositório. Decidido em 06/11/2026: **só quando o app estiver pronto**, não agora. |
| Recolocar o single removido pela lixeira | feature 12 | A linha "S" não tem botão de adicionar; hoje só pelo Plano/Claude. |
| Volume por grupo muscular nas Análises | feature 09 | O catálogo já traz músculo principal e secundário; falta ligar o exercício do ciclo ao catálogo pelo nome. |
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
| 03/11/2026 | Reordenar exercícios e séries arrastando | `a0edcec` |
| 05/11/2026 | Descanso editável e troca de exercício com catálogo | `b36fc98` |
| 05/11/2026 | Editor de descanso como folha parcial com roda de tempos | `f608b99` |
| 05/11/2026 | Cabeçalho do treino, adicionar exercício e imagens dos exercícios | `acc7924` |
| 05/11/2026 | Tela do exercício (resumo, recordes, histórico); imagem só nela e na busca | `3a4b520` |
| 05/11/2026 | Apelidos plano → catálogo; cabeçalho próprio na tela do exercício (modo escuro) | `7cd2056` |
| 05/11/2026 | Ajustes visuais: pílulas, gráfico, botões de vidro, tabela | `e9f0e1d` |
| 05/11/2026 | Tipo de série, datas, folhas sem Cancelar, cabeçalho enxuto, pílulas finas | `eb9dc3c` |
| 05/11/2026 | Gráficos com a mesma moldura; tela Hoje em semana → dia → números | `1c67f4c` |
| 06/11/2026 | Single dentro do principal, arraste livre das folhas, lixeira | `d7756f9` |
| 06/11/2026 | Tipo ao adicionar exercício | `11d03e3` |
| 06/11/2026 | Planejamento das specs 13 a 17 | `272b5b3` |
| 06/11/2026 | Treino em andamento (spec 13), timer retangular e arraste do modal (spec 14) | este commit |
