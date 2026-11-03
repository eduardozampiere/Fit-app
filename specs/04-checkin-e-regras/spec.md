# 04 — Check-in e regras de segurança

**Status:** 🟡 feito, falta verificar no iPhone

## Objetivo
Acompanhar o corpo (protrusões L3–S1) e aplicar as 10 regras do plano como alertas e sugestões.

## Decisões
- Regras em `src/domain/rules.ts`, **funções puras**, parâmetros em `cycle.ruleParams`.
- Sugestões só mudam o plano quando aceitas (`applySuggestion`); decisões ficam em `alert_decisions`.
- As 10 regras:
  1. **Freio:** última série do principal com RPE ≥ alvo + 1 → repetir a carga na semana seguinte.
  2. **Portões (S9–S13):** semana-portão 11 com as cargas da planilha (190/165/230 → 200/175/240, alternativa −5).
  3. **Single de ativação:** RPE ≥ 8 → sinal de cansaço; nas S7–S8, sugere pular os singles seguintes.
  4. **4ª série do terra** nas S4–S6: bloqueada até a 3ª sair com RPE ≤ 8,5.
  5. **Terra falhou** → bloqueia o terra e o stiff do dia (pode desfazer).
  6. **Deload sob demanda:** 2 sinais vermelhos na semana → −40% de volume na seguinte.
  7. **Revisão dos máximos** depois da S6: média dos top sets ≥ 1 ponto abaixo do meio do alvo → +5 kg (S7–S13).
  8. **Regra das 24 h:** lombar ou joelho pior que no check-in anterior → alerta no dia.
  9. **Sinais de alarme** → tela cheia "procure um pronto-socorro" (com ligar 192).
  10. **Pegada do terra:** dica e pré-preenchimento (hook nas 2 primeiras até a S6, strap no resto; stiff strap; S7+ hook).
- Check-in já abre com os valores do último check-in (10 segundos). Lembrete diário configurável.

## Arquivos
- `src/domain/rules.ts`, `src/domain/__tests__/rules.test.ts`
- `src/state/useCoach.ts`, `src/state/reminders.ts`
- `src/components/AlertCard.tsx`, `RedFlagModal.tsx`, `CheckinSummary.tsx`
- Tela de check-in dentro de `src/app/(tabs)/corpo.tsx`; alertas em Hoje e Plano
- `src/db/schema.ts` (v2: `checkins`, `alert_decisions`)

## Verificação
- Na nuvem: 34 testes das regras; na prévia web, RPE 9 gerou o freio e "Aplicar no plano" mudou a S3 de 135 para 130 kg; alarme abriu a tela cheia.

## Andamento
| Data | Nota |
|---|---|
| 03/11/2026 | Implementado (`3e0477c`). Decisões 1–3 do PLANO.md aguardam revisão do usuário. |
