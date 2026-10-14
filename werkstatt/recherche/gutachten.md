# Gutachten zu Variante B: Werkstatt gegen Integriert

Ich habe keine Dateien in Tri-Coach oder Remotion geändert. Kennzeichnung: **[B]** heißt im Code oder an der Quelle selbst nachgesehen, **[A]** heißt Annahme oder Schätzung.

## (1) Schwachstellen

### Beide Entwürfe und das Dossier

| # | Schweregrad | Schwachstelle | Beleg |
|---|---|---|---|
| S1 | **kritisch** | **Es lief kein einziger echter Generierungslauf.** Ob eine Puppe als Treiber funktioniert, ob liegende Posen, Hände und Bildgenauigkeit gelingen, ist alles ungetestet. Trotzdem bauen beide zuerst Infrastruktur: die Werkstatt 8–12 Personentage vor dem Pilot, Integriert lässt den Pilot erst über die fertige Pipeline laufen (25–30 Personentage). | Dossier „modelle“ §3: „kein einziger Benchmark … Fehlanzeige“; Integriert §4 „läuft schon über die integrierte Pipeline“ |
| S2 | **hoch** | **„Bildgenau gekoppelt [gemessen]“ ist falsch gekennzeichnet.** `tempo.py` lässt RTMW nur auf Puppen-Renderings mit künstlich verändertem Tempo laufen. Ein Videomodell war nie beteiligt. Die Werkstatt legt in Schritt 6 aber die Schnittbildnummer aus `soll.json` genau darauf fest. Für Ende-zu-Ende-Dienste gilt das ohnehin nicht: Kling sagt, das Ergebnis „may be shorter“, und erstattet nichts. | [B] `scratchpad/proto/tempo.py:1-30`; [B] [Kling-Leitfaden](https://kling.ai/quickstart/motion-control-user-guide) |
| S3 | **hoch** | **Unklar, welche Fassung die richtige ist.** Beide nehmen `bibliothek.json` als Wahrheit. Eine KI-Korrektur an einer Bibliotheksübung steht aber nur in der Datenbank auf dem Pi, und `einspielen()` überschreibt sie beim nächsten Neustart. Umgekehrt bleibt eine verworfene Bibliotheksübung **ohne** KI-Ersatz verworfen, weil `herkunft=bibliothek` mit gleicher `fassung` übersprungen wird. Beide Ereignistabellen („nach dem Neustart ist das Video wieder da“) stimmen also nur, wenn die KI inzwischen ersetzt hat. Die Doku behauptet etwas Drittes. **Das Rezept der Korrektur ist rückholbar:** Es steht in `KiJob.roh_antwort` (bis 200 000 Zeichen), gefunden über `UebungsAnimation.ki_job_id`, das `einspielen()` nicht zurücksetzt. Die Werkstatt hatte das als ungeprüft offen gelassen. | [B] `bibliothek.py:44-55`; `test_animation.py:212-219`; `docs/animationen.md:165-167`; `ki/runner.py:119,938`; `erzeugung.py:148-163` |
| S4 | **hoch** | **Jedes Konto darf freigeben und verwerfen.** Keine Rechteprüfung, und der Link „Animation verwerfen …“ steht auch an freigegebenen Animationen. Im öffentlichen Betrieb kann so jedes Konto das Video einer Bibliotheksübung für alle abschalten (bei der Werkstatt verlangt `videoFuer` den Zustand „freigegeben“). Die Werkstatt geht darauf nicht ein. Integriert schützt nur die KI-Übungen. | [B] `routers/animationen.py:115-144`; `is_staff` in keinem Router (grep); `UebungenAbschnitt.tsx:355-362` |
| S5 | **hoch** | **Die automatische Prüfung übersieht genau die Hauptrisiken.** Hände (die Soll-Punkte haben keine Handpunkte, das Modell kennt nur `hand→finger`), Gesicht und Identität, Anatomie bzw. Puppenkörper, Anzüglichkeit. Kalibriert ist sie nur an Puppen: liegend nur 78 % mit OKS > 0,75. Mit der Schwelle „10-%-Quantil ≥ 0,60“ werden liegende Clips eher fälschlich abgewiesen, und jede Abweisung ist ein bezahlter Neuversuch. | [B] Dossier `eval1.log`, `koerper.ts:191`; [A] Folge |
| S6 | **hoch** | **Anstand und Ruf.** „Hübsche blonde Frau“ trifft auf Kamerawinkel von hinten im Vierfüßler: fire-hydrant 160°, adductor-rock-back 150°, hip-cars 115°; dazu happy-baby-pose 72/22, donkey-kick, glute-bridge. Integriert sieht Ausnahmen für die Rückansicht nur wegen des Gesichts vor, die Werkstatt nur einen Abnahmepunkt. | [B] Kameratabelle im Dossier; [A] Risiko |
| S7 | mittel | **Das Gesicht ist zu klein, um zu motivieren.** Im Stand misst der Kopf 39–49 px bei 640×480, in der Liste 6–13 px. Videomodelle zeichnen kleine Gesichter schlecht. | [B] Dossier „tricoach“ §1; [A] Modellverhalten |
| S8 | mittel | **Die Workout-Bühne ist im Querformat nicht 4:3.** `width:100%` plus `aspect-ratio` plus `max-height:40vh` macht die Box breiter. Mit `object-fit: cover` (Werkstatt) wird oben und unten abgeschnitten: Das eingebrannte KI-Symbol oben rechts und Kopf oder Füße fehlen dann. | [B] `fachlich.css:772-779`; Werkstatt §3 `.uebungs-video` |
| S9 | mittel | **Das Dossier überzeichnet SCAIL.** „Blender-Rig seit 01.03.2026 offiziell kompatibel“ stimmt nicht: Issue #30 ist ein Community-Beitrag von toyxyz vom 03.03.2026, ein Mitwirkender hat ihn angepinnt, eine Zusage der Betreuer gibt es nicht. Immerhin ein Hinweis aus der Praxis, dass eigene Renders funktionieren. | [B] [SCAIL Issue #30](https://github.com/zai-org/SCAIL/issues/30) |
| S10 | mittel | **Die Identität driftet über die Zeit.** Eine Korrektur in sechs Monaten mit Kling 3.x sieht anders aus als die alten Clips daneben. Nur offene Gewichte mit festgehaltenem Stand (SCAIL/Wan plus `modelle.lock`) machen Korrekturen gleich aussehend. Die Werkstatt legt Masterbilder und Seeds „im Archiv, nicht in Git“ ab, ohne das Archiv zu benennen. Das ist das einzige Gut, das sich nicht wiederherstellen lässt. | [A]; Werkstatt §1 |
| S11 | mittel | **Kling-Bedingungen.** Elemente gibt es nur bei passender Ausrichtung; für eine Puppe als Treiber sagt Kling nur „stylized humanoid … can be recognized“; ein verkürztes Ergebnis wird nicht erstattet. | [B] [Kling-Leitfaden](https://kling.ai/quickstart/motion-control-user-guide) |
| S12 | mittel | **Keiner misst, ob Videos besser verstanden werden als die Figur.** Der Blindtest der Werkstatt (Zuordnung zu einer von vier Übungen) misst Wiedererkennen, nicht richtiges Ausführen, und hat keine Figur als Vergleich. Die App hat keine Telemetrie. | [B] grep ohne Treffer; Werkstatt §4 |
| S13 | niedrig | **Gemischte Bildsprache.** Video für die Bibliothek, Figur für KI-Übungen in derselben Liste; die Figur wirkt dann zweitklassig. Wer später für die andere Seite spiegelt (`scaleX(-1)`), spiegelt auch das eingebrannte „AI“. | [A] |

### Nur Werkstatt

- **W1, mittel: Rückruf dauert.** Zurückziehen geht nur über ein Release plus Neubau auf dem Pi (15–20 min) in jeder Installation. Für die eigene oder eine zentrale Installation reicht das, für verteilte Installationen nicht.
- **W2, niedrig: `soll.mts` läuft so nicht.** Eine wörtliche Kopie von `bewegung.ts` lädt in Node nicht, weil `'./koerper'` ohne Endung importiert wird (Dossier „remotion“ §2). Es braucht `sed` oder einen Bundler.
- **W3, niedrig: Hash und Umstempeln.** Ohne normierte Zahlen hängt der Hash an der Schreibweise in jsonb [A]. Das Umstempeln ist Handarbeit. Beides löst Integriert besser.
- **Entlastung:** Der Supervisor klont mit `--depth=1` (laut Forenlogs). Die Git-Historie wächst also nur im Entwicklungs-Repo, nicht auf dem Pi.
- **Hinweis:** Alles unter `assets/` wird ohne Anmeldung ausgeliefert (`frontend.py:91-96`). Bei öffentlichem Betrieb sind die Videos frei abrufbar, das eingebrannte Symbol ist also nötig.

### Nur Integriert

- **I1, kritisch: widerspricht der Grundentscheidung „zuerst die geprüfte Bibliothek“.** Eine feste, zentral geprüfte Menge würde in jeder Installation neu erzeugt, bezahlt und von einem lokalen Verwalter abgenommen. Aussehen und Qualität unterscheiden sich dann je Installation, der Entwickler kann nichts zusichern. Integriert räumt das in E1 selbst ein.
- **I2, hoch: Rechenlast im einzigen Uvicorn-Prozess.** Die Pipeline läuft dort als Thread (`run.sh:346`). Der Renderer ist eine Python-Schleife über Kugeln (`proto/puppe.py:98-140`) und hält den GIL, die App wird 5–10 min je Clip träge. Per `nice` ausgelagert ist nur ffmpeg.
- **I3, hoch: Ausgaben ohne Aufsicht.** Kostenpflichtige Aufrufe starten aus der Weckschleife jeder Installation, mit einem API-Schlüssel je Installation, Wiederholungsschleifen und Kling ohne Erstattung. Das Monatsbudget von 0 als Vorgabe dämpft das nur.
- **I4, mittel: Abbild und Netz.** Das Abbild wächst um 150–250 MB [A], ffmpeg und onnxruntime werden auf dem Pi gebaut. Die Modelle kommen zur Laufzeit aus dem Netz, und die RTMW-Gewichte, deren Lizenz ungeklärt ist, landen in jeder Installation.
- **I5, niedrig: Ungenauigkeiten.**
  - „Kein OpenCV“, aber der Prototyp benutzt `cv2` (`puppe.py:203`).
  - Der Sperrgrund „`ki_job_id` gesetzt“ ist ein veralteter Zustand, den niemand löscht (`bibliothek.py:48-55`). Er sperrt die Übung auf Dauer, auch nach einer Rezeptkorrektur.
  - Jedes Home-Assistant-Backup wächst um 11–25 MB.

### Die Rechtsgrundlage hält

Die Zitate zum Deepfake-Begriff habe ich gegen die lokale Kopie der Leitlinien geprüft: „can plausibly exist“ (Zeile 1576), „AI-generated human avatars or personas“ (1588), „functional or technical considerations“ (1750), Ausnahme nur für rein private Nutzung (Abschnitt 2.4.1). Die Einordnung als Deepfake mit Kennzeichnungspflicht hält [B].

## (2) Urteil und Synthese

**Urteil:** Für den ersten Schritt ist die **Werkstatt** klar besser. Sie passt zur Entscheidung (zentral, Remotion bleibt außerhalb des Add-ons), kostet zur Laufzeit nichts und braucht weder Migration noch Endpunkt; Cache, Byte-Bereiche und Rückfall gibt es schon. Integriert ist für eine feste Bibliothek die falsche Form. Aus Integriert gehören aber sechs Bausteine übernommen: der Verwalter-Riegel, normierte Zahlen im Hash, die automatische Gleichwertigkeitsprüfung, die kostenlose Vorprüfung, wiederaufnehmbares Einreichen und die getrennten Verwerfgründe. Beide springen zu früh in den Bau.

1. **Zuerst ein Versuch ohne Infrastruktur (1–2 Tage, höchstens etwa 30 $).** Aus `proto/puppe.py` eine Puppe und SCAIL-Zylinder rendern für glute-bridge, lateral-lunge und bird-dog. Ein Masterbild erzeugen und alles von Hand bei Kling Motion Control (fal) und Wan-Animate-2 (WaveSpeed) hochladen. Kein Code in Tri-Coach. Entscheiden nach: Ist es eine Frau? Ist es die richtige Übung? Sind die Hände brauchbar? Ist das Ergebnis bildgenau, gemessen per Kreuzkorrelation?
2. **Vor jedem Video die richtige Fassung herstellen.** KI-korrigierte Bibliotheksübungen aus `KiJob.roh_antwort` (über `ki_job_id`) als **angehängtes** Rezept nach `rezepte.json` übernehmen und nur diese neu lösen (`docs/animationen.md:108-115`). Den Widerspruch zwischen `einspielen()` und der Doku entscheiden. Danach a-march reparieren.
3. **Das Rechteloch schließen, unabhängig vom Video.** Freigeben und Verwerfen nur mit `is_staff`, dazu `freigegeben_von` (Idee aus Integriert).
4. **Ort ist die Werkstatt im Remotion-Repo.** Vorprüfung, Zeitplan, Prüfung und Gleichwertigkeit aus Integriert dort als Python-Module, nie im Add-on.
5. **Hash:** Felder wie in der Werkstatt (`ansicht`, `unterlage`, `requisiten`, `ablauf`), Zahlen auf feste Stellen normiert, dazu automatische Gleichwertigkeit per Vorwärtskinematik (≤ 1–1,5 cm). Ein Mensch bestätigt nur noch.
6. **Manifest und Abnahmeprotokoll um `figur_fassung`, Modellversion und `pipeline_fassung` erweitern.** Masterbilder, Seeds, Workflow und die Prüfsummen der Gewichte kommen in ein benanntes Archiv mit zweiter Kopie.
7. **Den Schnitt aus der gemessenen Phase legen** (Kreuzkorrelation Ist gegen Soll), nicht aus der Bildnummer. Periode und Kürzung je Clip prüfen.
8. **Die automatische Prüfung sortiert nur vor.** Pflichtpunkte für den Menschen: Hände, Gesicht, Anatomie, Anstand, Naht. Den Anstand beurteilt eine zweite Person.
9. **Kamera- und Anstandsregeln je Übung:** keine Rückansicht im Vierfüßler, happy-baby-pose und Ähnliches ausnehmen oder anders aufnehmen, Kleidung nach dem Prompt im Dossier. Genau einen solchen Fall in den Pilot nehmen.
10. **Erzeugen in mindestens 720p.** Ausliefern im Detail mit 960×720, in der Liste ein Standbild mit 288×216. Nur H.264, `object-fit: contain`.
11. **Kennzeichnung:** Das eingebrannte Symbol ist Beiwerk. Tragend ist ein KI-Abzeichen in der Oberfläche an Liste, Bühne und Workout. Dazu ein Abschnitt in `Rechtliches.tsx` mit Meldeweg; C2PA nach dem Kodieren ist optional.
12. **Frontend wie in der Werkstatt:** Vite-Assets, `videoFuer`, genau ein laufendes `<video>`, Schalter „Figur“ je Gerät. Aus Integriert `useUebungsDarstellung` übernehmen, das auf Änderungen von reduzierter Bewegung reagiert.
13. **In Wellen ausrollen:** erst die 12 stehenden Kraft- und Mobility-Übungen, Boden nur nach bestandenem Tor. Lauf-ABC erst nach dem a-march-Fix, Halteübungen auf eigenem Weg.
14. **Den Erfolg am Ausführen messen.** 5–6 Personen, je Übung Figur gegen Video, eine Fachperson bewertet die Ausführung. Gibt es keinen Unterschied, abbrechen, auch wenn die Videos schön sind.
15. **Den Rückruf festschreiben:** `--zurueckziehen` plus Release, mit Zielzeit für Beschwerden nach dem Persönlichkeitsrecht.

## (3) Die drei wichtigsten offenen Fragen

1. **Was heißt „erst nach KI-Korrekturen richtig“?**
   - Bibliotheksübungen, die du in der App verworfen und von Claude neu bekommen hast? Dann sind die Korrekturen nach jedem Neustart überschrieben und stehen nur noch in `KiJob.roh_antwort` deiner Pi-Datenbank.
   - Oder KI-Übungen außerhalb der Bibliothek?
   - Oder Korrekturen beim Schreiben der Bibliothek?
   - Und welche Übungen sind betroffen?
2. **Für wen sind die Videos?** Nur für deine Installation, für einen öffentlichen Server oder für fremde Add-on-Installationen? Davon hängen die Betreiberrolle nach dem AI Act, der Rückruf und die Remotion-Lizenz ab, und ob überhaupt etwas aus Integriert in Frage kommt.
3. **Reicht dir ein Teilerfolg, und wo liegt die Grenze?** Lohnt sich der Aufwand auch, wenn nur die etwa 12 stehenden Übungen ein Video bekommen und Boden und Stütz bei der Figur bleiben? Und wie viel Geld und Zeit darf es höchstens kosten? Daran hängt auch die Wahl nach dem Versuch: Kling (bequem, aber das Aussehen ist später nicht wiederholbar) oder SCAIL/Wan auf gemieteter GPU (wiederholbar, dann aber Anbieterpflichten nach Art. 50(2)).

Quellen:
- [Kling Motion Control User Guide](https://kling.ai/quickstart/motion-control-user-guide)
- [SCAIL Issue #30](https://github.com/zai-org/SCAIL/issues/30)
- [Wan-Animate-2 (Hugging Face)](https://huggingface.co/Wan-AI/Wan-Animate-2-14B)
- [OpenSourceForU zu Wan-Animate-2](https://www.opensourceforu.com/2026/08/alibaba-open-sources-wan-animate-2/)
- [HA-Forum, Supervisor-Klon mit depth=1](https://community.home-assistant.io/t/errors-fresh-install-x86-64/679636)
- Lokale Kopie der Leitlinien: `/tmp/claude-0/-home-user/bf8cf066-c69c-54cc-8f0b-85da01f0d936/scratchpad/dl/leitlinien.txt`