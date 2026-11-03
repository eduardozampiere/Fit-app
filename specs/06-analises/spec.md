# 06 — Análises

**Status:** 🟡 feito, falta verificar no iPhone

## Decisões
- Agrupamento por ciclo, bloco, semana, treino ou exercício: treinos, séries, reps, tonelagem
  (séries × reps × carga, sem falhas), carga máxima e RPE médio.
- Gráficos feitos à mão em SVG (`react-native-svg`): carga dos principais, e1RM (RTS, melhor série
  principal com RPE), termômetro do single de ativação, planejado × feito, calorias e proteína contra o
  alvo, peso com média móvel. Tocar mostra os valores.
- Regras de visualização seguidas: um eixo só, paleta categórica validada para daltonismo nos dois temas
  (azul, laranja, aqua), legenda e rótulo direto nas linhas, referência (alvo/planejado) tracejada neutra,
  topo das barras arredondado.
- Cartões por dia (mais recentes primeiro) de treino, com o check-in no rodapé, e de alimentação.
- Eixo X por data real do treino; vários treinos no mesmo dia aparecem empilhados.

## Arquivos
- `src/domain/analytics.ts`, `src/domain/__tests__/analytics.test.ts`
- `src/components/charts.tsx`, `src/app/(tabs)/analises.tsx`, tokens de gráfico em `src/ui/theme.ts`

## Andamento
| Data | Nota |
|---|---|
| 03/11/2026 | Implementado (`fd90e02`). |
