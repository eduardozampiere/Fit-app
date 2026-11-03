# 03 — Liquid Glass

**Status:** 🟡 feito, falta ver no iPhone (o vidro não aparece na prévia web)

## Objetivo
Visual do iOS 26 sem prejudicar a leitura na academia.

## Decisões
- **Abas nativas** (`expo-router/native-tabs`, estável no SDK 58): o sistema desenha o vidro e encolhe
  a barra ao rolar (`minimizeBehavior="onScrollDown"`). Ícones SF Symbols.
- **Cronômetro no `NativeTabs.BottomAccessory`**, como o mini player do Apple Music, com versão
  compacta (`inline`). O estado vem do contexto, porque o sistema renderiza duas instâncias. O acessório
  só aparece com o cronômetro rodando (renderização condicional; **confirmar no iPhone** que aparece e some
  corretamente).
- **Vidro só na camada de navegação**; cartões de conteúdo continuam sólidos para leitura com luz forte.
- Web (prévia): `_layout.web.tsx` com abas em JS e o cronômetro dentro da tela Hoje.

## Arquivos
- `src/app/(tabs)/_layout.tsx`, `src/app/(tabs)/_layout.web.tsx`, `src/components/RestTimerBar.tsx` (`RestTimerAccessory`)

## Andamento
| Data | Nota |
|---|---|
| 03/11/2026 | Implementado (`99ca017`). |
