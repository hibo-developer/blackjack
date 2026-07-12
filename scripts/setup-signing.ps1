param(
    [string]$KeystorePath = "android/keystore/blackjack-release.jks",
    [string]$KeyAlias = "blackjack_key",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Write-Info($text) {
    Write-Host "[INFO] $text" -ForegroundColor Cyan
}

function Write-Ok($text) {
    Write-Host "[OK] $text" -ForegroundColor Green
}

function Write-WarnText($text) {
    Write-Host "[WARN] $text" -ForegroundColor Yellow
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

$keytoolCmd = Get-Command keytool -ErrorAction SilentlyContinue
if (-not $keytoolCmd) {
    throw "No se encontro keytool. Instala JDK 17 y asegurate de tener keytool en PATH."
}

if ($DryRun) {
    Write-Ok "Validacion OK: keytool disponible en PATH."
    Write-Info "DryRun completado. No se genero keystore ni se pidieron contrasenas."
    exit 0
}

$keystoreFullPath = Join-Path $repoRoot $KeystorePath
$keystoreDir = Split-Path -Parent $keystoreFullPath
if (-not (Test-Path $keystoreDir)) {
    New-Item -ItemType Directory -Path $keystoreDir | Out-Null
}

if (-not (Test-Path $keystoreFullPath)) {
    Write-Info "Se generara un nuevo keystore en: $keystoreFullPath"
    Write-Info "keytool pedira las contrasenas y datos del certificado en la consola."

    & keytool -genkeypair -v -storetype PKCS12 -keystore $keystoreFullPath -alias $KeyAlias -keyalg RSA -keysize 2048 -validity 10000
    if ($LASTEXITCODE -ne 0) {
        throw "Fallo la generacion del keystore."
    }
    Write-Ok "Keystore generado correctamente."
} else {
    Write-WarnText "Ya existe keystore en $keystoreFullPath. Se reutilizara."
}

$storePasswordSecure = Read-Host "Ingresa storePassword del keystore" -AsSecureString
$keyPasswordSecure = Read-Host "Ingresa keyPassword del alias" -AsSecureString

$storePassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($storePasswordSecure))
$keyPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($keyPasswordSecure))

if ([string]::IsNullOrWhiteSpace($storePassword) -or [string]::IsNullOrWhiteSpace($keyPassword)) {
    throw "Las contrasenas no pueden estar vacias."
}

$androidDir = Join-Path $repoRoot "android"
$appDir = Join-Path $androidDir "app"
$keystorePropertiesPath = Join-Path $androidDir "keystore.properties"
$relativeStoreFile = [System.IO.Path]::GetRelativePath($appDir, $keystoreFullPath) -replace "\\", "/"

$propertiesContent = @(
    "storeFile=$relativeStoreFile"
    "storePassword=$storePassword"
    "keyAlias=$KeyAlias"
    "keyPassword=$keyPassword"
) -join "`r`n"

Set-Content -Path $keystorePropertiesPath -Value $propertiesContent -Encoding ASCII
Write-Ok "Archivo generado: $keystorePropertiesPath"

Write-Info "Siguiente paso recomendado: npm run android:build"
