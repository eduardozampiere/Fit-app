# 19 — Modelo de treino v2: máximos com nome e séries com tipo dentro do exercício · PBI

> **Produto: o quê e por quê.** Dono: `product-manager` (`/pm`). O como fica em [tech-plan.md](tech-plan.md) (`/planejar`). Detalhe técnico vai para o tech-plan.
> Parte 1 da [spec 15](../15-exercicio-unico/spec.md). Ordem: **19** → [24](../24-series-com-tipo/pbi.md) → [16](../16-periodizacoes/spec.md) → [20](../20-maximos-proprios/pbi.md) → [21](../21-historico-de-maximos/pbi.md)/[22](../22-analises-por-exercicio/pbi.md) → [23](../23-evolucao-dos-maximos/pbi.md).

> **Resumo:** migrar o plano para máximos com id e nome e séries tipadas (S, B, W) dentro do exercício, sem mudar números.

**Status:** ⏳ a fazer
**Depende de:** — (primeira da série). Bloqueia 24, 20, 21, 22 e, por consequência, 16 e 18.

## Objetivo
- Hoje single, back-off, duplas de volume e walkout são exercícios separados; apps de academia (Hevy) usam exercício → séries com tipo. O usuário quer o app usável por outras pessoas e pediu "back-off é tipo de série".
- Uma única migração, sem volta (com cópia de segurança): máximos com id e nome, grupos de séries com tipo, regras por máximo (opcionais por periodização).
- Sucesso: plano, treinos e Análises com os mesmos números; só muda "Agacho" → "Agachamento" e S/B/W dentro do cartão. Uso: atleta, com uma mão, entre séries.

## Escopo
- **Entra:**
  - Atualização automática para `fitapp.cycle/v2` (plano e periodizações guardadas), na 1ª abertura, com cópia de segurança antes e aviso único.
  - Teste "dourado" do plano atual escrito antes de mexer nas regras.
  - Máximos com id estável (`squat`, `bench`, `deadlift`) e nome; cada exercício aponta o máximo-base (ou nenhum = kg fixo).
  - Grupos de séries por exercício: tipo, nº de séries, reps (ou duração), carga (kg ou %), RPE, descanso e nome opcional. Tipos: Normal, Aquecimento, Single de ativação, Back-off, Walkout (prescritos); Falha e Drop set só no registro. Máx. 1 grupo Single e 1 Walkout por exercício.
  - Conversão: 21 singles → grupo Single; 8 back-offs → Back-off; 3 duplas de volume → Back-off nomeado "Duplas de volume"; 4 walkouts (1 × 5–8 s, 210 kg fixos, 3 min 30 s) → Walkout do principal do mesmo movimento e sessão. Sem principal: vira Acessório com o nome antigo.
  - Histórico preservado: séries antigas dos itens absorvidos vão para o principal com tipo S/B/W; contagens, tonelagem e Análises iguais.
  - Hoje e Plano mostram grupos dentro do cartão (letras S/B/W; legenda do nome do grupo; W mostra carga e duração). Editar valores de grupo existente no editor atual; lixeira de S e W remove o grupo do treino.
  - Regras por máximo idênticas às de hoje; ausentes = ciclo sem regras.
  - Claude: ciclo v1, ajustes v1 (`lift`), `set_max` com `maxId`, `add/edit/remove_item` de tipos antigos viram operação no grupo do principal; backup v1 restaurável.
  - "Agacho" → "Agachamento" em todos os textos (alertas, Ajustes, Hoje, Análises, pacote do Claude, prévias).
  - Docs `docs/formato-ciclo.md` e `docs/claude-treinador.md` em v2.
- **Não entra:** criar/apagar/reordenar grupos e escolher tipo pela tela (PBI 24); criar/renomear/apagar máximos e "Carga baseada em" (20); histórico de máximos (21); gráficos por exercício (22); tela de regras (18); periodização em branco (16; aqui só ciclo sem regras abre sem erro); prescrever Falha/Drop set; distribuição para outras pessoas (P1).

## Comportamento
- **1ª abertura:** grava cópia `backup-antes-da-atualizacao-AAAA-MM-DD.json` (fica até o usuário apagar; compartilhável depois em Dados), atualiza e mostra uma vez "Dados atualizados" / "Seu plano e seus treinos continuam iguais. Antes de atualizar, o app salvou uma cópia de segurança dos seus dados." Botões "Compartilhar cópia" e "Ok". Offline igual.
- **Erro na cópia:** não atualiza; tela "Não foi possível atualizar os dados" / "Seus treinos não foram alterados. Libere espaço no iPhone e tente de novo." + "Tentar de novo". Reabrir não repete nada.
- **Hoje:** um cartão por exercício; 1ª coluna = nº (Normal), A, S, B, W, F, D; tocar na letra de série registrada abre a folha de tipo atual. "Feito conforme o plano" em ≤ 2 toques marca todas; RPE pedido depois do principal (não na W). Descanso por tipo como hoje (single 5 min, back-off 3 min; ex-duplas 3 min 30 s gravados no grupo); ajustes de descanso dos itens absorvidos passam às séries correspondentes. Nº de exercícios diminui; séries e tonelagem não.
- **Plano:** linha com grupos em sequência, ex.: "Single 1x1 · 170 kg · Back-off 2x3 · 150 kg".
- **Igual a antes:** treinos, cargas, ordem, alertas (só a palavra muda), Análises (gráficos só com séries Normais), Máximos de referência e "Voltar aos máximos do plano", Dados.
- **Tela do exercício:** histórico do principal mostra S/B/W com a letra; recordes, máximo e e1RM contam Normal e Back-off (no plano atual a carga recorde não muda: 150 kg vs 170–210 kg).
- **O que cada tipo conta:** Normal: tudo. Back-off: tonelagem, n/m, recordes, e1RM; fora de top set e gráficos; pede RPE. Single: só tonelagem e n/m; fadiga do single lê; pede RPE. Walkout: 1 no n/m, 0 kg, fora do resto, sem RPE. Aquecimento: nada, como hoje. Falha/Drop: como hoje.
- **Trocar o tipo** de série registrada (ex.: Single → Normal) recalcula tudo na hora; o app nunca troca sozinho.
- **Ciclo sem regras:** abre sem erro em Hoje, Plano e Análises, sem alertas de regra, arredondando 2,5 kg; dor e sinais de alarme seguem ativos com limites padrão.
- **Claude/importação:** v1 convertido; v2 entra como veio; pacote lista máximos (id e nome) e séries por tipo.

## Decisões
- Uma migração só para máximos + séries tipadas — não tem volta; migrar em duas vezes repetiria o risco. Descartado: PBI de séries antes do 19 (duas migrações); manter back-off/duplas como exercícios (contradiz o pedido).
- 19 entrega equivalência; criar/editar grupos pela tela fica no PBI 24 — evita "base + telas novas". Custo: janela sem adicionar back-off pela tela (Claude pode).
- Single, back-off e walkout são tipos; "duplas de volume" não é tipo (usuário, 06–07/11). São jeitos de fazer séries do mesmo exercício.
- Duplas → sempre Back-off, nome "Duplas de volume" (a confirmar, P3): vêm depois do principal e mais leves; preserva tonelagem, top set e regras. Descartados: Normal (muda 4ª série e portões), Aquecimento (zera volume que conta).
- Walkout → grupo do principal (mesma regra do single), carga 210 kg fixa. Máx. 1 por exercício (sustentação única; letra W sem ambiguidade). Descartados: exercício à parte, Aquecimento.
- Letras: número, A, S, B, W, F, D. Prescrever Falha/Drop descartado (risco sem ganho); Aquecimento permitido no modelo, nada converte para ele.
- Contagem por tipo (usuário, 07/11): back-off é série como qualquer outra; gráfico só com Normais; single só tonelagem (contar no top set mudaria o gráfico em 10–30 kg nas semanas 1–8 e quebraria "Análises iguais"); single que bate recorde: usuário troca para Normal. Walkout fora de volume/recordes (210–220 kg distorceriam). Descartado: back-off só Normais nos recordes.
- Descanso: o de hoje; ajustes absorvidos migram; ex-duplas mantêm 3 min 30 s.
- Ids `squat/bench/deadlift` não mudam (ajustes, relatórios e histórico seguem válidos). Nomes "Agachamento/Supino/Terra" (usuário). Não renomear dados antigos: só a palavra exibida muda.
- Dor e alarme sempre ativos no plano do atleta (descartado: sem regras = sem alertas). Cópia obrigatória e guardada até apagar (Apple ID gratuito reinstala toda semana). Regras por máximo, idênticas (reescrever na spec 18). Formato v1 sempre lido.

## Critérios de pronto
- **CP1** — Teste dourado do plano atual (alertas, cargas, top set/e1RM, recordes, séries e tonelagem por sessão), verde antes e depois, com a troca de palavra e o back-off nos recordes; cobre single e walkout mais pesados que o principal sem alterar nada.
- **CP2** — Conversão: ids/nomes dos máximos; 21 Single, 8 Back-off, 3 duplas (Back-off nomeado, carga menor que a do principal), 4 Walkout no principal da mesma sessão; nenhum órfão, nenhum Aquecimento; "Duplas de volume" não é tipo; demais exercícios iguais.
- **CP3** — Treinos, séries (carga, reps, RPE, tipo), check-ins, pesos, refeições e ajustes iguais; séries absorvidas aparecem no principal com S/B/W; séries e tonelagem por sessão/semana iguais.
- **CP4** — Máximo alterado e o do plano continuam distintos; "Voltar aos máximos do plano" funciona.
- **CP5** — Cópia existe, abre em "Compartilhar cópia", aviso uma vez, app não apaga, restaurar devolve os dados de antes.
- **CP6** — Sem cópia, não atualiza, dados intactos, tela "Tentar de novo".
- **CP7** — Abrir várias vezes ou converter 2× não altera nada nem repete o aviso.
- **CP8** — Hoje, Plano, Análises, Ajustes e Dados iguais, exceto "Agachamento" (toda a tabela de textos) e séries dentro do cartão.
- **CP9** — Cartão com S/B/W na ordem do plano (ex-duplas como B com legenda; W com carga e 5–8 s); "feito conforme o plano" em ≤ 2 toques; RPE depois do principal, não na W; série marcada grava o tipo.
- **CP10** — Plano: editar carga/séries/reps/RPE de um grupo recalcula só ele; lixeira de S remove o single do treino.
- **CP11** — Alertas do treinador idênticos (dias, semanas, cargas), texto igual exceto a palavra.
- **CP12** — Análises (carga, e1RM, termômetro, planejado × feito, "Por dia") com os mesmos pontos; back-off, single e walkout não entram no top set/e1RM dos gráficos.
- **CP12b** — Trocar o tipo (Single ↔ Normal; Normal ↔ Single/Back-off/Walkout) recalcula tonelagem, recordes, e1RM e gráficos sem reabrir o app; teste e roteiro.
- **CP13** — Histórico do principal mostra S/B/W; recordes/máximo/e1RM contam Normal e Back-off, nunca single, walkout nem aquecimento.
- **CP13b** — Tonelagem de sessão/semana igual; n/m conta o walkout como 1.
- **CP14** — Descanso por tipo como hoje; ex-duplas 3 min 30 s; ajuste absorvido continua valendo.
- **CP15** — Walkout: linha W (210 kg, 5–8 s, 3 min 30 s); 1 série W sem reps; 1 no n/m, 0 kg, sem RPE, fora de carga/e1RM/regra; antigos aparecem como W; 210 kg não muda com o máximo.
- **CP16** — Ciclo v2 sem regras abre sem erro, sem alertas de regra, arredonda 2,5 kg.
- **CP17** — Nesse ciclo, dor pior ou sinal de alarme ainda alertam, com limites padrão.
- **CP18** — Importar v1 e v2; `set_max` com `lift` e `maxId` iguais; `add/edit/remove_item` antigos viram operação no grupo (prévia mostra o texto); pacote lista id/nome e séries por tipo; docs em v2 dizendo que v1 é aceito.
- **CP19** — Backup `fitapp.backup/v1` antigo restaura e o app abre com dados convertidos.
- **CP20** — `npm test`, `npm run test:import`, `npm run typecheck`, `npx expo lint` passam; importador da planilha gera v2.

## Verificação
- **Testes automáticos:** CP1–3, 7, 11, 12, 12b, 13b, 14, 16, 17 (regra), 18 (formato), 19, 20, com plano atual e ciclos v1 de exemplo (sem single, back-off sem principal, máximo alterado, descanso absorvido).
- **Prévia web:** banco da versão anterior, conferir Hoje, Plano e Análises.
- **Simulador (migração real):** 1. versão anterior: registrar 3 séries de principal+single+back-off, mudar supino +5, reordenar, ajustar descanso do back-off; anotar cargas, alertas, Análises, máximos, séries/tonelagem. 2. Instalar a nova por cima: aviso único, compartilhar cópia, Ok. 3. Comparar (igual, exceto palavra e S/B). 4. Tela do principal: histórico S/B/W, recordes, walkout; trocar S → Normal e voltar. 5. Reabrir: sem aviso. 6. Restaurar a cópia e um backup v1. 7. Importar v2 sem regras, check-in com dor, ajustes do Claude (`lift`, `maxId`, `add_item` back-off). 8. Plano: editar back-off, lixeira de S. 9. Simular falha da cópia.
- **iPhone:** passos 2–5 por cima da versão anterior (`npm run iphone`); só ele mostra compartilhar para Arquivos/AirDrop, velocidade com dados reais e toque nas linhas S/B.

## Riscos e perguntas abertas
- **Risco alto:** migração sem volta que também reatribui séries já registradas. Mitigação: cópia, teste dourado, idempotência, simulador antes do iPhone.
- **Risco:** maior PBI da série. Corte permitido: adiar só a troca visual dos cartões; nunca a conversão de dados.
- **Risco:** itens órfãos viram exercício comum (plano embutido não tem; teste cobre); com vários principais por movimento vale "o principal seguinte da mesma sessão e movimento".
- **Risco:** "Agachamento" em textos espalhados pode ficar misturado; CP8 e `grep` do tech-plan cobrem.
- **Risco de produto:** menos cartões muda o que o atleta vê (pedido dele).
- **P4 (não bloqueia):** walkout conta 1 no n/m? Proposta: sim (como hoje); se vetar, sai também da contagem.
- **P3 (confirmar):** duplas → Back-off está certo? Trocável depois no PBI 24.
- **P1 (não bloqueia):** distribuição para outras pessoas (conta Apple paga, plataformas, plano pessoal, Claude, idioma) — ver PLANO.
- **P2 (não bloqueia):** dor/24 h para não-atletas: recomendação, módulo avançado desligado por padrão; vale só para o atleta por ora.
- Respondidas: single (só tonelagem), walkout (tipo), dor/alarme ativos, cópia até apagar, nome "Agachamento".

## Andamento
| Data | Nota |
|---|---|
| 06/11/2026 | PBI criado da spec 15 (base) e ampliado com séries tipadas; respostas do usuário registradas. |
| 07/11/2026 | Usuário definiu o que cada tipo conta, single só tonelagem e walkout como tipo (W); CP12b/13b e tabela criados. |
