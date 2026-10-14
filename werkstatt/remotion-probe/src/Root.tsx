import { Composition } from "remotion";
import { Steuervideo, metadaten, type SteuerProps } from "./Steuervideo";

export const Root: React.FC = () => (
  <Composition
    id="Steuervideo"
    component={Steuervideo}
    // Platzhalter; calculateMetadata setzt Länge und Bildrate je Übung.
    durationInFrames={1}
    fps={16}
    width={832}
    height={480}
    defaultProps={{ schluessel: "glute-bridge", wiederholungen: 1, zielFps: 16 } satisfies SteuerProps}
    calculateMetadata={metadaten}
  />
);
