import {
  AbsoluteFill,
  CalculateMetadataFunction,
  Composition,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type Props = {
  title: string;
  subtitle: string;
};

const calculateMetadata: CalculateMetadataFunction<Props> = () => {
  return {};
};

export const MyComposition = () => {
  return (
    <Composition
      id="MyComp"
      component={MyComponent}
      durationInFrames={90}
      fps={30}
      width={1280}
      height={720}
      defaultProps={{
        title: "Hallo Remotion",
        subtitle: "Videos mit React, erstellt von Claude",
      }}
      calculateMetadata={calculateMetadata}
    />
  );
};

export const MyComponent: React.FC<Props> = ({ title, subtitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({ frame, fps, config: { damping: 200 } });
  const subtitleOpacity = interpolate(frame, [0.75 * fps, 1.5 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0b1020",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Helvetica, Arial, sans-serif",
        color: "white",
      }}
    >
      <div
        style={{ fontSize: 96, fontWeight: 700, transform: `scale(${scale})` }}
      >
        {title}
      </div>
      <div style={{ fontSize: 40, marginTop: 24, opacity: subtitleOpacity }}>
        {subtitle}
      </div>
    </AbsoluteFill>
  );
};
