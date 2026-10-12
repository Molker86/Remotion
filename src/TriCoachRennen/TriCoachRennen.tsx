import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { AbsoluteFill, Composition, useVideoConfig } from "remotion";
import { diagonal } from "./diagonal";
import type { Rennwerte } from "./Einblendung";
import { FARBE, type Format } from "./marke";
import { Szene } from "./Szene";

const zwei = (n: number) => String(n).padStart(2, "0");
const pace = (sekunden: number) =>
  `${Math.floor(sekunden / 60)}:${zwei(Math.round(sekunden) % 60)}`;

// Die Rennwerte des gezeichneten Rennens, das dieses Video ablöst — auf eine
// Kurzdistanz gebracht, damit Strecke, Tempo und Zwischenzeit zusammenpassen.
// Beim Einblenden läuft das Tempo hoch und die Pace herunter: schneller werden.
const RAD: Rennwerte = {
  groesse: "Tempo",
  wert: (t, a) => (a * (41.6 + 0.4 * Math.sin(t * 1.3))).toFixed(1).replace(".", ","),
  einheit: "km/h",
  zweit: "312 W · 94 U/min · km 27,8",
  split: 40 * 60 + 5,
};
const LAUF: Rennwerte = {
  groesse: "Pace",
  wert: (t, a) => pace(300 - (300 - 218) * a + a * Math.round(Math.sin(t * 0.9))),
  einheit: "/km",
  zweit: "km 7,4 · 186 Schritte/min",
  split: 26 * 60 + 53,
};
const SCHWIMMEN: Rennwerte = {
  groesse: "Pace",
  wert: (t, a) => pace(120 - (120 - 74) * a + a * Math.round(Math.sin(t * 0.9))),
  einheit: "/100 m",
  zweit: "1.150 m · Kraul · 34 Züge/min",
  split: 14 * 60 + 11,
};

type Props = {
  readonly format: Format;
};

/**
 * Hintergrund der Tri-Coach-Anmeldung: Rad, Lauf und Schwimmen nacheinander,
 * je knapp sieben Sekunden samt Übergang, ohne Ton, als Schleife von 18
 * Sekunden. Zwei Formate: hoch für die Markenhälfte am Schreibtisch, quer
 * für das Band über dem Formular am Telefon.
 *
 * Die Schleife schließt, weil der letzte Übergang nicht ins Leere geht,
 * sondern in den Anfang der ersten Szene: „Rad (Anschluss)" zeigt genau die
 * Frames, die vor Frame 0 von „Rad" liegen. Das letzte Bild des Videos ist
 * damit das Bild unmittelbar vor dem ersten.
 *
 * Jede Szene ist samt beider Übergänge 204 Frames lang. Länge der Schleife:
 * 180 + 204 + 204 + 24 − 3 × 24 = 540 Frames.
 */
export const TriCoachRennen: React.FC<Props> = ({ format }) => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: FARBE.ink }}>
      <TransitionSeries name="Rennen">
        <TransitionSeries.Sequence name="Rad" durationInFrames={180} premountFor={fps}>
          <Szene
            format={format}
            datei="footage/rad.mp4"
            trimBefore={24}
            playbackRate={1}
            fokus={{ hoch: "50% 50%", band: "50% 50%" }}
            index={1}
            werte={RAD}
            zoom={{ von: 1, bis: 1.08, ursprung: { hoch: "50% 60%", band: "45% 60%" } }}
            versatz={24}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={diagonal()}
          timing={linearTiming({ durationInFrames: 24 })}
        />
        <TransitionSeries.Sequence name="Lauf" durationInFrames={204} premountFor={fps}>
          <Szene
            format={format}
            datei="footage/lauf.mp4"
            trimBefore={0}
            playbackRate={1}
            fokus={{ hoch: "50% 50%", band: "50% 50%" }}
            index={2}
            werte={LAUF}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={diagonal()}
          timing={linearTiming({ durationInFrames: 24 })}
        />
        <TransitionSeries.Sequence name="Schwimmen" durationInFrames={204} premountFor={fps}>
          <Szene
            format={format}
            datei="footage/schwimmen.mp4"
            trimBefore={0}
            playbackRate={1}
            fokus={{ hoch: "60% 50%", band: "50% 50%" }}
            index={0}
            werte={SCHWIMMEN}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={diagonal()}
          timing={linearTiming({ durationInFrames: 24 })}
        />
        {/* Gleiche Datei, Fokus und Kamerafahrt wie „Rad" — nur 24 Frames früher. */}
        <TransitionSeries.Sequence name="Rad (Anschluss)" durationInFrames={24} premountFor={fps}>
          <Szene
            format={format}
            datei="footage/rad.mp4"
            trimBefore={0}
            playbackRate={1}
            fokus={{ hoch: "50% 50%", band: "50% 50%" }}
            index={1}
            werte={RAD}
            zoom={{ von: 1, bis: 1.08, ursprung: { hoch: "50% 60%", band: "45% 60%" } }}
          />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

export const TriCoachRennenKomposition: React.FC = () => {
  return (
    <>
      <Composition
        id="TriCoachRennen"
        component={TriCoachRennen}
        durationInFrames={540}
        fps={30}
        width={1080}
        height={1350}
        defaultProps={{ format: "hoch" as const }}
      />
      <Composition
        id="TriCoachRennenBand"
        component={TriCoachRennen}
        durationInFrames={540}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ format: "band" as const }}
      />
    </>
  );
};
