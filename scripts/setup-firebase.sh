#!/usr/bin/env bash
# Configura o backend Firebase do ROTA a partir da sua máquina local.
#
# Faz login na sua conta Google, liga este repositório ao seu projeto Firebase
# e publica: regras do Firestore/Storage, índices e (se você tiver o plano
# Blaze) as Cloud Functions.
#
# Pré-requisitos antes de rodar este script:
#   1. Ter criado o projeto no https://console.firebase.google.com
#   2. Ter ativado Authentication (E-mail/senha + Google), Firestore, Storage
#      e Cloud Messaging (ver README.md, seção "Configurar o Firebase")
#
# O plano Blaze (pago) é OPCIONAL: sem ele, as regras/índices são publicados
# normalmente e o app funciona (login, rotina, pontos, recompensas manuais).
# Só ficam de fora: notificações push, lembretes agendados e o cálculo de
# pontos/conquistas feito no servidor (nesse caso o próprio app do paciente
# calcula isso, ver README.md).
#
# Uso:
#   cd rota
#   chmod +x scripts/setup-firebase.sh
#   ./scripts/setup-firebase.sh

set -euo pipefail
cd "$(dirname "$0")/.."

echo "== ROTA - configuração do Firebase =="
echo

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js não encontrado. Instale o Node 20+ antes de continuar: https://nodejs.org"
  exit 1
fi

echo "-> Verificando o Firebase CLI..."
if ! command -v firebase >/dev/null 2>&1; then
  echo "   Firebase CLI não encontrado globalmente, será usado via 'npx firebase-tools'."
  FIREBASE="npx --yes firebase-tools"
else
  FIREBASE="firebase"
fi

echo
echo "-> Login na sua conta Google (abre o navegador)..."
$FIREBASE login

echo
echo "-> Selecione o projeto Firebase que você criou para o ROTA:"
$FIREBASE use --add

echo
echo "-> Publicando regras do Firestore, índices e regras do Storage..."
echo "   (isso funciona no plano gratuito, sem precisar de Blaze)"
$FIREBASE deploy --only firestore:rules,firestore:indexes,storage:rules

echo
read -p "Você tem o plano Blaze ativo e quer publicar as Cloud Functions agora? [s/N] " resposta
if [[ "$resposta" =~ ^[sS]$ ]]; then
  echo
  echo "-> Instalando dependências das Cloud Functions..."
  (cd functions && npm install && npm run build)

  echo
  echo "-> Publicando as Cloud Functions..."
  $FIREBASE deploy --only functions
else
  echo
  echo "   Ok, pulando as Cloud Functions. O app funciona normalmente sem elas"
  echo "   (só ficam de fora notificações push e lembretes agendados)."
  echo "   Quando quiser ativar, rode: firebase deploy --only functions"
fi

echo
echo "== Concluído! =="
echo "Agora preencha o arquivo .env (copie de .env.example) com as chaves do"
echo "mesmo projeto Firebase (Configurações do projeto > Geral > Seus apps)"
echo "e as mesmas variáveis no Worker da Cloudflare, se ainda não fez isso."
