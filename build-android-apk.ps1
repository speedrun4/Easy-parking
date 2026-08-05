# Easy Parking - Build APK (Solucao Simples)
# Gera APK unsigned e assina depois

Write-Host "=== Easy Parking - APK Build ===" -ForegroundColor Cyan
Write-Host ""

# Verificar se estamos na pasta raiz
if (-Not (Test-Path "front-end/package.json")) {
    Write-Host "ERRO: Execute na pasta raiz" -ForegroundColor Red
    exit 1
}

# Verificar Java
if (-Not (Get-Command java -ErrorAction SilentlyContinue)) {
    Write-Host "ERRO: Java nao encontrado" -ForegroundColor Red
    exit 1
}

Write-Host "[1/6] NPM Install..." -ForegroundColor Yellow
cd front-end
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
Write-Host "OK" -ForegroundColor Green
Write-Host ""

Write-Host "[4/6] Preparar Keystore..." -ForegroundColor Yellow
cd android
$KEYSTORE = "app/easy-parking.keystore"

if (-Not (Test-Path $KEYSTORE)) {
    Write-Host ""
    Write-Host "Nenhum keystore. Criando novo..." -ForegroundColor Cyan
    
    $KEYSTORE_PASSWORD = Read-Host "Senha do keystore"
    $ALIAS_PASSWORD = Read-Host "Senha do alias"
    
    keytool -genkey -v -keystore $KEYSTORE -keyalg RSA -keysize 2048 -validity 10000 -alias easy-parking -storepass $KEYSTORE_PASSWORD -keypass $ALIAS_PASSWORD -dname "CN=Easy Parking, OU=Dev, O=Easy Parking, L=Brazil, S=SP, C=BR" 2>&1 | Out-Null
    
    if (-Not (Test-Path $KEYSTORE)) {
        Write-Host "ERRO ao criar keystore" -ForegroundColor Red
        exit 1
    }
}

Write-Host "OK - Keystore pronto" -ForegroundColor Green
Write-Host ""

Write-Host "[5/6] Build APK..." -ForegroundColor Yellow
.\gradlew.bat assembleRelease -q
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO no build" -ForegroundColor Red
    exit 1
}
Write-Host "OK" -ForegroundColor Green
Write-Host ""

Write-Host "[6/6] Assinar APK..." -ForegroundColor Yellow
$KEYSTORE_PASSWORD = Read-Host "Senha do keystore"
$ALIAS_PASSWORD = Read-Host "Senha do alias"

$APK_UNSIGNED = "app/build/outputs/apk/release/app-release-unsigned.apk"
$APK_SIGNED = "app/release/app-release.apk"

if (-Not (Test-Path "app/release")) {
    New-Item -ItemType Directory -Path "app/release" | Out-Null
}

# Usar jarsigner do Java
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA256 -keystore $KEYSTORE -storepass $KEYSTORE_PASSWORD -keypass $ALIAS_PASSWORD $APK_UNSIGNED easy-parking -signedjar $APK_SIGNED 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0 -And (Test-Path $APK_SIGNED)) {
    Write-Host "OK" -ForegroundColor Green
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "SUCESSO! APK GERADO!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    $SIZE = [math]::Round((Get-Item $APK_SIGNED).Length / 1MB, 2)
    Write-Host "APK: $APK_SIGNED" -ForegroundColor Cyan
    Write-Host "Tamanho: $SIZE MB" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Proximos passos:" -ForegroundColor Yellow
    Write-Host "1. Copie o APK para seu Android" -ForegroundColor White
    Write-Host "2. Abra e instale" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "ERRO ao assinar APK" -ForegroundColor Red
    exit 1
}
