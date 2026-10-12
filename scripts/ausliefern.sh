#!/usr/bin/env bash
# Kodiert die gerenderten Master von `TriCoachRennen` für das Web und legt sie
# in Tri-Coach ab: je Format ein MP4 (H.264, läuft überall), ein WebM (AV1,
# halb so groß, wo der Browser es kann) und das erste Bild als Standbild.
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
  # Ein Schlüsselbild je Sekunde: Der Browser springt beim Wiederholen an den
  # Anfang, und kurze Abstände halten das billig.
  ffmpeg -hide_banner -loglevel error -y -i "$master" -an \
    -c:v libx264 -preset veryslow -crf 27 -profile:v high -pix_fmt yuv420p \
    -g 30 -movflags +faststart "$ziel/rennen-$format.mp4"
  ffmpeg -hide_banner -loglevel error -y -i "$master" -an \
    -c:v libsvtav1 -preset 3 -crf 40 -g 30 -pix_fmt yuv420p \
    "$ziel/rennen-$format.webm"
  ffmpeg -hide_banner -loglevel error -y -i "$master" -frames:v 1 \
    -c:v libwebp -quality 78 "$ziel/rennen-$format.webp"
done
ls -la "$ziel"
