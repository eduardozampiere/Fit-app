#!/usr/bin/env bash
# Gera build/DiarioDeTreino.ipa (sem assinatura) para instalar com SideStore, AltStore ou Sideloadly,
# que assinam com o seu Apple ID. Roda só no Mac, com Xcode instalado.
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ "$(uname)" != "Darwin" ]]; then
  echo "Este script precisa rodar no Mac (Xcode)." >&2
  exit 1
fi

echo "› Gerando o projeto iOS (expo prebuild)…"
npx expo prebuild --platform ios --no-install
(cd ios && pod install)

WORKSPACE=$(ls -d ios/*.xcworkspace | head -n 1)
SCHEME=$(basename "$WORKSPACE" .xcworkspace)
echo "› Compilando $SCHEME em Release (sem assinatura)…"

xcodebuild \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration Release \
  -sdk iphoneos \
  -destination 'generic/platform=iOS' \
  -derivedDataPath build/ios \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY="" \
  build | (command -v xcpretty >/dev/null && xcpretty || cat)

APP=$(ls -d build/ios/Build/Products/Release-iphoneos/*.app | head -n 1)
rm -rf build/Payload build/DiarioDeTreino.ipa
mkdir -p build/Payload
cp -R "$APP" build/Payload/
(cd build && zip -qr DiarioDeTreino.ipa Payload)
rm -rf build/Payload

echo "✓ build/DiarioDeTreino.ipa pronto."
