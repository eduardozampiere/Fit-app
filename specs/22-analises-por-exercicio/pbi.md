# 22 — Análises por exercício principal · PBI

> **Produto: o quê e por quê.** Dono: `product-manager` (`/pm`). O como fica em [tech-plan.md](tech-plan.md).
> Parte 4 de 4 da [spec 15](../15-exercicio-unico/spec.md).

> **Resumo:** Cada exercício marcado como Principal vira uma linha nos gráficos de carga, e1RM e termômetro, com seletor de até 3.

**Status:** ⏳ a fazer
**Depende de:** [19 — Modelo de treino v2](../19-formato-v2/pbi.md) (single/back-off são tipos de série). Não depende do 20 nem do 21.

## Objetivo
Os gráficos de Análises estão presos a agachamento/supino/terra; trocar o principal (ex.: High Bar → Low Bar) ou criar outro ("Supino inclinado") não aparece. Uso: fechar semana/ciclo e ver se carga e e1RM sobem. Serve também a quem só faz academia normal.

## Escopo
- Entra:
  - Carga dos principais: uma linha por exercício Principal com série registrada, legenda com o nome do exercício.
  - e1RM: mesmo critério, só séries Normais; série sem RPE entra como RPE 10 (nunca gravado).
  - Termômetro de single: uma linha por principal com Single de ativação com RPE.
  - Seletor (até 3, lembra a escolha) e relatório do Claude com e1RM por principal.
- Não entra: gráfico de evolução dos máximos ([PBI 23](../23-evolucao-dos-maximos/pbi.md)); juntar exercícios do mesmo movimento; volume por grupo muscular; outros gráficos; mais de 3 linhas; variações e acessórios.

## Comportamento
- Plano atual: 3 linhas, mesmos pontos; só a legenda passa a ter o nome do exercício (corta com reticências).
- Troca de principal: nova linha desde o primeiro treino; a antiga mantém o histórico.
- Mais de 3 principais: mostra os 3 de registro mais recente; chip "Exercícios (3 de 5)" (some com ≤3) abre folha (fecha arrastando, sem Cancelar) com caixa de marcar e "último treino 05 nov". Quarto: "Escolha até 3 exercícios. Desmarque um para trocar."
- e1RM: tabela RTS, melhor série Normal da sessão (1–10 reps, falha não conta). Sem RPE: ponto vazado + nota "Pontos vazados: série sem RPE, calculada como RPE 10 (esforço máximo)."; vence o maior e1RM, cheio se a vencedora tem RPE.
- Termômetro: sem RPE não há ponto (lê fadiga relatada). Eixo e leitura iguais.
- Pacote do Claude: um item por principal ("e1RM Agachamento (High Bar): 214 kg (05 nov, tabela RTS)"), só séries com RPE.
- Vazio: "Registre um treino com exercício principal para ver a carga." / "...para ver o e1RM."
- Regras de gráficos do projeto; pt-BR; offline.

## Decisões
- Uma linha por exercício principal (decisão 4 da spec 15, 06/11/2026) — descartado: por movimento (mascara troca de variação).
- Trocar o principal cria outra linha — o atleta quer ver a mudança; descartado: emendar pelo movimento.
- Até 3 linhas, 3 mais recentes por padrão — paleta tem 3 cores; descartado: ampliar paleta (pior legibilidade).
- Single lido pelo principal a que pertence (decisão 5).
- Escolha do seletor é preferência salva, vale para os 3 gráficos.
- Só tipo Principal tem linha — variações/acessórios já têm histórico na tela do exercício.
- Legenda pelo nome do exercício.
- e1RM só com séries Normais (07/11/2026); single que bate recorde conta se virar Normal.
- Sem RPE = RPE 10 no cálculo (06/11/2026) — conservador; descartado: chave "Contar séries sem RPE".

## Critérios de pronto
- **CP1** Plano atual: carga e termômetro iguais (só legenda muda); e1RM mantém pontos com RPE e ganha vazados para Normais sem RPE.
- **CP2** Trocar principal A→B: carga tem linhas A e B com seus pontos.
- **CP3** "Supino inclinado" Principal: linha em carga e e1RM (cheio com RPE, vazado sem).
- **CP4** 5 principais: 3 mais recentes + chip "Exercícios (3 de 5)"; folha lista 5 com data.
- **CP5** Trocar seleção muda os 3 gráficos; quarto bloqueado com mensagem; escolha persiste ao reabrir o app.
- **CP6** Single em principal fora dos três aparece com o nome dele; single sem RPE não gera ponto nem erro.
- **CP7** Sem série principal: texto de vazio, sem erro.
- **CP7b** Normal sem RPE: ponto vazado, nota exibida, registro continua sem RPE; pacote do Claude não os inclui.
- **CP8** Nome de 40 caracteres cortado com reticências, também com texto grande.
- **CP9** Pacote: um item por principal, mesmos números para o plano atual.
- **CP10** Planejado × feito, Agrupar, Por dia idênticos; `npm test`, `test:import`, `typecheck`, `lint` passam.

## Verificação
- Testes automáticos: CP1, CP2, CP6, CP7, CP7b, CP9, CP10. Prévia web: CP1, CP4, CP5, CP8.
- iPhone: 1. Anotar pontos antes; instalar e conferir os 3 gráficos (CP1). 2. Trocar o principal de um treino, registrar com RPE (CP2). 3. Adicionar "Supino inclinado" Principal (CP3). 4. Chegar a 5 principais, usar a folha, tentar o quarto, reabrir o app (CP4, CP5). 5. Single com e sem RPE; série Normal sem RPE (CP6, CP7b). 6. Copiar pacote do Claude (CP9).
- Só no iPhone: legenda longa em texto grande; folha com uma mão.

## Riscos e perguntas abertas
- UX: quem troca de principal a cada ciclo acumula linhas; "3 mais recentes" pode esconder uma desejada (mitigado: escolha salva).
- Principal criado duas vezes com nome quase igual vira duas linhas; unir exercícios é backlog.
- RPE assumido pode fazer a linha parecer baixa/estagnada (mitigado: ponto vazado e nota).
- A confirmar com o usuário: "contar como máximo" = assumir RPE 10 no cálculo (não "foi o 1RM").
- Verificar no teste dourado que ninguém marcou outro exercício como Principal por engano (linha extra).

## Andamento
| Data | Nota |
|---|---|
| 06/11/2026 | PBI criado (item 15e da spec 15); 3 linhas bastam; sem RPE conta como RPE 10 assumido, nunca gravado. |
