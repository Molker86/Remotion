# Remotion-Videoprojekt

Dieses Repository ist ein [Remotion](https://www.remotion.dev)-Projekt: Videos werden als React-Komponenten geschrieben und mit Chrome Headless + FFmpeg gerendert.

## Struktur

- `src/index.ts` – Einstiegspunkt (`registerRoot`)
- `src/Root.tsx` – registriert alle `<Composition>`s
- `src/Composition.tsx` – Beispielkomposition `MyComp` (1280×720, 30 fps, 3 s)
- `public/` – Assets (Bilder, Audio, Video), einbinden mit `staticFile("datei.png")`
- `out/` – Render-Ausgabe (von Git ignoriert)
- `.claude/skills/remotion-*` – offizielle Remotion Agent Skills (Best Practices, Render, Captions, Maps …)

## Befehle

```bash
npm install                                         # Abhängigkeiten (passiert in Cloud-Sessions automatisch per SessionStart-Hook)
npm run dev                                         # Remotion Studio (Vorschau)
npx remotion render <CompId> out/<name>.mp4         # Video rendern
npx remotion still <CompId> out/<name>.png --frame=30   # Einzelbild rendern
npm run lint                                        # ESLint + TypeScript prüfen
```

## Arbeitsweise für Claude

1. Vor dem Schreiben von Remotion-Code den passenden Skill laden (`remotion-best-practices` als Einstieg, `remotion-markup` für Animationen/Layouts, `remotion-render` fürs Exportieren).
2. Animationen ausschließlich über `useCurrentFrame()`, `interpolate()`, `spring()` – keine CSS-Transitions/-Animationen.
3. Neue Kompositionen in `src/Root.tsx` registrieren.
4. Ergebnis prüfen: `npm run lint`, dann einige Einzelbilder mit `npx remotion still` rendern und ansehen, danach das Video rendern und mit `ffprobe` kontrollieren.
5. Fertige Videos dem Nutzer bereitstellen (z. B. per Datei-Versand); `out/` wird nicht committet.

## Hinweise zur Cloud-Umgebung

- Remotion kann seinen eigenen Chrome Headless Shell in der Sandbox nicht herunterladen. `remotion.config.ts` verwendet deshalb automatisch den vorinstallierten Playwright-Headless-Shell unter `/opt/pw-browsers` (oder `REMOTION_BROWSER_EXECUTABLE`, falls gesetzt).
- Die Config gilt nur für die CLI. Bei Nutzung von `@remotion/renderer` (Node-API) muss `browserExecutable` explizit übergeben werden.
- Google Fonts / externe URLs sind je nach Netzwerkrichtlinie evtl. nicht erreichbar – lokale Fonts/Assets in `public/` bevorzugen.

## Komposition `TriCoachRennen` (Hintergrund der Tri-Coach-Anmeldung)

Rad, Lauf und Schwimmen als Schleife von 18 s, ohne Ton, im Stil einer
Sportübertragung: Titel, Rennwerte, Fortschritt Schwimmen | Rad | Lauf,
diagonale Übergänge in Volt. Farben und Schriften sind die der App
(`marke.ts`, Schriften unter `public/fonts/`).

- Zwei Formate aus einer Komponente: `TriCoachRennen` (1080×1350, Markenhälfte
  am Schreibtisch) und `TriCoachRennenBand` (1920×1080, Band über dem
  Formular am Telefon). Die Einblendungen stehen kompakt oben rechts, wo die
  App nichts darüberlegt — oben links steht ihr Logo, darunter Überschrift und
  Vorteile, unten rechts ihr Pause-Knopf. Der breite rechte Rand ist Absicht:
  Die App beschneidet das Video mit `object-fit: cover` (Maße und Gründe in
  `Einblendung.tsx`, `MASS`).
- Die Schleife ist nahtlos: „Rad (Anschluss)" zeigt die Frames vor dem Anfang
  von „Rad". Wer Längen ändert, rechnet die Summe im Kommentar nach.
- Filmmaterial: `scripts/footage-laden.sh` (Pexels, siehe
  `public/footage/QUELLEN.md`); die Clips stehen nicht im Repository.
- Ausliefern an Tri-Coach (`frontend/src/auth/rennen/`):

```bash
npx remotion render TriCoachRennen out/rennen-hoch-master.mp4 --scale=0.8 --crf=12 --muted
npx remotion render TriCoachRennenBand out/rennen-band-master.mp4 --crf=12 --muted   # volle Größe: --scale=2/3 ergibt 720,00004 und bricht ab
scripts/ausliefern.sh ../Tri-Coach/frontend/src/auth/rennen   # MP4, WebM (AV1) und Standbild je Format
```

## Werkstatt für Übungsvideos (in Arbeit)

Fotorealistische Übungsvideos für Tri-Coach: Eine Video-KI überträgt die
gelösten Posen der Tri-Coach-Bibliothek auf eine fiktive Trainerin. Stand,
Entscheidungen, nächste Schritte und Prototypen stehen in
[`werkstatt/UEBERGABE.md`](werkstatt/UEBERGABE.md) — dort zuerst lesen.
`werkstatt/` erwartet `../Tri-Coach` als Nachbar-Checkout und ist vom Lint
ausgenommen.
