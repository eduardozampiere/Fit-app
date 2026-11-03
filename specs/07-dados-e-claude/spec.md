# 07 — Importação, exportação, backup e integração com o Claude

**Status:** 🟡 feito, falta verificar no iPhone e com um export real do Hevy

## Objetivo
O Claude é o treinador: o app manda um pacote e aplica as respostas. Trazer o histórico antigo (Hevy e
CSVs) e garantir backup.

## Decisões
- **Pacote para o Claude** (Markdown): resumo, planejado × feito por sessão com os ids dos itens,
  check-ins, alertas e decisões, peso, alimentação e instruções de resposta. Período: últimos 7 dias,
  semana do plano ou ciclo inteiro. Compartilhar (.md) ou copiar.
- **Resposta do Claude:** aceita bloco ```json com texto em volta. `fitapp.adjustments/v1` (pré-visualização
  em português e confirmação) ou `fitapp.cycle/v1` (salva como próximo ciclo ou ativa).
- **Instruções para o projeto do Claude:** `docs/claude-treinador.md`.
- **Hevy:** colunas pelo cabeçalho, aquecimento ignorado, lbs → kg. **CSVs antigos:** treinos, checkin
  (texto livre → número + observação), refeicoes (macros fixos), peso. Tipo detectado pelo cabeçalho.
- **Mapeamento de nomes** de exercício para o catálogo, lembrado em `settings.importMapping`.
- **Sem duplicar:** `source_key` em `set_logs` e `meal_entries`; check-ins e pesos não sobrescrevem dias existentes.
- Treino importado liga ao treino do plano só se a data e algum exercício baterem e o dia não tiver registro; senão vira `extra:<data>:<título>`.
- **Backup** JSON de todas as tabelas, com restauração (substitui tudo, com confirmação). CSVs por tipo.
- **Plano editável:** editar, adicionar e remover exercícios na aba Plano (mesmas operações dos ajustes).
- **Histórico de ciclos:** listar e ativar.

## Arquivos
- `src/domain/`: `csv.ts`, `parsing.ts`, `importers.ts`, `adjustments.ts`, `report.ts`, `exporters.ts`; testes em `__tests__/import-export.test.ts`
- `src/db/dataRepo.ts`, `src/db/schema.ts` (v4)
- `src/app/dados.tsx`, `src/components/ItemEditor.tsx`, `src/state/files.ts`
- `docs/claude-treinador.md`

## Verificação
- Na nuvem: testes de CSV, parsers, Hevy (formato documentado), CSVs antigos, ajustes, relatório e
  exportação. Prévia web: ajustes colados aplicados no plano; editor de exercício.
- Falta: seletor de arquivos, folha de compartilhamento e área de transferência no iPhone; export real do Hevy.

## Andamento
| Data | Nota |
|---|---|
| 03/11/2026 | Implementado (`96411c0`). |
