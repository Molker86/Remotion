# Variante B: Steuersignal, automatische Prüfung und Auslieferung

**Kennzeichnung:** [Code] = im Repo gelesen · [Quelle] = Web-Beleg (URL am Ende) · [gemessen] = eigener Versuch im Scratchpad · [Annahme] = nicht belegt, muss getestet werden. In beiden Repos ist nichts geändert.

## Kurzfazit

1. **Das Steuersignal rendert man selbst aus `koerper.py`.** Ein Posen-Schätzer auf einem Treibervideo entfällt. Aus derselben Rechnung kommen fünf Signale:
   - ein Skelett im exakten Format von Wan-Animate,
   - eine Tiefenkarte,
   - eine Normalenkarte,
   - eine Teilekarte mit getrennten Farben für links und rechts,
   - eine schattierte Gliederpuppe als Ersatz für ein Treibervideo.

   Ein Prototyp läuft auf der CPU mit 0,16–0,40 s pro Bild bei 640×480 [gemessen].
2. **Das Signal hängt von der Haltung ab.**
   - Stehende Übungen (21 von 59, davon 10 Lauf-ABC-Drills): das Skelett reicht (Wan2.2-Animate).
   - Übungen am Boden, auf Händen oder Knien (38 von 59; 19 liegend, 9 Vierfüßler, 10 Stütz, Sitz oder Knien): Tiefe oder Normalen über VACE bzw. Wan-Fun-Control mit Referenzbild. Die Puppe als Treibervideo ist der zweite Weg.
   - Die Zahlen kommen aus einer eigenen Einteilung nach Becken- und Brusthöhe [gemessen].
3. **Kern der automatischen Prüfung:** RTMW (rtmlib, CPU) auf dem fertigen Video gegen die projizierten Soll-Punkte, mit derselben Kamera wie das Steuersignal. Pro Bild ergibt das einen OKS-Wert nur über die Körpergelenke. Pro Clip werden Median, unteres Quantil, Seitentausch, Bodenkontakt, Periode und Versatz geprüft. Auf der Puppe trennt das richtig von falsch deutlich, aber nicht pro Einzelbild [gemessen].
4. **Schleife:** Mehr als einen Zyklus erzeugen, den Vorlauf verwerfen, die Naht in die längste Haltephase legen und mit den Bildern vor dem Schnittpunkt überblenden. Ping-Pong scheidet aus.
5. **Auslieferung:**
   - Kodierung wie beim Rennen: H.264 plus AV1 mit WebP-Standbild.
   - 640×480 im Format 4:3, etwa 0,15–0,5 MB pro 6-s-Clip.
   - In der Liste nur Standbilder, ein laufendes Video auf einmal.
   - Kein Alphakanal, denn die Kontaktschatten auf der Matte sind der Beweis für den Bodenkontakt.
6. **Tempo:** Posegesteuerte Modelle sind bildgenau an die Steuerbilder gekoppelt. Steuer- und Abspielrate müssen gleich sein; geprüft wird per Autokorrelation (auf ±0,3 % genau) [gemessen].

## 0. Eigene Versuche (alles unter `/tmp/claude-0/-home-user/bf8cf066-c69c-54cc-8f0b-85da01f0d936/scratchpad/`)

**Signal-Renderer `proto/puppe.py`:**
- Liest `backend/app/animation/koerper.py` und `bibliothek.json` nur.
- Spielt ab wie `bewegung.ts:33-56`, einschließlich der Zwischenbilder.
- Perspektivische Kamera aus `ansicht`.
- Bausteine sind Kugeln entlang `SEGMENTE` mit Radius und Verjüngung, dazu Kopf und Nase.
- Ein Tiefenpuffer liefert per Strahl-Kugel-Schnitt Tiefe, Normalen, Teilekarte, schattierte Puppe mit Kontaktschatten und das Skelett im Wan-Format.
- Beispielbilder unter `proto/out/{glute-bridge,plank,bird-dog,side-plank,standing-quad-stretch,high-knees}.png`, Spalten von links: Puppe, Tiefe, Normalen, Teile, Skelett.
- Das Bild von `side-plank.png` zeigt das Problem: Im 2D-Skelett liegen beide Beine aufeinander, Tiefe und Teilekarte trennen sie.

**Schätzer auf allen 146 Schlüsselbildern der Bibliothek** (`proto/pruefe_schaetzer.py`, Log `eval1.log`), gerendert als Puppe:

| Schätzer | Kategorie | PCK@0.1 | OKS > 0,75 | Links/Rechts vertauscht | nicht erkannt |
|---|---|---|---|---|---|
| RTMW (balanced) | liegend | 0,90 | 0,78 | 1/46 | 0 |
| RTMW | stehend | 0,94 | 0,86 | 5/56 | 0 |
| RTMW | Stütz, Sitz, Knien | 0,98 | 1,00 | 0/22 | 0 |
| RTMW | Vierfüßler | 0,90 | 0,45* | 0/22 | 0 |
| MediaPipe Pose heavy | liegend / stehend | 0,88 / 0,76 | 0,70 / 0,54 | 5/46 / **22/56** | 2 von 146 |

\* Der niedrige Wert kommt von den Gesichtspunkten. Augen und Ohren der Puppe sind nur geschätzt; nur über die Körpergelenke liegt der Wert bei 0,86 (`ausrichtung.py`).

- **Laufzeit auf 4 vCPU:** RTMW 0,29 s pro Bild (YOLOX-m plus RTMW-x 256×192), MediaPipe 0,13 s.
- **Gedrehte Eingaben bringen nichts:**
  - Testzeit-Drehung um 0°/±90° mit der Wahl nach Konfidenz verschlechtert RTMW im Stehen von 0,94 auf 0,82.
  - Das Bild so drehen, dass der Soll-Rumpf senkrecht steht: liegend 0,86 → 0,88, Vierfüßler 0,87 → 0,83.
- **Trennschärfe** (`kalibriere.py`, RTMW, OKS über 12 Körpergelenke, pro Bild):

| Vergleich | Median | Quantil | Anteil > 0,75 |
|---|---|---|---|
| richtige Pose | 0,89 | 10 %-Quantil 0,68 | 87 % |
| anderes Schlüsselbild | 0,52 | 90 %-Quantil 0,73 | 9 % |
| gespiegelte Pose (falsche Seite) | 0,44 | 90 %-Quantil 0,67 | 7 % |

- Gelenke auf der kamerafernen Seite haben etwa den doppelten Fehler: Ellbogen und Hand rechts 0,08 der Personengröße, links 0,035–0,041.
- **Tempo** (`tempo.py`):

| Übung | Soll-Periode | gemessen | Tempo 0,93 (erwartet → gemessen) | Versatz |
|---|---|---|---|---|
| glute-bridge | 3,60 s | 3,59 s | 3,87 → 3,86 s | 0,00 s |
| bird-dog | 6,40 s | 6,40 s | 6,88 → 6,88 s | 0,00 s |

- **Bibliothek:** Schleifendauer 0,46–8,6 s (Median 4,4 s). Ganzzahlige Bildzahl pro Schleife: 53 von 59 bei 30 oder 20 fps, nur 12 von 59 bei 16 oder 24 fps.
- **Größen pro 6-s-Clip** (`enc/`):

| Material | Auflösung | H.264 CRF 28 | AV1 CRF 40 |
|---|---|---|---|
| Ausschnitt aus `rennen-hoch.mp4` (echtes Filmmaterial, bewegte Kamera; Obergrenze) | 640×480 | 519 kB | 545 kB |
| dasselbe | 960×720 | 895 kB | 852 kB |
| saubere Puppe, ruhende Kamera (Untergrenze) | 640×480 | 55 kB | 67 kB |
| dieselbe Puppe | 960×720 | 87 kB | 104 kB |

**Einschränkung:** Alle Werte stammen von Puppen-Renderings, nicht von fotorealistischen Clips. Die Schwellen müssen an den ersten 10–20 echten Clips mit menschlichem Urteil nachkalibriert werden [Annahme].

## 1. Steuersignal

**Was die Modelle annehmen:**

| Modell / Dienst | Steuersignal | Referenz | Rahmen | Beleg |
|---|---|---|---|---|
| Wan2.2-Animate-14B (Apache-2.0) | Skelettvideo `pose_video` (20 Körperpunkte im OpenPose-Stil plus Zehen, optional 2×21 Handpunkte) und `face_video` (Gesichtsausschnitte 512²) | Referenzbild | Segmente zu 77 Bildern, Anschluss über 1 oder 5 Bilder des vorigen Segments; Vorverarbeitung mit 30 fps; Maße Vielfache von 16 | [Quelle], dazu `human_visualization.py` und `preprocess_data.py` |
| Wan2.1-Fun-V1.1-14B-Control | Canny, Tiefe, Pose, MLSD, „Referenzbild + Steuerung" | Referenzbild | 81 Bilder bei 16 fps | [Quelle] |
| Wan2.2-VACE-Fun-A14B / Wan2.1-VACE-14B | Tiefe, Pose, Canny, MLSD, Masken | Subjekt-Referenz | 81 Bilder bei 16 fps (720p beim 14B) | [Quelle] |
| Champ | SMPL-Tiefe, -Normalen, -Semantik plus DWPose | Bild | — | [Quelle] |
| RealisDance | DWPose, SMPL-CS, HaMeR für Hände | Bild | — | [Quelle] |
| HVG (2026) | „Bone-Map": jeder Knochen als Ellipsoid, gerendert als Tiefe und Normalen | Bild | — | [Quelle] |
| Kling Motion Control | Treibervideo eines Menschen, 3–30 s, ganzer Körper, „some stylized humanoid proportions are also recognized" | Bild | Ausgabe kann bei schneller Bewegung kürzer werden | [Quelle] |
| Runway Act-Two | Treibervideo, Gestensteuerung nur mit Bild als Figur | Bild | 3–30 s, 24 fps | [Quelle] |
| Luma Modify | Video-zu-Video, Struktur bleibt erhalten | — | — | nur Sekundärquelle |

**Was bei liegenden und verdeckten Posen trägt:**
- Das Wan-Animate-Paper räumt ein, dass ein 2D-Skelett bei komplexen Bewegungen räumlich mehrdeutig ist und Knochenlängen von der Haltung abhängen. SMPL bildet die Beziehungen der Gliedmaßen besser ab, prägt aber die Körperform mit [Quelle].
- In der Ablation von HVG ist Skelett allein am schlechtesten (FVD 277,5 gegen 152,1 mit Tiefe und Normalen) [Quelle].
- Unsere Kapseln sind fast genau die Bone-Map von HVG.
- **Empfehlung:**
  - Stehend: Skelett über Wan-Animate.
  - Boden, Stütz, Vierfüßler: Tiefe, auf Wunsch zusätzlich Normalen, über VACE bzw. Fun-Control.
  - Je Kategorie zwei Übungen gegen alle drei Wege testen und mit der Prüfung aus Abschnitt 2 bewerten [Annahme].

**So entsteht die Puppe aus unseren Daten:**
- **Quelle der Rechnung:** `koerper.py` ist die Quelle (`docs/animationen.md:72-80`). Der Renderer läuft deshalb in Python neben der Prüfung; eine dritte Kopie der Rechnung in Remotion entfällt. Remotion mit three.js wäre möglich, braucht aber `angle` als OpenGL-Renderer [Quelle].
- **Abspielen:** Zwingend mit den gelösten Zwischenbildern (`bewegung.ts:51-56`, `format.py:97-99`). Beim bloßen Überblenden der Winkel rutscht ein Fuß bis 9 cm (`docs/animationen.md:62-70`).
- **Kamera:**
  - Richtung aus `ansicht` (`format.py:46-51`, `szene.ts:116-122`).
  - Fest über die ganze Schleife; der Ausschnitt umfasst alle Posen wie `szene.ts:98-101, 127-166`.
  - Anders als `szene.ts:177-180` perspektivisch statt orthografisch.
  - Format 4:3 wie `.figur-buehne` (`fachlich.css:669`), 640×480 oder 960×720 (Vielfache von 16).
- **Skelett im Wan-Format** (Reihenfolge, Farben und Strichbreite aus `draw_aapose_new` übernehmen, nicht „verbessern" – das ist die Verteilung, auf der trainiert wurde):
  - Nacken = Mitte der Schultern, nicht unser `nacken`.
  - Augen und Ohren aus dem Kopfrahmen nase/kopf/nacken; das haben wir selbst nicht.
  - Zehen = `zehen_l/r`.
  - Hände: Unser Modell hat nur Handgelenk, Fingerende und Beugung, keine Unterarmdrehung (`koerper.ts:191`). Bei Bodenkontakt eine flache Hand mit der Handfläche nach unten erzeugen, sonst weglassen [Annahme].
- **Tiefe:** Inverse Tiefe, nah = hell. Normiert auf den Bereich des Körpers und für den ganzen Clip gleich, sonst flimmert sie. Im Prototyp nimmt der Boden zu viel vom Kontrastumfang.
- **Körperform:** Die Tiefe gibt die Form vor. Deshalb den Rumpf elliptisch statt rund, die Karte leicht weichzeichnen und die Steuerstärke senken [Annahme].
- **Proportionen:** Das Modell ist ein Erwachsener von gut 1,75 m (`koerper.py:37`). An die Frau nur gleichmäßig skalieren – dann bleiben Bodenkontakte gültig. Die Retargeting-Funktion von Wan ausschalten, weil ihre Knochenlängen aus 2D von der Haltung abhängen [Quelle].
- **`face_video`:** Unsere Puppe hat kein Gesicht. Der lächelnde Gesichtsausschnitt des Referenzbilds, wiederholt, sorgt auch für ein motivierendes Gesicht [Annahme].
- **Puppe als Treiber für Dienste:** RTMW und MediaPipe erkennen die Puppe in 144–146 von 146 Bildern als Mensch [gemessen]. Dass das auch für die Extraktoren von Kling, Runway oder Luma gilt, ist eine Annahme.

## 2. Automatische Prüfung (Python, CPU, im Remotion-Repo, nicht im Add-on)

1. **Rahmen prüfen:** Bildrate und Bildzahl müssen zum Steuersignal passen (k·T·fps ±1).
2. **Erkennen:** RTMW pro Bild. MediaPipe nicht: Es tauscht in Seitenansichten oft links und rechts [gemessen], und sein Detektor nutzt das Gesicht als Ersatz für die Person [Quelle]. Sapiens nicht: Lizenz CC-BY-NC, auf GPU ausgelegt [Quelle]. Bewusst ein anderer Schätzer als ViTPose, den Wan selbst nutzt, damit Prüfung und Erzeugung nicht dieselben blinden Flecken teilen [Annahme].
3. **Soll-Punkte:** Mit derselben Kamera projizieren. Die Verdeckung kommt aus dem Tiefenpuffer und senkt das Gewicht der kamerafernen Gelenke.
4. **Ausrichten:** Eine globale Ähnlichkeitstransformation (Maßstab und Verschiebung). Weicht sie mehr als 10 % ab, wird der Clip markiert.
5. **Kennzahlen pro Bild:** OKS über die 12 Körpergelenke mit den COCO-Sigmas (Schulter 0,079 … Hüfte 0,107; Fläche ≈ 0,53 × Box) [Quelle]. Dazu PCK@0.1 und PCK@0.2 relativ zur längeren Boxseite [Quelle].
6. **Schwellen pro Clip** (Startwerte aus der Kalibrierung; [Annahme] bis zur Nachkalibrierung):
   - Median-OKS ≥ 0,75 und 10 %-Quantil ≥ 0,60.
   - Kein Fenster von 0,3 s oder mehr mit OKS < 0,5.
   - PCK@0.1 der bewegten Gelenke ≥ 0,8.
7. **Seitentausch:** OKS gegen das Soll vergleichen mit OKS gegen getauschte Bezeichnungen und gegen die gespiegelte Pose. Ein Fehler zählt erst, wenn der Tausch in mehr als 50 % eines Abschnitts gewinnt: Der Schätzer tauscht flackernd (RTMW 5 von 56 stehenden Seitenansichten), ein falsches Bein im Video bleibt durchgehend falsch.
8. **Bodenkontakt:** Welche Gelenke aufliegen, folgt aus der Vorwärtskinematik (Höhe gegen `KONTAKT`, `koerper.py:114`). In diesen Bildern muss der Kontaktpunkt auf 0,05 × Personengröße stimmen und darf über das Kontaktintervall höchstens 0,03 × Größe wandern. Das Soll rutscht selbst bis 3 cm (`docs/animationen.md:62-70`).
9. **Zeit:** Die Ausgabe ist bildgenau an das Steuersignal gekoppelt; Kreuzkorrelation für den Versatz (≤ 2 Bilder) und Autokorrelation für die Periode (±2 %) reichen. DTW mit einem Band von ±10 % nur für Treiberdienste, deren Ausgabe kürzer werden kann [Quelle bei Kling].
10. **Ergebnis:** Was durchfällt, kommt zur Sichtprüfung mit einem Überlagerungsvideo, in dem das Soll-Skelett über das Video gelegt und abweichende Gelenke rot sind. Die Freigabe zu „geprüft" bleibt beim Menschen.
- **Zeitbedarf:** Bei 10–15 fps abgetastet etwa 17–26 s pro Clip auf der CPU [gemessen hochgerechnet].
- **Später möglich:** Ein 3D-Abgleich mit SAM 3D Body, das 2D-Punkte als Vorgabe annimmt [Quelle; ob es hier hilft, ist eine Annahme].

## 3. Nahtlose Schleife

- **Mehr erzeugen als nötig:** Das Steuersignal für einen Vorlauf von mindestens einem Zyklus, k Zyklen und einen kurzen Nachlauf rendern und in einem Durchgang erzeugen; bei Wan-Animate sind das verkettete Segmente.
- **Vorlauf verwerfen:** Er enthält das Einschwingen vom Referenzbild [Annahme].
- **Schnitt:** Genau k·T·fps Bilder, die Naht mitten in der längsten Haltephase (`halten_s`). Dort steht die Pose still, und die Überblendung muss nur Haare, Licht und Stoff ausgleichen. Bei Drills ohne Haltephase die langsamste Phase des Solls nehmen.
- **Überblenden:** Die letzten 6–10 Bilder mit den 6–10 Bildern *vor* dem Startbild aus dem Vorlauf mischen. Sie haben dieselbe Pose, also schließt das letzte Bild genau an das erste an [Annahme].
- **Naht prüfen:** Bildabstand (SSIM oder LPIPS) und kein Sprung der Punktgeschwindigkeit an der Naht.
- **Alternative:** VACE mit gleichem erstem und letztem Bild plus Steuerung, sodass das Modell die Schleife selbst schließt [Annahme, testen]. `WanAnimatePipeline` sieht im Aufruf kein Endbild vor [Quelle: README-Beispiel]. Erst-/Endbild-Modelle wie Wan FLF2V gibt es, aber ohne Posensteuerung [Quelle].
- **Ping-Pong ist ungeeignet:** Es kehrt Schwerkraft, Flugphasen und den Wechsel zwischen konzentrischem und exzentrischem Tempo um, ebenso Abfolgen wie Bird-Dog (links, dann rechts). Unsere Bewegung ist ohnehin eine Schleife.
- **Im Browser:** Das `loop`-Attribut kann an der Naht kurz haken; die Belege sind anekdotisch [Quelle]. Deshalb:
  - Progressives MP4, kein HLS.
  - Schlüsselbild an Bild 0, ganzzahlige Bildzahl pro Zyklus.
  - Drills mit mehreren Zyklen auf 2–5 s bringen, damit die Naht seltener kommt. Beispiele: high-knees 5 × 0,46 s = 69 Bilder, a-skip 5 × 0,84 s = 126 Bilder.

## 4. Auslieferung

- **Kodierung wie `Remotion/scripts/ausliefern.sh:31-38`:**
  - H.264 High, yuv420p, `+faststart`, ohne Ton; CRF etwa 26–28, schärfer als beim Rennen (CRF 31), weil Hände und Gesicht zählen.
  - Dazu AV1 (SVT, CRF etwa 38–42) als Rückfall, nicht zum Sparen (`ausliefern.sh:6-11`; auch hier war AV1 nicht kleiner [gemessen]).
  - Safari spielt AV1 nur auf Geräten mit Hardware-Dekoder (A17 Pro, M3) [Quelle].
  - Standbild als WebP mit Qualität 78 aus Bild 0, dazu ein Vorschaubild von 288×216 für die Liste (96×72 bei dreifacher Pixeldichte, `fachlich.css:650`).
- **Größe:** Geschätzt 0,15–0,35 MB pro Clip und Codec bei 640×480 [Annahme, zwischen den gemessenen Grenzen]. Die ganze Bibliothek mit zwei Codecs liegt bei etwa 20–40 MB. Ob das ins Add-on-Abbild kommt oder nachgeladen wird, muss der Hauptagent entscheiden. Cache, Range-Anfragen und `ETag` für `assets/` sind schon gelöst (`docs/backend.md:217-238`).
- **Liste:**
  - Heute laufen alle Vorschauen gleichzeitig mit 20 fps (`UebungenAbschnitt.tsx:127-133`, `LaufAbcAbschnitt.tsx:181-187`).
  - Mit Video nur Standbilder: Eine WebKit-Meldung nennt ein geräteabhängiges Dekoder-Limit, auch pausierte Videos belegen eins, ein Apple-Ingenieur widerspricht [Quelle, anekdotisch].
  - Genau ein `<video>` spielt: im aufgeklappten Element (`UebungenAbschnitt.tsx:213-253`) bzw. im Workout (`Workout.tsx:243`).
  - Beim Schließen das Video entfernen, damit der Dekoder frei wird [Annahme].
- **Videoelement:** Muster aus `RennenImHintergrund.tsx`:
  - Attribute `muted playsInline loop poster disablePictureInPicture`.
  - Vor `play()` `muted` und `defaultMuted` setzen (`:92-96`).
  - `NotAllowedError` im Stromsparmodus abfangen und einen Abspielknopf zeigen (`:61-74`) [Quelle WebKit-Bug 216887].
  - `IntersectionObserver` hält das Video außerhalb des Sichtbereichs an (`:77-83`; iOS hält ohnehin an [Quelle]).
  - `preload="none"`, bis die Übung geöffnet wird.
- **Reduzierte Bewegung und Datensparmodus:** `prefers-reduced-motion` und `saveData` (`:44-47`, `Figur.tsx:17-19`) zeigen nur Standbilder. Je Schlüsselbild ein Standbild aus dem Video, genau an der bekannten Zeit Σ(`halten_s` + `uebergang_s`). Das ersetzt `FigurStandbild` pro Bild (`UebungenAbschnitt.tsx:341`).
- **Hell und Dunkel:**
  - Ein neutraler, hellgrauer Studiohintergrund, im Dunkelmodus als Karte mit Radius, eventuell `filter: brightness(.9)` [Annahme].
  - Kein Alphakanal: Er bräuchte HEVC-Alpha für Safari und VP9-Alpha-WebM für Chrome [Quelle], und das Freistellen nähme die Kontaktschatten weg.
  - Die Strichfigur bleibt Rückfall für ungeprüfte Übungen.

## 5. Wiederholungstempo

- **Bildgenau:** Ausgabebild i gehört zu Steuerbild i. Das Tempo stimmt, wenn die Abtastrate des Steuersignals, die Bildrate des Modells und die Abspielrate gleich sind.
- **Die typische Falle** ist eine stille Umrechnung der Bildrate: Wan-Vorverarbeitung mit `--fps 30`, Comfy-Workflows mit 16 fps, Fun- und VACE-Modelle mit 81 Bildern bei 16 fps, Act-Two mit 24 fps [Quelle].
- **30 fps nehmen, wo das Modell es kann:** 53 von 59 Schleifen sind dann ganzzahlig; die 6 übrigen Drills über mehrere Zyklen.
- **Bei 16-fps-Modellen:** T·16 auf ganze Bilder runden (Abweichung unter 1 % bei Kraftübungen) und auf 30 fps interpolieren. Bei Drills das Steuersignal um den Faktor 2 dehnen und doppelt so schnell ausspielen [Annahme].
- **Messen:** Periode per Autokorrelation (±0,3 % genau [gemessen]); in Haltephasen muss die Punktgeschwindigkeit nahe null sein.
- **Korrigieren:** Ab ±2 % Abweichung per `setpts` oder Interpolation umrechnen, aber höchstens etwa 10 %. Darüber neu erzeugen [Annahme].

## Quellen
- Wan2.2-README (Lizenz, Diffusers-Pipeline mit `pose_video`/`face_video`): https://github.com/Wan-Video/Wan2.2
- Wan-Animate-Vorverarbeitung: https://github.com/Wan-Video/Wan2.2/blob/main/wan/modules/animate/preprocess/UserGuider.md, https://github.com/Wan-Video/Wan2.2/blob/main/wan/modules/animate/preprocess/human_visualization.py (`draw_aapose_new`), https://github.com/Wan-Video/Wan2.2/blob/main/wan/modules/animate/preprocess/preprocess_data.py (`--fps` 30)
- Wan-Animate-Paper: https://arxiv.org/html/2509.14055v1
- ComfyUI-Anleitung Wan2.2 Animate: https://docs.comfy.org/tutorials/video/wan/wan2-2-animate
- VideoX-Fun (Fun-Control, VACE-Fun): https://github.com/aigc-apps/VideoX-Fun
- VACE: https://arxiv.org/abs/2503.07598
- HVG: https://www.emergentmind.com/papers/2602.21188
- Champ: https://arxiv.org/abs/2403.14781
- RealisDance: https://arxiv.org/abs/2409.06202 · RealisDance-DiT: https://arxiv.org/abs/2504.14977
- Kling Motion Control: https://kling.ai/quickstart/motion-control-user-guide
- Runway Act-Two: https://help.runwayml.com/hc/en-us/articles/42311337895827
- Luma Modify (Sekundärquelle): https://www.atlascloud.ai/blog/tips/luma-modify-video
- BlazePose: https://arxiv.org/abs/2006.10204
- rtmlib: https://github.com/Tau-J/rtmlib
- Sapiens: https://arxiv.org/abs/2408.12569, https://huggingface.co/facebook/sapiens
- SAM 3D Body: https://arxiv.org/abs/2602.15989
- COCO-OKS-Sigmas (`cocoeval.py`, Zeile 523): https://github.com/cocodataset/cocoapi/blob/master/PythonAPI/pycocotools/cocoeval.py
- Definition PCK (Übersichtsarbeit): https://arxiv.org/abs/2204.07370
- iOS-Videoregeln: https://webkit.org/blog/6784/new-video-policies-for-ios/
- WebKit-Bugs: https://bugs.webkit.org/show_bug.cgi?id=216887, https://bugs.webkit.org/show_bug.cgi?id=193449
- webkit-dev 2025: https://lists.webkit.org/pipermail/webkit-dev/2025-April/032746.html
- AV1 bei Apple: https://community.bitmovin.com/t/everything-you-need-to-know-about-apple-av1-support/2330
- Video mit Transparenz: https://jakearchibald.com/2024/video-with-transparency/
- Schleifenlücke: https://support.cloudinary.com/hc/en-us/community/posts/360048210971-Video-Loop-Error-Not-Seamless, https://mux.com/blog/mobile-safari-hls-bug-with-short-form-looping-videos
- Erst-/Endbild-Knoten: https://www.runcomfy.com/comfyui-nodes/ComfyUI/wan-first-last-frame-to-video
- Remotion three.js: https://www.remotion.dev/docs/three
- WYD-Benchmark: https://arxiv.org/abs/2503.04666

Dateien im Scratchpad unter `/tmp/claude-0/-home-user/bf8cf066-c69c-54cc-8f0b-85da01f0d936/scratchpad/`:
- `proto/puppe.py`
- `proto/render_beispiele.py`
- `proto/pruefe_schaetzer.py`
- `proto/kalibriere.py`
- `proto/ausrichtung.py`
- `proto/tempo.py`
- `proto/clip.py`
- `proto/out/*.png`
- `enc/*.mp4`, `enc/*.webm`
- `eval1.log`, `eval2.log`