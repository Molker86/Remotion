# Variante B: Referenzfigur und rechtlicher Rahmen (Stand 14.10.2026)

**Kurzfazit**
- **Wie ich es baue:** Zuerst ein einziges Ausgangsbild der fiktiven Trainerin. Daraus mit demselben Bildmodell Einzelansichten und je Übungsgruppe ein Bild in der Startpose der Übung. Das Videomodell bekommt dann ein Referenzbild, dessen Pose und Bildausschnitt dem ersten Bild des Steuervideos entsprechen. Der Bildteil kostet grob 10–50 USD (Annahme, aus den Preislisten unten hochgerechnet).
- **Kennzeichnungspflicht:** Rechtlich ist die fotorealistische, erfundene Trainerin nach den Leitlinien der Kommission sehr wahrscheinlich ein „Deepfake“ im Sinne des AI Act, Art. 3(60). Tri-Coach muss die Videos also sichtbar kennzeichnen (Art. 50(4) und (5)). Die abgeschwächte Regel für erkennbar fiktionale Werke greift nicht, weil die Videos einem Zweck dienen und kommerziell genutzt werden. Wird das Videomodell selbst betrieben (z. B. Wan), ist Tri-Coach zusätzlich Anbieter und muss die Videos maschinenlesbar markieren (Art. 50(2)).
- **Urheberrecht:** Die KI-Ausgaben sind in Deutschland nach der Rechtsprechung von 2026 voraussichtlich nicht geschützt. Die Anbieter-AGB erlauben die kommerzielle Nutzung, schützen aber nicht vor Kopien durch Dritte.
- **Persönlichkeitsrecht:** Ein Risiko entsteht nur, wenn die Figur einer realen Person ähnelt. Dafür gibt es einen dokumentierten Ähnlichkeitstest.

---

## A) Die Referenzfigur

### A1 Bildmodelle und Kosten (alle Seiten am 14.10.2026 abgerufen)

| Modell | Konsistenz und Referenzen | Preis | Herkunftskennzeichen |
|---|---|---|---|
| Google Gemini 3 Pro Image („Nano Banana Pro“) | bis 5 Charakter- und 3 Stilreferenzen; Nano Banana 2.1: bis 4 Charakterreferenzen [belegt, Tabelle im HTML der Doku geprüft; die Kurzfassung des Abruf-Werkzeugs hatte die Spalten vertauscht] | 0,134 USD je 1K/2K-Bild, 0,24 je 4K, im Batch die Hälfte; Nano Banana 2.1: 0,0336 (1K) / 0,0504 (2K) [belegt] | SynthID in allen Bildern [belegt]; C2PA für Pro in der Gemini-App, Vertex AI und Google Ads, für die API nicht genannt [belegt] |
| OpenAI gpt-image-2 / 2.5 | keine Angaben gefunden | 8 USD (Bildeingabe) bzw. 30 USD (Bildausgabe) je 1 Mio. Token, Stückpreis nur über den Rechner [belegt]; gpt-image-1.5 in hoher Qualität bei 1024²: ca. 0,133 USD [Drittquelle] | C2PA und SynthID in API-Bildern [laut Suchauszug der Hilfeseite; die Seite selbst lieferte 403] |
| BFL FLUX 3 Image / FLUX.2 pro/max | FLUX 3: „bis zu zehn Referenzen“ [belegt]; FLUX.2 pro: bis 8 Referenzen [Drittquelle] | bfl.ai zeigt nur „0,048 USD / Bild“ ohne Zuordnung zu Modell oder Auflösung [belegt]; FLUX.2 pro bei OpenRouter: 0,03 USD für das erste Megapixel, danach 0,015 [Drittquelle] | Die AGB erlauben eingebettete Content Credentials und verbieten, sie zu entfernen [belegt] |
| Imagen 4 Fast/Standard/Ultra | – | 0,02 / 0,04 / 0,06 USD [Drittquellen] | SynthID [Drittquelle] |

Quellen: [Gemini-Preise](https://ai.google.dev/gemini-api/docs/pricing), [Gemini-Bilddoku](https://ai.google.dev/gemini-api/docs/image-generation), [Google-Blog zu C2PA](https://blog.google/technology/ai/ai-image-verification-gemini-app/), [OpenAI-Preise](https://developers.openai.com/api/docs/pricing), [OpenAI-Hilfe zu C2PA](https://help.openai.com/en/articles/8912793-c2pa-in-images), [Drittquelle gpt-image-1.5](https://pricepertoken.com/image/model/openai-gpt-image-1-5), [BFL-Preise](https://bfl.ai/pricing), [FLUX 3](https://docs.bfl.ai/flux_3/flux3_image_overview), [OpenRouter FLUX.2 pro](https://openrouter.ai/black-forest-labs/flux.2-pro), [Drittquelle FLUX.2 Pro Edit](https://www.atlascloud.ai/providers/black-forest-labs), [Drittquelle Imagen 4](https://imagine.art/blogs/imagen-4-pricing).

Nicht belegt:
- **Seedream:** Preise nur von Wiederverkäufern, AGB nicht gefunden ([Drittquelle](https://evolink.ai/en/blog/seedream-pricing-guide-2026)).
- **Konsistenzwerte:** Aussagen wie „92 % Konsistenz“ sind Herstellerwerbung ([Selfielab](https://selfielabstudio.com/blog/nano-banana-pro-multi-ref-character-workflow-guide-20260313), [RunDiffusion](https://www.rundiffusion.com/nano-banana-2-consistent-character-images)).

**Empfehlung [Annahme]:** ein kurzer Vergleichstest mit 2–3 Modellen (Nano Banana Pro über Vertex AI wegen C2PA, FLUX 3, gpt-image-2). Danach alle abgeleiteten Ansichten mit demselben Modell und dessen Mehrfach-Referenzen erzeugen.

### A2 Was posegesteuerte Videomodelle vom Referenzbild brauchen

**Belegt:**
- **Kling Motion Control:**
  - Der Bildausschnitt muss zum Video passen: Ganzkörper zu Ganzkörper.
  - „the character's entire body and head are clearly visible and not obstructed“.
  - Proportionen wie im Video, Platz für die Bewegung im Bild.
  - Das Bewegungsvideo ist eine durchgehende Einstellung ohne Kameraschwenk, 3–30 s lang.
  - Fehlen im Bild Hände oder Füße, verformt sich die Anatomie.
  - [Anleitung](https://kling.ai/quickstart/motion-control-user-guide), [Blog vom 03.07.2026](https://kling.ai/blog/ai-motion-transfer-video-tutorial)
- **Wan2.2-Animate (Apache-2.0):**
  - Eingaben sind ein Bild der Figur plus ein Skelett- und ein Gesichtsvideo.
  - Die einfache Anpassung an die Proportionen (Retargeting) verlangt, dass Referenzbild und erstes Bild des Steuervideos „front-facing, stretched pose“ zeigen. Sie wird dringend empfohlen, „especially if the body proportions“ abweichen.
  - LoRAs für Wan2.2 werden für Wan-Animate ausdrücklich nicht empfohlen. Die Identität kommt dort also allein aus dem Referenzbild.
  - [README](https://github.com/Wan-Video/Wan2.2), [UserGuider](https://github.com/Wan-Video/Wan2.2/blob/main/wan/modules/animate/preprocess/UserGuider.md), [Paper](https://arxiv.org/abs/2509.14055)
- **Runway Act-Two:** Figur und Steuervideo sollten in dieselbe Richtung schauen und ähnlich viel Bildfläche füllen. Zeigt das Bild Hände, braucht das Steuervideo ebenfalls Hände. [Nur über die Zusammenfassung der Suche gesehen, nicht selbst abgerufen](https://newacademy.runwayml.com/tutorial/act-two-expressive-performances).

**Bezug zu Tri-Coach [belegt aus dem Repository]:**
- **Kamera:** Die Standardkamera blickt mit 70° Gieren und 15° Neigen fast von der Seite (`frontend/src/animation/szene.ts:116-117`). In den 59 Übungen der Bibliothek reicht die Ansicht von 0–20° (19 Übungen) über 55–90° (36) bis 115–160° (3), die Neigung bis 60° (`backend/app/animation/bibliothek/bibliothek.json`, Feld `ansicht`). Gebraucht werden also mindestens Ansichten von vorn, von der Seite, von hinten und von erhöht.
- **Format:** Bühne und Vorschau sind 4:3 (`frontend/src/styles/fachlich.css:650-653` mit 96×72 px, `:669-673`). Die Referenzbilder entstehen daher im Querformat 4:3.
- **Körpermaße:** Das Körpermodell ist ein Erwachsener von gut 1,75 m mit festen Segmentlängen (`backend/app/animation/koerper.py:36-49`). Die Figur sollte natürliche Durchschnittsproportionen haben, keine verlängerten Model-Beine. Dann passt das Skelett ohne Retargeting.

**Annahmen, die getestet werden müssen:**
- **Objektiv:** Tele (85–135 mm, Kamera weit weg), damit die echte Perspektive der fast orthografischen Projektion der Strichfigur nahekommt.
- **Licht:** gleichmäßig und weich.
- **Kleidung:** eng anliegend, matt, in klar abgestuften Farben (Oberteil, Leggings, Matte, Boden), damit Gliedmaßen getrennt bleiben. Kein Schwarz auf Schwarz, keine glänzenden Stoffe.
- **Haare:** ein enger geflochtener Zopf. Ein hoher Pferdeschwanz stört in Rückenlage und verdeckt den Nacken.
- **Raum:** keine Spiegel, keine zweite Person.

### A3 Vorgehen [Annahme]

1. **Ausgangsbild** in A-Pose von vorn, viele Kandidaten erzeugen und einen auswählen.
2. **Einzelansichten** aus dem Ausgangsbild ableiten: vorn, Profil, hinten, 3/4, erhöht. Je Ansicht ein eigenes Vollbild. Ein Charakterblatt dient nur als Konsistenzanker, denn jede Ansicht darauf hat weniger Auflösung.
3. **Startposen je Übungsgruppe** (Stand, Rückenlage, Bauchlage, Seitlage, Vierfüßler, Stütz, Sitz) in der Kameraansicht der jeweiligen Übung. Als Posenvorlage dient das erste Bild der Tri-Coach-Bewegung, gerendert als graue Puppe („match the pose of image N“). Dann passen Referenzbild und erstes Bild des Steuervideos zusammen, wie Kling es verlangt und wie es der Ausrichtung bei Wan entgegenkommt.
4. **Prüfung durch Menschen** je Bild: Hände, Füße, Kleidung, keine Logos.

### A4 Prompt-Vorschlag (Englisch)

**Ausgangsbild:**
> Photorealistic full-body studio photograph of an original, fictional adult woman (not based on any real person or celebrity), about 30 years old, working as a fitness coach. Friendly, encouraging expression with a warm, natural closed-mouth smile; approachable and motivating. Fit, healthy, natural athletic build with average, realistic body proportions (not elongated, not exaggerated). Light skin with natural texture, light natural makeup. Blonde hair in one tight French braid down the back, no loose strands, face, ears and neck fully visible. Modest, form-fitting, unbranded, matte athletic wear: cobalt-blue long-sleeve crew-neck training top that fully covers the midriff, dark charcoal full-length leggings, plain white training shoes with lime-green laces, lime-green hair tie. No logos, no text, no prints, no jewelry, no watch. Pose: neutral A-pose, standing upright facing the camera, feet hip-width apart, arms relaxed about 20 degrees away from the body, palms forward, fingers relaxed and slightly apart, both hands and both feet fully visible, generous margin around the whole body. Setting: bright, minimal fitness studio, seamless very light cool-grey background and matte light-grey floor, a slate-grey exercise mat beside her, nothing else in the scene. Lighting: soft, even, diffuse frontal light, low contrast, no hard shadows, no colored light. Camera: chest height, telephoto 105 mm from a distance, minimal perspective distortion, everything in sharp focus, 4:3 landscape. Style: sporty and matter-of-fact, like a physiotherapy or fitness-education photo, not a fashion, glamour or beauty shoot.
> Avoid: suggestive or sexualized posing, cleavage, sports bra only, crop top, shorts, sheer, shiny or wet clothing, emphasis on body parts, low camera angle, glamour or rim lighting, heavy makeup, resemblance to any celebrity or real person, logos, brand marks, text, watermarks, mirrors, other people, objects in her hands.

Die „Avoid“-Zeile als Fließtext übernehmen, nicht als negativen Prompt: Gemini arbeitet mit natürlicher Sprache [Annahme, auch für FLUX].

**Einzelansichten:**
> Using the woman in image 1 as the only identity reference, create a single full-body photo of the exact same person, same outfit, same braid, same lighting and background, standing in a neutral A-pose, seen in exact left profile (90°), telephoto, 4:3. Keep face, hair, body proportions and clothing identical. No text.

Für die anderen Ansichten „profile“ durch „back view“, „three-quarter 45°“ oder „camera elevated 35° looking down“ ersetzen.

**Startpose:**
> Same woman and outfit as images 1–3. Reproduce exactly the body pose of the grey mannequin in image 4 (lying on her back on the slate-grey mat, knees bent, feet flat), camera at 70° from the front and 15° from above, telephoto, whole body and both hands visible, same studio and lighting, 4:3.

### A5 Keine Ähnlichkeit mit realen Personen, Herkunft dokumentieren

**Vorgehen [Einordnung bzw. Annahme, aus der Rechtsprechung abgeleitet]:**
- Keine Namen oder „looks like …“ im Prompt.
- Keine Fotos realer Personen als Eingabe. Die BFL-AGB verbieten das ohne Einwilligung, §6(j).
- Viele Startwerte durchprobieren und ein unauffälliges Gesicht wählen.
- Rückwärts-Bildersuche (Google Lens, Bing, TinEye) mit Bildschirmfotos samt Datum. Sie findet allerdings eher Kopien als Doppelgänger.
- Dazu ein kleiner Test mit 3–5 Personen: „Erinnert sie dich an jemand Bekannten?“. Das bildet den BGH-Maßstab ab, ob ein „nicht unerheblicher Teil des Publikums“ die reale Person zu sehen glaubt (siehe B5).
- Gesichtssuchmaschinen wie PimEyes würde ich nicht nutzen. Sie gelten als datenschutzrechtlich umstritten [Annahme, nicht recherchiert].

**Dokumentation:** eine Datei `public/trainerin/HERKUNFT.md` im Remotion-Repository, nach dem Vorbild von `public/footage/QUELLEN.md:1-5`. Inhalt:
- Modell, Version, Anbieter, Datum, Prompt, Startwert und Parameter.
- Alle Kandidaten und die Begründung der Auswahl.
- Ergebnisse der Ähnlichkeitsprüfung.
- Die damals geltenden AGB als PDF. Die AGB ändern sich: BFL zuletzt am 04.08.2026, Google am 28.04.2026.
- SHA-256 jedes Bildes und Videos, das C2PA-Manifest des Anbieters (geprüft mit c2patool).
- Bei Videos zusätzlich Hash bzw. Version der Tri-Coach-Bewegung, Workflow, Modell, und wer wann freigegeben hat.

Der Verhaltenskodex verlangt solche internen Abläufe samt Dokumentation von seinen Unterzeichnern (Abschnitt 2, Measure 2.1, [PDF](https://ec.europa.eu/newsroom/dae/redirection/document/129555)).

---

## B) Recht und Pflichten (DE/EU)

### B1 AI Act, Art. 50: Einordnung

**Was gilt [belegt]:**
- **Definition:** Ein „deep fake“ ist „AI-generated or manipulated image, audio or video content that resembles existing persons, objects, places, entities or events and would falsely appear to a person to be authentic or truthful“ ([Art. 3(60)](https://artificialintelligenceact.eu/article/3/)).
- **Pflicht des Betreibers (Art. 50(4)):** Wer Deepfakes erzeugt und verwendet, „shall disclose that the content has been artificially generated or manipulated“.
- **Form (Art. 50(5)):** „clear and distinguishable … at the latest at the time of the first interaction or exposure“, barrierefrei ([Art. 50](https://artificialintelligenceact.eu/article/50/)).

**Leitlinien der Kommission C(2026) 5054 final vom 20.07.2026** ([PDF](https://ec.europa.eu/newsroom/dae/redirection/document/131215), [Übersicht](https://digital-strategy.ec.europa.eu/en/library/guidelines-transparency-obligations-providers-and-deployers-ai-systems)):
- **Rn. 113 (Personen):** Es genügt, wenn Personen jemandem ähneln, der „can plausibly exist“. „Persons“ umfasst ausdrücklich „realistic AI-generated human avatars or personas“. Ausgenommen ist nur Unrealistisches, etwa Drachen.
- **Rn. 114 (Fotorealismus):** Hoher Fotorealismus macht einen Deepfake wahrscheinlicher. Vollständig KI-erzeugte Darsteller wirken nach der Kommission „likely“ auf die Wahrnehmung des Publikums.
- **Einordnung für Tri-Coach:** Ein fotorealistisches Video einer „Trainerin“ wirkt wie gefilmt, ist also Deepfake. **„Erkennbar fiktiv“ ist sie erst durch die Kennzeichnung**, nicht von sich aus.
- **Abgeschwächte Regel für Fiktion greift nicht (Rn. 120, 122):**
  - Kreativ ist nicht, was „mainly motivated by functional or technical considerations“ entstanden ist.
  - Rein informative oder kommerzielle Inhalte sind ausgeschlossen.
  - Bei gemischtem Charakter überwiegt der informative.
  - Beispiele für „nicht fiktiv“: simulierte Teleshopping-Menschen und eine „realistic synthetic influencer“ ([Gleiss Lutz](https://www.gleisslutz.com/en/know-how/ai-transparency-advertising-european-commissions-guidelines-ai-act)).
  - Einordnung: Übungsvideos fallen damit unter die volle Kennzeichnung, auf der Werbeseite erst recht.
- **Wer ist Betreiber (Rn. 12, 19):** wer über den Einsatz des Systems und den Umgang mit den Ausgaben entscheidet, also der Tri-Coach-Betreiber. Ausgenommen ist nur rein private, nicht berufliche Nutzung; schon regelmäßige Einnahmen zählen als beruflich.
  - Einordnung: Mit dem geplanten Livegang samt Preisen ist das beruflich. Ein rein privates Add-on im eigenen Haushalt wäre ausgenommen, ich würde trotzdem kennzeichnen.
- **Wann Tri-Coach zusätzlich Anbieter ist (Rn. 11, 15):** Wer ein generatives System im eigenen Haus aufbaut und für eigene Zwecke einsetzt, ist Anbieter und Betreiber zugleich. Dann gilt auch die Pflicht zur maschinenlesbaren Markierung aus Art. 50(2). Die Ausnahme für Open Source gilt für Art. 50 nicht (Rn. 23).
  - Einordnung: Läuft Wan-Animate in einer eigenen Pipeline, ist Tri-Coach vermutlich Anbieter. Bei Kling, Runway oder Veo über deren Dienst markiert deren Anbieter.
- **Anbieter-Markierung reicht nicht (Rn. 117):** Betreiber „cannot rely on the machine-readable marking embedded … by the provider“.
- **Zeitpunkt (Rn. 143):** am Anfang jedes Videos, bei jeder neuen Person, die es sieht.
- **Fristen:** Art. 50 gilt seit 02.08.2026. Der KI-Omnibus (Amtsblatt 24.07.2026, in Kraft seit 27.07.2026) gewährt eine Übergangsfrist nur für die Markierung nach Art. 50(2) bei Altsystemen, bis 02.12.2026 (Rn. 153; [Lewis Silkin](https://www.lewissilkin.com/en/insights/2026/07/27/the-digital-omnibus-on-ai-enters-into-force-today-102nedo)).
- **Bußgeld (Rn. 152):** bis 15 Mio. EUR oder 3 % des Umsatzes; bei KMU gilt der niedrigere Wert.
- **Aufsicht in Deutschland:** die Bundesnetzagentur nach dem KI-MIG, in Kraft seit 29.07.2026. Das stammt aus Suchergebnissen; die Primärquelle [gesetze-im-internet.de](https://www.gesetze-im-internet.de/ki-mig/BJNR0DF0B0026.html) lieferte 503.
- **Strichfigur:** braucht keine Kennzeichnung, weil sie nicht realistisch ist (Rn. 113, Einordnung).

**Verhaltenskodex vom 10.06.2026** (freiwillig, die Prüfung auf Angemessenheit läuft; [Kommission](https://digital-strategy.ec.europa.eu/en/news/commission-publishes-code-practice-marking-and-labelling-ai-generated-content), [PDF](https://ec.europa.eu/newsroom/dae/redirection/document/129555)), Abschnitt 2:
- **Measure 1.1:** Das Symbol trägt „AI“ auf Englisch, außer nationales Sprachrecht steht entgegen.
- **Measure 1.2.1:** sofort erkennbar, ohne Zutun des Nutzers, eingebettet in den Inhalt oder als gleichwertige Einblendung der Oberfläche.
- **Measure 1.2.2:** im Video zum Beispiel „in the top right corner“, am Anfang und möglichst in Abständen, erwünscht durchgehend.
- **Measure 2.3:** Unterzeichner sollen einen Meldeweg für fehlende Kennzeichnung anbieten.
- **EU-Symbol:** frei nutzbar, in den Varianten Basic, „Fully AI-Generated“ und „Partially AI-Modified“. Es soll auch beim Teilen oder Herunterladen sichtbar bleiben ([EU-Symbole](https://digital-strategy.ec.europa.eu/en/policies/eu-icons-labelling-ai-generated-content)).

### B2 Nutzungsrechte nach Anbieter-AGB

| Anbieter | Rechte an den Ausgaben | Zu beachten |
|---|---|---|
| Google Gemini API | „Google won't claim ownership“ [belegt] | ähnliche Ausgaben für andere möglich; für Nutzer in EWR, UK und Schweiz nur bezahlte Dienste; im kostenlosen Dienst werden Daten zum Training genutzt ([AGB, Stand 28.04.2026](https://ai.google.dev/gemini-api/terms)) |
| OpenAI | „we hereby assign to you all our right … if any, in and to Output“ [belegt per Suchauszug; die Seite lieferte 403] | Ausgaben nicht einzigartig; für die API gelten die Business Terms, nicht gelesen ([AGB](https://openai.com/policies/terms-of-use/)) |
| BFL (API) | „you own all right, title, and interest in and to Output“, kommerzielle Nutzung erlaubt [belegt] | Deepfakes realer Personen nur mit schriftlicher Einwilligung; Content Credentials nicht entfernen, §6(i); EU-Nutzer haben eigene [EU-AGB](https://bfl.ai/legal/eu-developer-terms-of-service), nicht gelesen ([Developer Terms vom 04.08.2026](https://bfl.ai/legal/developer-terms-of-service)) |
| FLUX [dev], selbst betrieben | Ausgaben auch kommerziell nutzbar | das Modell selbst nur nicht kommerziell; Ausgaben nicht zum Training konkurrierender Modelle ([Lizenz v2.0](https://bfl.ai/legal/non-commercial-license-terms)) |
| Wan2.2 (Apache-2.0) | keine Ansprüche auf generierte Inhalte; der Nutzer ist „fully accountable“ [belegt] | ([README](https://github.com/Wan-Video/Wan2.2)) |
| Kling, Runway | kommerziell nur in bezahlten Tarifen | nur Drittquellen, vor Nutzung prüfen ([Kling](https://conductatlas.com/platform/kling-ai/kling-ai-terms-of-service/), [Runway](https://terms.law/ai-output-rights/runway/)) |

### B3 Urheberrecht an den Ausgaben

- **AG München, Urteil vom 13.02.2026 (142 C 9786/25):** KI-Logos sind nicht geschützt, auch nicht bei detaillierten Prompts. Der menschliche Einfluss muss die maschinelle Leistung „zwingend überwiegen“ ([beyer.law](https://www.beyer.law/2026/03/20/urheberrecht-bei-ki-logos-amtsgericht-muenchen-verneint-schutz-trotz-detaillierter-prompts/)).
- **OLG Düsseldorf, Beschluss vom 02.04.2026 (I-20 W 2/26):** Ein Werk liegt nur vor, wenn sich die Persönlichkeit des Promptenden im Ergebnis zeigt. Wer Schutz beansprucht, muss seine Gestaltungsentscheidungen darlegen ([beyer.law](https://www.beyer.law/2026/04/20/olg-duesseldorf-keine-urheberrechtsverletzung-durch-ki-generiertes-bild/)).
- **Folge [Einordnung]:** Video und Figur sind voraussichtlich nicht geschützt, Dritte dürften sie kopieren. Ob der Laufbildschutz nach § 95 UrhG greift, ist offen; Rechtsprechung habe ich nicht gefunden ([Haufe](https://www.haufe.de/id/beitrag/2-urheberrecht-6-filmbildwerke-HI15189335.html)). Schutzfähig bleiben eher die menschlichen Anteile: Bewegungsdaten, Schnitt, Software [Annahme].

### B4 Persönlichkeitsrecht

- **Doppelgänger als Bildnis:** Die Darstellung eines Doppelgängers kann ein Bildnis der echten Person nach § 22 KUG sein. Werbung damit ist dann nur mit Einwilligung zulässig (BGH, 01.12.1999, I ZR 226/97 „Der blaue Engel“, [NJW 2000, 2201](https://lorenz.userweb.mwn.de/urteile/njw00_2201.htm); Lizenz 70.000 EUR nach OLG München).
- **Maßstab:** Es genügt, wenn ein „nicht unerheblicher Teil des angesprochenen Publikums“ die reale Person zu sehen glaubt (BGH, 24.02.2022, I ZR 2/21 „Tina Turner“, [LTO](https://www.lto.de/recht/nachrichten/n/bgh-i-zr2-21-werbung-tribute-show-tina-turner)).
- **KI-Montagen:** fallen ebenfalls unter das Recht am eigenen Bild (OLG Frankfurt, 16.06.2026, 16 U 21/26, [beck-aktuell](https://www.beck-aktuell.de/heute-im-recht/rechtsprechung/olg-frankfurt-16u2126-ki-satire-recht-eigenes-bild-kug-2026-07-08)).
- **DSGVO:** greift nur bei einer identifizierbaren lebenden Person (Leitlinien Rn. 127).
- **Folge [Einordnung]:** Bei einer wirklich erfundenen Figur gibt es keinen Rechteinhaber. Das Restrisiko „ungewollter Doppelgänger“ deckt der Ähnlichkeitstest aus A5 ab. Bei einer Beschwerde: Video zurückziehen und neu erzeugen.

### B5 Konkrete Kennzeichnung in Tri-Coach

1. **Im Video selbst:** das EU-Symbol in der Variante „Fully AI-Generated“ (bzw. Basic) oben rechts, über die ganze Schleife, in Remotion eingebrannt. Oben rechts ist frei, denn der Abspielknopf sitzt unten rechts (`fachlich.css:681-684`).
2. **In der Oberfläche:** In der 96×72-Vorschau ist ein eingebranntes Symbol unlesbar. Deshalb ein Abzeichen „AI“ in der Vorschau (`UebungenAbschnitt.tsx:129`, `LaufAbcAbschnitt.tsx:183`) und auf der Bühne (`UebungenAbschnitt.tsx:252`). Barrierefreie Beschriftung: „KI-generiertes Video einer fiktiven Trainerin“.
3. **Text in der App** neben der Herkunftszeile (`UebungenAbschnitt.tsx:353-354`): „KI-generiertes Video. Die Trainerin ist eine erfundene Person. Die Bewegung stammt aus der geprüften Tri-Coach-Bibliothek.“
   - Zusätzlich ein Abschnitt „KI-generierte Inhalte“ in `frontend/src/marketing/Rechtliches.tsx` mit den eingesetzten Modellen und einem Meldeweg für fehlende Kennzeichnung.
   - Dieser Abschnitt allein genügt nicht: Hinweise nur in Anleitung oder AGB reichen nicht (Leitlinien Rn. 142).
   - Die Werbeseite kennzeichnet genauso.
4. **Maschinenlesbar (C2PA):**
   - **Erst kodieren, dann signieren.** `scripts/ausliefern.sh:32-35` kodiert per ffmpeg neu und wirft das C2PA-Manifest des Anbieters dabei vermutlich weg [Annahme].
   - Ein eigenes Manifest mit `c2pa.created` und `digitalSourceType` = `trainedAlgorithmicMedia` ([IPTC](https://metawatch.iptc.org/dst/)); die Originaldatei des Anbieters als Zutat (Ingredient), damit seine Kette erhalten bleibt.
   - **WebM unterstützt das C2PA-SDK nicht**, nur MP4, MOV und AVI ([c2pa-rs](https://github.com/contentauth/c2pa-rs/blob/main/docs/supported-formats.md)). Also nur MP4 kennzeichnen, für WebM eine Begleitdatei `.c2pa`, oder AV1 im MP4-Container [Annahme zur Browserunterstützung].
   - **Zertifikat:** Ein Zertifikat von der C2PA-Vertrauensliste setzt seit 2026 das Konformitätsprogramm voraus ([CAI](https://opensource.contentauthenticity.org/docs/conformance/), [SSL.com](https://www.ssl.com/article/free-c2pa-claim-signing-certificates-why-ssl-is-giving-away-trust/)). Für Tri-Coach realistisch ist daher ein eigenes, nicht gelistetes Zertifikat. Für den Betreiber ist das freiwillig.
5. **Nur wenn Tri-Coach selbst Anbieter ist (eigene Wan-Pipeline):** signierte Metadaten plus ein unsichtbares Wasserzeichen nach dem Kodex (Abschnitt 1, Sub-measure 1.1.1/1.1.2), zum Beispiel [Video Seal (MIT)](https://github.com/facebookresearch/videoseal). Maßstab ist das „technically feasible“.

---

## Offen bzw. zu prüfen

- OpenAI Business Terms, BFL-EU-AGB, Kling- und Runway-AGB im Original.
- Ob die Kommission den Kodex als angemessen bewertet.
- Der Gesetzestext des KI-MIG.
- Vergleichstest der Bildmodelle für liegende Posen und Hände.
- Ob Wan-Animate ohne eigenes Retargeting mit Skeletten aus dem Tri-Coach-Körpermodell auskommt. Das Gesichtsvideo fehlt dort, es entsteht also vermutlich keine Mimik [Annahme].
- Keine Rechtsberatung: Vor dem bezahlten Livegang sollte eine Anwältin die Einordnung als Anbieter oder Betreiber und den Text in `Rechtliches.tsx` prüfen.

Lokale Kopien der Leitlinien und des Kodex (PDF und Text) liegen unter `/tmp/claude-0/-home-user/bf8cf066-c69c-54cc-8f0b-85da01f0d936/scratchpad/dl/` (`leitlinien.*`, `kodex.*`).