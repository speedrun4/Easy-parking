#!/bin/bash

# Script de Deploy Automático para Google Cloud
# Uso: ./deploy.sh [version]

set -e

PROJECT_ID=${GCP_PROJECT_ID:-"easy-parking-prod"}
REGION=${GCP_REGION:-"us-central1"}
SERVICE_NAME="easy-parking"
VERSION=${1:-"latest"}

echo "=========================================="
echo "Easy Parking - Deploy Script"
echo "=========================================="
echo "Projeto: $PROJECT_ID"
echo "Região: $REGION"
echo "Versão: $VERSION"
echo ""

# 1. Configurar projeto
echo "[1/5] Configurando Google Cloud..."
gcloud config set project $PROJECT_ID

# 2. Build local
echo "[2/5] Build da imagem Docker..."
docker build -t gcr.io/$PROJECT_ID/$SERVICE_NAME:$VERSION .

# 3. Push para Container Registry
echo "[3/5] Enviando imagem para Container Registry..."
docker push gcr.io/$PROJECT_ID/$SERVICE_NAME:$VERSION

# 4. Deploy no Cloud Run
echo "[4/5] Fazendo deploy no Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME:$VERSION \
  --platform managed \
  --region $REGION \
  --memory 1Gi \
  --cpu 1 \
  --timeout 3600 \
  --max-instances 10 \
  --allow-unauthenticated \
  --set-env-vars SPRING_PROFILES_ACTIVE=prod

# 5. Obter URL
echo "[5/5] Finalizando..."
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
  --region $REGION \
  --format='value(status.address.url)')

echo ""
echo "=========================================="
echo "✅ Deploy concluído com sucesso!"
echo "=========================================="
echo "URL da aplicação: $SERVICE_URL"
echo ""
echo "Próximas etapas:"
echo "1. Testar: curl $SERVICE_URL"
echo "2. Ver logs: gcloud run services logs read $SERVICE_NAME --region $REGION --limit 50"
echo "3. Configurar domínio customizado no Console do GCP"
echo ""
