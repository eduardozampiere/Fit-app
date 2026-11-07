# 20 — Máximos próprios: crie máximos e use em qualquer exercício · PBI

> **Produto: o quê e por quê.** Dono: `product-manager` (`/pm`). O como fica em [tech-plan.md](tech-plan.md),
> do `tech-planner` (`/planejar`).
> Parte 2 de 4 da [spec 15](../15-exercicio-unico/spec.md). Antes: [19 Formato v2](../19-formato-v2/pbi.md).

**Status:** ⏳ a fazer
**Depende de:** [19 — Formato v2](../19-formato-v2/pbi.md). Bloqueia a spec 16 (periodizações) e a spec 18 (regras configuráveis).

## Objetivo
"Não deveria ter diferença entre terra, agacho e supino e os exercícios; todos são exercícios." Hoje só esses três têm máximo e carga em %
do máximo; um exercício como "Barra fixa lastrada" ou "Supino inclinado" só aceita carga fixa em kg, e ao adicionar um exercício principal o
app pergunta "qual movimento?" com três opções que não têm a ver com ele. Depois deste PBI o atleta **cria os próprios máximos** e escolhe,
em qualquer item do treino, **"Carga baseada em"** um deles. Momentos de uso: planejando a periodização (aba Plano / Ajustes) e, às vezes,
durante o treino, quando adiciona um exercício no meio da sessão.

Como saberemos que deu certo: o atleta consegue criar o máximo "Barra fixa lastrada" de 30 kg, fazer o item "Barra fixa" usar 80% dele e ver
a carga do dia calculada (24 kg), sem pedir ajuda do Claude e sem a pergunta de movimento.

## Escopo
- **Entra:**
  - Seção **Máximos** em Ajustes (substitui "Máximos de referência"): lista, criar, renomear, alterar valor, voltar ao valor do plano, apagar.
  - Campo **"Carga baseada em"** + **"% do máximo"** no editor do item (Plano e Hoje), com a carga resultante visível.
  - Folha de tipo ao adicionar exercício termina em **Acessório / Variação / Principal**, sem perguntar o movimento.
  - O que hoje só aparece para os três levantamentos passa a valer para qualquer item **principal ou com máximo** (a miniatura da barra no exercício);
    a "Pegada" continua só nos itens cujo máximo tem essa regra (hoje, o terra).
  - O Claude enxerga e usa os máximos novos (pacote com id e nome; `set_max` por id).
  - Trocar de exercício (troca do catálogo) **mantém** o "Carga baseada em" e o % do item.
- **Não entra:**
  - Histórico de mudanças de cada máximo (PBI 21; aqui os valores só são guardados).
  - Linhas por exercício nas Análises (PBI 22).
  - Criar regras do treinador para os máximos novos (spec 18). Máximos novos **não têm** portões, freio nem revisão.
  - Máximos por periodização com várias periodizações na UI (spec 16; aqui existe a periodização ativa).
  - Sugerir um máximo a partir dos treinos (e1RM): vai para o [PBI 23](../23-evolucao-dos-maximos/pbi.md).
  - Apagar vários vínculos de uma vez (ver P1).
  - Unidades que não sejam kg.

## Comportamento
**Ajustes → Máximos**
- Lista, uma linha por máximo: nome à esquerda, valor à direita ("Agachamento · 205 kg"). Se o valor atual é diferente do do plano, a linha mostra
  também "plano: 200 kg" em texto secundário. Estado vazio (todos apagados): "Nenhum máximo. Crie um para calcular cargas em %." com o botão
  "Novo máximo".
- Botão **"Novo máximo"** (alvo de toque de 56 pt) abre uma folha de baixo para cima (fecha arrastando, sem botão Cancelar) com:
  - Campo "Nome" (obrigatório, até 40 caracteres, sem repetir um nome já existente, sem diferenciar maiúsculas e acentos).
  - Campo "Valor (kg)" (obrigatório, maior que zero; pode ser digitado, e os botões − / + andam de 2,5 em 2,5 kg).
  - Botão "Salvar". Mensagens de erro em pt-BR abaixo do campo: "Dê um nome ao máximo.", "Já existe um máximo com esse nome.", "Informe um valor
    maior que zero."
- Tocar numa linha abre a mesma folha em modo edição, com:
  - "Nome" e "Valor (kg)" editáveis; "Salvar" (habilitado só se algo mudou).
  - "Voltar ao valor do plano (200 kg)" — só aparece quando o valor atual difere do do plano.
  - "Onde é usado": lista dos treinos/exercícios que usam este máximo, agrupados por exercício com a contagem de treinos (ex.: "Agachamento (High Bar)
    — 14 treinos"). Sem uso: "Nenhum exercício usa este máximo."
  - "Apagar máximo" (destrutivo, texto vermelho, abaixo de tudo).
- **Apagar:** se há itens usando, **não apaga**: aparece o aviso "Não dá para apagar “Barra fixa lastrada”. 6 treinos usam este máximo. Troque a
  carga desses exercícios para kg fixos ou para outro máximo e tente de novo." com a lista "Onde é usado". Se não há uso, pede confirmação ("Apagar
  “Barra fixa lastrada”? Isso não afeta nenhum treino.") e apaga.
- Renomear **não muda** o id nem o vínculo dos itens; o novo nome aparece em todo lugar. Alterar o valor recalcula as cargas por % de todos os
  itens ligados a ele (como hoje, em múltiplos de 2,5 kg) e só na periodização ativa; treinos já registrados mantêm a carga que foi feita.
- Os três máximos de hoje podem ser renomeados e alterados, e **também apagados quando ninguém os usa**; hoje o plano atual os usa, então
  na prática o app avisa que não dá.

**Editor do item (Plano e Hoje): "Carga baseada em"**
- Linha nova no editor, perto da carga: **"Carga baseada em"** com valor atual ("Carga fixa (kg)" ou o nome do máximo). Tocar abre uma folha com:
  "Carga fixa (kg)" e a lista dos máximos, cada um com o valor ("Agachamento · 205 kg").
- Com um máximo escolhido: aparece o campo **"% do máximo"** (ex.: 80) e, abaixo, "= 164 kg" já calculado e arredondado; o campo de kg fixo some.
  Sem máximo: fica o campo de kg de hoje.
- Ao trocar de "Carga fixa" para um máximo, o % vem sugerido com o mais próximo da carga atual (arredondado para 1%), editável. Ao trocar de um
  máximo para "Carga fixa", o kg fixo vira a carga que o item tinha naquele momento (a carga não "pula").
- O que o editor já faz (faixa de reps, RPE, descanso, pegada do terra) continua igual.
- A escolha vale para o item que está sendo editado, com o mesmo alcance de hoje (só esta sessão ou também as próximas semanas, conforme o editor
  já oferece). Um item pode ter máximo sem ser principal (ex.: variação pausa a 75% do supino).

**Adicionar exercício ao treino (Hoje)**
- Depois de escolher o exercício, a folha pergunta o tipo: **Acessório**, **Variação**, **Principal**. Escolhido o tipo, o exercício entra no treino
  **sem outra pergunta**. Não existe mais "Principal: qual movimento?".
- O item novo entra com carga fixa (como um acessório) e pode receber "Carga baseada em" no editor, em até 2 toques a partir do cartão do exercício
  (abrir editor → "Carga baseada em").

**Em outras telas**
- Aba Plano: a linha do item mostra a carga resolvida como hoje ("4x4 · 164 kg"); itens com carga fixa mostram o kg fixo.
- Tela Hoje, cabeçalho de resumo: onde hoje aparece "Máximos: agachamento 205 · supino 170 · terra 240", passa a listar os máximos da lista (os primeiros
  três, com "+N" se houver mais; tocar abre Ajustes → Máximos).
- Claude: o pacote lista todos os máximos (id, nome, valor); o Claude pode pedir `set_max` por `maxId` de máximos novos; a confirmação é a de hoje.
- Offline: tudo local.

Regras do produto que valem aqui: o app **nunca altera cargas sozinho** ao mudar um máximo sem o atleta ter salvado; regras não alteram o plano sem
confirmação; alvo mínimo de toque de 56 pt nos controles principais; textos em pt-BR com vírgula decimal.

## Decisões
- **Lista de máximos separada dos exercícios** (decisão 1 da spec 15, entrevista de 06/11/2026). Alternativa descartada: máximo como atributo do exercício
  (trocar ou apagar o exercício apagaria o máximo; não permite um máximo compartilhado por vários exercícios, como agachamento livre, pausa e back-off).
- **O nome do máximo não leva o valor** ("Agachamento", não "Agachamento 200"): o valor é um campo. O nome muda sem mudar o id.
- **Apagar máximo em uso é bloqueado** (decisão 3). Alternativa descartada: apagar e deixar os itens em kg fixos automaticamente (perde a ligação sem
  o atleta perceber).
- **Sem pergunta de movimento ao adicionar exercício** (decisão 6). Alternativa descartada: perguntar qual máximo ao adicionar (volta o atrito no meio do
  treino; o atleta pode ligar o máximo depois, no editor).
- **Trocar de exercício mantém o máximo e o % do item**: a carga pertence ao lugar do exercício no treino, não ao exercício (decisão 1: "trocar/apagar exercício
  não mexe nos máximos").
- **Passo de 2,5 kg e digitação direta no valor** do máximo: hoje o passo é 5 kg, grosso para máximos como lastro de barra fixa. Alternativa descartada: manter 5 kg.
- **O valor do máximo vale para a periodização ativa**; o valor "do plano" continua existindo como referência para "Voltar ao valor do plano". Com várias
  periodizações (spec 16), cada uma terá os seus.
- **Máximos novos não têm regras** nesta etapa (decisão 7). Quem quiser portões e freio num máximo novo espera a spec 18.
- **Quando criar um máximo, o valor do plano é o valor informado** (não há "valor antes").

## Critérios de pronto
- **CP1 — Lista.** Em Ajustes → Máximos aparecem "Agachamento", "Supino" e "Terra" com os valores atuais e, quando diferentes, os do plano.
- **CP2 — Criar.** Criar "Barra fixa lastrada" com 30 kg adiciona a linha à lista, em até 3 toques (Novo máximo → nome/valor → Salvar), e o máximo aparece no
  seletor "Carga baseada em".
- **CP3 — Validação.** Nome vazio, nome repetido (inclusive "agachamento" × "Agachamento") e valor zero ou vazio não salvam e mostram a mensagem correspondente.
- **CP4 — Renomear.** Renomear "Terra" para "Terra convencional" mantém todos os vínculos, as cargas e os alertas; o novo nome aparece no seletor, em Ajustes e no pacote
  para o Claude.
- **CP5 — Alterar valor.** Mudar "Supino" de 170 para 175 recalcula as cargas por % dos itens ligados a ele (em múltiplos de 2,5 kg) e não mexe nas cargas de outros máximos
  nem nas séries já registradas.
- **CP6 — Voltar ao plano.** Com valor atual diferente do do plano, "Voltar ao valor do plano" aparece e restaura; sem diferença, não aparece.
- **CP7 — Apagar em uso.** Apagar um máximo usado por pelo menos um item mostra o aviso com a lista "Onde é usado" e **não apaga**; apagar um máximo sem uso pede
  confirmação e apaga; depois de apagar, ele some do seletor.
- **CP8 — Carga baseada em.** No editor de um item sem máximo, escolher "Barra fixa lastrada" com 80% mostra "= 24 kg", e a carga do item no Plano e em Hoje passa a
  ser 24 kg; mudar o máximo para 35 kg passa a 28 kg (arredondado a 2,5 kg).
- **CP9 — Voltar para carga fixa.** Trocar um item de um máximo para "Carga fixa (kg)" mantém a carga que ele tinha (sem pular), e o item deixa de reagir ao máximo.
- **CP10 — Adicionar exercício.** Adicionar um exercício a um treino e escolher Principal ou Variação **não** mostra "qual movimento?"; o exercício entra no treino e o
  editor permite ligar um máximo em até 2 toques.
- **CP11 — Troca de exercício.** Trocar o exercício de um item que tem "Carga baseada em" mantém o máximo e o %.
- **CP12 — Plano atual intacto.** Com o plano atual e sem mexer em nada, alertas do treinador, cargas do dia, Análises e e1RM continuam idênticos aos do PBI 19 (o teste
  dourado passa).
- **CP13 — Singles e regras com máximos novos.** Um item principal ligado a um máximo novo funciona em Hoje (registrar série, RPE, "feito conforme o plano") e não gera
  alertas de portão, freio ou revisão (não tem regras); o terra continua mostrando "Pegada" e o supino/agachamento não.
- **CP14 — Claude.** O pacote para o Claude lista cada máximo com id, nome e valor; uma resposta com `set_max` por `maxId` de um máximo criado pelo atleta é aplicada com a
  confirmação de hoje; `set_max` com `lift` antigo continua funcionando.
- **CP15 — Backup.** Máximos criados, renomeados e apagados sobrevivem a exportar e restaurar um backup completo.
- **CP16 — Acessibilidade.** Os botões principais (Novo máximo, Salvar, Apagar, linhas da lista, "Carga baseada em") têm alvo de 56 pt, rótulo de acessibilidade e funcionam
  com texto grande.
- **CP17 — Sem regressão.** `npm test`, `npm run test:import`, `npm run typecheck` e `npx expo lint` passam.

## Verificação
- **Na nuvem / testes automáticos:** regras de validação do nome e do valor, cálculo de carga por máximo e arredondamento, bloqueio de apagar, troca de exercício, conversão
  de `set_max`, backup com máximos novos (CP3, CP5, CP7 a CP9, CP11, CP14, CP15, CP17).
- **Prévia web:** conferir as telas Ajustes → Máximos, o editor do item com "Carga baseada em" e a folha de tipo ao adicionar exercício (CP1 a CP4, CP6, CP8, CP10).
- **No simulador / iPhone (roteiro):**
  1. Ajustes → Máximos: conferir os três máximos e valores (CP1).
  2. Novo máximo "Barra fixa lastrada", 30 kg. Tentar salvar em branco, repetir "agachamento" e valor 0: mensagens (CP2, CP3).
  3. Aba Plano → um treino → adicionar/abrir o item "Barra fixa" → "Carga baseada em" → "Barra fixa lastrada" → 80%: "= 24 kg". Conferir em Hoje (CP8).
  4. Em Ajustes, mudar o máximo para 35 kg: item passa a 28 kg; as cargas de agachamento/supino/terra não mudam (CP5).
  5. Voltar o item a "Carga fixa (kg)": carga mantida (CP9).
  6. Tentar apagar "Agachamento": bloqueado, lista "Onde é usado" (CP7). Apagar "Barra fixa lastrada" depois de desligar o item: apaga.
  7. Em Hoje, adicionar um exercício do catálogo como Principal: não há pergunta de movimento, entra no treino; abrir o editor e ligar um máximo em até 2 toques (CP10).
  8. Registrar uma série "conforme o plano" no item da barra fixa e outra no agachamento: tudo normal; alertas do agachamento idênticos aos de antes (CP12, CP13).
  9. Renomear "Terra" para "Terra convencional": nada muda além do nome; "Pegada" segue no terra (CP4, CP13).
  10. Dados: copiar o pacote para o Claude e conferir os máximos com id e nome; aplicar um ajuste `set_max` com `maxId` (CP14). Exportar e restaurar o backup completo (CP15).
  - **Só no iPhone:** conforto de toque com uma mão e com texto grande (CP16); teclado numérico ao digitar o valor do máximo.

## Riscos e perguntas abertas
- **Risco de UX:** o atleta que antes adicionava "Agachamento pausa" como Variação e herdava o máximo do agachamento automaticamente agora precisa ligar o máximo ele mesmo (1 passo a mais).
  Mitigação: item novo mostra no editor a linha "Carga baseada em" em destaque. Se incomodar, o backlog tem "sugerir o máximo pelo nome do exercício".
- **Risco de UX:** nome parecido para o mesmo exercício (ex.: "Terra" × "Terra convencional") pode confundir a lista "Onde é usado"; por isso ela agrupa por exercício e conta treinos.
- **Risco:** perder o vínculo ao apagar/renomear — coberto por id estável (CP4, CP7).
- **P1 (não bloqueia):** apagar um máximo usado em 14 semanas exige desligar item por item, como você decidiu. Se isso for trabalhoso na prática, quer um atalho "Desligar em todos os
  treinos" com confirmação? Recomendação: manter como está e só adicionar o atalho se incomodar; é uma mudança pequena depois.
- **Respondidas em 06/11/2026:** o nome inicial do primeiro máximo é "Agachamento" (decisão no PBI 19; a lista aqui já usa esse nome). O atalho "Desligar em todos os
  treinos" não foi pedido: **fica fora**, no backlog, e só entra se desligar item por item incomodar na prática.

## Andamento
| Data | Nota |
|---|---|
| 06/11/2026 | PBI criado a partir da fatia "máximos próprios" da spec 15 (itens 15c e 15f). |
| 06/11/2026 | Respostas do atleta: nome inicial "Agachamento" (textos do PBI ajustados); atalho "desligar em todos" fica no backlog; sugestão de máximo pelo e1RM passa para o PBI 23. |
