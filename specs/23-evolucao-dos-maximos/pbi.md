# 23 — Evolução dos máximos: gráfico, passado reconstruído e sugestão pelo e1RM · PBI

> **Produto: o quê e por quê.** Dono: `product-manager` (`/pm`). O como fica em [tech-plan.md](tech-plan.md),
> do `tech-planner` (`/planejar`).
> Continua a [spec 15](../15-exercicio-unico/spec.md) depois dos PBIs 19 a 22. Usa o histórico do [PBI 21](../21-historico-de-maximos/pbi.md).

**Status:** ⏳ a fazer
**Depende de:** [21 — Histórico de máximos](../21-historico-de-maximos/pbi.md) (os pontos do gráfico) e [22 — Análises por exercício](../22-analises-por-exercicio/pbi.md)
(o e1RM por exercício principal e o jeito de escolher até 3 linhas). Indiretamente, 19 e 20 (máximos com id e itens ligados a eles).
**Ordem interna (cada fatia entrega valor sozinha):** 23a gráfico de evolução → 23b passado (estimativa dos treinos e valores lançados à mão) → 23c sugestão pelo e1RM.

## Objetivo
O máximo é o número que manda no ciclo inteiro, mas o atleta não vê para onde ele vai: o PBI 21 guarda cada mudança, só que numa lista. Este PBI entrega três coisas
que o atleta pediu ("gostei disso") e que giram em torno da mesma pergunta — **"meu máximo está subindo?"**:
1. **Ver a evolução** de cada máximo num gráfico, ao longo do tempo.
2. **Ver o passado** que o histórico não tem (o histórico só começa na instalação do PBI 21): uma estimativa feita a partir dos treinos já registrados, claramente marcada como
   estimada, e a possibilidade de **lançar à mão** um valor que o atleta sabe que teve.
3. **Receber uma sugestão** de máximo novo quando os treinos mostram que ele já subiu, **sempre como sugestão que ele confirma** (o app nunca muda o plano sozinho).

Quem usa e quando: o atleta, **fora do treino** (fim de semana, fechando um bloco, planejando o próximo ciclo), na aba Análises e em Ajustes → Máximos. Não é uma tela para a academia.
Como saberemos que deu certo: ao abrir Análises → Máximos, o atleta vê as linhas de evolução dos três principais, consegue ligar a estimativa dos treinos e, quando o e1RM dos últimos
treinos passa do máximo, recebe um cartão com a sugestão e atualiza em 2 toques depois de ver o impacto.

## Escopo
- **Entra:**
  - **23a — Gráfico "Evolução dos máximos"** em Análises → Gráficos (novo chip "Máximos"): uma linha por máximo (degraus: o valor vale até a próxima mudança), até 3 linhas por vez com
    seletor, rótulo do valor atual na ponta, legenda.
  - **23b — Passado:** (i) camada **"e1RM dos treinos (estimado)"** no mesmo gráfico, desligada por padrão, calculada dos treinos já registrados (inclui os que vieram de importação); (ii) botão
    **"Lançar valor passado"** na folha do máximo, para o atleta registrar à mão um valor e uma data anteriores (entra no histórico, marcado "Lançado depois").
  - **23c — Sugestão pelo e1RM:** cartão de sugestão (em Análises → Máximos e em Ajustes → Máximos) quando o e1RM dos treinos recentes supera o máximo; aceitar mostra o impacto e usa o mesmo
    caminho de edição de máximo de sempre (histórico com origem "Sugestão do e1RM").
- **Não entra:**
  - Gravar no histórico os pontos **estimados** como se fossem máximos (a camada estimada é só desenho; ver P1).
  - Linha de meta por máximo (ex.: meta de dez/2027) no gráfico — vai para o backlog do PLANO.
  - Aviso da sugestão na aba Hoje ou notificação (ver P3).
  - Sugestão para **reduzir** um máximo (só sugere subir).
  - Edição ou exclusão de registros do histórico (continua valendo a regra do PBI 21).
  - Mudar a regra "Revisão de máximo" do treinador (continua como está; ver "Relação com a revisão do treinador").
  - Volume por grupo muscular, comparação com outros atletas, previsão de máximo futuro.

## Comportamento
### 23a — Análises → Gráficos → "Máximos"
- Novo chip **"Máximos"** na linha de gráficos de treino (junto de Carga, e1RM, Single, Planejado × feito). Título do cartão: "Evolução dos máximos"; subtítulo: "Valor do máximo ao longo do tempo (kg)".
- Cada máximo é uma linha em degraus (um ponto por registro do histórico; entre dois pontos o valor continua o mesmo; a última linha segue até hoje). Cor pela ordem fixa da paleta, legenda com o nome
  do máximo, valor atual como rótulo na ponta da linha. Um eixo só, em kg.
- **Até 3 linhas por vez** (a paleta tem 3 cores). Por padrão, os 3 máximos que mais mudaram nos últimos 6 meses; se houver mais de 3, o chip **"Máximos (3 de 5)"** abre uma folha de baixo para cima
  (fecha arrastando, sem botão Cancelar) com caixas de marcar; marcar um quarto mostra "Escolha até 3 máximos. Desmarque um para trocar." A escolha fica salva (separada da escolha de exercícios do PBI 22).
- Máximos de escalas muito diferentes (200 kg e 30 kg) dividem o mesmo eixo; é aceito (regra do projeto: um eixo só). Quem quiser comparar escolhe máximos parecidos.
- Estados: um máximo com um único registro aparece como ponto/linha reta com o texto no cartão "Ainda há um só valor para <nome>. A linha muda quando você mudar o máximo." Sem nenhum máximo:
  "Crie um máximo em Ajustes para acompanhar a evolução." Todo máximo tem pelo menos um registro (o "Valor inicial" ou o de criação), então nunca há máximo sem ponto.
- Atalho: na folha do máximo, a seção "Histórico" ganha o botão "Ver no gráfico" que abre Análises → Máximos já com aquele máximo marcado.
- Data: eixo horizontal em datas no formato "05 nov"; pontos do passado distante usam "05 nov, 2025".

### 23b — Passado
**(i) Camada "e1RM dos treinos (estimado)"**
- Chip "Estimativa dos treinos" (liga/desliga, desligado por padrão) abaixo do gráfico. Ligado, cada máximo selecionado ganha uma segunda linha **tracejada, na mesma cor**, com um ponto por sessão: o melhor e1RM
  (tabela RTS, o mesmo cálculo do gráfico de e1RM) das séries **principais** com RPE dos exercícios que o plano liga àquele máximo. A legenda ganha "tracejado = e1RM estimado dos treinos".
- Só entram séries de 1 a 10 repetições com RPE de 6 a 10 e que não tenham sido marcadas como falha (limites da tabela RTS).
- A camada cobre também o período **anterior** ao primeiro registro do histórico: é assim que o atleta "vê o passado" dos treinos já registrados, inclusive dos importados do Hevy.
- Um máximo sem série principal com RPE registrada não tem camada; o cartão diz "Sem séries principais com RPE para estimar <nome>."
- Nada da camada estimada é gravado no histórico nem altera cargas.

**(ii) Lançar valor passado** (folha do máximo → Histórico)
- Botão "Lançar valor passado" abre uma folha com "Data" (não pode ser futura) e "Valor (kg)" (maior que zero) e "Salvar". O registro entra no histórico com origem **"Lançado depois"** e a data escolhida, na ordem
  certa da lista. Mensagens: "A data não pode ser no futuro.", "Informe um valor maior que zero."
- Lançar um valor passado **não muda o máximo atual** nem recalcula cargas: é só memória. Se a data escolhida for posterior ao último registro, o app pergunta "Esta data é mais recente que o último registro.
  Isto vai mudar o máximo atual?" com "Só registrar no histórico" e "Mudar o máximo atual" (este segundo usa o fluxo normal de edição, com recálculo e histórico "Manual").
- Aparece no gráfico como degrau na data lançada.

### 23c — Sugestão pelo e1RM
- **Quando sugerir** (valores de produto, ajustáveis; ver P2): para um máximo, quando o e1RM calculado dos treinos principais com RPE (mesmo cálculo da camada estimada) é **pelo menos 2,5 kg maior que o máximo atual em
  2 sessões diferentes dentro das últimas 3 semanas**. O valor sugerido é o **menor** dos dois e1RM, arredondado **para baixo** em múltiplos de 2,5 kg (conservador).
- **Quando não sugerir:** (a) o máximo não tem séries principais com RPE nas últimas 3 semanas; (b) houve alerta de **dor ou sinal de alarme** nos check-ins dos últimos 7 dias (segurança da lombar manda mais que o número);
  (c) alguma das sessões usadas teve série marcada como falha no mesmo exercício; (d) há uma "Revisão de máximo" do treinador pendente para o mesmo máximo (para não mostrar dois números concorrentes); (e) o atleta dispensou
  a mesma sugestão (ver "Agora não").
- **Onde aparece:** (1) cartão acima do gráfico em Análises → Máximos; (2) selo "Sugestão: 245 kg" na linha do máximo em Ajustes → Máximos e um cartão na folha dele. Não aparece na aba Hoje nem como notificação.
- **O cartão:** título "Sugestão para Terra"; texto "Seu e1RM chegou a 247 kg em 2 treinos recentes (06 nov: 215 kg × 3 em RPE 8; 30 out: 210 kg × 4 em RPE 8). Máximo atual: 240 kg. Sugestão: 245 kg." Botões:
  **"Atualizar para 245 kg"**, **"Ajustar valor"** (abre a folha normal de edição do máximo com o valor sugerido preenchido) e **"Agora não"**.
- **Antes de aplicar:** "Atualizar para 245 kg" abre a confirmação "Isso recalcula as cargas por % de 31 itens da periodização ativa. Treinos já registrados não mudam." com "Confirmar" e "Voltar" (alvo de 56 pt); só depois de
  Confirmar o máximo muda. O registro no histórico leva a origem **"Sugestão do e1RM"**. Nada muda ao tocar fora, fechar a folha ou ignorar o cartão.
- **"Agora não":** esconde essa sugestão. Ela só volta se o valor sugerido subir pelo menos 2,5 kg além do que foi dispensado.
- **Relação com a revisão do treinador:** a "Revisão de máximo" do plano atual (compara RPE com o alvo numa semana definida) continua existindo como alerta do treinador, sem mudanças. A sugestão pelo e1RM vale para **qualquer**
  máximo e não depende de regras do ciclo; as duas não aparecem juntas para o mesmo máximo (regra (d)).
- Offline: tudo local.

Regras do produto que valem aqui: nada altera o plano ou os máximos sem o atleta confirmar; um caminho único de edição de máximo (o mesmo da tela, do Claude e das regras); gráfico com um eixo, cor pela entidade, legenda com 2+ linhas,
rótulo direto e referência tracejada neutra (aqui, o tracejado é a estimativa na cor do máximo); textos em pt-BR com vírgula decimal e datas "05 nov".

## Decisões
- **Um PBI só, com três fatias na ordem 23a → 23b → 23c.** Motivo: as três usam o mesmo cálculo (e1RM por máximo), a mesma tela (Análises → Máximos) e respondem à mesma pergunta do atleta. Se o planejador achar a 23c grande (ela altera
  o plano), pode virar o PBI 24 sem mudar o texto, porque as fatias são independentes depois da 23a. Alternativa descartada: três PBIs desde já (burocracia sem ganho de entrega).
- **Gráfico no Análises, com atalho a partir da folha do máximo.** Motivo: Análises é onde ficam os outros gráficos, e a folha do máximo continua leve (lista). Alternativa descartada: gráfico dentro da folha (pouco espaço, sem comparar máximos).
- **Degraus, não linha inclinada.** Motivo: o máximo é um valor que vale até mudar; a linha inclinada inventaria valores intermediários.
- **Até 3 linhas** (como na decisão do PBI 22: 3 linhas bastam, resposta do atleta em 06/11/2026).
- **O passado vem de duas fontes honestas:** estimativa derivada dos treinos (não gravada, tracejada) e valores que o atleta lança à mão (gravados, origem "Lançado depois"). Motivo: o e1RM não é o máximo de treino do atleta; gravá-lo no
  histórico o contaminaria. Alternativa descartada: reconstruir e gravar pontos "Estimado" no histórico (ver P1).
- **Origens novas do histórico: "Sugestão do e1RM" e "Lançado depois"** (somam-se às cinco do PBI 21). Motivo: o atleta precisa distinguir de onde veio cada número.
- **Sugestão só para subir, conservadora e com confirmação em duas etapas** (cartão e confirmação do impacto). Motivo: histórico de protrusão lombar; um máximo alto demais recalcula todas as cargas por %.
- **Sem alertas da sugestão na aba Hoje.** Motivo: a aba Hoje é para o treino, com uma mão; evitar ruído (ver P3).
- **Os números da sugestão (2,5 kg, 2 sessões, 3 semanas, arredondar para baixo) são padrões do produto**, listados para o atleta revisar (P2). Quando a spec 18 chegar, podem virar parâmetros configuráveis.
- Respostas do usuário (06/11/2026): quer o gráfico de evolução dos máximos, o histórico retroativo e a sugestão de máximo pelo e1RM ("gostei disso"); as três coisas vieram do corte de escopo dos PBIs 19 a 22.

## Critérios de pronto
**23a — Gráfico**
- **CP1 — Chip e gráfico.** Em Análises → Gráficos existe o chip "Máximos"; ele mostra "Evolução dos máximos" com uma linha em degraus por máximo selecionado, legenda com o nome do máximo e o valor atual como rótulo na ponta.
- **CP2 — Pontos.** Mudar um máximo (por exemplo, supino de 170 para 175 em Ajustes) faz o gráfico ganhar um degrau na data da mudança; salvar o mesmo valor não cria degrau.
- **CP3 — Até 3 linhas.** Com 5 máximos, aparecem 3; o chip "Máximos (3 de 5)" abre a folha, marcar um quarto mostra a mensagem e não marca; a escolha é lembrada ao sair e voltar e ao reabrir o app.
- **CP4 — Estados.** Máximo com um registro mostra a mensagem "Ainda há um só valor…"; sem máximos mostra "Crie um máximo em Ajustes…"; nada quebra com 0, 1 ou muitos registros.
- **CP5 — Atalho.** "Ver no gráfico" na folha do máximo abre Análises → Máximos com aquele máximo marcado.
- **CP6 — Plano atual intacto.** Nada mudou nos outros gráficos nem nas cargas (o teste dourado do PBI 19 continua verde).

**23b — Passado**
- **CP7 — Camada estimada.** Com "Estimativa dos treinos" ligada, cada máximo selecionado ganha uma linha tracejada na mesma cor, com um ponto por sessão; os valores batem com os do gráfico de e1RM do mesmo exercício e dia (teste automático).
- **CP8 — Antes do histórico.** Com treinos registrados antes da data do "Valor inicial", a camada estimada mostra pontos anteriores a essa data.
- **CP9 — Filtros do cálculo.** Séries sem RPE, com mais de 10 repetições, com RPE fora de 6–10, ou marcadas como falha não entram na estimativa (teste).
- **CP10 — Sem dados.** Máximo sem série principal com RPE mostra "Sem séries principais com RPE para estimar <nome>." e não gera erro; nada da camada vai para o histórico.
- **CP11 — Lançar valor passado.** "Lançar valor passado" salva um registro "Lançado depois" na data escolhida, na posição cronológica correta da lista, sem mudar o máximo atual nem as cargas; data futura e valor zero são recusados com a mensagem.
- **CP12 — Data mais recente.** Lançar uma data posterior ao último registro mostra a pergunta com as duas opções; "Só registrar no histórico" não muda o máximo atual; "Mudar o máximo atual" segue o fluxo normal (recálculo, registro "Manual").
- **CP13 — Backup.** Registros "Lançado depois" sobrevivem a exportar e restaurar o backup.

**23c — Sugestão**
- **CP14 — Condição de sugestão.** Com dados de teste de 2 sessões nas últimas 3 semanas em que o e1RM supera o máximo atual em 2,5 kg ou mais, o cartão aparece com o valor igual ao menor e1RM arredondado para baixo em múltiplos de 2,5 kg; com 1 sessão só, ou com
  diferença menor que 2,5 kg, não aparece (teste automático dos limites).
- **CP15 — Condições que bloqueiam.** Com alerta de dor ou sinal de alarme nos últimos 7 dias, com série falha nas sessões usadas, com "Revisão de máximo" pendente do mesmo máximo, ou sem séries com RPE nas últimas 3 semanas, a sugestão não aparece.
- **CP16 — Aceitar com impacto.** "Atualizar para 245 kg" mostra a contagem de itens que serão recalculados e só muda o máximo depois de "Confirmar"; "Voltar" ou fechar a folha não muda nada; depois de confirmar, as cargas por % mudam, as séries já registradas não, e o histórico ganha um registro "Sugestão do e1RM".
- **CP17 — Ajustar valor.** "Ajustar valor" abre a folha de edição do máximo com o valor sugerido preenchido; salvar grava com origem "Manual".
- **CP18 — Agora não.** Depois de "Agora não" o cartão some e só volta se o valor sugerido subir 2,5 kg ou mais acima do dispensado.
- **CP19 — Só subir e só confirmado.** Nunca aparece sugestão de reduzir; nenhuma carga ou máximo muda sem o atleta tocar em "Confirmar".
- **CP20 — Máximos novos.** Um máximo criado pelo atleta (ex.: "Barra fixa lastrada") recebe sugestão pelas mesmas regras, sem depender de regras do ciclo (ciclo sem regras funciona).

**Gerais**
- **CP21 — Acessibilidade e formato.** Botões com alvo de 56 pt e rótulo de acessibilidade; textos com Dynamic Type; números e datas formatados em pt-BR (vírgula decimal, "05 nov").
- **CP22 — Sem regressão.** `npm test`, `npm run test:import`, `npm run typecheck` e `npx expo lint` passam.

## Verificação
- **Na nuvem / testes automáticos:** montagem dos degraus a partir do histórico, escolha dos 3 máximos, e1RM por máximo (filtros, igualdade com o gráfico de e1RM), regras e limites da sugestão (2,5 kg, 2 sessões, 3 semanas, arredondar para baixo, bloqueios por
  dor/alarme/falha/revisão), lançamento de valor passado sem mudar o máximo atual, backup (CP2, CP3, CP7, CP9 a CP15, CP18 a CP20, CP22).
- **Prévia web:** conferir o chip e o gráfico com os dados do ambiente de teste, a camada tracejada, as folhas de seleção e de lançamento e o cartão de sugestão (CP1, CP3, CP4, CP7, CP11, CP14, CP16).
- **No simulador / iPhone (roteiro):**
  1. Instalar sobre os PBIs 19 a 22 com dados reais. Análises → Gráficos → "Máximos": linhas dos máximos com o degrau do "Valor inicial" (CP1, CP4).
  2. Em Ajustes → Máximos, mudar o supino para 175 e voltar à aba: novo degrau; salvar o mesmo valor: sem degrau novo (CP2).
  3. Ligar "Estimativa dos treinos": linha tracejada por máximo; conferir que aparece antes da data do "Valor inicial" se houver treinos antigos ou importados do Hevy; conferir um ponto contra o gráfico de e1RM (CP7, CP8).
  4. Folha do supino → Histórico → "Lançar valor passado": data de um mês atrás, 160 kg; conferir que o máximo atual não mudou, que o degrau aparece no gráfico e que a lista fica em ordem; tentar data futura e valor 0 (CP11). Repetir com data
     posterior ao último registro e escolher as duas opções (CP12).
  5. Registrar (ou usar dados de teste) duas sessões do terra com e1RM ≥ máximo + 2,5 kg nas últimas 3 semanas, com RPE: o cartão de sugestão aparece em Análises → Máximos e em Ajustes → Máximos (CP14). Tocar "Atualizar…", ver a contagem de itens,
     "Voltar" (nada muda), depois "Confirmar" (cargas mudam, histórico "Sugestão do e1RM") (CP16).
  6. Gerar nova sugestão e tocar "Agora não": some e não volta no mesmo valor (CP18). Fazer um check-in com dor pior que o anterior: a sugestão desaparece (CP15).
  7. Criar "Barra fixa lastrada", registrar séries principais com RPE e conferir sugestão e estimativa (CP20).
  8. Exportar e restaurar o backup completo e conferir o histórico com "Lançado depois" (CP13).
  - **Só no iPhone:** leitura do gráfico com texto grande e toque dos botões com uma mão (CP21); a sensação de velocidade ao abrir o gráfico com meses de treinos reais.

## Riscos e perguntas abertas
- **Risco de produto:** o e1RM (tabela RTS com RPE) é uma estimativa e não o máximo de treino do atleta; a camada tracejada e o texto "estimado" existem para não confundir. Se as estimativas forem muito diferentes dos máximos
  que o atleta usa, o gráfico pode parecer "errado"; o atleta deve ler como tendência, não como valor.
- **Risco:** só há estimativa para treinos que tiveram RPE registrado (a regra do projeto é não inventar RPE); o passado sem RPE fica em branco. Os treinos importados do Hevy só entram se trouxerem RPE.
- **Risco de segurança:** sugestão de subir máximo no terra/agachamento pode estimular excesso. Mitigações: sugestão só com 2 sessões, arredonda para baixo, bloqueia com dor/alarme/falha, confirmação em duas etapas com o impacto.
- **Risco de UX:** máximos de escalas muito diferentes no mesmo eixo (200 kg × 30 kg) achatam uma das linhas; aceito por ora.
- **P1 (não bloqueia):** quer poder transformar um ponto estimado em registro do histórico? **Recomendação: não.** Quem sabe o valor real digita em "Lançar valor passado"; o histórico fica só com o que o atleta afirmou ou confirmou.
- **P2 (não bloqueia):** os números da sugestão — subir pelo menos 2,5 kg em 2 sessões nas últimas 3 semanas, arredondando para baixo — estão certos para você? **Recomendação:** começar conservador assim e relaxar se quase nunca aparecer.
- **P3 (não bloqueia):** quer a sugestão também como aviso na aba Hoje (como os alertas do treinador)? **Recomendação: não** por enquanto.

## Andamento
| Data | Nota |
|---|---|
| 06/11/2026 | PBI criado: o atleta quis o gráfico de evolução, o histórico retroativo e a sugestão pelo e1RM, que estavam no backlog dos PBIs 21 e 22. |
