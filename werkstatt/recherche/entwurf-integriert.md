# Variante B „Integriert": Architektur

Kennzeichnung: **[B]** heißt belegt, durch Code (Datei:Zeile), durch das Dossier oder durch eigenes Nachlesen. **[A]** heißt Annahme oder Schätzung.

Zusätzlich zum Dossier habe ich selbst nachgelesen:
- `backend/requirements.txt`: kein numpy, kein Pillow.
- `Dockerfile:17`: `python:3.12-slim-trixie`, kein ffmpeg.
- `config.yaml:28-32`: nimmt nur `postgres` und `postgres.neu` aus dem Backup.
- `garmin/automatik.py:66-106`: vier Zweige, Weckintervall 60 s.
- `routers/animationen.py:115-144`: Freigeben und Verwerfen haben **keine Rechteprüfung**. Kein Router prüft `is_staff`; `is_staff` steht nur in `types.ts:13` und `Layout.tsx:175,334`.
- `models.py:1507-1549`.
- `bibliothek.py:37-62`: `einspielen()` setzt `ki_job_id`, `model_used` und `rueckmeldung` **nicht** zurück.
- `bibliothek_datei.py:23-26`, `crypto.py:53-57`.
- `Remotion/scripts/ausliefern.sh:6-11`: WebM ist nur der Rückfall für Browser ohne H.264.

In Tri-Coach und Remotion ist nichts geändert.

---

## 0. Kurzfassung der Entscheidungen

1. **Tri-Coach führt die Pipeline selbst**, im neuen Paket `backend/app/video/`.
   - Steuersignal, Prüfung, Schnitt und Kodierung rechnet die CPU im Add-on.
   - Erzeugt wird **nur über eine Video-API**, denn der Pi hat keine GPU.
   - **Remotion fällt aus dem Laufzeitweg heraus.** Der Puppen-Renderer ist Python auf `koerper.py`, der einzigen Rechenquelle (`docs/animationen.md:72-80`). Eine dritte Kopie der Kinematik entfällt.
2. **Kein `KiJob`, kein Claude.** Es gibt einen eigenen, globalen Auftragsstand `UebungsVideo` mit eigenem Arbeiter-Thread. Zwei Gründe:
   - Animationen gehören allen Konten (`models.py:1510-1514`).
   - Der KI-Runner erlaubt einen Lauf je Konto (`runner.py:211-225`); ein Video-Job sperrte sonst die Planung.
3. **Ausgelöst wird per Soll-Ist-Abgleich, nicht per Ereignis.** Ein fünfter Zweig der Weckschleife macht jede freigegebene Bewegung ohne passendes Video zum Auftrag. Das ist dasselbe Muster wie der Nachzug im Garmin-Abgleich. `einspielen()`, `uebernimm()` und `freigeben()` brauchen dafür keinen Haken.
4. **Ein Clip hängt an der Inhaltsfassung der Bewegung**, nicht an `fassung` und nicht an der Zeile.
   - Die Verbindung läuft über eine Zuordnungstabelle.
   - Ein Vergleich per Vorwärtskinematik sorgt dafür, dass ein Neulösen mit 0,1° Abweichung nicht alle Videos ungültig macht.
5. **Die automatische Prüfung entscheidet nur über Wiederholungen.** Freigeben darf nur ein Verwalter (`is_staff`), in der App. Bis dahin und bei jedem Fehler zeigt die App die Figur.
6. **Nur H.264, kein AV1.** Der Rückfall für Browser ohne H.264 ist hier die Figur, nicht ein WebM. Das spart SVT-AV1 auf dem Pi und den halben Speicher.
7. **Ablage:**
   - Fertige Clips unter `/data/uebungsvideos/clips/`, im Backup, etwa 11–25 MB für die Bibliothek [A].
   - Arbeitsdateien und Prüfmodelle sind vom Backup ausgenommen.
8. **Ehrliche Grenze:** Jede Installation bezahlt die Bibliothek einmal selbst, etwa 50–190 $. Ab der zweiten Installation braucht es ein zentral erzeugtes Videopaket (Entscheidung E1).

---

## 1. Pipeline Schritt für Schritt

Alles außer Schritt 5 und dem Bildaufruf in Schritt 4 läuft **im Add-on-Prozess**, in einem eigenen Thread mit `@db.eigene_verbindung`, als ein Auftrag zur Zeit. Externe Werkzeuge laufen per `nice 10`.

| # | Schritt | Werkzeug / Modell | Ort | Eingabe → Ausgabe | Dateien |
|---|---|---|---|---|---|
| 0 | Auslöser, Auswahl | `video/automatik.py: pflege()` | Weckschleife, 5. Zweig | `UebungsAnimation` → Zeile `UebungsVideo(geplant)` | – |
| 1 | Eingabe, Vorprüfung | `animation/abspielen.py` (neu: Python-Fassung von `bewegung.ts:19-56`), `koerper.punkte` (`koerper.py:214-272`) | Add-on | `daten` → Vorprüfbericht (JSON am Datensatz) | – |
| 2 | Zeitplan, Kamera | `video/zeitplan.py`, `video/kamera.py` | Add-on | Bewegung → Bildzahl, Vorlauf, Schnittbild, Schlüsselbildzeiten, Kamera | JSON am Datensatz |
| 3 | Steuersignal | `video/steuersignal.py` (aus `proto/puppe.py`, numpy) + ffmpeg | Add-on | Posen → schattierte Puppe als MP4, Soll-Punkte | `arbeit/<id>/steuer-puppe.mp4`, `steuer-skelett.mp4`, `soll.npz` |
| 4 | Referenzfigur | einmalig ein Mensch; je Auftrag ein Bildmodell über API | API + Add-on | Master-Ansichten + Puppenbild 0 → Startpose-Referenz | `backend/app/video/figur/*`, `arbeit/<id>/referenz.png` |
| 5 | Generierung | Kling 3.0 Motion Control (fal) oder Wan-Animate-2 (WaveSpeed) | extern | Referenz + Puppenvideo + Prompt → MP4 | `arbeit/<id>/anbieter-original.mp4` |
| 6 | Automatische Prüfung | RTMW als ONNX auf onnxruntime (CPU), `video/pruefung.py` | Add-on | Video + Soll → Kennzahlen, Prüfvideo | `arbeit/<id>/pruefung.mp4`, `kontaktbogen.webp` |
| 7 | Schleife, Schnitt | `video/schnitt.py`, ffmpeg-Pipe nach numpy | Add-on | Original → genau k·T·30 Bilder, Naht überblendet, 4:3 | Zwischenstand im RAM |
| 8 | Kodierung, Kennzeichnung | ffmpeg libx264 und Pillow | Add-on | Bilder → `clip.mp4` + WebP mit eingebranntem KI-Symbol | `clips/<kennung>/…` |
| 9 | Menschliche Abnahme | neue Seite `pages/Uebungsvideos.tsx` | Browser (Verwalter) | Clip + Prüfvideo + Figur → Freigabe oder Verwerfen | – |
| 10 | Auslieferung | `routers/uebungsvideos.py` | Add-on | `GET api/uebungsvideos/datei/<kennung>/<name>` | – |
| 11 | Anzeige | `UebungsBuehne.tsx`, `UebungsVideo.tsx` | Browser | `AnimationOut.video` → Standbild oder ein `<video>` | – |

### Schritt 0: Auslöser
- **Aufruf:** `pflege()` läuft jede Minute als fünfter `try`-Block nach dem Animationszweig (`garmin/automatik.py:98-106`).
  - Es plant nur. Der teure Abgleich ist auf alle 15 min gedrosselt [A], dazu kommt ein Sofortlauf nach Freigabe oder Verwerfen.
  - Es startet den Arbeiter, wenn alles zutrifft: Schalter an, Schlüssel hinterlegt, Monatsbudget frei, Uhrzeit im Zeitfenster.
  - `TRI_GARMIN_AUTOSYNC=0` legt auch diesen Zweig still, wie in den Tests [B, CLAUDE.md].
- **Soll:** alle Zeilen mit `zustand="freigegeben"`.
  - Herkunft `bibliothek`: immer.
  - Herkunft `ki`: nur wenn die Einstellung `ki_uebungen = nach_verwalterfreigabe` steht und `freigegeben_von.is_staff` gilt (neues Feld, siehe §2).
  - Nur Lagen, die schon freigeschaltet sind (Wellen, siehe §4).
- **Ist:** gibt es zur Inhaltsfassung eine Zeile in `BewegungsVideo`, oder einen laufenden Auftrag?
- **Reihenfolge:**
  1. Übungen, die in Planeinheiten ab heute vorkommen (alle Konten). Das entspricht „die nächsten Tage zuerst" beim Garmin-Pool.
  2. Danach die Bibliothek nach Welle.
  3. Zuletzt KI-Übungen.

### Schritt 1: Vorprüfung, kostenlos und vor jedem Aufruf
- **Lage:** aus den Kontakten (Rücken, Seite, Bauch, Vierfüßler, Stütz, Sitz, Knien, Stand), wie in `analyse2.py`. Daraus folgt das Modell je Lage.
- **Flugphasen:** jedes Kontaktgelenk mehr als 2 cm über Boden bzw. Kasten, abgetastet mit 60 Hz.
- **Kontaktfehler:** zum Beispiel Taube, Schmetterling, sitzende Dehnung mit 3–7 cm (`docs/animationen.md:224-229`).
- **Sperrgründe, die zur Abnahme gehen statt zum Anbieter:**
  - Flug in einer Übung, die als gegangen beschrieben ist. Das trifft **a-march** (Artefakt aus dem Dossier).
  - `kasten` mit dem Namensbestandteil `foam-roller`: Das Format kennt keine Rolle (`format.py:54-69`).
  - Eine **Bibliothekszeile mit gesetzter `ki_job_id`**: Sie wurde schon einmal durch die KI ersetzt, denn `einspielen()` setzt das Feld nicht zurück (`bibliothek.py:48-55`) [B]. Das ist genau der Fall „erst nach KI-Korrektur richtig" (siehe E6).

### Schritt 2: Zeitplan und Kamera
- **Bildrate:** fest 30 fps.
  - Bei 30 fps gehen 53 von 59 Schleifen ganzzahlig auf; die 6 übrigen sind Lauf-ABC-Drills [B].
  - Der Prüfer misst die Periode per Autokorrelation auf ±0,3 % genau [B, gemessen].
- **Länge:**
  - Vorlauf 1,0 s, in dem die Startpose gehalten wird; das Referenzbild zeigt genau diese Pose [A].
  - k Zyklen: k = 1 bei Kraft und Mobility. Lauf-ABC so, dass k·T·30 ganzzahlig ist und 2–5 s ergibt, etwa high-knees 5 × 0,46 s = 69 Bilder, a-skip 5 × 0,84 s = 126 Bilder, lateral-shuffle 10 × 0,53 s = 159 Bilder.
  - Nachlauf 0,5 s.
  - Längster Treiber: standing-side-bend mit 10,1 s. Das liegt unter den 30 s, die Kling bei Ausrichtung „video" erlaubt [B, Dossier]; bei „image" wären es nur 10 s.
- **Naht:** in der Mitte der längsten `halten_s`-Phase. Ohne Haltephase in der langsamsten Phase.
- **Kamera:**
  - Richtung aus `ansicht` (`format.py:46-51`). Perspektivisch mit langer Brennweite, passend zum Referenzprompt mit 105 mm [A].
  - Ausschnitt fest über die ganze Schleife, wie `szene.ts:127-166`.
  - Leinwand 1280×720 (16:9), die Bewegung im mittleren 4:3-Feld von 960×720. Grund: Welche Seitenverhältnisse die Dienste annehmen, ist offen [A]. Ausgeschnitten wird in Schritt 7.
  - **Ausnahmetabelle** `video/ansichten.py` für den Blick von hinten (fire-hydrant 160°, adductor-rock-back 150°, hip-cars 115°). Sie wird erst im Pilot entschieden.

### Schritt 3: Steuersignal
- **Hauptsignal ist eine schattierte Gliederpuppe**, denn die Dienste über API sind Ende-zu-Ende-Modelle und verlangen rohes Video (Dossier „modelle", Gruppe c).
  - Die Puppe ist **in den Kleidungsfarben der Trainerin** eingefärbt: Oberteil kobaltblau, Leggings anthrazit, Haut neutral [A]. So kopiert das Modell eher die Kleidung als einen grauen Puppenlook.
  - Matte, Wand und Kasten werden mitgerendert, dazu ein weicher Kontaktschatten.
- **Nebenprodukte:**
  - ein Skelett im Wan/DWPose-Stil, nur für das Prüfvideo,
  - `soll.npz`: 2D-Sollpunkte je Bild, Sichtbarkeit aus dem Tiefenpuffer, Kontaktgelenke je Bild.
- **Abspielen nur mit den gelösten Zwischenbildern.** Bloßes Überblenden der Winkel lässt den Fuß bis 9 cm rutschen (`docs/animationen.md:62-70`).
- **Kodierung des Treibers:** H.264 CRF 12, yuv420p, Schlüsselbild an Bild 0.
- **Laufzeit:**
  - 0,16–0,40 s je Bild bei 640×480 auf 4 vCPU [B, gemessen].
  - Bei 1280×720 auf einem Pi 5 etwa 1–2 s je Bild, also 5–10 min für 300 Bilder [A].

### Schritt 4: Referenzfigur
- **Einmalig, von Hand und nicht automatisierbar** (Ähnlichkeitstest, Recht):
  - Master-Ausgangsbild nach dem Prompt A4 aus dem Dossier, dazu fünf Ansichten: vorn, Profil, hinten, 3/4, erhöht.
  - Ablage: `backend/app/video/figur/` mit `figur.json` (SHA-256 je Bild, daraus `figur_fassung`) und `HERKUNFT.md`. Inhalt wie Dossier A5: Modell, Prompt, Startwert, Kandidaten, Ähnlichkeitstest, AGB-Stand.
  - Größe in Git: 1–3 MB [A].
- **Je Auftrag automatisch:**
  - Bildmodell über API, mit den Master-Ansichten als Identitätsreferenz und dem Puppen-Standbild von Bild 0 als Posenvorlage („reproduce exactly the pose of the grey mannequin").
  - In Frage kommen Nano Banana Pro für 0,134 $ oder Nano Banana 2.1 für 0,05 $ [B, Preis]. Ob es beim selben Aggregator wie das Video läuft, ist eine Annahme.
  - Geprüft wird das Ergebnis mit derselben RTMW-Prüfung: OKS gegen das Soll von Bild 0 ≥ 0,75, Nase und Augen erkannt [A]. Höchstens 3 Versuche.
  - Ausgabe: `referenz.png`, 1280×720.

### Schritt 5: Generierung
- **Schnittstelle:** `video/anbieter/basis.py` mit
  - `einreichen(auftrag) -> anbieter_auftrag`,
  - `status(id)`,
  - `ergebnis(id) -> url`,
  - `preis(sekunden) -> usd`.
- **Umsetzungen:** `fal.py` für Kling 3.0 MC Pro bzw. Std; laut fal ist kommerzielle Nutzung erlaubt [B]. `wavespeed.py` für Wan-Animate-2 mit 0,04 bzw. 0,08 $/s, 30 fps, etwa 109 s je Auftrag [B].
- **Weg:** über `requests` mit `truststore`, wie der Rest der App.
- **Eingabe:**
  - `referenz.png` und `steuer-puppe.mp4`, hochgeladen in den Speicher des Anbieters,
  - Prompt aus `video/prompt.py`: Übungsname, Matte oder Boden, Requisiten, „static camera, full body visible, no text", heller Studiohintergrund,
  - Ausrichtung „video", also die Kamera des Treibers [B],
  - Seed.
- **Asynchron und neustartfest:** einreichen, `anbieter_auftrag` speichern, alle 30 s abfragen, Ergebnis laden. Ein Neustart des Add-ons fragt weiter ab und reicht nicht doppelt ein, kostet also nicht doppelt.
- **Ausgabe:** Original samt SHA-256. `kosten_usd` wird aus den Ausgabesekunden gerechnet.
- **Kling kann kürzer liefern, ohne Erstattung** [B]. Das fängt Schritt 6 ab, Kriterium „Rahmen".

### Schritt 6: Automatische Prüfung
- **RTMW auf onnxruntime, ohne Personendetektor:**
  - Der Ausschnitt kommt aus der Soll-Box, vergrößert um den Faktor 1,4.
  - Vor- und Nachverarbeitung (SimCC) sind mit numpy und Pillow nachgebaut. Das spart YOLOX und OpenCV, rund 100 MB im Abbild [A]. Im Pilot muss das gegen rtmlib dieselben Werte liefern.
  - Die Modelle lädt die App bei der Aktivierung nach `/data/modelle/`, mit festem SHA-256.
- **Kennzahlen** wie im Dossier „steuersignal-pruefung" §2; alle Schwellen sind Startwerte [A]:
  - Bildzahl und Bildrate (k·T·fps ±1).
  - Ähnlichkeitstransformation; mehr als 10 % Abweichung wird markiert.
  - OKS über 12 Körpergelenke: Median ≥ 0,75, 10-%-Quantil ≥ 0,60, kein Fenster ab 0,3 s unter 0,5.
  - PCK@0.1 der bewegten Gelenke ≥ 0,8.
  - Seitentausch: in mehr als 50 % eines Abschnitts.
  - Bodenkontakt: 0,05 bzw. 0,03 × Personengröße.
  - Periode ±2 %, Versatz ≤ 2 Bilder.
- **Abtastung** mit 10 fps. Auf dem Pi etwa 1 s je Bild, also 1–2 min je Clip [A]. Auf x86 waren es 0,29 s [B].
- **Durchgefallen:** neuer Versuch mit neuem Seed, einem Prompt-Zusatz je Fehlerart und gegebenenfalls dem anderen Modell. Höchstens `max_versuche` (Vorgabe 3); danach geht der Clip mit `pruefung_bestanden=false` zur Abnahme.

### Schritt 7: Schleife und Schnitt
- Vorlauf verwerfen. Genau k·T·30 Bilder ab dem Schnittbild schneiden.
- Die letzten 8 Bilder mit den 8 Bildern **vor** dem Schnittbild überblenden. Die stammen aus dem Vorlauf und zeigen dieselbe Pose [A].
- Tempo per Neuabtastung um höchstens 10 % korrigieren, darüber neu erzeugen.
- Naht prüfen: SSIM und Sprung der Punktgeschwindigkeit.
- 960×720 ausschneiden, auf 640×480 skalieren (E3).
- Kein Ping-Pong. Es dreht Schwerkraft, Flug und Seitenwechsel um.

### Schritt 8: Kodierung und Kennzeichnung
- **Video:** libx264 High, yuv420p, CRF 26–28, `-g` gleich der Bildzahl (Schlüsselbild an 0), `+faststart`, ohne Ton.
  - Metadaten: `comment="KI-generiert; fiktive Person; Tri-Coach <pipeline_fassung>"`.
  - Das **EU-KI-Symbol wird oben rechts eingebrannt**, als Overlay aus `video/kennzeichen/ki-symbol.png`.
- **Standbilder mit Pillow**, WebP q78:
  - `poster.webp` (Bild 0),
  - `vorschau.webp` mit 288×216 (96×72 bei dreifacher Dichte, `fachlich.css:650`),
  - `bild-<i>.webp` je Schlüsselbild, in der Mitte seiner Haltephase. Die Zeit ist bekannt: Σ(`halten_s` + `uebergang_s`) ab dem Schnittbild.
- **Kennung:** `clip_kennung` = SHA-256 von `clip.mp4`, auf 16 Zeichen. Abgelegt wird nach `clips/<kennung>/` samt `manifest.json` (Herkunft, siehe §6).
- **Größe:** 0,15–0,35 MB je 6-s-Clip [A, zwischen den gemessenen 55 kB und 519 kB]. Kodieren dauert auf dem Pi etwa 1–3 min [A].

### Schritt 9: Menschliche Abnahme (Pflicht)
- **Seite nur für Verwalter.** Je Clip zeigt sie:
  - Video, Prüfvideo (Soll-Skelett darüber, abweichende Gelenke rot) und die Strichfigur nebeneinander,
  - Kennzahlen, Versuche, Kosten,
  - zwei Nachbarclips zum Identitätsvergleich.
- **Knöpfe:**
  - „Freigeben".
  - „Verwerfen" mit Grund (Hände, Gesicht/Identität, Kleidung, Naht, Tempo, Sonstiges) und Rückmeldung, wahlweise „neu erzeugen".
  - „Bewegung ist falsch": verwirft zusätzlich die Animation über den bestehenden Endpunkt.

### Schritt 10: Auslieferung
- **Endpunkt:** `GET api/uebungsvideos/datei/<kennung>/<name>`.
  - `name` nur nach Positivliste `clip.mp4|poster.webp|vorschau.webp|bild-\d{1,2}.webp`. Damit gibt es keinen Pfadausbruch.
  - Byte-Bereiche und starkes `ETag` aus dem Code von `frontend.py:101-165`, herausgezogen in ein gemeinsames `app/dateiauslieferung.py`.
  - `Cache-Control: private, max-age=31536000, immutable`; die Kennung ist der Inhaltshash.
  - Mit Anmeldung über das Sitzungscookie. `<video>` schickt es mit, weil gleiche Herkunft.
- Relative Pfade ohne führenden Schrägstrich funktionieren unter Ingress (`frontend.py:55-75`, `basePath.ts:17-23`).
- Kein fremder Server, also kein Widerspruch zu `docs/frontend.md:566-571`.

### Laufzeit je Clip auf dem Pi [A]
| Schritt | Dauer |
|---|---|
| Steuersignal | 5–10 min |
| Referenz | unter 1 min |
| Anbieter | 2–5 min Wartezeit |
| Prüfung | 1–2 min |
| Schnitt und Kodierung | 1–3 min |
| **zusammen** | **etwa 10–20 min**, auf dem Pi 4 etwa doppelt |

Bibliothek: etwa 100 Läufe (59 × 1,7 Versuche) ≈ 25 h. Mit einem Nachtfenster von 5 h sind das etwa 5 Nächte.

---

## 2. Datenmodell und Verknüpfung

### Neue Tabellen (Migration: ja)

**`VideoDienst`** (`video_dienst`, genau eine Zeile; Riegel per `select_for_update()`):
- `aktiv` (Vorgabe aus).
- `anbieter`, `bild_anbieter`.
- `schluessel_encrypted` über `crypto.verschluessle` (`crypto.py:53`). Erscheint nie in einer Antwort und nicht im Admin.
- `modelle_je_lage` (JsonFeld, z. B. `{"stand": "kling-3.0-mc-pro", "boden": "wan-animate-2-720p"}`).
- `lagen_freigeschaltet` (JsonFeld), `ki_uebungen` (`aus` | `nach_verwalterfreigabe`).
- `monatsbudget_usd` (Vorgabe 0, also nichts), `max_versuche` (3), `zeitfenster_von` und `_bis` (01:00–06:00).
- `gleichwertig_cm` (1,5), `status`, `meldung`, `geaendert_am`.

**`UebungsVideo`** (`uebungs_videos`, **eine Zeile je Versuch bzw. Clip**):

| Gruppe | Felder |
|---|---|
| Bewegung | `schluessel` (Text, Index, bewusst kein Fremdschlüssel), `bewegungs_fassung` (Index), `bewegung` (JsonFeld: Schnappschuss der `daten`, etwa 2,6 kB) |
| Ablauf | `zustand`, `versuch`, `vorgaenger` (Selbstbezug) |
| Herkunft | `pipeline_fassung`, `figur_fassung`, `anbieter`, `modell`, `seed`, `prompt`, `anbieter_auftrag`, `original_sha256` |
| Prüfung | `vorpruefung`, `pruefung` (JsonFeld), `pruefung_bestanden` |
| Kosten | `kosten_usd`, `ausgabe_s` |
| Clip | `clip_kennung` (eindeutig, null), `bilder`, `fps`, `schleifen`, `dauer_s`, `breite`, `hoehe`, `schluesselbild_bilder` (JsonFeld) |
| Abnahme | `ausgeloest_von` (User, null; bei KI das Konto aus `KiJob`), `abnahme_von` (User), `abnahme_am` (`UtcDateTimeField`), `verwerfgrund`, `rueckmeldung` |
| Betrieb | `fehler`, `dateien_geloescht`, `erstellt_am`, `geaendert_am` |

Die Zustände von `zustand`:
- `geplant`, `vorbereitung`, `erzeugung`, `nachbearbeitung`: der Auftrag läuft.
- `abnahme`, `freigegeben`, `abgeloest`: der Clip liegt vor.
- `verworfen`, `fehlgeschlagen`, `abgebrochen`: Ende ohne Clip.

**`BewegungsVideo`** (`bewegungs_videos`): `bewegungs_fassung` (eindeutig), `video` (Fremdschlüssel), `art` (`erzeugt` | `gleichwertig`), `abweichung_cm`, `erstellt_am`.

**Geändert: `UebungsAnimation.freigegeben_von`** (User, null). Gesetzt wird es in `routers/animationen.py:115-122`.

### Die Inhaltsfassung
- **Neue Funktion** `inhalt_fassung(daten)` in `animation/bibliothek_datei.py`.
  - Kanonisches JSON wie `fassung()` (`bibliothek_datei.py:23-26`), aber nur über `ansicht`, `unterlage`, `requisiten` und `ablauf`.
  - Zahlen auf 6 Nachkommastellen normiert, damit `4` und `4.0` gleich sind.
  - SHA-256 auf 16 Zeichen.
- **Warum nicht `fassung`:** Die geht über den ganzen Eintrag einschließlich Aliase und `betont`, und bei KI-Animationen ist sie leer (`models.py:1535-1537`).
- **Warum nicht `geaendert_am`:** Auch Freigeben und Verwerfen setzen es (`routers/animationen.py:120,142`).
- Die Fassung wird **beim Lesen** gerechnet, ein paar Millisekunden für zehn Zeilen [A]. So kann kein Schreibweg (`einspielen`, `uebernimm`, SQLite-Import) vergessen, sie nachzuziehen.

**Ausgeliefert wird genau dann, wenn alle vier Bedingungen gelten:**
1. Die Animation hat `zustand == freigegeben`.
2. Es gibt eine `BewegungsVideo`-Zeile für `inhalt_fassung(daten)`.
3. Deren Video hat `zustand == freigegeben`.
4. Die Dateien sind vorhanden.

Sonst ist `video` gleich `null`, und die App zeigt die Figur.

**Gleichwertigkeit** (`video/vergleich.py: gleichwertig(alt, neu) -> (bool, cm)`): Eine neue Fassung ohne Zuordnung gilt als gleichwertig zu einem freigegebenen Video **desselben Schlüssels**, wenn alles zutrifft:
- gleiche Zahl der Schlüsselbilder,
- Zeiten ±1 ms,
- `ansicht` ±1°,
- `unterlage` gleich, Requisiten ±1 cm,
- alle 26 Gelenkpunkte, abgetastet mit 30 Hz über die Schleife, weichen höchstens `gleichwertig_cm` ab.

Dann entsteht eine Zuordnung mit `art=gleichwertig`, und kein Auftrag. Das fängt das Neulösen aller Rezepte ab, das auf einem anderen Rechner 0,1° Abweichung ergab (`docs/animationen.md:108-115`). Sonst würde dabei jedes Video ungültig, und alles müsste neu bezahlt werden.

### Was bei welchem Ereignis passiert

| Ereignis | Folge für das Video |
|---|---|
| Neue Bibliotheksfassung mit anderer Bewegung | neue Inhaltsfassung, keine Zuordnung → Figur und neuer Auftrag. Das alte Video bleibt gespeichert, wird aber nicht ausgeliefert. |
| Nur Name, Alias oder `betont` geändert | Inhaltsfassung gleich → Video bleibt. |
| Neulösen mit Rauschen | gleichwertig → Zuordnung, kein Auftrag. |
| **Animation verworfen** (Bibliothek oder KI) | Die Zeile fällt aus `verzeichnis()` (`bibliothek.py:65-73`) → kein Video. Ein Auftrag für diese Fassung, der **noch nicht eingereicht** ist, wird `abgebrochen`. Ein eingereichter läuft zu Ende, er ist bezahlt, und landet mit dem Hinweis „Bewegung inzwischen verworfen" in der Abnahme. Der KI-Ersatz ist eine neue Fassung, steht auf „ungeprüft" → Figur. |
| Neustart nach verworfener Bibliotheksübung | `einspielen()` holt die Bibliotheksfassung zurück (`bibliothek.py:44`, Test `test_animation.py:212-219`). Das ist dieselbe Inhaltsfassung → **das alte Video ist sofort wieder gültig, ohne Kosten.** |
| KI-Animation freigegeben | Beim nächsten Abgleich wird sie Auftrag, sofern `ki_uebungen` es erlaubt und `freigegeben_von.is_staff` gilt. |
| **Video verworfen** (Darstellung) | Video `verworfen`, Zuordnung entfernt. Mit „neu erzeugen" folgt ein Versuch mit `vorgaenger`, der Grund wird zum Prompt-Zusatz, Seed oder Modellwechsel. Nach `max_versuche + 2` gibt es keine Automatik mehr. |
| Video verworfen mit „Bewegung falsch" | zusätzlich `POST /api/animationen/{schluessel}/verwerfen` mit Rückmeldung (`routers/animationen.py:125-144`) |
| Neues Video derselben Übung freigegeben | Das vorige wird `abgeloest`. |
| Neue Referenzfigur | Die alten Clips bleiben gültig und werden als „ältere Figur" markiert. Neu erzeugt wird nur auf Knopfdruck, mit vorher angezeigter Kostenschätzung. |

**Aufräumen:**
- Clips, deren Fassung 30 Tage lang zu keiner aktuellen Animation gehört: Die Dateien werden gelöscht, die Zeile bleibt (Kosten, Herkunft).
- `arbeit/<id>/` wird 30 Tage nach der Abnahme gelöscht.

---

## 3. Änderungen in Tri-Coach

### Backend: neue Dateien
| Datei | Inhalt |
|---|---|
| `app/video/__init__.py` | – |
| `app/video/automatik.py` | `pflege()`: Abgleich, Budget, Zeitfenster, Arbeiter starten |
| `app/video/arbeiter.py` | Thread, Zustandsmaschine, `nach_neustart()` |
| `app/video/ablage.py` | Pfade unter `TRI_DATA_DIR`, Aufräumen |
| `app/video/vorpruefung.py` | Schritt 1 |
| `app/video/zeitplan.py` | Schritt 2 |
| `app/video/kamera.py` | Schritt 2, gemeinsam für Renderer und Prüfung |
| `app/video/steuersignal.py` | Schritt 3 |
| `app/video/referenz.py` | Schritt 4 |
| `app/video/prompt.py` | Schritt 5 |
| `app/video/anbieter/{basis,fal,wavespeed}.py` | Schritt 5 |
| `app/video/rtmw.py` | Modell laden, SHA-256, SimCC |
| `app/video/pruefung.py` | Schritt 6 |
| `app/video/schnitt.py` | Schritt 7 |
| `app/video/ffmpeg.py` | Unterprozess, Pipe |
| `app/video/vergleich.py` | Gleichwertigkeit |
| `app/video/figur/` | Master-Bilder, `figur.json`, `HERKUNFT.md` |
| `app/video/kennzeichen/ki-symbol.png` | KI-Symbol für das Overlay |
| `app/animation/abspielen.py` | Python-Fassung von `dauer` und `poseBei` (`bewegung.ts:19-56`) |
| `app/dateiauslieferung.py` | aus `frontend.py:101-165` herausgezogen, `frontend.ausliefern` nutzt es weiter |
| `app/routers/uebungsvideos.py` | Endpunkte, siehe unten |

### Backend: geänderte Dateien
- `models.py`: drei Tabellen, dazu `UebungsAnimation.freigegeben_von`. Dann `makemigrations` und `migrations/00xx_uebungsvideos.py`.
- `schemas.py`:
  - `UebungsVideoOut`, `VideoDienstOut`, `VideoDienstIn` (Teil-Update mit `exclude_unset`, Schlüssel nur schreibbar), `VideoStandOut`, `VideoAbnahmeOut`, `VideoVerwerfenIn` (`grund: Literal[…]`, `rueckmeldung`, `neu_erzeugen=True`, `bewegung_verwerfen=False`), `VideoErzeugenIn`.
  - `AnimationOut` (`schemas.py:1911-1932`) bekommt `video: UebungsVideoOut | None = None`.
  - Uhrzeiten als `zeit.UtcDatetime`.
- `routers/animationen.py`:
  - `als_ausgabe(zeile, video=None)` (`:37-49`).
  - `/einheit` (`:69-101`) und `/{schluessel}` (`:104-112`) holen die Videos zu allen Fassungen mit **einer** Abfrage.
  - `freigeben` setzt `freigegeben_von`.
- `routers/training.py:30-58` (`/ablauf`): dieselbe Vorabfrage.
- `anmeldung.py`: `nur_verwalter(request)` mit `HTTPException(HTTPStatus.FORBIDDEN, "Nur für Verwalter.")`.
- `api.py:141`: `api.add_router("/uebungsvideos", uebungsvideos.router)`.
- `garmin/automatik.py:98-106`: fünfter `try`-Block, `asyncio.to_thread(video_pflege)`.
- `main.py:52-66` (`beim_start`): `video.arbeiter.nach_neustart()`.
  - Zustände `vorbereitung` und `nachbearbeitung` beginnen den Schritt neu; das ist lokal und kostenlos.
  - `erzeugung` fragt weiter ab.
- `admin.py`: `UebungsVideo`, `BewegungsVideo`, `VideoDienst` (ohne Schlüssel) unter dem Thema der Animationen.

### Endpunkte

Wege mit festem Text stehen **vor** denen mit Platzhalter, wegen „Django sucht den Weg, bevor es auf die Methode schaut".

| Methode und Weg | Recht | Zweck |
|---|---|---|
| `GET /api/uebungsvideos/stand` | Verwalter | abgedeckt / gesamt, in Arbeit, zur Abnahme, Kosten im Monat, Budget, letzte Meldung |
| `GET /api/uebungsvideos/abnahme` | Verwalter | Liste `VideoAbnahmeOut` |
| `GET` / `PUT /api/uebungsvideos/einstellungen` | Verwalter | `VideoDienst` |
| `POST /api/uebungsvideos/erzeugen` | Verwalter | `{schluessel?, neu?}` → 202, oder 409 mit „Nichts fehlt" bzw. „Monatsbudget erreicht" |
| `GET /api/uebungsvideos/datei/{kennung}/{name}` | angemeldet | Clip und Standbilder: Bereiche, `ETag`, ein Jahr Cache |
| `GET /api/uebungsvideos/arbeit/{video_id}/{name}` | Verwalter | Prüfvideo, Kontaktbogen, Referenz; `no-store` |
| `POST /api/uebungsvideos/{video_id}/freigeben` | Verwalter | Freigabe |
| `POST /api/uebungsvideos/{video_id}/verwerfen` | Verwalter | `VideoVerwerfenIn` |

### Frontend
- **`types.ts`:**
  - Neu `UebungsVideo` mit `kennung`, `mp4`, `poster`, `vorschau`, `schluesselbilder: string[]`, `dauer_s`, `schleifen`, `breite`, `hoehe`, `modell`, `erstellt_am`, `gleichwertig`.
  - `UebungsAnimation` (`types.ts:881-894`) bekommt `video: UebungsVideo | null`.
  - Neu `VideoStand`, `VideoAbnahme`, `VideoDienst`.
- **`components/UebungsBuehne.tsx` (neu):** entscheidet Video, Figur oder Standbild. Props: `animation`, `modus: 'liste'|'detail'|'workout'`, `laeuft`.
- **`components/UebungsVideo.tsx` (neu), nach dem Muster von `RennenImHintergrund.tsx`:**
  - `muted playsInline loop preload="none" poster disablePictureInPicture`.
  - `muted` und `defaultMuted` vor `play()`.
  - `NotAllowedError` zeigt einen Abspielknopf.
  - `IntersectionObserver`.
  - `onError` fällt auf die Figur zurück.
  - Beim Schließen wird das Element entfernt, um den Dekoder frei zu geben.
- **`components/useUebungsDarstellung.ts` (neu):**
  - `localStorage` `tricoach.uebungen.darstellung` mit `video` | `figur`, in try/catch.
  - `navigator.connection.saveData`.
  - `canPlayType('video/mp4; codecs="avc1.4D401E"')`.
  - `prefers-reduced-motion` **mit Änderungslistener** (anders als `Figur.tsx:94-95`).
- **`UebungenAbschnitt.tsx`:**
  - Vorschau `:127-139`: nur `<img src=vorschau.webp>`, kein `<video>`.
  - Detail `:247-254`: `UebungsBuehne`.
  - Bildfolge `:337-349`: `bild-<i>.webp` statt `FigurStandbild`.
  - Herkunft `:350-354`: KI-Hinweis.
  - `abspielbar()` `:174-176` bleibt die Frage „Figur möglich?". Das Video ist zusätzlich.
  - Schalter Video/Figur im Abschnittskopf.
- **`LaufAbcAbschnitt.tsx`** `:181-193`, `:199`: wie oben. Der vorhandene Schalter `tricoach.laufabc.animationen` (`:27-45`) bleibt; ausgeblendet wird weiterhin nichts geladen.
- **`Workout.tsx:243`:** `UebungsBuehne` mit `laeuft={!modell.pausiert}`. Die Pause steuert `video.pause()`.
- **`pages/Uebungsvideos.tsx` (neu, Verwalter):** Abnahme und Stand. Verlinkt aus `Einstellungen.tsx`, dort ein Abschnitt „Übungsvideos" nur bei `user.is_staff`, und neben dem Admin-Link in `Layout.tsx:175,334`.
- **`api.ts`:** Aufrufe für die Endpunkte.
- **`styles/fachlich.css`:** `.video-buehne` (4:3 wie `:669-679`, neutraler hellgrauer Grund; im Dunkelmodus als Karte mit Radius, nur über Tokens) und `.ki-abzeichen`. Keine Namen wie Tailwind-Utilities.
- **`marketing/Rechtliches.tsx`:** Abschnitt „KI-generierte Inhalte" (§6).

### Add-on, Bau, Doku, Tests
- **`Dockerfile`:**
  - `apt-get install ffmpeg`. Debian trixie bringt libx264 [A].
  - `pip install -r requirements-video.txt` mit numpy, Pillow und onnxruntime; Wheels für aarch64 und Python 3.12 gibt es [A].
  - Mehr Abbild: etwa 150–250 MB [A], beim Bau auf dem Pi einige Minuten [A].
  - Die Modelle kommen **nicht** ins Abbild.
- **`config.yaml:30-32`** `backup_exclude` um `uebungsvideos/arbeit` und `modelle` erweitern. Die Clips bleiben im Backup (E7).
- **Neues `TRI_VIDEO_SCHLUESSEL`** als Rückfall für den Schlüssel, wie `CLAUDE_CODE_OAUTH_TOKEN`. Vorrang hat die Datenbank.
- **Doku:**
  - neu `docs/uebungsvideos.md`, dazu ein Eintrag in `CLAUDE.md`,
  - `docs/animationen.md:41-51` ergänzen: Lizenz, einheitliches Material und „Bewegung statt Name" bleiben erfüllt; aufgegeben werden „Kilobyte", Schärfe in jeder Größe und Hell/Dunkel,
  - `docs/grenzen.md` ergänzen.
- **Tests** (`tests/test_uebungsvideos.py`, `test_abspielen.py`):
  - Inhaltsfassung, Gleichwertigkeit, Zuordnung bei Verwerfen und Neustart,
  - Zustandsmaschine mit **Schein-Anbieter**, der das Puppenvideo selbst zurückgibt,
  - Wiederaufnahme, Budget, `nur_verwalter`, Bereichsanfragen,
  - Referenzdatei `backend/tests/fixtures/animation_abspiel_referenz.json` aus TypeScript erzeugt, geprüft über `npm run pruefen:koerper`, damit Python- und TypeScript-Abspielen nicht auseinanderlaufen,
  - Tests mit ffmpeg werden übersprungen, wenn es fehlt.

### Rückfall auf die Figur, in dieser Reihenfolge
1. `video == null` (noch keins, nicht freigegeben, Fassung geändert, ungeprüfte KI-Animation) → Figur wie heute.
2. Gerät hat „Figur" gewählt, oder der Browser kann kein H.264 → Figur. Die Bewegung steht in derselben Antwort.
3. `<video>`-Fehler oder 404 → Figur, ohne erneuten Versuch in dieser Sitzung.
4. Reduzierte Bewegung oder Datensparmodus → Standbild: `poster.webp` bzw. `bild-<i>.webp`.
5. Lauf-ABC ausgeblendet → nichts.

---

## 4. Pilot und Reihenfolge

### Fünf Übungen
| Schlüssel | Lage | Warum | T | Treiber |
|---|---|---|---|---|
| `standing-quad-stretch` | stehend, Einbeinstand | Hand greift den Fuß, Seitenansicht 80/8, leichter Fall als Bezugsgröße | 5,3 s | 6,8 s |
| `glute-bridge` | Rückenlage | bereits geprobt (Dossier), häufig, waagerechter Körper | 3,6 s | 5,1 s |
| `side-plank` | Seitstütz | Beine liegen im 2D-Bild aufeinander, Unterarmstütz, Ansicht 12/24 | 4,1 s | 5,6 s |
| `bird-dog` | Vierfüßler | Hände am Boden, Seitenwechsel in der Schleife, gekreuzte Gliedmaßen | 6,4 s | 7,9 s |
| `a-skip` | Lauf-ABC, Flug 550 ms | schnell, 25,2 Bilder je Zyklus → 5 Zyklen = 126 Bilder | 0,84 s | 5,7 s |

Ersatz bei Bedarf: `push-up` (schnelle Wiederholung, Hände), `butterfly-stretch` (Draufsicht 40°, Kontaktfehler).

**Versuchsplan:** 5 Übungen × 2 Dienste (Kling 3.0 MC Pro über fal, Wan-Animate-2 mit 720p über WaveSpeed) × bis zu 3 Versuche. Das läuft schon über die integrierte Pipeline, also mit Schein-Abnahme durch den Verwalter.

**Tag 1, Schnelltest für etwa 2 $:** nur `glute-bridge` auf beiden Diensten. Hier fällt K1 oder nicht.

**Erfolg:** mindestens 4 von 5 Clips von Menschen freigegeben, davon mindestens 2 der 3 Boden- und Stützübungen.

### Abbruchkriterien
| # | Kriterium | Folge |
|---|---|---|
| K1 | Keiner der Dienste macht aus der Puppe in mindestens 3 von 5 Übungen eine erkennbare Frau mit der richtigen Bewegung; sie bleibt grau, ein Puppenkörper oder die falsche Übung | **Winkel „Integriert" beenden.** Es bleibt nur der Posenweg mit selbst betriebenem SCAIL oder Wan, also außerhalb des Add-ons. |
| K2 | Von `glute-bridge`, `side-plank` und `bird-dog` werden weniger als 2 nach 3 Versuchen freigegeben | Boden und Stütz bleiben Figur; Videos nur für Stand, Sitz und Knien. |
| K3 | Prüfung und Mensch uneins: ein falsch Durchgelassener unter 10 Clips, oder mehr als 30 % falsch Abgewiesene | Die Prüfung wird nur Hinweis und nicht mehr Grund für Wiederholungen; Schwellen neu einstellen. |
| K4 | Identität: Drei Personen erkennen in weniger als 4 von 5 Clips „dieselbe Frau" | Je Übung mehr Referenzansichten; scheitert das, Abbruch. |
| K5 | Sichtbar verformte Hände in den Stützclips nach 3 Versuchen | Stütz bleibt Figur. |
| K6 | Tempo weicht mehr als 2 % ab und lässt sich nicht mit höchstens 10 % ausgleichen, oder die Naht ist in mehr als 1 von 5 sichtbar | Schnitt überarbeiten; scheitert das, Abbruch. |
| K7 | Lokale Schritte über 30 min je Clip auf dem Ziel-Pi, oder mehr als 1,5 GB Arbeitsspeicher | Schritte vom Pi auslagern, also Winkelwechsel. |
| K8 | Pilot über 80 $, oder im Schnitt mehr als 2,5 Versuche | Neu rechnen, ob sich das lohnt. |
| K9 | Ähnlichkeitstest der Figur fällt durch | neue Figur; das blockiert, ist aber kein Abbruch. |

### Wellen danach
Freigeschaltet wird über `lagen_freigeschaltet`:
1. Stand, Sitz und Knien bei Kraft und Mobility, etwa 19 Übungen.
2. Boden, Vierfüßler und Stütz, nur wenn K2 und K5 bestanden sind.
3. Lauf-ABC.
4. Freigegebene KI-Übungen.

Ausgenommen, bis es behoben ist:
- `a-march`: Rezept korrigieren.
- `foam-roller-tfl` und `foam-roller-glute`: E8.
- Bibliothekszeilen mit gesetzter `ki_job_id`: E6.

Fast statische Übungen (plank, wall-sit, diaphragmatic-breathing) bekommen einen kurzen Clip mit dem Prompt-Zusatz „subtle breathing".

---

## 5. Kosten, Zeit, Risiken, offene Entscheidungen

### Kosten
Ein Durchgang über die Bibliothek hat **etwa 375 s Ausgabe** [B nachgerechnet, A beim Zuschlag]. Das setzt sich zusammen aus Kraft und Mobility ΣT ≈ 248 s plus 49 × 1,5 s Vor- und Nachlauf sowie Lauf-ABC mit mehreren Zyklen, etwa 55 s.

| Posten | Kling MC Pro (0,168 $/s) | Wan-Animate-2, 720p (0,08 $/s) |
|---|---|---|
| ein Durchgang | ≈ 63 $ | ≈ 30 $ |
| Bibliothek bei 1,5–2 Versuchen [A] | ≈ 95–125 $ | ≈ 45–60 $ |
| schlimmster Fall, 3 Versuche | ≈ 190 $ | ≈ 90 $ |
| Referenzbilder, 59 × etwa 2 | ≈ 16 $ (Nano Banana Pro) bzw. 6 $ (2.1) | gleich |
| Pilot (31 s × 3 × beide Dienste, Referenzen) | ≈ 25 $ zusammen | |
| Master-Figur, einmalig | 10–50 $ [A] | |
| **je Korrektur einer Übung** (etwa 7 s, 1,5–2 Versuche, Referenz) | **≈ 2–3 $** | **≈ 1–1,5 $** |
| je KI-Übung | wie eine Korrektur | |

- **Je Konto:** Die Bibliothek kostet ein weiteres Konto nichts, sie wird einmal je Installation erzeugt. KI-Übungen werden über `ausgeloest_von` dem Konto zugerechnet; im öffentlichen Betrieb gibt es ein Kontingent je Konto (E5).
- **Je Installation:** 50–190 $ für die Bibliothek (E1).
- Das Claude-Abo deckt nichts davon ab. Der Pipeline-Weg ruft Claude gar nicht auf.

### Zeitaufwand [A]
| Arbeit | Personentage |
|---|---|
| Backend-Pipeline | 12–15 |
| Frontend | 4–6 |
| Pilot und Kalibrierung | 3–5 |
| Figur und Herkunftsdoku | 2–3 |
| Tests und Doku | 3 |
| **zusammen** | **etwa 25–30, also 5–6 Wochen für eine Person** |

Laufzeit der Bibliothek auf dem Pi: etwa 5 Nächte (§1).

### Risiken und Gegenmaßnahmen
| Risiko | Gegenmaßnahme |
|---|---|
| Ende-zu-Ende-Dienst erkennt die Puppe nicht als Mensch oder kopiert ihren Look (ungetestet, Dossier „modelle" §1c) | Puppe in Kleidungsfarben, Tag-1-Test, K1 |
| Liegen, Stütz, Hände (kein Benchmark; das Körpermodell hat keine Finger) | Wellen nach Lage, Modell je Lage, Hand-Zusatz im Prompt, K2 und K5 |
| Neulösen macht jedes Video ungültig | Gleichwertigkeit per Vorwärtskinematik |
| Kosten laufen davon (Wiederholungsschleifen, Kling kürzt ohne Erstattung) | Monatsbudget vor jeder Einreichung, Kostenschätzung, `max_versuche`, zusätzlich ein Ausgabenlimit beim Anbieter |
| Im öffentlichen Betrieb kann jedes Konto KI-Animationen freigeben (`routers/animationen.py:115-122`) und damit Kosten auslösen | KI-Videos nur nach Verwalterfreigabe (`freigegeben_von.is_staff`), Kontingent je Konto |
| Last und Speicher auf dem Pi (`docs/grenzen.md:768-773`) | Zeitfenster, `nice`, onnxruntime mit 2 Threads, ein Auftrag zur Zeit, K7 |
| Größeres Abbild, längerer Bau | eigene `requirements-video.txt`, kein OpenCV, Modelle in `/data/modelle` |
| Schlüssel gelangt nach außen | verschlüsselt (`crypto.py`), nur schreibbar, nicht im Admin |
| Anbieter ändert Schnittstelle oder Preis, Modell verschwindet | Anbieter-Schnittstelle, Ergebnis wird lokal kopiert, `pipeline_fassung` je Clip |
| Inhaltsfilter des Anbieters lehnt ab | `fehlgeschlagen` mit Grund, anderer Dienst |
| Identität driftet zwischen Clips | ein Master-Satz, Referenz je Übung, Nachbarclips in der Abnahme |
| Bildrate wird still umgerechnet | Prüfung von Rahmen und Periode |
| Neustart mitten im Lauf | wiederaufnehmbare Zustände, Abfrage statt erneuter Einreichung |
| Hell/Dunkel und farbig betonte Muskeln gehen verloren | Abzeichen bleiben (`UebungenAbschnitt.tsx:262-270`), Schalter für die Figur je Gerät |
| KI-Korrekturen an Bibliotheksübungen kippen bei jedem Neustart zurück (`bibliothek.py:44` gegen `docs/animationen.md:165-167`) | E6 |
| Kein Offline im Workout (es gibt keinen Service Worker) | bekannt; die Figur geht offline auch nicht anders |

### Offene Entscheidungen für den Nutzer
- **E1 Eine Installation oder viele.** Vorschlag:
  - Für die eigene Installation bzw. einen zentralen Server genügt die Erzeugung je Installation.
  - Ab der zweiten Installation ein **Videopaket**: einmal erzeugt und freigegeben, beim Bau des Abbilds mit festem SHA-256 geholt, abgelegt im Abbild unter `/app/uebungsvideos`, nicht in `/data`, also auch nicht im Backup. Eingespielt wird es wie `einspielen()` mit `art=paket`.
- **E2 Dienst je Lage**, nach dem Pilot.
- **E3 Auflösung:** 640×480 (Vorschlag) oder 960×720 mit etwa 70 % mehr Platz [A].
- **E4 Budget und Zeitfenster:** Vorgabe 0 $; Vorschlag 30 $ pro Monat, 01–06 Uhr.
- **E5 KI-Übungen:** nie, oder nach Verwalterfreigabe (Vorschlag), samt Kontingent je Konto.
- **E6 KI-korrigierte Bibliotheksübungen:** Die Korrektur gehört in `rezepte.json`, als neues Rezept angehängt (Vorschlag). Alternativ ändert sich `einspielen()`, sodass es nur bei einer neuen Bibliotheksfassung zurückholt; dazu wäre ein Feld `ersetzte_fassung` nötig. Erst danach Videos erzeugen.
- **E7 Clips im Backup:** ja (Vorschlag, +11–25 MB), oder ausgenommen, dann kostet eine Wiederherstellung die Neuerzeugung.
- **E8 Rolle:** das Format um eine Rolle erweitern, oder die Foam-Roller-Übungen bleiben ohne Video.
- **E9 C2PA:** eigenes Manifest signieren oder nur sichtbar kennzeichnen plus Metadaten (§6).
- **E10 Automatische Freigabe bei bestandener Prüfung:** Vorschlag nein, für KI-Übungen nie.
- **E11 Lauf-ABC überhaupt als Video?**
- **E12 Wer ist Betreiber:** Privatperson oder Firma. Das bestimmt die Kennzeichnungspflicht; anwaltlich prüfen lassen.

---

## 6. Kennzeichnung als KI-generiert

Nach den Leitlinien der Kommission C(2026) 5054, Rn. 113–114 und 120–122, ist das sehr wahrscheinlich ein Deepfake. Damit gilt **Art. 50(4) und (5) für Tri-Coach als Betreiber** [B, Dossier „figur-recht"]. Die Kennzeichnung hat vier Ebenen:

1. **Im Bild:** das EU-Symbol „AI" in der Variante „Fully AI-Generated", oben rechts über die ganze Schleife eingebrannt (Schritt 8), auch in allen WebP-Standbildern. Oben rechts ist frei, der Abspielknopf sitzt unten rechts (`fachlich.css:681-684`).
2. **In der Oberfläche:** In der Vorschau von 96×72 ist das eingebrannte Symbol nicht lesbar.
   - Deshalb ein Abzeichen `.ki-abzeichen` mit „KI" an Vorschau (`UebungenAbschnitt.tsx:129`, `LaufAbcAbschnitt.tsx:183`), Bühne und Workout, mit `aria-label="KI-generiertes Video einer fiktiven Trainerin"`.
   - Text neben der Herkunft (`UebungenAbschnitt.tsx:352-354`): „KI-generiertes Video. Die Trainerin ist eine erfundene Person. Die Bewegung stammt aus der geprüften Tri-Coach-Bibliothek." Bei KI-Übungen heißt es: „… aus einer von der KI beschriebenen und freigegebenen Bewegung".
   - Ein Hinweis nur in AGB oder Anleitung genügt nicht (Rn. 142).
3. **`Rechtliches.tsx`:** Abschnitt „KI-generierte Inhalte" mit den eingesetzten Modellen und einem Meldeweg für fehlende Kennzeichnung (Kodex, Measure 2.3). Die Werbeseite kennzeichnet genauso, falls sie die Videos zeigt.
4. **Maschinenlesbar:**
   - ffmpeg-Metadaten `comment`.
   - Je Clip ein `manifest.json` mit Bewegungsfassung, Figur-Fassung, Modell, Anbieter, Seed, Prompt, SHA-256 von Original und Clip, Prüfwerten und wer wann freigegeben hat (Dossier A5).
   - Beim Neukodieren geht ein C2PA-Manifest des Anbieters vermutlich verloren [A]. Deshalb wird das Original 30 Tage unter `arbeit/` aufbewahrt, sein SHA-256 dauerhaft.
   - Ein eigenes C2PA-Manifest mit `trainedAlgorithmicMedia`, eigenem Zertifikat und dem Original als Zutat ist E9. MP4 wird unterstützt, WebM nicht, das hier ohnehin entfällt [B].
   - Mit einem Dienst über API ist Tri-Coach Betreiber, nicht Anbieter. Die Pflicht nach Art. 50(2) liegt dann beim Anbieter (Rn. 11, 15) [B, Einordnung]. Ob das Neukodieren als „Entfernen" einer Kennzeichnung gilt, bleibt rechtlich zu prüfen.
5. **Die Strichfigur** braucht keine Kennzeichnung (Rn. 113).

---

## 7. Was das Dossier offenlässt

Das muss der Pilot klären:
- Ob Kling oder Wan-Animate-2 über die API eine **Puppe** als Treiber annehmen (nirgends getestet).
- Welche Seitenverhältnisse und Mindestauflösungen sie nehmen. Daher die 16:9-Leinwand mit 4:3-Feld.
- Ob fal oder WaveSpeed nach Ausgabe- oder Eingabesekunden abrechnen.
- Die genauen Endpunkte.
- Ob ein Bildmodell eine Posenvorlage zuverlässig in die Startpose überträgt.
- Wie schnell RTMW und der Puppen-Renderer auf einem Pi 4 bzw. Pi 5 laufen; die Zahlen kommen nur von x86.
- Ob die Nachbildung der rtmlib-Vorverarbeitung ohne OpenCV dieselben Werte liefert.
- Ob das ffmpeg von Debian trixie auf arm64 libx264 enthält.
- Die Lizenz der RTMW-Gewichte und ihrer Trainingsdaten.
- Die Kling-AGB im Original.
- Die Schwellen der Prüfung: Sie sind an Puppen gemessen, nicht an fotorealistischen Clips.