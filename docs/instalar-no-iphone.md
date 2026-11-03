# Instalar no iPhone (Apple ID gratuito)

O app é instalado de verdade no iPhone: abre offline, sem servidor, com cronômetro e notificações.
Com Apple ID gratuito, a assinatura vale **7 dias**. Quando vence, o app só para de abrir.
**Os dados ficam guardados**: basta reinstalar que volta tudo. Nunca apague o app do iPhone, porque isso apaga os dados.

> Dica: crie um lembrete semanal no iPhone (ex.: domingo à noite) para renovar antes de vencer no meio do treino.

## Preparação (uma vez só)

1. **Xcode:** instale pela App Store do Mac e abra uma vez para concluir a instalação.
2. **Apple ID no Xcode:** Xcode → Settings → Accounts → `+` → Apple ID.
3. **Ferramentas:** no Terminal, `xcode-select --install` (se pedir) e `sudo gem install cocoapods` (ou `brew install cocoapods`).
4. **Modo de Desenvolvedor no iPhone:** Ajustes → Privacidade e Segurança → Modo de Desenvolvedor → ligar (o iPhone reinicia).
   A opção só aparece depois que o iPhone é conectado a um Mac com Xcode pelo menos uma vez.
5. **Projeto:**
   ```bash
   git clone https://github.com/eduardozampiere/Fit-app && cd Fit-app
   npm install
   ```

## Caminho 1: instalar direto pelo Xcode (recomendado)

Com o iPhone ligado no cabo e desbloqueado:

```bash
npm run iphone
```

- Na primeira vez, o comando gera a pasta `ios/` e compila (demora alguns minutos).
- Se pedir para escolher o **time de desenvolvimento**, escolha o seu nome (*Personal Team*).
- Se der erro de assinatura (*Signing*), abra `ios/*.xcworkspace` no Xcode → alvo do app →
  **Signing & Capabilities** → marque *Automatically manage signing* → **Team**: seu nome (*Personal Team*).
  Depois rode `npm run iphone` de novo.
- Na primeira instalação, o iPhone bloqueia o app até você confiar no certificado:
  Ajustes → Geral → **VPN e Gerenciamento de Dispositivos** → seu Apple ID → **Confiar**.

**Toda semana:** iPhone no cabo → `npm run iphone`.

Sem cabo, é possível instalar pelo Wi‑Fi: no Xcode → Window → Devices and Simulators, marque
*Connect via network* com o iPhone no cabo uma vez. Depois disso, com os dois na mesma rede, o comando funciona sem cabo.

## Caminho 2: gerar .ipa e usar SideStore ou AltStore

Útil se você quiser renovar **pelo próprio iPhone** (SideStore) ou **automaticamente pelo Wi‑Fi** (AltStore + AltServer no Mac).

```bash
npm run ipa        # gera build/DiarioDeTreino.ipa
```

Abra a `.ipa` no SideStore, AltStore ou Sideloadly, que assinam com o seu Apple ID.

Atenção: são ferramentas de terceiros e podem quebrar a cada atualização do iOS (o iOS 26.4 quebrou a renovação
do SideStore por um tempo). Se parar de funcionar, o Caminho 1 continua valendo.
Use sempre o mesmo identificador do app (`com.zampiere.fitapp`) para os dados continuarem os mesmos.

## Limites da conta gratuita

- 7 dias de validade por instalação.
- Até 3 apps instalados assim ao mesmo tempo, e 10 identificadores de app por semana.
- Sem HealthKit, widgets ou iCloud (exigem a conta paga de US$ 99/ano).

## Durante o desenvolvimento

Para testar mudanças rápido, use o Expo Go: `npx expo login` e depois `npx expo start`, com o iPhone na mesma rede.
Pelo Expo Go, o app precisa do Mac ligado. Na academia, use o app instalado por um dos caminhos acima.
