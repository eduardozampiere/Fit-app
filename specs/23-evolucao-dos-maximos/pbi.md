# 23 — Evolução dos máximos · PBI

> **Produto: o quê e por quê.** Dono: `product-manager` (`/pm`). O como fica em [tech-plan.md](tech-plan.md).

> **Resumo:** Gráfico de evolução dos máximos em Análises, com passado estimado dos treinos e lançamento manual de valores passados.

**Status:** ⏳ a fazer (23a e 23b prontos para planejar; 23c é escopo a redefinir com o usuário)
**Depende de:** [21](../21-historico-de-maximos/pbi.md) (pontos), [22](../22-analises-por-exercicio/pbi.md) (e1RM, RPE assumido, até 3 linhas); indiretamente 19, 20, 24. Recurso avançado: chip "Máximos" só com o interruptor ligado (P3 do [PBI 20](../20-maximos-proprios/pbi.md)).

## Objetivo
Responder "meu máximo está subindo?". O histórico (PBI 21) é só uma lista e começa na instalação. Uso fora do treino, em Análises e na folha do máximo.

## Escopo
- Entra 23a: chip "Máximos" em Análises → Gráficos, linha em degraus por máximo, até 3 por vez.
- Entra 23b: camada "e1RM dos treinos (estimado)" tracejada (desligada por padrão) e botão "Lançar valor passado".
- Não entra: sugestão pelo e1RM (23c, sem aviso na Hoje nem notificação); gravar pontos estimados no histórico; linha de meta (backlog); editar/excluir histórico; mudar a "Revisão de máximo"; volume por músculo, comparação, previsão.

## Comportamento
- **23a:** título "Evolução dos máximos"; degraus (valor vale até a próxima mudança; última linha segue até hoje); cor pela paleta, legenda, valor atual na ponta, um eixo em kg; datas "05 nov".
- Padrão: os 3 máximos que mais mudaram em 6 meses; com mais de 3, chip "Máximos (3 de 5)" abre folha com caixas ("Escolha até 3 máximos. Desmarque um para trocar."); escolha salva, separada da do PBI 22.
- Um registro só: "Ainda há um só valor para <nome>. A linha muda quando você mudar o máximo." Sem máximos: "Crie um máximo em Ajustes para acompanhar a evolução."
- Atalho: "Ver no gráfico" na folha do máximo abre Análises já com ele marcado.
- **23b estimativa:** chip "Estimativa dos treinos"; linha tracejada na mesma cor, um ponto por sessão: melhor e1RM (RTS, igual ao PBI 22) das séries Normais de 1–10 reps, sem falha, dos exercícios principais ligados ao máximo. Cobre também antes do 1º registro (inclui Hevy). Série sem RPE = RPE 10, ponto vazado, nota "Pontos vazados: série sem RPE, calculada como RPE 10 (esforço máximo)."; nunca gravado na série. Sem séries: "Sem séries principais registradas para estimar <nome>."
- **Lançar valor passado:** folha com Data (não futura) e Valor (kg, > 0); origem "Lançado depois", em ordem cronológica; não muda o máximo atual nem cargas; vira degrau no gráfico. Erros: "A data não pode ser no futuro.", "Informe um valor maior que zero." Data posterior ao último registro: "Esta data é mais recente que o último registro. Isto vai mudar o máximo atual?" → "Só registrar no histórico" / "Mudar o máximo atual" (fluxo normal, recálculo, "Manual").

## Decisões
- Um PBI para gráfico e passado — mesmo cálculo e mesma tela. Gráfico em Análises com atalho; descartado gráfico na folha (sem espaço, sem comparar).
- Degraus, não linha inclinada — não inventar valores intermediários. Até 3 linhas (como PBI 22).
- Estimado não vira registro (usuário, 06/11/2026); lançado à mão é gravado.
- Série sem RPE = RPE 10 — pedido do usuário, conservador; descartado ignorá-las (camada quase vazia).
- Nova origem "Lançado depois"; "Sugestão do e1RM" só se a 23c for aprovada.
- 23c adiada: usuário quer decidir melhor; sem aviso na Hoje. Rascunho aprovado: sugerir se e1RM supera o máximo em ≥ 2,5 kg em 2 sessões em 3 semanas; valor = menor e1RM, arredondado para baixo a 2,5 kg; só subir; sempre confirmar mostrando impacto.
- Respostas (06/11/2026): quer gráfico, retroativo e sugestão; app serve também a quem só faz academia normal.

## Critérios de pronto
- **CP1** Chip e gráfico: linha em degraus por máximo selecionado, legenda e valor na ponta.
- **CP2** Mudar o máximo cria degrau na data; salvar o mesmo valor não cria.
- **CP3** Com 5 máximos, mostra 3; chip abre folha, 4º marcado é recusado com a mensagem; escolha persiste ao reabrir o app.
- **CP4** Estados de 1 registro, sem máximos e muitos registros, sem erro.
- **CP5** "Ver no gráfico" abre com o máximo marcado.
- **CP6** Outros gráficos e cargas intactos (teste dourado do PBI 19 verde).
- **CP7** Camada tracejada igual ao e1RM do PBI 22 no mesmo exercício e dia (teste).
- **CP8** Mostra pontos anteriores ao "Valor inicial" se houver treinos antigos.
- **CP9** Mais de 10 reps ou falha não entram; sem RPE entra como 10, vazado, com nota; série sem RPE gravado (teste).
- **CP10** Sem séries principais: mensagem, sem erro, nada no histórico.
- **CP11** Lançar valor salva "Lançado depois" na posição certa sem mudar máximo/cargas; data futura e valor 0 recusados.
- **CP12** Data posterior ao último registro mostra a pergunta; cada opção faz o descrito.
- **CP13** "Lançado depois" sobrevive a backup/restauração.
- **CP14** Alvo 56 pt, rótulos de acessibilidade, Dynamic Type, pt-BR.
- **CP15** `npm test`, `test:import`, `typecheck` e `expo lint` passam.

## Verificação
- Testes: degraus, escolha de 3, e1RM por máximo, lançamento, backup (CP2, 3, 7, 9–13, 15). Prévia web: chip, gráfico, camada, folhas.
- iPhone: 1. Análises → Máximos com dados reais (CP1, 4). 2. Mudar supino para 175 e salvar o mesmo valor (CP2). 3. Ligar estimativa; conferir antes do valor inicial, um ponto contra o e1RM, vazados e nota (CP7–9). 4. "Lançar valor passado" 160 kg há um mês; testar data futura, 0 e data posterior ao último (CP11, 12). 5. Exportar/restaurar backup (CP13). Só no iPhone: texto grande, uma mão, velocidade com meses de treino (CP14).

## Riscos e perguntas abertas
- e1RM é estimativa, não o máximo real; com RPE 10 assumido tende a ficar abaixo. Ler como tendência.
- Passado sem séries fica em branco. Escalas muito diferentes no mesmo eixo achatam linhas (aceito).
- A decidir (23c): onde aparece; séries sem RPE contam?; sobreposição com a revisão do treinador (propõe-se não mostrar as duas); bloqueios (dor/alarme em 7 dias, falha); vale para quem não usa máximos por %?

## Andamento
| Data | Nota |
|---|---|
| 06/11/2026 | PBI criado e respondido: estimado não vira registro; limites ok; sem aviso na Hoje; 23c virou escopo em aberto; sem RPE = esforço máximo. |
