# 16 — Periodizações: várias, uma ativa; criar plano e treinos pela UI

**Status:** ⏳ a fazer (planejada em 06/11/2026) — depende da spec 15 (exercício único)

## Objetivo
Pedidos do usuário (06/11/2026): (1) "se eu quiser criar um treino no plano eu deveria poder"; (2) "criar um plano
também", sem depender de importação; (3) "o plano nada mais é do que uma periodização: o sistema deve comportar N
periodizações, uma só ativa".

## Vocabulário (produto)
- **Periodização** = o que o código chama de *ciclo* (`Cycle`): nome, datas, semanas. Na interface passa a se chamar
  **Periodização** (e "Plano" é a aba que mostra a ativa). Sem renomear tabelas/tipos agora.
- Hierarquia: **Periodização → Semanas → Treinos → Exercícios** (como "pasta → rotina" do Hevy, com semanas no meio).

## Situação atual
- O **banco já comporta N**: `cycles` tem `status planned | active | done`; `listCycles` e `setActiveCycle` existem e a
  tela Dados já ativa/importa. **Falta** UI de criação/edição na aba Plano e escolha da periodização.
- Editar o plano: só `add_item`/`edit_item`/`remove_item` (`applyAdjustments`). Não há criar/remover treino, semana ou ciclo.
- Todo o resto (Hoje, Análises, relatório) lê o ciclo **ativo**.

## Decisões propostas
1. **Aba Plano com seletor de periodização** no topo (nome ▾): lista as periodizações (ativa marcada), "Nova
   periodização", e por periodização: Ativar, Duplicar, Renomear, Arquivar (status `done`), Excluir (confirma; os registros
   dos treinos feitos ficam, sem plano associado — ver pergunta).
2. **Uma ativa** (já garantido por `setActiveCycle`). Ativar outra não apaga nada; Hoje passa a mostrar a nova. Os registros
   continuam presos ao `cycle_id`, e as Análises (todos os ciclos) seguem somando.
3. **Nova periodização — 3 caminhos:** (a) **Em branco** (nome, início, nº de semanas); (b) **Copiar de outra**
   (duplica e muda as datas); (c) **Importar** (o que existe hoje, passa a ser opcional).
4. **Criar treino** (em uma semana): título, dia da semana, exercícios (reaproveita `ExercisePicker`, `ItemEditor` e o
   tipo Acessório/Variação/Principal). Atalho **"Repetir nas próximas semanas"** (copia o treino/semana para as seguintes,
   com opção de aumentar carga/% por semana — progressão simples) e **"Copiar semana"**.
5. **Novas operações puras** em `adjustments.ts` (mesmo caminho de edição de sempre, também usável pelo Claude):
   `add_session`, `remove_session`, `edit_session` (título/dia), `add_week`, `remove_week`, `duplicate_week`; e
   `createCycle(params)` / `duplicateCycle(cycle, startDate)` em `src/domain/cycles.ts` (funções puras + testes).
   IDs seguem o padrão `w<semana>-d<dia>` (item `w<n>-d<d>-<k>`).
6. **Sem regras do treinador** nas periodizações novas (`ruleParams: null`, spec 15). Máximos opcionais.
7. **Datas:** o início deve ser segunda-feira (ou ajusta para a segunda mais próxima); `endDate` = início + semanas.
   Datas sobrepostas entre periodizações são permitidas (só uma ativa).

## Plano de execução
- [ ] Domínio: `cycles.ts` (criar/duplicar), operações de sessão/semana, validador, testes
- [ ] Banco: `createCycleRow`, `deleteCycle`, `renameCycle` (sem migração de esquema)
- [ ] Telas: seletor e gerenciador de periodizações; assistente "Nova periodização"; "Novo treino"; editor de treino
- [ ] Estado vazio: app sem periodização ativa mostra "Criar minha primeira periodização" (hoje o plano de exemplo vem embutido)
- [ ] Docs (`formato-ciclo.md`, `claude-treinador.md`), CONTEXTO e PLANO
- [ ] Verificação: simulador (criar do zero, ativar, voltar), testes, `tsc`, lint

## Perguntas em aberto
- O plano embutido (`ciclo_out26_jan27`) continua vindo de fábrica? Proposta: sim, como "Ciclo Out/26 — Jan/27" ativo,
  mas deletável.
- Excluir uma periodização com treinos registrados: apagar registros junto ou impedir? Proposta: impedir e oferecer Arquivar.
