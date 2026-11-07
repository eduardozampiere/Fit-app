# Plano de execução

> Painel do andamento. Cada feature tem uma subpasta em `specs/` com dois documentos: `pbi.md` (produto,
> do `/pm`) e `tech-plan.md` (técnico, do `/planejar`); modelos em [_modelo/](_modelo/). As features 01–18
> são anteriores a essa divisão e têm um único `spec.md`. Atualize a tabela e os documentos da feature no
> mesmo commit em que mudar o código. Features novas: a coluna Spec aponta para a pasta.

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
| 14 | Timer de descanso retangular, persistente, com notificação | 🟡 | [14-timer-de-descanso-e-notificacao](14-timer-de-descanso-e-notificacao/spec.md) |
| 15 | Exercício único e máximos próprios (formato v2). **Detalhada nos PBIs 19 a 24**; a spec guarda as decisões | ⏳ | [15-exercicio-unico](15-exercicio-unico/spec.md) |
| 16 | Periodizações: várias, uma ativa; criar plano e treinos pela UI (depende dos PBIs 19 e 24; usa os máximos 20/21 só se existirem) | ⏳ | [16-periodizacoes](16-periodizacoes/spec.md) |
| 17 | Live Activity do timer na Dynamic Island (começa por teste de viabilidade; independente) | ⏳ | [17-live-activity](17-live-activity/spec.md) |
| 18 | Regras do treinador configuráveis pela interface (módulo avançado; depende dos PBIs 19 e 20) | ⏳ | [18-regras-configuraveis](18-regras-configuraveis/spec.md) |
| 19 | Modelo de treino v2: máximos com nome + séries com tipo dentro do exercício (single de ativação, back-off, walkout), cópia de segurança, regras por máximo, "Agacho" vira "Agachamento" (parte 1 da 15) | ⏳ | [19-formato-v2](19-formato-v2/pbi.md) |
| 20 | Máximos próprios: criar máximos, "Carga baseada em" em qualquer exercício, sem pergunta de movimento (recurso avançado; parte 2 da 15; depende da 19) | ⏳ | [20-maximos-proprios](20-maximos-proprios/pbi.md) |
| 21 | Histórico de máximos: toda mudança registrada e visível na folha do máximo (parte 3 da 15; depende da 20) | ⏳ | [21-historico-de-maximos](21-historico-de-maximos/pbi.md) |
| 22 | Análises por exercício principal: uma linha por principal, seletor de até 3 (parte 4 da 15; depende da 19) | ⏳ | [22-analises-por-exercicio](22-analises-por-exercicio/pbi.md) |
| 23 | Evolução dos máximos: gráfico e passado (estimativa dos treinos + valores lançados); a sugestão de máximo pelo e1RM está **em aberto**, a redefinir com o usuário (depende de 21 e 22; fatias 23a, 23b) | ⏳ | [23-evolucao-dos-maximos](23-evolucao-dos-maximos/pbi.md) |
| 24 | Séries com tipo: montar e editar grupos de séries do exercício (Normal, Aquecimento, Single de ativação, Back-off, Walkout) no Plano e na tela Hoje (depende da 19; logo depois dela, antes da 16) | ⏳ | [24-series-com-tipo](24-series-com-tipo/pbi.md) |

### Ordem recomendada (visão de 06/11/2026: o app também para quem só faz academia normal)

1. **19** Modelo de treino v2: a base (uma migração só, com cópia de segurança). Maior risco; tudo depende dela.
2. **24** Séries com tipo: devolve a criação de grupos pela tela e é o editor que a 16 vai usar.
3. **16** Periodizações: criar plano e treinos pela interface, sem planilha. É o maior valor para quem só faz academia normal.
4. **22** Análises por exercício principal (serve a todos; depende só da 19) e **20** Máximos próprios (recurso avançado; pode ir antes da 22).
5. **21** Histórico de máximos logo depois da 20 (só acumula daqui para a frente).
6. **23** Evolução dos máximos (a, b); a sugestão pelo e1RM fica em aberto.
7. **18** Regras configuráveis (módulo avançado, só depois de 19 e 20 e de entrevista de escopo).
8. **17** Live Activity: independente; o teste de viabilidade pode ser feito a qualquer hora; acabamento, não essencial.
- **Opcional por usuário (interruptor "Recursos avançados", a confirmar):** máximos e % do máximo (20, 21, 23), regras do treinador (18), integração com o Claude e importação de planilha (tela Dados), check-in de dor lombar e seus alertas.
- **Precisa mudar para outra pessoa usar (ainda sem PBI; depende das perguntas abertas de distribuição):** o plano pessoal embutido (`ciclo_out26_jan27`) não pode ir para os outros; primeira abertura vazia/onboarding; textos específicos de powerlifting e de lombar; imagens e catálogo de terceiros; como instalar para mais de uma pessoa.

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
| Linha de meta por máximo (ex.: meta de dez/2027) no gráfico de evolução | PBI 23 | Precisa guardar a meta de cada máximo; o gráfico de evolução, o passado e a sugestão pelo e1RM já estão no [PBI 23](23-evolucao-dos-maximos/pbi.md). |
| Versão para outras pessoas: primeira abertura sem plano, onboarding, plano pessoal fora do app, recursos avançados opcionais, textos genéricos | visão de 06/11/2026 | **Bloqueado por decisão do usuário** sobre distribuição (conta paga da Apple, plataformas, dados e imagens de terceiros, idioma). Ver "Decisões em aberto". |
| Sugerir trocar um single para Normal quando ele supera o recorde do exercício | PBI 19/24 | Ideia do PM (07/11/2026); a troca manual de tipo já resolve. Nada mudaria sozinho. |
| Sugestão de máximo pelo e1RM | PBI 23 | Em aberto: o usuário quer decidir melhor (onde aparece, séries sem RPE, relação com a revisão do treinador). Sem aviso na aba Hoje por enquanto. |
| Atalho "Desligar máximo em todos os treinos" ao apagar máximo em uso | PBI 20 | Só se desligar item por item incomodar. |
| Sugerir o máximo pelo nome do exercício ao adicionar principal/variação | PBI 20 | Só se ligar "Carga baseada em" à mão incomodar. |
| Mais de 3 linhas por vez nos gráficos por exercício (ampliar a paleta) | PBI 22 | A paleta atual tem 3 cores. |
| Recolocar o single removido pela lixeira | feature 12 | A linha "S" não tem botão de adicionar; hoje só pelo Plano/Claude. |
| Volume por grupo muscular nas Análises | feature 09 | O catálogo já traz músculo principal e secundário; falta ligar o exercício do ciclo ao catálogo pelo nome. |
| Validar com um export real do Hevy | feature 07 | O parser segue o formato documentado; ajustar se o arquivo real for diferente. |
| Live Activity do descanso (tela bloqueada / Dynamic Island) | conversa sobre Swift | Exige módulo nativo; possível com instalação pelo Mac. Verificar se o Apple ID gratuito permite. |
| App do Apple Watch (registrar série, ver descanso) | conversa sobre Swift | Só em Swift, ao lado do app atual. |
| Aviso de validade da instalação (7 dias) | feature 02 | iOS não expõe a data com facilidade; hoje a sugestão é um lembrete semanal no iPhone. |
| Fase 2 do prompt original: CloudKit, HealthKit, widgets | prompt original | ⛔ Exigem a conta paga da Apple. |

## Decisões em aberto (o usuário pode querer revisar)

**Visão de produto de 06/11/2026 (precisa de resposta do usuário; ver CONTEXTO quando atualizado):** o app, hoje só dele, deve servir a várias pessoas, inclusive quem só faz academia normal. Perguntas: como distribuir (conta paga da Apple/TestFlight, só amigos com Apple ID gratuito, Android?), para quantas pessoas,
dados e imagens de terceiros numa versão pública, o que acontece com o plano pessoal e com a integração com o Claude, idioma (só pt-BR?), check-in de dor lombar para todos ou só para ele. Enquanto não responder, a ordem acima vale e nada é construído para distribuição.

**Séries com tipo (PBIs 19 e 24):** respondido em 07/11/2026: walkout é tipo de série (W); back-off conta como série normal; single de ativação é só tonelagem e os gráficos usam só séries Normais (um single que bate recorde vira Normal pela troca de tipo). Restam para confirmar: (a) as 3 "duplas de volume" do plano atual viram Back-off com esse nome; (b) o walkout continua contando na série "n/m" do treino, com volume zero (proposta, como hoje).

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
| 06/11/2026 | Treino em andamento (spec 13), timer retangular e arraste do modal (spec 14) | `e994ecd` |
| 06/11/2026 | Cores dos dias da semana | `c23dc66` |
| 06/11/2026 | Timer persistente (spec 14) | este commit |
