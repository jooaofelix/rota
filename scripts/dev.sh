#!/usr/bin/env bash
# Sobe o ROTA localmente para você ver funcionando no navegador (ou no celular
# na mesma rede Wi-Fi, acessando o endereço "Network" que o Vite mostrar).
#
# Uso:
#   cd rota
#   chmod +x scripts/dev.sh
#   ./scripts/dev.sh

set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "Arquivo .env não encontrado. Criando a partir de .env.example..."
  cp .env.example .env
  echo
  echo "IMPORTANTE: abra o arquivo .env e preencha com as chaves do seu projeto"
  echo "Firebase antes de continuar (senão login/dados não vão funcionar)."
  echo
  read -p "Pressione Enter depois de preencher o .env para continuar... "
fi

if [ ! -d node_modules ]; then
  echo "-> Instalando dependências (primeira vez, pode demorar um pouco)..."
  npm install
fi

echo "-> Iniciando o servidor de desenvolvimento..."
echo "   Abra o endereço 'Local' que vai aparecer abaixo no navegador do celular"
echo "   ou computador. Para ver como app instalado, use o menu do navegador"
echo "   e escolha 'Adicionar à tela inicial' / 'Instalar app'."
echo
npm run dev
