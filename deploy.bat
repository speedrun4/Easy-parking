@echo off
REM Script de Deploy Automático para Google Cloud (Windows)
REM Uso: deploy.bat [version]

setlocal enabledelayedexpansion

set PROJECT_ID=%GCP_PROJECT_ID%
if "!PROJECT_ID!"=="" set PROJECT_ID=easy-parking-prod

set REGION=%GCP_REGION%
if "!REGION!"=="" set REGION=us-central1

set SERVICE_NAME=easy-parking
set VERSION=%1
if "!VERSION!"=="" set VERSION=latest

echo ==========================================
echo Easy Parking - Deploy Script (Windows)
echo ==========================================
echo Projeto: !PROJECT_ID!
echo Região: !REGION!
echo Versão: !VERSION!
echo.

REM 1. Configurar projeto
echo [1/5] Configurando Google Cloud...
call gcloud config set project !PROJECT_ID!

REM 2. Build local
echo [2/5] Build da imagem Docker...
call docker build -t gcr.io/!PROJECT_ID!/!SERVICE_NAME!:!VERSION! .

if errorlevel 1 (
    echo Erro no build da imagem Docker.
    exit /b 1
)

REM 3. Push para Container Registry
echo [3/5] Enviando imagem para Container Registry...
call docker push gcr.io/!PROJECT_ID!/!SERVICE_NAME!:!VERSION!

if errorlevel 1 (
    echo Erro ao fazer push da imagem.
    exit /b 1
)

REM 4. Deploy no Cloud Run
echo [4/5] Fazendo deploy no Cloud Run...
call gcloud run deploy !SERVICE_NAME! ^
  --image gcr.io/!PROJECT_ID!/!SERVICE_NAME!:!VERSION! ^
  --platform managed ^
  --region !REGION! ^
  --memory 1Gi ^
  --cpu 1 ^
  --timeout 3600 ^
  --max-instances 10 ^
  --allow-unauthenticated ^
  --set-env-vars SPRING_PROFILES_ACTIVE=prod

if errorlevel 1 (
    echo Erro no deploy para Cloud Run.
    exit /b 1
)

REM 5. Obter URL
echo [5/5] Finalizando...
for /f "tokens=*" %%A in ('gcloud run services describe !SERVICE_NAME! --region !REGION! --format="value(status.address.url)"') do (
    set SERVICE_URL=%%A
)

echo.
echo ==========================================
echo Deploy concluído com sucesso!
echo ==========================================
echo URL da aplicação: !SERVICE_URL!
echo.
echo Próximas etapas:
echo 1. Testar: curl !SERVICE_URL!
echo 2. Ver logs: gcloud run services logs read !SERVICE_NAME! --region !REGION! --limit 50
echo 3. Configurar domínio customizado no Console do GCP
echo.

endlocal
