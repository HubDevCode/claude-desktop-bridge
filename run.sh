#!/usr/bin/env bash
# Condivide il desktop (wayvnc, solo localhost) e lo mostra in una scheda del browser (noVNC).
cd "$(dirname "$0")"
command -v wayvnc >/dev/null || { echo "Installa wayvnc:  sudo pacman -S wayvnc"; exit 1; }
OUT=${OUTPUT:-$(hyprctl monitors -j | python3 -c "import json,sys; m=json.load(sys.stdin); print(next((x for x in m if x['focused']), m[0])['name'])")}
echo "Condivido il monitor: $OUT (cambia con OUTPUT=NOME), tastiera ${KBD_LAYOUT:-it}"
wayvnc --output="$OUT" --render-cursor --keyboard="${KBD_LAYOUT:-it}" 127.0.0.1 5900 &
VNC=$!
trap 'kill $VNC 2>/dev/null' EXIT
sleep 1
node server.mjs
