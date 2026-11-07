# 24 — Séries com tipo: montar single, back-off e aquecimento dentro do exercício · PBI

> **Produto: o quê e por quê.** Dono: `product-manager` (`/pm`). O como fica em [tech-plan.md](tech-plan.md),
> do `tech-planner` (`/planejar`).
> Continua o [PBI 19](../19-formato-v2/pbi.md), que muda o modelo (séries com tipo dentro do exercício) sem telas novas de criação. Pedido do usuário em 06/11/2026:
> "back-off deve ser um tipo de série, não um exercício novo, igual o single de ativação".

**Status:** ⏳ a fazer
**Depende de:** [19 — Modelo de treino v2](../19-formato-v2/pbi.md). Deve vir **logo depois do 19** e antes da [spec 16](../16-periodizacoes/spec.md) (criar treinos pela interface usa este editor).

## Objetivo
Depois do PBI 19, single de ativação e back-off (inclusive as antigas "duplas de volume", que viraram back-off) são **grupos de séries com tipo dentro do exercício**, mas só dá para editar os valores dos grupos que já existem. Antes, o atleta
podia acrescentar um back-off ao plano como "exercício novo"; agora isso precisa ser possível como o que realmente é: **mais um grupo de séries do mesmo exercício**. Este PBI dá ao usuário o editor para
**adicionar, remover, reordenar e trocar o tipo dos grupos de séries** de um exercício, no Plano e na tela Hoje, e é a base para quem cria treinos do zero (spec 16), seja o atleta de powerlifting ou
quem só faz academia normal (ex.: 3 séries normais + 1 drop set).

Momento de uso: planejando (aba Plano) e, às vezes, no meio do treino, quando decide acrescentar um back-off. Com uma mão, entre séries: alvo de toque de 56 pt e no máximo 3 toques para acrescentar um grupo.
Como saberemos que deu certo: o atleta acrescenta "Back-off 2×3 a 150 kg" a um exercício em até 3 toques e ele aparece como linhas "B" no cartão da tela Hoje; quem treina sem periodização monta "Supino: 3×10" e
acrescenta um single sem nunca ver a palavra "movimento".

## Escopo
- **Entra:**
  - Seção **"Séries"** no editor do exercício (Plano e Hoje) com a lista dos grupos de séries e o botão "Adicionar grupo de séries".
  - Editar um grupo: tipo, número de séries, repetições, carga (kg fixo ou % do máximo quando o exercício tem "Carga baseada em"), RPE alvo (opcional), descanso (opcional) e **nome** (opcional, só uma anotação como "Duplas de volume" ou "Rampa"; não é tipo).
  - Remover um grupo, reordenar grupos arrastando, trocar o tipo de um grupo.
  - Tipos que o plano prescreve (os do usuário): **Normal**, **Aquecimento**, **Single de ativação** e **Back-off**. **Duplas de volume não é tipo** (correção do usuário em 06/11/2026): quem quer "3 × 2 para somar volume" usa Normal, Aquecimento ou Back-off e, se quiser, escreve o nome do grupo.
    Falha e Drop set continuam só no registro. No máximo **um** grupo **Single de ativação** por exercício (as regras leem "o" single); Normal, Aquecimento e Back-off podem ter mais de um grupo.
  - Na tela Hoje, durante o treino, "Adicionar série" no cartão oferece o tipo da série (a folha de tipo de hoje passa a listar também Single de ativação e Back-off) e grava a série registrada com esse tipo, sem alterar o plano.
  - O walkout continua sendo um exercício comum (nada a fazer aqui além de poder escolher o papel).
  - Resolve o item do backlog "Recolocar o single removido pela lixeira": basta acrescentar o grupo Single de novo.
- **Não entra:**
  - Prescrever falha ou drop set no plano (continuam rótulos de registro, como hoje). "Duplas de volume" não é tipo e não entra na lista de tipos.
  - Tipos personalizados criados pelo usuário; séries em bloco (cluster, rest-pause), supersets.
  - Criar exercícios ou treinos novos (spec 16) e escolher o máximo do exercício (PBI 20); este PBI apenas usa o que existir.
  - Regras novas: a fadiga do single continua lendo o grupo Single, sem mudança.

## Comportamento
**Editor do exercício → seção "Séries"**
- Lista, uma linha por grupo, na ordem em que aparecem no treino. Cada linha mostra o tipo, "séries × repetições", a carga e o RPE alvo, por exemplo "Normal · 4 × 4 · 164 kg · RPE 7–8" ou "Back-off · 2 × 3 · 150 kg · RPE 7–8".
  Exercício com carga em % do máximo mostra "80% · 164 kg".
- Botão **"Adicionar grupo de séries"** (alvo de 56 pt) abre a folha de tipo (sem botão Cancelar; fecha arrastando) com os quatro tipos e uma linha de ajuda cada: "Normal: séries de trabalho.", "Aquecimento: série leve para preparar o corpo; não conta no volume, nas regras nem nas análises.", "Single de ativação: uma repetição pesada para ativar antes das séries de trabalho.",
  "Back-off: séries mais leves depois das de trabalho." Se o exercício já tem Single de ativação, esse tipo aparece desabilitado com o texto "Já existe neste exercício".
  Escolhido o tipo, abre a folha do grupo já com valores sugeridos: Normal 3 × 10; Aquecimento 2 × 8; Single 1 × 1; Back-off 2 × 5; carga sugerida: a do grupo Normal do exercício (ou em branco se não houver).
- Folha do grupo: campos "Séries", "Repetições" (um número ou faixa, ex.: 4 ou 8–12), "Carga" (kg fixo; se o exercício tem "Carga baseada em", mostra "% do máximo" e "= 164 kg"), "RPE alvo" (opcional), "Descanso" (opcional; vazio usa o padrão do tipo), "Nome do grupo" (opcional, ex.: "Duplas de volume")
  e "Salvar". Mensagens: "Informe o número de séries (1 a 20).", "Informe as repetições.", "Este exercício já tem um grupo de Single de ativação."
- **Remover:** ícone de lixeira na folha do grupo (ou deslizar a linha) com confirmação "Remover o grupo de Back-off deste exercício?". O exercício precisa ter pelo menos um grupo: no último, a lixeira fica desabilitada com "O exercício precisa ter pelo menos um grupo de séries."
  Séries já registradas daquele tipo não são apagadas (o registro fica no histórico).
- **Reordenar:** segurar e arrastar a linha do grupo (mesmo componente de arraste das outras listas). A ordem do plano é a ordem das linhas na tela Hoje.
- **Trocar o tipo:** na folha do grupo, o campo "Tipo" abre a mesma folha de tipos; respeita "no máximo um Single de ativação".
- **Alcance da mudança:** o mesmo que o editor do exercício já oferece hoje (só este treino ou também os das próximas semanas); a confirmação mostra quantos treinos serão alterados.

**Tela Hoje durante o treino**
- No cartão, "Adicionar série" abre a folha de tipo de série (a de hoje, com as letras A, F, D) agora também com **S** Single de ativação e **B** Back-off. Escolher o tipo registra uma série extra com esse tipo (carga e repetições da série anterior ou do grupo), sem mudar o plano. Se o usuário quiser mudar o plano para as próximas vezes, usa o editor do exercício.
- Trocar o tipo de uma série já registrada (tocando na letra) funciona como hoje e agora oferece os seis tipos (Aquecimento, Normal, Falha, Drop set, Single de ativação, Back-off).

**Claude**
- `add_item`/`remove_item` com tipo single, back-off ou duplas de volume (PBI 19; "duplas" entra como Back-off com esse nome) continuam funcionando; para Single, que só pode haver um por exercício, se já houver, a prévia diz "Este exercício já tem Single de ativação; será editado" em vez de duplicar.

Regras do produto: nunca alterar o plano sem o usuário confirmar; alvo de toque de 56 pt; uma mão; texto em pt-BR com vírgula decimal (formatação de `format.ts`).

## Decisões
- **Editor único de grupos para todos os caminhos de criar treino** (Plano, Hoje, e depois a spec 16). Alternativa descartada: um botão por tipo ("Adicionar back-off", "Adicionar single"), que cresceria com cada tipo novo e esconderia o conceito comum.
- **Tipos do plano = os do usuário: Normal, Aquecimento, Single de ativação, Back-off. "Duplas de volume" não é tipo** (correção do usuário em 06/11/2026: "ou é normal, ou é aquecimento, ou é back-off"). O nome do grupo é livre e opcional, para quem quiser anotar "Duplas de volume".
  Alternativa descartada: ter "Duplas de volume" na lista de tipos.
- **No máximo um grupo Single de ativação por exercício; os demais tipos podem repetir.** Motivo: as regras leem "o" single (fadiga do single); já Back-off, Normal e Aquecimento aceitam mais de um bloco (por exemplo, duas ex-back-offs de cargas diferentes, ou uma rampa de aquecimento). Alternativa descartada: um de cada
  tipo (obrigaria a fundir, na conversão do PBI 19, back-off e duplas de volume de uma mesma sessão).
- **Valores sugeridos ao adicionar** (Normal 3 × 10, Aquecimento 2 × 8, Single 1 × 1, Back-off 2 × 5): o usuário só ajusta, em vez de partir de campos vazios (menos toques).
- **Não prescrever falha/drop set** (decisão do PBI 19; seguem só no registro).
- **Tipos extra no registro durante o treino (S, B):** deixa o usuário marcar uma série do jeito que fez sem editar o plano; mantém o plano como contrato.
- **Entrega logo depois do 19:** a janela sem criar grupo pela tela deve ser a menor possível.
- Respostas do usuário (06/11/2026): "back-off deve ser um tipo de série, não um exercício novo, igual o single de ativação"; quer o app também para quem só faz academia normal.

## Critérios de pronto
- **CP1 — Lista de séries.** O editor de qualquer exercício mostra a seção "Séries" com um grupo por linha, na ordem do treino, com tipo, séries × repetições, carga e RPE.
- **CP2 — Adicionar em até 3 toques.** A partir do cartão do exercício: abrir editor → "Adicionar grupo de séries" → tipo; o grupo entra com valores sugeridos, e depois de "Salvar" aparece no Plano e no cartão da tela Hoje como linhas com a letra do tipo.
- **CP3 — Editar.** Alterar séries, repetições, carga (kg ou %), RPE e descanso de um grupo muda só aquele grupo e, quando há % do máximo, mostra a carga calculada; valores inválidos mostram a mensagem e não salvam.
- **CP4 — Um Single por exercício.** Tentar adicionar um segundo Single de ativação mostra o tipo desabilitado com "Já existe neste exercício"; trocar o tipo de um grupo para Single quando já existe outro é recusado com a mensagem; Normal, Aquecimento e Back-off aceitam mais de um grupo.
  A lista de tipos não contém "Duplas de volume"; o nome do grupo aceita esse texto livremente.
- **CP5 — Remover.** Remover um grupo pede confirmação, tira o grupo do plano e não apaga séries já registradas; o último grupo do exercício não pode ser removido.
- **CP6 — Reordenar.** Arrastar grupos muda a ordem no Plano e na tela Hoje; a ordem persiste ao reabrir o app.
- **CP7 — Alcance.** Salvar uma alteração com alcance "próximas semanas" mostra quantos treinos serão alterados e só então aplica; "só este treino" não altera outros.
- **CP8 — Single de volta.** Depois de tirar o single pela lixeira da linha "S", é possível acrescentá-lo de novo pelo editor (resolve o backlog "Recolocar o single").
- **CP9 — Hoje.** "Adicionar série" no cartão oferece Single e Back-off além de A, F e D; a série registrada leva o tipo escolhido sem mudar o plano; trocar o tipo de uma série registrada oferece os seis tipos.
- **CP10 — Regras.** A fadiga do single lê o grupo Single acrescentado pelo editor; os alertas do plano atual (teste dourado do PBI 19) continuam iguais.
- **CP11 — Claude.** `add_item` de single em exercício que já tem Single edita o grupo existente (prévia mostra o aviso); sem Single, adiciona; `add_item` de back-off ou duplas de volume adiciona um grupo Back-off (duplas com esse nome).
- **CP12 — Acessibilidade e formato.** Botões com alvo de 56 pt e rótulo de acessibilidade, texto com Dynamic Type, números em pt-BR.
- **CP13 — Sem regressão.** `npm test`, `npm run test:import`, `npm run typecheck` e `npx expo lint` passam.

## Verificação
- **Na nuvem / testes automáticos:** operações sobre grupos (adicionar, remover, reordenar, trocar tipo, um Single por exercício, mínimo de um grupo), valores sugeridos, alcance, tradução de `add_item` do Claude, regras com o single novo (CP2 a CP5, CP7, CP10, CP11, CP13).
- **Prévia web:** conferir a seção "Séries", as folhas de tipo e do grupo e o arraste (CP1, CP2, CP3, CP6).
- **No simulador / iPhone (roteiro):**
  1. Plano → um treino → um exercício → editor: ver a seção "Séries" (CP1).
  2. "Adicionar grupo de séries" → Back-off → deixar os valores sugeridos → Salvar. Conferir em Hoje o cartão com as linhas B (CP2).
  3. Tentar adicionar um segundo Single de ativação: opção desabilitada; conferir que a lista de tipos não tem "Duplas de volume" e que o nome do grupo aceita esse texto (CP4). Remover o grupo e ver a confirmação; tentar remover o único grupo restante (CP5).
  4. Arrastar o single para antes e depois do principal; reabrir o app (CP6).
  5. Tirar o single pela lixeira da linha "S" e acrescentá-lo pelo editor (CP8). Alterar a carga do back-off com alcance "próximas semanas" e conferir a contagem (CP7).
  6. Em Hoje, durante o treino, "Adicionar série" → Back-off; trocar o tipo de uma série registrada (CP9).
  7. Colar no campo do Claude um `add_item` de single em exercício que já tem single, e outro de duplas de volume (CP11).
  - **Só no iPhone:** conforto de toque com uma mão e texto grande; arraste de linhas (CP12).

## Riscos e perguntas abertas
- **Risco de UX:** muitos campos numa folha só; mitigado com valores sugeridos e campos opcionais recolhidos (RPE e descanso) — se ficar pesado na prática, mover RPE e descanso para "Mais opções".
- **Risco:** duas formas de acrescentar série na tela Hoje (extra do registro × grupo no plano) podem confundir; o texto da folha explica "só hoje" × editor "para as próximas vezes".
- **P1 (não bloqueia):** Single de ativação e Back-off devem aparecer para todos ou só no módulo avançado (powerlifting)? Back-off serve a qualquer um; "single de ativação" é mais específico. Recomendação: aparecer para todos por enquanto; esconder só se atrapalhar quem usa o app para academia comum.

## Andamento
| Data | Nota |
|---|---|
| 06/11/2026 | PBI criado a partir do pedido "back-off deve ser um tipo de série, não um exercício novo" e da visão de app para qualquer pessoa de academia. |
| 06/11/2026 | Correção do usuário: tipos do plano são Normal, Aquecimento, Single de ativação e Back-off; "Duplas de volume" saiu da lista de tipos (vira nome de grupo opcional); só o Single é limitado a um por exercício; letra V removida. |
