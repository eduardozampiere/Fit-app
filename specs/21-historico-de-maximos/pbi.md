# 21 — Histórico de máximos · PBI

> **Produto: o quê e por quê.** Dono: `product-manager`. O como: [tech-plan.md](tech-plan.md). Parte 3 de 4 da [spec 15](../15-exercicio-unico/spec.md).

> **Resumo:** Gravar automaticamente toda mudança de valor de um máximo e listá-la em "Histórico" na folha do máximo.

**Status:** ⏳ a fazer
**Depende de:** [20](../20-maximos-proprios/pbi.md) (e da [19](../19-formato-v2/pbi.md)). Não bloqueia a [16](../16-periodizacao-multipla/spec.md): ela usa o "último valor" quando houver máximos; senão, só carga fixa.
Recurso avançado: segue a P3 do PBI 20 (interruptor "Recursos avançados"); o registro é invisível, só a lista some com o recurso.

## Objetivo
Hoje, mudar o supino de 170 para 175 apaga o 170: sem evolução, sem ponto de partida para periodização nova. O histórico só acumula daqui para a frente, então vem logo após o 20. Registro automático; o atleta consulta ao planejar ciclo. Gráfico é o [PBI 23](../23-evolucao-dos-maximos/pbi.md).

## Escopo
- Entra: registro de toda mudança de valor (edição manual, "Voltar ao valor do plano", criação, `set_max` do Claude aceito, revisão sugerida pelo treinador aceita, importação de ciclo/planilha/backup, nova periodização da spec 16).
- Entra: registro = máximo, kg, data/hora, origem, periodização; seção "Histórico" na folha do máximo (Ajustes → Máximos); "Valor inicial" na instalação; histórico no backup; consulta "último valor de cada máximo".
- Não entra: gráfico, reconstrução do passado e sugestão por e1RM (PBI 23, que acrescenta as origens "Sugestão do e1RM" e "Lançado depois": origens não podem ser lista fechada); editar/apagar registros; registrar renomeação.

## Comportamento
- Mesmo valor não grava. Origens: Manual, Claude, Regra do treinador, Importado, Nova periodização, Valor inicial.
- Apagar máximo mantém seus registros; renomear não grava (mostra o nome atual).
- Linha: data ("05 nov" / "05 nov, 2025"), valor ("175 kg"), variação ("+5 kg", "−2,5 kg"; vazia no primeiro), origem. Mais novo primeiro; rola, sem paginação.
- Máximo novo mostra o registro de criação ("Manual · 30 kg"); nunca há máximo sem registro.
- Instalação: grava "Valor inicial" (valor atual) só da periodização ativa, sem aviso. Texto sob a lista: "Os registros começam em 05 nov. Mudanças anteriores não foram guardadas."
- Backup antigo restaurado: histórico vazio e recria "Valor inicial".
- Nunca bloqueia: salvar continua 1 toque, offline.

## Decisões
- Histórico do usuário, separado da periodização (decisão 2 da spec 15) — descartado: dentro de cada periodização (perde visão contínua).
- Só mudança de valor — o objetivo é evolução.
- Origem entre valores fixos por ora (entrevista 06/11/2026), extensível pelo PBI 23.
- "Valor inicial" com data da instalação e aviso — descartados: data de início do ciclo (inventa data) e e1RM (não é o máximo real).
- Seed só da ativa — as outras são arquivo morto; nascem ao ativar e mudar.
- Sem edição de registros — histórico confiável; o próximo valor corrige.
- Dentro da folha do máximo, sem tela nova — menor lugar onde o atleta encontra.
- Prioridade antes do 22 — cada dia sem registro é dado perdido.

## Critérios de pronto
- **CP1** — Supino 170→175 em Ajustes grava "Manual", 175 kg, hoje; folha mostra "+5 kg".
- **CP2** — Salvar o mesmo valor ou só renomear não grava.
- **CP3** — Criar "Barra fixa lastrada" 30 kg grava "Manual", 30 kg.
- **CP4** — "Voltar ao valor do plano" grava "Manual".
- **CP5** — `set_max` do Claude com valor novo grava "Claude"; com mesmo valor, não.
- **CP6** — Aceitar revisão sugerida grava "Regra do treinador".
- **CP7** — Importar ciclo/backup com valor diferente grava "Importado"; igual, não.
- **CP8** — Após instalar, cada máximo da ativa tem "Valor inicial" (valor atual, data da instalação) e o aviso aparece.
- **CP9** — Apagar máximo (sem uso) mantém registros, por teste e no backup exportado.
- **CP10** — Ordem, formato de data/kg e variação com sinal corretos.
- **CP11** — Backup exporta/restaura o histórico; backup antigo não quebra e recria "Valor inicial".
- **CP12** — Consulta "último valor" testada (dois registros, vale o mais recente).
- **CP13** — Salvar continua 1 toque, sem espera, com e sem internet.
- **CP14** — `npm test`, `test:import`, `typecheck`, `lint` passam; plano idêntico (teste dourado do PBI 19).

## Verificação
- Testes: origens, não gravar sem mudança, último valor, backup, backup antigo (CP2, 5–7, 9, 11, 12, 14). Prévia web: seção Histórico (CP1, 3, 4, 8, 10).
- iPhone: 1. Instalar sobre o PBI 20 com dados reais; Supino → Histórico: "Valor inicial" e aviso (CP8). 2. Supino 175, salvar: "+5 kg · Manual"; salvar de novo: nada (CP1, 2). 3. "Voltar ao valor do plano": "Manual" (CP4). 4. Criar e apagar "Barra fixa lastrada"; registros no backup JSON (CP3, 9). 5. `set_max` do Claude, aplicar: "Claude"; repetir: nada (CP5). 6. Aceitar revisão de máximo, se houver (CP6). 7. Exportar, restaurar, conferir (CP11). Texto grande legível.

## Riscos e perguntas abertas
- Risco: "Valor inicial" não tem a data real; datas antigas só à mão (backlog "lançar histórico retroativo").
- Risco: caminho de mudança esquecido (tela, Claude, regra, importação); mitigado pelos CP2 a CP7.
- P1 (não bloqueia): mostrar a periodização de cada mudança? Recomendação: gravar sempre; mostrar só com mais de uma.

## Andamento
| Data | Nota |
|---|---|
| 06/11/2026 | PBI criado (spec 15, decisão 2); virou recurso avançado, não bloqueia mais a 16; PBI 23 cobre gráfico e origens novas. |
