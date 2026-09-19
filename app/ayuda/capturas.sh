#!/usr/bin/env bash
# Regenera las capturas de la ayuda (app/ayuda/capturas/*.png) con Chrome headless.
# Hace falta una instancia de la Sala SIN login (sin APP_PASSWORD ni USERS_FILE), por ejemplo
# una copia de prueba en el servidor con un túnel ssh, y Chrome instalado.
# Uso: bash app/ayuda/capturas.sh http://localhost:3299
set -euo pipefail

BASE="${1:?Pasá la dirección de la instancia, por ejemplo http://localhost:3299}"
DIR="$(cd "$(dirname "$0")" && pwd)"
OUT="$DIR/capturas"
CHROME="${CHROME:-/c/Program Files/Google/Chrome/Application/chrome.exe}"
mkdir -p "$OUT"

# Cada página con «captura:» y «ruta:» en su frontmatter se fotografía en esa ruta.
for md in "$DIR"/*.md; do
  captura=$(sed -n 's/^captura: *//p' "$md" | head -1)
  ruta=$(sed -n 's/^ruta: *//p' "$md" | head -1)
  [ -z "$captura" ] || [ -z "$ruta" ] && continue
  destino="$OUT/$captura"
  [ -n "$(command -v cygpath)" ] && destino="$(cygpath -w "$destino")"
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=9000 \
    --window-size=1280,860 --screenshot="$destino" "$BASE/?estatico=1#/$ruta" 2>/dev/null
  echo "  $captura ← #/$ruta"
done
echo "Listo: $(ls "$OUT" | wc -l) capturas en $OUT"
