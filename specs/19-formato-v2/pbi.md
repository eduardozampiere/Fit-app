# 19 — Formato v2 do ciclo: base para "todo exercício é igual" (sem mudar nada que você vê) · PBI

> **Produto: o quê e por quê.** Dono: `product-manager` (`/pm`). O como fica em [tech-plan.md](tech-plan.md),
> do `tech-planner` (`/planejar`).
> Parte 1 de 4 da [spec 15](../15-exercicio-unico/spec.md), que continua valendo como registro das decisões. Ordem:
> **19** → [20 Máximos próprios](../20-maximos-proprios/pbi.md) → [21 Histórico de máximos](../21-historico-de-maximos/pbi.md)
> e [22 Análises por exercício](../22-analises-por-exercicio/pbi.md).

**Status:** ⏳ a fazer
**Depende de:** — (é a primeira da série). Bloqueia 20, 21, 22 e, por consequência, as specs 16 e 18.

## Objetivo
Hoje o app trata agacho, supino e terra como "levantamentos" fixos, e só eles têm máximo, carga em % e gráfico. Para que
**qualquer exercício** possa ter isso (PBIs 20 a 22), o jeito como o plano é guardado precisa mudar: máximos com nome e id
próprios, cada item dizendo em qual máximo se baseia, single ligado ao seu principal. Este PBI faz **só essa troca de base** e
entrega uma coisa: o app continua **exatamente igual** para o plano atual, e os dados do atleta (treinos, séries, RPE, check-ins,
máximos ajustados, ordem dos exercícios) passam pela atualização **sem perda**, com uma cópia de segurança antes.

Quem usa: o atleta, durante o treino, com uma mão, entre séries. Para ele, o sucesso é **não perceber nada**: abrir o app depois da
atualização e achar o mesmo Hoje, o mesmo Plano, as mesmas cargas, os mesmos alertas e as mesmas Análises. Por que um PBI sozinho:
é a etapa de maior risco (uma atualização de dados que não tem volta) e de menor valor visível; isolada, pode ser conferida no
banco real antes de qualquer tela nova existir.

## Escopo
- **Entra:**
  - Atualização automática do plano (e de todas as periodizações guardadas no aparelho) para o formato `fitapp.cycle/v2`, na
    primeira abertura depois da instalação.
  - **Cópia de segurança automática** antes da atualização, com aviso único e atalho para compartilhar o arquivo.
  - Teste "dourado" do plano atual (alertas, cargas do dia, séries das Análises, e1RM) escrito **antes** de mexer em qualquer regra e
    que tem de passar idêntico ao final.
  - Máximos passam a ter **id estável e nome** (`squat` "Agacho", `bench` "Supino", `deadlift` "Terra" — os mesmos rótulos de hoje,
    ids iguais aos de hoje). Cada item do treino passa a apontar **o máximo em que se baseia** (ou nenhum = carga fixa em kg).
  - **Single de ativação / back-off / duplas ligados ao principal pelo próprio item** (e não mais "pelo movimento"): na tela Hoje a linha "S"
    continua dentro do principal certo.
  - **Regras do treinador por máximo**: os parâmetros que hoje são "do agacho / supino / terra" passam a ser "do máximo `squat` /
    `bench` / `deadlift`", com o comportamento idêntico. As regras passam a poder ser **opcionais** por periodização.
  - O Claude continua funcionando: ciclos `fitapp.cycle/v1` (importação e JSON do Claude) são lidos e convertidos; ajustes
    `fitapp.adjustments/v1` com `lift` (`set_load`, `set_max`, `skip_activation`) continuam aceitos; `set_max` também aceita o id do máximo.
  - Backups `fitapp.backup/v1` feitos antes da atualização continuam restauráveis (são convertidos ao restaurar).
  - Documentação dos formatos para o Claude (`docs/formato-ciclo.md`, `docs/claude-treinador.md`) em v2.
- **Não entra** (vai para os PBIs seguintes ou para o backlog):
  - Qualquer tela nova, botão novo ou texto novo na interface, exceto o aviso da cópia de segurança (PBI 20 traz a gestão de máximos).
  - Criar, renomear ou apagar máximos; "Carga baseada em" no editor do item; fim da pergunta "qual movimento?" (PBI 20).
  - Histórico de máximos (PBI 21).
  - Gráficos por exercício principal (PBI 22). Aqui as Análises continuam como estão.
  - Tela para criar ou editar regras (spec 18). Aqui só a chave das regras muda de "levantamento" para "máximo".
  - Criar periodização em branco (spec 16). Aqui só garantimos que um ciclo **sem regras** abre sem erro.

## Comportamento
**Primeira abertura depois de instalar a versão com este PBI**
- Caminho feliz: o app abre normalmente na aba Hoje. Antes disso, em até alguns segundos, grava a cópia de segurança e atualiza o
  formato. Aparece **uma vez** um aviso:
  - Título: "Dados atualizados".
  - Texto: "Seu plano e seus treinos continuam iguais. Antes de atualizar, o app salvou uma cópia de segurança dos seus dados."
  - Botões: "Compartilhar cópia" (abre a folha de compartilhar do iOS com o arquivo JSON, para salvar em Arquivos/AirDrop) e "Ok".
  - O aviso não volta nas aberturas seguintes. A cópia fica guardada no aparelho (nome: `backup-antes-da-atualizacao-AAAA-MM-DD.json`)
    e também pode ser compartilhada depois pela tela Dados.
- Erro: se não for possível gravar a cópia (por exemplo, sem espaço), **a atualização não acontece** e os dados antigos ficam intactos.
  Aparece uma tela com "Não foi possível atualizar os dados" / "Seus treinos não foram alterados. Libere espaço no iPhone e tente de
  novo." e o botão "Tentar de novo".
- Abrir o app uma segunda vez (ou várias) não muda nada: a atualização é feita uma única vez por dado.
- Offline: tudo é local; não há diferença com ou sem internet.

**O que o atleta vê depois (tudo igual a antes)**
- Hoje: mesmos treinos, mesmas cargas por série, mesma ordem dos exercícios (inclusive a ordem que ele mudou arrastando), single de ativação
  dentro do principal, pegada do terra, estados de cada dia.
- Plano: mesmos itens, mesmas faixas, mesmas cargas; editar um item continua funcionando.
- Alertas do treinador: os mesmos, nos mesmos dias, com o mesmo texto (portão liberado/fechado, freio, fadiga do single, revisão de máximo,
  4ª série e falha do terra, pegada, deload).
- Análises: os mesmos números e linhas (carga dos principais, e1RM, termômetro do single, planejado × feito).
- Ajustes: "Máximos de referência" mostra os mesmos três valores, inclusive os que o atleta já havia alterado, e "Voltar aos máximos do
  plano" continua funcionando.
- Dados: o pacote para o Claude, a exportação CSV/JSON e o backup completo funcionam como antes.

**Ciclo sem regras (para a spec 16 e para o Claude)**
- Um ciclo v2 com as regras do treinador ausentes abre sem erro em Hoje, Plano e Análises. Não gera nenhum alerta de portão, freio,
  fadiga do single, revisão de máximo, 4ª série, falha do terra nem pegada. O arredondamento de cargas usa o padrão do app (2,5 kg).
- **Recomendação a confirmar (P1):** os alertas de **dor e sinais de alarme** dos check-ins seguem ativos com limites padrão mesmo sem
  regras, por causa do histórico lombar do atleta.

**Claude / importação**
- Importar um ciclo `fitapp.cycle/v1` (como o gerado pela planilha ou por um Claude antigo): é convertido e entra como hoje.
- Importar um ciclo `fitapp.cycle/v2`: entra com os máximos nomeados que vierem nele.
- Aplicar uma resposta do Claude com `set_max` em `lift: "squat"` (antigo) ou em `maxId: "squat"` (novo): ambos mudam o mesmo máximo, com a
  mesma confirmação de hoje.
- O pacote para o Claude passa a listar cada máximo com **id e nome** (hoje "squat/bench/deadlift"), para o Claude poder pedir ajustes
  por id.

## Decisões
- **Fatiar a spec 15 em quatro PBIs e começar por uma base invisível.** Motivo: a migração de dados não tem volta e o app é usado cinco
  vezes por semana; é melhor entregar a base sozinha, conferir no banco real, e só então construir telas em cima. Alternativa descartada: um
  PBI único com tudo (dezenas de critérios, uma verificação só no final, difícil de testar e de reverter).
- **Os ids dos três máximos atuais continuam `squat`, `bench` e `deadlift`** (decisão 1 da spec 15). Motivo: ajustes antigos do Claude, relatórios e
  o histórico seguem válidos sem tradução.
- **Os nomes iniciais são os rótulos de hoje** ("Agacho", "Supino", "Terra"). O atleta pode renomear no PBI 20. Alternativa descartada: trocar
  para "Agachamento" agora (mudaria texto na interface sem ninguém pedir).
- **Single ligado ao principal pelo próprio item** (decisão 5): na conversão, cada single/back-off/duplas aponta para o principal seguinte da
  mesma sessão e do mesmo movimento — exatamente o que a regra "pelo movimento" faz hoje. Alternativa descartada: manter o pareamento por
  movimento (impede o single de um exercício que não é um dos três).
- **Regras por máximo, plano atual idêntico** (decisão 7). Alternativa descartada: reescrever as regras agora para "generalizar tudo"; o
  usuário aceitou separar na spec 18.
- **Cópia de segurança obrigatória antes de atualizar**: sem cópia, sem atualização. Motivo: protege treinos e RPE reais. Alternativa
  descartada: só avisar e deixar o atleta exportar à mão (ele esquece).
- **A cópia fica no aparelho e é oferecida para compartilhar**, porque a instalação com Apple ID gratuito é refeita toda semana e desinstalar
  o app apaga o que está dentro dele.
- **Formato v1 nunca deixa de ser lido** (importação, JSON do Claude, backup): decisão 8 da spec 15.
- Respostas do usuário (entrevista de 06/11/2026): lista de máximos separada dos exercícios; histórico do usuário; apagar máximo em uso é
  bloqueado; regras só trocam a chave nesta etapa; formato v2 com conversão do v1.

## Critérios de pronto
- **CP1 — Rede de segurança.** Existe um teste automático do plano atual (`assets/plan/ciclo_out26_jan27.json`) que registra alertas por regra,
  cargas de cada dia, séries das Análises e e1RM, escrito e verde **antes** da mudança, e que passa idêntico no final.
- **CP2 — Conversão do plano atual.** Depois da atualização, o plano atual em v2 tem os mesmos itens, ids, ordem, séries e cargas de antes; os
  três máximos têm ids `squat`, `bench`, `deadlift` e nomes "Agacho", "Supino", "Terra"; os 21 exercícios continuam existindo com o mesmo nome.
- **CP3 — Dados preservados.** Número de treinos, séries registradas (com carga, reps, RPE, tipo de série), check-ins, pesos, refeições e
  ajustes (descanso, ordem, máximos alterados, timer) é o mesmo antes e depois; nenhum registro perde o vínculo com seu item.
- **CP4 — Máximos alterados preservados.** Se o atleta tinha mudado um máximo (valor atual diferente do do plano), o valor atual e o do plano
  continuam distintos e "Voltar aos máximos do plano" volta ao do plano.
- **CP5 — Cópia de segurança.** Na primeira abertura depois da atualização, o arquivo de cópia existe e abre em "Compartilhar cópia"; o aviso
  "Dados atualizados" aparece uma única vez; restaurar essa cópia (Dados, importar backup) devolve exatamente os dados de antes.
- **CP6 — Falha segura.** Se a cópia não puder ser gravada, a atualização não roda, os dados antigos ficam intactos e aparece a tela com
  "Tentar de novo".
- **CP7 — Idempotência.** Abrir o app duas ou mais vezes depois da atualização não altera nenhum dado nem repete o aviso; converter duas vezes
  o mesmo ciclo dá o mesmo resultado (teste).
- **CP8 — Telas idênticas.** Hoje, Plano, Análises, Ajustes e Dados mostram os mesmos números e textos de antes (conferência lado a lado
  antes × depois, roteiro abaixo).
- **CP9 — Single no lugar.** Na tela Hoje, a linha "S" do single de ativação aparece dentro do mesmo principal de antes, nas três famílias; a
  ordem arrastada pelo atleta é mantida.
- **CP10 — Regras iguais.** Os alertas do treinador do plano atual (portões, freio, fadiga do single, revisão de máximo, 4ª série e falha do
  terra, pegada, deload) são os mesmos de antes para o histórico real do atleta.
- **CP11 — Ciclo sem regras.** Um ciclo v2 sem regras abre sem erro em Hoje, Plano e Análises, sem alertas do treinador, com arredondamento de
  2,5 kg (teste e importação manual de um arquivo de exemplo).
- **CP12 — Claude e importação.** Importar um ciclo v1 e um v2 funciona; `set_max` com `lift` antigo e com `maxId` aplicam a mesma mudança;
  o pacote para o Claude lista id e nome de cada máximo; `docs/formato-ciclo.md` e `docs/claude-treinador.md` descrevem o v2 e dizem que o
  v1 continua aceito.
- **CP13 — Backup antigo.** Um backup `fitapp.backup/v1` feito antes da atualização é restaurado e o app abre normalmente com o plano convertido.
- **CP14 — Sem regressão.** `npm test`, `npm run test:import`, `npm run typecheck` e `npx expo lint` passam; o importador da planilha passa
  a gerar v2.

## Verificação
- **Na nuvem / testes automáticos:** CP1, CP2, CP7, CP10, CP11, CP12 (parte de formato) e CP14 por teste; conversão testada com o plano atual e
  com ciclos v1 de exemplo (com e sem singles, com máximo alterado).
- **Prévia web:** abrir a prévia com um banco criado pela versão anterior (se a prévia mantiver o armazenamento entre versões) e conferir
  Hoje, Plano e Análises.
- **No simulador do Mac, com o banco atual (migração real) — roteiro:**
  1. Instalar a **versão anterior** (commit antes deste PBI). Registrar 3 séries de um treino, alterar um máximo em Ajustes (ex.: supino +5 kg),
     mudar a ordem de um exercício arrastando. Anotar: cargas do dia, alertas da aba Hoje, números das quatro Análises, valores dos máximos.
  2. Instalar a **versão nova** por cima, sem apagar o app. Abrir. Deve aparecer "Dados atualizados" uma vez. Tocar "Compartilhar cópia" e
     conferir que o arquivo é gerado. Tocar "Ok".
  3. Repetir as anotações do passo 1 e comparar: tudo igual (CP3, CP4, CP8, CP9, CP10).
  4. Fechar e abrir o app de novo: sem aviso, sem mudanças (CP7).
  5. Em Dados, restaurar a cópia do passo 2 e conferir que os dados voltam ao de antes (CP5). Restaurar também um backup JSON gerado pela versão
     anterior (CP13).
  6. Importar o arquivo de exemplo de ciclo v2 sem regras e abrir Hoje, Plano e Análises (CP11). Colar no campo do Claude um ajuste antigo
     (`set_max` com `lift`) e um novo (`maxId`) e aplicar (CP12).
  7. Simular falha da cópia (por exemplo, preenchendo o armazenamento do simulador ou usando o modo de teste que o plano técnico definir) e
     conferir a tela com "Tentar de novo" (CP6).
- **No iPhone:** repetir os passos 2 a 4 depois da instalação normal por cima da versão anterior (`npm run iphone`); o que só o iPhone mostra é
  o compartilhamento da cópia para Arquivos/AirDrop e a velocidade da atualização com os dados reais.

## Riscos e perguntas abertas
- **Risco (alto):** é uma atualização de dados sem volta. Mitigações: cópia obrigatória, teste dourado, idempotência, verificação com banco real
  no simulador antes do iPhone.
- **Risco (baixo):** no plano embutido há um principal por movimento (Agachamento High Bar, Supino competição/pausa, Terra convencional/hook; o
  "Terra (convencional)" é variação). Se o plano do aparelho tiver sido editado e houver mais de um principal por movimento, isso só afeta o PBI 22;
  o teste dourado deve registrar quais exercícios são principais.
- **Risco:** itens órfãos (single sem principal na sessão). A conversão deve deixá-los sem principal em vez de falhar; o plano atual não deve
  ter nenhum (conferir no teste).
- **P1 (não bloqueia este PBI, bloqueia a spec 16/18):** num ciclo sem regras, os alertas de dor e sinais de alarme seguem ativos com limites
  padrão? **Recomendação: sim**, a segurança da lombar não deve ser opcional. A decisão 7 da spec 15 diz "sem alertas do treinador"; só você diz
  se isso inclui a dor.
- **P2:** a cópia automática deve ser apagada sozinha depois de um tempo? Recomendação: não, é um arquivo pequeno; fica até você apagar.

## Andamento
| Data | Nota |
|---|---|
| 06/11/2026 | PBI criado a partir da fatia "base" da spec 15 (itens 15a, 15b, 15d e a conversão de dados do 15g). |
