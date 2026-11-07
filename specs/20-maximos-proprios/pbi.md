# 20 — Máximos próprios: crie máximos e use em qualquer exercício · PBI

> **Produto: o quê e por quê.** Dono: `product-manager` (`/pm`). O como fica em [tech-plan.md](tech-plan.md).
> Parte 2 da [spec 15](../15-exercicio-unico/spec.md).

> **Resumo:** Criar máximos próprios (lista em Ajustes) e escolher "Carga baseada em" um deles, com % do máximo, em qualquer exercício.

**Status:** ⏳ a fazer
**Depende de:** [19](../19-formato-v2/pbi.md) e [24](../24-series-com-tipo/pbi.md). Bloqueia a spec 18. Não bloqueia a 16 (carga fixa em kg basta).

## Objetivo
- Hoje só agachamento/supino/terra têm máximo e % ; "Barra fixa lastrada" só aceita kg fixos e adicionar principal pergunta "qual movimento?".
- Recurso avançado (público também inclui quem só faz academia normal): nada aqui é obrigatório para criar ou registrar treino.
- Uso: planejando (Plano/Ajustes) e, às vezes, adicionando exercício no meio do treino.
- Sucesso: criar "Barra fixa lastrada" 30 kg, ligar o item a 80% e ver 24 kg, sem Claude e sem pergunta de movimento.

## Escopo
- Entra:
  - Ajustes → Máximos (substitui "Máximos de referência"): listar, criar, renomear, alterar valor, voltar ao valor do plano, apagar.
  - "Carga baseada em" + "% do máximo" no editor do item (Plano e Hoje), com a carga resultante.
  - Folha de tipo ao adicionar: Acessório / Variação / Principal, sem perguntar o movimento.
  - Miniatura da barra vale para item principal ou com máximo; "Pegada" só onde o máximo tem essa regra (terra).
  - Claude vê e usa os máximos (pacote com id e nome; `set_max` por id). Trocar exercício mantém máximo e %.
- Não entra: histórico de mudanças (PBI 21); linhas por exercício nas Análises (22); regras do treinador para máximos novos (spec 18: sem portões, freio nem revisão); várias periodizações na UI (16); sugerir máximo por e1RM ([23](../23-evolucao-dos-maximos/pbi.md)); apagar vínculos em lote (P1); unidades além de kg.

## Comportamento
- Lista: "Agachamento · 205 kg"; se difere do plano, mostra "plano: 200 kg". Vazio: "Nenhum máximo. Crie um para calcular cargas em %." + "Novo máximo" (56 pt).
- Folha (fecha arrastando, sem Cancelar): Nome (até 40, único sem maiúsculas/acento), Valor kg (digitar ou −/+ de 2,5). Erros: "Dê um nome ao máximo." / "Já existe um máximo com esse nome." / "Informe um valor maior que zero."
- Edição (toque na linha): Salvar só se mudou; "Voltar ao valor do plano (200 kg)" só se difere; "Onde é usado" agrupado por exercício com nº de treinos (vazio: "Nenhum exercício usa este máximo."); "Apagar máximo" vermelho.
- Apagar em uso: bloqueia com "Não dá para apagar “X”. N treinos usam este máximo. Troque a carga desses exercícios para kg fixos ou para outro máximo e tente de novo." + lista. Sem uso: confirma "Apagar “X”? Isso não afeta nenhum treino." Os 3 atuais também podem ser apagados se sem uso (hoje o plano usa).
- Renomear não muda id/vínculo. Alterar valor recalcula cargas por % (múltiplos de 2,5) só na periodização ativa; treinos registrados intactos.
- Editor: linha "Carga baseada em" ("Carga fixa (kg)" ou nome) abre folha com carga fixa + máximos com valor. Com máximo: "% do máximo" e "= 164 kg"; kg fixo some. Máximo é do exercício; % é de cada grupo de séries (principal 80%, single 92%, back-off 75%).
- Fixo → máximo: % sugerido = mais próximo da carga atual (1%). Máximo → fixo: kg = carga do momento (não pula). Alcance da edição como hoje; item pode ter máximo sem ser principal.
- Adicionar exercício: escolhido o tipo, entra sem outra pergunta, com carga fixa; "Carga baseada em" em até 2 toques (editor → linha).
- Plano: "4x4 · 164 kg". Resumo de Hoje: 3 primeiros máximos + "+N", toque abre Ajustes → Máximos. Offline: tudo local.
- Regras: app nunca altera cargas sozinho; alvo 56 pt; pt-BR com vírgula.

## Decisões
- Lista separada dos exercícios (entrevista 06/11/2026) — permite máximo compartilhado (livre, pausa, back-off) e sobrevive a troca/apagar exercício. Descartado: máximo como atributo do exercício.
- Nome não leva o valor; renomear mantém id.
- Apagar em uso é bloqueado — evita perder ligação sem perceber. Descartado: apagar e converter para kg fixos.
- Sem pergunta de movimento ao adicionar — evita atrito no treino. Descartado: perguntar o máximo ao adicionar.
- Trocar exercício mantém máximo e % — carga pertence ao lugar no treino.
- Passo 2,5 kg + digitação — 5 kg é grosso para lastro. Descartado: manter 5.
- Valor vale para a periodização ativa; "valor do plano" é referência. Ao criar, valor do plano = valor informado.
- Máximos novos sem regras até a spec 18.
- 06/11/2026: nome inicial "Agachamento"; atalho "Desligar em todos" fora (backlog); sugestão por e1RM vai ao PBI 23.

## Critérios de pronto
- **CP1** — Máximos mostra Agachamento/Supino/Terra com valores atuais e, se diferentes, do plano.
- **CP2** — Criar "Barra fixa lastrada" 30 kg em até 3 toques; aparece no seletor.
- **CP3** — Nome vazio/repetido ("agachamento" × "Agachamento") e valor zero/vazio não salvam e mostram a mensagem.
- **CP4** — Renomear Terra → "Terra convencional" mantém vínculos, cargas e alertas; novo nome em seletor, Ajustes e pacote do Claude.
- **CP5** — Supino 170 → 175 recalcula só os itens ligados (2,5 kg); outros máximos e séries registradas intactos.
- **CP6** — "Voltar ao valor do plano" só aparece se difere e restaura.
- **CP7** — Apagar em uso mostra aviso + "Onde é usado" e não apaga; sem uso confirma, apaga e some do seletor.
- **CP8** — Item com "Barra fixa lastrada" a 80% mostra "= 24 kg" no editor, Plano e Hoje; máximo 35 kg → 28 kg.
- **CP9** — Máximo → "Carga fixa (kg)" mantém a carga e o item deixa de reagir.
- **CP10** — Adicionar Principal/Variação não pergunta movimento; editor liga máximo em até 2 toques.
- **CP11** — Trocar exercício mantém máximo e %.
- **CP12** — Plano atual sem mexer: alertas, cargas, Análises e e1RM idênticos ao PBI 19 (teste dourado).
- **CP13** — Principal com máximo novo funciona em Hoje (série, RPE, "conforme o plano") sem alertas de portão/freio/revisão; "Pegada" só no terra.
- **CP14** — Pacote lista id, nome e valor; `set_max` por `maxId` aplica com a confirmação atual; `lift` antigo segue funcionando.
- **CP15** — Máximos criados/renomeados/apagados sobrevivem a backup e restauração.
- **CP16** — Botões principais com 56 pt, rótulo de acessibilidade e texto grande.
- **CP17** — `npm test`, `test:import`, `typecheck` e `expo lint` passam.

## Verificação
- Testes: validação, cálculo/arredondamento, bloqueio de apagar, troca, `set_max`, backup (CP3, 5, 7–9, 11, 14, 15, 17). Prévia web: Ajustes, editor, folha de tipo (CP1–4, 6, 8, 10).
- iPhone: 1. Conferir os 3 máximos (CP1). 2. Criar "Barra fixa lastrada" 30; testar branco, "agachamento", 0 (CP2–3). 3. Plano → item Barra fixa → Carga baseada em → 80% = 24 kg; ver em Hoje (CP8). 4. Máximo 35 → 28 kg, outros intactos (CP5). 5. Voltar a kg fixo (CP9). 6. Apagar "Agachamento" bloqueia; "Barra fixa lastrada" sem uso apaga (CP7). 7. Hoje: adicionar Principal sem pergunta; ligar máximo em ≤2 toques (CP10). 8. Registrar séries nos dois itens; alertas do agachamento iguais (CP12–13). 9. Renomear Terra; "Pegada" segue (CP4). 10. Pacote do Claude, `set_max` por `maxId`, backup (CP14–15). Só iPhone: toque com uma mão, texto grande, teclado numérico (CP16).

## Riscos e perguntas abertas
- UX: "Agachamento pausa" não herda mais o máximo; 1 passo a mais. Mitigação: linha em destaque; backlog "sugerir máximo pelo nome".
- UX: nomes parecidos confundem "Onde é usado"; por isso agrupa por exercício e conta treinos.
- Risco: perder vínculo ao apagar/renomear; coberto por id estável (CP4, CP7).
- P1 (não bloqueia): apagar máximo usado em 14 semanas exige desligar item a item; atalho "Desligar em todos" só se incomodar (decidido: fora).
- P3 (define o público, não bloqueia): esconder Máximos e "Carga baseada em" atrás de "Recursos avançados" (desligado em instalações novas, ligado para o atleta atual)? Recomendação: sim.

## Andamento
| Data | Nota |
|---|---|
| 06/11/2026 | Criado (spec 15, itens 15c/15f); vira recurso avançado, % por grupo de séries, P3; respostas: nome "Agachamento", atalho no backlog, e1RM no PBI 23. |
