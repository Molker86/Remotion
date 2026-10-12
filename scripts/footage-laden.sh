#!/usr/bin/env bash
# Lädt die Clips für `TriCoachRennen` von Pexels und schneidet sie zu.
#
# Pexels-Lizenz: frei, auch kommerziell, ohne Namensnennung; verändern
# erlaubt (https://www.pexels.com/license/). Wer welchen Clip gefilmt hat,
# steht in public/footage/QUELLEN.md.
#
# Jeder Clip landet als public/footage/<name>.mp4: 1920×1080, ohne Ton, in
# seiner eigenen Bildrate (eine Umrechnung machte aus Zeitlupe Ruckeln) und
# mit genau einer Sekunde Vorlauf vor dem gewählten Einstieg — die Komposition
# beginnt bei `trimBefore={1 * fps}`, und der Anschluss am Ende der Schleife
# braucht die Frames davor.
#
# Aufruf: scripts/footage-laden.sh   (braucht www.pexels.com und
# videos.pexels.com im Netz, dazu ffmpeg)
set -euo pipefail

cd "$(dirname "$0")/.."
roh=".footage-roh"
mkdir -p "$roh" public/footage

# name  pexels-id  einstieg-s  laenge-s (ohne Vorlauf)
CLIPS=(
  "rad        5789979  1.0  7.0"
  "lauf       9683115  1.0  7.0"
  "schwimmen  6012153  1.0  7.0"
)

for zeile in "${CLIPS[@]}"; do
  read -r name id einstieg laenge <<<"$zeile"
  quelle="$roh/$id.mp4"
  if [ ! -s "$quelle" ]; then
    echo "Lade $name (Pexels $id) …"
    curl -fL --retry 3 -A "Mozilla/5.0" -o "$quelle" "https://www.pexels.com/download/video/$id/"
  fi
  start=$(awk -v e="$einstieg" 'BEGIN { s = e - 1; print (s < 0 ? 0 : s) }')
  dauer=$(awk -v l="$laenge" 'BEGIN { print l + 1 }')
  ffmpeg -hide_banner -loglevel error -y -ss "$start" -i "$quelle" -t "$dauer" -an \
    -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080" \
    -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p -movflags +faststart \
    "public/footage/$name.mp4"
  echo "  → public/footage/$name.mp4"
done
