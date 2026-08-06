param(
    [string]$ProjectId,
    [string]$Region = "us-central1",
    [string]$ServiceName = "easy-parking",
    [string]$Version = "latest",
    [switch]$UpdateFrontendProdUrl
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Get-EnvFile {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        throw "Arquivo .env nao encontrado em $Path. Copie .env.example para .env e preencha os valores."
    }

    $map = @{}
    Get-Content $Path | ForEach-Object {
        $line = $_.Trim()
        if ([string]::IsNullOrWhiteSpace($line) -or $line.StartsWith("#")) {
            return
        }

        $idx = $line.IndexOf("=")
        if ($idx -lt 1) {
            return
        }

        $key = $line.Substring(0, $idx).Trim()
        $val = $line.Substring($idx + 1).Trim()

        if ($val.StartsWith('"') -and $val.EndsWith('"')) {
            $val = $val.Substring(1, $val.Length - 2)
        }

        $map[$key] = $val
    }

    return $map
}

function Escape-YamlValue {
    param([string]$Value)

    if ($null -eq $Value) {
        return "''"
    }

    $escaped = $Value.Replace("'", "''")
    return "'$escaped'"
}

function Get-GCloudValue {
    param(
        [Parameter(Mandatory = $true)][string]$Command,
        [switch]$AllowError
    )

    $output = Invoke-Expression $Command 2>$null
    if (-not $AllowError -and $LASTEXITCODE -ne 0) {
        throw "Falha ao executar: $Command"
    }

    if ($null -eq $output) {
        return ""
    }

    return ($output | Out-String).Trim()
}

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

$envPath = Join-Path $repoRoot ".env"
$envMap = Get-EnvFile -Path $envPath

if (-not $ProjectId -or [string]::IsNullOrWhiteSpace($ProjectId)) {
    if ($envMap.ContainsKey("GCP_PROJECT_ID") -and -not [string]::IsNullOrWhiteSpace($envMap["GCP_PROJECT_ID"])) {
        $ProjectId = $envMap["GCP_PROJECT_ID"]
    }
}

if (-not $ProjectId -or [string]::IsNullOrWhiteSpace($ProjectId)) {
    throw "ProjectId nao informado. Use -ProjectId ou defina GCP_PROJECT_ID no .env"
}

if ($envMap.ContainsKey("GCP_REGION") -and -not [string]::IsNullOrWhiteSpace($envMap["GCP_REGION"])) {
    $Region = $envMap["GCP_REGION"]
}

$requiredKeys = @(
    "MYSQL_IP",
    "MYSQL_PORT",
    "MYSQL_DB",
    "MYSQL_USER",
    "MYSQL_PASSWORD",
    "MAIL_HOST",
    "MAIL_PORT",
    "MAIL_USERNAME",
    "MAIL_PASSWORD",
    "PAGBANK_EMAIL",
    "PAGBANK_TOKEN",
    "PAGBANK_CLIENT_ID",
    "PAGBANK_CLIENT_SECRET",
    "PAGBANK_NOTIFICATION_URL",
    "PIX_KEY",
    "CORS_ORIGINS"
)

$missing = @()
foreach ($k in $requiredKeys) {
    if (-not $envMap.ContainsKey($k) -or [string]::IsNullOrWhiteSpace($envMap[$k])) {
        $missing += $k
    }
}

if ($missing.Count -gt 0) {
    throw "Variaveis ausentes no .env: $($missing -join ', ')"
}

$tmpEnvFile = $null
$tmpYamlFile = $null

try {
    Write-Step "Verificando gcloud"
    $gcloudCmd = Get-Command gcloud -ErrorAction SilentlyContinue
    if (-not $gcloudCmd) {
        throw "gcloud CLI nao encontrado. Instale o Google Cloud SDK antes de continuar."
    }

    Write-Step "Verificando autenticacao"
    $activeAccountRaw = gcloud auth list --format="value(account)" 2>$null
    $activeAccount = ""
    if ($activeAccountRaw) {
        $activeAccount = ($activeAccountRaw | Select-Object -First 1 | Out-String).Trim()
    }

    if ([string]::IsNullOrWhiteSpace($activeAccount)) {
        Write-Host "Nenhuma conta ativa no gcloud. Abrindo login..." -ForegroundColor Yellow
        gcloud auth login | Out-Host
    }

    Write-Step "Configurando projeto"
    gcloud config set project $ProjectId | Out-Host

    Write-Step "Validando faturamento do projeto"
    $billingEnabled = Get-GCloudValue -Command "gcloud billing projects describe $ProjectId --format='value(billingEnabled)'" -AllowError
    if ([string]::IsNullOrWhiteSpace($billingEnabled) -or $billingEnabled.ToLowerInvariant() -ne "true") {
        throw "Faturamento desativado no projeto '$ProjectId'. Ative o billing no Google Cloud Console e execute novamente."
    }

    Write-Step "Ativando APIs necessarias"
    gcloud services enable run.googleapis.com cloudbuild.googleapis.com sqladmin.googleapis.com containerregistry.googleapis.com artifactregistry.googleapis.com | Out-Host

    $image = "gcr.io/$ProjectId/$ServiceName`:$Version"

    Write-Step "Build remoto com Cloud Build"
    gcloud builds submit --tag $image . | Out-Host

    $tmpEnvFile = [System.IO.Path]::GetTempFileName()
    $tmpYamlFile = [System.IO.Path]::ChangeExtension($tmpEnvFile, ".yaml")

    $envForRun = @{
        "SPRING_PROFILES_ACTIVE" = "prod"
        "MYSQL_IP" = $envMap["MYSQL_IP"]
        "MYSQL_PORT" = $envMap["MYSQL_PORT"]
        "MYSQL_DB" = $envMap["MYSQL_DB"]
        "MYSQL_USER" = $envMap["MYSQL_USER"]
        "MYSQL_PASSWORD" = $envMap["MYSQL_PASSWORD"]
        "MAIL_HOST" = $envMap["MAIL_HOST"]
        "MAIL_PORT" = $envMap["MAIL_PORT"]
        "MAIL_USERNAME" = $envMap["MAIL_USERNAME"]
        "MAIL_PASSWORD" = $envMap["MAIL_PASSWORD"]
        "PAGBANK_EMAIL" = $envMap["PAGBANK_EMAIL"]
        "PAGBANK_TOKEN" = $envMap["PAGBANK_TOKEN"]
        "PAGBANK_CLIENT_ID" = $envMap["PAGBANK_CLIENT_ID"]
        "PAGBANK_CLIENT_SECRET" = $envMap["PAGBANK_CLIENT_SECRET"]
        "PAGBANK_NOTIFICATION_URL" = $envMap["PAGBANK_NOTIFICATION_URL"]
        "PIX_KEY" = $envMap["PIX_KEY"]
        "CORS_ORIGINS" = $envMap["CORS_ORIGINS"]
    }

    $yamlLines = @()
    foreach ($entry in $envForRun.GetEnumerator()) {
        $yamlLines += "$($entry.Key): $(Escape-YamlValue -Value $entry.Value)"
    }

    Set-Content -Path $tmpYamlFile -Value ($yamlLines -join [Environment]::NewLine) -Encoding UTF8

    Write-Step "Deploy no Cloud Run"
    gcloud run deploy $ServiceName `
        --image $image `
        --platform managed `
        --region $Region `
        --allow-unauthenticated `
        --memory 1Gi `
        --cpu 1 `
        --timeout 3600 `
        --max-instances 10 `
        --env-vars-file $tmpYamlFile | Out-Host

    Write-Step "Obtendo URL publica do servico"
    $serviceUrlRaw = gcloud run services describe $ServiceName --region $Region --format="value(status.url)" 2>$null
    $serviceUrl = ""
    if ($serviceUrlRaw) {
        $serviceUrl = ($serviceUrlRaw | Out-String).Trim()
    }

    if ([string]::IsNullOrWhiteSpace($serviceUrl)) {
        throw "Nao foi possivel obter a URL do Cloud Run"
    }

    Write-Host "`nCloud Run URL: $serviceUrl" -ForegroundColor Green

    if ($UpdateFrontendProdUrl.IsPresent) {
        $frontendEnvFile = Join-Path $repoRoot "front-end/src/environments/environment.prod.ts"
        if (Test-Path $frontendEnvFile) {
            Write-Step "Atualizando apiBaseUrl no front-end"
            $content = Get-Content -Raw -Path $frontendEnvFile
            $updated = [regex]::Replace(
                $content,
                "apiBaseUrl\s*:\s*'[^']*'",
                "apiBaseUrl: '$serviceUrl'"
            )

            if ($updated -ne $content) {
                Set-Content -Path $frontendEnvFile -Value $updated -Encoding UTF8
                Write-Host "Arquivo atualizado: $frontendEnvFile" -ForegroundColor Green
            } else {
                Write-Host "Nao foi necessario alterar apiBaseUrl em $frontendEnvFile" -ForegroundColor Yellow
            }
        }
    }

    Write-Host "`nDeploy cloud-only concluido com sucesso." -ForegroundColor Green
    Write-Host "Proximo passo para APK final: .\build-android-apk.ps1" -ForegroundColor Green
}
finally {
    Write-Step "Limpando arquivos temporarios"
    if ($tmpEnvFile -and (Test-Path $tmpEnvFile)) { Remove-Item $tmpEnvFile -Force }
    if ($tmpYamlFile -and (Test-Path $tmpYamlFile)) { Remove-Item $tmpYamlFile -Force }
}
