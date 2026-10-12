#!/usr/bin/env bash
# Lädt die Clips für `TriCoachRennen` von Pexels und schneidet sie zu.
#
# Pexels-Lizenz: frei, auch kommerziell, ohne Namensnennung; verändern
# erlaubt (https://www.pexels.com/license/). Wer welchen Clip gefilmt hat,
# steht in public/footage/QUELLEN.md.
#
# Lauf und Schwimmen landen als public/footage/<name>.mp4: 1920×1080, ohne
# Ton, in ihrer eigenen Bildrate und ab dem gewählten Einstieg.
#
# Das Rad ist aufwendiger: ein Zeitfahren aus der Drohne in 4K. Die Fahrerin
# wird verfolgt (scripts/rad-verfolgen.py, braucht numpy), eng um sie herum
# ausgeschnitten und auf 0,4-fache Geschwindigkeit gedehnt — mit errechneten
# Zwischenbildern, sonst stünde jedes Bild zweieinhalbmal und es ruckelte.
# Die Datei beginnt mit „Rad (Anschluss)", also 24 Frames vor „Rad".
# Das dauert einige Minuten.
#
# Aufruf: scripts/footage-laden.sh   (braucht www.pexels.com und
# videos.pexels.com im Netz, dazu ffmpeg)
set -euo pipefail

cd "$(dirname "$0")/.."
roh=".footage-roh"
mkdir -p "$roh" public/footage

# name      pexels-id  einstieg-s  laenge-s
# lauf:      Matthias Groeneveld, „Front View of Competitors Running a Marathon"
# schwimmen: Kindel Media, „Underwater Footage of Athletes Swimming in a Pool"
CLIPS=(
  "lauf       12510396  15.0  7.0"
  "schwimmen  8685954   0.0   7.0"
)

lade() {
  local id=$1 groesse=$2 quelle=$3
  [ -s "$quelle" ] && return
  echo "Lade Pexels $id …"
  curl -fL --retry 3 -A "Mozilla/5.0" -o "$quelle" "https://www.pexels.com/download/video/$id/$groesse"
}

for zeile in "${CLIPS[@]}"; do
  read -r name id einstieg laenge <<<"$zeile"
  quelle="$roh/$id.mp4"
  # Ohne Größe käme bei manchen Clips 4K; 1080p reicht für ein Video, das
  # kleiner ausgeliefert wird, und lässt Platz für das Heranfahren.
  lade "$id" "?h=1080&w=1920" "$quelle"
  ffmpeg -hide_banner -loglevel error -y -ss "$einstieg" -t "$laenge" -i "$quelle" -an \
    -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080" \
    -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p -movflags +faststart \
    "public/footage/$name.mp4"
  echo "  → public/footage/$name.mp4"
done

# rad: Pexels 31000125, Zeitfahren bei der 9. National Road Cycling
# Championship (UCI). Quellzeit 8,9 s bis 11,65 s, danach fällt die Drohne zurück.
quelle="$roh/31000125-4k.mp4"
lade 31000125 "" "$quelle"
ausschnitt=$(python3 scripts/rad-verfolgen.py "$quelle" 8.9 2.75)
ffmpeg -hide_banner -loglevel error -y -ss 8.9 -t 2.75 -i "$quelle" -an \
  -vf "$ausschnitt,scale=1920:1080:flags=lanczos,minterpolate=fps=75:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1,setpts=2.5*PTS,fps=30" \
  -c:v libx264 -crf 16 -preset slow -pix_fmt yuv420p -movflags +faststart \
  public/footage/rad.mp4
echo "  → public/footage/rad.mp4"
