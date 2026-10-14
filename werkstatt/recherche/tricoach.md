# Karte: Was eine posegesteuerte Video-Variante (B) in Tri-Coach berührt

Ich habe keine Dateien in Tri-Coach oder Remotion geändert. Kennzeichnung: **[B]** heißt im Code belegt oder selbst nachgerechnet, **[A]** heißt Annahme oder Schätzung.

Die Rechenskripte und ihre Ergebnisse liegen unter `/tmp/claude-0/-home-user/bf8cf066-c69c-54cc-8f0b-85da01f0d936/scratchpad/`:
- `analyse2.py` → `uebungen2.json` (Lage, Kontakte, Flugphasen)
- `ausschnitt.py` (Bildausschnitt, Kopfgröße in Pixeln)

---

## 1. Das Format „Bewegung" und wie das Frontend daraus Bilder macht

### Das Format (`backend/app/animation/format.py`) [B]
- **Bewegung** (`format.py:72-84`, `109-110`):
  - `schluessel`: Kleinbuchstaben mit Bindestrichen, höchstens 80 Zeichen.
  - `name`, `aliase` (höchstens 20).
  - `ansicht`.
  - `betont`: höchstens 12, geprüft gegen `MUSKELGRUPPEN`.
  - `unterlage`: `matte` (Vorgabe) oder `boden`.
  - `requisiten`: höchstens 4.
  - `ablauf`: 1 bis 12 Schlüsselbilder.
- **Ansicht** (`format.py:46-51`):
  - `gieren` −360…360, Vorgabe 70; 0 heißt von vorn, 90 von links der Figur.
  - `neigen` −10…89, Vorgabe 15.
- **Schlüsselbild** (`format.py:91-106`):
  - `pose`: Schlüssel und Bereiche aus `koerper.BEREICHE`.
  - `halten_s` 0–10 s, Vorgabe 0,4.
  - `uebergang_s` 0,1–10 s, Vorgabe 1,0.
  - `zwischen`: höchstens 4 gelöste Zwischenposen. Der Löser legt immer zwei an (`loeser.py:228` `ZWISCHENBILDER = 2`, `_zwischenbilder` in `loeser.py:241-262`).
- **Requisit** (`format.py:54-69`): nur `kasten` oder `wand`. Die Faszienrolle ist ein Kasten mit 0,15 m Höhe. Hanteln, Bänder und Bälle gibt es nicht (`docs/animationen.md:224-226`).
- **Rezept** (`format.py:118-171`) mit `boden`, `halten`, `ziele`, `frei` und `aus_vorherigem`: Das ist nur die Eingabe des Lösers, die App sieht es nie.

### Das Körpermodell (`koerper.py`) [B]
- 32 Posenparameter (`koerper.py:58-79`):
  - 7 für die Wurzel,
  - 5 für den Rumpf, darunter `atmen`,
  - 10 je Seite.
- Ohne Angabe steht das Becken auf `y = 0,973` (`koerper.py:82`).
- 26 Gelenkpunkte und 18 Segmente (`koerper.py:87-110`, `214-272`). Der Kopf ist eine Kugel mit r = 0,115 m, dazu ein Nasenpunkt.
- Die Maße sind die eines Erwachsenen von gut 1,75 m (`koerper.py:37-50`): Schultern 0,38 m, Becken 0,20 m breit.
- Was fehlt:
  - Augen und Ohren.
  - Drehen oder seitliches Neigen des Kopfs; es gibt nur `kopf_beugen`.
  - Unterarmdrehung.
  - Die Hand ist ein einziges Segment `hand→finger` (8 cm) mit nur `handgelenk`-Beugung.
  - Der Fuß kann nur heben und senken.

### Vom Format zum Bild (Frontend) [B]
- **`bewegung.ts:19-24`**: `dauer` ist die Summe aus `halten_s` und `uebergang_s` aller Bilder.
- **`bewegung.ts:33-56`** (`poseBei`):
  - Die Zeit läuft modulo Schleifendauer.
  - Während `halten_s` steht die Pose fest.
  - Der Übergang läuft über die Kette [Pose, …Zwischenbilder, nächste Pose].
  - `glatt()` ist eine Kosinuskurve über den ganzen Übergang, je Teilstück wird linear überblendet (`koerper.ts:223-235`).
  - Das letzte Bild blendet ins erste, die Schleife ist also nahtlos.
- **`koerper.ts:159-216`** (`punkte`): Vorwärtskinematik, Zahl für Zahl wie `koerper.py:214-272`. Geprüft wird das mit `npm run pruefen:koerper` (`package.json:11`).
- **`szene.ts:103-167`** (`Szene`, je Bewegung einmal berechnet):
  - Die Kamera kommt aus `gieren` und `neigen` (`szene.ts:116-122`).
  - Die Projektion ist **orthografisch**, ein Skalarprodukt mit „rechts" und „oben" (`szene.ts:157-160`, `177-180`).
  - Der Ausschnitt ist fest und umfasst alle Posen, Zwischenbilder, je drei Stützstellen jedes Übergangs und die Ecken der Requisiten, plus 0,15 m Rand (`szene.ts:127-166`).
  - Die Matte wird automatisch um alle bodennahen Punkte gelegt (`szene.ts:137-153`).
- **`zeichne()`** (`szene.ts:170-321`):
  - Reihenfolge: 8 % Rand, Hintergrund, Matte, Wand, weicher Schatten, Kasten, dann die Segmente nach Tiefe sortiert.
  - Nahe und ferne Seite sind unterschiedlich gefärbt, `betont` in der Akzentfarbe.
  - `atmen` weitet nur das Beckensegment (`szene.ts:288`, `304`); im Skelett ist es also unsichtbar.
  - Die Farben gibt es je Hell und Dunkel (`szene.ts:30-59`).
- **`Figur.tsx`**:
  - `FigurAnimation` (`Figur.tsx:112-163`): `requestAnimationFrame` außerhalb von React, 30 Bilder/s, in Listen 20. Angehalten friert sie ein und zeichnet alle 500 ms neu.
  - `FigurStandbild` (`Figur.tsx:166-191`): ein einzelnes Schlüsselbild.
- **Alle Bühnen sind 4:3** (`fachlich.css`):
  - Liste 96×72 (`fachlich.css:650-656`),
  - Detail (`fachlich.css:669-679`),
  - Bildfolge 104×78 (`fachlich.css:698-704`),
  - Workout mit höchstens 40vh Höhe (`fachlich.css:772-779`).

### Die Bibliothek in Zahlen [B, nachgerechnet]
- 59 Einträge, im Mittel 2,6 kB JSON je Übung, 2 bis 6 Schlüsselbilder (Durchschnitt 2,5).
- **Schleifendauer**:
  - Kraft und Mobility (49): 2,7–8,6 s, Median 5,4 s.
  - Lauf-ABC (10): 0,46–1,9 s, Median 0,71 s.
  - Alle 59 zusammen: 257 s.
  - 27 Übungen dauern länger als 5 s.
- **Ganzzahlige Bildzahl je Schleife**:
  - Bei 30 fps gehen 53 von 59 auf. Nicht auf gehen: ankle-dribbles 17,4, high-knees 13,8, a-skip 25,2, lateral-shuffle 15,9, carioca 37,2, bounding 41,4 Bilder.
  - Mit 5 Schleifen je Datei werden sie ganzzahlig, lateral-shuffle braucht 10.
  - Bei 24 oder 16 fps gehen 47 von 59 nicht auf.

| Schlüssel | s | gieren/neigen | Lage | Flug je Schleife | Requisit | Unterlage |
|---|---|---|---|---|---|---|
| glute-bridge | 3,60 | 66/16 | Rückenlage | – | – | matte |
| single-leg-glute-bridge | 3,80 | 66/16 | Rückenlage | – | – | matte |
| marching-glute-bridge | 6,50 | 66/16 | Rückenlage | – | – | matte |
| dead-bug | 6,40 | 62/18 | Rückenlage | – | – | matte |
| knee-to-chest | 5,40 | 66/16 | Rückenlage | – | – | matte |
| supine-figure-four-stretch | 5,40 | 40/22 | Rückenlage | – | – | matte |
| supine-hamstring-stretch | 5,50 | 66/16 | Rückenlage | – | – | matte |
| lying-spinal-twist | 5,70 | 15/55 | Rücken → Seite | – | – | matte |
| happy-baby-pose | 4,00 | 72/22 | Rückenlage | – | – | matte |
| diaphragmatic-breathing | 8,40 | 66/16 | Rückenlage | – | – | matte |
| clam-bridge | 5,40 | 35/25 | Rückenlage | – | – | matte |
| clamshell | 2,90 | 12/24 | Seitenlage | – | – | matte |
| side-lying-leg-raise | 2,90 | 12/24 | Seitenlage | – | – | matte |
| side-plank | 4,10 | 12/24 | Seitstütz (aus Seitenlage) | – | – | matte |
| side-plank-with-leg-lift | 2,90 | 12/24 | Seitstütz | – | – | matte |
| open-book | 5,50 | 0/60 | Seitenlage | – | – | matte |
| plank | 6,00 | 70/16 | Stütz | – | – | matte |
| push-up | 2,80 | 70/16 | Stütz | – | – | matte |
| superman | 4,00 | 70/16 | Bauchlage | – | – | matte |
| bird-dog | 6,40 | 70/18 | Vierfüßler | – | – | matte |
| donkey-kick | 2,70 | 70/18 | Vierfüßler | – | – | matte |
| fire-hydrant | 2,70 | 160/25 | Vierfüßler | – | – | matte |
| cat-cow | 4,80 | 90/10 | Vierfüßler | – | – | matte |
| thread-the-needle | 5,70 | 20/32 | Vierfüßler | – | – | matte |
| childs-pose | 6,90 | 70/18 | Vierfüßler → Kind (Kopf auf der Matte) | – | – | matte |
| adductor-rock-back | 4,20 | 150/28 | Vierfüßler | – | – | matte |
| hip-cars | 4,20 | 115/30 | Vierfüßler | – | – | matte |
| pigeon-pose | 7,80 | 55/18 | Boden (Taube, aus dem Vierfüßler) | – | – | matte |
| standing-hip-abduction | 2,70 | 8/8 | stehend | – | – | boden |
| single-leg-deadlift | 4,20 | 80/8 | stehend | – | – | boden |
| lateral-lunge | 5,80 | 8/8 | stehend | – | – | boden |
| cossack-squat | 6,80 | 8/8 | stehend | – | – | boden |
| wall-sit | 6,00 | 80/8 | stehend | – | Wand | boden |
| step-up | 3,20 | 80/8 | stehend | – | Kasten 0,3 m | boden |
| standing-pelvic-drop | 3,00 | 8/8 | stehend | – | Kasten 0,2 m | boden |
| standing-quad-stretch | 5,30 | 80/8 | stehend | – | – | boden |
| standing-hamstring-stretch | 5,70 | 80/8 | stehend | – | – | boden |
| standing-it-band-stretch | 5,70 | 8/8 | stehend | – | – | boden |
| standing-side-bend | 8,60 | 8/8 | stehend | – | – | boden |
| calf-stretch | 5,70 | 80/8 | stehend | – | Wand | boden |
| ankle-dorsiflexion-mobilization | 3,40 | 80/8 | kniend | – | Wand | matte |
| butterfly-stretch | 6,80 | 15/40 | sitzend | – | – | matte |
| seated-hamstring-stretch | 6,80 | 70/18 | sitzend | – | – | matte |
| 90-90-hip-stretch | 6,80 | 30/30 | sitzend | – | – | matte |
| 90-90-hip-switch | 5,60 | 20/32 | sitzend | – | – | matte |
| half-kneeling-hip-flexor-stretch | 6,40 | 70/18 | kniend | – | – | matte |
| foam-roller-tfl | 4,40 | 15/25 | Seitstütz auf der Rolle | – | Kasten 0,15 m | matte |
| foam-roller-glute | 4,00 | 55/18 | Sitz auf der Rolle, Handstütz | – | Kasten 0,15 m | matte |
| quadruped-thoracic-rotation | 4,60 | 20/32 | Vierfüßler | – | – | matte |
| ankle-dribbles (ABC) | 0,58 | 80/8 | stehend | – | – | boden |
| a-march (ABC) | 1,90 | 80/8 | stehend | 633 ms (Artefakt) | – | boden |
| high-knees (ABC) | 0,46 | 80/8 | stehend | 200 ms | – | boden |
| butt-kicks (ABC) | 0,50 | 80/8 | stehend | 133 ms | – | boden |
| a-skip (ABC) | 0,84 | 80/8 | stehend | 550 ms | – | boden |
| b-skip (ABC) | 1,00 | 80/8 | stehend | 267 ms | – | boden |
| lateral-shuffle (ABC) | 0,53 | 12/8 | stehend | 200 ms | – | boden |
| carioca (ABC) | 1,24 | 15/10 | stehend | – | – | boden |
| bounding (ABC) | 1,38 | 80/8 | stehend | 833 ms | – | boden |
| straight-leg-run (ABC) | 0,50 | 80/8 | stehend | 267 ms | – | boden |

**Wie die Tabelle entstand:**
- Die Lage stammt aus den Bodenkontakten, die das Rezept je Schlüsselbild erklärt (`boden` und `halten`), gewichtet mit der Dauer des Bildes.
- Als Flug zählt ein Bild, in dem jedes Kontaktgelenk mehr als 2 cm über dem Boden oder der Oberseite eines Kastens steht, abgetastet mit 60 Bildern/s.

**Zusammenfassung der Lagen:**
- Stehend: 22 (12 Kraft und Mobility, 10 Lauf-ABC).
- Kniend: 2.
- Sitzend: 5.
- Liegend: 15 (10 Rückenlage, 1 von Rücken zu Seite, 3 Seitenlage, 1 Bauchlage).
- Stütz oder Vierfüßler, also Hände oder Unterarme tragen: 15 (2 Stütz, 3 Seitstütz, 8 Vierfüßler, dazu Kind und Taube).
- Auf der Matte liegen 37 Übungen, auf dem Boden stehen 22.
- Flugphase: 7 echte, von 133 bis 833 ms je Schleife und bis 21 cm hoch. Dazu kommt das Artefakt bei a-march.

**Was sonst für ein Video zählt:**
- **Hände:** Bei 30 Übungen liegen Hände oder Finger am Boden auf, bei 19 greifen sie etwas (Knie, Fuß, Hüfte), bei 18 sind sie frei.
- **Kamera von hinten:** fire-hydrant (160), adductor-rock-back (150) und hip-cars (115) zeigen das Gesicht nicht.
- **Steile Draufsicht:** open-book (60), lying-spinal-twist (55), butterfly-stretch (40).
- **Seiten:** 28 Schleifen zeigen nur eine Seite, 16 wechseln die Seite innerhalb der Schleife. Das Workout spiegelt nicht; in `Workout.tsx` und `Figur.tsx` gibt es keinen Code dafür.
- **Fast reine Halteübungen:** Bei plank und wall-sit ändert sich nur `atmen`, bei diaphragmatic-breathing zusätzlich die Arme um wenige Grad. Ein Skelettvideo dazu wäre nahezu statisch.
- **Kopfgröße** [B]:
  - Bei 640×480: Median 57 px, Spanne 39–87 px; stehende Übungen 39–49 px.
  - In der Listenvorschau (96×72 CSS-Pixel): Kopf 5,8–13 px.
  - 28 Ausschnitte sind höher als breit.
- **Fehler bei a-march:** Beide Schlüsselbilder sind ein Einbeinstand auf den Zehen, es gibt keine Zwischenbilder, und das Becken steht fest auf `y = 1,041`. In der Mitte jedes Übergangs schweben deshalb beide Füße 17 cm über dem Boden (nachgerechnet). `docs/animationen.md:125` nennt diese Übung „gegangen". Ein posegesteuertes Video würde daraus ein Hüpfen machen.

**Abbildung auf ein OpenPose-Skelett als Steuersignal:**
- Direkt übernehmen lassen sich:
  - Nase ← `nase`,
  - Schultern, Ellbogen ← `schulter_*`, `ellbogen_*`,
  - Handgelenk ← `hand_*`,
  - Hüften ← `huefte_*`, Hüftmitte ← `becken`,
  - Knie ← `knie_*`, Knöchel ← `knoechel_*`,
  - Ferse ← `ferse_*`, Großzeh ← `zehen_*`.
- Den Hals sollte man aus der Mitte der Schultern nehmen, nicht aus `nacken`: Der liegt 13 cm darüber (`koerper.py:234`, `239`).
- Augen, Ohren und die Kleinzehe fehlen. Augen und Ohren lassen sich aus `kopf`, `nase` und `nacken` ableiten [A].
- Die 21 Handpunkte fehlen ganz. Die Hände wären also nicht gesteuert.
- Remotion könnte `koerper.ts` übernehmen (es importiert nichts), dazu `poseBei` und die Projektion aus `Szene`. Das Projekt kopiert schon heute Werte aus Tri-Coach (`Remotion/src/TriCoachRennen/marke.ts`).

---

## 2. Das Modell `UebungsAnimation`

**Felder** (`models.py:1507-1549`, Tabelle `uebungs_animationen`) [B]:
- `schluessel` (eindeutig), `name`, `aliase` (JSON), `daten` (JSON: die Bewegung ohne Schlüssel, Name und Aliase).
- `herkunft`: `bibliothek` oder `ki`.
- `zustand`: `freigegeben`, `ungeprueft` (Vorgabe) oder `verworfen`.
- `fassung`: Prüfsumme der Bibliotheksfassung, bei KI-Animationen leer.
- `hinweise`, `rueckmeldung`, `ki_job_id`, `model_used`, `erstellt_am`, `geaendert_am`.
- Die Animationen gehören **allen Konten gemeinsam** (`models.py:1510-1514`).

**`fassung`** (`bibliothek_datei.py:96-99`) ist SHA-1 auf 12 Zeichen über den **ganzen** Eintrag, also auch über Schlüssel, Name und Aliase. Ein neuer Alias oder ein geändertes `betont` ergibt deshalb eine neue Fassung.

**`einspielen()`** (`bibliothek.py:37-62`, aufgerufen bei jedem Start in `main.py:55-62`):
- Eine Zeile mit `herkunft == "bibliothek"` und gleicher Fassung wird übersprungen (`bibliothek.py:44`).
- Alle anderen werden überschrieben: `daten`, `herkunft = bibliothek`, `zustand = freigegeben`, `fassung`, `hinweise = None` (`bibliothek.py:48-55`).
- Gespeichert wird mit vollem `save()` in einer Transaktion.
- Zurück gibt es nur die Anzahl, nicht welche Schlüssel sich geändert haben.

**Was beim Neulösen einer Bewegung passiert:**
- **Bibliothek:**
  - `scripts/animationen_loesen.py:30-41` löst **alle** Rezepte neu und schreibt `bibliothek.json` komplett.
  - Laut `docs/animationen.md:108-115` ergab das auf einem anderen Rechner 0,1° Abweichung. Dann ändert sich die Fassung jeder betroffenen Übung, und beim nächsten Start wird sie eingespielt.
  - Ein Test fängt ab, wenn Rezepte und `bibliothek.json` nicht zusammenpassen (`test_animation.py:187`).
- **KI:**
  - `erzeugung.uebernimm` (`erzeugung.py:145-163`) überschreibt dieselbe Zeile: `herkunft = ki`, `zustand = ungeprueft`, `fassung = None`, dazu Job und Modell.
  - Es gibt keinen Verlauf alter Fassungen.
- **`geaendert_am`** setzen auch Freigeben und Verwerfen (`routers/animationen.py:120`, `142`). Es taugt also nicht als Zeichen, dass sich die Bewegung geändert hat.
- **Folgerung:** Ein Video braucht einen eigenen Inhaltshash über `ansicht`, `unterlage`, `requisiten` und `ablauf`, nicht über `fassung`.

**Widerspruch zwischen Doku und Code** [B]:
- Eine verworfene Bibliotheksanimation wird von der KI ersetzt (`erzeugung.py:148` übernimmt nur, wenn verworfen).
- Beim nächsten Start holt `einspielen()` die Bibliotheksfassung zurück, weil die Herkunft jetzt nicht mehr „bibliothek" ist. Das ist gewollt, ein Test prüft es (`test_animation.py:212-219`).
- `docs/animationen.md:165-167` sagt dagegen, erst eine geänderte Bibliotheksfassung hole die kuratierte zurück.
- Für Videos heißt das: Unter demselben Schlüssel kann die Bewegung zwischen KI- und Bibliotheksfassung wechseln.

**`AnimationOut`** (`schemas.py:1911-1932`) gibt keine Fassung aus. Ein Video- oder Hash-Feld müsste dort neu hinein und in `types.ts:881-894` mitgezogen werden.

---

## 3. API und Komponenten: wo ein Video statt der Figur stünde

### Die API [B]
- `routers/animationen.py`:
  - `60-66`: Übersicht.
  - `69-101`: Übungen einer Einheit, die Bewegung gleich mit in der Antwort.
  - `104-112`: eine Animation über Schlüssel oder Alias.
  - `115-122`: Freigeben.
  - `125-144`: Verwerfen.
- **Die Liste bei Kraft und Mobility kommt aus `routers/training.py:30-58`** (`/ablauf`), ebenfalls über `als_ausgabe`.
- `verzeichnis()` (`bibliothek.py:65-73`) zeigt freigegebene und ungeprüfte Animationen; bei gleichem Alias gewinnt die Bibliothek.

### Einsatzstellen im Frontend
1. **Listenvorschau Kraft und Mobility** (`UebungenAbschnitt.tsx:127-139`): 96×72, 20 Bilder/s, läuft nicht bei reduzierter Bewegung. Die Daten kommen aus `api.trainingAblauf` (`UebungenAbschnitt.tsx:40-47`).
2. **Aufgeklappte Übung** (`UebungDetail`):
   - Bühne 4:3, ein Klick hält an (`UebungenAbschnitt.tsx:247-254`).
   - Bildfolge der Schlüsselbilder als Standbilder (`UebungenAbschnitt.tsx:337-349`). Für ein Video bräuchte es je Schlüsselbild ein Poster; die Zeitpunkte lassen sich aus den Halte- und Übergangszeiten ableiten.
   - Schleifendauer und Herkunft (`UebungenAbschnitt.tsx:350-354`).
   - Hinweis „ungeprüft" mit Freigeben und Verwerfen (`UebungenAbschnitt.tsx:274-301`).
3. **Lauf-ABC** (`LaufAbcAbschnitt.tsx`): Vorschau `181-193`, aufgeklappt `199`, statische Zeile `158-172`.
4. **Workout** (`Workout.tsx:241-249`): läuft, solange das Workout nicht pausiert. Es prüft nur, ob eine Animation da ist, nicht `abspielbar()`.
5. **`abspielbar()`** (`UebungenAbschnitt.tsx:174-176`) ist der natürliche Ort für die Frage „Gibt es ein passendes Video?".

Beide Abschnitte hängen in `SessionDetail.tsx:93-100`. Übersicht und Trainingsplan öffnen denselben Dialog.

### Verhalten heute
- **Mehrere gleichzeitig:** Alle Vorschauen einer Einheit laufen zugleich, meist höchstens zehn (`routers/animationen.py:73-75`, `Figur.tsx:80-83`). Es gibt dabei kein `IntersectionObserver` und kein spätes Laden – anders als beim Rennvideo (`RennenImHintergrund.tsx:77-97`).
- **Reduzierte Bewegung:**
  - `Figur.tsx:94-95` liest die Einstellung beim Rendern und reagiert nicht auf Änderungen.
  - In der Liste friert die Figur bei etwa t = 0 ein (`Figur.tsx:129-138`).
  - Aufgeklappt und im Workout läuft sie trotzdem (`docs/frontend.md:211-213`).
  - Den Datensparmodus prüft nur das Rennvideo (`RennenImHintergrund.tsx:44-47`).
- **Ein- und Ausblenden je Gerät:**
  - Nur beim Lauf-ABC: `localStorage` `tricoach.laufabc.animationen`; ausgeblendet wird nichts geladen (`LaufAbcAbschnitt.tsx:27-45`, `71-75`, `91-94`, `131-134`).
  - Kraft und Mobility haben keinen Schalter.
  - Das Rennvideo hat einen Pause-Knopf und merkt sich die Wahl (`RennenImHintergrund.tsx:31-42`, `108-120`, `146-154`).
- **Was gegenüber der Figur verloren ginge:**
  - Die betonten Muskeln in Akzentfarbe (`szene.ts:291-302`); es blieben nur die Abzeichen (`UebungenAbschnitt.tsx:262-270`).
  - Hell und Dunkel (`szene.ts:30-59`, `Figur.tsx:182-183`); ein Video hat einen festen Hintergrund.

---

## 4. Auslieferung, Größe, Cache, Backup

### Die Rennvideos heute [B, ffprobe]
- Sechs Dateien in `frontend/src/auth/rennen/`, zusammen 13,0 MB:

| Datei | Größe | Format |
|---|---|---|
| `rennen-band.mp4` | 2,97 MB | H.264, 1280×720 |
| `rennen-hoch.mp4` | 3,45 MB | H.264, 864×1080 |
| `rennen-band.webm` | 2,99 MB | AV1 |
| `rennen-hoch.webm` | 3,55 MB | AV1 |
| `rennen-band.webp` | 40,9 kB | Standbild |
| `rennen-hoch.webp` | 39,3 kB | Standbild |

- Alle Videos: 18 s, 30 Bilder/s, 1,32–1,58 Mbit/s.
- Kodiert in Remotion (`scripts/ausliefern.sh:31-38`): x264 `veryslow` CRF 31 mit `faststart`, SVT-AV1 CRF 44, WebP aus Bild 0.
- **Einbindung:** Vite-Import in `RennenImHintergrund.tsx:16-26`, die Dateien landen als `dist/assets/<name>-<hash>`.
  - `vite.config.ts` setzt `base: './'`.
  - Das `<video>` ist stumm, läuft in Schleife und inline, mit Poster und zwei `<source>` samt Codec-Angabe (`RennenImHintergrund.tsx:124-144`).

### Wie das Backend ausliefert [B]
- `frontend.ausliefern` (`frontend.py:81-98`, `urls.py:17`) liefert aus `STATIC_DIR = backend/static` (`frontend.py:24`). Im Abbild ist das `/app/static` (`Dockerfile:82`).
- Byte-Bereiche (206 und 416) und ein starkes `ETag` gibt es für jede Datei (`frontend.py:101-154`).
- `Cache-Control: immutable` für ein Jahr gibt es **nur unter `assets/`** (`frontend.py:30`, `95-96`).
- **`If-None-Match` und damit 304 gibt es nicht**; eine `ConditionalGetMiddleware` fehlt (`settings.py:125-134`). Alles außerhalb von `assets/` – Vites `public/` oder ein neuer API-Endpunkt – wird ohne eigenes `Cache-Control` bei jedem Besuch ganz neu übertragen.
- Ausgeliefert wird durch den einen Uvicorn-Prozess, in Blöcken zu 64 KiB (`frontend.py:36`, `157-165`; `run.sh:346`).
- **Ingress:** Der Kopf `X-Ingress-Path` wird zum `<base>`-Tag (`frontend.py:55-75`), das Frontend liest ihn zurück (`basePath.ts:17-23`). Relative Pfade funktionieren also.
- Es gibt keinen Service Worker, also beim Workout nichts offline.

### `/data` und Backup [B]
- `/data` ist das Datenverzeichnis des Add-ons (`run.sh:10`), `TRI_DATA_DIR=/data` (`run.sh:57`).
- Backup (`config.yaml:28-32`): `backup: hot`, vorher `tricoach-sichern`, ausgenommen sind **nur** `postgres` und `postgres.neu`. Alles andere unter `/data` landet in jedem Home-Assistant-Backup.
- `tricoach-sichern:28-33` legt den Datenbankabzug unter `/data/sicherung/tricoach.dump` ab.

### Abbild und Bau [B]
- `config.yaml` hat keinen `image`-Eintrag: Das Abbild wird lokal auf dem Pi aus dem Git-Repo gebaut (`repository.yaml`; `docs/backend.md:455-466` nennt 15–20 min).
- Die Frontend-Stufe kopiert `frontend` (`Dockerfile:4-10`); `.dockerignore` schließt Videos nicht aus.
- Git-Pack heute 16,8 MiB, davon etwa 13 MB die vier Rennvideos. Der lokale Klon ist flach.

### Was daraus für 59+ Übungsvideos folgt
- **JS-Bundle:** Medien über 4 kB legt Vite als eigene Dateien ab [A, Vite-Vorgabe `assetsInlineLimit`]. Mit `import.meta.glob(…, {query: '?url'})` bliebe im Bundle nur eine URL-Tabelle von wenigen kB. Die Größe trifft also `dist`, das Abbild und Git, nicht das Bundle.
- **Größe je Durchlauf** [A]:

| Anteil | Größe |
|---|---|
| Hauptvideo 640×480, 0,4–0,8 Mbit/s, je Codec (257 s) | 13–26 MB |
| MP4 und WebM zusammen | 26–51 MB |
| kleine Vorschaufassung, beide Codecs | 6–13 MB |
| Poster: 59 Startbilder + 146 Schlüsselbilder | 2–4 MB |
| **zusammen** | **etwa 35–70 MB** |

  - Das ist das Drei- bis Fünffache des heutigen Repos.
  - Jede Korrektur einer Übung kostet 0,5–1,5 MB Git-Historie. Zum Vergleich: Die Bewegung selbst hat im Mittel 2,6 kB.
- **Lauf-ABC:** Für die sehr kurzen Schleifen besser mehrere Schleifen je Datei (bei 30 Bilder/s fünf, lateral-shuffle zehn) [B]. Bei sehr kurzen Clips droht an der Schleifenstelle ein Ruckler [A].
- **Cache:**
  - Nur `assets/` mit Hash im Namen wird gecacht.
  - Wer Videos unter `/data` ablegt, braucht ein eigenes `Cache-Control`, einen Hash im Namen **und** einen Eintrag in `backup_exclude`.
  - Ein fremder Server oder ein CDN widerspräche `docs/frontend.md:566-571`: Dort sähe ein Dritter die IP-Adresse.
- **Laufzeit:** Bis zu zehn gleichzeitige `<video>` belasten Decoder und Akku am Telefon [A]. Naheliegend: in der Liste nur Poster, abspielen nur aufgeklappt oder sichtbar.

---

## 5. KI-Jobs: Gibt es einen Haken für einen Video-Auftrag?

### Was es heute gibt [B]
- **Jobart `animation`:**
  - `runner.py:68-73` (Denktiefe `high`), Startmeldung `100-107`.
  - Verzweigung `runner.py:300-319`: Eine neue Jobart gehört **vor** das `else`, sonst plant es still einen Block (Kommentar `315-318`).
  - `_animation_lauf` (`runner.py:677-714`): fehlende Übungen bestimmen, Claude fragen, `uebernimm`.
  - Höchstens 6 Übungen je Lauf (`animation/ki.py:33`).
- **Automatik:**
  - Vierter Zweig der Weckschleife (`garmin/automatik.py:33-35`, `98-106`) ruft `erzeugung.erzeuge_faellige` (`erzeugung.py:193-241`).
  - Pause 6 h, nach einem Fehler 24 h (`erzeugung.py:44-45`).
  - Von Hand: `routers/ki.py:368-386`, mit 409, wenn nichts fehlt.
- **Grenzen des Runners:**
  - Ein Lauf je Konto, gleich welcher Jobart (`runner.py:211-225`). Ein langer Video-Job sperrte das Konto für die Planung.
  - Er startet nur einen Claude-Code-Unterprozess, und der erzeugt keine Videos.
  - `KiJob` hat kein Feld für eine Animation (`models.py:1101-1131`); ein neues bräuchte eine Migration.

### Mögliche Haken
| Ereignis | Stelle | Was dort heute passiert |
|---|---|---|
| neue Bibliotheksfassung | `bibliothek.py:41-61` | kennt jede geänderte Zeile, meldet aber nur die Zahl |
| neue KI-Fassung | `erzeugung.py:145-163` | Zeile mit `ki_job_id` |
| nach Freigabe | `routers/animationen.py:115-122` | synchroner Endpunkt, kein Job, kein Signal |
| verworfen | `routers/animationen.py:125-144` | hier müsste ein Video ungültig werden |
| Zeitplan | fünfter Zweig der Weckschleife | ließe sich nach dem Muster von `erzeuge_faellige` anlegen |

### Ergebnis
Für Variante B, also zuerst nur die Bibliothek, gibt es **keinen natürlichen Haken in der App**. Erzeugt wird außerhalb: Auf dem Pi gibt es keine GPU, und Claude erzeugt keine Videos.

Der natürliche Auslöser ist eine Änderung von `bibliothek.json` im Repo: Ein Skript im Remotion-Projekt vergleicht den Inhaltshash und erzeugt neu, was sich geändert hat. Erst für KI-Animationen wäre die Freigabe der Haken – und auch dann nur als Auftrag an einen Dienst außerhalb des Add-ons.

---

## 6. Relevante Doku-Abschnitte

**`docs/animationen.md`:**
- `41-51` **„Eigene Animationen statt Videos aus dem Netz"**: die Entscheidung, die Variante B teilweise umdreht. Die Gründe: Lizenz, uneinheitliches Material, Treffer über den Namen ist kein Treffer über die Übung; Kilobyte statt Megabyte, scharf in jeder Größe, Hell und Dunkel.
- `81-90` „Die Weboberfläche rechnet selbst, statt Bilder zu holen".
- `100-115` Vorab lösen; neue Rezepte anhängen (Gleitkomma-Abweichung).
- `117-126` Laufdrills fliegen, auf der Stelle.
- `140-144` Die Animationen gehören allen Konten.
- `158-167` „ungeprüft" und Verwerfen.
- `224-229` Grenzen: Taube, Schmetterling und die sitzende Dehnung verfehlen einen Kontakt um 3–7 cm, „was man in der Animation nicht sieht". In einem fotorealistischen Video sähe man es womöglich.

**`docs/frontend.md`:**
- `200-214` Übungen im Dialog, Canvas, 20 Bilder/s, reduzierte Bewegung.
- `560-579` Das Rennvideo: Pexels, eigener Server, Cache, gebaut in Remotion.
- `581-604` Zwei Fassungen, Codec-Angaben, je 3 bis 3,5 MB, Rückfall auf AV1.
- `606-624` Pause-Knopf (WCAG 2.2.2), Standbild bei reduzierter Bewegung oder Datensparmodus, Abspielen nur sichtbar, iOS im Stromsparmodus, `AbortError`, `preload="none"`, `muted` und `defaultMuted`.

**`docs/backend.md`:**
- `217-238` Byte-Bereiche, `ETag`, ein Jahr Cache.
- `455-466` Lokaler Build auf dem Pi, Ingress.

**`docs/grenzen.md`:**
- `84-87` Drills auf der Stelle; KI-Drills stehen auf „ungeprüft".
- `225-230` Das Backup trägt den Stand des letzten Abzugs.
- `695-703` Das Abbild holt Werkzeuge zur Bauzeit aus dem Netz.
- `741-745` Das Claude-Abo taugt nicht für ein kommerzielles Angebot. Eine Video-API wäre ebenfalls kostenpflichtig.
- `768-773` Viele gleichzeitige Läufe sind auf dem Pi spürbar.

**`docs/app-training.md:99-125`:** Was der Browser eigens braucht (Wake Lock, Ton, Ablauf). Ein Video müsste mit der Pause des Workouts gekoppelt sein.

### Veraltete Kommentare, nebenbei gefunden [B]
- `Figur.tsx`, `bewegung.ts` und `szene.ts` verweisen auf Dateien der entfernten iOS-App.
- `szene.ts:128` verweist auf ein `vorschau.vorbereiten`, das es nicht mehr gibt.
- `szene.ts:6` spricht von 27 Punkten; es sind 26.