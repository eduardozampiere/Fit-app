# 24 — Séries com tipo: montar single, back-off e aquecimento dentro do exercício · PBI

> **Produto: o quê e por quê.** Dono: `product-manager` (`/pm`). O como fica em [tech-plan.md](tech-plan.md), do `tech-planner` (`/planejar`).

> **Resumo:** Editor para adicionar, remover, reordenar e trocar o tipo dos grupos de séries de um exercício, no Plano e em Hoje.

**Status:** ⏳ a fazer
**Depende de:** [19 — Modelo v2](../19-formato-v2/pbi.md) (logo depois dele) e antes da [spec 16](../16-periodizacoes/spec.md), que usa este editor.

## Objetivo
- Pós-19, single e back-off são grupos de séries com tipo, mas só se editam os existentes; falta criar mais um grupo do mesmo exercício.
- Serve ao powerlifter e a quem faz academia comum (3 séries normais + 1 drop set).
- Uso: planejando (aba Plano) e, às vezes, no treino; uma mão, alvo de 56 pt, até 3 toques para adicionar um grupo.
- Sucesso: "Back-off 2×3 a 150 kg" em até 3 toques, aparecendo como linhas "B" em Hoje.

## Escopo
- Entra:
  - Seção "Séries" no editor do exercício (Plano e Hoje): lista de grupos + botão "Adicionar grupo de séries".
  - Campos do grupo: tipo, séries, repetições (ou duração no Walkout), carga (kg ou % do máximo), RPE alvo, descanso e nome (opcionais).
  - Remover, reordenar (arrastar) e trocar o tipo do grupo.
  - Tipos do plano: Normal, Aquecimento, Single de ativação, Back-off, Walkout (contagem de cada um na tabela do PBI 19). Máximo de um Single e um Walkout por exercício.
  - Hoje: "Adicionar série" oferece também S, B e W (sem mudar o plano); trocar tipo de série registrada oferece os sete tipos.
  - Resolve o backlog "Recolocar o single removido pela lixeira".
- Não entra:
  - Prescrever falha/drop set no plano; "Duplas de volume" como tipo.
  - Sugestão automática "single bateu recorde, trocar para Normal?" (backlog).
  - Tipos personalizados, cluster/rest-pause, supersets.
  - Criar exercícios/treinos (spec 16) e escolher o máximo (PBI 20).
  - Regras novas (fadiga do single segue lendo o grupo Single).

## Comportamento
- Linha do grupo: "Back-off · 2 × 3 · 150 kg · RPE 7–8"; com % do máximo: "80% · 164 kg".
- "Adicionar grupo de séries" abre folha de tipos (sem Cancelar) com ajuda por tipo; Single/Walkout já existente aparece desabilitado: "Já existe neste exercício".
- Valores sugeridos: Normal 3×10, Aquecimento 2×8, Single 1×1, Back-off 2×5, Walkout 1×5–8 s; carga do grupo Normal.
- Folha do grupo: Séries, Repetições (número ou faixa) / "Duração (s)", Carga, RPE alvo, Descanso, Nome, Salvar. Erros: "Informe o número de séries (1 a 20).", "Informe as repetições.", "Este exercício já tem um grupo de Single de ativação."
- Remover: lixeira com confirmação "Remover o grupo de Back-off deste exercício?"; no último grupo fica desabilitada ("O exercício precisa ter pelo menos um grupo de séries."). Séries registradas não são apagadas.
- Ordem do plano = ordem em Hoje. Alcance: o do editor atual (só este treino ou próximas semanas), mostrando quantos treinos mudam.
- Claude: `add_item` de single/back-off/walkout/duplas continua; Single/Walkout já existente: prévia "Este exercício já tem Single de ativação; será editado".
- Regras: plano só muda com confirmação; pt-BR com vírgula decimal.

## Decisões
- Editor único para todos os caminhos de criar treino — evita um botão por tipo (descartado: cresce a cada tipo).
- Tipos = Normal, Aquecimento, Single, Back-off, Walkout; "Duplas de volume" não é tipo (usuário, 06/11); vira nome livre do grupo. Walkout é tipo por decisão do usuário (07/11).
- Um Single e um Walkout por exercício — regras leem "o" single; demais tipos repetem (descartado: um de cada, forçaria fundir back-off e duplas no PBI 19).
- Valores sugeridos — menos toques que campos vazios.
- Falha/drop set só no registro (decisão do PBI 19).
- Promover single = trocar tipo da série registrada para Normal (usuário, 07/11); recalcula recordes, e1RM, top set, gráficos e tonelagem.
- S, B, W no registro de Hoje — marca a série sem editar o plano (contrato).
- Entrega logo após o 19 — menor janela sem criar grupo pela tela.
- Usuário (06/11): "back-off deve ser um tipo de série, não um exercício novo"; app também para academia comum.

## Critérios de pronto
- **CP1** — Seção "Séries" lista grupos na ordem do treino, com tipo, séries × reps, carga e RPE.
- **CP2** — Editor → "Adicionar grupo de séries" → tipo (até 3 toques); entra com sugeridos e, após Salvar, aparece no Plano e em Hoje com a letra do tipo.
- **CP3** — Editar séries, reps, carga (kg/%), RPE e descanso muda só aquele grupo; mostra carga calculada; inválido mostra mensagem e não salva.
- **CP4** — Segundo Single/Walkout: tipo desabilitado e troca de tipo recusada com mensagem; Normal/Aquecimento/Back-off repetem; Walkout pede duração, aparece como "W", soma 0 kg e fica fora de recordes/top set/e1RM; Back-off conta como normal; lista sem "Duplas de volume", nome aceita o texto.
- **CP5** — Remover pede confirmação, mantém séries registradas; último grupo não removível.
- **CP6** — Arrastar muda a ordem no Plano e em Hoje; persiste ao reabrir.
- **CP7** — Alcance "próximas semanas" mostra a contagem antes de aplicar; "só este treino" não altera outros.
- **CP8** — Single removido pela lixeira "S" pode ser acrescentado de novo.
- **CP9** — Hoje: "Adicionar série" oferece S, B, W além de A, F, D, sem mudar o plano; trocar tipo registrado oferece sete tipos.
- **CP9b** — Single → Normal em série registrada passa a contar em recordes, e1RM, top set e gráfico; voltar desfaz; vale entre Normal e Back-off/Walkout; plano intacto.
- **CP10** — Fadiga do single lê o Single criado pelo editor; alertas atuais iguais (teste dourado do PBI 19).
- **CP11** — Claude: `add_item` de single com Single existente edita (com aviso); sem, adiciona; back-off/duplas adiciona Back-off (duplas com esse nome).
- **CP12** — Alvo de 56 pt, rótulo de acessibilidade, Dynamic Type, números em pt-BR.
- **CP13** — `npm test`, `npm run test:import`, `npm run typecheck`, `npx expo lint` passam.

## Verificação
- Testes/nuvem: operações de grupos, sugeridos, alcance, `add_item`, regras (CP2–5, 7, 10, 11, 13). Prévia web: seção, folhas, arraste (CP1–3, 6).
- iPhone:
  1. Plano → exercício → editor: ver "Séries" (CP1).
  2. Adicionar Back-off com sugeridos → Salvar; ver linhas B em Hoje (CP2).
  3. Segundo Single desabilitado; lista sem "Duplas de volume"; remover com confirmação; último grupo (CP4, CP5).
  4. Arrastar o single; reabrir o app (CP6).
  5. Tirar o single pela lixeira "S" e recolocar (CP8); alterar back-off com "próximas semanas" e ver a contagem (CP7).
  6. Em Hoje: "Adicionar série" → Back-off; trocar tipo de série registrada (CP9, CP9b).
  7. Colar `add_item` de single (com single existente) e de duplas no Claude (CP11).
  - Só no iPhone: toque com uma mão, texto grande, arraste (CP12).

## Riscos e perguntas abertas
- Risco UX: muitos campos numa folha; se pesar, mover RPE e descanso para "Mais opções".
- Risco: duas formas de acrescentar série em Hoje (extra do registro × grupo no plano); texto da folha explica "só hoje" × editor.
- P1 (não bloqueia): Single e Back-off para todos ou só no módulo avançado? Recomendação: todos, esconder só se atrapalhar.

## Andamento
| Data | Nota |
|---|---|
| 06–07/11/2026 | PBI criado; tipos = Normal, Aquecimento, Single, Back-off, Walkout (duplas viraram nome de grupo; só Single e Walkout limitados a um por exercício). |
