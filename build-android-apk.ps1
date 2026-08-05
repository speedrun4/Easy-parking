# Easy Parking - Build APK (Release Assinado)
# Gera APK assinado via Gradle (assinatura Android valida)

Write-Host "=== Easy Parking - APK Build ===" -ForegroundColor Cyan
Write-Host ""

$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path
$FRONTEND_DIR = Join-Path $ROOT "front-end"
$ANDROID_DIR = Join-Path $FRONTEND_DIR "android"
$LOCAL_JDK = Join-Path $FRONTEND_DIR ".jdk/jdk-17"
$LOCAL_SDK = Join-Path $FRONTEND_DIR ".android-sdk"

# Verificar estrutura minima do projeto
if (-Not (Test-Path (Join-Path $FRONTEND_DIR "package.json"))) {
    Write-Host "ERRO: Estrutura invalida. Nao encontrei front-end/package.json" -ForegroundColor Red
    exit 1
}

# Verificar Java
if (-Not (Get-Command java -ErrorAction SilentlyContinue)) {
    Write-Host "ERRO: Java nao encontrado" -ForegroundColor Red
    exit 1
}

# Forcar JDK 17 para compatibilidade com Gradle 7.x
if (-Not (Test-Path $LOCAL_JDK)) {
    Write-Host "ERRO: JDK 17 local nao encontrado em $LOCAL_JDK" -ForegroundColor Red
    exit 1
}

$env:JAVA_HOME = $LOCAL_JDK
$env:Path = "$($env:JAVA_HOME)\\bin;$env:Path"

Write-Host "[1/6] NPM Install..." -ForegroundColor Yellow
Set-Location $FRONTEND_DIR
if (-Not (Test-Path "node_modules")) {
    npm install --legacy-peer-deps
}
Write-Host "OK" -ForegroundColor Green
Write-Host ""

Write-Host "[2/6] Build Angular..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO no build Angular" -ForegroundColor Red
    exit 1
}
Write-Host "OK" -ForegroundColor Green
Write-Host ""

Write-Host "[3/6] Capacitor Sync..." -ForegroundColor Yellow
npx cap sync android --quiet 2>$null

if (-Not (Test-Path $ANDROID_DIR)) {
    Write-Host "Plataforma Android ausente. Recriando com Capacitor..." -ForegroundColor Cyan
    npx cap add android
    if ($LASTEXITCODE -ne 0 -or -Not (Test-Path $ANDROID_DIR)) {
        Write-Host "ERRO ao recriar plataforma Android" -ForegroundColor Red
        exit 1
    }
}
Write-Host "OK" -ForegroundColor Green
Write-Host ""

Write-Host "[4/6] Preparar Keystore..." -ForegroundColor Yellow
Set-Location $ANDROID_DIR
$KEYSTORE = "app/easy-parking.keystore"
$KEYSTORE_ABS = Join-Path $ANDROID_DIR $KEYSTORE

if (Test-Path $LOCAL_SDK) {
    $SDK_ESCAPED = $LOCAL_SDK -replace "\\", "\\\\"
    Set-Content -Path "local.properties" -Value "sdk.dir=$SDK_ESCAPED"
}

if (-Not (Test-Path $KEYSTORE_ABS)) {
    Write-Host ""
    Write-Host "Nenhum keystore. Criando novo..." -ForegroundColor Cyan
    
    $KEYSTORE_PASSWORD = Read-Host "Senha do keystore"
    $ALIAS_PASSWORD = Read-Host "Senha do alias"
    
    keytool -genkey -v -keystore $KEYSTORE_ABS -keyalg RSA -keysize 2048 -validity 10000 -alias easy-parking -storepass $KEYSTORE_PASSWORD -keypass $ALIAS_PASSWORD -dname "CN=Easy Parking, OU=Dev, O=Easy Parking, L=Brazil, S=SP, C=BR" 2>&1 | Out-Null
    
    if (-Not (Test-Path $KEYSTORE_ABS)) {
        Write-Host "ERRO ao criar keystore" -ForegroundColor Red
        exit 1
    }
}

Write-Host "OK - Keystore pronto" -ForegroundColor Green
Write-Host ""

Write-Host "[5/6] Build APK..." -ForegroundColor Yellow
$KEYSTORE_PASSWORD = Read-Host "Senha do keystore"
$ALIAS_PASSWORD = Read-Host "Senha do alias"

.\gradlew.bat assembleRelease -q `
    -PkeystorePath="$KEYSTORE_ABS" `
    -PkeystorePassword="$KEYSTORE_PASSWORD" `
    -PkeyAlias="easy-parking" `
    -PkeyPassword="$ALIAS_PASSWORD"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO no build" -ForegroundColor Red
    exit 1
}
Write-Host "OK" -ForegroundColor Green
Write-Host ""

Write-Host "[6/6] Copiar APK assinado..." -ForegroundColor Yellow

$APK_SIGNED = "app/build/outputs/apk/release/app-release.apk"
$APK_OUTPUT = "app/release/app-release.apk"

if (-Not (Test-Path "app/release")) {
    New-Item -ItemType Directory -Path "app/release" | Out-Null
}

Copy-Item $APK_SIGNED $APK_OUTPUT -Force

if ((Test-Path $APK_OUTPUT)) {
    Write-Host "OK" -ForegroundColor Green
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "SUCESSO! APK GERADO!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    $SIZE = [math]::Round((Get-Item $APK_OUTPUT).Length / 1MB, 2)
    Write-Host "APK: $APK_OUTPUT" -ForegroundColor Cyan
    Write-Host "Tamanho: $SIZE MB" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Proximos passos:" -ForegroundColor Yellow
    Write-Host "1. Copie o APK para seu Android" -ForegroundColor White
    Write-Host "2. Abra e instale" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "ERRO ao gerar APK assinado" -ForegroundColor Red
    exit 1
}
