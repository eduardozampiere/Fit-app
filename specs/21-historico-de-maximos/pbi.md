# 21 — Histórico de máximos: toda mudança fica registrada · PBI

> **Produto: o quê e por quê.** Dono: `product-manager` (`/pm`). O como fica em [tech-plan.md](tech-plan.md),
> do `tech-planner` (`/planejar`).
> Parte 3 de 4 da [spec 15](../15-exercicio-unico/spec.md). Antes: [20 Máximos próprios](../20-maximos-proprios/pbi.md).

**Status:** ⏳ a fazer
**Depende de:** [20 — Máximos próprios](../20-maximos-proprios/pbi.md) (e, por consequência, da [19](../19-formato-v2/pbi.md)).
Bloqueia a spec 16 (periodização nova começa do último valor do histórico).

## Objetivo
O máximo do atleta é o dado mais importante do powerlifting e hoje **não deixa rastro**: ao mudar o supino de 170 para 175, o 170 some. Não dá para ver
a evolução, nem para uma periodização nova começar do ponto em que o atleta realmente está. Este PBI grava **toda mudança de máximo** (quando, quanto, por
quê veio e em qual periodização) e mostra essa lista na própria tela do máximo. Ele vem logo depois do PBI 20 porque **o histórico só acumula daqui para a frente**:
cada semana de atraso é um dado perdido para sempre. A tela de gráfico da evolução fica para depois (backlog) e usa estes dados.

Uso: o atleta olha o histórico de vez em quando (ao planejar um ciclo novo, ao conferir "quando eu subi o terra para 240?"); o registro em si é automático, sem
ação dele.

## Escopo
- **Entra:**
  - Registro automático de **toda mudança de valor** de um máximo: edição manual, "Voltar ao valor do plano", criação de máximo, ajuste aceito do Claude
    (`set_max`), revisão de máximo sugerida pelo treinador e aceita, importação de ciclo/planilha com máximos, e (quando existir, spec 16) criação de periodização nova.
  - Cada registro tem: máximo (id e nome), valor em kg, data e hora, origem (importado, manual, Claude, regra do treinador, nova periodização) e periodização.
  - Seção **"Histórico"** na folha de edição do máximo (Ajustes → Máximos), com a lista dos registros, do mais novo para o mais antigo.
  - Registro inicial dos máximos que já existem na hora da instalação ("Valor inicial").
  - O histórico entra no backup completo e é restaurado com ele.
  - Disponibilizar para o resto do app "o último valor de cada máximo" (usado pela spec 16 ao criar periodização nova).
- **Não entra:**
  - Gráfico de "Evolução dos máximos" (o atleta quer; vai para o [PBI 23](../23-evolucao-dos-maximos/pbi.md), que usa este histórico).
  - Reconstruir o passado a partir dos treinos e sugerir máximo pelo e1RM (também no PBI 23). O PBI 23 acrescenta duas origens ("Sugestão do e1RM" e "Lançado depois", para valores passados lançados à mão); por isso
    a lista de origens deste PBI não pode ser fechada de um jeito que impeça novos valores.
  - Editar ou apagar registros do histórico à mão.
  - Registrar mudança de **nome** (só mudança de valor).
  - Sugerir máximo a partir de e1RM.

## Comportamento
**Registro (automático)**
- Sempre que o valor atual de um máximo muda por qualquer caminho, o app grava um registro. Mudar o valor para o mesmo valor que já tem **não** grava.
- Origem gravada: "Manual" (digitou em Ajustes, criou o máximo ou tocou em "Voltar ao valor do plano"), "Claude" (aceitou um ajuste `set_max`), "Regra do treinador"
  (aceitou a sugestão de revisão de máximo), "Importado" (importou um ciclo, planilha ou backup com máximos que mudaram o valor), "Nova periodização" (spec 16).
- Apagar um máximo **não apaga o histórico dele**; os registros ficam guardados (a folha do máximo apagado não existe mais, mas a evolução futura poderá usá-los).
- Renomear não grava registro; os registros mostram sempre o nome atual.

**Ajustes → Máximos → (tocar num máximo) → "Histórico"**
- Lista de registros, cada linha com: data ("05 nov", ou "05 nov, 2025" se for de outro ano), valor ("175 kg"), variação em relação ao registro anterior daquele máximo
  ("+5 kg", "−2,5 kg"; vazia no primeiro) e origem ("Manual", "Claude", "Regra do treinador", "Importado", "Nova periodização").
- O primeiro registro de cada máximo que já existia na instalação mostra a origem **"Valor inicial"** e a data da instalação desta versão. Isso **não** é a data em que o atleta
  conquistou aquele máximo; o texto abaixo da lista explica: "Os registros começam em 05 nov. Mudanças anteriores não foram guardadas."
- Estado vazio (máximo recém-criado ainda sem mudança além da criação): mostra o próprio registro de criação ("Manual · 30 kg"). Não existe máximo sem pelo menos um registro.
- A lista rola; sem paginação. Sem gráfico.

**Instalação**
- Na primeira abertura depois de instalar esta versão, o app grava um "Valor inicial" por máximo da periodização ativa (com o valor **atual**, não o do plano). Sem aviso, sem tela.
  Periodizações antigas guardadas no aparelho (que não são a ativa) não recebem registro inicial; o primeiro registro delas nasce quando o atleta as ativar e mudar um máximo.

**Backup**
- Exportar e restaurar o backup completo leva e traz o histórico. Restaurar um backup feito **antes** deste PBI deixa o histórico vazio e o app recria o "Valor inicial" dos máximos
  atuais.

Regras do produto: o registro nunca bloqueia nem atrasa a ação do atleta (mudar o máximo continua em 1 toque de Salvar); funciona offline; textos em pt-BR via formatação padrão
(vírgula decimal, datas "05 nov").

## Decisões
- **Histórico do usuário, separado do valor da periodização** (decisão 2 da spec 15). Alternativa descartada: guardar o histórico dentro de cada periodização (perde a visão
  contínua do atleta e a periodização nova não saberia de onde começar).
- **Grava só mudança de valor**, não renomear, nem leitura. Motivo: o objetivo é evolução.
- **Origem entre cinco valores fixos** (importado, manual, Claude, regra, nova periodização), como definido na entrevista de 06/11/2026.
- **Valor inicial datado na instalação**, com aviso na tela de que não é a data real. Alternativa descartada: usar a data de início do ciclo (inventa uma data que o atleta
  pode ter alterado antes); inventar o passado a partir de e1RM (não é o máximo real).
- **Seed só da periodização ativa.** Motivo: as outras são arquivo morto hoje; a spec 16 grava "Nova periodização" quando criar.
- **Sem tela de edição do histórico.** Motivo: histórico confiável é o que ninguém reescreve; se errar, o próximo valor corrige.
- **Histórico dentro da folha do máximo** em vez de uma tela nova: é o menor lugar onde o atleta o encontra.
- **Entra logo após o PBI 20 e antes do 22**, porque cada dia sem registro é dado perdido, enquanto as Análises por exercício podem esperar sem perder nada.

## Critérios de pronto
- **CP1 — Edição manual.** Mudar o supino de 170 para 175 em Ajustes → Máximos grava um registro (175 kg, "Manual", data de hoje); a folha do supino mostra a linha com "+5 kg".
- **CP2 — Sem mudança, sem registro.** Salvar o mesmo valor, ou só renomear, não cria registro.
- **CP3 — Criação.** Criar "Barra fixa lastrada" com 30 kg grava o primeiro registro ("Manual", 30 kg).
- **CP4 — Voltar ao plano.** "Voltar ao valor do plano" grava um registro "Manual" com o valor do plano.
- **CP5 — Claude.** Aplicar um `set_max` do Claude que muda o valor grava um registro "Claude"; um `set_max` com o mesmo valor atual não grava.
- **CP6 — Regra do treinador.** Aceitar a sugestão de revisão de máximo grava um registro "Regra do treinador" com o valor novo.
- **CP7 — Importação.** Importar um ciclo ou backup cujo máximo difere do atual grava um registro "Importado"; importar o mesmo valor não grava.
- **CP8 — Valor inicial.** Depois da instalação com dados existentes, cada máximo da periodização ativa tem um registro "Valor inicial" com o valor atual e a data da instalação, e o aviso
  "Os registros começam em <data>. Mudanças anteriores não foram guardadas." aparece sob a lista.
- **CP9 — Apagar máximo.** Apagar um máximo (sem uso) não apaga seus registros do histórico (verificável por teste e no backup exportado).
- **CP10 — Ordem e formato.** A lista mostra do mais novo ao mais antigo, com data no formato "05 nov" / "05 nov, 2025", valor em kg com vírgula decimal e variação com sinal.
- **CP11 — Backup.** Exportar e restaurar o backup completo preserva o histórico; restaurar um backup anterior a este PBI não quebra e recria o "Valor inicial".
- **CP12 — Último valor.** Existe uma consulta testada "último valor de cada máximo" que a spec 16 poderá usar (teste automático: dois registros do mesmo máximo, vale o mais recente).
- **CP13 — Não atrapalha.** Salvar um máximo continua levando 1 toque depois de editar o valor, sem espera perceptível, com e sem internet.
- **CP14 — Sem regressão.** `npm test`, `npm run test:import`, `npm run typecheck` e `npx expo lint` passam; o plano atual continua idêntico (teste dourado do PBI 19).

## Verificação
- **Na nuvem / testes automáticos:** registro por origem, ausência de registro quando o valor não muda, último valor, backup com histórico, restauração de backup antigo (CP2, CP5 a CP7,
  CP9, CP11, CP12, CP14).
- **Prévia web:** conferir a seção "Histórico" na folha do máximo (CP1, CP3, CP4, CP8, CP10).
- **No simulador / iPhone (roteiro):**
  1. Instalar por cima da versão do PBI 20 com dados reais. Abrir Ajustes → Máximos → Supino: histórico com uma linha "Valor inicial" e o aviso de data (CP8).
  2. Mudar o supino para 175 e salvar: nova linha "+5 kg · Manual" (CP1). Salvar de novo sem mudar: sem linha nova (CP2).
  3. Tocar em "Voltar ao valor do plano": linha "Manual" (CP4).
  4. Criar "Barra fixa lastrada" com 30 kg e ver o primeiro registro (CP3). Apagar sem uso e conferir, no backup JSON exportado, que os registros continuam lá (CP9).
  5. Colar uma resposta do Claude com `set_max` em outro valor, aplicar: linha "Claude" (CP5). Repetir com o mesmo valor: nada novo.
  6. Se houver sugestão de revisão de máximo disponível, aceitar e conferir "Regra do treinador" (CP6); senão, coberto por teste.
  7. Exportar o backup, restaurar e conferir que as linhas voltam (CP11).
  - **Só no iPhone:** nada específico além do conforto de leitura da lista com texto grande.

## Riscos e perguntas abertas
- **Risco de produto:** o "Valor inicial" tem a data da instalação, não a do máximo real; por isso a explicação na tela. Se o atleta quiser as datas reais antigas, terá que
  lançá-las à mão (fora do escopo; backlog "lançar histórico retroativo").
- **Risco:** pontos que mudam máximo e esquecidos no registro (há quatro caminhos: tela, Claude, regra, importação). Mitigação: os CP2 a CP7 testam cada caminho.
- **P1 (não bloqueia):** a lista deve mostrar também de qual periodização veio cada mudança? Hoje só existe uma ativa; faz sentido quando a spec 16 chegar. Recomendação: gravar sempre
  (já decidido) e só mostrar o nome da periodização quando houver mais de uma.

## Andamento
| Data | Nota |
|---|---|
| 06/11/2026 | PBI criado a partir da fatia "histórico" da spec 15 (decisão 2 e parte do item 15g). |
| 06/11/2026 | Atleta quer o gráfico de evolução, o histórico retroativo e a sugestão pelo e1RM: criado o PBI 23; as origens do histórico precisam aceitar novos valores. |
