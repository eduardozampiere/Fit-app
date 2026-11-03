# Diário de Treino (Fit-app)

App de iPhone (Expo + React Native) para o ciclo de powerlifting. Offline: tudo fica no aparelho (SQLite).

- **Hoje:** treino do dia, "feito conforme o plano" em 1 toque, registro série a série, cronômetro de
  descanso (Liquid Glass), anilhas, alertas das regras, check-in do dia.
- **Comida:** alimentos por 100 g, favoritas, óleo de preparo, totais contra o alvo do tipo de dia.
- **Corpo:** check-in (dor, sono, sinais de alarme), peso com média de 7 dias, medidas.
- **Análises:** gráficos (cargas, e1RM, termômetro do single, planejado × feito, calorias, proteína,
  peso), agrupamentos por ciclo/bloco/semana/treino/exercício e cartões por dia.
- **Plano:** semanas editáveis, sugestões das regras (aceitar/ignorar), regras do ciclo.
- **Claude:** pacote para o treinador, aplicar ajustes/ciclo novo vindos do Claude, importar Hevy e
  CSVs antigos, exportar CSV/JSON, backup e histórico de ciclos.

## Acompanhamento

Status, contexto e decisões em **[specs/](specs/PLANO.md)** (uma subpasta por feature).

## Instalar no iPhone para usar na academia

Ver **[docs/instalar-no-iphone.md](docs/instalar-no-iphone.md)**: Apple ID gratuito, renovação a cada 7 dias
(`npm run iphone` pelo Mac, ou `npm run ipa` para SideStore/AltStore).

## Testar durante o desenvolvimento (Expo Go)

Pré-requisitos no Mac: Node 20+ e o app **Expo Go** instalado no iPhone (App Store).

```bash
npm install
npx expo login        # mesma conta Expo logada no Expo Go (exigido no iPhone)
npx expo start        # escaneie o QR com a câmera do iPhone
```

iPhone e Mac na mesma rede Wi‑Fi. Se a rede bloquear, use `npx expo start --tunnel`.

## Comandos

| Comando | O que faz |
|---|---|
| `npm test` | testes do domínio (Vitest): RPE/e1RM, cargas, anilhas, plano, regras, alimentação, peso, análises, importação/exportação, ajustes do Claude |
| `npm run test:import` | testes do importador da planilha (Python) |
| `npm run typecheck` | TypeScript |
| `npx expo lint` | lint |
| `npm run import-plan` | regera `assets/plan/*.json` a partir de `data/ciclo_out26_jan27.xlsx` (precisa de `openpyxl`) |

## Estrutura

```
data/                 planilha original do ciclo
tools/import_plan.py  planilha -> JSON (formato fitapp.cycle/v1)
assets/plan/          ciclo embutido no app
src/domain/           regras puras, sem React (testadas)
src/db/               SQLite: migrações e consultas
src/state/            dados do app e cronômetro de descanso
src/components/       cartões, editor de série, anilhas, cronômetro
src/app/              telas (Expo Router): Hoje, Plano, Ajustes
docs/formato-ciclo.md formato de ciclo (o mesmo que o Claude gera)
docs/claude-treinador.md instruções para colar no projeto do Claude
docs/instalar-no-iphone.md instalação com Apple ID gratuito
```
