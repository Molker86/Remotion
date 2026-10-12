# Remotion – Videos mit Claude erstellen

Remotion-Projekt, vorbereitet damit Claude Code (lokal oder im Web) Videos mit React erstellen und rendern kann.

## Schnellstart

```console
npm install
npm run dev                              # Studio-Vorschau
npx remotion render MyComp out/video.mp4 # Video rendern
```

## Was ist eingerichtet?

- **Remotion 4** mit TypeScript, ESLint und Prettier (Gerüst aus `create-video --blank`)
- **Beispielkomposition** `MyComp` in `src/Composition.tsx`
- **Remotion Agent Skills** in `.claude/skills/` (installiert via `npx skills add remotion-dev/skills`, Stand in `skills-lock.json`; aktualisieren mit `npx remotion upgrade`)
- **SessionStart-Hook** (`.claude/hooks/session-start.sh`), der in Claude-Code-Web-Sessions automatisch `npm install` ausführt
- **Browser-Fallback** in `remotion.config.ts` für Sandboxes ohne Internetzugang zum Chrome-Download
- **CLAUDE.md** mit Arbeitsanweisungen für Claude

Beispiel-Prompt an Claude: *„Erstelle ein 10-sekündiges Intro-Video für meinen Kanal mit animiertem Logo-Text und rendere es als MP4."*

## Lizenz

Remotion ist für Einzelpersonen und Teams bis 3 Personen kostenlos; Firmen benötigen ggf. eine Lizenz – siehe [Lizenzbedingungen](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md).
