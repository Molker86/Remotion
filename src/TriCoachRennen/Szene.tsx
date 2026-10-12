import { Video } from "@remotion/media";
import {
  AbsoluteFill,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// Die Farben aus Tri-Coach (frontend/src/styles/tokens.css): Das Video liegt
// dort auf der dunklen Markenfläche und soll nach ihr aussehen, nicht nach
// Stockmaterial.
const INK = "7 12 24";
const BLAU = "39 83 224";
const VOLT = "198 244 50";

type Props = {
  readonly datei: string;
  /** Erster Quellframe der Szene, in Frames der Komposition. */
  readonly trimBefore: number;
  readonly playbackRate: number;
  /** Bildausschnitt wie `object-position`, damit der Mensch in der Mitte steht. */
  readonly fokus: string;
  /**
   * Verschiebt die Zeit der Szene: Der Anschluss am Ende der Schleife ist
   * dieselbe Szene, nur `-Überblendung` Frames früher. So laufen Bild und
   * Zoom über die Nahtstelle hinweg weiter.
   */
  readonly versatz?: number;
};

export const Szene: React.FC<Props> = ({
  datei,
  trimBefore,
  playbackRate,
  fokus,
  versatz = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame + versatz;

  return (
    <AbsoluteFill style={{ backgroundColor: `rgb(${INK})`, overflow: "hidden" }}>
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
          objectPosition: fokus,
          filter: "saturate(0.88) contrast(1.08) brightness(0.9)",
          // Langsames Heranfahren: Bewegung auch dort, wo die Kamera steht.
          scale: interpolate(t, [0, 6.5 * fps], [1.1, 1.02], {
            extrapolateLeft: "extend",
            extrapolateRight: "extend",
          }),
        }}
      />
      {/* Kühle Grundstimmung der Markenfläche: Tinte über allem, Blau von oben rechts. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(55% 60% at 78% 8%, rgb(${BLAU} / 0.32), transparent 70%), rgb(${INK} / 0.22)`,
          mixBlendMode: "multiply",
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(40% 45% at 8% 92%, rgb(${VOLT} / 0.10), transparent 70%)`,
          mixBlendMode: "screen",
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(120% 95% at 50% 45%, transparent 55%, rgb(${INK} / 0.6) 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};
