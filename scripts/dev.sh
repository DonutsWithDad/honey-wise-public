#!/usr/bin/env bash
# One command to run HoneyWise locally: database, migrations, API and web app.
# macOS/Linux twin of scripts/dev.ps1; keep the two in step.
#
# Safe to re-run; every step skips itself when there is nothing to do.
#   1. Checks the .NET SDK, Node and (if used) Docker are installed.
#   2. Creates .env from .env.example on first run.
#   3. Starts Postgres in Docker (unless USE_DOCKER_DB=false in .env).
#   4. Applies database migrations and local demo data.
#   5. Generates a JWT signing secret into user-secrets if there isn't one.
#   6. Installs web dependencies if needed.
#   7. Runs the API (http://localhost:20000) and web app (http://localhost:4200)
#      until you press Ctrl+C.
#
# Usage: ./scripts/dev.sh [--setup-only]
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
api_project="$root/HoneyWise.Api"
migrations_project="$root/HoneyWise.Migrations"
web_dir="$root/honey-wise-web"
setup_only=false
[[ "${1:-}" == "--setup-only" ]] && setup_only=true

step() { printf '\033[36m==> %s\033[0m\n' "$1"; }
fail() { printf '\033[31m%s\033[0m\n' "$1" >&2; exit 1; }
require() { command -v "$1" >/dev/null 2>&1 || fail "'$1' was not found on PATH. $2"; }

# 1. Prerequisites
step "Checking prerequisites"
require dotnet "Install the .NET 10 SDK: https://dotnet.microsoft.com/download"
require node "Install Node.js 24 LTS: https://nodejs.org"
require npm "npm ships with Node.js: https://nodejs.org"

# 2. .env
if [[ ! -f "$root/.env" ]]; then
  step "Creating .env from .env.example"
  cp "$root/.env.example" "$root/.env"
fi
# Strip CRLFs in case .env was edited on Windows.
set -a
# shellcheck disable=SC1090
source <(tr -d '\r' < "$root/.env")
set +a

# 3. Database
if [[ "${USE_DOCKER_DB:-true}" != "false" ]]; then
  require docker "Install Docker: https://docs.docker.com/get-docker/ (or set USE_DOCKER_DB=false in .env to use your own Postgres)."
  docker info >/dev/null 2>&1 || fail "Docker is installed but not running. Start Docker and try again."
  step "Starting Postgres (docker compose)"
  docker compose --project-directory "$root" up -d --wait db
fi

# Both the migrator and the API read this; an environment variable outranks
# appsettings and user-secrets, so .env is the single source of truth here.
export HoneyWiseConnection="Host=$POSTGRES_HOST;Port=$POSTGRES_PORT;Username=$POSTGRES_USER;Password=$POSTGRES_PASSWORD;Database=$POSTGRES_DB"

# 4. Migrations
step "Applying database migrations and demo data"
dotnet run --project "$migrations_project" -- --seed-dev

# 5. JWT secret
if ! dotnet user-secrets list --project "$api_project" 2>/dev/null | grep -q '^JwtSettings:Secret *='; then
  step "Generating a local JWT signing secret (user-secrets)"
  dotnet user-secrets set "JwtSettings:Secret" "$(head -c 64 /dev/urandom | base64 | tr -d '\n')" \
    --project "$api_project" >/dev/null
fi

# 6. Web dependencies
if [[ ! -d "$web_dir/node_modules" ]]; then
  step "Installing web dependencies (npm ci)"
  (cd "$web_dir" && npm ci)
fi

if [[ "$setup_only" == true ]]; then
  step "Setup complete."
  exit 0
fi

# 7. Run
step "Starting API on http://localhost:20000 (Swagger: /swagger)"
dotnet run --project "$api_project" --launch-profile http &
api_pid=$!
# 'dotnet run' launches the API as a child process, so stop the whole group.
trap 'step "Stopping API"; pkill -P "$api_pid" 2>/dev/null; kill "$api_pid" 2>/dev/null || true' EXIT

step "Starting web app on http://localhost:4200 (logins: admin@admin.com / admin, demo / HoneyWise123!). Ctrl+C stops both."
cd "$web_dir"
npm start
