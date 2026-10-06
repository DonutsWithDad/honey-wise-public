<#
.SYNOPSIS
    One command to run HoneyWise locally: database, migrations, API and web app.

.DESCRIPTION
    Safe to re-run; every step skips itself when there is nothing to do.
      1. Checks the .NET SDK, Node and (if used) Docker are installed.
      2. Creates .env from .env.example on first run.
      3. Starts Postgres in Docker (unless USE_DOCKER_DB=false in .env).
      4. Applies database migrations and local demo data.
      5. Generates a JWT signing secret into user-secrets if there isn't one.
      6. Installs web dependencies if needed.
      7. Runs the API (http://localhost:20000) and web app (http://localhost:4200)
         until you press Ctrl+C.

.PARAMETER SetupOnly
    Do steps 1-6 and exit without starting the API and web app.

.EXAMPLE
    ./scripts/dev.ps1
#>
[CmdletBinding()]
param(
    [switch]$SetupOnly
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$apiProject = Join-Path $root 'HoneyWise.Api'
$migrationsProject = Join-Path $root 'HoneyWise.Migrations'
$webDir = Join-Path $root 'honey-wise-web'

function Write-Step([string]$message) {
    Write-Host "==> $message" -ForegroundColor Cyan
}

function Assert-Command([string]$name, [string]$installHint) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        throw "'$name' was not found on PATH. $installHint"
    }
}

# Native commands don't throw on failure; stop the script when one does.
function Assert-LastExitCode([string]$what) {
    if ($LASTEXITCODE -ne 0) {
        throw "$what failed (exit code $LASTEXITCODE)."
    }
}

function Read-DotEnv([string]$path) {
    $values = @{}
    foreach ($line in Get-Content $path) {
        $trimmed = $line.Trim()
        if ($trimmed -eq '' -or $trimmed.StartsWith('#')) { continue }
        $key, $value = $trimmed -split '=', 2
        $values[$key.Trim()] = $value.Trim()
    }
    return $values
}

# 1. Prerequisites ------------------------------------------------------------
Write-Step 'Checking prerequisites'
Assert-Command 'dotnet' 'Install the .NET 10 SDK: https://dotnet.microsoft.com/download'
Assert-Command 'node' 'Install Node.js 24 LTS: https://nodejs.org'
Assert-Command 'npm' 'npm ships with Node.js: https://nodejs.org'

# 2. .env ---------------------------------------------------------------------
$envFile = Join-Path $root '.env'
if (-not (Test-Path $envFile)) {
    Write-Step 'Creating .env from .env.example'
    Copy-Item (Join-Path $root '.env.example') $envFile
}
$settings = Read-DotEnv $envFile

# 3. Database -----------------------------------------------------------------
if ($settings['USE_DOCKER_DB'] -ne 'false') {
    Assert-Command 'docker' 'Install Docker Desktop: https://www.docker.com/products/docker-desktop (or set USE_DOCKER_DB=false in .env to use your own Postgres).'
    docker info *> $null
    if ($LASTEXITCODE -ne 0) {
        throw 'Docker is installed but not running. Start Docker Desktop and try again.'
    }

    Write-Step 'Starting Postgres (docker compose)'
    docker compose --project-directory $root up -d --wait db
    Assert-LastExitCode 'Starting Postgres'
}

# Both the migrator and the API read this; an environment variable outranks
# appsettings and user-secrets, so .env is the single source of truth here.
$env:HoneyWiseConnection = "Host=$($settings['POSTGRES_HOST']);Port=$($settings['POSTGRES_PORT']);" +
    "Username=$($settings['POSTGRES_USER']);Password=$($settings['POSTGRES_PASSWORD']);" +
    "Database=$($settings['POSTGRES_DB'])"

# 4. Migrations ---------------------------------------------------------------
Write-Step 'Applying database migrations and demo data'
dotnet run --project $migrationsProject -- --seed-dev
Assert-LastExitCode 'Database migration'

# 5. JWT secret ---------------------------------------------------------------
$secrets = dotnet user-secrets list --project $apiProject 2>$null
if (-not ($secrets -match '^JwtSettings:Secret\s*=')) {
    Write-Step 'Generating a local JWT signing secret (user-secrets)'
    $bytes = New-Object byte[] 64
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    dotnet user-secrets set 'JwtSettings:Secret' ([Convert]::ToBase64String($bytes)) --project $apiProject | Out-Null
    Assert-LastExitCode 'Setting the JWT secret'
}

# 6. Web dependencies ---------------------------------------------------------
if (-not (Test-Path (Join-Path $webDir 'node_modules'))) {
    Write-Step 'Installing web dependencies (npm ci)'
    Push-Location $webDir
    try { npm ci; Assert-LastExitCode 'npm ci' } finally { Pop-Location }
}

if ($SetupOnly) {
    Write-Step 'Setup complete.'
    return
}

# 7. Run ----------------------------------------------------------------------
Write-Step 'Starting API on http://localhost:20000 (Swagger: /swagger)'
$api = Start-Process dotnet -ArgumentList 'run', '--project', "`"$apiProject`"", '--launch-profile', 'http' `
    -NoNewWindow -PassThru

try {
    Write-Step 'Starting web app on http://localhost:4200 (demo login: demo / HoneyWise123!). Ctrl+C stops both.'
    Push-Location $webDir
    npm start
}
finally {
    Pop-Location
    if (-not $api.HasExited) {
        Write-Step 'Stopping API'
        # 'dotnet run' launches the API as a child process, so stop the whole tree.
        if ($env:OS -eq 'Windows_NT') {
            taskkill /PID $api.Id /T /F *> $null
        }
        else {
            Stop-Process -Id $api.Id -Force
        }
    }
}
