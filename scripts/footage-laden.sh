#!/usr/bin/env bash
# Lädt die Clips für `TriCoachRennen` von Pexels und schneidet sie zu.
#
# Pexels-Lizenz: frei, auch kommerziell, ohne Namensnennung; verändern
# erlaubt (https://www.pexels.com/license/). Wer welchen Clip gefilmt hat,
# steht in public/footage/QUELLEN.md.
#
# Jeder Clip landet als public/footage/<name>.mp4: 1920×1080, ohne Ton, in
# seiner eigenen Bildrate (eine Umrechnung machte aus Zeitlupe Ruckeln) und
# mit `vorlauf` Sekunden vor dem gewählten Einstieg. Vorlauf braucht nur das
# Rad: Der Anschluss am Ende der Schleife zeigt die Frames vor seinem Anfang,
# deshalb beginnt die Komposition dort bei `trimBefore={1 * fps}`.
#
# Aufruf: scripts/footage-laden.sh   (braucht www.pexels.com und
# videos.pexels.com im Netz, dazu ffmpeg)
set -euo pipefail

cd "$(dirname "$0")/.."
roh=".footage-roh"
mkdir -p "$roh" public/footage

# name      pexels-id  einstieg-s  laenge-s  vorlauf-s
# rad:       Pavel Danilyuk, „Cycling Closeup"
# lauf:      Matthias Groeneveld, „Front View of Competitors Running a Marathon"
# schwimmen: Kindel Media, „Underwater Footage of Athletes Swimming in a Pool"
CLIPS=(
  "rad        5789979   2.0   7.0  1"
  "lauf       12510396  15.0  7.0  0"
  "schwimmen  8685954   0.0   7.0  0"
)

for zeile in "${CLIPS[@]}"; do
  read -r name id einstieg laenge vorlauf <<<"$zeile"
  quelle="$roh/$id.mp4"
  if [ ! -s "$quelle" ]; then
    echo "Lade $name (Pexels $id) …"
    # Ohne Größe käme die 4K-Fassung; 1080p reicht für ein Video, das als
    # 720p ausgeliefert wird, und lässt Platz für das Heranfahren.
    curl -fL --retry 3 -A "Mozilla/5.0" -o "$quelle" \
      "https://www.pexels.com/download/video/$id/?h=1080&w=1920"
  fi
  start=$(awk -v e="$einstieg" -v v="$vorlauf" 'BEGIN { print e - v }')
  dauer=$(awk -v l="$laenge" -v v="$vorlauf" 'BEGIN { print l + v }')
  ffmpeg -hide_banner -loglevel error -y -ss "$start" -i "$quelle" -t "$dauer" -an \
    -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080" \
    -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p -movflags +faststart \
    "public/footage/$name.mp4"
  echo "  → public/footage/$name.mp4"
done
