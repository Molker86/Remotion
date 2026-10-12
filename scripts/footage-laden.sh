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
# Das Rad ist ein Schnitt aus zwei Einstellungen wie bei einer Übertragung:
# erst ein Pulk, der an einer Kamera auf dem Asphalt vorbeirauscht (2,4 s),
# dann das Profifeld in einer Stadtkurve (4,5 s). Beide in Echtzeit — die
# Datei beginnt mit „Rad (Anschluss)", also 24 Frames vor „Rad", und der
# Schnitt liegt nach 72 Frames.
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

# rad: Pexels 31000104 (Straßenmeisterschaft, Kamera am Boden, 4K) ab 2,6 s
# für 72 Frames, dann Pexels 2066560 („Road Bicycle Racing", Profifeld in der
# Kurve, 1080p) ab 12,6 s für 134 Frames. Danach kommen dort Teamautos.
boden="$roh/31000104-4k.mp4"
kurve="$roh/2066560.mp4"
lade 31000104 "" "$boden"
lade 2066560 "" "$kurve"
ffmpeg -hide_banner -loglevel error -y \
  -ss 2.6 -t 2.4 -i "$boden" -ss 12.6 -t 4.5 -i "$kurve" -an \
  -filter_complex "[0:v]scale=1920:1080:flags=lanczos,fps=30,setsar=1,trim=end_frame=72,setpts=PTS-STARTPTS[a];[1:v]scale=1920:1080,fps=30,setsar=1,trim=end_frame=134,setpts=PTS-STARTPTS[b];[a][b]concat=n=2:v=1[v]" \
  -map "[v]" -c:v libx264 -crf 16 -preset slow -pix_fmt yuv420p -movflags +faststart \
  public/footage/rad.mp4
echo "  → public/footage/rad.mp4"
