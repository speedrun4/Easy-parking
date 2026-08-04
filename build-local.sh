#!/bin/bash

# Script de Build Local para Teste
# Uso: ./build-local.sh

set -e

echo "=========================================="
echo "Easy Parking - Build Local"
echo "=========================================="

# 1. Build Frontend
echo "[1/3] Build do Frontend Angular..."
cd front-end
npm install
npm run build
cd ..

# 2. Build Backend
echo "[2/3] Build do Backend Java..."
cd back-end
mvn clean package -DskipTests
cd ..

# 3. Build Docker
echo "[3/3] Build da imagem Docker..."
docker build -t easy-parking:local .

echo ""
echo "=========================================="
echo "✅ Build concluído!"
echo "=========================================="
echo ""
echo "Para executar localmente com Docker Compose:"
echo "  docker-compose up -d"
echo ""
echo "Para parar:"
echo "  docker-compose down"
echo ""
