# 25 — Recordes com medalha: avisar na hora e marcar a série que bateu · PBI

> **Produto: o quê e por quê.** Dono: `product-manager` (`/pm`). O como fica em [tech-plan.md](tech-plan.md),
> do `tech-planner` (`/planejar`).
> Pedido do usuário em 07/11/2026: "se um recorde foi batido, é preciso avisar o usuário e colocar um ícone de medalhinha dourada naquela série
> específica. Aí podemos ter diferentes tipos de recorde. Maior peso, maior volume, maior 1 RM, maior 1 eRM".
> Evolui a lista "Recordes pessoais" da [spec 10](../10-cabecalho-e-adicionar-exercicio/spec.md) e usa os tipos de série da [spec 11](../11-tipo-de-serie-datas-folhas/spec.md)
> e a tabela "O que cada tipo de série conta" do [PBI 19](../19-formato-v2/pbi.md).

**Status:** ⏳ a fazer (fatia 25a pronta para planejar; 25b depois, ver "Fatias")
**Depende de:** nada para a **25a** (funciona sobre o modelo atual do plano). Os critérios marcados "(depois do PBI 19)" dependem do [PBI 19](../19-formato-v2/pbi.md) (single e back-off viram tipos de série do exercício) e, para trocar o tipo na tela Hoje, do que o 19 entrega; a **25b** vem depois do [PBI 24](../24-series-com-tipo/pbi.md).
**Persona:** serve a qualquer pessoa que registra treino, inclusive quem só faz academia normal. Não é recurso avançado nem tem interruptor de "módulo": é o tipo de feedback que apps como o Hevy dão e que motiva a voltar no treino seguinte.

## Objetivo
Hoje o app só mostra recordes se o usuário abrir a tela do exercício e olhar a lista "Recordes pessoais". Ninguém avisa na hora em que ele bate um recorde, e nenhuma série fica marcada. O momento de
satisfação (a série pesada que subiu) passa em branco, e depois o usuário não consegue ver **quando** e **em qual série** foi o recorde.

Este PBI faz o app **reconhecer o recorde assim que a série é marcada com o ✓**: mostra uma **faixa curta** ("Novo recorde"), dá uma vibração leve e coloca uma **medalha dourada naquela série**, na tabela de séries da tela Hoje,
no histórico do exercício e na lista de recordes. Existem quatro tipos de recorde, sempre **por exercício**:
**maior peso, maior volume (de uma série), maior 1RM e maior 1RM estimado**. Tocando na medalha o usuário vê quais tipos foram batidos e os números ("Maior peso: 140 kg, antes 135 kg em 28 out").

Momento de uso: durante o treino, com uma mão, entre séries. O aviso não pode atrapalhar: não cobre o ✓ da próxima série, não exige toque, não toca som. Como saberemos que deu certo: o usuário bate um peso novo,
vê a medalha na série e a faixa sem tocar em nada; ao abrir a tela do exercício dias depois, a série com a medalha está lá, com a data; e **nenhuma medalha aparece quando não houve recorde** (sem ruído na primeira vez, sem medalha por empate).

## Definição dos quatro tipos de recorde
Todos valem **por exercício** (o mesmo exercício do catálogo ou do plano; "Supino reto" e "Supino inclinado" são exercícios diferentes e têm recordes separados) e consideram só as **séries elegíveis** (regra abaixo).

| Tipo (nome na tela) | Valor de uma série | Bate o recorde quando |
|---|---|---|
| **Maior peso** | a carga da série (kg), com qualquer número de repetições | a carga é maior que a maior carga de todos os treinos anteriores |
| **Maior volume de série** | carga × repetições da série (kg) | é maior que o maior volume de série de todos os treinos anteriores |
| **Maior 1RM** | a carga da série, **só se a série teve exatamente 1 repetição** (um 1RM de verdade, medido) | é maior que a maior carga feita para 1 repetição nos treinos anteriores |
| **Maior 1RM estimado** (o "1 eRM" do pedido) | estimativa de Epley, carga × (1 + repetições ÷ 30), arredondada ao kg inteiro; com 1 repetição vale a própria carga (mesma conta da tela do exercício hoje) | é maior que a maior estimativa dos treinos anteriores |

- **"Maior peso" × "Maior 1RM" não duplicam:** o maior peso vale para qualquer série (um 120 kg × 5 já é maior peso); o 1RM só existe quando a série foi de 1 repetição. Se o usuário faz 1 repetição mais pesada que tudo, a série ganha os dois tipos
  na mesma medalha. Quem treina sempre com 8 a 12 repetições quase nunca vê "Maior 1RM"; quem faz singles (powerlifting) vê os dois.
- **Maior volume = uma série**, não o treino inteiro. Motivo: a medalha tem de ficar numa série específica; o volume do exercício na sessão cresce a cada série marcada e a medalha "pularia" a cada ✓. O "Maior volume de sessão" continua na lista de recordes, sem medalha (ver "Não entra").
- **1RM estimado usa Epley, sem RPE** (a mesma fórmula da lista de hoje). O RPE só é informado **depois** do ✓; um recorde que dependesse dele mudaria de valor (e a medalha apareceria ou sumiria) quando o usuário digitasse o RPE. Os gráficos de e1RM das Análises (tabela RTS, [PBI 22](../22-analises-por-exercicio/pbi.md))
  são outro número, para outro uso; os nomes na tela diferem ("Maior 1RM estimado" aqui, "Máximo estimado (e1RM)" nas Análises). Ver P2.

### Quais séries contam (elegíveis)
Uma série só participa (para ganhar medalha **e** para ser a referência a ser batida) se: foi registrada (✓), tem **carga maior que zero e pelo menos 1 repetição**, **não** foi marcada como "falhou" (✗, não completou) e o **tipo** conta:

| Tipo de série | Conta nos recordes? |
|---|---|
| Normal | sim |
| Back-off | sim, como série normal (decisão do PBI 19) — **depois do PBI 19**; antes dele o back-off é um exercício à parte e não recebe medalha |
| Série até a falha (F) | sim (completou as repetições; "falhou" ✗ é outra coisa e não conta) — ver P3 |
| Drop set (D) | sim, como hoje na lista de recordes — ver P3 |
| Single de ativação | **não** (decisão do PBI 19: só tonelagem). Se bater recorde, o usuário troca o tipo para Normal e ela passa a contar — **depois do PBI 19** |
| Walkout | **não**, nunca |
| Aquecimento | **não**, nunca |
| Série marcada "falhou" (✗) | **não** |
| Exercício sem carga (peso corporal puro, tempo) | não gera recorde (ver "Não entra") |

**Antes do PBI 19** os itens "single de ativação", "walkout", "back-off" e "duplas de volume" do plano atual são exercícios à parte: **não recebem medalha nem aviso** (senão cada single mais pesado que o anterior viraria "recorde", contra a decisão de que single é só tonelagem).
Quando o PBI 19 passar essas séries para dentro do exercício principal, as medalhas se recalculam sozinhas (são derivadas do histórico) e o back-off passa a contar no principal.

## Regra de quando uma série tem medalha
Para cada tipo de recorde, uma série elegível **tem a medalha daquele tipo** quando as três condições valem:
1. **Há com o que comparar:** existe pelo menos uma série elegível, de um **treino anterior** do mesmo exercício, que tenha valor para esse tipo (para "Maior 1RM": pelo menos uma série anterior de 1 repetição). Sem isso é "primeiro registro" e **não há medalha nem aviso**.
2. **Supera estritamente** o melhor valor de todos os treinos anteriores. **Empate não conta** (100 kg × 5 de novo, igual ao melhor, não ganha medalha; 1RM estimado compara o número arredondado que o usuário vê).
3. **É a melhor do próprio treino** para aquele tipo. Se a série 2 bate o recorde e a série 3, no mesmo treino, vai além, a medalha daquele tipo fica só na 3. Empate dentro do treino: fica na primeira.

- **A medalha é "recorde no momento em que foi batido":** o que importa é o histórico **anterior** àquele treino. Se, semanas depois, outra série superar o recorde, a medalha da antiga **continua** (foi verdadeira naquele dia) e o detalhe passa a dizer "Superado em 12 nov". Só a série mais recente de cada tipo é o "Recorde atual".
- **Treinos em ordem cronológica:** pela data do treino e, no mesmo dia, pela hora do primeiro registro. Importações (Hevy, planilha) entram na mesma linha do tempo.
- **Derivada, nunca guardada:** a medalha é calculada do histórico a cada leitura. Por isso editar, desmarcar ou trocar o tipo de uma série atualiza as medalhas (da série e dos treinos seguintes, se for um treino antigo) sem nenhum passo extra, e backup, exportação e Claude não mudam.
- **Séries antigas ganham medalha retroativamente** (recomendação aceita no PBI; ver P4): ao abrir o histórico do exercício, as séries que foram recorde na época já aparecem com medalha. Retroativo **não gera aviso**, só a medalha.

## Escopo
- **Entra (fatia 25a):**
  - Cálculo dos quatro tipos de recorde por exercício, com a regra acima, para qualquer exercício e qualquer usuário.
  - **Medalha dourada na linha da série** da tabela de séries da tela Hoje, quando a série tem pelo menos um recorde; com contador quando tem 2 ou mais tipos.
  - **Faixa de aviso** na tela Hoje ao marcar o ✓ (ou ao editar/trocar o tipo de uma série registrada) que passa a ter um recorde que não tinha, mais uma vibração leve.
  - **Folha de detalhes** ao tocar na medalha (ou na faixa): tipos batidos, valor novo, valor anterior com data, e se ainda é o recorde atual.
  - Medalha também nas linhas do **histórico do exercício** (aba Histórico da tela do exercício).
  - Lista **"Recordes pessoais"** da tela do exercício reorganizada com os quatro tipos (mais "Maior volume de sessão"), cada um com a data e a série que o bateu.
  - Ajustes → seção **"Recordes"** com dois interruptores: medalhas e avisos.
  - Recordes recalculados na hora ao desmarcar, editar carga/repetições ou trocar o tipo da série.
  - Funciona offline, sem conta e sem mudar nenhum dado gravado (nada novo no backup).
- **Entra (fatia 25b, depois):** resumo ao concluir o treino ("Você bateu 3 recordes neste treino", com folha da lista por exercício).
- **Não entra** (vai para o backlog do PLANO, se for o caso):
  - Recordes por repetições (maior carga com N repetições) com medalha: a lista "Recordes por repetições" continua como está, sem medalha. O "Maior peso" já cobre o caso mais comum.
  - Medalha para "Maior volume de sessão" (o treino inteiro daquele exercício): só aparece na lista, sem medalha, porque não pertence a uma série.
  - Recordes de exercícios sem carga (peso corporal puro: barra fixa, flexão; e de duração: prancha). Hoje esses exercícios não têm carga registrada; recorde de repetições e de tempo é um item de backlog.
  - Medalha para single de ativação, walkout e aquecimento; a **sugestão** do app "este single superaria o recorde, trocar para Normal?" (item já no backlog; ver P5).
  - Compartilhar recorde, conquistas, sequências (streaks), ranking, metas, confete ou som.
  - Recordes de **máximo da periodização** (PBIs 20, 21 e 23): são outra coisa (máximo para calcular %), nada aqui os altera.
  - Medalhas nos gráficos das Análises, no CSV/JSON exportado e no pacote para o Claude.
  - Notificação do iOS fora do app (a faixa só aparece com o app aberto, na tela Hoje).
  - Escolher a fórmula do 1RM estimado ou ligar/desligar cada tipo de recorde separadamente.

## Comportamento

### Tela Hoje — tabela de séries (25a)
- **Caminho feliz:** o usuário digita (ou aceita a sugestão) e toca no ✓. A linha fica concluída como hoje. Se a série bateu algum recorde, em até 1 segundo aparece na linha uma **medalha dourada** entre o texto do plano e o campo KG e a **faixa** descrita abaixo. O ✓ nunca espera o cálculo: a série fica marcada na hora e a medalha chega depois.
- **Medalha:** ícone de medalha com fita (forma reconhecível mesmo sem cor), dourada no tema claro e no escuro (cor do tema, com contraste mínimo de 3:1 contra o fundo da linha concluída), com alvo de toque de pelo menos 44 pt. Com 2 ou mais tipos mostra um pequeno número ao lado (ex.: "3").
  Rótulo para leitor de tela: "Recorde: maior peso. Abrir detalhes." / "Recordes: maior peso, maior volume de série e maior 1RM estimado. Abrir detalhes." Se faltar largura (telas pequenas, texto grande), o texto do plano ("4×4") é encurtado antes de a medalha ser cortada.
- **Faixa de aviso** (só na tela Hoje, por cima do topo da tela, sem empurrar o conteúdo da tabela para baixo):
  - Um recorde: título "Novo recorde" e linha "Maior peso: 140 kg · antes 135 kg".
  - Vários: título "Novos recordes (3)" e linha "Maior peso · Maior volume de série · Maior 1RM estimado".
  - Some sozinha em 5 segundos; toque nela abre a folha de detalhes; deslizar para o lado a dispensa. **Não bloqueia nenhum toque fora dela**, não cobre o ✓ da próxima série nem a barra do descanso, que aparece normalmente. Se chegar outro aviso com a faixa visível, ela é substituída (não empilha) e os 5 segundos recomeçam.
  - **Háptico:** uma vibração curta de impacto médio, diferente da de "sucesso" do fim do descanso. **Sem som.** Com "Reduzir movimento" ligado no iOS, a faixa aparece sem animação de entrada.
  - Leitor de tela: o texto da faixa é anunciado ("Novo recorde. Maior peso: 140 quilos, antes 135 quilos").
  - **Quando avisa:** quando uma ação do usuário (✓, edição de carga/repetições, troca do tipo) faz a série ganhar um tipo de recorde que ela **não tinha**. Não avisa ao desmarcar, nem quando só o valor de um tipo que já tinha muda, nem para ajustes em cascata de séries seguintes, nem ao abrir o app, nem no retroativo.
- **Folha de detalhes** (fecha arrastando, **sem botão Cancelar**):
  - Título "Recorde" (um tipo) ou "Recordes desta série" (vários). Subtítulo: nome do exercício, "série 3 · 140 kg × 3 · 05 nov".
  - Uma linha por tipo: nome ("Maior peso"), valor novo ("140 kg"), "antes: 135 kg em 28 out" e um selo "Recorde atual" ou "Superado em 12 nov".
    Volume: "Maior volume de série · 420 kg" ("antes: 405 kg em 28 out"). 1RM estimado: "Maior 1RM estimado · 154 kg".
  - Ação no rodapé: "Ver recordes do exercício" (abre a tela do exercício).
- **Desmarcar o ✓, editar para baixo ou trocar para aquecimento/falha:** a medalha some na hora; se a série tinha "tomado" a medalha de outra do mesmo treino, a medalha volta para essa outra (a melhor que sobrar). Editar para cima ou trocar de volta a devolve.
- **Primeiro treino do exercício, empate, série sem elegibilidade:** sem medalha, sem faixa, sem vibração (nada de "primeiro registro").
- **Estados:** carregando (histórico ainda lendo): a tabela funciona normal e as medalhas aparecem quando o cálculo termina, sem travar o ✓. Erro no cálculo: a tabela segue normal sem medalha e o registro nunca é bloqueado. Offline: igual (tudo local).
- **Single de ativação e walkout** (e, antes do PBI 19, back-off e duplas): linha sem medalha.
- **Treino já concluído ou de dias anteriores:** as medalhas aparecem do mesmo jeito; editar uma série antiga pode acrescentar ou tirar medalhas em treinos posteriores do mesmo exercício (recálculo), sem aviso.

### Tela do exercício (25a)
- **Aba Histórico:** cada série do histórico que teve recorde mostra a medalha (mesmo ícone, número se for mais de um tipo) à direita do valor ("140 kg × 3 · RPE 8"); tocar abre a mesma folha de detalhes. A marca "falhou" continua como hoje.
- **Aba Resumo → seção "Recordes pessoais"** (renomeada com o mesmo padrão "Maior …"), cada linha com o valor, a data e a série ("05 nov · 140 kg × 3"):
  - "Maior peso"
  - "Maior 1RM" (só séries de 1 repetição; sem nenhuma: valor "—" e texto "Nenhuma série de 1 repetição ainda")
  - "Maior 1RM estimado"
  - "Maior volume de série" (valor "420 kg" e, na legenda, "140 kg × 3")
  - "Maior volume de sessão" (sem medalha; é a soma do exercício no treino)
  - Texto de ajuda: "A medalha marca as séries que superaram todos os treinos anteriores." Tocar numa linha com medalha abre a folha da série que bateu o recorde.
  - A lista mostra o **melhor valor registrado**, mesmo que a série dele seja a primeira do exercício (sem medalha, porque não havia com o que comparar).
  - Sem séries: como hoje, "Sem séries com carga e repetições."
- A linha antiga "Melhor 1RM (estimado)" passa a se chamar "Maior 1RM estimado". A lista inteira segue a mesma regra de séries elegíveis da medalha (tabela "Quais séries contam"), para a lista e a medalha nunca discordarem.

### Ajustes → seção "Recordes" (25a)
- Interruptor **"Mostrar medalhas nas séries"** (padrão ligado). Ajuda: "Marca com uma medalha a série que bateu um recorde do exercício." Desligado: nenhuma medalha na tabela de Hoje nem no histórico, e nenhuma faixa (o interruptor abaixo fica desabilitado). A lista "Recordes pessoais" continua.
- Interruptor **"Avisar ao bater um recorde"** (padrão ligado, só habilitado com as medalhas ligadas). Ajuda: "Mostra uma faixa e vibra por um instante. Não toca som." Desligado: as medalhas aparecem, sem faixa nem vibração.
- A escolha é guardada no aparelho e vale na hora, sem reabrir o app.

### Resumo ao concluir o treino (25b)
- No cartão "Treino concluído em 07 nov…" da tela Hoje, quando o treino teve recorde: linha "Você bateu 3 recordes neste treino." (1: "Você bateu 1 recorde neste treino.") e o botão "Ver recordes" que abre a folha **"Recordes do treino"**, agrupada por exercício: "Supino (competição, pausa)" → "Maior peso · 140 kg" etc.
  Conta **tipos de recorde por série** (a mesma série com 3 tipos conta como 3 na linha de texto; a folha mostra cada um). Sem recorde: o cartão fica como hoje, sem "0 recordes". Respeita o interruptor de medalhas.

## Decisões
- **Quatro tipos pedidos pelo usuário, com estas definições.** "Maior 1RM" = carga de uma série de **exatamente 1 repetição** (o 1RM medido); "maior 1 eRM" = 1RM estimado por Epley, o mesmo da tela do exercício hoje. Alternativas descartadas: "maior 1RM" como a maior carga com 1 ou mais repetições (seria idêntico ao "Maior peso", duplicado sem sentido); eRM pela tabela RTS (depende do RPE, que só chega depois do ✓: a medalha mudaria sozinha quando o usuário o informasse, e o RPE assumido 10 do PBI 22 subestimaria as séries sem RPE).
- **Volume = uma série (carga × repetições).** Motivo: a medalha vai numa série específica. Alternativas descartadas: volume do exercício no treino (a medalha pularia a cada série marcada e acabaria sempre na última); volume do treino inteiro (mistura exercícios, não é "por exercício"). O "Maior volume de sessão" fica só na lista, e seu aviso no resumo do 25b.
- **Uma medalha por série, com contador quando há vários tipos; os detalhes na folha.** Alternativa descartada: uma medalha por tipo na mesma linha (a linha da tabela tem cinco colunas e quatro medalhas não cabem, nem no iPhone menor nem com texto grande).
- **Só estritamente maior; empate não conta.** Motivo: repetir o mesmo 100 kg × 5 toda semana não é recorde e encheria o treino de medalhas. Alternativa descartada: empate conta (ruído).
- **Primeira vez não é recorde** (precisa de pelo menos um treino anterior com série elegível para aquele tipo). Motivo: a primeira série de um exercício novo seria "recorde de tudo", ruído puro. Alternativa descartada: aviso diferente "primeiro registro" (mais uma faixa sem informação; a lista de recordes já mostra o valor).
- **A melhor série do treino leva a medalha de cada tipo** (e não toda série que supere o histórico). Motivo: uma pirâmide 100, 105, 110 kg dá uma medalha só (na de 110), em vez de três. Alternativa descartada: medalha em cada série que superou o melhor até ali (três medalhas e três faixas no mesmo exercício; a mais velha deixa de ser "o recorde do treino" assim que a seguinte chega). Consequência aceita: durante o treino a medalha "anda" para a série mais nova; a faixa avisa em cada ✓ que bate o recorde.
- **Medalha antiga fica quando outra a supera** ("recorde no momento"); só o selo muda para "Superado em …". Alternativa descartada: só o recorde atual tem medalha (apagaria a história; a medalha de hoje sumiria quando a de amanhã chegasse).
- **Derivada do histórico, não guardada.** Motivo: editar, desmarcar, trocar o tipo ou importar mantém tudo consistente sem regra de sincronização e sem migração de dados. Alternativa descartada: gravar a medalha na série (ficaria desatualizada quando o histórico muda).
- **Retroativo sim, sem aviso.** Recomendação do PM; custo zero porque é derivado, e dá sentido ao histórico. Alternativa descartada: só dali para a frente (o histórico real do usuário ficaria sem nada até os próximos recordes). Confirmar em P4.
- **Tipos que contam** seguem a tabela do PBI 19 (Normal e Back-off sim; Single, Walkout e Aquecimento nunca). Série até a falha (F) e drop set contam como hoje; "falhou" (✗) não (P3). Antes do PBI 19, single/walkout/back-off/duplas (exercícios à parte) não recebem medalha.
- **Aviso discreto, sem som.** Faixa que some em 5 s, vibração curta, sem bloqueio de toque; só na tela Hoje. Motivo: uso com uma mão entre séries. Alternativas descartadas: janela/folha que exige toque para fechar (atrapalha o descanso); notificação do iOS (o app já está aberto); som.
- **Acessibilidade:** forma de medalha + cor + contador, rótulo de leitor de tela, anúncio da faixa; nunca só a cor dourada.
- **Dois interruptores (medalhas; avisos)**, ligados por padrão. Motivo: quem acha ruído desliga a faixa e mantém a medalha, ou desliga tudo. Alternativa descartada: sem opção de desligar.
- **Recorde é por exercício, não por movimento nem por máximo:** trocar "Supino reto" por "Supino inclinado" começa história nova (sem herdar). Segue a decisão de que tudo é por exercício (PBIs 20 a 22).
- **Fatiamento:** 25a antes do PBI 19 e 25b depois do 24. O recorde é derivado (sem migração) e a regra "o que conta" é a mesma função antes e depois do 19 — só a lista de tipos que contam cresce (back-off entra no principal; single→Normal vira possível).
- Respostas do usuário: pedido de 07/11/2026 (texto acima) definiu "avisar", "medalha dourada naquela série específica" e os quatro tipos. A regra de que o single que bate recorde passa a Normal e então conta é do usuário (07/11/2026, PBI 19). Visão de 06/11/2026: serve a quem faz academia normal.

## Critérios de pronto
- **CP1 — Maior peso.** Num exercício com histórico, marcar (✓) uma série com carga maior que a maior de todos os treinos anteriores faz a linha ganhar a medalha, a faixa "Novo recorde" com "Maior peso: X kg · antes Y kg" e uma vibração, em até 1 segundo, sem atrasar o ✓ (a linha fica concluída na hora).
- **CP2 — Maior volume de série.** Uma série com carga × repetições maior que o maior volume de série anterior ganha o tipo "Maior volume de série" mesmo com carga igual ou menor que o recorde de peso (ex.: 100 kg × 12 depois de 110 kg × 5).
- **CP3 — Maior 1RM (1 repetição).** Uma série de exatamente 1 repetição com carga maior que a maior de 1 repetição dos treinos anteriores ganha "Maior 1RM". Uma série de 3 repetições nunca ganha "Maior 1RM", mesmo com carga recorde. Sem nenhuma série de 1 repetição no histórico, o primeiro 1RM não ganha medalha (a lista mostra o valor).
- **CP4 — Maior 1RM estimado.** O valor é carga × (1 + repetições ÷ 30) arredondado ao kg inteiro (a mesma conta da lista de hoje); só é recorde se o número arredondado for maior que o anterior; registrar o RPE depois do ✓ **não** muda nenhuma medalha.
- **CP5 — Um tipo ou vários na mesma medalha.** Uma série que bate 3 tipos mostra uma medalha com o número 3, a faixa "Novos recordes (3)" com os nomes, e a folha lista os 3 tipos com valor novo, valor anterior e data. Uma série que bate um só mostra a medalha sem número e a faixa "Novo recorde".
- **CP6 — Empate não conta.** Repetir exatamente o melhor valor (mesma carga, mesmo volume, mesma estimativa) não dá medalha, faixa nem vibração.
- **CP7 — Primeira vez.** O primeiro treino de um exercício (inclusive todas as séries dele, mesmo crescentes) não tem medalha, faixa nem vibração; o segundo treino já pode ter.
- **CP8 — Melhor série do treino.** Em um treino com séries de 100, 105 e 110 kg (todas acima do histórico), só a de 110 kg fica com a medalha de "Maior peso" ao final; ao marcar a de 105, ela tem a medalha, e ao marcar a de 110, a medalha passa para a de 110 (a faixa avisa nas duas marcações).
- **CP9 — Tipos de série.** Séries Normal, até a falha (F) e drop set (D) podem ter medalha; aquecimento, walkout, single de ativação e série "falhou" (✗) nunca têm e nunca servem de referência para o recorde dos outros (um single de 180 kg não impede nem cria recorde para uma série Normal de 150 kg).
  **Antes do PBI 19:** itens single/walkout/back-off/duplas do plano atual (exercícios à parte) não têm medalha nem aviso.
- **CP10 — Desmarcar, editar, trocar o tipo.** Desmarcar o ✓ remove a medalha da série, sem faixa; se outra série do mesmo treino passa a ser a melhor, ela recebe a medalha. Editar a carga/repetições para um valor sem recorde remove a medalha, e para um valor com recorde a coloca. Trocar o tipo da série para Aquecimento remove, e de volta para Normal recoloca. Tudo na hora, sem reabrir o app.
- **CP11 — Single→Normal (depois do PBI 19).** Uma série registrada como Single de ativação, com carga maior que todos os recordes do exercício, **não** tem medalha; trocar o tipo dela para Normal (folha de tipo da série) a faz ganhar a medalha e a faixa; trocar de volta tira. O plano não muda.
- **CP12 — Back-off no principal (depois do PBI 19).** Uma série Back-off que supera o histórico do exercício principal ganha medalha como qualquer série Normal; as séries Back-off já registradas pelo plano atual, convertidas pelo PBI 19, passam a contar na lista e nas medalhas do principal.
- **CP13 — Medalha no momento do registro.** Depois que uma série nova supera um recorde, a medalha da série antiga continua visível no histórico, e o detalhe dela mostra "Superado em <data>"; a série nova mostra "Recorde atual". Só uma série por tipo mostra "Recorde atual".
- **CP14 — Retroativo.** Abrindo o histórico de um exercício que já tinha vários treinos antes desta versão, as séries que superaram todos os treinos anteriores aparecem com medalha, calculadas em ordem cronológica, sem nenhuma faixa nem vibração. Treinos importados entram na mesma linha do tempo.
- **CP15 — Cascata ao editar o passado.** Editar ou desmarcar uma série de um treino antigo recalcula as medalhas das séries posteriores do mesmo exercício (apareçam ou sumam), sem faixa; nenhuma medalha fica "presa" depois de o histórico mudar.
- **CP16 — Detalhes.** Tocar na medalha (na tabela de Hoje ou no histórico do exercício) ou na faixa abre a folha com um item por tipo (nome, valor novo, "antes: … em <data>", selo "Recorde atual"/"Superado em …"); fecha arrastando, sem botão Cancelar; "Ver recordes do exercício" abre a tela do exercício.
- **CP17 — Faixa discreta.** A faixa some em 5 s sem toque; não impede tocar no ✓ da próxima série nem na barra de descanso (que aparece normalmente); uma segunda faixa substitui a primeira; nunca toca som; deslizar a dispensa.
- **CP18 — Lista de recordes.** "Recordes pessoais" mostra "Maior peso", "Maior 1RM", "Maior 1RM estimado", "Maior volume de série" e "Maior volume de sessão", cada um com valor, data e a série; as medalhas e a lista nunca discordam (o valor de cada linha é o da série que tem o selo "Recorde atual" daquele tipo, ou a série de referência quando só existe o primeiro registro).
- **CP19 — Interruptores.** Em Ajustes → "Recordes", desligar "Mostrar medalhas nas séries" remove medalhas e faixas de Hoje e do histórico (e desabilita "Avisar ao bater um recorde"); desligar só o aviso mantém as medalhas e remove faixa e vibração. Padrão: os dois ligados; a escolha persiste ao reabrir o app.
- **CP20 — Por exercício.** Registrar 150 kg num exercício que só tem registro de 100 kg em **outro** exercício não gera medalha nem referência cruzada; trocar o exercício do treino (troca "só este treino") começa a história do novo, sem herdar o do antigo.
- **CP21 — Séries sem elegibilidade.** Série sem carga, sem repetições, com carga zero ou em exercício de peso corporal sem carga não gera medalha e não quebra a tela.
- **CP22 — Acessibilidade.** A medalha tem rótulo de leitor de tela ("Recorde: maior peso. Abrir detalhes."), alvo de toque ≥ 44 pt, forma de medalha reconhecível sem a cor, contraste ≥ 3:1 nos temas claro e escuro, e funciona com texto grande sem esconder o campo KG; a faixa é anunciada pelo leitor de tela.
- **CP23 — Offline e dados.** Tudo funciona em modo avião; nenhum dado novo vai para backup/exportação; um backup restaurado reproduz as mesmas medalhas; `npm test`, `npm run test:import`, `npm run typecheck` e `npx expo lint` passam.
- **CP24 — Desempenho.** Com um exercício de 500 séries registradas, marcar o ✓ deixa a linha concluída imediatamente e a medalha aparece em até 1 segundo.
- **CP25 — Resumo do treino (25b).** Num treino concluído com recorde, o cartão mostra "Você bateu N recordes neste treino." e "Ver recordes" abre "Recordes do treino" agrupada por exercício; sem recorde, nada aparece; respeita o interruptor de medalhas.

## Verificação
- **Na nuvem / testes automáticos (domínio):** os quatro tipos com os números de cada definição (CP1 a CP4); empate, primeira vez e melhor série do treino (CP6 a CP8); elegibilidade por tipo de série, falha ✗ e itens à parte do modelo atual (CP9, CP21); desmarcar, editar, trocar tipo e cascata (CP10, CP15); recorde no momento e "Recorde atual" (CP13); retroativo e importados em ordem (CP14); recordes por exercício (CP20); consistência da lista com as medalhas (CP18); 500 séries (CP24); casos "depois do PBI 19" de single→Normal e back-off (CP11, CP12) assim que o modelo existir.
- **Prévia web:** conferir a medalha na tabela com tema claro e escuro, a faixa, a folha de detalhes, o histórico do exercício, a lista de recordes e os interruptores em Ajustes (CP5, CP16 a CP19, CP22).
- **No simulador do Mac e no iPhone (roteiro, com os dados reais):**
  1. Abrir a tela de um exercício com pelo menos 3 treinos (Resumo) e anotar os valores da lista "Recordes pessoais". No Histórico, conferir que as séries que foram recordes na época têm medalha, sem aviso (CP14, CP18).
  2. Em Hoje, abrir um treino com esse exercício e iniciar o treino. Marcar uma série **igual** ao melhor peso e repetições: nenhuma medalha, faixa nem vibração (CP6).
  3. Digitar uma carga 2,5 kg acima do maior peso, com as mesmas repetições, e tocar no ✓: a linha fica concluída na hora; a medalha aparece; a faixa "Novo recorde" diz "Maior peso"; vibra uma vez; o timer de descanso aparece sem ser coberto; é possível tocar no ✓ da próxima série durante a faixa; a faixa some sozinha em 5 segundos (CP1, CP17).
  4. Tocar na medalha: a folha mostra os tipos, os valores e "antes: … em <data>"; arrastar fecha; tocar em "Ver recordes do exercício" abre a tela do exercício (CP16).
  5. Marcar a série seguinte com carga ainda maior: a medalha de peso passa para ela e sai da anterior (CP8). Desmarcar a segunda: volta para a primeira (CP10).
  6. Editar a carga de uma série com medalha para baixo do recorde: a medalha some; subir de novo: volta (CP10). Trocar o tipo dela para "Série de aquecimento": some; voltar a "Série normal": volta (CP9, CP10).
  7. Registrar uma série de 1 repetição acima do melhor 1RM (ou, se nunca fez 1 repetição, registrar o primeiro e ver que não há medalha de "Maior 1RM"): conferir a medalha com número 2 ou 3 e o nome "Maior 1RM" na folha (CP3, CP5).
  8. Registrar um exercício novo (adicionar do catálogo) com 3 séries: sem medalha em nenhuma (CP7). Registrar de novo em outro dia: já pode ter.
  9. Em Ajustes → Recordes: desligar "Avisar ao bater um recorde" e repetir o passo 3 (medalha sem faixa nem vibração); desligar "Mostrar medalhas nas séries" (nada na tabela nem no histórico; o outro interruptor fica cinza); religar os dois (CP19).
  10. Ligar o VoiceOver: o foco na medalha lê "Recorde: maior peso. Abrir detalhes."; a faixa é anunciada. Repetir com tema escuro e texto grande: o campo KG continua visível (CP22).
  11. Ligar o modo avião e repetir o passo 3: igual (CP23).
  12. Concluir o treino e, na 25b, conferir "Você bateu N recordes neste treino." e a folha "Recordes do treino" (CP25).
  13. Depois do PBI 19: registrar um single com carga acima de todos os recordes do exercício: sem medalha; trocar o tipo para Normal pela folha de tipo: medalha e faixa; trocar de volta: some (CP11).
  - **Só no iPhone:** a sensação da vibração (curta, distinta da do fim do descanso), o conforto de tocar na medalha com uma mão entre séries e a legibilidade do dourado ao sol/em tela de brilho baixo.

## Riscos e perguntas abertas
- **Risco de ruído:** progressão rápida (primeiros meses) gera muitas medalhas e faixas. Mitigações: empate não conta, a melhor série do treino leva a medalha, faixa discreta e interruptores. Se ainda incomodar: avisar só um tipo por série (o mais importante).
- **Risco de confusão entre dois "e1RM":** a tela do exercício (Epley, sem RPE) e as Análises (tabela RTS com RPE, PBI 22) mostram números diferentes para o mesmo exercício. Mitigação: nomes distintos; unificar a fórmula fica no backlog.
- **Risco de dependência:** o PBI 19 muda o que conta (back-off entra no principal, single→Normal vira possível) e ajusta o cálculo; como as medalhas são derivadas, nada precisa migrar, mas os CPs marcados "(depois do PBI 19)" só podem ser fechados depois dele.
- **Risco técnico de produto:** recalcular em cascata (CP15) e com histórico grande (CP24) precisa ser rápido; se o cálculo falhar, o registro de séries nunca pode ser bloqueado (regra do produto).
- **Risco de dados:** treinos importados com data errada ou duplicados podem criar ou apagar medalhas; a ordem é cronológica pela data do treino.
- **Risco de leitura:** o 1RM estimado de Epley fica menos preciso acima de uns 10 repetições (série de 15 repetições "estima" um 1RM alto). Mantido como na lista de hoje; a alternativa de limitar a 10 repetições ficaria diferente do que o usuário já vê.
- **P1 (confirmar, não bloqueia):** "Maior 1RM" = carga de uma série de **exatamente 1 repetição** e "Maior 1RM estimado" = estimativa pela fórmula de Epley (a mesma de hoje na tela do exercício). É isso mesmo que você quis dizer com "1RM" e "1 eRM"?
- **P2 (não bloqueia):** aceita que o recorde de 1RM estimado use Epley (independente do RPE) enquanto o gráfico de e1RM das Análises usa a tabela RTS? A alternativa seria unificar numa fórmula só depois, o que muda um dos dois números.
- **P3 (não bloqueia):** a "série até a falha" (F) e o drop set (D) devem **contar** nos recordes (como hoje na tela do exercício)? Recomendação do PM: contam, porque a série foi completada; só a série marcada "falhou" (✗) fica de fora. Se preferir que só Normal e Back-off contem, é uma linha da tabela.
- **P4 (não bloqueia):** confirma que as séries **antigas** ganham a medalha retroativamente (sem aviso), em vez de começar do zero a partir desta versão?
- **P5 (não bloqueia, para uma fatia 25c):** quando um **single de ativação** supera o recorde do exercício, quer ver uma medalha **apagada** (cinza) nele, com a dica "seria recorde se fosse Normal", para lembrar de trocar o tipo? Hoje, sem isso, o usuário só descobre ao olhar a lista. É o item "Sugerir trocar um single para Normal" do backlog; nada mudaria sozinho.

## Andamento
| Data | Nota |
|---|---|
| 07/11/2026 | PBI criado a partir do pedido do usuário (aviso + medalha dourada na série; maior peso, maior volume, maior 1RM, maior 1 eRM). Definidos os quatro tipos, a regra de quando há medalha (histórico anterior, estritamente maior, melhor série do treino, primeira vez sem medalha), derivada e retroativa; fatias 25a (medalha, faixa, detalhes, histórico, lista, interruptores) e 25b (resumo ao concluir). |
