# 05 — Alimentação, peso e medidas

**Status:** 🟡 feito, falta verificar no iPhone

## Decisões
- 13 alimentos iniciais por 100 g, com valores aproximados de tabelas de composição (TACO/USDA), todos editáveis.
- Refeições: almoço, pré-treino, pós-treino, jantar, lanche. Favoritas (inclui "Almoço padrão": 400 g arroz + 200 g frango + 1 colher de óleo).
- Óleo de preparo por colher (padrão 90 kcal, editável), em passos de meia colher.
- Alvos: 2.600 kcal (treino) / 2.200 (descanso) / 200 g de proteína; o tipo do dia vem do plano.
- **Macros gravados no registro** (snapshot).
- Peso: média móvel de 7 dias e tendência = média de hoje − média de 7 dias atrás.
- Medidas (braço, coxa, abdômen) a cada 14 dias.
- Navegação: Check-in, Peso e Medidas juntos na aba **Corpo**; Ajustes viraram tela aberta pela aba Plano (limite de 5 abas do iOS).

## Arquivos
- `src/domain/nutrition.ts`, `src/domain/body.ts`, `src/domain/__tests__/nutrition-body.test.ts`
- `src/db/nutritionRepo.ts`, `src/db/schema.ts` (v3)
- `src/app/(tabs)/comida.tsx`, `src/components/FoodModals.tsx`, `src/components/BodySections.tsx`, `src/app/(tabs)/corpo.tsx`, `src/app/ajustes.tsx`

## Andamento
| Data | Nota |
|---|---|
| 03/11/2026 | Implementado (`11b4a12`). |
