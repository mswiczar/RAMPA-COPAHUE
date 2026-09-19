#!/usr/bin/env bash
# Despliega la Sala 24/7 en copahue.moshito.work (143.244.161.204).
# Uso: bash app/deploy.sh   (desde Git Bash, con acceso SSH como root)
set -euo pipefail

HOST="root@143.244.161.204"
APP_DIR="$(cd "$(dirname "$0")" && pwd)"
PKG="$(mktemp -d)/copahue-app.tgz"

echo "→ Empaquetando $APP_DIR"
tar --force-local -C "$APP_DIR" --exclude=node_modules --exclude=server/public --exclude=server/data -czf "$PKG" .

echo "→ Subiendo"
scp -q "$PKG" "$HOST:/tmp/copahue-app.tgz"

echo "→ Instalando, compilando y reiniciando (solo copahue-sala)"
ssh "$HOST" 'set -e
  tar -xzf /tmp/copahue-app.tgz -C /srv/copahue/app && rm /tmp/copahue-app.tgz
  cd /srv/copahue/app
  # La documentación es parte del producto: si falta la ayuda de una pantalla, no se despliega.
  node ayuda/verificar.mjs
  npm --prefix server install --omit=dev --no-audit --no-fund >/dev/null
  npm --prefix web install --no-audit --no-fund >/dev/null
  npm --prefix web run build 2>&1 | tail -1
  systemctl restart copahue-sala
  sleep 2
  systemctl is-active copahue-sala
  curl -s -o /dev/null -w "health %{http_code}\n" http://127.0.0.1:3200/api/health'

echo "✓ Listo: https://copahue.moshito.work"
