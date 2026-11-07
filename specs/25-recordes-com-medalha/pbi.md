# 25 — Recordes com medalha: avisar na hora e marcar a série que bateu · PBI

> **Produto: o quê e por quê.** Dono: `product-manager` (`/pm`). O como fica em [tech-plan.md](tech-plan.md),
> do `tech-planner` (`/planejar`).
> Pedido do usuário em 07/11/2026: "se um recorde foi batido, é preciso avisar o usuário e colocar um ícone de medalhinha dourada naquela série
> específica. Aí podemos ter diferentes tipos de recorde. Maior peso, maior volume, maior 1 RM, maior 1 eRM".
> Evolui a lista "Recordes pessoais" da [spec 10](../10-cabecalho-e-adicionar-exercicio/spec.md) e usa os tipos de série da [spec 11](../11-tipo-de-serie-datas-folhas/spec.md)
> e a tabela "O que cada tipo de série conta" do [PBI 19](../19-formato-v2/pbi.md).

**Status:** 🚧 25a implementada, falta verificar no iPhone (medalha, faixa, folha, interruptores); 25b depois do PBI 24, ver "Fatias"
**Depende de:** nada para a **25a** (o "Maior 1RM com RPE" usa a mesma conta do e1RM do [PBI 22](../22-analises-por-exercicio/pbi.md), RTS com RPE 10 assumido; quem vier primeiro cria a função e o outro a reutiliza, sem esperar um pelo outro) (funciona sobre o modelo atual do plano). Os critérios marcados "(depois do PBI 19)" dependem do [PBI 19](../19-formato-v2/pbi.md) (single e back-off viram tipos de série do exercício) e, para trocar o tipo na tela Hoje, do que o 19 entrega; a **25b** vem depois do [PBI 24](../24-series-com-tipo/pbi.md).
**Persona:** serve a qualquer pessoa que registra treino, inclusive quem só faz academia normal. Não é recurso avançado nem tem interruptor de "módulo": é o tipo de feedback que apps como o Hevy dão e que motiva a voltar no treino seguinte.

## Objetivo
Hoje o app só mostra recordes se o usuário abrir a tela do exercício e olhar a lista "Recordes pessoais". Ninguém avisa na hora em que ele bate um recorde, e nenhuma série fica marcada. O momento de
satisfação (a série pesada que subiu) passa em branco, e depois o usuário não consegue ver **quando** e **em qual série** foi o recorde.

Este PBI faz o app **reconhecer o recorde assim que a série é marcada com o ✓**: mostra uma **faixa curta** ("Novo recorde"), dá uma vibração leve e coloca uma **medalha dourada naquela série**, na tabela de séries da tela Hoje,
no histórico do exercício e na lista de recordes. Existem quatro tipos de recorde, sempre **por exercício**:
**maior peso, maior volume (de uma série), maior 1RM (estimado sem RPE) e maior 1RM com RPE (estimado considerando o RPE)**. Tocando na medalha o usuário vê quais tipos foram batidos e os números ("Maior peso: 140 kg, antes 135 kg em 28 out").

Momento de uso: durante o treino, com uma mão, entre séries. O aviso não pode atrapalhar: não cobre o ✓ da próxima série, não exige toque, não toca som. Como saberemos que deu certo: o usuário bate um peso novo,
vê a medalha na série e a faixa sem tocar em nada; ao abrir a tela do exercício dias depois, a série com a medalha está lá, com a data; e **nenhuma medalha aparece quando não houve recorde** (sem ruído na primeira vez, sem medalha por empate).

## Definição dos quatro tipos de recorde
Todos valem **por exercício** (o mesmo exercício do catálogo ou do plano; "Supino reto" e "Supino inclinado" são exercícios diferentes e têm recordes separados) e consideram só as **séries elegíveis** (regra abaixo).

| Tipo (nome na tela) | Valor de uma série | Bate o recorde quando |
|---|---|---|
| **Maior peso** | a carga da série (kg), com qualquer número de repetições | a carga é maior que a maior carga de todos os treinos anteriores |
| **Maior volume de série** | carga × repetições da série (kg) | é maior que o maior volume de série de todos os treinos anteriores |
| **Maior 1RM** (1RM estimado **sem** RPE) | 1RM estimado só com carga e repetições, pela fórmula de Epley: carga × (1 + repetições ÷ 30), arredondado ao kg inteiro; com 1 repetição vale a própria carga. É a conta da tela do exercício hoje ("Melhor 1RM (estimado)"). Vale para qualquer série elegível, com qualquer número de repetições; o RPE **nunca** entra | o número (arredondado) é maior que o maior 1RM de todos os treinos anteriores |
| **Maior 1RM com RPE** (1RM estimado **com** RPE; o "1 eRM" do pedido) | 1RM estimado pela **tabela RTS** a partir de carga, repetições e RPE: carga ÷ (% da tabela). É a conta dos gráficos de e1RM das Análises ([PBI 22](../22-analises-por-exercicio/pbi.md)), com a mesma regra para série sem RPE: **assume esforço máximo, RPE 10** (e o RPE assumido nunca é gravado). Só existe para 1 a 10 repetições (a tabela não cobre mais). Arredondado a uma casa decimal, como as Análises | o número é maior que o maior 1RM com RPE de todos os treinos anteriores |

- **Os dois "1RM" são estimativas e convivem como tipos diferentes** (decisão do usuário em 07/11/2026: "o maior 1RM é medido calculando o 1RM estimado sem considerar o RPE; o maior 1eRM é igual, mas considerando o RPE"). Podem divergir: 100 kg × 5 com RPE 8 dá 117 kg no "Maior 1RM" (Epley) e 123,3 kg no "Maior 1RM com RPE" (tabela RTS, 5 repetições a RPE 8 = 81,1%);
  uma série leve com RPE baixo rende um "com RPE" alto e um "Maior 1RM" baixo. O "Maior 1RM" é **estável**: só muda se carga ou repetições mudarem. O "com RPE" **depende do RPE** e, como o RPE é informado depois do ✓, tem regras próprias (seção "Recordes que dependem do RPE").
- **"Maior peso" × "Maior 1RM" não duplicam:** o maior peso é a carga bruta (120 kg × 5 já é maior peso); o 1RM é uma estimativa que premia também mais repetições com a mesma carga (100 kg × 8 estima mais que 100 kg × 5). Com 1 repetição, peso e 1RM são o mesmo número e a série ganha os dois tipos na mesma medalha. Singles reais (1 repetição de verdade) não têm tipo próprio: aparecem no "Maior peso" e nas séries de 1 repetição da lista "Recordes por repetições".
- **Maior volume = uma série**, não o treino inteiro. Motivo: a medalha tem de ficar numa série específica; o volume do exercício na sessão cresce a cada série marcada e a medalha "pularia" a cada ✓. O "Maior volume de sessão" continua na lista de recordes, sem medalha (ver "Não entra").
- **Relação com o PBI 22:** o "Maior 1RM com RPE" usa **a mesma conta** do e1RM das Análises (tabela RTS, 1 a 10 repetições, série sem RPE como RPE 10). Quem vier primeiro (22 ou 25a) cria essa conta e o outro a reutiliza; o PBI 22 não muda. A diferença é só **quais séries entram**: os gráficos do 22 usam só as séries Normais (decisão do PBI 19),
  enquanto os recordes usam as séries elegíveis da tabela abaixo (Normal, Back-off, até a falha, drop set). Os números de uma mesma série coincidem nos dois lugares; os nomes na tela diferem ("Maior 1RM com RPE" aqui, "Máximo estimado (e1RM)" nas Análises).

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
1. **Há com o que comparar:** existe pelo menos uma série elegível, de um **treino anterior** do mesmo exercício, que tenha valor para esse tipo (para "Maior 1RM com RPE": uma série anterior de 1 a 10 repetições, pois a tabela não cobre mais). Sem isso é "primeiro registro" e **não há medalha nem aviso**.
2. **Supera estritamente** o melhor valor de todos os treinos anteriores. **Empate não conta** (100 kg × 5 de novo, igual ao melhor, não ganha medalha; os dois 1RM comparam o número arredondado que o usuário vê).
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
  - Escolher a fórmula dos dois 1RM (Epley e RTS são fixas) ou ligar/desligar cada tipo de recorde separadamente.
  - Pedir o RPE por causa do recorde ou gravar o RPE assumido (RPE 10): o RPE só existe se o usuário o informar.

## Comportamento

### Tela Hoje — tabela de séries (25a)
- **Caminho feliz:** o usuário digita (ou aceita a sugestão) e toca no ✓. A linha fica concluída como hoje. Se a série bateu algum recorde, em até 1 segundo aparece na linha uma **medalha dourada** entre o texto do plano e o campo KG e a **faixa** descrita abaixo. O ✓ nunca espera o cálculo: a série fica marcada na hora e a medalha chega depois.
- **Medalha:** ícone de medalha com fita (forma reconhecível mesmo sem cor), dourada no tema claro e no escuro (cor do tema, com contraste mínimo de 3:1 contra o fundo da linha concluída), com alvo de toque de pelo menos 44 pt. Com 2 ou mais tipos mostra um pequeno número ao lado (ex.: "3").
  Rótulo para leitor de tela: "Recorde: maior peso. Abrir detalhes." / "Recordes: maior peso, maior volume de série e maior 1RM com RPE. Abrir detalhes." Se faltar largura (telas pequenas, texto grande), o texto do plano ("4×4") é encurtado antes de a medalha ser cortada.
- **Faixa de aviso** (só na tela Hoje, por cima do topo da tela, sem empurrar o conteúdo da tabela para baixo):
  - Um recorde: título "Novo recorde" e linha "Maior peso: 140 kg · antes 135 kg".
  - Vários: título "Novos recordes (3)" e linha "Maior peso · Maior volume de série · Maior 1RM com RPE".
  - Some sozinha em 5 segundos; toque nela abre a folha de detalhes; deslizar para o lado a dispensa. **Não bloqueia nenhum toque fora dela**, não cobre o ✓ da próxima série nem a barra do descanso, que aparece normalmente. Se chegar outro aviso com a faixa visível, ela é substituída (não empilha) e os 5 segundos recomeçam.
  - **Háptico:** uma vibração curta de impacto médio, diferente da de "sucesso" do fim do descanso. **Sem som.** Com "Reduzir movimento" ligado no iOS, a faixa aparece sem animação de entrada.
  - Leitor de tela: o texto da faixa é anunciado ("Novo recorde. Maior peso: 140 quilos, antes 135 quilos").
  - **Quando avisa:** quando uma ação do usuário (✓, edição de carga/repetições, troca do tipo) faz a série ganhar um tipo de recorde que ela **não tinha**. Não avisa ao desmarcar, nem quando só o valor de um tipo que já tinha muda, nem para ajustes em cascata de séries seguintes, nem ao abrir o app, nem no retroativo. Informar ou alterar o **RPE** da série é uma ação do usuário e também pode avisar, só para o "Maior 1RM com RPE" (ver "Recordes que dependem do RPE").
- **Folha de detalhes** (fecha arrastando, **sem botão Cancelar**):
  - Título "Recorde" (um tipo) ou "Recordes desta série" (vários). Subtítulo: nome do exercício, "série 3 · 140 kg × 3 · 05 nov".
  - Uma linha por tipo: nome ("Maior peso"), valor novo ("140 kg"), "antes: 135 kg em 28 out" e um selo "Recorde atual" ou "Superado em 12 nov".
    Volume: "Maior volume de série · 420 kg" ("antes: 405 kg em 28 out"). Maior 1RM: "Maior 1RM · 117 kg" com a legenda "estimado, sem RPE: 100 kg × 5".
    Maior 1RM com RPE: "Maior 1RM com RPE · 123,3 kg" com a legenda **"calculado com RPE 8"** ou, quando a série não tem RPE, **"RPE não informado: calculado como RPE 10 (esforço máximo)"**.
  - Ação no rodapé: "Ver recordes do exercício" (abre a tela do exercício).
- **Desmarcar o ✓, editar para baixo ou trocar para aquecimento/falha:** a medalha some na hora; se a série tinha "tomado" a medalha de outra do mesmo treino, a medalha volta para essa outra (a melhor que sobrar). Editar para cima ou trocar de volta a devolve.
- **Primeiro treino do exercício, empate, série sem elegibilidade:** sem medalha, sem faixa, sem vibração (nada de "primeiro registro").
- **Estados:** carregando (histórico ainda lendo): a tabela funciona normal e as medalhas aparecem quando o cálculo termina, sem travar o ✓. Erro no cálculo: a tabela segue normal sem medalha e o registro nunca é bloqueado. Offline: igual (tudo local).
- **Single de ativação e walkout** (e, antes do PBI 19, back-off e duplas): linha sem medalha.
- **Treino já concluído ou de dias anteriores:** as medalhas aparecem do mesmo jeito; editar uma série antiga pode acrescentar ou tirar medalhas em treinos posteriores do mesmo exercício (recálculo), sem aviso.

### Recordes que dependem do RPE (25a)
Só o **"Maior 1RM com RPE"** depende do RPE. O RPE é informado **depois** do ✓ (a coluna RPE da série; para o exercício principal o app já o pede logo em seguida), então a medalha desse tipo é reavaliada **a cada vez que o RPE da série muda**. O "Maior peso", o "Maior volume de série" e o "Maior 1RM" **não** mudam com o RPE.
- **No ✓:** a série é avaliada com o RPE que tiver; sem RPE, com RPE 10 assumido (esforço máximo). Como o RPE 10 dá o menor 1RM possível para aquela carga e repetições, o valor assumido é conservador: série "conforme o plano", sem RPE e mais leve que o esforço real raramente ganha este tipo.
- **Ao informar o RPE depois:** a série é reavaliada na hora.
  - Se passa a ter o "Maior 1RM com RPE" (RPE menor que 10 sempre aumenta ou mantém o valor): ganha a medalha (ou o tipo entra na medalha que já tinha) e a **faixa avisa**: "Novo recorde" / "Maior 1RM com RPE: 123,3 kg · antes 120,1 kg". Se a faixa da mesma série ainda está na tela (por exemplo, "Novo recorde: Maior peso" do próprio ✓), ela é **substituída** por uma faixa única que lista todos os tipos da série ("Novos recordes (2)"), com os 5 segundos recomeçando.
  - Se já tinha o tipo (ganho no ✓ com RPE 10 assumido) e o valor só sobe: continua, **sem aviso**; a folha passa a dizer "calculado com RPE 8".
  - Se o RPE é **alterado para um valor mais alto** ou **apagado** (volta a valer RPE 10 assumido) e o valor deixa de superar o histórico: o tipo **some da medalha, sem aviso** (a medalha some inteira se era o único tipo). Editar de novo para o RPE anterior devolve o tipo.
- **Sem aviso duplicado:** o mesmo tipo de recorde da mesma série só é avisado **uma vez** enquanto o treino está aberto na tela, mesmo que o RPE seja trocado de 8 para 9 e de volta para 8. A medalha, essa sim, segue o valor atual.
- **Nunca grava o RPE assumido:** o RPE 10 usado no cálculo não aparece na coluna RPE nem entra em exportação, pacote do Claude ou regras; a coluna continua vazia ("—") até o usuário informar. Informar o RPE continua opcional; pular o pedido de RPE deixa o cálculo com o RPE 10 assumido.
- **Fora da tabela:** série com mais de 10 repetições não tem "Maior 1RM com RPE" (a tabela vai de 1 a 10 repetições); as demais medalhas valem normalmente.
- **Como o usuário percebe que o recorde considera o RPE:** o **nome** do tipo traz "com RPE" na faixa, na folha e na lista, e a **legenda da folha** diz qual RPE foi usado, ou "RPE não informado: calculado como RPE 10 (esforço máximo)", no mesmo espírito dos "pontos vazados" do PBI 22.
- **Muitas séries sem RPE de uma vez** ("Treino feito conforme o plano" marca tudo sem RPE): avalia com RPE 10 assumido e dá no máximo uma faixa por série (substituindo a anterior), como em qualquer marcação.

### Tela do exercício (25a)
- **Aba Histórico:** cada série do histórico que teve recorde mostra a medalha (mesmo ícone, número se for mais de um tipo) à direita do valor ("140 kg × 3 · RPE 8"); tocar abre a mesma folha de detalhes. A marca "falhou" continua como hoje.
- **Aba Resumo → seção "Recordes pessoais"** (renomeada com o mesmo padrão "Maior …"), cada linha com o valor, a data e a série ("05 nov · 140 kg × 3"):
  - "Maior peso"
  - "Maior 1RM" (estimado sem RPE, Epley; legenda "estimado, sem RPE", e a série "100 kg × 5")
  - "Maior 1RM com RPE" (estimado pela tabela RTS; legenda "estimado, com RPE 8" ou "estimado, RPE não informado (como RPE 10)"; sem série de 1 a 10 repetições: valor "—")
  - "Maior volume de série" (valor "420 kg" e, na legenda, "140 kg × 3")
  - "Maior volume de sessão" (sem medalha; é a soma do exercício no treino)
  - Texto de ajuda: "A medalha marca as séries que superaram todos os treinos anteriores." Tocar numa linha com medalha abre a folha da série que bateu o recorde.
  - A lista mostra o **melhor valor registrado**, mesmo que a série dele seja a primeira do exercício (sem medalha, porque não havia com o que comparar).
  - Sem séries: como hoje, "Sem séries com carga e repetições."
- A linha única de hoje, "Melhor 1RM (estimado)" (Epley), vira **duas**: "Maior 1RM" (a mesma conta de antes, sem RPE; o valor não muda) e a nova "Maior 1RM com RPE". A lista inteira segue a mesma regra de séries elegíveis da medalha (tabela "Quais séries contam"), para a lista e a medalha nunca discordarem.

### Ajustes → seção "Recordes" (25a)
- Interruptor **"Mostrar medalhas nas séries"** (padrão ligado). Ajuda: "Marca com uma medalha a série que bateu um recorde do exercício." Desligado: nenhuma medalha na tabela de Hoje nem no histórico, e nenhuma faixa (o interruptor abaixo fica desabilitado). A lista "Recordes pessoais" continua.
- Interruptor **"Avisar ao bater um recorde"** (padrão ligado, só habilitado com as medalhas ligadas). Ajuda: "Mostra uma faixa e vibra por um instante. Não toca som." Desligado: as medalhas aparecem, sem faixa nem vibração.
- A escolha é guardada no aparelho e vale na hora, sem reabrir o app.

### Resumo ao concluir o treino (25b)
- No cartão "Treino concluído em 07 nov…" da tela Hoje, quando o treino teve recorde: linha "Você bateu 3 recordes neste treino." (1: "Você bateu 1 recorde neste treino.") e o botão "Ver recordes" que abre a folha **"Recordes do treino"**, agrupada por exercício: "Supino (competição, pausa)" → "Maior peso · 140 kg" etc.
  Conta **tipos de recorde por série** (a mesma série com 3 tipos conta como 3 na linha de texto; a folha mostra cada um). Sem recorde: o cartão fica como hoje, sem "0 recordes". Respeita o interruptor de medalhas.

## Decisões
- **Quatro tipos, com a definição corrigida pelo usuário em 07/11/2026** ("o maior 1RM é medido calculando o 1RM estimado sem considerar o RPE; o maior 1eRM é igual, mas considerando o RPE"): **Maior 1RM** = Epley (carga e repetições, sem RPE), a conta da tela do exercício; **Maior 1RM com RPE** = tabela RTS com o RPE, e RPE 10 assumido quando a série não tem RPE, igual ao PBI 22.
  Substitui a definição anterior do PM ("1RM = série de exatamente 1 repetição; 1 eRM = Epley"). Alternativas descartadas: 1RM como carga de série de 1 repetição (o usuário não quis; singles reais já aparecem no "Maior peso"); 1RM com RPE só quando houver RPE informado (deixaria sem recorde a maioria das séries "conforme o plano"; o PBI 22 já definiu o RPE 10 assumido, marcado como estimativa); mesma conta para os dois (não haveria dois tipos).
- **O "Maior 1RM com RPE" se reavalia quando o RPE muda, sem aviso duplicado** (consequência de o RPE vir depois do ✓): ver "Recordes que dependem do RPE". Alternativas descartadas: esperar o RPE antes de avaliar (atrasa a faixa e muitas séries nunca recebem RPE); congelar a medalha no ✓ ignorando o RPE (contradiz o pedido de "considerando o RPE"); reavisar a cada edição do RPE (ruído).
- **Nomes na interface: "Maior 1RM" e "Maior 1RM com RPE"**, com a legenda "estimado, …" nas linhas da lista e da folha. Motivo: curtos, distinguem os dois pela única diferença que existe (o RPE) e seguem o padrão "Maior …". Alternativas: "1RM estimado" × "1RM estimado (RPE)" (mais longo na faixa e na medalha); "1eRM" (jargão). Escolha final do usuário em P6.
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
- **CP3 — Maior 1RM (sem RPE).** O valor é carga × (1 + repetições ÷ 30), arredondado ao kg inteiro (a mesma conta da lista de hoje, com 1 repetição vale a carga), para série com qualquer número de repetições; só é recorde se o número arredondado for maior que o dos treinos anteriores (ex.: 100 kg × 5 = 117 kg). O RPE da série **não** entra: informar, alterar ou apagar o RPE nunca muda este tipo.
  Uma série mais leve com mais repetições pode ganhá-lo sem ser "Maior peso" (ex.: 100 kg × 8 = 127 kg depois de 110 kg × 3 = 121 kg).
- **CP4 — Maior 1RM com RPE.** O valor é o 1RM estimado pela tabela RTS com carga, repetições e RPE (ex.: 100 kg × 5 a RPE 8 = 123,3 kg), arredondado a uma casa decimal, a mesma conta dos gráficos de e1RM das Análises. Série sem RPE é calculada como RPE 10, e esse RPE nunca é gravado nem aparece na coluna RPE.
  Série com mais de 10 repetições não tem este tipo (e não quebra os demais). Só é recorde se o número for maior que o dos treinos anteriores, calculados da mesma forma (cada série anterior com o seu RPE ou RPE 10).
- **CP4b — RPE informado depois do ✓.** Marcar o ✓ sem RPE (avalia com RPE 10) e depois informar RPE 8 (a) faz a série **ganhar** o "Maior 1RM com RPE" quando o valor passa a superar o histórico: medalha e faixa, sendo que uma faixa da mesma série ainda visível é **substituída** por uma única com todos os tipos; (b) se já tinha o tipo, **mantém** sem nova faixa, e a folha passa a dizer "calculado com RPE 8".
- **CP4c — RPE alterado ou apagado.** Alterar o RPE para um valor mais alto, ou apagá-lo (volta a RPE 10 assumido), faz o tipo **sumir** da medalha quando o valor deixa de superar o histórico, sem faixa nem vibração (se era o único tipo, a medalha some); voltar ao RPE anterior devolve. O mesmo tipo da mesma série não gera segunda faixa no mesmo treino aberto, mesmo trocando o RPE de 8 para 9 e de volta para 8.
- **CP4d — O recorde diz que considera o RPE.** O nome do tipo traz "com RPE" na faixa, na folha e na lista; a legenda da folha diz "calculado com RPE 8" ou "RPE não informado: calculado como RPE 10 (esforço máximo)"; as duas linhas, "Maior 1RM" e "Maior 1RM com RPE", aparecem separadas na lista e podem ter séries e valores diferentes.
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
- **CP18 — Lista de recordes.** "Recordes pessoais" mostra "Maior peso", "Maior 1RM", "Maior 1RM com RPE", "Maior volume de série" e "Maior volume de sessão", cada um com valor, data e a série; as medalhas e a lista nunca discordam (o valor de cada linha é o da série que tem o selo "Recorde atual" daquele tipo, ou a série de referência quando só existe o primeiro registro).
- **CP19 — Interruptores.** Em Ajustes → "Recordes", desligar "Mostrar medalhas nas séries" remove medalhas e faixas de Hoje e do histórico (e desabilita "Avisar ao bater um recorde"); desligar só o aviso mantém as medalhas e remove faixa e vibração. Padrão: os dois ligados; a escolha persiste ao reabrir o app.
- **CP20 — Por exercício.** Registrar 150 kg num exercício que só tem registro de 100 kg em **outro** exercício não gera medalha nem referência cruzada; trocar o exercício do treino (troca "só este treino") começa a história do novo, sem herdar o do antigo.
- **CP21 — Séries sem elegibilidade.** Série sem carga, sem repetições, com carga zero ou em exercício de peso corporal sem carga não gera medalha e não quebra a tela. Série com mais de 10 repetições não tem "Maior 1RM com RPE", mas pode ter os outros três tipos.
- **CP22 — Acessibilidade.** A medalha tem rótulo de leitor de tela ("Recorde: maior peso. Abrir detalhes."), alvo de toque ≥ 44 pt, forma de medalha reconhecível sem a cor, contraste ≥ 3:1 nos temas claro e escuro, e funciona com texto grande sem esconder o campo KG; a faixa é anunciada pelo leitor de tela.
- **CP23 — Offline e dados.** Tudo funciona em modo avião; nenhum dado novo vai para backup/exportação; um backup restaurado reproduz as mesmas medalhas; `npm test`, `npm run test:import`, `npm run typecheck` e `npx expo lint` passam.
- **CP24 — Desempenho.** Com um exercício de 500 séries registradas, marcar o ✓ deixa a linha concluída imediatamente e a medalha aparece em até 1 segundo; informar ou alterar o RPE de uma série reavalia a medalha na mesma faixa de tempo, sem travar o seletor de RPE.
- **CP25 — Resumo do treino (25b).** Num treino concluído com recorde, o cartão mostra "Você bateu N recordes neste treino." e "Ver recordes" abre "Recordes do treino" agrupada por exercício; sem recorde, nada aparece; respeita o interruptor de medalhas.

## Verificação
- **Na nuvem / testes automáticos (domínio):** os quatro tipos com os números de cada definição (CP1 a CP4: 100 kg × 5 dá 117 kg sem RPE e 123,3 kg com RPE 8; RPE assumido 10 = 115,9 kg; 11 repetições sem "com RPE"); reavaliação ao informar, alterar e apagar o RPE, sem aviso duplicado (CP4b, CP4c); empate, primeira vez e melhor série do treino (CP6 a CP8); elegibilidade por tipo de série, falha ✗ e itens à parte do modelo atual (CP9, CP21); desmarcar, editar, trocar tipo e cascata (CP10, CP15); recorde no momento e "Recorde atual" (CP13); retroativo e importados em ordem (CP14); recordes por exercício (CP20); consistência da lista com as medalhas (CP18); 500 séries (CP24); casos "depois do PBI 19" de single→Normal e back-off (CP11, CP12) assim que o modelo existir.
- **Prévia web:** conferir a medalha na tabela com tema claro e escuro, a faixa, a folha de detalhes, o histórico do exercício, a lista de recordes e os interruptores em Ajustes (CP5, CP16 a CP19, CP22).
- **No simulador do Mac e no iPhone (roteiro, com os dados reais):**
  1. Abrir a tela de um exercício com pelo menos 3 treinos (Resumo) e anotar os valores da lista "Recordes pessoais". No Histórico, conferir que as séries que foram recordes na época têm medalha, sem aviso (CP14, CP18).
  2. Em Hoje, abrir um treino com esse exercício e iniciar o treino. Marcar uma série **igual** ao melhor peso e repetições: nenhuma medalha, faixa nem vibração (CP6).
  3. Digitar uma carga 2,5 kg acima do maior peso, com as mesmas repetições, e tocar no ✓: a linha fica concluída na hora; a medalha aparece; a faixa "Novo recorde" diz "Maior peso"; vibra uma vez; o timer de descanso aparece sem ser coberto; é possível tocar no ✓ da próxima série durante a faixa; a faixa some sozinha em 5 segundos (CP1, CP17).
  4. Tocar na medalha: a folha mostra os tipos, os valores e "antes: … em <data>"; arrastar fecha; tocar em "Ver recordes do exercício" abre a tela do exercício (CP16).
  5. Marcar a série seguinte com carga ainda maior: a medalha de peso passa para ela e sai da anterior (CP8). Desmarcar a segunda: volta para a primeira (CP10).
  6. Editar a carga de uma série com medalha para baixo do recorde: a medalha some; subir de novo: volta (CP10). Trocar o tipo dela para "Série de aquecimento": some; voltar a "Série normal": volta (CP9, CP10).
  7. Registrar uma série com carga e repetições que deem 1RM acima do melhor (ex.: mais repetições com a mesma carga): conferir a medalha (com número se houver mais de um tipo) e o nome "Maior 1RM" na folha, com a legenda "estimado, sem RPE". Informar o RPE dessa série: o "Maior 1RM" não muda (CP3, CP5).
  7b. Marcar o ✓ de uma série pesada sem informar o RPE e ver o que ganha. Depois informar RPE 8 (ou menor) e conferir: se passou a superar o histórico, a faixa "Maior 1RM com RPE" aparece (substituindo a da própria série, se ainda na tela) e a folha diz "calculado com RPE 8"; informar RPE 9,5 em outra série leve e conferir que não ganha;
      alterar o RPE para um valor mais alto e apagá-lo: o tipo some, sem faixa; voltar ao RPE anterior: volta, sem segunda faixa; abrir "Recordes pessoais" e ver as duas linhas, "Maior 1RM" e "Maior 1RM com RPE", e que a coluna RPE nunca mostra o RPE 10 assumido (CP4, CP4b, CP4c, CP4d).
  8. Registrar um exercício novo (adicionar do catálogo) com 3 séries: sem medalha em nenhuma (CP7). Registrar de novo em outro dia: já pode ter.
  9. Em Ajustes → Recordes: desligar "Avisar ao bater um recorde" e repetir o passo 3 (medalha sem faixa nem vibração); desligar "Mostrar medalhas nas séries" (nada na tabela nem no histórico; o outro interruptor fica cinza); religar os dois (CP19).
  10. Ligar o VoiceOver: o foco na medalha lê "Recorde: maior peso. Abrir detalhes."; a faixa é anunciada. Repetir com tema escuro e texto grande: o campo KG continua visível (CP22).
  11. Ligar o modo avião e repetir o passo 3: igual (CP23).
  12. Concluir o treino e, na 25b, conferir "Você bateu N recordes neste treino." e a folha "Recordes do treino" (CP25).
  13. Depois do PBI 19: registrar um single com carga acima de todos os recordes do exercício: sem medalha; trocar o tipo para Normal pela folha de tipo: medalha e faixa; trocar de volta: some (CP11).
  - **Só no iPhone:** a sensação da vibração (curta, distinta da do fim do descanso), o conforto de tocar na medalha com uma mão entre séries e a legibilidade do dourado ao sol/em tela de brilho baixo.

## Riscos e perguntas abertas
- **Risco de ruído:** progressão rápida (primeiros meses) gera muitas medalhas e faixas. Mitigações: empate não conta, a melhor série do treino leva a medalha, faixa discreta e interruptores. Se ainda incomodar: avisar só um tipo por série (o mais importante).
- **Risco de leitura (divergência entre os dois 1RM):** o "Maior 1RM" (Epley) e o "Maior 1RM com RPE" (RTS) são números diferentes para a mesma série (117 kg × 123,3 kg no exemplo) e podem estar em séries diferentes na lista; uma série leve com RPE baixo ganha só o "com RPE". Mitigação: nomes e legendas que dizem se considera o RPE ("estimado, sem RPE" / "calculado com RPE 8"), as duas linhas lado a lado na lista e a folha explicando. Se confundir, a saída é juntar numa linha só, decisão posterior.
- **Risco de ruído com o RPE:** como o RPE chega depois do ✓, uma série pode ter duas faixas em poucos segundos (uma do ✓, outra do RPE). Mitigação: a faixa da mesma série é substituída por uma só, um tipo não é reavisado na mesma série no mesmo treino e apagar/alterar o RPE nunca avisa. A série "conforme o plano" sem RPE é avaliada como RPE 10 (conservador) e raramente ganha o "com RPE"; o recorde "aparece" quando o usuário informa o RPE, o que reforça o hábito, mas pode parecer que o recorde "demorou".
- **Risco de dependência de conta com o PBI 22:** a conta do "com RPE" é a do PBI 22 (RTS, RPE 10 assumido). Se o 22 mudar a regra (por exemplo, ampliar de 1–10 repetições), o recorde muda junto, por desenho; os dois ficam alinhados por uma função única. Os CPs do 22 e do 25 não se contradizem (o 22 usa só séries Normais nos gráficos; o 25, as séries elegíveis da tabela).
- **Risco de dependência:** o PBI 19 muda o que conta (back-off entra no principal, single→Normal vira possível) e ajusta o cálculo; como as medalhas são derivadas, nada precisa migrar, mas os CPs marcados "(depois do PBI 19)" só podem ser fechados depois dele.
- **Risco técnico de produto:** recalcular em cascata (CP15) e com histórico grande (CP24) precisa ser rápido; se o cálculo falhar, o registro de séries nunca pode ser bloqueado (regra do produto).
- **Risco de dados:** treinos importados com data errada ou duplicados podem criar ou apagar medalhas; a ordem é cronológica pela data do treino.
- **Risco de leitura (Epley acima de 10 repetições):** o "Maior 1RM" de Epley fica menos preciso com muitas repetições (15 repetições "estimam" um 1RM alto) e, diferente do "com RPE", não tem limite de repetições. Mantido como na lista de hoje; se incomodar, limitar a 10 repetições muda um valor que o usuário já vê.
- **Risco de desempenho:** a reavaliação a cada mudança de RPE roda sobre o histórico do exercício; precisa caber na mesma meta do ✓ (CP24).
- **Respondidas em 07/11/2026 (substituídas pela correção do usuário):** P1 (o que é "1RM" e "1 eRM") e P2 (Epley × RTS): o "Maior 1RM" é o estimado **sem** RPE (Epley) e o "Maior 1RM com RPE" é o estimado **com** RPE (tabela RTS, RPE 10 assumido sem RPE, como o PBI 22). Os dois existem; não há mais pergunta sobre fórmula.
- **P3 (não bloqueia):** a "série até a falha" (F) e o drop set (D) devem **contar** nos recordes (como hoje na tela do exercício)? Recomendação do PM: contam, porque a série foi completada; só a série marcada "falhou" (✗) fica de fora. Se preferir que só Normal e Back-off contem, é uma linha da tabela.
- **P4 (não bloqueia):** confirma que as séries **antigas** ganham a medalha retroativamente (sem aviso), em vez de começar do zero a partir desta versão?
- **P5 (não bloqueia, para uma fatia 25c):** quando um **single de ativação** supera o recorde do exercício, quer ver uma medalha **apagada** (cinza) nele, com a dica "seria recorde se fosse Normal", para lembrar de trocar o tipo? Hoje, sem isso, o usuário só descobre ao olhar a lista. É o item "Sugerir trocar um single para Normal" do backlog; nada mudaria sozinho.
- **P6 (não bloqueia; só os nomes):** como chamar os dois recordes de 1RM na tela? Recomendação do PM: **"Maior 1RM"** (sem RPE) e **"Maior 1RM com RPE"**, com a legenda "estimado, …" para deixar claro que nenhum é um 1RM medido. Alternativas: "1RM estimado" e "1RM estimado (RPE)"; ou os nomes do pedido, "1RM" e "1eRM". Pode ficar com a recomendação?

## Andamento
| Data | Nota |
|---|---|
| 07/11/2026 | PBI criado a partir do pedido do usuário (aviso + medalha dourada na série; maior peso, maior volume, maior 1RM, maior 1 eRM). Definidos os quatro tipos, a regra de quando há medalha (histórico anterior, estritamente maior, melhor série do treino, primeira vez sem medalha), derivada e retroativa; fatias 25a (medalha, faixa, detalhes, histórico, lista, interruptores) e 25b (resumo ao concluir). |
| 07/11/2026 | **Correção do usuário** sobre os recordes de 1RM, substituindo a definição anterior ("1RM = série de exatamente 1 repetição; 1 eRM = Epley"): **Maior 1RM** = 1RM estimado **sem** RPE (Epley, qualquer série); **Maior 1RM com RPE** (o "1 eRM") = 1RM estimado **com** RPE (tabela RTS, RPE 10 assumido sem RPE, igual ao PBI 22). Escopo ajustado: definições, nova seção "Recordes que dependem do RPE" (reavaliação ao informar/alterar/apagar o RPE, sem aviso duplicado, legenda "calculado com RPE 8" / "RPE não informado: calculado como RPE 10"), lista de recordes com as duas linhas, CP3 e CP4 reescritos e CP4b a CP4d novos, riscos e perguntas (P1 e P2 respondidas; P6 nomes). Não há tech-plan.md ainda. |
| 07/11/2026 | **Fatia 25a implementada** conforme o [tech-plan.md](tech-plan.md): livro de recordes derivado do histórico (`src/domain/records.ts`), medalha na tabela e no histórico, faixa com vibração, folha de detalhes, lista "Recordes pessoais" com as duas linhas de 1RM e interruptores em Ajustes → Recordes. CP11 e CP12 seguem pendentes do PBI 19; CP25 (25b) pendente do PBI 24. Verificação visual no simulador ainda parcial (ver Andamento do tech-plan). |
| 07/11/2026 | Revisão feita e bloqueador corrigido (faixa no primeiro ✓ de um treino). Verificado no simulador: faixa, medalha com número, folha de detalhes e legenda de RPE (CP1, CP3, CP4b, CP4d, CP5, CP16). Pendentes: histórico (CP14), lista tocável (CP18), Ajustes (CP19), 5 s e deslizar (CP17), VoiceOver (CP22), modo avião (CP23), desempenho (CP24) e, por dependência, CP11 e CP12 (PBI 19) e CP25 (PBI 24). |
