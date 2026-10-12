import { Video } from "@remotion/media";
import { AbsoluteFill, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Einblendung, SZENE_FRAMES, type Rennwerte } from "./Einblendung";
import { FARBE, type Format } from "./marke";

type Props = {
  readonly format: Format;
  readonly datei: string;
  /** Erster Quellframe der Sequenz, in Frames der Komposition. */
  readonly trimBefore: number;
  readonly playbackRate: number;
  /** Bildausschnitt wie `object-position`, je Format — der Mensch gehört in die Mitte. */
  readonly fokus: Readonly<Record<Format, string>>;
  /** 0 Schwimmen, 1 Rad, 2 Lauf. */
  readonly index: 0 | 1 | 2;
  readonly werte: Rennwerte;
  /**
   * Frames vom Beginn der Überblendung in diese Szene bis zum Beginn ihrer
   * Sequenz. Null, wo die Sequenz mit der Überblendung beginnt. Beim Rad
   * liegt die Überblendung in „Rad (Anschluss)" am Ende der Schleife, seine
   * Sequenz beginnt also 24 Frames später.
   */
  readonly versatz?: number;
};

export const Szene: React.FC<Props> = ({
  format,
  datei,
  trimBefore,
  playbackRate,
  fokus,
  index,
  werte,
  versatz = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Eine Uhr für alles in der Szene, gleich in welcher Sequenz sie gerade läuft:
  // So laufen Heranfahren und Einblendung über die Nahtstelle der Schleife.
  const zeit = frame + versatz;

  return (
    <AbsoluteFill style={{ backgroundColor: FARBE.ink, overflow: "hidden" }}>
      <Video
        src={staticFile(datei)}
        trimBefore={trimBefore}
        playbackRate={playbackRate}
        muted
        premountFor={fps}
        objectFit="cover"
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          objectPosition: fokus[format],
          filter: "saturate(0.86) contrast(1.1) brightness(0.88)",
          // Langsames Heranfahren: Bewegung auch dort, wo die Kamera steht.
          scale: interpolate(zeit, [0, SZENE_FRAMES], [1.1, 1.02]),
        }}
      />
      {/* Kühle Grundstimmung der Markenfläche: Tinte über allem, Blau von oben rechts. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(55% 60% at 78% 8%, rgb(${FARBE.blauRgb} / 0.34), transparent 70%), rgb(${FARBE.inkRgb} / 0.24)`,
          mixBlendMode: "multiply",
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(40% 45% at 8% 92%, rgb(${FARBE.voltRgb} / 0.1), transparent 70%)`,
          mixBlendMode: "screen",
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(120% 95% at 50% 45%, transparent 55%, rgb(${FARBE.inkRgb} / 0.6) 100%)`,
        }}
      />
      <Einblendung format={format} index={index} zeit={zeit} werte={werte} />
    </AbsoluteFill>
  );
};
