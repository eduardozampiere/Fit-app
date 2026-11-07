# 19 — Modelo de treino v2: máximos com nome e séries com tipo dentro do exercício · PBI

> **Produto: o quê e por quê.** Dono: `product-manager` (`/pm`). O como fica em [tech-plan.md](tech-plan.md),
> do `tech-planner` (`/planejar`).
> Parte 1 da [spec 15](../15-exercicio-unico/spec.md), ampliada em 06/11/2026 (ver "Decisões"). Ordem: **19** → [24 Séries com tipo](../24-series-com-tipo/pbi.md)
> → [16 Periodizações](../16-periodizacoes/spec.md) → [20 Máximos próprios](../20-maximos-proprios/pbi.md) → [21](../21-historico-de-maximos/pbi.md) / [22](../22-analises-por-exercicio/pbi.md) → [23](../23-evolucao-dos-maximos/pbi.md).

**Status:** ⏳ a fazer
**Depende de:** — (é a primeira da série). Bloqueia 24, 20, 21, 22 e, por consequência, as specs 16 e 18.

## Objetivo
O app foi feito para um treino de powerlifting e isso está gravado no jeito como o plano é guardado: três levantamentos fixos (agacho, supino, terra) com poderes
que os outros exercícios não têm, e "single de ativação", "back-off" e "duplas de volume" tratados como **exercícios separados** ("Agacho back-off", "Terra — single de ativação"),
quando na prática são **séries de um mesmo exercício** ("duplas de volume" nem é um tipo: é só o nome de um jeito de prescrever, 3 × 2). Um app de academia comum (e o próprio Hevy, que inspira o visual) funciona de outro jeito: **exercício → séries, cada série
com um tipo**. Em 06/11/2026 o usuário disse que o app, hoje só dele, deve poder ser usado por outras pessoas, inclusive quem só faz academia normal, e pediu que "back-off seja um tipo de série,
não um exercício novo, igual o single de ativação".

Este PBI troca **a base uma vez só**, com uma única migração de dados (que não tem volta e por isso tem cópia de segurança):
1. **Máximos com id e nome**, e cada exercício dizendo em qual máximo se baseia (ou nenhum, carga fixa em kg).
2. **Séries com tipo dentro do exercício:** single de ativação, back-off e "duplas de volume" deixam de ser exercícios e passam a ser **grupos de séries** do exercício principal ao qual pertencem. Os tipos do plano são os do usuário: **Normal, Aquecimento, Single de ativação, Back-off e Walkout**
   (Aquecimento já existe desde a spec 11). "Duplas de volume" **não é tipo**: cada uma vira Back-off (ver Decisões) e guarda "Duplas de volume" só como nome do grupo.
   O **walkout** (tirar a barra do suporte com carga acima do máximo e sustentar de 5 a 8 segundos) também passa a ser um **tipo de série** do exercício principal, uma série por duração (decisão do usuário em 07/11/2026).
3. Regras do treinador por máximo e opcionais por periodização.

Para o usuário o resultado é: **o plano atual, os treinos registrados e as Análises continuam com os mesmos números**, com duas diferenças que ele vê e pediu: onde a tela diz "Agacho" passa a
dizer "Agachamento", e single, back-off (inclusive as antigas duplas de volume) e walkout aparecem **dentro do cartão do exercício**, como linhas de série com letra própria (S, B, W), e não mais como cartões separados.

Por que combinar as duas mudanças em um PBI: se o modelo de séries fosse mudado depois, seria uma segunda migração sem volta sobre os mesmos dados, com os mesmos riscos. Por que
ele continua sendo "base": nenhuma tela nova de criação é entregue aqui (isso é o [PBI 24](../24-series-com-tipo/pbi.md)); o foco é equivalência verificável.

Quem usa: hoje, o atleta (powerlifter) durante o treino, com uma mão, entre séries. Para ele o sucesso é **não perceber nada além de "Agachamento" e das séries S/B/W dentro do cartão**. Para a visão nova
(qualquer pessoa de academia), este PBI é o que torna o modelo de treino igual ao dos apps conhecidos; o que é avançado (máximos, regras, Claude) fica nos PBIs seguintes.

## Escopo
- **Entra:**
  - Atualização automática do plano (e de todas as periodizações guardadas no aparelho) para o formato `fitapp.cycle/v2`, na primeira abertura depois da instalação.
  - **Cópia de segurança automática** antes da atualização, com aviso único e atalho para compartilhar o arquivo.
  - Teste "dourado" do plano atual (alertas, cargas do dia, séries das Análises, e1RM, séries e tonelagem por sessão) escrito **antes** de mexer em qualquer regra, que tem de passar ao final.
  - Máximos com **id estável e nome** (`squat` "Agachamento", `bench` "Supino", `deadlift` "Terra"). Cada exercício do treino aponta **o máximo em que se baseia** (ou nenhum = carga fixa em kg).
  - **Grupos de séries com tipo dentro do exercício.** Cada exercício do treino tem um ou mais grupos; cada grupo tem: tipo, número de séries, repetições, carga (kg fixo ou % do máximo do exercício), RPE alvo e,
    se houver, descanso, e um nome opcional (anotação, ex.: "Duplas de volume"). **Tipos de série do app:** **Normal**, **Aquecimento**, **Single de ativação**, **Back-off**, **Walkout**, **Falha** e **Drop set**. Destes, o **plano** prescreve Normal, Aquecimento, Single de ativação, Back-off e Walkout; no máximo **um** grupo Single e **um** grupo Walkout por exercício;
    Falha e Drop set seguem só no registro, como hoje. Aquecimento continua não contando no volume, nas regras nem nas análises.
  - **Conversão do plano atual** (regra determinística, a confirmar pelo usuário; ver Decisões): os 21 "single de ativação" do plano embutido viram o grupo **Single de ativação** do principal do mesmo movimento na mesma sessão; os 8 "back-off" viram grupo **Back-off** do principal (`parentId`);
    os 3 "duplas de volume" (todos com `parentId` e carga abaixo da do principal) viram grupo **Back-off** do principal, com o nome "Duplas de volume". Os 4 "walkout" (sem `parentId`: 1 × 5–8 s, 210 kg fixos, descanso de 3 min 30 s) viram o grupo **Walkout** do principal do mesmo movimento na mesma sessão (a mesma regra do single; no plano embutido é o agachamento pesado do dia), com série por duração 5–8 s, carga de 210 kg fixa e o descanso do item. Um item que não tenha principal na sessão
    vira exercício comum (Acessório) com o nome que tinha.
  - **Histórico preservado:** as séries já registradas nesses itens (single, back-off, duplas, walkout) continuam contando exatamente como hoje: as de single, back-off, duplas e walkout passam para o exercício principal com o tipo Single (S), Back-off (B) ou Walkout (W). Contagens,
    tonelagem, "feito conforme o plano" e Análises não mudam. **Como é hoje e o que se preserva para o walkout:** cada série de walkout registrada conta como 1 série na contagem da sessão e no "planejado × feito"; soma 0 kg na tonelagem (não tem repetições, e a tonelagem é carga × repetições);
    não pede RPE; não entra na carga dos principais, no e1RM, nos recordes (a conta de recordes exige repetições) nem em regra alguma. **Depois, o walkout continua assim** (ver "O que cada tipo de série conta"): seus 210 a 220 kg, maiores que a carga do principal nas semanas em que aparecem, **não** viram recorde, máximo nem top set do agachamento.
  - **Tela Hoje e aba Plano mostram os grupos dentro do cartão do exercício**, na ordem do plano, com a letra do tipo na primeira coluna (S single, B back-off, W walkout; o nome do grupo, como "Duplas de volume", aparece como legenda pequena). A linha W mostra a carga e a duração (5–8 s) no lugar das repetições. Editar os valores de um grupo existente (carga, séries, repetições ou duração, RPE)
    funciona no editor de hoje. A lixeira da linha "S" continua removendo o single daquele treino, e a da linha "W" faz o mesmo com o walkout.
  - **Regras do treinador por máximo**, com comportamento idêntico: a "fadiga do single" lê o grupo Single do mesmo exercício; 4ª série e falha do terra olham as séries Normais. As regras podem faltar na periodização (opcionais).
  - Claude: ciclos `fitapp.cycle/v1` (importação e JSON do Claude) são lidos e convertidos; ajustes `fitapp.adjustments/v1` com `lift` continuam aceitos; `set_max` também aceita o id do máximo; `add_item`, `edit_item` e `remove_item` com os tipos
    antigos (single, back-off, duplas de volume) continuam aceitos e são entendidos como "adicionar/editar/remover o grupo no exercício principal" ("duplas de volume" entra como Back-off com esse nome).
  - Backups `fitapp.backup/v1` feitos antes da atualização continuam restauráveis (são convertidos ao restaurar).
  - **Troca da palavra "Agacho" por "Agachamento"** em todos os textos que usam o nome do movimento (tabela em Comportamento).
  - **Alertas de dor e sinais de alarme dos check-ins continuam ativos em ciclo sem regras**, com limites padrão (decisão confirmada para o plano do atleta; ver P2).
  - Documentação dos formatos (`docs/formato-ciclo.md`, `docs/claude-treinador.md`) em v2.
- **Não entra** (vai para os PBIs seguintes ou para o backlog):
  - Criar, apagar, reordenar grupos de séries e escolher o tipo pela interface (PBI 24). Entre este PBI e o 24 só dá para editar os valores dos grupos que já existem e remover o single pela lixeira.
  - Criar, renomear ou apagar máximos; "Carga baseada em" no editor; fim da pergunta "qual movimento?" (PBI 20).
  - Histórico de máximos (PBI 21). Gráficos por exercício principal (PBI 22).
  - Tela para criar ou editar regras (spec 18). Criar periodização em branco (spec 16): aqui só garantimos que um ciclo **sem regras** abre sem erro.
  - Prescrever falha ou drop set no plano (Aquecimento pode ser prescrito pelo modelo, mas nada no plano atual vira aquecimento e a criação pela tela é do PBI 24).
  - Qualquer coisa de distribuição para outras pessoas (primeira abertura sem plano, onboarding, plano pessoal fora do app): depende de decisão do usuário e é tratado à parte (ver P1 e o PLANO).

## Comportamento
**Primeira abertura depois de instalar a versão com este PBI**
- Caminho feliz: o app abre normalmente na aba Hoje. Antes disso, em até alguns segundos, grava a cópia de segurança e atualiza o formato. Aparece **uma vez** um aviso:
  - Título: "Dados atualizados".
  - Texto: "Seu plano e seus treinos continuam iguais. Antes de atualizar, o app salvou uma cópia de segurança dos seus dados."
  - Botões: "Compartilhar cópia" (abre a folha de compartilhar do iOS com o arquivo JSON, para salvar em Arquivos/AirDrop) e "Ok".
  - O aviso não volta nas aberturas seguintes. A cópia fica guardada no aparelho (nome: `backup-antes-da-atualizacao-AAAA-MM-DD.json`) **até o usuário apagar** (o app não apaga sozinho) e também pode ser compartilhada depois pela tela Dados.
- Erro: se não for possível gravar a cópia (por exemplo, sem espaço), **a atualização não acontece** e os dados antigos ficam intactos. Aparece uma tela com "Não foi possível atualizar os dados" / "Seus treinos não foram alterados. Libere espaço no iPhone e tente de novo." e o botão "Tentar de novo".
- Abrir o app uma segunda vez (ou várias) não muda nada: a atualização é feita uma única vez por dado.
- Offline: tudo é local; não há diferença com ou sem internet.

**Tela Hoje: o cartão do exercício com séries tipadas**
- Antes: "Agachamento (High Bar)" era um cartão; "Agacho back-off" e "Agacho — duplas de volume" eram outros cartões; o single aparecia como linha "S" dentro do cartão do principal.
- Depois: um cartão só, "Agachamento (High Bar)", com a tabela de séries na ordem do plano. Cada linha tem na primeira coluna o número da série (Normal), ou a letra do tipo: **S** (single de ativação),
  **B** (back-off; as antigas duplas de volume aparecem como B com a legenda "Duplas de volume"); as letras de aquecimento (A), falha (F) e drop set (D) seguem como hoje. Tocar na letra de uma série registrada abre a mesma folha de tipo de série de hoje.
- "Feito conforme o plano" continua em no máximo 2 toques e marca todas as séries do cartão, inclusive as S/B; pedir o RPE logo depois do principal continua igual.
- O descanso após cada série usa o padrão do tipo (single 5 min, back-off 3 min, como hoje). As ex-duplas de volume mantêm os 3 min 30 s que tinham (gravados no grupo, para a conversão não mudar o descanso); o descanso que o atleta ajustou em "Agacho back-off", "Terra — single de ativação" etc. passa a valer para aquelas séries.
- A contagem de exercícios do treino diminui (os absorvidos já não são exercícios); a de séries e a tonelagem não mudam.

**Aba Plano**
- A linha do exercício mostra os grupos em sequência, por exemplo: "4x4 · 164 kg" e abaixo "Single 1x1 · 170 kg · Back-off 2x3 · 150 kg · Back-off (duplas de volume) 3x2 · 165 kg". Editar um item abre o editor de hoje, com os campos do grupo principal e dos demais grupos (valores). Para adicionar ou tirar grupo, ver PBI 24.

**O que o atleta vê depois (igual a antes, exceto "Agacho" → "Agachamento" e as séries dentro do cartão)**
- Hoje: mesmos treinos, mesmas cargas por série, mesma ordem dos exercícios (inclusive a que ele mudou arrastando), pegada do terra, estados de cada dia.
- Alertas do treinador: os mesmos, nos mesmos dias, com o mesmo texto exceto a palavra (portão liberado/fechado, freio, fadiga do single, revisão de máximo, 4ª série e falha do terra, pegada, deload).
- Análises: os mesmos números e linhas (carga dos principais, e1RM, termômetro do single, planejado × feito): os gráficos usam só as séries Normais, como hoje; single, back-off e walkout ficam fora do top set. "Por dia" lista as mesmas séries sob o exercício principal.
- Tela do exercício (histórico e recordes): o histórico do principal passa a mostrar também as séries S/B/W, com a letra do tipo. Os **recordes, o máximo e o e1RM do exercício passam a contar o back-off** (série como qualquer outra); single e walkout não contam (para o single entrar, o usuário troca o tipo da série para Normal). No plano atual os recordes de carga do principal não mudam por causa do back-off (150 kg contra 170 a 210 kg do principal); pode mudar o histórico de séries e a contagem de séries do exercício.
- Ajustes: "Máximos de referência" mostra os mesmos três valores, inclusive os alterados, e "Voltar aos máximos do plano" continua funcionando.
- Dados: pacote para o Claude, exportação CSV/JSON e backup completo funcionam como antes.

**O que cada tipo de série conta — regra final** (decisões do usuário em 07/11/2026: "o back-off é uma série como qualquer outra; o walkout é que não deveria contar"; "o gráfico usa só as séries normais; o single é só tonelagem; se um single bater recorde, ele não é mais um single de ativação, virou série principal". Levantado em `logging.ts`, `analytics.ts`, `exerciseStats.ts`)

| Tipo | Tonelagem / volume | Contagem de séries "n/m" | Recordes e máximo do exercício | e1RM do exercício (tela do exercício) | Top set e gráficos de Análises (carga e e1RM) | Regras do treinador | RPE |
|---|---|---|---|---|---|---|---|
| Normal | ✔ | ✔ | ✔ | ✔ | ✔ | lê | pede depois do principal |
| Back-off (inclui as ex-duplas) | ✔ | ✔ | ✔ | ✔ | ✘ (só séries Normais) | não lê | pede, como hoje |
| Single de ativação | ✔ (só tonelagem) | ✔ | ✘ | ✘ | ✘ | a fadiga do single lê | pede, como hoje |
| Walkout | ✘ (0 kg: série por duração, sem repetições) | ✔ (volume zero; proposta, ver P4) | ✘ | ✘ | ✘ | não lê | não pede |
| Aquecimento | ✘ (como hoje) | ✘ (como hoje) | ✘ | ✘ | ✘ | não lê | não pede |
| Falha / Drop set | como hoje (falha não entra em tonelagem, recordes, e1RM nem top set) | como hoje | como hoje | como hoje | como hoje | como hoje | como hoje |

- **Back-off conta como série normal** em tonelagem, recordes, máximo e e1RM do exercício, mas **não aparece no top set nem nos gráficos de Análises**, que usam só as séries Normais ("o gráfico usa só as séries normais"). No plano atual isso não muda nada: o back-off é sempre mais leve que o principal
  (150 kg contra 170–210 kg; duplas de 165 kg contra 185 kg na semana 10), então não alteraria o top set nem o e1RM mesmo se contasse; o teste dourado confere nas três famílias.
- **Single de ativação é só tonelagem (e contagem de séries).** Assim os gráficos de hoje não mudam. **Se um single bater recorde, ele deixou de ser "de ativação": o usuário troca o tipo dessa série para Normal** (pela folha de tipo de série, que já existe) e ela passa a contar em recordes, e1RM, top set e gráfico (CP12b).
- **Mudar o tipo de uma série registrada recalcula tudo na hora:** tonelagem, recordes, e1RM, top set e gráficos, para Single → Normal e para Normal → Single, Back-off ou Walkout (CP12b). Ideia fora do escopo: o app **sugerir** a troca quando um single supera o recorde do exercício (nunca muda sozinho; backlog).

**Como é hoje, com números do plano embutido (agachamento):** o single é item separado, então não entra no top set de "Carga dos principais" (só itens `main` entram) nem nos recordes do exercício principal; mas **já entra na tonelagem** da sessão, porque a tonelagem soma todas as séries registradas do treino (menos aquecimento e falhas).
Back-off e duplas idem. O walkout hoje não tem repetições: soma 0 na tonelagem e não entra em recordes.
Cargas planejadas (semana → single / principal): S1 170 / 140, S2 170 / 145, S3 170 / 150, S4 175 / 155, S5 175 / 160, S6 175 / 165, S7 180 / 170, S8 180 / 170 — **o single é 10 a 30 kg mais pesado que o principal** nas semanas 1 a 8; nas semanas 9 a 11 só há walkout (210, 215, 220) acima do principal (180, 185, 190);
back-offs de 150 kg (S7, S12, S13) e duplas de 165 kg (S10) ficam abaixo do principal (170 a 210 kg).

**Single de ativação, por que ficou só na tonelagem (pergunta respondida pelo usuário em 07/11/2026):** no plano atual o single é 10 a 30 kg mais pesado que o principal nas semanas 1 a 8; se contasse no top set e no e1RM, a linha "Carga dos principais" do agachamento passaria de 140–170 kg para 170–180 kg e o e1RM subiria (1 repetição a 170 kg com RPE ≤ 8 dá e1RM acima de 4 × 140), quebrando "Análises iguais".
O usuário escolheu que o single é só tonelagem; a promessa "Análises iguais" e o teste dourado valem como estavam.

**Onde a palavra muda (levantado no código em 06/11/2026; o plano técnico deve rechecar com `grep`)**
| Onde | Antes | Depois |
|---|---|---|
| Ajustes → "Máximos de referência": rótulo do primeiro campo | "Agacho" | "Agachamento" |
| Ajustes → texto "Plano original: agacho 200 · supino … · terra …" | "agacho" | "agachamento" |
| Hoje → resumo "Máximos: agacho 205 · supino 170 · terra 240" | "agacho" | "agachamento" |
| Hoje → folha "Principal: qual movimento?" (some no PBI 20) | "Agacho" | "Agachamento" |
| Análises → legenda das linhas de Carga dos principais, e1RM e Termômetro do single | "Agacho" | "Agachamento" (o PBI 22 troca por nomes de exercício) |
| Alertas: "Portão liberado: Agacho 200", "Portão fechado: Agacho vai para …", texto "Agacho 200 saiu em RPE …" | "Agacho" | "Agachamento" |
| Alertas: "Portão/Freio: repetir agacho 200", "Última série do agacho em RPE …", "Sinal de cansaço no single de agacho", "Revisão: … no máximo do agacho" | "agacho" | "agachamento" |
| Alerta da regra das 24 h: "reduzir agacho e terra hoje" (título e texto) | "agacho" | "agachamento" |
| Pacote/relatório para o Claude: "Máximos de referência atuais: agacho …", "e1RM agacho: …" | "agacho" | "agachamento" |
| Pré-visualização de ajustes do Claude ("… do agacho", "agacho principal com …") | "agacho" | "agachamento" |
- Os exercícios "Agacho back-off" e "Agacho — duplas de volume" **deixam de existir como exercício** (viram grupos de séries), então não precisam ser renomeados. O app não renomeia nenhum outro exercício; ids nunca mudam.

**Ciclo sem regras (para a spec 16 e para o Claude)**
- Um ciclo v2 com as regras do treinador ausentes abre sem erro em Hoje, Plano e Análises. Não gera nenhum alerta de portão, freio, fadiga do single, revisão de máximo, 4ª série, falha do terra nem pegada. O arredondamento de cargas usa o padrão do app (2,5 kg).
- **Decisão confirmada (para o plano do atleta):** os alertas de **dor e sinais de alarme** dos check-ins (regra das 24 h, sinais de alarme) **continuam ativos com limites padrão** mesmo sem regras. Para outros usuários isso precisa ser revisto (P2).

**Claude / importação**
- Importar um ciclo `fitapp.cycle/v1` (planilha ou Claude antigo): é convertido e entra como hoje, com singles, back-offs e duplas de volume já como grupos (Single, Back-off e Back-off).
- Importar um ciclo `fitapp.cycle/v2`: entra com os máximos nomeados e os grupos que vierem nele.
- `set_max` em `lift: "squat"` (antigo) ou `maxId: "squat"` (novo): ambos mudam o mesmo máximo, com a mesma confirmação de hoje.
- O pacote para o Claude lista cada máximo com **id e nome** e descreve as séries por tipo dentro de cada exercício.

## Decisões
- **Uma migração só para as duas mudanças de modelo (máximos + séries tipadas).** Motivo: a migração não tem volta e o app é usado cinco vezes por semana; migrar o modelo de séries depois repetiria o risco sobre os mesmos dados e os mesmos registros.
  Alternativas descartadas: (ii) um PBI de "séries tipadas" antes do 19, que exigiria duas migrações seguidas; (iii) manter back-off e duplas de volume como exercícios por enquanto, o que contradiz o pedido do usuário e obrigaria a refazer a conversão do histórico.
- **O PBI 19 entrega equivalência; a criação e edição de grupos pela interface fica no [PBI 24](../24-series-com-tipo/pbi.md)**, para que este não vire "base + telas novas" de uma vez. O custo é uma janela curta (entre 19 e 24) em que não se adiciona um back-off pela tela; o Claude continua podendo (tradução de `add_item`).
- **Single de ativação, back-off e walkout são tipos de série; "duplas de volume" não é tipo.** Correção do usuário em 06/11/2026: "Normal / Single de ativação / Back-off. Duplas de volume, ou é normal, ou é aquecimento, ou é back-off." e, em 07/11/2026, escolha explícita de que o **Walkout é tipo de série** do plano (entre "tipo de série" e "continua exercício à parte").
  Single, back-off e walkout são jeitos de fazer séries do mesmo exercício (mesma barra, mesmo movimento). "Duplas de volume" é só um jeito de escrever uma prescrição (3 × 2) e vira o nome opcional de um grupo.
- **Conversão das "duplas de volume" do plano atual: sempre Back-off, com o nome "Duplas de volume" (decisão a confirmar pelo usuário, que pode trocar o tipo depois pela interface — PBI 24).** Regra determinística: todo item `volume_doubles` com principal (`parentId`) vira um grupo Back-off desse principal; sem principal, vira exercício comum.
  Justificativa: (1) os 3 itens do plano embutido vêm depois das séries de trabalho do principal e com carga abaixo da dele — a definição de back-off; (2) **Back-off preserva os números de hoje no plano atual**: as duplas já contavam na tonelagem e agora contam também no top set, no e1RM e nos recordes do principal, mas com 165 kg contra 185 kg do principal (semana 10) não mudam nenhum desses valores (o teste confere); as regras de série de trabalho continuam sem lê-las;
  (3) **Normal mudaria os números das regras** (a regra da 4ª série e os portões olham as séries de trabalho Normais do principal; o Back-off, que não é lido pelas regras, preserva os alertas); como o back-off conta como série normal em tonelagem, recordes e e1RM (decisão de 07/11/2026), esta é a diferença que importa entre Normal e Back-off; (4) **Aquecimento também mudaria**, porque aquecimento não conta em volume, tonelagem e "feito conforme o plano", e as duplas existem justamente para somar volume. O teste de conversão confere que as 3 têm carga menor que a do principal; se alguma não tiver, o teste sinaliza para revisão
  em vez de converter em silêncio. Alternativas descartadas: Normal e Aquecimento (acima).
- **Conversão do walkout do plano atual (regra determinística): todo item `walkout` vira o grupo Walkout do principal do mesmo movimento na mesma sessão** — a mesma regra do single ("o principal seguinte da mesma sessão e do mesmo movimento"), porque o walkout não tem `parentId`. O grupo mantém 1 série, a duração 5–8 s (série por duração, sem repetições), a carga de 210 kg **fixa** (como hoje: não recalcula quando o máximo muda) e o descanso do item (3 min 30 s).
  Sem principal na sessão, vira exercício comum (Acessório) com o nome que tinha. O teste de conversão confere que os 4 walkouts têm um principal de agachamento na mesma sessão. Alternativas descartadas: exercício à parte (proposta anterior, trocada pela escolha do usuário em 07/11/2026) e série de Aquecimento (zeraria uma série que conta hoje).
- **No máximo um grupo Walkout por exercício, como o Single.** Motivo: é uma sustentação única por treino e deixa a letra W sem ambiguidade; Normal, Aquecimento e Back-off podem repetir.
- **Letras na primeira coluna da tabela:** número = Normal, **A** aquecimento, **S** single de ativação, **B** back-off, **W** walkout, **F** falha, **D** drop set. Sem conflitos entre as letras.
- **Tipos de série do app: Normal, Aquecimento, Single de ativação, Back-off, Walkout, Falha e Drop set.** O plano prescreve Normal, Aquecimento, Single de ativação, Back-off e Walkout; Falha e Drop set seguem só como rótulos de registro (spec 11). Alternativa descartada: prescrever Falha e Drop set agora (risco da migração sem ganho). Aquecimento prescrito no plano é permitido
  (o modelo comporta), mas nenhum item do plano atual é convertido para ele.
- **O que cada tipo conta (tabela em Comportamento):** Normal conta em tudo; **Back-off conta como série normal** em tonelagem, recordes, máximo e e1RM do exercício, mas os gráficos de Análises e o top set usam só as séries Normais; **Single de ativação é só tonelagem** (e contagem de séries): fora de recordes, máximo, e1RM, top set e gráficos;
  **Walkout** não conta em volume, recordes, máximo, e1RM, top set nem gráficos e conta só como 1 série no n/m; **Aquecimento** não conta em nada, como hoje. Para um single que bate recorde: o usuário troca o tipo da série para Normal (a série "virou principal") e ela passa a contar em tudo.
  Motivo: decisões do usuário em 07/11/2026 ("o back-off é uma série como qualquer outra; o walkout é que não deveria"; "o gráfico usa só as séries normais, o single é só tonelagem"). Alternativas descartadas para o single: contar no top set e no e1RM (mudaria os gráficos de hoje em 10 a 30 kg nas semanas 1 a 8) e contar nos recordes (um single de ativação, por definição, não é a série de trabalho do exercício). **Walkout contado como 1 série mas com volume zero** é proposta do PM, mantendo o que o app já faz hoje (sessão e "planejado × feito" contam a série; a tonelagem soma 0 por não ter repetições); se o usuário vetar, o walkout fica fora também da contagem (P4).
  Alternativa descartada para o back-off: manter "só Normais/até a falha nos recordes" (texto anterior deste PBI, corrigido). Alternativa descartada para o walkout: contar volume (carga × duração não é volume de repetições, e os 210 a 220 kg, acima do principal, distorceriam recordes e máximo).
- **Descanso por tipo = o de hoje; ajustes de descanso dos exercícios absorvidos passam para as séries correspondentes; as ex-duplas mantêm os 3 min 30 s gravados no grupo.** Motivo: nada que o atleta configurou se perde e a conversão não muda o descanso.
- **Ids dos três máximos continuam `squat`, `bench` e `deadlift`** (decisão 1 da spec 15). Motivo: ajustes antigos do Claude, relatórios e histórico seguem válidos.
- **Nomes iniciais dos máximos: "Agachamento", "Supino" e "Terra"** — pedido do usuário (06/11/2026). Alternativa descartada: manter "Agacho". **Renomear "Agacho back-off" etc.:** o usuário pediu para renomear; como esses exercícios deixam de existir, a decisão mais segura é **não renomear dados**:
  só a palavra exibida muda (tabela acima) e os ids nunca mudam (registros, ajustes de descanso e backups continuam apontando para o mesmo lugar). Alternativa descartada: reescrever o nome dos exercícios nos registros antigos (mexe em dados que não precisa).
- **Alertas de dor e sinais de alarme não são opcionais** no plano do atleta (resposta de 06/11/2026). Alternativa descartada: "sem regras = sem nenhum alerta".
- **Cópia de segurança obrigatória antes de atualizar** e **guardada até o usuário apagar** (resposta "tanto faz", adotada a recomendação). A cópia fica no aparelho e é oferecida para compartilhar, porque a instalação com Apple ID gratuito é refeita toda semana e desinstalar o app apaga o que está dentro.
- **Regras por máximo, plano atual idêntico** (decisão 7). Alternativa descartada: reescrever as regras agora para "generalizar tudo"; o usuário aceitou separar na spec 18.
- **Formato v1 nunca deixa de ser lido** (importação, JSON do Claude, backup): decisão 8 da spec 15.
- Respostas do usuário: entrevista de 06/11/2026 (lista de máximos separada dos exercícios; histórico do usuário; apagar máximo em uso é bloqueado; regras só trocam a chave; v2 com conversão do v1) e respostas posteriores no mesmo dia (nome "Agachamento"; back-off e single como tipo de série; dor/alarme sempre ativos; cópia fica até apagar).

## Critérios de pronto
- **CP1 — Rede de segurança.** Existe um teste automático do plano atual (`assets/plan/ciclo_out26_jan27.json`) que registra alertas por regra, cargas de cada dia, séries das Análises (top set e e1RM), e1RM, recordes por exercício e, por sessão, número de séries e tonelagem, escrito e verde **antes** da mudança e que passa ao final (com a troca de palavra do CP8 e com a diferença prevista do CP13: o back-off passa a contar nos recordes do principal). O teste inclui o caso "single mais pesado que o principal" e "walkout mais pesado que o principal", que o plano atual já tem, para provar que nenhum dos dois altera top set, e1RM, gráficos nem recordes.
- **CP2 — Conversão do plano atual.** Depois da atualização, os três máximos têm ids `squat`, `bench`, `deadlift` e nomes "Agachamento", "Supino", "Terra"; os 21 singles viram grupos Single, os 8 back-offs viram grupos Back-off e as 3 duplas de volume viram grupos Back-off com o nome "Duplas de volume", todos no principal da mesma sessão (nenhum fica órfão no plano embutido, e as 3 duplas têm carga menor que a do principal);
  os 4 walkouts viram um grupo Walkout (1 × 5–8 s, 210 kg fixos, descanso de 3 min 30 s) do principal de agachamento da mesma sessão (nenhum fica órfão); os demais exercícios mantêm id, nome, ordem e cargas. Nenhum item do plano embutido vira Aquecimento; "Duplas de volume" não aparece em nenhuma lista de tipos.
- **CP3 — Dados preservados.** Número de treinos, séries registradas (carga, repetições, RPE, tipo), check-ins, pesos, refeições e ajustes (descanso, ordem, máximos alterados, timer) é o mesmo antes e depois; as séries dos itens absorvidos aparecem no exercício principal com o tipo certo (S, B ou W); o total de séries e a tonelagem por sessão e por semana não mudam.
- **CP4 — Máximos alterados preservados.** Se o atleta tinha mudado um máximo, o valor atual e o do plano continuam distintos e "Voltar aos máximos do plano" volta ao do plano.
- **CP5 — Cópia de segurança.** Na primeira abertura depois da atualização, o arquivo de cópia existe e abre em "Compartilhar cópia"; o aviso aparece uma única vez; a cópia não é apagada pelo app; restaurar essa cópia devolve exatamente os dados de antes.
- **CP6 — Falha segura.** Se a cópia não puder ser gravada, a atualização não roda, os dados antigos ficam intactos e aparece a tela com "Tentar de novo".
- **CP7 — Idempotência.** Abrir o app duas ou mais vezes não altera dados nem repete o aviso; converter duas vezes o mesmo ciclo dá o mesmo resultado (teste).
- **CP8 — Telas iguais, menos a palavra e as séries dentro do cartão.** Hoje, Plano, Análises, Ajustes e Dados mostram os mesmos números e textos de antes, com duas diferenças: "Agacho"/"agacho" vira "Agachamento"/"agachamento" em todas as linhas da tabela acima, e as séries de single e back-off (inclusive as ex-duplas de volume) aparecem
  dentro do cartão do exercício principal em vez de em cartões separados.
- **CP9 — Hoje com séries tipadas.** Num treino com principal, single, back-off e walkout, o cartão mostra as linhas na ordem do plano com S, B e W na primeira coluna (ex-duplas como B com a legenda "Duplas de volume"; a linha W com carga e duração 5–8 s no lugar das repetições); "feito conforme o plano" marca todas em até 2 toques; o RPE é pedido depois do principal e não é pedido para a linha W; uma série marcada S/B/W é gravada com esse tipo.
- **CP10 — Plano.** A linha do exercício mostra os grupos em sequência; editar carga, séries, repetições ou RPE de um grupo funciona e recalcula só aquele grupo; a lixeira da linha "S" remove o single daquele treino.
- **CP11 — Regras iguais.** Os alertas do treinador do plano atual (portões, freio, fadiga do single, revisão de máximo, 4ª série e falha do terra, pegada, deload) são os mesmos de antes para o histórico real: mesmos dias, semanas, cargas e números; o texto é o mesmo exceto "Agacho" → "Agachamento".
- **CP12 — Análises iguais.** Carga dos principais, e1RM, termômetro do single, planejado × feito e "Por dia" têm os mesmos pontos de antes (o teste dourado compara, com os valores de hoje): os gráficos usam só as séries Normais; back-off e ex-duplas (mais leves que o principal nas 3 famílias; o teste confere) não alteram nenhum ponto;
  single e walkout (170–180 kg e 210–220 kg, acima do principal) nunca entram no top set nem no e1RM dos gráficos. O termômetro do single continua lendo as séries Single.
- **CP12b — Trocar o tipo recalcula na hora.** Mudar o tipo de uma série registrada de **Single para Normal** faz a carga dela entrar nos recordes, no máximo e no e1RM do exercício, no top set e no gráfico "Carga dos principais" (e no e1RM das Análises); de **Normal para Single, Back-off ou Walkout** (e de volta) recalcula tonelagem, recordes, e1RM e gráficos conforme a tabela, sem
  reabrir o app e sem alterar o plano. Verificável por teste (mesma série, tipos diferentes, resultados diferentes) e no roteiro. Nada muda sozinho: o app não troca o tipo por conta própria.
- **CP13 — Histórico do exercício.** Na tela do principal, o histórico mostra as séries S/B/W antigas (as duplas de volume como B) com a letra do tipo. Os recordes, o máximo e o e1RM do principal contam as séries Normais e Back-off e **nunca o single, o walkout nem o aquecimento** (os 170–180 kg do single e os 210–220 kg do walkout não viram recorde do agachamento); para o plano atual a carga recorde do principal
  não muda por causa do back-off (150 kg contra 170–210 kg).
- **CP13b — Tonelagem e contagem.** A tonelagem de cada sessão e semana é igual à de antes (single, back-off e duplas já contavam; walkout soma 0 kg; aquecimento fora); o "n/m" de séries do treino conta o walkout como 1 série, como hoje.
- **CP14 — Descanso.** O descanso padrão por tipo é o de hoje (single 5 min, back-off 3 min); as ex-duplas continuam com 3 min 30 s; um descanso ajustado pelo atleta em um exercício absorvido continua valendo para as séries correspondentes.
- **CP15 — Walkout.** O walkout aparece como linha W dentro do cartão do principal de agachamento, com 210 kg, duração 5–8 s e descanso de 3 min 30 s; marcar "feito conforme o plano" registra 1 série W com a duração e sem repetições; ela continua somando 1 série na sessão e 0 kg na tonelagem, não pede RPE, não entra na carga dos principais, no e1RM nem em regra,
  e as séries de walkout já registradas aparecem no histórico do principal como W, sem mudar contagem, tonelagem nem Análises (o exercício "Agachamento — walkout" deixa de existir). A carga de 210 kg não muda quando o máximo do agachamento é alterado (carga fixa, como hoje).
- **CP16 — Ciclo sem regras.** Um ciclo v2 sem regras abre sem erro em Hoje, Plano e Análises, sem alertas de portão, freio, single, revisão de máximo, 4ª série, falha do terra ou pegada, com arredondamento de 2,5 kg (teste e importação manual de um arquivo de exemplo).
- **CP17 — Segurança sem regras.** Nesse ciclo sem regras, um check-in com dor pior que o anterior ou com sinal de alarme continua gerando o alerta, com os limites padrão (teste e roteiro manual).
- **CP18 — Claude e importação.** Importar ciclo v1 e v2 funciona; `set_max` com `lift` antigo e com `maxId` aplicam a mesma mudança; `add_item`/`edit_item`/`remove_item` com tipo single, back-off ou duplas de volume viram operação no grupo do principal (prévia mostra o texto; duplas entram como Back-off com esse nome); o pacote para o Claude lista id e nome dos máximos e as séries por tipo;
  `docs/formato-ciclo.md` e `docs/claude-treinador.md` descrevem o v2 e dizem que o v1 continua aceito.
- **CP19 — Backup antigo.** Um backup `fitapp.backup/v1` feito antes da atualização é restaurado e o app abre normalmente com o plano e os registros convertidos.
- **CP20 — Sem regressão.** `npm test`, `npm run test:import`, `npm run typecheck` e `npx expo lint` passam; o importador da planilha passa a gerar v2.

## Verificação
- **Na nuvem / testes automáticos:** CP1, CP2, CP3 (contagens e tonelagem), CP7, CP11, CP12, CP12b, CP13b, CP14, CP16, CP17 (parte de regra), CP18 (parte de formato), CP19, CP20; conversão testada com o plano atual e com ciclos v1 de exemplo (com e sem singles, com back-off sem principal, com máximo alterado, com ajuste de descanso em item absorvido).
- **Prévia web:** abrir a prévia com um banco criado pela versão anterior (se a prévia mantiver o armazenamento entre versões) e conferir Hoje (cartão com S/B), Plano e Análises.
- **No simulador do Mac, com o banco atual (migração real) — roteiro:**
  1. Instalar a **versão anterior** (commit antes deste PBI). Registrar 3 séries de um treino que tenha principal, single e back-off (por exemplo, o do agachamento), alterar um máximo em Ajustes (supino +5 kg), mudar a ordem de um exercício arrastando, ajustar o descanso do back-off. Anotar: cargas do dia, alertas da aba Hoje, números das quatro Análises, valores dos máximos, séries e tonelagem do treino.
  2. Instalar a **versão nova** por cima, sem apagar o app. Abrir. Deve aparecer "Dados atualizados" uma vez. Tocar "Compartilhar cópia" e conferir que o arquivo é gerado. Tocar "Ok".
  3. Repetir as anotações do passo 1 e comparar: tudo igual, exceto "Agacho" → "Agachamento" e as séries S/B dentro do cartão (CP3, CP4, CP8, CP9, CP11, CP12, CP14).
  4. Abrir a tela do exercício principal: histórico com as séries S/B/W antigas (e as ex-duplas como B); recordes: carga recorde igual à de antes, back-off contado no histórico e single e walkout fora dos recordes (CP13); tonelagem da sessão igual (CP13b). Conferir o walkout (CP15).
     Em seguida, tocar na letra de uma série S registrada, trocá-la para Normal e ver os recordes, o e1RM e a linha de "Carga dos principais" passarem a contá-la; trocar de volta para Single e ver tudo voltar (CP12b).
  5. Fechar e abrir o app de novo: sem aviso, sem mudanças (CP7).
  6. Em Dados, restaurar a cópia do passo 2 e conferir que os dados voltam ao de antes (CP5). Restaurar também um backup JSON gerado pela versão anterior (CP19).
  7. Importar o arquivo de exemplo de ciclo v2 sem regras e abrir Hoje, Plano e Análises (CP16); fazer um check-in com dor pior que o anterior e ver o alerta de dor (CP17). Colar no campo do Claude um ajuste antigo (`set_max` com `lift`), um novo (`maxId`) e um `add_item` de back-off, e aplicar (CP18).
  8. Em Plano, editar a carga do back-off de um exercício e tocar na lixeira da linha "S" de um treino (CP10).
  9. Simular falha da cópia (por exemplo, preenchendo o armazenamento do simulador ou usando o modo de teste que o plano técnico definir) e conferir a tela com "Tentar de novo" (CP6).
- **No iPhone:** repetir os passos 2 a 5 depois da instalação normal por cima da versão anterior (`npm run iphone`); o que só o iPhone mostra é o compartilhamento da cópia para Arquivos/AirDrop, a velocidade da atualização com os dados reais e o conforto de toque na tabela de séries com as linhas S/B.

## Riscos e perguntas abertas
- **Risco (alto):** é uma atualização de dados sem volta e agora **também reescreve a que item pertence cada série já registrada**. Mitigações: cópia obrigatória, teste dourado com contagem de séries e tonelagem, idempotência, verificação com banco real no simulador antes do iPhone. O plano técnico pode fatiar em vários commits, mas os dois modelos entram na mesma migração.
- **Risco:** o 19 ficou o maior PBI da série (modelo de máximos + séries tipadas + regras + histórico). Se na planejação parecer grande demais, o corte permitido é entregar o 19 com a migração completa e **adiar só** a troca visual dos cartões (mantendo S/B como linhas dentro do cartão apenas para o que já era single, como hoje) — não é permitido adiar a conversão de dados.
- **Risco:** itens sem principal na sessão (back-off ou single órfão) viram exercícios comuns em vez de falhar; o plano embutido não deve ter nenhum (conferir no teste). Em planos editados pelo atleta pode haver; o aviso "Dados atualizados" não os lista, mas o teste de conversão cobre.
- **Risco:** no plano embutido há um principal por movimento (Agachamento High Bar, Supino competição/pausa, Terra convencional/hook; "Terra (convencional)" é variação). Se o plano do aparelho tiver sido editado e houver mais de um principal por movimento, a escolha do principal do single segue a regra "o principal seguinte da mesma sessão e do mesmo movimento".
- **Risco:** a troca "Agacho" → "Agachamento" mexe em textos fixos espalhados. Se algum ficar de fora, a tela mistura as duas palavras; o CP8 e o `grep` do plano técnico cobrem isso.
- **Risco de produto (visão nova):** tratar back-off como tipo de série aproxima o app do Hevy, mas muda o que o atleta atual vê (menos cartões). Foi pedido por ele.
- **Respondida (07/11/2026) — single de ativação:** só tonelagem; os gráficos usam só as séries Normais; um single que bate recorde vira Normal por troca de tipo do usuário. Não há mais pergunta aberta sobre o single.
- **P4 (não bloqueia):** o walkout continua contando na série "n/m" do treino (volume zero)? Proposta: sim, porque faz parte do plano e já é assim hoje. Se preferir, ele fica fora da contagem também.
- **P3 (não bloqueia; confirmar rápido):** a regra "duplas de volume → Back-off" está certa? É o que preserva os números; o usuário pode trocar o tipo depois pela interface (PBI 24). (O walkout já foi decidido: é tipo de série, 07/11/2026.)
- **P1 (não bloqueia este PBI):** distribuição para outras pessoas — ver as perguntas do coordenador no PLANO (conta paga da Apple, plataformas, dados de terceiros, plano pessoal, Claude, idioma). Este PBI não depende da resposta.
- **P2 (não bloqueia):** para quem não é o atleta, o check-in de dor lombar/joelho/punho/pé e a regra das 24 h ("reduzir agachamento e terra hoje") fazem sentido? Recomendação: ficar no módulo avançado, desligado para quem só quer treinar. Vale apenas para o plano do atleta até o usuário decidir.

**Respondidas em 06/11/2026 (viraram decisões):** dor e sinais de alarme seguem ativos em ciclo sem regras; a cópia automática fica até o usuário apagar; o primeiro máximo se chama "Agachamento"; os exercícios "Agacho…" são resolvidos pela conversão (não renomear dados); back-off e single são tipo de série; "duplas de volume" não é tipo (correção do usuário: duplas = Normal, Aquecimento ou Back-off; a regra adotada é Back-off, a confirmar); walkout é tipo de série do plano (07/11/2026).

## Andamento
| Data | Nota |
|---|---|
| 06/11/2026 | PBI criado a partir da fatia "base" da spec 15 (itens 15a, 15b, 15d e a conversão de dados do 15g). |
| 06/11/2026 | Respostas do atleta: "Agacho" vira "Agachamento"; dor e sinais de alarme seguem ativos sem regras; cópia fica até o atleta apagar. |
| 06/11/2026 | Correção do usuário: tipos do plano são Normal, Single de ativação e Back-off (Aquecimento segue existindo); "duplas de volume" não é tipo (3 itens do plano viram Back-off com esse nome, a confirmar); walkout foi proposto como exercício à parte. Letra V removida. |
| 07/11/2026 | Correção do usuário sobre o que cada tipo conta: back-off conta como série normal (tonelagem, recordes e máximo, top set, e1RM); walkout não conta (volume zero; conta só como 1 série no n/m, proposta); aquecimento como hoje. Tabela "O que cada tipo de série conta" criada; texto "recordes só Normais/falha" removido. Levantado que o single (10 a 30 kg acima do principal nas semanas 1 a 8) mudaria o top set e o e1RM; CP12, CP13 e CP1 ajustados e CP13b novo. |
| 07/11/2026 | Usuário respondeu o single: só tonelagem, gráficos só com séries Normais, "se um single bater recorde, vira série principal" (troca de tipo para Normal). Tabela final de contagem por tipo consolidada; "Análises iguais" volta a valer sem ressalva; CP12 reescrito e CP12b novo (trocar o tipo recalcula na hora). Ideia de sugerir a troca registrada como backlog. |
| 07/11/2026 | Decisão do usuário: o walkout é tipo de série do plano (letra W). Os 4 walkouts do plano viram grupo Walkout do principal do mesmo movimento (regra do single); no máximo um por exercício; proposta anterior (exercício à parte) e pergunta aberta correspondente removidas. |
| 06/11/2026 | Visão nova do usuário (app também para quem só faz academia normal) e pedido "back-off é tipo de série": escopo ampliado para incluir séries tipadas na mesma migração (CP2, CP3, CP9 a CP15); criação/edição de grupos passou para o PBI 24. |
