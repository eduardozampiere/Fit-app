# 10 — Cabeçalho do treino, adicionar exercício e imagens

**Status:** 🟡 feito, falta verificar no iPhone

## Objetivo
Deixar a tela Hoje mais parecida com o treino do Hevy (capturas do usuário de 05/11/2026): cabeçalho fixo
com as informações do treino, botão para adicionar exercício, botões de série do mesmo tamanho e a imagem
do exercício no cartão.

## Escopo
- Entra:
  - **Cabeçalho fixo** no topo da tela Hoje: dia e semana, timer de descanso, "Concluir", e Duração · Volume · Séries.
  - **"Adicionar exercício"** no fim da lista (antes do rodapé), com o mesmo seletor do catálogo.
  - **"Adicionar série" e "Aquecimento"** com a mesma largura.
  - **Imagem do exercício** (miniatura no cartão; toque abre em tamanho grande).
- Não entra:
  - **Figura do corpo com os músculos trabalhados** (a do Hevy). Precisa de desenho do corpo e do mapa
    exercício → músculo; o catálogo já traz o músculo, mas a maioria dos exercícios do ciclo ainda não está nele.
  - "Configurações" e "Descartar treino" do rodapé do Hevy.
  - Vídeos de demonstração e baixar as imagens para uso 100% offline (ver Decisões).

## Decisões
- **Cabeçalho fora da rolagem:** o que é do treino (título, duração, volume, séries, concluir) fica fixo; a
  navegação de semana e dia, os alertas, o check-in e as notas rolam com a lista. O título do dia saiu do
  meio da página e foi para o cabeçalho.
- **"Concluir" no cabeçalho substitui o "Finalizar treino" do rodapé** (eram o mesmo comando). Com o treino
  concluído o botão vira "Reabrir".
- **Duração em segundos** ("6min 13s"), atualizada a cada segundo só enquanto o treino está aberto.
- **Timer de descanso (ícone de relógio):** abre a roda de tempos e inicia um descanso livre, sem exercício.
- **Adicionar exercício** passa por `add_item` (mesma via do plano e do Claude) e vale só para aquela
  sessão do plano; entra no fim, com 3 séries (`3x8-12`, dá para tirar ou pôr séries) e como acessório
  (abdominais como core). O exercício do catálogo usa o id do catálogo, então análises e imagem batem.
  Alternativa descartada: exercício "avulso" fora do plano — as análises e o pacote para o Claude
  não o veriam.
- **Só imagens, sem vídeo (pedido do usuário):** o catálogo do hevy-ia traz `image` (link do jpg no bucket
  `pump-app.s3.eu-west-2.amazonaws.com`) para 138 dos 413 exercícios. Os 222 links de mp4 ficam de fora
  (o importador ignora), então a maioria dos exercícios de máquina e polia não tem figura. Sem módulo novo:
  usa o `Image` do React Native (`cache: 'force-cache'`), então não precisa recompilar o app.
  - **Internet:** o uso normal é com 5G, mas pode faltar. Depois da primeira vez a imagem fica em cache
    no iOS; sem internet e sem cache aparece o ícone do exercício. O resto do app continua 100% offline.
  - **Origem e direitos:** os arquivos pertencem a terceiros (bucket do app Pump, citado no CSV do hevy-ia).
    Não sei a licença. Se o bucket sair do ar os links quebram e o ícone cobre. Se o app for publicado, revisar.
  - **Onde aparece:** miniatura redonda no cartão do exercício (toque abre a imagem grande) e na lista do seletor.
  - Só para exercício que está no catálogo (mesmo id ou mesmo nome). Os exercícios do plano original (ex.:
    "Puxada aberta") não estão; ganham imagem se forem trocados por um do catálogo.

## Plano de execução
- [x] Catálogo com `image`; `findCatalogExercise`; `addExerciseToSession`; testes
- [x] `ExerciseImage`, `ExercisePreview`, miniatura no cartão e no seletor
- [x] Seletor em modo "adicionar"; botão "Adicionar exercício"
- [x] `WorkoutHeader`; botões de série iguais; timer livre
- [x] Verificação: testes, `tsc`, lint, simulador (com internet)
- [x] Atualizar CONTEXTO.md e PLANO.md

## Arquivos
- `src/components/WorkoutHeader.tsx`, `WorkoutStats.tsx` — cabeçalho e números.
- `src/components/ExerciseImage.tsx`, `ExercisePreview.tsx` — imagem e imagem grande.
- `src/components/ExercisePicker.tsx` — modos `swap` e `add`.
- `src/domain/adjustments.ts` — `addExerciseToSession`.
- `src/domain/catalog.ts` — `image`, `findCatalogExercise`.

## Critérios de pronto
- O cabeçalho continua no topo ao rolar; Concluir marca o treino como feito e vira Reabrir.
- "Adicionar exercício" abre a lista, escolher um põe o cartão no fim do treino.
- Os dois botões de série têm a mesma largura.
- Exercício do catálogo que tem imagem mostra a miniatura; tocar abre a imagem grande.

## Verificação
- Na nuvem: testes de domínio, tipos, lint.
- No Mac: simulador do iOS 27.
- No iPhone: 5G e sem internet (modo avião) com o cache já preenchido.

## Andamento
| Data | Nota |
|---|---|
| 05/11/2026 | Spec criada a partir das capturas e perguntas do usuário. |
| 05/11/2026 | Conferido no simulador (com internet): cabeçalho fixo com Duração em segundos; botões de série do mesmo tamanho; "Adicionar exercício" pôs "Remada alta isolateral (Máquina)" no fim do treino (3 séries, séries do dia foram de 16 para 19); miniatura no cartão; tocar abriu a imagem grande. Imagens são faixas largas: miniatura do seletor é larga (72×44, imagem inteira) e a do cartão é redonda com recorte. Não verificado: timer livre (relógio), Concluir/Reabrir, sem internet, tema escuro, iPhone. |
| 05/11/2026 | Vídeo descartado a pedido do usuário (`expo-video` e `expo-image` saíram); só imagens com o `Image` do RN. |
