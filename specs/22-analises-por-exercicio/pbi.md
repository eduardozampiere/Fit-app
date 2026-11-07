# 22 — Análises por exercício principal: qualquer exercício vira linha no gráfico · PBI

> **Produto: o quê e por quê.** Dono: `product-manager` (`/pm`). O como fica em [tech-plan.md](tech-plan.md),
> do `tech-planner` (`/planejar`).
> Parte 4 de 4 da [spec 15](../15-exercicio-unico/spec.md). Antes: [19 Formato v2](../19-formato-v2/pbi.md).

**Status:** ⏳ a fazer
**Depende de:** [19 — Formato v2](../19-formato-v2/pbi.md) (single ligado ao principal pelo próprio item). Não depende do 20 nem do 21; pode ser feito antes ou depois deles.

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
  - **Máximo estimado (e1RM)**: o mesmo critério (uma linha por exercício principal com série principal e RPE).
  - **Termômetro: single de ativação**: uma linha por exercício principal que tenha single ligado a ele (o single é lido pelo próprio principal), com RPE por semana.
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
- Mesmo critério de linhas e de seletor; o valor continua sendo o da tabela RTS com a melhor série principal com RPE.

**"Termômetro: single de ativação"**
- Uma linha por exercício principal que tenha single ligado a ele e com RPE registrado; título da linha: o nome do principal (ex.: "Agachamento (High Bar)"). Singles que ficaram sem principal
  (órfãos) não aparecem no gráfico. O eixo e a leitura ("subir é sinal de cansaço") continuam iguais.

**Relatório / pacote para o Claude**
- A seção de e1RM passa a listar um item por exercício principal (ex.: "e1RM Agachamento (High Bar): 214 kg (05 nov, tabela RTS)"), em vez de um por levantamento. Os números são os mesmos para o
  plano atual.

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
- **CP1 — Plano atual igual.** Com o plano atual, os três gráficos (carga, e1RM, termômetro) mostram os mesmos pontos de antes, em três linhas, e só os nomes da legenda mudam para os dos exercícios
  principais (o teste dourado do PBI 19 compara os valores).
- **CP2 — Troca de principal.** Registrar treinos com um exercício principal A, trocar o principal desse treino para B e registrar mais: o gráfico de carga passa a ter linhas A e B, cada uma com os seus pontos.
- **CP3 — Principal fora dos três.** Marcar "Supino inclinado" como Principal em um treino e registrar uma série: aparece uma linha com esse nome na carga e, se houve RPE, no e1RM.
- **CP4 — Mais de 3.** Com 5 principais registrados, o gráfico mostra as 3 com registro mais recente e o chip "Exercícios (3 de 5)" aparece; abrir a folha lista os 5 com a data do último treino.
- **CP5 — Escolha.** Desmarcar um e marcar outro troca a linha nos três gráficos; tentar marcar um quarto mostra a mensagem e não marca; a escolha é lembrada ao sair e voltar à aba e ao reabrir o app.
- **CP6 — Termômetro por principal.** Um single ligado a um principal que não é um dos três aparece no termômetro com o nome desse principal; um single sem principal não aparece e não quebra o gráfico.
- **CP7 — Vazio.** Sem série principal registrada, os gráficos mostram o texto de estado vazio, sem erro.
- **CP8 — Nomes longos.** Um nome com 40 caracteres na legenda é cortado com reticências sem quebrar a tela, também com texto grande.
- **CP9 — Pacote do Claude.** A seção de e1RM do pacote lista um item por exercício principal com os mesmos números de antes para o plano atual.
- **CP10 — Sem regressão.** Planejado × feito, Agrupar e Por dia ficam idênticos; `npm test`, `npm run test:import`, `npm run typecheck` e `npx expo lint` passam.

## Verificação
- **Na nuvem / testes automáticos:** séries por exercício principal (carga, e1RM, termômetro), escolha das 3 mais recentes, singles órfãos, nomes longos, relatório do Claude, e a comparação com o plano atual (CP1, CP2, CP6, CP7, CP9, CP10).
- **Prévia web:** conferir os três gráficos com os dados do simulador/prévia, o chip e a folha de seleção (CP1, CP4, CP5, CP8).
- **No simulador / iPhone (roteiro):**
  1. Antes de instalar a versão nova, anotar os pontos dos três gráficos com dados reais. Instalar e abrir Análises → Gráficos: mesmos pontos, legendas com os nomes dos exercícios (CP1).
  2. Em Hoje, abrir um treino, trocar o exercício principal por outro do catálogo (troca "só este treino"), registrar uma série com RPE. Voltar às Análises: linha nova com o nome do novo exercício;
     a antiga mantém o histórico (CP2).
  3. Adicionar "Supino inclinado" a um treino como Principal, registrar uma série com RPE: linha na carga e no e1RM (CP3).
  4. Repetir o passo 3 até haver 5 principais registrados: chip "Exercícios (5 de ...)"; abrir a folha, trocar as linhas, tentar marcar uma quarta (CP4, CP5). Fechar e reabrir o app: a escolha continua (CP5).
  5. Conferir o termômetro com um single ligado ao principal novo e a ausência de erro quando o single não tem principal (CP6).
  6. Dados → copiar o pacote para o Claude: seção de e1RM por exercício (CP9).
  - **Só no iPhone:** leitura da legenda com nomes longos em texto grande; toque na folha de seleção com uma mão.

## Riscos e perguntas abertas
- **Risco de UX:** o atleta que troca o principal a cada ciclo acumula linhas; o seletor resolve, mas "as 3 mais recentes" pode esconder um exercício que ele queira comparar. Mitigação: a escolha fica salva.
- **Risco:** exercícios com nomes quase iguais (um principal criado duas vezes pelo catálogo) viram duas linhas. Aceitável nesta etapa; unir exercícios é backlog.
- **Respondida em 06/11/2026:** 3 linhas por vez bastam (decisão acima); ampliar a paleta só entra se isso mudar.
- **Verificação pendente (não é pergunta ao atleta):** os dados do plano atual têm um principal por movimento; confirmar no teste dourado que ninguém marcou outro exercício como Principal por engano (aparece como linha extra).
- O gráfico de **evolução dos máximos** (um ponto por mudança de máximo) não é este: está no [PBI 23](../23-evolucao-dos-maximos/pbi.md).

## Andamento
| Data | Nota |
|---|---|
| 06/11/2026 | PBI criado a partir da fatia "análises" da spec 15 (item 15e). |
| 06/11/2026 | Atleta confirmou: 3 linhas por vez bastam. Nomes ajustados para "Agachamento". |
