#!/usr/bin/env bash
# Kodiert die gerenderten Master von `TriCoachRennen` für das Web und legt sie
# in Tri-Coach ab: je Format ein MP4 (H.264), ein WebM (AV1) und das erste
# Bild als Standbild.
#
# Das WebM ist kein Sparformat — AV1 war bei diesem Material nur 7 % kleiner
# als H.264 —, sondern der Rückfall für Browser ohne H.264: Chromium aus
# freien Quellen und Firefox unter Linux ohne Systemcodecs. Jeder Browser lädt
# nur eine der beiden Dateien. CRF 31 bzw. 44 ergeben je rund 3 bis 3,5 MB;
# bei 32 werden die Gesichter im Lauf schon weich, hinter dem Schleier der App
# fällt der Rest nicht auf.
#
# Das Standbild ist Frame 0: Es steht da, bis das Video läuft, und wer
# Bewegung abgeschaltet hat, sieht nur es — so springt nichts beim Start.
#
# Aufruf: scripts/ausliefern.sh <ziel>   (nach den beiden Renderbefehlen in CLAUDE.md)
set -euo pipefail

cd "$(dirname "$0")/.."
ziel=${1:?Zielverzeichnis fehlt, z. B. ../Tri-Coach/frontend/src/auth/rennen}
mkdir -p "$ziel"

for format in hoch band; do
  master="out/rennen-$format-master.mp4"
  [ -s "$master" ] || { echo "$master fehlt — erst rendern." >&2; exit 1; }
  # Das Band ist in 1920×1080 gerendert; am Telefon ist es kaum 430 px breit,
  # 1280 reicht auch für dreifache Pixeldichte. Das Hochformat kommt fertig.
  groesse=$([ "$format" = band ] && echo "scale=1280:720:flags=lanczos," || true)
  # `faststart`: Die Indexdaten stehen vorn, der Browser kann abspielen, bevor
  # die ganze Datei da ist.
  ffmpeg -hide_banner -loglevel error -y -i "$master" -an -vf "${groesse}format=yuv420p" \
    -c:v libx264 -preset veryslow -crf 31 -profile:v high -level:v 4.0 -pix_fmt yuv420p \
    -movflags +faststart "$ziel/rennen-$format.mp4"
  ffmpeg -hide_banner -loglevel error -y -i "$master" -an -vf "${groesse}format=yuv420p" \
    -c:v libsvtav1 -preset 6 -crf 44 -svtav1-params enable-overlays=1 \
    "$ziel/rennen-$format.webm"
  ffmpeg -hide_banner -loglevel error -y -i "$master" -frames:v 1 -vf "${groesse}null" \
    -c:v libwebp -quality 78 "$ziel/rennen-$format.webp"
done
ls -la "$ziel"
