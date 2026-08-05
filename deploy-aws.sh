#!/bin/bash

# Script de Deploy Automático para AWS EC2
# Uso: ./deploy-aws.sh

set -e

echo "=========================================="
echo "Easy Parking - Deploy AWS EC2"
echo "=========================================="

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Build Frontend
echo -e "${YELLOW}[1/4] Build do Frontend...${NC}"
cd front-end
npm install
npm run build
cd ..
echo -e "${GREEN}✓ Frontend buildado${NC}"

# 2. Build Backend
echo -e "${YELLOW}[2/4] Build do Backend...${NC}"
cd back-end
mvn clean package -DskipTests -q
cd ..
echo -e "${GREEN}✓ Backend compilado${NC}"

# 3. Build Docker
echo -e "${YELLOW}[3/4] Build da imagem Docker...${NC}"
docker build -t easy-parking:latest .
echo -e "${GREEN}✓ Docker image criada${NC}"

# 4. Parar container anterior (se existir)
echo -e "${YELLOW}[4/4] Iniciando aplicação...${NC}"
docker stop easy-parking 2>/dev/null || true
docker rm easy-parking 2>/dev/null || true

# 5. Iniciar novo container
docker run -d \
  -p 8080:8080 \
  --name easy-parking \
  -e SPRING_PROFILES_ACTIVE=prod \
  -e CORS_ORIGINS="https://easy-parking.com,https://www.easy-parking.com,https://api.easy-parking.com" \
  -e PAGBANK_NOTIFICATION_URL="https://api.easy-parking.com/api/pagbank/notifications" \
  easy-parking:latest

echo ""
echo "=========================================="
echo -e "${GREEN}✅ Deploy concluído com sucesso!${NC}"
echo "=========================================="
echo ""
echo "Acessar aplicação:"
echo "  http://localhost:8080"
echo ""
echo "Ver logs em tempo real:"
echo "  docker logs -f easy-parking"
echo ""
echo "Parar aplicação:"
echo "  docker stop easy-parking"
echo ""
