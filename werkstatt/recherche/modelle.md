# Posegesteuerte Video-KI für eine fiktive Trainerin: Stand Oktober 2026

Kennzeichnung: **[B]** ist mit Quelle belegt, **[A]** ist eigene Annahme oder Schlussfolgerung. Preise sind Listenpreise der jeweiligen Seite und ändern sich oft.

## 0. Was unser Datenbestand mitbringt

- **Lagen der Übungen [B, eigene Auszählung].** Ich habe `/home/user/Tri-Coach/backend/app/animation/bibliothek/bibliothek.json` (59 Übungen) nach der Haltung im Ablauf ausgezählt:

  | Haltung | Anzahl |
  |---|---|
  | Rückenlage | 11 |
  | Bauchlage, Vierfüßlerstand oder Stütz | 12 |
  | Seitlage | 6 |
  | Sitz oder Knien | 9 |
  | Stehend | 21 |

  Am Boden spielen also 38 von 59 Übungen. Von den stehenden sind etwa 10 Lauf-ABC-Drills mit Flugphase. Sieben Übungen haben Requisiten (Wand, Kasten; die Faszienrolle ist als `kasten` modelliert).
- **Kamera [B].** Vorgabe ist `gieren` 70, `neigen` 15 (`/home/user/Tri-Coach/backend/app/animation/format.py:46-51`). Liegende Übungen stehen meist bei etwa 66°, Seitlagen bei etwa 12°.
- **Die Bewegung ist schon eine Schleife [B].** Schlüsselbilder haben `halten_s` und `uebergang_s` (`format.py:91-110`). Ein Treibervideo kann so jede beliebige Zahl von Perioden lang sein.
- **3D-Gelenkpunkte ohne Schätzung [B].** `punkte()` in `koerper.py:214` und `frontend/src/animation/koerper.ts:159` liefert sie direkt. Dazu kommen Kapselsegmente mit Radien (`koerper.py:87-106`), also schon ein grobes Mannequin. Finger gibt es nicht: `hand→finger` ist ein einzelnes Segment, flache Hände im Stütz laufen über `handgelenk` (`docs/animationen.md:198-200`).

## 1. Die entscheidende Frage: Was akzeptiert ein Modell als Treiber?

Es gibt drei Gruppen.

**a) Nimmt eine gerenderte 3D-Pose: SCAIL (Preview).**
- Das Steuersignal sind 3D-Gliedmaßen als Zylinder (COCO-18-Topologie aus NLF-Gelenken), gerastert auf schwarzem Grund. Hände und Gesicht kommen als 2D-DWPose-Punkte darüber [B]: [Paper v1](https://arxiv.org/html/2512.05905v1), [`nlf_render.py`](https://raw.githubusercontent.com/zai-org/SCAIL-Pose/master/NLFPoseExtract/nlf_render.py), [`render_cylinder.py`](https://raw.githubusercontent.com/zai-org/SCAIL-Pose/master/render_3d/render_cylinder.py).
- Laut Paper behalten die Zylinder „occlusion and depth cues lost in 2D projection“ [B]. Für Seitansicht und Selbstverdeckung ist das der Kern.
- Eigene 3D-Quellen funktionieren: Ein Blender-Rig ist seit 01.03.2026 offiziell kompatibel [B]: [Repo](https://github.com/zai-org/SCAIL), [Issue #30](https://github.com/zai-org/SCAIL/issues/30).
- Folgerung [A]: Wir können genau dieses Format aus `punkte()` rendern. Dann gibt es **keinen Posenschätzer, der an liegenden Posen scheitert**. Posenschätzer gelten bei verdeckten und komplexen Posen als fehleranfällig ([MotionAnimate](https://www.sciencedirect.com/science/article/abs/pii/S1566253525006311)) [B].

**b) Nimmt ein 2D-Skelett (DWPose/OpenPose).** Das sind UniAnimate-DiT, MimicMotion, Wan 2.2 Animate (v1), VACE und SteadyDancer.
- Das Skelett lässt sich ebenfalls direkt aus unseren Punkten zeichnen [A]. Die Tiefe geht dabei verloren [B, SCAIL-Paper].
- Wan 2.2 Animate v1 braucht zusätzlich Gesichtsausschnitte des Treibers ([Wan2.2-Repo/Diffusers](https://github.com/Wan-Video/Wan2.2), [ComfyUI-Knoten](https://comfy.icu/node/PoseAndFaceDetection)) [B]. Ein Strichmännchen hat kein Gesicht [A].

**c) Ende-zu-Ende, nimmt rohes Video.** Das sind Wan-Animate-2, SCAIL-2 (Modus e2e), Kling Motion Control, DreamActor-M2, Seedance 2.0 und Luma Ray3 Modify.
- Wan-Animate-2 „directly consumes the driving video“ ([arXiv 2608.06009](https://arxiv.org/abs/2608.06009)) [B].
- Kling empfiehlt echte Menschen, „certain stylized humanoid characters … are also recognized“ ([Kling-Leitfaden](https://kling.ai/quickstart/motion-control-user-guide)) [B]. Laut Klings Technical Report enthalten die Trainingsdaten „rendering data“, und die Übertragung „realistic-to-cartoon“ wird gezeigt ([arXiv 2603.03160](https://arxiv.org/html/2603.03160)) [B].
- SCAIL-2 verträgt einen **Mesh-Render (SAM3D-Body) als Steuerung zero-shot** und erreicht damit die besten SSIM- und LPIPS-Werte seiner Tabelle 3 ([arXiv 2606.10804](https://arxiv.org/html/2606.10804v3)) [B].
- Folgerung [A]: Für diese Gruppe braucht es einen **schattierten Mannequin-Render** aus unseren Kapseln, mit Kopf, neutraler Kleidungsfarbe, Matte und Requisiten. Ein Strichmännchen wird hier vermutlich als Figur mitkopiert oder nicht erkannt. Einen Test dazu habe ich **nicht** gefunden.

## 2. Die Kandidaten

### Wan-Animate-2 (Alibaba, offene Gewichte)
- **Stand [B]:** Erschienen am 07.08.2026, Lizenz Apache 2.0 ([Hugging Face](https://huggingface.co/Wan-AI/Wan2.2-Animate-2-14B)).
- **Eingaben [B]:** Referenzbild und rohes Treibervideo. Die Kamera lässt sich per Text vom Treiber lösen, Clips lassen sich verlängern. Laut ComfyUI-Blog ist die Identität stabiler als beim Vorgänger ([ComfyUI-Blog](https://blog.comfy.org/p/wan-animate-2-is-now-available-in)).
- **Lite-Variante [B]:** Echtzeit bei 24 fps und 400×720 ([OSFY](https://www.opensourceforu.com/2026/08/alibaba-open-sources-wan-animate-2/)). Dort steht auch, Blindstudien sähen das Modell gleichauf mit oder vor Kling MotionControl, ohne Zahlen.
- **Selbstbetrieb [B]:** Die Vorgaben sind auf 8× A800 für 720p abgestimmt, 480p wurde auf 2× A800 getestet. VRAM für eine einzelne GPU ist nicht angegeben.
- **API [B]:** [WaveSpeed](https://wavespeed.ai/models/wavespeed-ai/wan-2.2/animate-2) nimmt 0,04 $/s (480p) bzw. 0,08 $/s (720p) bei 30 fps, Treiber bis 120 s, etwa 109 s je Auftrag. Der Hintergrund des Referenzbilds wird ignoriert, den Hintergrund legt der Prompt fest.

### Wan 2.2 Animate (v1)
- **Steuerung [B]:** Posen- und Gesichtsvideo aus ViTPose, Lizenz Apache 2.0.
- **Preise [B]:** [fal](https://fal.ai/models/fal-ai/wan/v2.2-14b/animate/move) nimmt 0,08 $ je 16 Bilder bei 720p. Ein Treiber mit 30 fps kostet dort also fast das Doppelte. [Alibaba Model Studio](https://www.alibabacloud.com/help/en/model-studio/wan2-2-animate-move) nimmt international 0,12 $ (Standard) bzw. 0,18 $ (Pro) je Sekunde.
- **Qualität [B]:** In Studio-Bench schlechter als SCAIL. In der SCAIL-2-Übersicht steht in jeder Fähigkeitsspalte „△“.

### SCAIL (Preview, 14B) und SCAIL-2 (Tsinghua/Z.ai)
- **SCAIL (Preview) [B]:**
  - Basis Wan2.1-I2V-14B, trainiert unter 512p. Code Apache-2.0, Gewichte laut Hugging Face MIT ([HF](https://huggingface.co/zai-org/SCAIL-Preview)).
  - Läuft in ComfyUI nativ und über Kijais WanVideoWrapper, dazu GGUF und WanGP für wenig VRAM.
  - Kosten: 380,78 s und 68,5 GB für 81 Bilder bei 512×896 mit 20 Schritten ([Paper v3](https://arxiv.org/html/2512.05905v3)). Welche GPU, habe ich nicht gefunden; H100 oder A100 mit 80 GB ist Annahme [A].
  - Studio-Bench, Kreuzidentität: Bewegungsgenauigkeit 53,3 % gegen 35,0 % bei Wan-Animate, Identität 45,8 % gegen 20,0 %. UniAnimate-DiT liegt bei Bewegungsgenauigkeit und Identität je 1,7 %.
  - fal-Preis: 0,08 $/s ([fal](https://fal.ai/models/fal-ai/scail)). Ob fal einen fertigen Posen-Render annimmt, ist nicht belegt [A: eher nicht].
- **SCAIL-2 [B]:**
  - Erschienen am 09.06.2026. Treiber als e2e-Video oder `--pose` als gerendertes Video, mehrere Referenzbilder experimentell. Ein DPO-Schritt verringert verzerrte Hände ([GitHub](https://github.com/zai-org/SCAIL-2)).
  - Die Lizenz der Gewichte ist uneinheitlich angegeben.
  - [fal](https://fal.ai/models/fal-ai/scail-2/llms.txt): 0,20 $/s, höchstens 10 s, immer 16 fps, 512p oder 704p.
  - Laut [Dreamerland](https://docs.dreamerland.ai/video/wan2.2-video/character-animation/wan-animate-vs-scail2) ist „Rollen am Boden“ eine Stärke von SCAIL-2. Das ist ein Anbietervergleich.

### Kling 3.0 Motion Control (Kuaishou, geschlossen)
- **Eingaben [B]:** Bild und Video von 3–30 s. Bei Ausrichtung „image“ höchstens 10 s, Ausgabe 720p (Std) oder 1080p (Pro) bei 30 fps ([Vercel](https://vercel.com/ai-gateway/models/kling-v3.0-motion-control/api)).
- **Preis [B]:** [fal](https://fal.ai/kling-motion-control) nimmt Pro 0,168 $/s, Std 0,126 $/s, v2.6 Std 0,07 $/s. fal schreibt ausdrücklich, dass kommerzielle Nutzung erlaubt ist.
- **Identität [B]:** Elemente mit Frontalbild und weiteren Referenzbildern ([Siray](https://blog.siray.ai/kling-3-motion-control/)). Die Bindung greift nur, wenn die Ausrichtung zum Video passt.
- **Grenzen [B]:**
  - Ganzer Körper sichtbar, keine Schnitte, ruhige Kamera, keine sehr schnelle Bewegung.
  - Bei komplexer Bewegung kann die Ausgabe kürzer ausfallen, **ohne Erstattung** ([Kling-Leitfaden](https://kling.ai/quickstart/motion-control-user-guide)).
  - Bei schnellen Armbewegungen verschwimmen die Handkanten ([Wiro-Test](https://wiro.ai/blog/kling-v3-motion-control-motion-transfer-in-3-tests/)).
- **Eigene Nutzerstudie [B, vom Hersteller selbst]:** Gesamturteil 4,00 gegen Wan-Animate, 16,25 gegen Runway Act-Two, 3,44 gegen Dreamina.
- **Nutzungsbedingungen [B]:** Kling nimmt sich eine weitreichende Lizenz an den Inhalten ([Zusammenfassung](https://conductatlas.com/platform/kling-ai/kling-ai-terms-of-service/)). Das ist kein Originaltext.

### Weitere Kandidaten

| Modell | Kernaussagen | Eignung |
|---|---|---|
| Runway Act-Two | 5 Credits/s, also etwa 0,05 $/s ([Runway-Preise](https://docs.dev.runwayml.com/guides/pricing/)), bis 30 s, auf Gesicht und Gesten ausgelegt [B]. Klar schwächer in Klings Studie [B] | ungeeignet [A] |
| DreamActor-M2/v2 (ByteDance) | e2e, bis 30 s, „real people … supported“ ([fal-Doku](https://fal.ai/docs/model-api-reference/video-generation-api/bytedance-dreamactor.md)), etwa 0,05 $/s ([each::labs](https://www.eachlabs.ai/bytedance/dreamactor/bytedance-dreamactor-v2)) [B] | Ersatzkandidat [A] |
| UniAnimate-DiT | Wan2.1 mit LoRA, 480p mit ~23 GB, 720p mit ~36 GB; 5 s auf A800 ≈ 3 min (480p) bzw. 13 min (720p). „Intended for academic research“ ([GitHub](https://github.com/ali-vilab/UniAnimate-DiT)) [B] | ungeeignet (Lizenz) |
| MimicMotion | SVD-Basis, 576×1024, 72 Bilder, 16 GB VRAM; 35 s brauchen etwa 20 min auf einer 4090 ([GitHub](https://github.com/Tencent/MimicMotion)) [B]. Code Apache-2.0, für die SVD-Gewichte gilt vermutlich die Stability Community License (frei unter 1 Mio. $ Umsatz, [stability.ai](https://stability.ai/license)) [A, zu prüfen] | veraltet |
| SteadyDancer | Wan2.1-I2V, **das Referenzbild ist exakt das erste Bild** ([arXiv](https://arxiv.org/abs/2511.19320)) [B]; Lizenz ungeprüft | interessant für Startpose und Schleife [A] |
| Seedance 2.0 | Nimmt Referenzvideo für Bewegung [B]. **Blockt realistische Gesichter in Referenzen, auch KI-erzeugte** ([apiyi](https://docs.apiyi.com/en/faq/seedance2-asset-face-reference), [Adobe](https://community.adobe.com/questions-404/reference-content-can-t-include-real-human-faces-when-using-seedance-2-0-and-seedance-2-0-fast-1631867)) [B] | ungeeignet |
| Veo 3.1 | Bis 3 Referenzbilder, kein Treibervideo ([Google](https://developers.googleblog.com/en/introducing-veo-3-1-and-new-creative-controls-in-the-gemini-api)) [B] | ungeeignet für genaue Form |
| Vidu Q3, Hailuo | Referenz für Identität; eine eigene Ganzkörper-Bewegungsübertragung habe ich nicht offiziell belegt gefunden | – |
| Luma Ray3 Modify | Video-zu-Video, Darbietung bleibt erhalten, Charakterreferenz, **Start- und Endbild** ([TechCrunch](https://techcrunch.com/2025/12/18/luma-releases-a-new-ai-model-that-lets-users-generate-a-video-from-a-start-and-end-frame)) [B]; Preis für Bearbeitungen unklar | Joker für Schleifen [A] |
| Neu im Sep./Okt. 2026 | Nichts Einschlägiges gefunden. Wan 3.0 (Aug. 2026) ist nur per API und kein Animationsmodell ([Atlas](https://www.atlascloud.ai/blog/tips/is-wan-3.0-open-source)) [B] | – |

## 3. Qualität für unseren Fall

- **Kein einziger Benchmark und kein unabhängiger Test für Rücken-, Bauch- oder Seitlage, Vierfüßler, Stütz oder Schneidersitz.** Das gilt für alle Modelle [B: Fehlanzeige in allen Suchen]. Das muss ein eigener Pilot klären.
- **Indizien [B]:**
  - SCAIL nennt „turning, rolling, flipping“ als schwierige Bewegungen und hat Turnen im Training.
  - Wan-Animate kommt bei „limbs crossing“ und 3D-Drehungen durcheinander (Dreamerland).
  - Kling verlangt einen vollständig sichtbaren Körper und gleichen Bildausschnitt bei Bild und Video ([Replicate](https://replicate.com/kwaivgi/kling-v3-motion-control)).
- **Hände [B]:** SCAIL lässt Hände für später offen. SCAIL-2 korrigiert sie per DPO. Bei Kling verschwimmen sie in schneller Bewegung. Unser Modell hat keine Finger, also erfindet die KI die Hände [A]. Im Stütz ist das riskant.
- **Sprünge im Lauf-ABC [A]:**
  - Kling rät von schneller Bewegung ab und kürzt im Zweifel [B].
  - SCAIL und SCAIL-2 liefern 16 fps [B]. Für schnelle Drills sind dann Zwischenbilder (RIFE o. ä.) nötig [A].
  - SCAIL bewertet „hovering in midair“ als Fehler [B]. Eine Neigung gegen Flugphasen ist möglich [A].
- **Seitliche Kamera [B]:** Klings Ausrichtung „video“ übernimmt die Kamera des Treibers, Wan-Animate-2 kann sie per Text ändern.

## 4. Schleife, Identität, Hintergrund

**Schleife.**
- Bei Kling, Wan-Animate-2 und SCAIL ist keine Konditionierung „erstes = letztes Bild“ dokumentiert [B: Fehlanzeige].
- Vorschlag [A]: Treiber mit ½ Periode Vorlauf, 1 Periode, ½ Periode Nachlauf. Die mittlere Periode ausschneiden und in einer `halten_s`-Phase mit 6–8 Bildern überblenden.
- Bleibt eine sichtbare Naht, gibt es Werkzeuge: Wan2.1 VACE First-Last-Frame ([Comfy](https://comfy.org/workflows/video_wan_vace_flf2v-45c0ce6bcf2e/)) und den Loop-Modus von VACE Prep ([RunComfy](https://www.runcomfy.com/comfyui-nodes/ComfyUI-Wan-VACE-Prep)) [B]. Dass sich das mit Posensteuerung kombinieren lässt, ist ungetestet [A].

**Identität über 59 Clips.**
- Ein Master-Referenzbild (ganzer Körper, Studio, Sportkleidung) plus Seitenansichten aus demselben Bildmodell, fester Prompt, fester Seed [A].
- Bei Kling als Element hinterlegen [B]. Für selbst betriebene Wan-Modelle ein Charakter-LoRA ([RunComfy-Leitfaden](https://www.runcomfy.com/trainer/ai-toolkit/wan-2-2-i2v-character-consistency-lora)) [B für Wan 2.2 I2V; A für SCAIL].
- Je Übung ein Referenzbild in der Startpose per Bildbearbeitung, damit der Bildausschnitt passt [A].

**Hintergrund.**
- Wird per Prompt gesetzt, der Hintergrund des Referenzbilds wird ignoriert (WaveSpeed, Kling) [B].
- Matte und Requisiten gehören auch in den Treiber-Render, damit Bodenkontakte gesehen werden [A].
- Kein Modell liefert Alpha [A]. Ein neutrales Studio-Grau passt zu Hell und Dunkel.

**Kennzeichnung.**
- Die Transparenzpflichten nach Art. 50 der EU-KI-Verordnung gelten seit 02.08.2026 ([Goodwin](https://www.goodwinlaw.com/en/insights/publications/2026/08/alerts-technology-dpc-eu-ai-act-transparency-obligations-now-in-force)) [B].
- Eine fiktive Person ist vermutlich kein Deepfake im Sinne der Verordnung [A]. Ein Hinweis „KI-generiert“ im Dialog kostet trotzdem nichts.

## 5. Empfehlung

**Zuerst ein Pilot mit 8 Härtefällen:** glute-bridge, superman, bird-dog, push-up, side-plank, clamshell, butterfly-stretch, a-skip. Beide Treiber werden in Remotion aus `koerper.ts` gerendert [A]: (1) Zylinder im SCAIL-Format, (2) schattiertes Mannequin.

1. **Versuch 1a: Kling 3.0 Motion Control Pro über fal, Treiber Mannequin.**
   - Dafür spricht: die beste dokumentierte Ausführungsqualität (eigene Studie gegen Wan-Animate und Act-Two), Identitäts-Elemente, 1080p bei 30 fps, kommerzielle Nutzung bei fal, keine eigene Infrastruktur.
   - Risiko: Ein Mannequin als Treiber ist nicht offiziell unterstützt. Bei Lauf-ABC kann gekürzt werden. Geschlossenes Modell.
2. **Versuch 1b: SCAIL (Preview 14B) selbst betrieben, Treiber eigener 3D-Zylinder-Render.**
   - Betrieb: ComfyUI mit WanVideoWrapper auf einer gemieteten 80-GB-GPU.
   - Dafür spricht: der einzige Weg, auf dem die gelöste Bewegung **ohne Posenschätzung** und mit Tiefe ankommt. Beste Studio-Bench-Werte, freie Lizenzen, Korrekturen reproduzierbar und billig.
   - Upgrade im selben Aufbau: SCAIL-2 im Modus `pose` mit Mesh-Render.
   - Risiko: unter 512p (Hochskalieren nötig), Hände, Einrichtungsaufwand.
3. **Rückfall: Wan-Animate-2** über WaveSpeed oder selbst betrieben, mit **demselben Mannequin-Treiber wie 1a**.
   - Apache 2.0, kein Anbieterzwang, etwa halb so teuer wie Kling, Kamera per Text.
   - Die Qualitätsbehauptung kommt nur vom Hersteller.

**Kosten:** 59 Clips × 6 s × 3 Versuche ergeben 1062 s; der Pilot kommt mit etwa 300 s dazu. Referenzbilder kosten einmalig unter 20 $ [A].

| Weg | Hauptlauf | mit Pilot |
|---|---|---|
| Kling 3.0 MC Pro (fal) | ≈ 178 $ | ≈ 230 $ |
| Kling 3.0 MC Std (fal) | ≈ 134 $ | ≈ 170 $ |
| Wan-Animate-2, 720p (WaveSpeed) | ≈ 85 $ | ≈ 110 $ |
| Wan-Animate-2, 480p (WaveSpeed) | ≈ 42 $ | – |
| SCAIL-2 (fal) | ≈ 212 $ | – |
| SCAIL selbst betrieben [A] | 177 Läufe × ~460–530 s ≈ 23–26 GPU-Stunden; H100 1,99–2,99 $/h ([Spheron](https://www.spheron.network/blog/runpod-h100-pricing-2026/)) ≈ 50–80 $ | ≈ 80–110 $ mit Einrichtung |

**Realistisch also etwa 100–250 $ an Erzeugungskosten**, ohne Arbeitszeit [A]. Ein Claude-Abo deckt davon nichts ab.

Es wurden keine Dateien in `/home/user/Tri-Coach` oder `/home/user/Remotion` geändert; ich habe dort nur gelesen.