# Übungsvideos für Tri-Coach — Übergabe

Stand 14.10.2026, aus einer Cloud-Sitzung. Hier geht es auf dem eigenen
Rechner (mit GPU) weiter.

## Ziel

Statt der Strichfigur zeigt Tri-Coach zu jeder Kraft-, Mobility- und
Lauf-ABC-Übung ein kurzes Video einer fiktiven, motivierenden blonden
Trainerin. Sie führt die Übung so aus, dass man erkennt, was zu tun ist.

## Entscheidungen

- **Variante B: Video-KI, die einer vorgegebenen Pose folgt.** Die Bewegung
  kommt aus Tri-Coach: aus den gelösten Posen der Bibliothek
  (`backend/app/animation/`), nicht aus einem gefilmten Vorbild. Daraus
  entsteht ein Steuervideo, und ein Videomodell überträgt es mit einem
  Referenzbild auf die Trainerin. Ob eine Übung stimmt, entscheiden weiter
  Rezept und Löser. Die Strichfigur bleibt Rückfall.
- **Nur für den eigenen Gebrauch.** Keine KI-Kennzeichnung: Der AI Act gilt
  nicht für rein persönliche, nicht berufliche Nutzung (Art. 2 Abs. 10).
  Sollten die Videos je öffentlich werden: `recherche/figur-recht.md`.
- **Erzeugt wird auf der eigenen GPU mit offenen Gewichten**, nicht über Kling
  oder eine andere API. Das kostet je Lauf nichts und ist wiederholbar: Mit
  denselben Gewichten, demselben Seed und derselben Referenz sieht eine
  Korrektur in einem halben Jahr aus wie die Clips daneben.
- **Die Werkstatt liegt im Remotion-Repo** (`werkstatt/`). Ins Home-Assistant-
  Add-on kommt davon nichts, nur fertige Clips.
- **Zuerst ein kleiner Versuch mit drei Übungen, dann der Ausbau.** Wie gut
  ein Videomodell liegende Posen, Stütz und Hände schafft, ist nirgends belegt.

## Was schon da ist

Erwartete Ordnerstruktur: `Tri-Coach` liegt **neben** `Remotion`, wie in
`CLAUDE.md`. Sonst gilt für Python die Variable `TRICOACH=/pfad/zu/Tri-Coach`.

| Datei | Zweck |
|---|---|
| `prototyp/puppe.py` | Steuersignale aus `koerper.py` und `bibliothek.json`. Spielt die Bewegung ab wie `bewegung.ts`, einschließlich der Zwischenbilder, mit perspektivischer Kamera aus `ansicht`. Kanäle: schattierte Gliederpuppe mit Matte und Kontaktschatten, Tiefe, Normalen, Teilekarte mit links/rechts getrennt, Skelett im Format von Wan-Animate, dazu Soll-Punkte im COCO-Format für die Prüfung |
| `prototyp/render_beispiele.py` | Kontaktbogen aller Kanäle je Übung: `python render_beispiele.py <ziel> glute-bridge,side-plank` |
| `prototyp/clip.py` | Puppen-Bildfolge eines Zyklus: `python clip.py . glute-bridge <ziel> 30` |
| `prototyp/pruefe_schaetzer.py`, `kalibriere.py`, `ausrichtung.py`, `tempo.py` | Automatische Prüfung: RTMW (rtmlib) liest ein Video, die erkannten Punkte werden mit den Soll-Punkten verglichen (OKS, Seitentausch, Periode, Versatz). Ergebnisse in `eval1.log` und `eval2.log`. Erstes Argument ist immer der Pfad zu `prototyp/` |
| `prototyp/beispiele/*.png` | Kontaktbögen (Spalten: Puppe, Tiefe, Normalen, Teile, Skelett) |
| `probe/skelett.mts`, `probe/tiefe.mts` | Dasselbe in Node mit `koerper.ts`/`bewegung.ts` aus Tri-Coach, als SVG: `node --experimental-strip-types probe/skelett.mts glute-bridge <ziel>` |
| `remotion-probe/` | Remotion-Komposition `Steuervideo`, die Tri-Coach direkt importiert: `npx remotion still werkstatt/remotion-probe/src/index.ts Steuervideo out/x.png --frame=20` (aus dem Repo-Wurzelverzeichnis) |
| `recherche/` | Rohberichte der Cloud-Sitzung: Codekarte, Modelle, Steuersignal und Prüfung, Referenzfigur, zwei Architekturentwürfe, Gutachten. Pfade unter `/tmp/claude-…` darin gibt es nicht mehr; die Skripte liegen jetzt hier |

`werkstatt/` steht in der `tsconfig.json` unter `exclude`, damit `npm run lint`
sauber bleibt.

Python-Pakete: `numpy pillow` für die Signale, dazu
`rtmlib onnxruntime opencv-python-headless` für die Prüfung.

**Gemessen an Puppen-Renderings, nicht an echten Clips:**

| Messung | Ergebnis |
|---|---|
| Rendern | 0,2–0,6 s je Bild bei 640×480 auf der CPU |
| RTMW erkennt die Puppe | in 146 von 146 Schlüsselbildern als Mensch |
| PCK@0.1 | liegend 0,90, stehend 0,94, Stütz/Sitz 0,98, Vierfüßler 0,90 |
| OKS über die Körpergelenke | richtige Pose im Median 0,89; falsches Schlüsselbild 0,52; gespiegelt (falsches Bein) 0,44 |
| Periode per Autokorrelation | auf ±0,3 % genau |
| MediaPipe als Gegenprobe | tauscht in Seitenansichten oft links und rechts, deshalb ungeeignet |

## Nächste Schritte

1. **Rechner prüfen:** `nvidia-smi` (VRAM). Danach richtet sich, welches Modell
   in welcher Auflösung geht.
2. **ComfyUI** mit Kijais `ComfyUI-WanVideoWrapper` einrichten. Kandidaten:
   - **SCAIL-Preview** (zai-org, Gewichte MIT): nimmt eine gerenderte
     3D-Pose aus Zylindern im COCO-18-Schema (siehe `render_cylinder.py` im
     Repo `zai-org/SCAIL-Pose`). Die lässt sich direkt aus unseren 3D-Punkten
     rendern, ganz ohne Posen-Schätzer. Im Paper brauchte es 68,5 GB für 81
     Bilder bei 512×896. Lokal geht es also nur quantisiert (GGUF/FP8) mit
     Block-Swap, oder kleiner.
   - **Wan-Animate-2** (Alibaba, Apache 2.0, seit 7.8.2026): nimmt das
     Treibervideo direkt, also die schattierte Puppe aus `puppe.py`. Es gibt
     INT8/BF16 und eine Lite-Variante. Ob es eine Puppe als Mensch nimmt, ist
     ungetestet.
   - Rückfall für die stehenden Übungen: Wan 2.2 Animate (v1) mit dem
     Skelett-Kanal.
3. **Masterbild der Trainerin** erzeugen (Prompt unten), lokal z. B. mit FLUX;
   für privaten Gebrauch reicht die Lizenz von FLUX [dev]. Danach Ansichten
   und je Übung ein Bild in der Startpose. Als Posenvorlage dient Bild 0 der
   Puppe aus derselben Kamera.
4. **Versuch mit drei Übungen:**
   - `glute-bridge`: Rückenlage, Ansicht 66/16
   - `lateral-lunge`: stehend, fast frontal, Seitenwechsel
   - `bird-dog`: Vierfüßler, Hände tragen, links/rechts

   Steuervideo mit 30 fps und mehr Zyklen als nötig, mindestens 720p
   erzeugen.
5. **Bewerten:**
   - Erkennbar dieselbe Frau in allen drei Clips?
   - Die richtige Übung, das richtige Bein?
   - Hände brauchbar?
   - Hält das Tempo?

   Die automatische Prüfung (RTMW gegen Soll) an den echten Clips
   nachkalibrieren. Ihre Schwellen kommen bisher nur von Puppen.
6. **Entscheiden:** alle Übungen, nur die stehenden (etwa 12 Kraft- und
   Mobility-Übungen, später das Lauf-ABC) oder abbrechen und auf den
   3D-Avatar im Browser (Variante A) gehen.
7. **Ausbau,** wenn der Versuch trägt:
   - Pipeline nach `recherche/entwurf-werkstatt.md`, mit den Punkten aus
     `recherche/gutachten.md`: Schnitt aus der gemessenen Phase legen,
     Prüfung nur als Vorsortierung.
   - In Tri-Coach: Prüfsumme `bewegungs_hash` über `ansicht`, `unterlage`,
     `requisiten` und `ablauf` an `AnimationOut`; `manifest.json` mit den
     Clips unter `frontend/src/uebungsvideos/`; Komponente `UebungsVideo.tsx`.
     Ein Video gilt nur, solange die Prüfsumme gleich ist, sonst zeigt die
     App die Figur.
   - In Listen Standbilder, es spielt nur ein Video gleichzeitig. Ein Schalter
     „Strichfigur“ je Gerät.

## Stolpersteine

- **Tempo:** Bildrate des Steuersignals = Bildrate des Modells =
  Abspielrate. Viele Workflows rechnen still auf 16 fps um. Bei 30 fps
  ergeben 53 von 59 Schleifen eine ganze Bildzahl; die übrigen sechs Drills
  über mehrere Zyklen.
- **Schleife:** Die Naht in die längste Haltephase (`halten_s`) legen und mit
  den Bildern vor dem Startbild überblenden. Kein Vor- und Zurückspielen,
  denn das kehrt die Schwerkraft um.
- **Proportionen:** Das Körpermodell ist ein Erwachsener von gut 1,75 m. Die
  Figur nur gleichmäßig skalieren und das Retargeting des Modells
  abschalten, sonst stimmen die Bodenkontakte nicht mehr.
- **2D-Skelett trennt die Beine nicht** (siehe
  `prototyp/beispiele/side-plank.png`). Für Boden und Stütz deshalb Tiefe,
  Puppe oder Zylinder nehmen.
- **Kamera:** Drei Vierfüßler-Übungen sind fast von hinten gefilmt
  (`fire-hydrant` 160°, `adductor-rock-back` 150°, `hip-cars` 115°). Fürs
  Video eine andere Ansicht wählen.
- **Gesicht:** Im Stand bei 640×480 nur 39–49 px hoch. Mindestens 720p
  erzeugen.
- **Hände:** Das Körpermodell hat keine Finger, die KI erfindet die Hände.
  Im Stütz der größte Unsicherheitsfaktor.
- **Prüfung:** Hände, Gesicht und Anatomie sieht die Prüfung nicht. Die
  Sichtprüfung bleibt.

## Befunde in Tri-Coach, unabhängig vom Video

- **KI-Korrekturen an Bibliotheksübungen überleben keinen Neustart.**
  `einspielen()` (`backend/app/animation/bibliothek.py:43-44`) überschreibt
  jede Zeile mit `herkunft="ki"` wieder mit der Bibliotheksfassung. Der Test
  `test_einspielen_ersetzt_ki_und_zieht_geaenderte_fassung_nach` hält das
  fest. `docs/animationen.md` sagt das Gegenteil („erst eine geänderte
  Bibliotheksfassung holt die kuratierte zurück“). Das Rezept einer Korrektur
  steht noch in `KiJob.roh_antwort`, auffindbar über
  `UebungsAnimation.ki_job_id`.
  - Vor einem Video sollte eine solche Korrektur als Rezept nach
    `rezepte.json` und nur sie neu gelöst werden; die alten Einträge bleiben
    byte-gleich.
- **Freigeben und Verwerfen prüfen keine Rechte**
  (`backend/app/routers/animationen.py:115-144`). Für den Haushalt egal.

## Offene Fragen

1. Welche Übungen sind „erst durch KI richtig“: verworfene Bibliotheksübungen
   (dann gilt der Befund oben) oder Übungen außerhalb der Bibliothek?
2. Welche GPU, wie viel VRAM?
3. Reicht ein Teilerfolg, also Videos nur für die stehenden Übungen?

## Prompt für das Masterbild

> Photorealistic full-body studio photograph of an original, fictional adult
> woman (not based on any real person or celebrity), about 30 years old,
> working as a fitness coach. Friendly, encouraging expression with a warm,
> natural closed-mouth smile; approachable and motivating. Fit, healthy,
> natural athletic build with average, realistic body proportions (not
> elongated, not exaggerated). Light skin with natural texture, light natural
> makeup. Blonde hair in one tight French braid down the back, no loose
> strands, face, ears and neck fully visible. Modest, form-fitting, unbranded,
> matte athletic wear: cobalt-blue long-sleeve crew-neck training top that
> fully covers the midriff, dark charcoal full-length leggings, plain white
> training shoes with lime-green laces, lime-green hair tie. No logos, no
> text, no prints, no jewelry, no watch. Pose: neutral A-pose, standing
> upright facing the camera, feet hip-width apart, arms relaxed about 20
> degrees away from the body, palms forward, fingers relaxed and slightly
> apart, both hands and both feet fully visible, generous margin around the
> whole body. Setting: bright, minimal fitness studio, seamless very light
> cool-grey background and matte light-grey floor, a slate-grey exercise mat
> beside her, nothing else in the scene. Lighting: soft, even, diffuse frontal
> light, low contrast, no hard shadows, no colored light. Camera: chest
> height, telephoto 105 mm from a distance, minimal perspective distortion,
> everything in sharp focus, 4:3 landscape. Style: sporty and matter-of-fact,
> like a physiotherapy or fitness-education photo, not a fashion, glamour or
> beauty shoot.

Für die Startpose je Übung:

> Same woman and outfit as images 1–3. Reproduce exactly the body pose of the
> grey mannequin in image 4 (…), camera at <gieren>° from the front and
> <neigen>° from above, telephoto, whole body and both hands visible, same
> studio and lighting, 4:3.

## Quellen (Auswahl)

- SCAIL: <https://github.com/zai-org/SCAIL>,
  <https://huggingface.co/zai-org/SCAIL-Preview>,
  Paper <https://arxiv.org/abs/2512.05905>
- Wan-Animate-2:
  <https://www.opensourceforu.com/2026/08/alibaba-open-sources-wan-animate-2/>
- Wan 2.2 Animate: <https://github.com/Wan-Video/Wan2.2>
- rtmlib (RTMW): <https://github.com/Tau-J/rtmlib>
- Weitere Quellen in `recherche/*.md`.
