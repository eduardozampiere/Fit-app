# 17 — Live Activity: timer na Dynamic Island e na tela bloqueada

**Status:** ⏳ a fazer — **começa por um teste de viabilidade** (planejada em 06/11/2026)

## Objetivo
"Quero uma notificação ativa com o timer rodando, usando a Dynamic Island": enquanto o descanso corre, mostrar o tempo
na Dynamic Island (compacta, mínima e expandida) e na tela bloqueada, com o app em segundo plano.

## Achado que muda o risco (docs do Expo SDK 58, `expo-widgets`)
- O `expo-widgets` cria uma **extensão de widget** e exige um **App Group** (`group.<bundle id>`, "which widgets require to
  work"). App Groups são uma *capability* que a **conta gratuita da Apple não provisiona**, e o `CONTEXTO.md` já
  registra a restrição ("sem widgets com dados compartilhados") e o `CLAUDE.md` exige `ios.entitlements` = `{}`.
- Live Activity **iniciada e atualizada localmente** (sem push) não precisa de entitlement próprio: só `NSSupportsLiveActivities`
  no Info.plist e uma extensão com SwiftUI. O problema é só o App Group que o `expo-widgets` adiciona por padrão.
- Cada extensão é **outro App ID**: a conta gratuita limita 10 App IDs por 7 dias (app + extensão = 2 por instalação).
- A contagem regressiva pode ser desenhada pelo sistema (`Text(timerInterval:)`), sem o app atualizar a cada segundo;
  o app só atualiza ao mudar o fim (+/−) ou encerrar. Botões −30/+30 na ilha exigem App Intents (iOS 17+) — fase 2.

## Teste de viabilidade (1 dia, no Mac, antes de qualquer tela)
1. Branch separada; instalar `expo-widgets` e rodar `npx expo config --type introspect`: ver se aparece
   `com.apple.security.application-groups` em `ios.entitlements` (quebra a regra do projeto).
2. Tentar `groupIdentifier` vazio/desativado ou plugin próprio (extensão mínima SwiftUI + módulo Expo local com
   `Activity.request`) **sem App Group**; compilar com `npm run iphone` usando o Apple ID gratuito.
3. Resultado possível: **(A)** funciona sem App Group → implementar; **(B)** exige App Group → **não fazer** (plano B =
   notificação local da spec 14, sem Dynamic Island); **(C)** funciona só no simulador, não no aparelho → igual a (B).
   Registrar a conclusão no `CONTEXTO.md` (caminho descartado ou aprovado).

## Se for viável (fase de implementação)
- Estado: Live Activity "Descanso" com `endAt`, rótulo (exercício) e total; iniciada em `RestTimer.start`, atualizada em
  +/−, encerrada ao parar/chegar a 0.
- Layout: compacta (ícone + contagem), mínima (contagem), expandida (exercício, contagem grande, barra de progresso), tela
  bloqueada igual à expandida. Toque abre o app no treino em andamento.
- Reaproveita o estado persistido da spec 14 (recuperar atividades ao reabrir: `getInstances`).
- Fase 2 (opcional): botões ±30 s por App Intents; Live Activity do **treino inteiro** (duração, série atual).

## Plano de execução
- [ ] Teste de viabilidade e decisão (A/B/C) registrada
- [ ] (se A) extensão + módulo, Live Activity do descanso, integração com `RestTimer`
- [ ] Verificação só no iPhone (a Dynamic Island do simulador é limitada) — depende de sessão local no Mac
