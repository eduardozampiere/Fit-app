# Contexto do projeto

> Leia este arquivo e o [PLANO.md](PLANO.md) antes de trabalhar no projeto. Eles valem para qualquer
> chat ou sessão. Ao decidir algo que muda o que está aqui, atualize este arquivo no mesmo commit.

## Quem usa e para quê

- Atleta de powerlifting (IPF, categoria 105 kg). Meta dez/2027: agacho 220, supino 180, terra 260.
- Treina 5x por semana num ciclo periodizado por % (volume → intensificação → pico → deload).
- Tem histórico de **protrusões discais lombares (L3–S1)**. O app acompanha dor (lombar, joelho, punho,
  pé), sono e sinais de alarme, e aplica as regras de segurança do plano.
- O app é usado **durante o treino, com uma mão, entre séries**: alvos de toque grandes, fluxo
  "feito conforme o plano" em no máximo 2 toques.
- **O Claude é o treinador.** O atleta mantém um projeto no claude.ai com o histórico. O app é o
  caderno: registra e manda um pacote para o Claude, e o Claude devolve ajustes ou ciclos novos num
  formato que o app aplica, sempre com confirmação.
- Interface em **português do Brasil**: kg e g, datas `dd/MM`, vírgula decimal e ponto de milhar.
- Preferências do usuário nas conversas: respostas diretas, debater ideias, empatia.

## Restrições que definem a arquitetura

| Restrição | Consequência |
|---|---|
| Sem conta paga da Apple (não vai pagar) | Instalação com Apple ID gratuito pelo Mac: validade de 7 dias, renovação semanal. Sem HealthKit, widgets com dados compartilhados, iCloud/CloudKit nem push remoto. |
| Uso na academia, sem depender de internet | Offline-first: tudo no aparelho (SQLite), sem backend e sem conta. |
| Tem Mac | O build e a instalação no iPhone rodam no Mac (`npm run iphone`). |
| Sessões do Claude Code na nuvem rodam em Linux | Elas não compilam iOS nem alcançam o iPhone. Testes de domínio, lint, tipos e prévia web rodam lá; instalação só numa sessão local no Mac. |

Caminhos avaliados e descartados (não reabrir sem motivo novo):
- **Expo Go para uso diário:** depende do Mac rodando `expo start`; não abre offline. Serve só para desenvolver.
- **PWA:** sem cronômetro com a tela bloqueada (iOS não roda web app em segundo plano nem agenda notificação local) e sem vibração.
- **SideStore/AltStore com .ipa:** funciona, mas é frágil (o iOS 26.4 quebrou a renovação do SideStore). Fica como alternativa: `npm run ipa`.
- **LiveContainer:** notificação local instável, o que quebra o alarme do descanso.
- **Swift nativo:** mesma restrição de assinatura, e as sessões na nuvem não compilam Swift. Só faria sentido para um app do Apple Watch, ao lado do atual.
- **Claude API dentro do app / conector MCP remoto:** API paga e exige internet; MCP remoto exige servidor.

## Stack

- **Expo SDK 58**, React Native 0.88, React 19, TypeScript estrito.
- **Expo Router** com rotas em `src/app/`. No iOS as abas são nativas (`expo-router/native-tabs`): Liquid Glass no iOS 26+, cronômetro no `BottomAccessory`. Na web as abas são em JS (`_layout.web.tsx`), só para a prévia.
- **expo-sqlite** com migrações por `PRAGMA user_version` (`src/db/schema.ts`; versão atual **4**).
- **expo-notifications** só local (`enableRemoteNotifications: false`, sem entitlement de push, para o Apple ID gratuito conseguir assinar).
- **react-native-svg** para gráficos feitos à mão (`src/components/charts.tsx`).
- expo-haptics, expo-file-system (API nova `File`/`Paths`), expo-document-picker, expo-sharing, expo-clipboard.
- **Testes:** Vitest no domínio (`src/domain/__tests__`) e unittest no importador Python (`tools/`).
- `.npmrc` com `legacy-peer-deps=true` (conflito de peer do react-dom com o SDK 58).
- **AGENTS.md:** a API do Expo muda a cada SDK. Antes de mexer numa API do Expo, consultar `https://docs.expo.dev/versions/v58.0.0/` e `https://docs.expo.dev/llms.txt`. Instalar pacotes com `npx expo install`.

## Arquitetura

```
src/domain/     regras puras, sem React (tudo com teste)
src/db/         SQLite: schema/migrações, consultas
src/state/      contexto do app (AppData), cronômetro, hook do motor de regras (useCoach), arquivos, lembretes
src/components/ peças de UI
src/app/        telas (Expo Router)
tools/          importador da planilha (Python) e build da .ipa
assets/plan/    ciclo embutido (JSON gerado da planilha)
data/           planilha original
docs/           formatos e guias para o usuário
specs/          este acompanhamento
```

Princípios:
- **Toda regra de negócio é função pura com teste**, em `src/domain`. Telas só orquestram.
- **Regras nunca mudam o plano sozinhas:** geram alertas e sugestões, e o usuário aceita ou ignora.
- **Os números das regras vêm do ciclo** (`ruleParams`), não do código, para ciclos novos feitos pelo Claude trazerem os seus.
- **Registro "conforme o plano" não inventa RPE.** O RPE só existe se o usuário informar; o app pede logo depois do principal.
- **Macros das refeições ficam gravados** no registro (snapshot): editar um alimento não muda o passado.

## Formatos de dados

- **Ciclo:** `fitapp.cycle/v1` — [docs/formato-ciclo.md](../docs/formato-ciclo.md). Gerado por `tools/import_plan.py` a partir da planilha; o mesmo formato o Claude usa.
- **Ajustes do Claude:** `fitapp.adjustments/v1` — operações `set_load`, `edit_item`, `add_item`, `remove_item`, `add_note`, `set_max`, `deload`, `skip_activation` ([docs/claude-treinador.md](../docs/claude-treinador.md), `src/domain/adjustments.ts`).
- **Backup:** `fitapp.backup/v1` — todas as tabelas (`src/db/dataRepo.ts`).
- **IDs do plano:** sessão `w<semana>-d<dia>` (dia 1 = segunda), item `w<semana>-d<dia>-<n>`, core `w<semana>-core-<n>`. Treino importado fora do plano: `extra:<data>:<título>`.

## Navegação atual

Abas: **Hoje · Comida · Corpo · Análises · Plano** (o iOS mostra no máximo 5).
- Corpo = Check-in, Peso e Medidas.
- Pela aba Plano: botão **Claude** abre a tela `dados` (pacote, resposta do Claude, importar, exportar, ciclos) e ⚙ abre `ajustes` (máximos, academia, alimentação, lembrete, teste de notificação).

## Comandos

```bash
npm test                 # Vitest (domínio)
npm run test:import      # importador Python
npm run typecheck        # tsc
npx expo lint
npx expo-doctor
npm run import-plan      # regera assets/plan a partir da planilha
npm run iphone           # Mac: instala no iPhone (Release, Apple ID gratuito)
npm run ipa              # Mac: .ipa sem assinatura para SideStore/AltStore
```

Prévia web (usada para conferir telas na nuvem): `npx expo export --platform web` e servir a pasta
com os cabeçalhos `Cross-Origin-Embedder-Policy: credentialless` e `Cross-Origin-Opener-Policy: same-origin`
(o expo-sqlite na web precisa deles; `metro.config.js` já os aplica no `expo start`).

## Git

- Branch de trabalho: `claude/chat-conversations-access-x7i6nh`.
- Um commit por feature ou incremento, com mensagem descritiva em português.
- Não criar PR sem o usuário pedir.
