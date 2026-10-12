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
