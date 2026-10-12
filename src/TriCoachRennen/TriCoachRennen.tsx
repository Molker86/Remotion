import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { AbsoluteFill, Composition, useVideoConfig } from "remotion";
import { Szene } from "./Szene";

/**
 * Hintergrund der Tri-Coach-Anmeldung: Rad, Lauf und Schwimmen nacheinander,
 * je sechs Sekunden, ohne Ton und als nahtlose Schleife von 18 Sekunden.
 *
 * Die Schleife schließt, weil die letzte Überblendung nicht ins Leere geht,
 * sondern in den Anfang der ersten Szene: „Rad (Anschluss)" zeigt genau die
 * Frames, die vor Frame 0 von „Rad" liegen. Das letzte Bild des Videos ist
 * damit das Bild unmittelbar vor dem ersten.
 *
 * Länge: 3 × 196 + 24 − 3 × 24 = 540 Frames.
 */
export const TriCoachRennen: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "#070c18" }}>
      <TransitionSeries name="Rennen">
        <TransitionSeries.Sequence name="Rad" durationInFrames={196} premountFor={fps}>
          <Szene
            datei="footage/rad.mp4"
            trimBefore={1 * fps}
            playbackRate={1}
            fokus="50% 50%"
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 24 })}
        />
        <TransitionSeries.Sequence name="Lauf" durationInFrames={196} premountFor={fps}>
          <Szene
            datei="footage/lauf.mp4"
            trimBefore={1 * fps}
            playbackRate={1}
            fokus="50% 50%"
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 24 })}
        />
        <TransitionSeries.Sequence name="Schwimmen" durationInFrames={196} premountFor={fps}>
          <Szene
            datei="footage/schwimmen.mp4"
            trimBefore={1 * fps}
            playbackRate={1}
            fokus="50% 50%"
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 24 })}
        />
        {/* Gleiche Datei, Rate und Fokus wie „Rad" — nur 24 Frames früher. */}
        <TransitionSeries.Sequence name="Rad (Anschluss)" durationInFrames={24} premountFor={fps}>
          <Szene
            datei="footage/rad.mp4"
            trimBefore={1 * fps - 24 * 1}
            playbackRate={1}
            fokus="50% 50%"
            versatz={-24}
          />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

export const TriCoachRennenKomposition: React.FC = () => {
  return (
    <Composition
      id="TriCoachRennen"
      component={TriCoachRennen}
      durationInFrames={540}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
