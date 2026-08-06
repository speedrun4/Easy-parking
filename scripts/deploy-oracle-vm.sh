#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/Easy-parking}"

cd "$APP_DIR"

if [ ! -f .env ]; then
  echo "Arquivo .env nao encontrado em $APP_DIR"
  exit 1
fi

docker compose down || true
docker compose up -d --build

docker compose ps
curl -fsS http://localhost:8080/api/health
