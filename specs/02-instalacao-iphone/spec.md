# 02 — Instalação no iPhone com Apple ID gratuito

**Status:** 🟡 preparado, falta a primeira instalação

## Objetivo
Usar o app na academia, offline, sem pagar o Apple Developer Program.

## Decisões
- **Caminho escolhido:** build pelo Mac com Apple ID gratuito (`npm run iphone`), renovando a cada 7 dias.
  Os dados ficam guardados entre renovações; só não se pode apagar o app.
- **Push remoto desligado** (`expo-notifications` com `enableRemoteNotifications: false`): sem o
  entitlement `aps-environment`, a conta gratuita consegue assinar. Conferir com
  `npx expo config --type introspect` que `ios.entitlements` continua `{}` ao adicionar pacotes.
- **Alternativa:** `.ipa` sem assinatura (`npm run ipa`) para SideStore (renova no iPhone) ou AltStore
  (renova pelo Wi‑Fi com o AltServer no Mac). Frágil a cada atualização do iOS.
- Descartados: Expo Go no dia a dia (precisa do Mac rodando), PWA (sem alarme com a tela bloqueada),
  LiveContainer (notificação instável). Detalhes em [CONTEXTO.md](../CONTEXTO.md).
- Bundle id: `com.zampiere.fitapp` (não mudar: os dados ficam presos a ele).

## Arquivos
- `app.json`, `package.json` (scripts `iphone` e `ipa`), `tools/build-ipa.sh`, `docs/instalar-no-iphone.md`

## Roteiro de teste no iPhone
1. Abre direto na sessão do dia; "Treino feito conforme o plano" registra tudo em 1 toque.
2. ✓ numa série dispara o cronômetro na barra de vidro acima das abas; bloquear a tela → notificação com som no fim.
3. Ajustes → "Testar notificação (5 s)".
4. Ajustes → mudar o máximo do supino → as cargas mudam no Plano.
5. Corpo → check-in com um sinal de alarme → tela vermelha de pronto-socorro.
6. Comida → favorita "Almoço padrão" → totais do dia.
7. Análises → gráficos depois de alguns registros.
8. Plano → Claude → Copiar pacote → colar no Claude; colar a resposta → aplicar.
9. Plano → Claude → Exportar backup → salvar no iCloud Drive → restaurar.
10. Modo avião: tudo funciona.

## Andamento
| Data | Nota |
|---|---|
| 03/11/2026 | Scripts e guia prontos (`96019db`). Sessão na nuvem não consegue rodar no Mac; a instalação será feita numa sessão local. |
