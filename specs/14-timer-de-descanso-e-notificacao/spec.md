# 14 — Timer de descanso: janela retangular, que sobrevive ao app e avisa

**Status:** 🟡 feito, falta verificar no iPhone (06/11/2026)

## Objetivo
(1) A janela do timer deve ser **retangular como a do Hevy**, não oval. (2) O timer não pode morrer ao trocar de app ou
fechá-lo. (3) Avisar quando o descanso acaba, com o app em segundo plano.

## Situação atual
- No iOS o timer é o `NativeTabs.BottomAccessory`: o **sistema** desenha a cápsula de vidro e a forma não é configurável.
  Fora do iOS existe `RestTimerBar` (retangular, faixa de progresso, −30/+30/✕).
- `RestTimer` (`src/state/RestTimer.tsx`) era só memória: fechar o app apagava o timer.
- **A notificação local de fim do descanso já existia** (agendada ao iniciar, cancelada ao parar e reagendada em ±30 s) — a spec
  original estava errada nesse ponto.

## Decisões propostas
- **Trocar o acessório do sistema por um cartão próprio** acima da barra de abas, nas cinco abas: retângulo de cantos
  arredondados (raio do tema), barra de progresso, tempo grande, nome do exercício, −15 / +15 / Pular. Usa `RestTimerBar`
  (já tem o desenho; ajustar para o visual do Hevy). Risco: posicionar acima da barra Liquid Glass sem hook de altura —
  resolver com `useSafeAreaInsets` + constante medida no simulador; se ficar frágil, o cartão vai no topo das telas.
- **Persistir:** gravar `endAt`, total e rótulo em `settings` (`rest-timer`); ao abrir o app, restaurar se `endAt` > agora.
- **Notificação local** agendada ao iniciar o descanso para `endAt` ("Descanso acabou · Agachamento"), cancelada ao
  parar/pular; reagendada em +/−. Pede permissão na primeira vez. Funciona com Apple ID gratuito (é local).
- Com o app em primeiro plano continua o alarme atual (som/vibração).

## Feito em 06/11/2026
- **Cartão retangular** (raio 16, borda fina, barra de progresso, −30/+30/✕) no lugar da cápsula do sistema, em `FloatingBars`
  acima da barra de abas e do cartão de treino em andamento. `RestTimerAccessory` e o `BottomAccessory` foram removidos.
- **Arraste do modal do cronômetro** (`RestEditor`): a folha não respondia ao arraste porque a alça ficava *dentro* do
  `Pressable` que já respondia ao toque (um filho nunca assume o gesto de quem está respondendo). Agora a alça e o título
  respondem logo no toque (`BottomSheet` com `header`), e a roda de tempos continua rolando sozinha.

- **Timer persistente:** `rest-timer` em `settings` guarda `endAt`, `totalSec` e `label`; ao abrir o app o timer é restaurado
  **só se ainda não acabou** (se acabou com o app fechado, a notificação já avisou). Lógica pura em `src/domain/restTimer.ts`
  (`restoreTimer`, `remainingSeconds`) com testes. A notificação passou a ter **id fixo** (`rest-timer`), então dá para
  cancelá-la depois de restaurar.
- **Descartar/concluir o treino** (cabeçalho ou barra) também encerra o descanso que estava rodando.
- Conferido no simulador: iniciar o timer livre, fechar o app (`simctl terminate`), reabrir → cartão de volta com o tempo certo
  e a barra de progresso.

## Plano de execução
- [x] Domínio: `src/domain/restTimer.ts` com testes
- [x] Cartão retangular + remoção do `BottomAccessory` (conferir posição acima da barra no iPhone)
- [x] Persistência em `settings` e restauração
- [x] Notificação local (já existia; id fixo)
- [ ] Verificação: simulador (feito, escuro), **iPhone: notificação com o app em segundo plano e tela bloqueada**, tema claro

## Relação com a spec 17
A Live Activity mostra o mesmo timer na Dynamic Island; esta spec é a base (estado persistido + notificação) e é o
**plano B** se a Live Activity não for viável com Apple ID gratuito.
