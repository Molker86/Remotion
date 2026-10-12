import type {
  TransitionPresentation,
  TransitionPresentationComponentProps,
} from "@remotion/transitions";
import { AbsoluteFill, Easing, interpolate, useVideoConfig } from "remotion";
import { FARBE } from "./marke";

type Props = Record<string, never>;

/**
 * Ein schräger Schnitt wie bei einer Sportübertragung: Die neue Disziplin
 * schiebt sich von links über die alte, vorneweg ein Band in Volt und
 * Tempostriche. Die alte bleibt stehen und wird nur dunkler — so liegt
 * nie Schwarz zwischen zwei Szenen.
 */
const DiagonalPresentation: React.FC<TransitionPresentationComponentProps<Props>> = ({
  children,
  presentationDirection,
  presentationProgress,
}) => {
  const { width, height } = useVideoConfig();
  const p = interpolate(presentationProgress, [0, 1], [0, 1], {
    easing: Easing.bezier(0.76, 0, 0.24, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (presentationDirection === "exiting") {
    return (
      <AbsoluteFill>
        {children}
        <AbsoluteFill style={{ backgroundColor: FARBE.ink, opacity: p * 0.55 }} />
      </AbsoluteFill>
    );
  }

  // Die Kante läuft von ganz links außerhalb bis ganz rechts außerhalb; oben
  // steht sie um `schraege` weiter vorn als unten.
  const schraege = height * 0.38;
  const band = Math.max(width, height) * 0.045;
  const weg = width + schraege + band * 3;
  const unten = -schraege - band * 2 + p * weg;
  const oben = unten + schraege;
  const flaeche = (vorn: number, breite: number) =>
    `polygon(${oben + vorn - breite}px 0, ${oben + vorn}px 0, ${unten + vorn}px ${height}px, ${unten + vorn - breite}px ${height}px)`;

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          clipPath: `polygon(-10px 0, ${oben}px 0, ${unten}px ${height}px, -10px ${height}px)`,
        }}
      >
        {children}
      </AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: FARBE.volt, clipPath: flaeche(band, band) }} />
      <AbsoluteFill
        style={{
          backgroundColor: FARBE.hell,
          opacity: 0.85,
          clipPath: flaeche(band * 1.6, band * 0.18),
        }}
      />
      {[0.18, 0.34, 0.57, 0.71, 0.86].map((y, i) => {
        // Tempostriche an der Kante, jeder auf seiner Höhe etwas vor oder hinter ihr.
        const x = unten + schraege * (1 - y) + band * (1.4 + (i % 3) * 0.7);
        const laenge = width * (0.12 + (i % 2) * 0.1);
        return (
          <div
            key={y}
            style={{
              position: "absolute",
              left: x - laenge,
              top: y * height,
              width: laenge,
              height: Math.max(2, band * 0.06),
              borderRadius: 999,
              background: `linear-gradient(90deg, transparent, rgb(${i % 2 ? FARBE.hellRgb : FARBE.voltRgb} / 0.9))`,
              opacity: interpolate(p, [0, 0.15, 0.85, 1], [0, 1, 1, 0]),
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

export const diagonal = (): TransitionPresentation<Props> => ({
  component: DiagonalPresentation,
  props: {},
});
