# Remotion als Werkstatt für Variante B: Prüfung und Machbarkeitsprobe

**Ergebnis:** Das Remotion-Repo taugt als Werkstatt. Die Probe hat das belegt: Eine Remotion-Komposition hat `koerper.ts`, `bewegung.ts` und `bibliothek.json` direkt aus dem Nachbar-Checkout geladen. Sie hat für glute-bridge ein Skelett im Stil von OpenPose/DWPose als PNG und als MP4 gerendert, 115 Frames in etwa 10 s einschließlich Bündeln. Dazu kam ein 2,5D-Tiefenbild ohne WebGL.

Drei Dinge müssen vorher geklärt werden:
- `tsconfig` mit `lib es2015` lässt `npm run lint` scheitern.
- Remotion speichert die Einzelbilder als JPEG; das verfälscht dünne farbige Linien.
- Die „richtige“ Fassung einer KI-korrigierten Übung liegt nicht unbedingt in `bibliothek.json`.

Beide Repos sind unverändert (`git status` leer).

---

## 1. Remotion-Repo: Struktur, Kodierung, Versionen (belegt)

**Komposition `TriCoachRennen`** besteht aus fünf Dateien:

| Datei | Zeilen |
|---|---|
| `src/TriCoachRennen/TriCoachRennen.tsx` | 144 |
| `src/TriCoachRennen/Szene.tsx` | 82 |
| `src/TriCoachRennen/Einblendung.tsx` | 254 |
| `src/TriCoachRennen/diagonal.tsx` | 91 |
| `src/TriCoachRennen/marke.ts` | 48 |

- **Zwei Kompositionen** (`TriCoachRennen.tsx:124-141`): je 540 Frames bei 30 fps, 1080×1350 (`hoch`) und 1920×1080 (`band`). Ablauf über `TransitionSeries` mit diagonalen Übergängen (`:57-116`). Registriert in `src/Root.tsx:1-11`.
- **Szene** (`Szene.tsx:1,45-62`): `<Video>` aus `@remotion/media` auf `public/footage/*.mp4`. Die Clips liegen nicht im Repo (`.gitignore`); in `public/footage/` steht derzeit nur `QUELLEN.md`.
- **Marke** (`marke.ts:4-14`): Farben aus den Tri-Coach-Tokens; Schriften über `@remotion/fonts` aus `public/fonts` als woff2 (OFL) (`:27-48`).

**`remotion.config.ts`:**
- `:12` Rspack.
- `:13` `setVideoImageFormat("jpeg")`. Für Steuervideos ist das schädlich, siehe Abschnitt 3.
- `:19-42` Browser: `REMOTION_BROWSER_EXECUTABLE` oder Playwright-Headless-Shell unter `/opt/pw-browsers/chromium_headless_shell-*`. Vorhanden ist `chromium_headless_shell-1194`.

**`scripts/ausliefern.sh`** (je Format):

| Zeilen | Ausgabe |
|---|---|
| `:31-33` | MP4: H.264, CRF 31, veryslow, High@4.0, yuv420p, `+faststart` |
| `:34-36` | WebM: AV1 (SVT), Preset 6, CRF 44 |
| `:37-38` | WebP von Frame 0, Qualität 78 |
| `:28` | Band wird auf 1280×720 skaliert |

Ausgelieferte Größen in `Tri-Coach/frontend/src/auth/rennen/`: mp4 2,97 / 3,45 MB, webm 2,99 / 3,55 MB, webp etwa 40 KB.

**`scripts/footage-laden.sh`:** Lädt die Pexels-Lizenz-Clips in 1080p (`:39-40`, Lizenz `:4-6`). Danach Zuschnitt auf 1920×1080, H.264 CRF 18 slow, ohne Ton, in der eigenen Bildrate des Clips (`:44-47`).

**`package.json`:**
- `remotion`, `@remotion/cli`, `fonts`, `media`, `transitions`, `eslint-config-flat` jeweils exakt 4.0.534.
- `react` 19.2.3, `typescript` 5.9.3, `eslint` 9.39.5; `"license": "UNLICENSED"`.
- **Nicht installiert:** `@remotion/three`, `three`, `@react-three/fiber`.

**`tsconfig.json`:** `:5` `moduleResolution: Bundler`, `:9` `lib: ["es2015"]`. `resolveJsonModule` ist nicht gesetzt.

**Werkzeuge in der Sandbox:**

| Werkzeug | Stand |
|---|---|
| Node | v22.22.0, `--experimental-strip-types` funktioniert |
| ffmpeg/ffprobe | 6.1.1 mit libx264, libsvtav1, libvpx-vp9, libwebp, prores und **librsvg-Decoder** (SVG→PNG geht) |
| ImageMagick | 6.9.12, **ohne** SVG-Delegate |
| rsvg-convert | nicht vorhanden |
| Python | 3.12 mit Pillow 12.3 und numpy; kein OpenCV |
| Playwright | chromium-1194 |

## 2. Kann Remotion die Bewegungsdaten direkt nutzen?

**Belegt durch Versuch:**
- **`koerper.ts`** hat keine Imports (`koerper.ts:12-13`). Es lädt in Node direkt per `--experimental-strip-types`; `punkte({})` liefert 26 Gelenkpunkte.
- **`bewegung.ts` lädt in Node nicht.** Es importiert `'./koerper'` ohne Endung (`bewegung.ts:10`); Fehler: `Cannot find module …/animation/koerper`. Der Import `import type … from '../types'` (`:9`) würde entfernt und stört nicht.
- **Im Remotion-Bundler (Rspack) gehen alle drei:** `koerper`, `bewegung` und `bibliothek.json`, jeweils über relative Pfade in den Nachbar-Checkout. Probe: `remotion-probe/src/Steuervideo.tsx`; `remotion still` und `remotion render` liefen durch.
- **`tsc` mit der Remotion-`tsconfig` scheitert.** Grund ist `koerper.ts:65` (`flatMap`, braucht ES2019) wegen `lib es2015`. Mit `lib: ["es2022"]` und `resolveJsonModule` läuft `tsc` ohne Fehler; geprüft über eine eigene `tsconfig` im Scratchpad, die die Remotion-`tsconfig` erweitert. `npm run lint` würde also ohne diese Anpassung rot.

**Empfehlung: kopieren statt importieren.** Ein Skript holt die Dateien, als Gegenstück zu `ausliefern.sh`, etwa `scripts/bewegungen-holen.sh ../Tri-Coach`:
- `frontend/src/animation/koerper.ts` und `bewegung.ts` nach `src/Uebung/tricoach/`; in der Kopie wird `'../types'` per `sed` durch `'./typen'` ersetzt.
- `typen.ts` mit den rund 35 Zeilen aus `types.ts:846-879` (`BewegungsAnsicht`, `Requisit`, `Schluesselbild`, `Bewegung`).
- `backend/app/animation/bibliothek/bibliothek.json` nach `public/bewegungen/`. Gelesen wird es per `staticFile` und `fetch` in `calculateMetadata`; so braucht es kein `resolveJsonModule`.
- Dazu `backend/tests/fixtures/animation_fk_referenz.json` und ein Prüfschritt wie `frontend/scripts/koerper_referenz.ts`, damit die Kopie nicht unbemerkt vom Modell abweicht (`docs/animationen.md:72-79`).
- Der Tri-Coach-Commit kommt in `QUELLE.txt`.

**Wichtig zur Quelle der „richtigen“ Fassung (Code belegt, Folgerung ist Annahme):**
- `bibliothek.json` enthält die Bewegung flach (`schluessel`, `name`, `aliase`, `ansicht`, … `ablauf`). Für die API gilt `daten_aus()` (`bibliothek.py:32-34`), also dieselben Felder ohne die drei Namen.
- KI-korrigierte Fassungen stehen nur in der Datenbank. Erreichbar sind sie über `GET /api/animationen/{schluessel}` mit `bewegung = zeile.daten` (`routers/animationen.py:37-45,104`).
- **Eine KI-Fassung unter einem Bibliotheksschlüssel überlebt keinen Neustart.** `einspielen()` überschreibt jede Zeile, deren `herkunft != "bibliothek"` ist, wieder mit der kuratierten Fassung (`bibliothek.py:4-5,44-56`). Die KI darf einen Bibliotheksschlüssel nur übernehmen, wenn er verworfen ist (`erzeugung.py:148-156`).
- Folgerung: Wenn „erst nach KI-Korrekturen richtig“ Bibliotheksübungen meint, gehört die Korrektur zuerst in `rezepte.json`. Erst danach ein Video rendern.
- Jedes Video sollte mit einer Prüfsumme seiner Bewegung gestempelt werden. Am besten über dieselbe Python-Rechnung wie `fassung()` (`bibliothek_datei.py:23-26`): JavaScript schreibt `4.0` als `4`, die Prüfsumme wäre sonst eine andere.

## 3. Entwurf der Komposition „Steuervideo“

**Abbildung Körpermodell → COCO-18 in OpenPose-Reihenfolge.** Die Seiten stimmen überein: `_r` ist die rechte Seite der Person (`koerper.ts:182`, s = −1).

| COCO-18 | Körpermodell | Herkunft |
|---|---|---|
| 0 Nase | `nase` | `koerper.ts:180` |
| 1 Hals | **Mitte(`schulter_l`, `schulter_r`)**, nicht `nacken` | DWPose rechnet den Hals als Schultermittel (`neck = np.mean(keypoints_info[:, [5, 6]])`, [wholebody.py](https://github.com/huggingface/controlnet_aux/blob/master/src/controlnet_aux/dwpose/wholebody.py)). `nacken` liegt 13 cm höher. |
| 2 / 3 / 4 | `schulter_r` / `ellbogen_r` / `hand_r` | `hand` ist das Handgelenk (`:190`) |
| 5 / 6 / 7 | `schulter_l` / `ellbogen_l` / `hand_l` | |
| 8 / 9 / 10 | `huefte_r` / `knie_r` / `knoechel_r` | |
| 11 / 12 / 13 | `huefte_l` / `knie_l` / `knoechel_l` | |
| 14 / 15 Auge r / l | Kopfrahmen lokal (∓0,032; +0,03; +0,088) m | abgeleitet |
| 16 / 17 Ohr r / l | Kopfrahmen lokal (∓0,08; 0; −0,005) m | abgeleitet |

**Kopfrahmen exakt.** Er lässt sich ohne Änderung an `koerper.ts` aus den Gelenkpunkten zurückrechnen (`koerper.ts:174-180`):
- a = `kopf − nacken` = rk·(0; 0,1035; 0,01), b = `nase − kopf` = rk·(0; −0,01; 0,10925).
- Mit det = 0,011407: Y = (0,10925·a − 0,01·b)/det, Z = (0,01·a + 0,1035·b)/det, X = Y × Z (links).

**Sichtbarkeit.** Gesichtspunkte, deren Richtung vom Kopfmittelpunkt aus von der Kamera wegzeigt (dot < −0,25), entfallen, so wie DWPose Punkte unter der Konfidenzschwelle weglässt.

**Ungenutzt bleiben:** `becken`, `taille`, `brust`, `gesaess_*`, `finger_*`, `ferse_*`, `zehen_*`. Optional für die Füße nach COCO-WholeBody: großer Zeh = `zehen`, Ferse = `ferse`, kleiner Zeh = `zehen` seitlich um 4 cm versetzt. Das wäre eine Ableitung.

**Hände.** Das Modell kennt nur Handgelenk und Fingerende, also keine 21 Handpunkte. Vorschlag: Bei Stützübungen eine flache Hand als Vorlage entlang `hand→finger` auf den Boden legen. Das ist eine Annahme und ungetestet.

**Zeichenstil, belegt aus [controlnet_aux/dwpose/util.py `draw_bodypose`](https://github.com/huggingface/controlnet_aux/blob/master/src/controlnet_aux/dwpose/util.py):**
- `stickwidth = 4`; 17 der 19 `limbSeq` werden als Ellipsen in `colors[i]` gezeichnet.
- Danach `canvas * 0.6`, dann die Gelenkpunkte als Kreise mit Radius 4 in voller Farbe.
- Füße zeichnet diese Funktion nicht.

**Skizze** (vollständig lauffähig unter `remotion-probe/src/Steuervideo.tsx`):

```tsx
type SteuerProps = { schluessel: string; kanal: 'skelett'|'tiefe'|'maske';
  zielFps: number; frames: number;            // z. B. 16 / 81 (Annahme: Wan-artig, 4n+1)
  ansicht?: { gieren: number; neigen: number }; // optional abweichend von bewegung.ansicht
  ausschnitt?: [number, number, number, number]; dauerS?: number; schleifen?: number };

export const metadaten: CalculateMetadataFunction<SteuerProps> = async ({ props }) => {
  const bew = await ladeBewegung(props.schluessel);        // staticFile('bewegungen/bibliothek.json')
  const dauerS = dauer(bew);                               // bewegung.ts:19-24
  const clipS = (props.frames - 1) / props.zielFps;
  const schleifen = Math.max(1, Math.round(clipS / dauerS)); // ganze Wiederholungen
  const ausschnitt = rahmen(bew, props.ansicht);           // wie szene.ts:127-166, über ALLE Posen
  const quer = (ausschnitt[1]-ausschnitt[0]) > (ausschnitt[3]-ausschnitt[2]);
  return { fps: props.zielFps, durationInFrames: props.frames,
           width: quer ? 832 : 480, height: quer ? 480 : 832,
           props: { ...props, ausschnitt, dauerS, schleifen } };
};
// Je Frame: Zeit so gedehnt, dass die letzte Frame == erste ist (nahtlose Schleife):
const t = (frame / (frames - 1)) * schleifen * dauerS;
const kp = coco18(punkte(poseBei(bew, t)), zurKamera);    // Abbildung oben
// kanal 'skelett': <svg> Ellipsen 0,6×Farbe, dann Kreise (DWPose-Stil), schwarzer Grund
// kanal 'tiefe'/'maske': SEGMENTE (koerper.ts:58-73) als Kapseln, hinten→vorn, Boden als Verlauf
```

**Kamera.** Wie in `szene.ts:116-122` orthografisch aus `ansicht` (Vorgabe 70 / 15). Der Ausschnitt steht über die ganze Schleife, damit nichts mitzoomt.

**Rendern als Bildfolge, nicht als MP4:**

```
npx remotion render Steuervideo out/steuer/<schluessel>/skelett --sequence --image-format=png --props=…
```

`remotion.config.ts:13` setzt JPEG, und H.264 mit yuv420p verwischt die Farben der 4-px-Linien. Ob das die Erkennung im Videomodell tatsächlich stört, ist eine Annahme und nicht gemessen. Für einen Stapel über alle Übungen eignet sich ein Node-Skript mit `@remotion/renderer`; dort müssen `browserExecutable` und `chromiumOptions` ausdrücklich übergeben werden (Remotion-`CLAUDE.md`).

**Tiefe und Normalen:**
- **Erprobt ohne WebGL:** die Kapseln aus `SEGMENTE` samt Radius und der Kopf (`KOPF_RADIUS`, `koerper.ts:75`) in Graustufen nach Kameraabstand, der Boden als linearer Verlauf. Bei orthografischer Kamera hängt die Bodentiefe nur von der Bildzeile ab.
- **Mit `@remotion/three` (nicht getestet):** `npm i three @react-three/fiber @remotion/three @types/three` laut [remotion.dev/docs/three](https://www.remotion.dev/docs/three); Versionen bei 4.0.534 halten. Die Doku empfiehlt `Config.setChromiumOpenGlRenderer('angle')`. Ob in der Sandbox eher `swangle` nötig ist, ist offen.
- Mit `CapsuleGeometry`, `MeshDepthMaterial` oder `MeshNormalMaterial` und einer `OrthographicCamera` entlang `rechts`/`oben`.
- **Annahme:** Die Proportionen sind stilisiert (23-cm-Kopf, Rumpfkapseln). Ein starkes Tiefensignal gibt der Frau leicht einen Puppenkörper. Tiefe also schwach gewichten oder nur für Bodenkontakt und Requisiten nutzen.

**Kennzahlen der Bibliothek (ausgewertet):**
- Schleifendauer 0,46 bis 8,6 s, Median 4,4 s.
- 27 von 59 Übungen haben im ersten Bild das Becken unter 0,5 m: liegend, sitzend, kniend, Vierfüßler oder Stütz.
- 7 haben Requisiten. Die Foam-Roller-Übungen sind als „kasten“ modelliert; ein Tiefensignal würde dort eine Kiste zeigen.
- Die 10 Lauf-ABC-Drills dauern nur 0,46 bis 1,9 s je Zyklus, also viele Wiederholungen je Clip. Bei 16 fps sind das bei `high-knees` nur 7,4 Frames je Zyklus. Das ist ein Risiko für die zeitliche Kohärenz des Videomodells (Annahme).

## 4. Machbarkeitsprobe: gelungen (rund 15 Minuten)

Alle Pfade unter `/tmp/claude-0/-home-user/bf8cf066-c69c-54cc-8f0b-85da01f0d936/scratchpad/`:

| Datei | Inhalt |
|---|---|
| `probe/glute-bridge-skelett.png` | 832×960; oben Bild 0 (Ausgangslage), unten Bild 1 (Brücke oben) |
| `probe/glute-bridge/schluesselbild1.png` | Einzelbild 832×480 |
| `remotion-probe/out/glute-bridge-remotion.png` | `remotion still`, Frame 29; pixelgleich zum Node-Bild |
| `remotion-probe/out/glute-bridge-steuer.mp4` | H.264, 832×480, 16 fps, 115 Frames (2 Schleifen), 494 KB, etwa 10 s Renderzeit |
| `probe/glute-bridge-kontaktbogen.png` | 8 Frames aus dem Video; die Bewegung ist sichtbar |
| `probe/glute-bridge-tiefe.png` | 2,5D-Tiefe der Brücke |
| `probe/skelett.mts`, `probe/tiefe.mts` | Skripte; Weg: Node, SVG, ffmpeg mit librsvg |

**Was das Skelettbild zeigt (gesehen):**
- Schwarzer Grund, die Person liegt auf dem Rücken, Kopf rechts, Füße links.
- Blick von ihrer linken Seite (`ansicht` 66° / 16°), Maßstab 509,5 px je Meter.
- Oberes Bild: Becken am Boden, Knie etwa 104° gebeugt, Füße flach.
- Unteres Bild: Knie, Hüfte und Schultern auf einer schrägen Geraden (`huefte_beugen` ≈ 0°, Becken auf 0,30 m). Die Arme liegen flach neben dem Körper.
- Gesicht: Nase, beide Augen und das linke Ohr sind sichtbar. Das rechte Ohr fällt korrekt weg (Sichtbarkeitsmuster `111111111111111101`).
- Das Bild ist als Glute Bridge erkennbar.

**Sichtbare Schwächen:**
- Nahe und ferne Gliedmaßen decken sich in der Seitenansicht; links und rechts sind nur an der Farbe zu unterscheiden.
- Der Rumpf besteht nur aus zwei Linien Hals→Hüfte, dicht an den Armen.
- Ein waagerechtes Skelett ist im Trainingsmaterial der Posemodelle vermutlich selten (Annahme).
- Bei 3,6 s × 16 fps = 57,6 Frames schließt die Schleife nicht ganzzahlig. Deshalb die Zeitdehnung im Entwurf.

**Tiefenbild:** Körper als graue Kapseln, nah hell; Boden als Verlauf von dunkel (hinten) nach hell (vorn). Die Brücke ist klar lesbar, der ferne Arm erscheint dunkler.

## 5. Lizenz Remotion (belegt aus `node_modules/remotion/LICENSE.md`, v4.0.534)

- **Kostenlos** (`:16-23`) für Einzelpersonen, gewinnorientierte Firmen mit bis zu 3 Beschäftigten, Gemeinnützige und während der Evaluierung.
- **Erlaubt** ist dabei die Nutzung „non-commercially or commercially for the purpose of creating videos and images“ (`:27`). Verboten ist nur, ein Derivat von Remotion selbst zu verkaufen (`:31`).
- **Sonst ist eine Company License nötig** (`:41-45`, [remotion.pro/license](https://www.remotion.pro/license)).
- **Hinweis** (`:3`): Mit Remotion 5.0 ändert sich die Lizenz leicht. Vor einem Upgrade erneut prüfen.

**Einordnung:** Lokal rendern und nur die MP4/WebM-Dateien an Tri-Coach ausliefern ist genau der erlaubte Fall „creating videos“. Remotion-Code landet nicht im Add-on, und die erzeugten Videos selbst bindet die Lizenz nach ihrem Wortlaut nicht.

Ob eine Company License fällig wird, hängt nur davon ab, wer Tri-Coach betreibt. Bei einer Einzelperson oder einer Firma mit bis zu 3 Beschäftigten reicht die kostenlose Lizenz, auch beim geplanten bezahlten Livegang; bei mehr Beschäftigten nicht. Wer der Betreiber ist, ist eine Annahme. Die CLI kennt eine Option `--license-key` (Wert `free-license` vorgesehen, gefunden in `@remotion/cli/dist/render-flows/render.js`), lokal ist sie nicht nötig.

Getrennt davon zu klären sind die Lizenzen von Videomodell, Gewichten und Referenzbild; die regelt Remotion nicht.