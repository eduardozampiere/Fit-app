# 22 — Análises por exercício principal: qualquer exercício vira linha no gráfico · PBI

> **Produto: o quê e por quê.** Dono: `product-manager` (`/pm`). O como fica em [tech-plan.md](tech-plan.md),
> do `tech-planner` (`/planejar`).
> Parte 4 de 4 da [spec 15](../15-exercicio-unico/spec.md). Antes: [19 Formato v2](../19-formato-v2/pbi.md).

**Status:** ⏳ a fazer
**Depende de:** [19 — Modelo de treino v2](../19-formato-v2/pbi.md) (single e back-off são tipos de série dentro do exercício principal). Não depende do 20 nem do 21; pode ser feito antes ou depois deles.
**Persona (visão de 06/11/2026):** serve também a quem só faz academia normal. "Principal" é o papel que o próprio usuário marca no exercício (Acessório / Variação / Principal); para quem marca poucos principais, o gráfico fica simples (1 a 3 linhas) e o chip de seleção nem aparece.

## Objetivo
As Análises de treino têm três gráficos presos a "agachamento / supino / terra": **Carga dos principais**, **Máximo estimado (e1RM)** e **Termômetro: single de ativação**. Se o
atleta trocar o principal do agachamento (ex.: de "Agachamento (High Bar)" para "Agachamento Low Bar") ou criar um principal que não é um dos três (ex.: "Supino inclinado"),
o gráfico não acompanha. Depois deste PBI, **cada exercício marcado como Principal vira uma linha**, qualquer que seja ele, e o atleta escolhe quais ver. Uso: ao fechar a
semana ou o ciclo, abrindo a aba Análises para ver se a carga e o e1RM estão subindo.

Como saberemos que deu certo: com o plano atual os números dos gráficos são os mesmos de antes; ao trocar o principal de um dia, uma linha nova aparece no gráfico com
o nome do novo exercício, sem sumir o histórico da antiga.

## Escopo
- **Entra:**
  - **Carga dos principais**: uma linha por exercício com tipo Principal que tenha série registrada, com o nome do exercício na legenda.
  - **Máximo estimado (e1RM)**: o mesmo critério de linhas (uma linha por exercício principal), calculado com as séries **Normais** do exercício (decisão de 07/11/2026: "o gráfico usa só as séries normais"; back-off, single, walkout e aquecimento ficam de fora dos gráficos; um single que bate recorde passa a contar quando o usuário troca o tipo dele para Normal). **Mudança nova:** série sem RPE registrado **entra no cálculo assumindo esforço máximo (RPE 10)** e é marcada na
    tela como estimativa sem RPE (ver Comportamento). O RPE assumido nunca é gravado no registro da série.
  - **Termômetro: single de ativação**: uma linha por exercício principal que tenha um grupo de séries do tipo Single de ativação, com RPE por semana.
  - Seletor de quais exercícios aparecem (até 3 por vez, por causa das cores), que lembra a escolha.
  - O relatório/pacote para o Claude passa a trazer o e1RM por exercício principal (mesmos números, com o nome do exercício).
  - Estado vazio e textos de legenda coerentes com o nome do exercício.
- **Não entra:**
  - Gráfico de evolução dos máximos (backlog, usa o histórico do PBI 21).
  - Agrupar exercícios que são "o mesmo movimento" numa linha só (escolha da entrevista: trocar o exercício principal cria outra linha).
  - Volume por grupo muscular (backlog).
  - Mudar os outros gráficos (Planejado × feito, Agrupar, Por dia).
  - Mais de 3 linhas ao mesmo tempo (a paleta de cores atual tem 3; ver P1).
  - Linhas para variações e acessórios (só principal).

## Comportamento
**Análises → Gráficos → "Carga dos principais"**
- Cada linha é um exercício diferente cujo item no treino é do tipo Principal e que tem pelo menos uma série registrada. Valor: o top set de cada sessão (kg), como hoje.
  Legenda com o nome do exercício e a cor na ordem fixa da paleta.
- **Plano atual:** continuam 3 linhas (os três principais de hoje: "Agachamento (High Bar)", "Supino (competição, pausa)" e "Terra (convencional, hook)"), com os mesmos pontos de antes. O que
  muda é só o texto da legenda (de "Agachamento / Supino / Terra", que é como o PBI 19 deixa a legenda, para o nome do exercício). Nomes longos são cortados com reticências, sem quebrar o gráfico.
- **Troca de principal:** se o atleta trocar o exercício principal de um treino (ou promover outro exercício a Principal), o novo exercício vira uma linha própria a partir do primeiro treino
  registrado; a linha do exercício antigo continua com o histórico que tem.
- **Muitas linhas:** com mais de 3 exercícios principais registrados, mostra os **3 com registro mais recente**. Abaixo do gráfico, o chip **"Exercícios (3 de 5)"** abre uma folha de baixo para cima
  (fecha arrastando, sem botão Cancelar) com a lista de exercícios principais, cada um com uma caixa de marcar e a data do último registro ("último treino 05 nov"). Marcar um quarto mostra
  "Escolha até 3 exercícios. Desmarque um para trocar." A escolha fica salva e vale para os três gráficos. A lista só traz exercícios principais com pelo menos um registro.
  Com 3 ou menos principais, o chip não aparece.
- **Estado vazio:** sem nenhum principal registrado: "Registre um treino com exercício principal para ver a carga." (e, no e1RM, o texto de hoje: "Informe o RPE do principal para ver o e1RM.").

**"Máximo estimado (e1RM)"**
- Mesmo critério de linhas e de seletor; o valor é o da tabela RTS com a melhor série Normal de cada sessão (1 a 10 repetições; série marcada como falha não conta).
- **Série sem RPE:** entra como se tivesse sido feita com esforço máximo (RPE 10, sem repetições de folga). Como isso dá um e1RM **mais baixo** do que o real quando a série foi mais leve, a estimativa é conservadora. Esses pontos aparecem **vazados** (círculo sem
  preenchimento) e há uma nota abaixo do gráfico: "Pontos vazados: série sem RPE, calculada como RPE 10 (esforço máximo)." Se na mesma sessão há série com RPE e série sem RPE, vale a de maior e1RM e o ponto é cheio quando a vencedora tem RPE.
- O texto de estado vazio "Informe o RPE do principal para ver o e1RM." deixa de existir: sem nenhuma série Normal registrada, o gráfico diz "Registre um treino com exercício principal para ver o e1RM."
- Fica a regra do projeto de que o **app não grava RPE que o usuário não informou**: o RPE 10 só existe no cálculo e na nota da tela. Tocar "feito conforme o plano" continua sem registrar RPE.

**"Termômetro: single de ativação"**
- Uma linha por exercício principal que tenha série do tipo Single de ativação com RPE registrado (aqui o RPE não é assumido: sem RPE o ponto não existe, porque o termômetro lê a fadiga relatada); título da linha: o nome do principal (ex.: "Agachamento (High Bar)").
  O eixo e a leitura ("subir é sinal de cansaço") continuam iguais.

**Relatório / pacote para o Claude**
- A seção de e1RM passa a listar um item por exercício principal (ex.: "e1RM Agachamento (High Bar): 214 kg (05 nov, tabela RTS)"), em vez de um por levantamento. O pacote para o Claude **continua usando só séries com RPE informado**, para o treinador não ler
  como real um número assumido; os números são os mesmos de antes para o plano atual.

Regras do produto: gráficos com um eixo só, cor pela entidade (ordem fixa da paleta), legenda quando há 2 ou mais linhas, referência tracejada neutra; números formatados em pt-BR; offline.

## Decisões
- **Uma linha por exercício principal, qualquer exercício** (decisão 4 da spec 15, entrevista de 06/11/2026). Alternativa descartada: uma linha por máximo/movimento (junta exercícios diferentes, mascara a
  troca de variação e depende de algo que o exercício principal pode nem ter).
- **Trocar o principal cria outra linha** (e não emenda na antiga): o atleta quer ver que mudou de exercício. Alternativa descartada: emendar as linhas pelo movimento.
- **Até 3 linhas por vez**, as 3 mais recentes por padrão, e seletor. Motivo: a paleta atual tem 3 cores e a regra de gráficos pede cor fixa por entidade. Alternativa descartada: ampliar a paleta agora
  (mais cores = legibilidade pior no celular; se virar necessidade, decidir com o design).
- **Singles lidos pelo principal** (decisão 5): o termômetro agrupa o single sob o principal ao qual ele pertence.
- **Escolha do seletor é uma preferência salva** e vale para os três gráficos; sem escolha, padrão automático (as 3 mais recentes).
- **Só exercícios do tipo Principal** têm linha. Variações e acessórios ficam de fora (já têm histórico e recordes na tela do exercício).
- **Legenda usa o nome do exercício**, não o do máximo. O atleta pensa em exercícios.

## Critérios de pronto
- **CP1 — Plano atual igual.** Com o plano atual, os gráficos de carga e de termômetro mostram os mesmos pontos de antes, em três linhas, e só os nomes da legenda mudam para os dos exercícios principais; o e1RM mantém todos os pontos de antes
  (séries com RPE) e **ganha** pontos vazados para as séries Normais sem RPE (o teste dourado do PBI 19 compara carga, termômetro e os pontos com RPE).
- **CP2 — Troca de principal.** Registrar treinos com um exercício principal A, trocar o principal desse treino para B e registrar mais: o gráfico de carga passa a ter linhas A e B, cada uma com os seus pontos.
- **CP3 — Principal fora dos três.** Marcar "Supino inclinado" como Principal em um treino e registrar uma série: aparece uma linha com esse nome na carga e no e1RM (ponto cheio se houve RPE, vazado se não houve).
- **CP4 — Mais de 3.** Com 5 principais registrados, o gráfico mostra as 3 com registro mais recente e o chip "Exercícios (3 de 5)" aparece; abrir a folha lista os 5 com a data do último treino.
- **CP5 — Escolha.** Desmarcar um e marcar outro troca a linha nos três gráficos; tentar marcar um quarto mostra a mensagem e não marca; a escolha é lembrada ao sair e voltar à aba e ao reabrir o app.
- **CP6 — Termômetro por principal.** Um grupo Single de ativação num principal que não é um dos três aparece no termômetro com o nome desse principal; singles sem RPE não geram ponto e não quebram o gráfico.
- **CP7 — Vazio.** Sem série principal registrada, os gráficos mostram o texto de estado vazio, sem erro.
- **CP7b — RPE assumido.** Uma série Normal sem RPE registrado aparece no e1RM como ponto vazado calculado com RPE 10, a nota "Pontos vazados: série sem RPE, calculada como RPE 10 (esforço máximo)." aparece, e o registro da série continua sem RPE (verificável por teste e na tela da série). O pacote do Claude não inclui esses pontos.
- **CP8 — Nomes longos.** Um nome com 40 caracteres na legenda é cortado com reticências sem quebrar a tela, também com texto grande.
- **CP9 — Pacote do Claude.** A seção de e1RM do pacote lista um item por exercício principal com os mesmos números de antes para o plano atual.
- **CP10 — Sem regressão.** Planejado × feito, Agrupar e Por dia ficam idênticos; `npm test`, `npm run test:import`, `npm run typecheck` e `npx expo lint` passam.

## Verificação
- **Na nuvem / testes automáticos:** séries por exercício principal (carga, e1RM, termômetro), escolha das 3 mais recentes, singles sem RPE, RPE assumido no e1RM, nomes longos, relatório do Claude, e a comparação com o plano atual (CP1, CP2, CP6, CP7, CP7b, CP9, CP10).
- **Prévia web:** conferir os três gráficos com os dados do simulador/prévia, o chip e a folha de seleção (CP1, CP4, CP5, CP8).
- **No simulador / iPhone (roteiro):**
  1. Antes de instalar a versão nova, anotar os pontos dos três gráficos com dados reais. Instalar e abrir Análises → Gráficos: mesmos pontos, legendas com os nomes dos exercícios (CP1).
  2. Em Hoje, abrir um treino, trocar o exercício principal por outro do catálogo (troca "só este treino"), registrar uma série com RPE. Voltar às Análises: linha nova com o nome do novo exercício;
     a antiga mantém o histórico (CP2).
  3. Adicionar "Supino inclinado" a um treino como Principal, registrar uma série com RPE: linha na carga e no e1RM (CP3).
  4. Repetir o passo 3 até haver 5 principais registrados: chip "Exercícios (5 de ...)"; abrir a folha, trocar as linhas, tentar marcar uma quarta (CP4, CP5). Fechar e reabrir o app: a escolha continua (CP5).
  5. Conferir o termômetro com um grupo Single no principal novo, e que um single sem RPE não gera ponto nem erro (CP6). Registrar uma série Normal "conforme o plano" (sem RPE) e ver o ponto vazado e a nota no e1RM (CP7b).
  6. Dados → copiar o pacote para o Claude: seção de e1RM por exercício (CP9).
  - **Só no iPhone:** leitura da legenda com nomes longos em texto grande; toque na folha de seleção com uma mão.

## Riscos e perguntas abertas
- **Risco de UX:** o atleta que troca o principal a cada ciclo acumula linhas; o seletor resolve, mas "as 3 mais recentes" pode esconder um exercício que ele queira comparar. Mitigação: a escolha fica salva.
- **Risco:** exercícios com nomes quase iguais (um principal criado duas vezes pelo catálogo) viram duas linhas. Aceitável nesta etapa; unir exercícios é backlog.
- **Respondida em 06/11/2026:** 3 linhas por vez bastam (decisão acima); ampliar a paleta só entra se isso mudar.
- **Risco de leitura (RPE assumido):** séries feitas "conforme o plano" com carga leve e sem RPE vão gerar e1RM **abaixo** do máximo real (a estimativa é conservadora); a linha pode parecer estagnada ou baixa. Por isso os pontos vazados e a nota. Se incomodar, a alternativa é
  uma chave "Contar séries sem RPE" no gráfico; fica fora por ora.
- **A confirmar com o usuário (leitura do pedido):** entendi "se não tiver RPE registrado, vai contar que aquele foi o máximo" como "assumir RPE 10 no cálculo" (não como "essa série foi o 1RM dele"). Se ele quis dizer outra coisa, ajustar o texto.
- **Verificação pendente (não é pergunta ao atleta):** os dados do plano atual têm um principal por movimento; confirmar no teste dourado que ninguém marcou outro exercício como Principal por engano (aparece como linha extra).
- O gráfico de **evolução dos máximos** (um ponto por mudança de máximo) não é este: está no [PBI 23](../23-evolucao-dos-maximos/pbi.md).

## Andamento
| Data | Nota |
|---|---|
| 06/11/2026 | PBI criado a partir da fatia "análises" da spec 15 (item 15e). |
| 06/11/2026 | Atleta confirmou: 3 linhas por vez bastam. Nomes ajustados para "Agachamento". |
| 06/11/2026 | Usuário: série sem RPE conta como esforço máximo no e1RM (RPE 10 assumido, marcado na tela e nunca gravado); single agora é tipo de série (PBI 19); persona ampliada. |
