@echo off
REM Script de Deploy Automático para AWS EC2 (Windows)
REM Uso: deploy-aws.bat

setlocal enabledelayedexpansion

echo ==========================================
echo Easy Parking - Deploy AWS EC2 (Windows)
echo ==========================================
echo.

REM 1. Build Frontend
echo [1/4] Build do Frontend...
cd front-end
call npm install
call npm run build
cd ..
echo [OK] Frontend buildado
echo.

REM 2. Build Backend
echo [2/4] Build do Backend...
cd back-end
call mvn clean package -DskipTests -q
cd ..
if errorlevel 1 (
    echo Erro no build do backend
    exit /b 1
)
echo [OK] Backend compilado
echo.

REM 3. Build Docker
echo [3/4] Build da imagem Docker...
call docker build -t easy-parking:latest .
if errorlevel 1 (
    echo Erro no build do Docker
    exit /b 1
)
echo [OK] Docker image criada
echo.

REM 4. Parar container anterior
echo [4/4] Iniciando aplicacao...
call docker stop easy-parking >nul 2>&1
call docker rm easy-parking >nul 2>&1

REM 5. Iniciar novo container
call docker run -d ^
  -p 8080:8080 ^
  --name easy-parking ^
  -e SPRING_PROFILES_ACTIVE=prod ^
  easy-parking:latest

if errorlevel 1 (
    echo Erro ao iniciar container
    exit /b 1
)

echo.
echo ==========================================
echo Deploy concluido com sucesso!
echo ==========================================
echo.
echo Acessar aplicacao:
echo   http://localhost:8080
echo.
echo Ver logs em tempo real:
echo   docker logs -f easy-parking
echo.
echo Parar aplicacao:
echo   docker stop easy-parking
echo.

endlocal
