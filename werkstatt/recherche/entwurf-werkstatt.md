# Variante B als „Werkstatt“: Architektur

Kennzeichnung: **[B]** heißt belegt, entweder im Code oder Repo selbst nachgesehen (Zeilen unten) oder im Dossier mit Quelle. **[A]** heißt Annahme oder Schätzung. In Tri-Coach und Remotion habe ich nichts geändert.

## 0. Kurzfassung

1. **Alles Erzeugen geschieht außerhalb des Add-ons**, im Remotion-Repo:
   - `werkstatt/` für Python, `src/Uebung/` für Remotion-Kompositionen, `scripts/uebungsvideos-ausliefern.sh` für die Auslieferung.
   - Tri-Coach bekommt nur fertige, abgenommene Dateien und eine `manifest.json`.
2. **Ein Clip hängt an `(schluessel, bewegungs_hash)`.**
   - `bewegungs_hash` ist eine neue Prüfsumme über genau die Teile, die man im Video sieht: `ansicht`, `unterlage`, `requisiten`, `ablauf`.
   - Das Backend rechnet sie bei jeder Ausgabe aus, die Oberfläche vergleicht nur noch Zeichenketten.
   - Weicht der Wert ab, zeigt die App die Strichfigur. Das gilt sofort und ohne Zutun.
3. **Tri-Coach ändert wenig:**
   - eine Funktion, ein Schemafeld, eine Zeile in `als_ausgabe`, ein Feld in `types.ts`;
   - ein neuer Ordner `frontend/src/uebungsvideos/` und eine neue Komponente `UebungsVideo.tsx`, eingesetzt an drei Stellen;
   - zwei Tests.
   - **Keine Migration, kein neuer Endpunkt, kein Job, keine Änderung am Runner.**
4. **Ausgeliefert wird im Vite-Bündel**, wie beim Rennvideo. Damit gelten Cache, Byte-Bereiche und `ETag` schon heute. Video und `bibliothek.json` reisen im selben Commit.
5. **Nur H.264, kein AV1.** Das Rennen braucht AV1 als Rückfall für Browser ohne H.264. Hier gibt es einen besseren Rückfall, die Strichfigur. Das halbiert die Größe, und C2PA kann ohnehin nur MP4.
6. **Pilot:** `lateral-lunge`, `glute-bridge`, `side-plank`, `bird-dog`, `push-up`.
   - Zwei Wege: Kling 3.0 Motion Control mit Gliederpuppe als Treiber über fal, und SCAIL selbst betrieben mit Zylinder-Render.
   - Höchstens 3 Versuche je Übung, Abbruchkriterien in Abschnitt 4.

---

## 1. Pipeline Schritt für Schritt

### Aufbau der Werkstatt im Remotion-Repo

Alles Folgende ist Vorschlag.

```
werkstatt/
  requirements.txt            numpy, pillow, rtmlib, onnxruntime, opencv-python-headless, pyyaml, fal-client, requests
  tricoach/                   wörtliche Kopien: koerper.ts, bewegung.ts, typen.ts, QUELLE.txt (Tri-Coach-Commit)
  soll.mts                    Node: spielt die Bewegung ab → soll.json
  bestand.py                  was fehlt, was veraltet ist, was sich umstempeln lässt
  steuersignal.py             Puppe, Skelett, Zylinder, Tiefe, Normalen (aus proto/puppe.py)
  erzeuger/{kling_fal,scail_comfy,wan_animate2}.py   ein Adapter je Weg
  comfy/{scail.json, modelle.lock}                   festgeschriebener Workflow, SHA-256 der Gewichte
  pruefung.py, schnitt.py, manifest.py, kodieren.sh
  auftraege/<schluessel>.yaml   Weg, Prompt-Zusatz, k, Kamera-Abweichung, Seed, Status
  abnahme/<schluessel>-<hash8>.json   Abnahmeprotokoll (in Git)
  trainerin/{prompts.md, HERKUNFT.md, bilder.sha256}  die Bilder selbst im Archiv, nicht in Git
src/Uebung/{UebungClip.tsx, Abnahmebogen.tsx}; public/ki/eu-ai-symbol.svg
scripts/bewegungen-holen.sh, scripts/uebungsvideos-ausliefern.sh
out/werkstatt/<schluessel>/<hash8>/v<n>/…    Rohdaten, von Git ignoriert
```

`out` steht schon in `.gitignore` [B].

### Die zehn Schritte

| # | Schritt | Werkzeug / Modell | Wo es läuft | Eingabe → Ausgabe |
|---|---|---|---|---|
| 1 | Eingabe und Bestand | `bestand.py`. Den Hash holt es über die Tri-Coach-venv aus `app.animation.bibliothek_datei`; die Datei kommt ohne Django aus (Docstring `bibliothek_datei.py:3-4`) [B] | Laptop der Werkstatt | `../Tri-Coach/backend/app/animation/bibliothek/bibliothek.json` auf einem festen Commit, dazu `abnahme/*.json` → `out/werkstatt/bestand.json` (aktuell / veraltet / fehlt / umstempelbar), je Clip `bewegung.json` und `quelle.txt` |
| 2a | Bewegung abspielen | `soll.mts` mit Node 22 und den Kopien von `koerper.ts` und `bewegung.ts`. Das Abspielen gibt es **nur** in TypeScript (`bewegung.ts:33-56`); in `backend/app/animation/` gibt es keine Python-Funktion dafür (per grep geprüft) [B]. So entsteht keine dritte Fassung des Abspielens | Laptop | `bewegung.json` → `soll.json`: je Ausgabebild die Pose, 26 Gelenkpunkte in 3D und die Kontakte; dazu der Zeitplan mit T, k, Vorlauf, Schnittbild und Überblendfenster |
| 2b | Steuersignal rendern | `steuersignal.py`. Die Gelenkpunkte kommen aus `soll.json`, Radien aus `koerper.py` `SEGMENTE`. Kanäle: `puppe` (schattiert, mit Matte, Requisiten und Kontaktschatten), `skelett` (Wan, `draw_aapose_new`), `zylinder` (SCAIL), `tiefe`, `normalen` | Laptop, 0,16–0,40 s je Bild [B, Prototyp] | → je Kanal eine PNG-Folge; für Dienste ein MP4 mit H.264, CRF 12; `start.png` mit 1600×1200 als Posenvorlage |
| 3 | Referenzfigur | Kurzer Vergleich von Gemini 3 Pro Image über Vertex AI (C2PA) und FLUX 3, danach ein Modell für alles. Dazu Ähnlichkeitstest und Auswahl durch einen Menschen [A] | Bild-API | `prompts.md` und je Übung `start.png` → `master.png` (A-Pose, von vorn), `ansichten/*.png`, `startposen/<s>-<hash8>.png` (4:3, Ausschnitt wie `start.png`), `HERKUNFT.md` |
| 4 | Generierung | Adapter `erzeuge(auftrag) → roh.mp4`. **P1** `kling_fal`: Kling 3.0 MC Pro, Treiber `puppe`, Ausrichtung „video“, Element aus Master und Ansichten. **P2** `scail_comfy`: SCAIL-Preview 14B bzw. SCAIL-2 `--pose` mit ComfyUI und WanVideoWrapper, Treiber `zylinder`. **Rückfall** `wan_animate2` über WaveSpeed, Treiber `puppe` | P1/Rückfall: API von fal bzw. WaveSpeed. P2: gemietete GPU mit 80 GB (H100/A100) [A] | Treiber, Startposenbild, fester Prompt und fester Seed → `v<n>/roh.mp4` und `auftrag.json` (Modell, Endpunkt bzw. Version, Request-ID, Seed, Kosten, SHA-256 aller Eingaben) |
| 5 | Automatische Prüfung | `pruefung.py` mit RTMW (rtmlib) gegen die Soll-Punkte aus `soll.json`, mit derselben Kamera projiziert. Einzelprüfungen in der Liste darunter | CPU, 17–26 s je Clip [B, hochgerechnet] | `roh.mp4` und `soll.json` → `pruefung.json` und `ueberlagerung.mp4` (Soll-Skelett, abweichende Gelenke rot) |
| 6 | Schleife und Schnitt | `schnitt.py` legt den Schnitt fest. Kommt das Modell mit 16 fps, verdoppelt RIFE auf 32 fps; die Bildzahl je Schleife bleibt dabei ganzzahlig [A]. Danach Remotion `UebungClip.tsx`: zwei `<OffthreadVideo>`-Ebenen mit `interpolate`-Überblendung, EU-KI-Symbol oben rechts | Laptop | `roh.mp4` und `schnitt.json` → `master.mov` (ProRes oder PNG, gerendert mit `--image-format=png`, weil `remotion.config.ts:13` JPEG setzt [B]) |
| 7 | Kodierung | `kodieren.sh` nach dem Muster von `scripts/ausliefern.sh:31-38` [B], dann `c2patool` | Laptop | `master.mov` → `<s>-<h8>.mp4` (H.264 High, yuv420p, 640×480, CRF 26–28, veryslow, `+faststart`, ohne Ton, ein Schlüsselbild an Bild 0), `<s>-<h8>.webp` (Bild 0, Qualität 78), `<s>-<h8>-klein.webp` (288×216). Das MP4 wird nach dem Kodieren mit C2PA signiert |
| 8 | Menschliche Abnahme | Remotion Studio mit `Abnahmebogen.tsx` und `werkstatt abnehmen <s>`; Inhalt der Komposition in der Liste darunter | Laptop | → `abnahme/<s>-<h8>.json`, in Git: Entscheidung, Grundkategorie (`bewegung` / `erzeugung` / `figur` / `naht` / `kennzeichnung`), Notiz, wer, wann, SHA-256 aller Dateien, Modell und Seed |
| 9 | Auslieferung | `scripts/uebungsvideos-ausliefern.sh ../Tri-Coach/frontend/src/uebungsvideos`, ablauf in der Liste darunter | Laptop, danach Pi-Build | → Mediendateien und `manifest.json` in Tri-Coach |
| 10 | Anzeige | `videoFuer()` und `UebungsVideo.tsx`, siehe Abschnitt 3 | Browser | Manifest und `AnimationOut.bewegungs_hash` → Video oder Strichfigur |

**Zu Schritt 2b, Kamera und Zeitplan:**
- Die Richtung kommt aus `ansicht`. Die Kamera ist perspektivisch mit langer Brennweite [A] und steht über den ganzen Clip fest.
- Der Ausschnitt ist 4:3 über alle Posen, wie in `szene.ts:127-166`. Erzwingt ein Modell 16:9, liegt ein 4:3-Sicherheitsbereich in der Mitte.
- Bildrate: wie das Modell sie kann, also 30 oder 16. Bei 16 fps wird gedehnt auf T′ = round(T·16)/16, die Abweichung bleibt unter 1 % [B].
- Zeitplan: Vorlauf max(1,5 s; T/2), dann k Zyklen mit k·T ≥ 5 s, dann 0,5 s Nachlauf. Ein Durchgang über die Bibliothek ergibt so **476 s für Kraft und Mobility und 54 s fürs Lauf-ABC** [B, nachgerechnet].
- 22 Übungen kommen dabei über 10 s. Für Dienste mit 10-s-Grenze gilt deshalb k = 1 und 1 s Vorlauf.
- Das Videomodell bekommt `start.png` zusätzlich als Vorlage für das Bild der Startpose.

**Zu Schritt 5, die Einzelprüfungen:**
- Bildrate und Bildzahl, Schnitte (ffmpeg `scdet`), Kamera ruhig.
- OKS: Median ≥ 0,75, 10-%-Quantil ≥ 0,60, kein Fenster von 0,3 s mit Werten unter 0,5.
- PCK@0.1 der bewegten Gelenke ≥ 0,8.
- Seitentausch zählt erst, wenn er in mehr als 50 % eines Abschnitts gewinnt.
- Kontakt: Abweichung höchstens 0,05·H, Wandern höchstens 0,03·H.
- Periode ±2 %, Versatz ≤ 2 Bilder.
- Die Schwellen stammen von Puppen und werden an den ersten 10–20 echten Clips nachkalibriert [B, Dossier-Hinweis].

**Zu Schritt 6, der Schnitt:**
- Er liegt in der längsten `halten_s`-Phase nach dem Vorlauf. Die Bildnummer ist aus `soll.json` exakt bekannt, weil das Video bildgenau am Steuersignal hängt [B, gemessen].
- Länge genau k·T·fps Bilder. Überblendet werden 6–10 Bilder mit den Bildern *vor* dem Startbild.
- Ping-Pong scheidet aus.

**Zu Schritt 7, kein AV1:**
- Das Rennen liefert AV1 nur als Rückfall für Browser ohne H.264 (`ausliefern.sh:6-11`, `docs/frontend.md:597-603`) [B].
- Hier ist die Strichfigur der Rückfall.

**Zu Schritt 8, was der Abnahmebogen zeigt:**
- Soll-Puppe, Ergebnis und Überlagerung nebeneinander.
- Die Naht: die letzte Sekunde und die erste Sekunde, dreimal hintereinander.
- Die Vorschau in 96×72 und die Karte im Dunkelmodus.
- Den Gesichtsausschnitt aus Master und Clip nebeneinander.
- Die Kennzahlen aus `pruefung.json`.
- Was in Schritt 5 durchfällt, kommt nur mit Begründung zur Abnahme.

**Zu Schritt 9, was das Skript tut:**
- Es nimmt nur angenommene Clips, deren Hash gleich dem Hash im aktuellen Tri-Coach-Checkout ist.
- Es schreibt `manifest.json`, löscht verwaiste Dateien und gibt die Größensumme aus.
- Danach in Tri-Coach: Branch, `pytest`, `npm run build`, PR, neue Version in `config.yaml`. Der Pi baut lokal, laut `docs/backend.md:455-466` 15–20 min [B].

**Was sich wiederholen lässt:**
- **Bitgleich:** die Schritte 1, 2, 5, 6, 7 und 9, wenn Commits und Werkzeugstand festgeschrieben sind.
- **Nicht bitgleich:** die Generierung in Schritt 4. Bei einer API ist sie gar nicht wiederholbar, auf der eigenen GPU mit Seed nur ungefähr [A].
- Deshalb kommen die Rohclips **ins Archiv** und nicht in Git, also auf einen privaten Speicher, analog zu `footage-laden.sh`. „Wiederholbar“ heißt dann: aus dem Rohclip neu schneiden und neu kodieren, ohne noch einmal zu zahlen.

---

## 2. Datenmodell und Verknüpfung

### Der Hash

Definition: SHA-256 über den Text `"tricoach-bewegung/1\n" + json.dumps({k: b[k] for k in ("ansicht","unterlage","requisiten","ablauf") if k in b}, sort_keys=True, ensure_ascii=False, separators=(",",":"))`. Verwendet werden die ersten 16 Hexzeichen. Sie steht neben `fassung()` in `bibliothek_datei.py:23`.

- **Er gilt für den Bibliothekseintrag und für `zeile.daten` gleichermaßen.** `daten_aus` streicht nur Schlüssel, Name und Aliase (`bibliothek.py:32-34`) [B]. Ein Test prüft das nach dem Weg durch Postgres (jsonb) [A, deshalb der Test].
- **`fassung` taugt dafür nicht:**
  - Sie läuft über den ganzen Eintrag, `einspielen()` übergibt ihn vollständig (`bibliothek_datei.py:23-26`, `bibliothek.py:43-44`) [B]. Ein neuer Alias oder ein geändertes `betont` würde das Video unnötig ungültig machen.
  - KI-Zeilen haben `fassung = None` (`erzeugung.py:156`) [B].
  - `AnimationOut` gibt sie nicht aus (`schemas.py:1911-1932`) [B].
- **Nur Python rechnet den Hash.** JavaScript würde `4.0` als `4` schreiben; `bibliothek.json` enthält `4.0` [B]. Die Werkstatt ruft dieselbe Funktion über die Tri-Coach-venv auf. Im Browser wird nichts gerechnet, also braucht es auch kein `crypto.subtle`. Das gäbe es ohnehin nur in einem sicheren Kontext, und das wäre ein Problem bei HTTP im LAN [A].

### Das Manifest

`frontend/src/uebungsvideos/manifest.json`, erzeugt von der Werkstatt, nie von Hand:

```json
{ "format": 1, "werkstatt": "<remotion-commit>",
  "clips": { "glute-bridge": {
      "bewegungs_hash": "3f9c1a2b…", "datei": "glute-bridge-3f9c1a2b",
      "breite": 640, "hoehe": 480, "fps": 30, "schleifen": 2, "dauer_s": 7.2,
      "ki": { "bild": "<bildmodell>", "video": "<videomodell>" }, "abgenommen_am": "2026-…" } } }
```

Die Werkstatt hält die Gegenstücke: `abnahme/<s>-<hash8>.json` sowie `bewegung.json` je Clip, für das Umstempeln.

### Lebenslauf eines Clips

| Ereignis | Hash | In der App | In der Werkstatt |
|---|---|---|---|
| Rezept korrigiert und neu gelöst | neu | Strichfigur, und zwar im selben Release. `test_uebungsvideos.py` lässt keinen Manifest-Eintrag mit veraltetem Hash zu | `bestand` meldet „veraltet“; neu erzeugen, neue Startpose |
| Nur Name, Alias oder `betont` geändert | gleich | Video bleibt | nichts |
| Gleitkomma-Rauschen beim Neulösen (0,1°, `docs/animationen.md:108-115`) [B] | neu | Strichfigur, bis neu ausgeliefert ist | `umstempeln`: Weichen die Gelenke höchstens 1 cm ab und ist der Zeitplan gleich, kommt der neue Hash in den Eintrag, ohne neu zu erzeugen. Ein Mensch bestätigt [A] |
| **In der App „Animation verwerfen …“** (der Link steht auch an freigegebenen Animationen, `UebungenAbschnitt.tsx:359`) [B] | – | `zustand = verworfen`; `verzeichnis()` zeigt nur `SICHTBAR` (`bibliothek.py:25,65-73`) → keine Animation, kein Video. Ersetzt die KI sie, ist `herkunft = ki` und der Hash ein anderer → Figur „ungeprüft“. **Beim nächsten Start holt `einspielen()` die Bibliothek zurück** (`bibliothek.py:44`, gewollt laut `test_animation.py:212-219`) → das Video ist wieder da | nichts; das Verwerfen betrifft die Bewegung, nicht das Video |
| Bei der Abnahme abgelehnt | – | kein Eintrag → Figur | Grund `bewegung`: Tri-Coach-Rezept ändern. `erzeugung`: neuer Versuch, Seed oder Weg. `figur`: neues Startposenbild |
| Rückruf nach der Auslieferung | – | Figur ab dem nächsten Release; einen Notschalter aus der Ferne gibt es bewusst nicht | `ausliefern.sh --zurueckziehen <s>` |
| KI-Übung | anders | immer Figur, denn `videoFuer` verlangt `herkunft === 'bibliothek'` | erst in die Bibliothek übernehmen, siehe unten |
| Add-on aktualisiert, `einspielen` noch nicht gelaufen | alt gegen neu | Figur bis zum Start (`main.py:55-62`); das Update startet ohnehin neu | – |

**KI-Übung übernehmen:** `uebernimm` speichert nur die gelöste Bewegung, nicht das Rezept (`erzeugung.py:151-162`) [B]. Übernehmen heißt also, ein Rezept in `rezepte.json` zu schreiben. Ob die Rohantwort im `KiJob` steht, habe ich nicht geprüft.

**Vorschlag für den Text beim Verwerfen:** Wo ein Video läuft, heißt der Link „Bewegung verwerfen …“, mit dem Hinweis „Video und Animation werden ersetzt“. Eine Beschwerde nur über das Video („Hand sieht falsch aus“) führt in Phase 1 nicht zu einem neuen Endpunkt. Möglich sind dann:
- der Schalter „Strichfigur zeigen“ je Gerät;
- der Meldeweg in `Rechtliches.tsx`.

---

## 3. Änderungen in Tri-Coach

Keine Migration, kein neuer Endpunkt.

**Backend**

| Datei | Änderung |
|---|---|
| `backend/app/animation/bibliothek_datei.py` (neben `:23`) | `bewegungs_hash(bewegung: dict) -> str` wie oben, ohne Django |
| `backend/app/schemas.py:1911-1932` `AnimationOut` | `bewegungs_hash: str` |
| `backend/app/routers/animationen.py:37` `als_ausgabe` | `bewegungs_hash=bewegungs_hash(zeile.daten)`. Darüber laufen `/einheit/…`, `/{schluessel}` und laut Dossier `/ablauf` (`training.py:30-58`) [B]. Die Kosten (SHA-256 über rund 2,6 kB, höchstens 10 je Antwort) sind vernachlässigbar [A] |
| `backend/tests/test_animation.py` | Der Hash übersieht Name, Aliase und `betont`; er ändert sich mit `ablauf`; er ist für den Eintrag und für `daten` nach `einspielen()` gleich; ein Referenzwert ist festgeschrieben |
| `backend/tests/test_uebungsvideos.py` (neu) | Jeder Manifest-Eintrag: Schlüssel steht in der Bibliothek, Hash ist gleich, Dateien gibt es. Keine verwaisten Dateien im Ordner |

**Frontend**

| Datei | Änderung |
|---|---|
| `frontend/src/types.ts:881-894` `UebungsAnimation` | `bewegungs_hash: string` |
| `frontend/src/uebungsvideos/` (neu) | `manifest.json`, Mediendateien und `index.ts`. `index.ts` liest die Medien über `import.meta.glob('./*.{mp4,webp}', {query:'?url', import:'default', eager:true})` ein. `videoFuer(a)` liefert `{mp4, poster, klein, …}` nur, wenn alles gilt: `herkunft==='bibliothek'`, `zustand==='freigegeben'`, gleicher Hash, Dateien vorhanden, und auf dem Gerät ist nicht „Figur“ gewählt. Sonst `null` |
| `frontend/src/components/UebungsVideo.tsx` (neu) | `UebungsVideo` (`laeuft`, `onFehler`), `UebungsVideoStandbild`, `KiMarke`. Die Muster stammen aus `RennenImHintergrund.tsx` [B]: `muted` und `defaultMuted` vor `play()`, `NotAllowedError` → Abspielknopf, `AbortError` zählt nicht, `IntersectionObserver`, `preload="none"`, `playsInline loop disablePictureInPicture`, `nurStandbild()` bei reduzierter Bewegung oder `saveData` |
| `UebungenAbschnitt.tsx` | Neben `abspielbar()` (`:174`) kommt `videoFuer()`. In der Liste (`:127-139`) steht statt der Figur das Standbild `-klein.webp` mit KI-Marke. Aufgeklappt läuft in `.figur-buehne` (`:248-254`) das Video, derselbe Knopf hält es an; `onError` schaltet auf die Figur. Die Bildfolge (`:337-349`) **bleibt Strichfigur**: Sie trägt `betont`, die Akzentfarbe, die das Video nicht hat. Die Herkunftszeile (`:350-354`) bekommt den KI-Text. Dazu der Link „Strichfigur zeigen“ |
| `LaufAbcAbschnitt.tsx:181-193, 199` | Gleicher Einbau, ohne Mehrkosten. Es wirkt erst, wenn ABC-Clips geliefert sind |
| `Workout.tsx:241-249` | `<UebungsVideo laeuft={!modell.pausiert}>` statt der Figur, wenn ein Video da ist |
| `fachlich.css` | `.uebungs-video` (`object-fit: cover`, Hintergrund über Token) und `.ki-marke`, kein Name, der wie eine Tailwind-Utility klingt. Im Dunkelmodus nur Tokens |
| `frontend/src/marketing/Rechtliches.tsx` | Abschnitt „KI-generierte Inhalte“, siehe Abschnitt 6 |
| `vite.config.ts`, `.dockerignore`, `frontend.py` | **keine Änderung**. Die Medien landen in `dist/assets/<name>-<hash>` mit einem Jahr `immutable` (`frontend.py:30, 95-96`) [B, Dossier] |

Gemerkt wird die Wahl je Gerät in `localStorage` `tricoach.uebungen.darstellung = 'figur'`, gelesen und geschrieben in `try`, wie in `LaufAbcAbschnitt.tsx:27-45` [B].

**Rückfall auf die Figur, der Reihe nach:**
1. Es gibt keinen Eintrag, der Hash weicht ab, es ist keine Bibliotheksübung oder sie ist nicht freigegeben.
2. Auf dem Gerät ist „Figur“ gewählt.
3. Der Browser kann kein H.264 (Fehler der `<source>`) oder die Wiedergabe meldet einen Fehler.

Bei reduzierter Bewegung oder Datensparmodus gibt es **keinen** Rückfall auf die Figur, sondern das Standbild der Trainerin mit Abspielknopf (WCAG 2.2.2).

**Dokumentation:**
- `docs/animationen.md`:
  - neuer Abschnitt „Fotorealistische Videos kommen aus der Werkstatt“ mit „Ein Video gilt für genau eine Bewegung“;
  - Nachtrag zu `:41-51`;
  - Korrektur des Widerspruchs in `:165-167`.
- `docs/frontend.md`: warum hier nur H.264.
- `docs/grenzen.md`: Videos hinken Korrekturen ein Release hinterher; Videos gibt es nur für die Bibliothek.
- Ein Absatz in `CLAUDE.md`.

**Reihenfolge:**
- **PR A** bringt Hash, Feld, Komponente und ein leeres Manifest. Das Verhalten ändert sich nicht, überall bleibt die Figur, und die Werkstatt kann den Hash nutzen.
- **PR B** bringt die ersten abgenommenen Clips.

**In der Werkstatt:** Die `tsconfig.json` von Remotion hat kein `include` und `lib: ["es2015"]` (`:9`) [B]. Die Kopie von `koerper.ts` (wegen `flatMap`) ließe `npm run lint` scheitern. Also `lib: ["es2022"]` setzen oder `werkstatt/` ausschließen.

---

## 4. Pilot

### Die fünf Übungen

| `schluessel` | Lage | T, Bilder | Ansicht | Was er prüft |
|---|---|---|---|---|
| `lateral-lunge` | stehend, von vorn | 5,8 s, 4 Schlüsselbilder | 8/8 | Grundfall: Gesicht sichtbar, Seitenwechsel. Scheitert er, ist Variante B tot |
| `glute-bridge` | Rückenlage | 3,6 s, 2 | 66/16 | Liegen, Kopf auf der Matte, waagerechtes Skelett. Das Steuersignal ist schon erprobt |
| `side-plank` | Seitstütz | 4,1 s, 2 | 12/24 | Unterarmstütz; die Beine decken sich im 2D-Skelett (`proto/out/side-plank.png`) |
| `bird-dog` | Vierfüßler | 6,4 s, 4 | 70/18 | Hände tragen, links und rechts wechseln, Prüfung auf Seitentausch |
| `push-up` | Stütz | 2,8 s, 2 | 70/16 | flache Hände unter Last, schnellere Bewegung |

- **Bildzahl je Schleife:** Bei 30 fps sind es 174, 108, 123, 192 und 84, alle ganzzahlig [B]. Bei 16 fps wird gedehnt.
- **Lauf-ABC** bekommt später ein eigenes Tor (`a-skip`, `high-knees`), erst nachdem das Rezept von `a-march` repariert ist; dort schweben heute beide Füße 17 cm über dem Boden [B].
- **Halteübungen** (`plank`, `wall-sit`, `diaphragmatic-breathing`) gehören nicht in den Pilot. Für sie ist ein eigener Weg vorgesehen: Bild-zu-Video aus der abgenommenen Startpose („atmet ruhig“), ohne Posensteuerung [A].

### Ablauf

1. Referenzfigur mit Master, Ansichten und 5 Startposen.
2. P1 und P2 je ≤ 3 Versuche je Übung, bei P2 SCAIL-2 statt Preview nur, wenn Preview scheitert. Der Rückfall Wan-Animate-2 nur, wenn P1 an den Nutzungsbedingungen oder an der Qualität scheitert.
3. Automatische Prüfung, Abnahme.
4. Blindtest: Drei Personen ordnen jeden Clip einer von vier Übungen zu.

### Erfolg, wenn alles erfüllt ist

- Ein Weg schafft ≥ 4 von 5 abgenommen mit ≤ 3 Versuchen, darunter `glute-bridge` und mindestens einer von `push-up` und `side-plank`.
- In allen abgenommenen Clips ist es erkennbar dieselbe Person.
- Die Naht fällt in drei Schleifen hintereinander nicht auf.
- Automatische Prüfung und Mensch urteilen in ≥ 80 % gleich; sonst nachkalibrieren.
- ≤ 8 $ Erzeugung und ≤ 30 min Menschenzeit je abgenommenem Clip.
- Blindtest mindestens 2 von 3 richtig.

### Teilerfolg

Es gelingen nur die stehende Übung und höchstens eine am Boden. Dann gibt es Variante B nur für die 12 stehenden Kraft- und Mobility-Übungen (und später das ABC). Der Boden behält die Figur oder bekommt den 3D-Avatar.

### Abbruch

- Der beste Weg schafft ≤ 2 von 5.
- Die Hände sind bei beiden Stützübungen in allen Versuchen verformt.
- Die Identität driftet auch mit Startposenbildern.
- Die Nutzungsbedingungen passen nicht (Klings Lizenz an den Eingaben).
- Der Pilot kostet mehr als 150 $ oder dauert länger als 3 Wochen.

---

## 5. Kosten, Zeit, Risiken, offene Entscheidungen

### Kosten

Die Preise sind die Listenpreise aus dem Dossier [B]. Die Mengen sind meine Rechnung mit dem Zeitplan aus Schritt 2b [A].

| Posten | Betrag |
|---|---|
| Referenzbilder (Pilot und 59 Startposen mit je etwa 4 Kandidaten) | 10–50 $ |
| Pilot, 47 s je Durchgang, ×3 | Kling Pro ≈ 24 $ · SCAIL selbst etwa 3 GPU-h + 6–10 h Einrichtung ≈ 20–40 $ · Wan-2 720p ≈ 11 $ → **Pilot gesamt ≈ 60–110 $** |
| Serie Kraft und Mobility, 476 s × 3 | Kling Pro ≈ 240 $ · Std ≈ 180 $ · Wan-2 720p ≈ 115 $ · SCAIL selbst ≈ 30 GPU-h ≈ 60–90 $ plus Leerlauf |
| Lauf-ABC | etwa +10 % |
| C2PA-Zertifikat | eigenes, 0 $ |
| Im laufenden Add-on | **0 $**: keine API zur Laufzeit, die Arbeit des Claude-Abos bleibt unberührt |
| **Je Korrektur** | Erzeugung ≈ 1,5–3 $ (API) bzw. 1–3 $ (GPU samt Start); Startpose ≈ 0,5 $; 20–40 min Mensch; Release und Pi-Build 15–20 min; Git +0,3 MB |

### Zeitaufwand [A]

| Teil | Personentage |
|---|---|
| Werkstatt (Prototypen ausbauen, Adapter, Remotion-Kompositionen) | 8–12 |
| Tri-Coach | 2 |
| Pilot | 3–5 |
| Serie (49 Clips mit Abnahme und Nachversuchen) | 3–4 |
| **zusammen** | **etwa 16–23**, also 3–5 Wochen nebenbei |

### Größe

- **Je Clip:** H.264 mit 640×480 und 0,2–0,35 MB [A, zwischen den gemessenen 55 kB und 519 kB je 6 s].
- **Serie:** 49 Clips ≈ 10–17 MB, dazu Standbilder ≈ 2 MB.
- **Zum Vergleich:** `.git` von Tri-Coach hat heute 18 MB [B, `du`].

### Risiken und Gegenmaßnahmen

| Risiko | Gegenmaßnahme |
|---|---|
| Liegende, Stütz- und Vierfüßler-Posen gehen schief; dazu gibt es keinen Benchmark [B] | Pilot mit drei Bodenfällen, Treiber mit Tiefe (Zylinder bzw. Puppe), Tor für den Teilerfolg, Figur als Rückfall |
| Hände: das Modell hat keine Finger [B] | flache Handvorlage im Treiber [A], SCAIL-2 mit DPO, Prüfpunkt bei der Abnahme, ablehnen |
| Identität driftet über 59 Clips | ein Bildmodell, Kling-Element, Startpose je Übung, Vergleich der Gesichtsausschnitte im Abnahmebogen |
| Seitentausch oder falsches Bein | eigene Prüfung (Abschnitt-Mehrheit) und Überlagerungsvideo |
| Tempo- oder Bildratenfalle (16/24/30) | `soll.json` hält die Bildrate fest; Autokorrelation ±2 %, sonst neu erzeugen |
| Naht sichtbar | Schnitt in der Haltephase, Überblendung mit Bildern vor dem Start, SSIM an der Naht |
| Anbieter ändert sein Modell stillschweigend | Endpunkt und Version in `auftrag.json`, Rohclips im Archiv, Adapter austauschbar |
| Gleitkomma-Rauschen macht alle Clips ungültig | Bibliothek „anhängen statt neu lösen“ (`docs/animationen.md:108-115`) und `umstempeln` |
| Korrektur und Video laufen auseinander | Hash und Test in Tri-Coach, im Zweifel Figur |
| Git wächst | nur H.264 mit 640×480; ab etwa 50 MB über einen eigenen Ablageort nachdenken |
| Zehn gleichzeitige Decoder am Telefon | in der Liste nur Standbilder, genau ein `<video>` |
| Realistisches Video wirkt überzeugender als die Figur, auch wenn die Ausführung falsch ist | Abnahme durch jemanden mit Trainingsfachwissen, Blindtest |
| Ähnlichkeit mit einer realen Person | Ähnlichkeitstest dokumentieren, bei Beschwerde zurückziehen |
| Anzügliche Darstellung | Prompt-Regeln aus dem Dossier und ein eigener Abnahmepunkt |

### Offene Entscheidungen für dich

1. **Weg nach dem Pilot:** geschlossen und bequem (Kling, mit Lizenz an deinen Eingaben) oder offen und wiederholbar (SCAIL/Wan auf gemieteter GPU). Bei eigenem Betrieb bist du Anbieter im Sinne des AI Act (siehe Abschnitt 6).
2. **Ablage:** im Tri-Coach-Repo (empfohlen) oder als eigene Release-Datei bzw. Git LFS. Ob der Supervisor LFS kann, ist ungeprüft [A].
3. **Auflösung:** 640×480 oder 960×720 (×1,6 Größe, schärfere Gesichter).
4. **Liste:** Standbild der Trainerin (empfohlen) oder weiter die laufende Figur.
5. **Lauf-ABC** in Phase 1 oder später.
6. **Aussehen:** Kleidung und Farben, z. B. Volt-Akzente aus `marke.ts`.
7. **Wer abnimmt** (Fachkunde).
8. **Widerspruch zum Verwerfen:** `einspielen()` so ändern, dass eine verworfene Animation verworfen bleibt, oder die Doku angleichen.
9. **Budget-Obergrenze.**

---

## 6. Kennzeichnung als KI-generiert

Belegt laut Dossier (figur-recht): Leitlinien Rn. 113–122, Kodex Measure 1.2.2. Das ist keine Rechtsberatung.

1. **Im Video:**
   - EU-Symbol „Fully AI-Generated“ oben rechts, über die ganze Schleife, eingebrannt in `UebungClip.tsx`. Es steht damit auch im Standbild (Bild 0).
   - Unten rechts sitzt der Knopf der App (`fachlich.css:681-684`), deshalb oben rechts.
2. **In der Oberfläche:**
   - `KiMarke` am Standbild der Liste (in 96×72 ist das Symbol unlesbar), auf der Bühne und im Workout.
   - `aria-label` „KI-generiertes Video einer fiktiven Trainerin“.
   - Text an der Herkunftszeile: „KI-generiertes Video. Die Trainerin ist eine erfundene Person. Die Bewegung stammt aus der geprüften Tri-Coach-Bibliothek.“
3. **`Rechtliches.tsx`:** eingesetzte Modelle und Meldeweg für fehlende Kennzeichnung. Das allein genügt nicht (Rn. 142). Auf der Werbeseite gilt dasselbe.
4. **Maschinenlesbar:**
   - `c2patool` **nach** dem Kodieren: `c2pa.created`, `digitalSourceType = trainedAlgorithmicMedia`, der Rohclip als Zutat (Ingredient), ein eigenes Zertifikat.
   - Nur MP4; WebM unterstützt das SDK nicht, und genau deshalb fällt WebM hier weg.
5. **Bei eigenem Betrieb (SCAIL/Wan):** Tri-Coach ist dann vermutlich Anbieter (Rn. 11, 15). Dann zusätzlich ein unsichtbares Wasserzeichen vor dem Kodieren, z. B. Video Seal. Ob es CRF 27 übersteht, ist ungeprüft [A].
6. **Herkunft dokumentieren:** `werkstatt/trainerin/HERKUNFT.md` und `abnahme/*.json` (Modell, Prompt, Seed, AGB-Stand, SHA-256, Hash der Bewegung, wer wann abgenommen hat).

Die Strichfigur bleibt ohne Kennzeichnung (Rn. 113).

---

## 7. Was das Dossier offenlässt

Alles hier ist Annahme oder ungeprüft:
- **Treiber:** ob Kling eine Gliederpuppe als Treiber annimmt; ob fal-SCAIL einen eigenen Posen-Render annimmt.
- **Lizenzen:** die Lizenz der SCAIL-2-Gewichte; die Lizenz von rtmlib bzw. RTMW (vor dem Einsatz prüfen); die AGB von Kling und OpenAI im Original.
- **Prüfung:** die Schwellen der Prüfung an echtem Video; ob die Gesichtsprüfung ohne nicht-kommerzielle Modelle auskommt (InsightFace meiden).
- **Technik der Werkstatt:** ob `<OffthreadVideo>` 32-fps-Quellen bildgenau liest.
- **Tri-Coach:** ob jsonb die Zahlen so zurückgibt, dass der Hash gleich bleibt (dafür der Test); wie tief der Supervisor klont und ob er LFS kann; wo das Rezept einer KI-Animation herkommt.