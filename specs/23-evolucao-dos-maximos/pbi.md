# 23 — Evolução dos máximos: gráfico e passado reconstruído (sugestão pelo e1RM em aberto) · PBI

> **Produto: o quê e por quê.** Dono: `product-manager` (`/pm`). O como fica em [tech-plan.md](tech-plan.md),
> do `tech-planner` (`/planejar`).
> Continua a [spec 15](../15-exercicio-unico/spec.md) depois dos PBIs 19 a 22. Usa o histórico do [PBI 21](../21-historico-de-maximos/pbi.md).

**Status:** ⏳ a fazer (23a e 23b prontos para planejar; 23c é **escopo a redefinir** com o usuário)
**Depende de:** [21 — Histórico de máximos](../21-historico-de-maximos/pbi.md) (os pontos do gráfico) e [22 — Análises por exercício](../22-analises-por-exercicio/pbi.md)
(o e1RM por exercício principal, o RPE assumido e o jeito de escolher até 3 linhas). Indiretamente, 19, 20 e 24 (máximos com id, itens ligados a eles, séries tipadas).
**Recurso avançado** (visão de 06/11/2026: o app também é para quem só faz academia normal): vale a pergunta P3 do [PBI 20](../20-maximos-proprios/pbi.md) sobre o interruptor "Recursos avançados"; o chip "Máximos" só existe com o recurso ligado.
**Ordem interna:** 23a gráfico de evolução → 23b passado (estimativa dos treinos e valores lançados à mão). A 23c (sugestão pelo e1RM) fica parada até o usuário decidir.

## Objetivo
O máximo é o número que manda no ciclo inteiro, mas o usuário não vê para onde ele vai: o PBI 21 guarda cada mudança, só que numa lista. Este PBI entrega o que o usuário pediu ("gostei disso") em torno da pergunta **"meu máximo está subindo?"**:
1. **Ver a evolução** de cada máximo num gráfico, ao longo do tempo (23a).
2. **Ver o passado** que o histórico não tem (o histórico só começa na instalação do PBI 21): uma estimativa feita a partir dos treinos já registrados, claramente marcada como estimada, e a possibilidade de **lançar à mão** um valor que o usuário sabe que teve (23b).
3. **Sugestão de máximo novo pelo e1RM** (23c): o usuário gostou da ideia, mas pediu para **decidir melhor o que fazer com ela**. Fica registrada aqui como rascunho e pergunta aberta, sem critérios de pronto.

Quem usa e quando: quem treina com máximos (hoje, o atleta de powerlifting), **fora do treino** (fim de semana, fechando um bloco, planejando o próximo ciclo), na aba Análises e na folha do máximo. Não é uma tela para a academia.
Como saberemos que deu certo: ao abrir Análises → Máximos, o usuário vê as linhas de evolução dos máximos que usa, liga a estimativa dos treinos e vê o passado dos treinos já registrados.

## Escopo
- **Entra:**
  - **23a — Gráfico "Evolução dos máximos"** em Análises → Gráficos (novo chip "Máximos"): uma linha por máximo (degraus: o valor vale até a próxima mudança), até 3 linhas por vez com seletor, rótulo do valor atual na ponta, legenda.
  - **23b — Passado:** (i) camada **"e1RM dos treinos (estimado)"** no mesmo gráfico, desligada por padrão, calculada dos treinos já registrados (inclui os que vieram de importação); (ii) botão **"Lançar valor passado"** na folha do máximo, para registrar à mão um valor e uma data anteriores
    (entra no histórico, marcado "Lançado depois").
- **Não entra:**
  - **Sugestão de máximo pelo e1RM (23c):** escopo em aberto, ver a seção "Em aberto: sugestão de máximo pelo e1RM". Não há aviso na aba Hoje, notificação nem critério de pronto até o usuário decidir.
  - Gravar no histórico os pontos **estimados** como se fossem máximos (resposta do usuário em 06/11/2026: **não**; a camada estimada é só desenho).
  - Linha de meta por máximo (ex.: meta de dez/2027) no gráfico — backlog do PLANO.
  - Edição ou exclusão de registros do histórico (continua valendo a regra do PBI 21).
  - Mudar a regra "Revisão de máximo" do treinador (continua como está).
  - Volume por grupo muscular, comparação com outros usuários, previsão de máximo futuro.

## Comportamento
### 23a — Análises → Gráficos → "Máximos"
- Novo chip **"Máximos"** na linha de gráficos de treino (junto de Carga, e1RM, Single, Planejado × feito). Título do cartão: "Evolução dos máximos"; subtítulo: "Valor do máximo ao longo do tempo (kg)".
- Cada máximo é uma linha em degraus (um ponto por registro do histórico; entre dois pontos o valor continua o mesmo; a última linha segue até hoje). Cor pela ordem fixa da paleta, legenda com o nome do máximo, valor atual como rótulo na ponta da linha. Um eixo só, em kg.
- **Até 3 linhas por vez** (a paleta tem 3 cores). Por padrão, os 3 máximos que mais mudaram nos últimos 6 meses; se houver mais de 3, o chip **"Máximos (3 de 5)"** abre uma folha de baixo para cima (fecha arrastando, sem botão Cancelar) com caixas de marcar; marcar um quarto
  mostra "Escolha até 3 máximos. Desmarque um para trocar." A escolha fica salva (separada da escolha de exercícios do PBI 22).
- Máximos de escalas muito diferentes (200 kg e 30 kg) dividem o mesmo eixo; é aceito (regra do projeto: um eixo só). Quem quiser comparar escolhe máximos parecidos.
- Estados: um máximo com um único registro aparece como ponto/linha reta com o texto no cartão "Ainda há um só valor para <nome>. A linha muda quando você mudar o máximo." Sem nenhum máximo: "Crie um máximo em Ajustes para acompanhar a evolução."
  Todo máximo tem pelo menos um registro (o "Valor inicial" ou o de criação), então nunca há máximo sem ponto.
- Atalho: na folha do máximo, a seção "Histórico" ganha o botão "Ver no gráfico" que abre Análises → Máximos já com aquele máximo marcado.
- Data: eixo horizontal em datas no formato "05 nov"; pontos do passado distante usam "05 nov, 2025".

### 23b — Passado
**(i) Camada "e1RM dos treinos (estimado)"**
- Chip "Estimativa dos treinos" (liga/desliga, desligado por padrão) abaixo do gráfico. Ligado, cada máximo selecionado ganha uma segunda linha **tracejada, na mesma cor**, com um ponto por sessão: o melhor e1RM (tabela RTS, o mesmo cálculo do gráfico de e1RM do PBI 22) das séries **Normais**
  dos exercícios principais que o plano liga àquele máximo. A legenda ganha "tracejado = e1RM estimado dos treinos".
- **Série sem RPE entra assumindo esforço máximo (RPE 10)**, como no PBI 22 (resposta do usuário em 06/11/2026). Esses pontos são **vazados** e a nota abaixo do gráfico diz: "Pontos vazados: série sem RPE, calculada como RPE 10 (esforço máximo)." O RPE assumido nunca é gravado na série.
- Só entram séries de 1 a 10 repetições (limite da tabela RTS) e que não tenham sido marcadas como falha.
- A camada cobre também o período **anterior** ao primeiro registro do histórico: é assim que o usuário "vê o passado" dos treinos já registrados, inclusive dos importados do Hevy.
- Um máximo sem série Normal registrada em exercício principal ligado a ele não tem camada; o cartão diz "Sem séries principais registradas para estimar <nome>."
- Nada da camada estimada é gravado no histórico nem altera cargas.

**(ii) Lançar valor passado** (folha do máximo → Histórico)
- Botão "Lançar valor passado" abre uma folha com "Data" (não pode ser futura) e "Valor (kg)" (maior que zero) e "Salvar". O registro entra no histórico com origem **"Lançado depois"** e a data escolhida, na ordem certa da lista. Mensagens: "A data não pode ser no futuro.", "Informe um valor maior que zero."
- Lançar um valor passado **não muda o máximo atual** nem recalcula cargas: é só memória. Se a data escolhida for posterior ao último registro, o app pergunta "Esta data é mais recente que o último registro. Isto vai mudar o máximo atual?" com "Só registrar no histórico" e "Mudar o máximo atual"
  (este segundo usa o fluxo normal de edição, com recálculo e histórico "Manual").
- Aparece no gráfico como degrau na data lançada.

### Em aberto: sugestão de máximo pelo e1RM (23c)
O usuário gostou da ideia de o app sugerir um máximo novo quando os treinos mostram que ele já subiu, mas em 06/11/2026 disse que precisa **decidir melhor o que fazer com ela**. Por isso **nada disto é contrato**; é o ponto de partida para a conversa:
- **Ponto de partida aprovado pelo usuário (limites):** sugerir quando o e1RM dos treinos recentes supera o máximo atual em pelo menos 2,5 kg em 2 sessões diferentes dentro de 3 semanas; valor sugerido = o menor dos dois e1RM, arredondado para baixo em múltiplos de 2,5 kg; só sugerir subir.
- **Não** avisar na aba Hoje (resposta do usuário) nem por notificação.
- **Princípios que já valem:** sempre como sugestão que o usuário confirma, mostrando o impacto (quantos itens recalculam) antes de aplicar; o registro no histórico leva uma origem própria ("Sugestão do e1RM"); nada muda sozinho.
- **Pontos a decidir antes de escrever critérios de pronto:** onde a sugestão aparece (só nos Máximos? em Análises?); se séries sem RPE (RPE 10 assumido) contam para sugerir ou só as com RPE informado — a estimativa assumida é conservadora, então tende a não sugerir; o que fazer com a sobreposição com a
  "Revisão de máximo" do treinador (propõe-se não mostrar as duas para o mesmo máximo); o que bloqueia a sugestão (propõe-se: alerta de dor ou sinal de alarme nos últimos 7 dias, série com falha); se vale para quem não usa máximos por porcentagem.
- Quando o usuário decidir, esta seção vira a fatia 23c (ou um PBI separado) com critérios, ou é cortada.

Regras do produto que valem aqui: nada altera o plano ou os máximos sem o usuário confirmar; um caminho único de edição de máximo (o mesmo da tela, do Claude e das regras); gráfico com um eixo, cor pela entidade, legenda com 2+ linhas, rótulo direto e referência tracejada neutra (aqui, o tracejado é a estimativa na cor do máximo);
textos em pt-BR com vírgula decimal e datas "05 nov".

## Decisões
- **Um PBI só para gráfico e passado.** Motivo: usam o mesmo cálculo (e1RM por máximo) e a mesma tela (Análises → Máximos). A sugestão (23c) fica fora do contrato até ser redefinida.
- **Gráfico no Análises, com atalho a partir da folha do máximo.** Alternativa descartada: gráfico dentro da folha (pouco espaço, sem comparar máximos).
- **Degraus, não linha inclinada.** Motivo: o máximo é um valor que vale até mudar; a linha inclinada inventaria valores intermediários.
- **Até 3 linhas** (como no PBI 22: 3 linhas bastam, resposta do usuário em 06/11/2026).
- **O passado vem de duas fontes honestas:** estimativa derivada dos treinos (não gravada, tracejada) e valores que o usuário lança à mão (gravados, origem "Lançado depois"). **Ponto estimado não vira registro do histórico** (resposta do usuário em 06/11/2026).
- **Série sem RPE conta como esforço máximo na estimativa** (RPE 10), marcada como tal na tela. Motivo: pedido do usuário; é conservadora (subestima), não inventa RPE no registro. Alternativa descartada: ignorar as séries sem RPE (a camada ficaria quase vazia para quem usa "feito conforme o plano").
- **Origem nova do histórico: "Lançado depois"** (soma-se às do PBI 21). A origem "Sugestão do e1RM" só entra se a 23c for aprovada.
- **Sugestão pelo e1RM adiada** por decisão do usuário (precisa decidir melhor); sem aviso na Hoje.
- Respostas do usuário (06/11/2026): quer o gráfico de evolução, o histórico retroativo e a sugestão pelo e1RM ("gostei disso"); estimado não vira registro; limites da sugestão ok; sem aviso na Hoje por enquanto; série sem RPE conta como esforço máximo; app deve servir também a quem só faz academia normal.

## Critérios de pronto
**23a — Gráfico**
- **CP1 — Chip e gráfico.** Em Análises → Gráficos existe o chip "Máximos"; ele mostra "Evolução dos máximos" com uma linha em degraus por máximo selecionado, legenda com o nome do máximo e o valor atual como rótulo na ponta.
- **CP2 — Pontos.** Mudar um máximo (por exemplo, supino de 170 para 175 em Ajustes) faz o gráfico ganhar um degrau na data da mudança; salvar o mesmo valor não cria degrau.
- **CP3 — Até 3 linhas.** Com 5 máximos, aparecem 3; o chip "Máximos (3 de 5)" abre a folha, marcar um quarto mostra a mensagem e não marca; a escolha é lembrada ao sair e voltar e ao reabrir o app.
- **CP4 — Estados.** Máximo com um registro mostra a mensagem "Ainda há um só valor…"; sem máximos mostra "Crie um máximo em Ajustes…"; nada quebra com 0, 1 ou muitos registros.
- **CP5 — Atalho.** "Ver no gráfico" na folha do máximo abre Análises → Máximos com aquele máximo marcado.
- **CP6 — Plano atual intacto.** Nada mudou nos outros gráficos nem nas cargas (o teste dourado do PBI 19 continua verde).

**23b — Passado**
- **CP7 — Camada estimada.** Com "Estimativa dos treinos" ligada, cada máximo selecionado ganha uma linha tracejada na mesma cor, com um ponto por sessão; os valores batem com os do gráfico de e1RM do PBI 22 do mesmo exercício e dia (teste automático).
- **CP8 — Antes do histórico.** Com treinos registrados antes da data do "Valor inicial", a camada estimada mostra pontos anteriores a essa data.
- **CP9 — Filtros e RPE assumido.** Séries com mais de 10 repetições ou marcadas como falha não entram; série sem RPE entra como RPE 10 em ponto vazado e a nota aparece; o registro da série continua sem RPE (teste).
- **CP10 — Sem dados.** Máximo sem série Normal registrada em exercício principal ligado a ele mostra "Sem séries principais registradas para estimar <nome>." e não gera erro; nada da camada vai para o histórico.
- **CP11 — Lançar valor passado.** "Lançar valor passado" salva um registro "Lançado depois" na data escolhida, na posição cronológica correta da lista, sem mudar o máximo atual nem as cargas; data futura e valor zero são recusados com a mensagem.
- **CP12 — Data mais recente.** Lançar uma data posterior ao último registro mostra a pergunta com as duas opções; "Só registrar no histórico" não muda o máximo atual; "Mudar o máximo atual" segue o fluxo normal (recálculo, registro "Manual").
- **CP13 — Backup.** Registros "Lançado depois" sobrevivem a exportar e restaurar o backup.

**Gerais**
- **CP14 — Acessibilidade e formato.** Botões com alvo de 56 pt e rótulo de acessibilidade; textos com Dynamic Type; números e datas formatados em pt-BR (vírgula decimal, "05 nov").
- **CP15 — Sem regressão.** `npm test`, `npm run test:import`, `npm run typecheck` e `npx expo lint` passam.

## Verificação
- **Na nuvem / testes automáticos:** montagem dos degraus a partir do histórico, escolha dos 3 máximos, e1RM por máximo (filtros, RPE assumido, igualdade com o gráfico de e1RM), lançamento de valor passado sem mudar o máximo atual, backup (CP2, CP3, CP7, CP9 a CP13, CP15).
- **Prévia web:** conferir o chip e o gráfico com os dados do ambiente de teste, a camada tracejada com pontos vazados, as folhas de seleção e de lançamento (CP1, CP3, CP4, CP7, CP11).
- **No simulador / iPhone (roteiro):**
  1. Instalar sobre os PBIs 19 a 22 com dados reais. Análises → Gráficos → "Máximos": linhas dos máximos com o degrau do "Valor inicial" (CP1, CP4).
  2. Em Ajustes → Máximos, mudar o supino para 175 e voltar à aba: novo degrau; salvar o mesmo valor: sem degrau novo (CP2).
  3. Ligar "Estimativa dos treinos": linha tracejada por máximo; conferir que aparece antes da data do "Valor inicial" se houver treinos antigos ou importados do Hevy; conferir um ponto contra o gráfico de e1RM; conferir pontos vazados e a nota para séries sem RPE (CP7, CP8, CP9).
  4. Folha do supino → Histórico → "Lançar valor passado": data de um mês atrás, 160 kg; conferir que o máximo atual não mudou, que o degrau aparece no gráfico e que a lista fica em ordem; tentar data futura e valor 0 (CP11). Repetir com data posterior ao último registro e escolher as duas opções (CP12).
  5. Exportar e restaurar o backup completo e conferir o histórico com "Lançado depois" (CP13).
  - **Só no iPhone:** leitura do gráfico com texto grande e toque dos botões com uma mão (CP14); a sensação de velocidade ao abrir o gráfico com meses de treinos reais.

## Riscos e perguntas abertas
- **Risco de produto:** o e1RM (tabela RTS com RPE) é uma estimativa e não o máximo de treino do usuário; a camada tracejada e o texto "estimado" existem para não confundir. Com RPE 10 assumido nas séries sem RPE, a estimativa tende a ficar **abaixo** do máximo real; ler como tendência, não como valor.
- **Risco:** o passado sem séries registradas fica em branco; treinos importados do Hevy entram (com RPE se trouxerem, com RPE 10 assumido se não).
- **Risco de UX:** máximos de escalas muito diferentes no mesmo eixo (200 kg × 30 kg) achatam uma das linhas; aceito por ora.
- **A decidir (23c):** o que fazer com a sugestão de máximo pelo e1RM — ver a seção "Em aberto". Pergunta ao usuário: quando quiser retomar, vale a conversa sobre os pontos listados lá (onde aparece, séries sem RPE contam?, interação com a revisão do treinador, bloqueios de segurança, para quem vale).
- **Respondidas em 06/11/2026:** estimado não vira registro (não); limites da sugestão (ok, como ponto de partida); aviso na Hoje (não por enquanto); séries sem RPE (contam como esforço máximo).

## Andamento
| Data | Nota |
|---|---|
| 06/11/2026 | PBI criado: o atleta quis o gráfico de evolução, o histórico retroativo e a sugestão pelo e1RM, que estavam no backlog dos PBIs 21 e 22. |
| 06/11/2026 | Usuário respondeu: estimado não vira registro; limites ok; sem aviso na Hoje, e a sugestão (23c) virou escopo em aberto "para decidir melhor"; séries sem RPE contam como esforço máximo. Critérios e roteiro da 23c removidos até a redefinição. |
