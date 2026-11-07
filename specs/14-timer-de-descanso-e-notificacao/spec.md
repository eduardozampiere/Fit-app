# 14 — Timer de descanso: janela retangular, que sobrevive ao app e avisa

**Status:** ⏳ a fazer (planejada em 06/11/2026)

## Objetivo
(1) A janela do timer deve ser **retangular como a do Hevy**, não oval. (2) O timer não pode morrer ao trocar de app ou
fechá-lo. (3) Avisar quando o descanso acaba, com o app em segundo plano.

## Situação atual
- No iOS o timer é o `NativeTabs.BottomAccessory`: o **sistema** desenha a cápsula de vidro e a forma não é configurável.
  Fora do iOS existe `RestTimerBar` (retangular, faixa de progresso, −30/+30/✕).
- `RestTimer` (`src/state/RestTimer.tsx`) é só memória: fechar o app apaga o timer.
- `expo-notifications` já está instalado (`src/state/reminders.ts`).

## Decisões propostas
- **Trocar o acessório do sistema por um cartão próprio** acima da barra de abas, nas cinco abas: retângulo de cantos
  arredondados (raio do tema), barra de progresso, tempo grande, nome do exercício, −15 / +15 / Pular. Usa `RestTimerBar`
  (já tem o desenho; ajustar para o visual do Hevy). Risco: posicionar acima da barra Liquid Glass sem hook de altura —
  resolver com `useSafeAreaInsets` + constante medida no simulador; se ficar frágil, o cartão vai no topo das telas.
- **Persistir:** gravar `endAt`, total e rótulo em `settings` (`rest-timer`); ao abrir o app, restaurar se `endAt` > agora.
- **Notificação local** agendada ao iniciar o descanso para `endAt` ("Descanso acabou · Agachamento"), cancelada ao
  parar/pular; reagendada em +/−. Pede permissão na primeira vez. Funciona com Apple ID gratuito (é local).
- Com o app em primeiro plano continua o alarme atual (som/vibração).

## Plano de execução
- [ ] Domínio: cálculo de `endAt`/restante já é puro? mover para `src/domain/restTimer.ts` com testes
- [ ] `RestTimerCard` retangular + remoção do `BottomAccessory`
- [ ] Persistência em `settings` e restauração
- [ ] Notificação local (agendar/cancelar/reagendar)
- [ ] Verificação: simulador (claro/escuro), app em segundo plano, iPhone

## Relação com a spec 17
A Live Activity mostra o mesmo timer na Dynamic Island; esta spec é a base (estado persistido + notificação) e é o
**plano B** se a Live Activity não for viável com Apple ID gratuito.
