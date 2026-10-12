import { AbsoluteFill, Easing, interpolate, useVideoConfig } from "remotion";
import { FARBE, SCHRIFT, type Format } from "./marke";

/** Triathlonreihenfolge, wie sie die Fortschrittsleiste zeigt. */
const DISZIPLINEN = ["Schwimmen", "Rad", "Lauf"] as const;

/** Sichtbare Länge einer Szene samt beider Überblendungen, in Frames. */
export const SZENE_FRAMES = 204;

export type Rennwerte = {
  /** Steht über dem Wert, z. B. „Tempo". */
  readonly groesse: string;
  /** Der Wert zur Zeit `t` (Sekunden), `anteil` zählt beim Einblenden von 0 auf 1. */
  readonly wert: (t: number, anteil: number) => string;
  readonly einheit: string;
  readonly zweit: string;
  /** Zwischenzeit der Disziplin beim Einblenden, in Sekunden. */
  readonly split: number;
};

type Props = {
  readonly format: Format;
  /** 0 Schwimmen, 1 Rad, 2 Lauf. */
  readonly index: 0 | 1 | 2;
  /** Zeit der Szene in Frames ab Beginn ihrer Überblendung. */
  readonly zeit: number;
  readonly werte: Rennwerte;
};

const uhr = (s: number) => {
  const ganz = Math.floor(s);
  const h = Math.floor(ganz / 3600);
  const m = Math.floor((ganz % 3600) / 60);
  const sek = ganz % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(sek).padStart(2, "0")}`;
};

const raus = Easing.bezier(0.16, 1, 0.3, 1);
const rein = Easing.bezier(0.7, 0, 0.84, 0);

/**
 * Die Einblendung einer Disziplin wie bei einer Übertragung: Fortschritt im
 * Rennen, Titel, Rennwerte. Kommt nach der Überblendung herein und geht vor
 * der nächsten — so überdeckt keine Einblendung die andere.
 */
export const Einblendung: React.FC<Props> = ({ format, index, zeit, werte }) => {
  const { fps } = useVideoConfig();
  const hoch = format === "hoch";
  const ein = interpolate(zeit, [12, 36], [0, 1], {
    easing: raus,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const aus = interpolate(zeit, [164, 180], [0, 1], {
    easing: rein,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const zaehlt = interpolate(zeit, [16, 56], [0, 1], {
    easing: Easing.bezier(0.22, 1, 0.36, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const sichtbar = ein * (1 - aus);
  const t = zeit / fps;
  const titel = DISZIPLINEN[index].toUpperCase();

  // Maße in Pixeln des jeweiligen Formats; das Band wird am Telefon auf ein
  // Viertel verkleinert und braucht deshalb größere Schrift.
  const rand = hoch ? 80 : 120;
  const leiste = hoch ? 172 : 210;

  const fortschritt = (
    <div
      style={{
        position: "absolute",
        top: hoch ? 104 : 96,
        right: rand,
        display: "flex",
        gap: hoch ? 12 : 14,
        opacity: interpolate(zeit, [0, 16], [0.4, 1], { extrapolateRight: "clamp" }),
      }}
    >
      {DISZIPLINEN.map((name, i) => {
        const fuellung = i < index ? 1 : i > index ? 0 : interpolate(zeit, [0, SZENE_FRAMES], [0, 1]);
        return (
          <div key={name} style={{ width: leiste }}>
            <div
              style={{
                fontFamily: SCHRIFT.anzeige,
                fontWeight: 700,
                fontStretch: "80%",
                fontSize: hoch ? 19 : 24,
                letterSpacing: "0.1em",
                color: i === index ? FARBE.volt : `rgb(${FARBE.hellRgb} / 0.6)`,
                marginBottom: 10,
                whiteSpace: "nowrap",
              }}
            >
              {String(i + 1).padStart(2, "0")} {name.toUpperCase()}
            </div>
            <div
              style={{
                height: hoch ? 6 : 7,
                borderRadius: 999,
                background: `rgb(${FARBE.hellRgb} / 0.22)`,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${fuellung * 100}%`,
                  background: i === index ? FARBE.volt : FARBE.hell,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );

  // Der Titel wird von rechts nach links aufgezogen und schräg wieder eingezogen.
  const titelBlock = (
    <div
      style={{
        position: "absolute",
        // Rechts oben in beiden Formaten: Links oben steht in der App das
        // Logo, rechts unten der Pause-Knopf, und die Athleten laufen und
        // fahren links oder in der Mitte. Im Band so tief, dass ein flaches
        // Band (es zeigt nur die mittleren 60 %) den Titel noch trägt.
        top: hoch ? 190 : 280,
        right: rand,
        alignItems: "flex-end",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: hoch ? 22 : 28 }}>
        <div
          style={{
            width: hoch ? 16 : 20,
            height: hoch ? 104 : 136,
            background: FARBE.volt,
            transform: `skewX(-14deg) scaleY(${sichtbar})`,
          }}
        />
        <div
          style={{
            fontFamily: SCHRIFT.anzeige,
            fontStyle: "italic",
            fontWeight: 900,
            fontStretch: "72%",
            fontSize: hoch ? 132 : 172,
            lineHeight: 0.9,
            letterSpacing: "-0.01em",
            color: FARBE.hell,
            textShadow: `0 6px 40px rgb(${FARBE.inkRgb} / 0.55)`,
            clipPath: `inset(-20% ${(1 - ein) * 100}% -20% ${aus * 100}%)`,
            translate: `${(1 - ein) * 60 - aus * 60}px 0`,
          }}
        >
          {titel}
        </div>
      </div>
      {!hoch && (
        <div
          style={{
            marginTop: 22,
            display: "flex",
            alignItems: "baseline",
            gap: 16,
            fontFamily: SCHRIFT.anzeige,
            fontWeight: 800,
            fontStretch: "78%",
            color: FARBE.hell,
            opacity: sichtbar,
            translate: `0 ${(1 - ein) * 24}px`,
            textShadow: `0 4px 30px rgb(${FARBE.inkRgb} / 0.6)`,
          }}
        >
          <span style={{ fontSize: 112, fontVariantNumeric: "tabular-nums" }}>
            {werte.wert(t, zaehlt)}
          </span>
          <span style={{ fontSize: 48, color: FARBE.volt }}>{werte.einheit}</span>
        </div>
      )}
    </div>
  );

  // Die Rennwerte als Karte unten rechts, über dem Pause-Knopf der App.
  const karte = hoch && (
    <div
      style={{
        position: "absolute",
        right: rand,
        bottom: 170,
        width: 470,
        padding: "26px 34px 30px",
        background: `linear-gradient(135deg, rgb(${FARBE.inkRgb} / 0.78), rgb(${FARBE.inkRgb} / 0.5))`,
        borderTop: `5px solid ${FARBE.volt}`,
        clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 34px), calc(100% - 34px) 100%, 0 100%)",
        opacity: sichtbar,
        translate: `0 ${(1 - ein) * 40 + aus * 20}px`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: SCHRIFT.anzeige,
          fontWeight: 700,
          fontStretch: "80%",
          fontSize: 22,
          letterSpacing: "0.14em",
        }}
      >
        <span style={{ color: FARBE.volt }}>{werte.groesse.toUpperCase()}</span>
        <span style={{ color: FARBE.gedaempft, fontVariantNumeric: "tabular-nums" }}>
          SPLIT {uhr(werte.split + t)}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 14,
          marginTop: 8,
          fontFamily: SCHRIFT.anzeige,
          fontWeight: 800,
          fontStretch: "78%",
          color: FARBE.hell,
        }}
      >
        <span style={{ fontSize: 96, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
          {werte.wert(t, zaehlt)}
        </span>
        <span style={{ fontSize: 40, color: FARBE.gedaempft }}>{werte.einheit}</span>
      </div>
      <div
        style={{
          marginTop: 12,
          fontFamily: SCHRIFT.text,
          fontWeight: 500,
          fontSize: 26,
          color: `rgb(${FARBE.hellRgb} / 0.72)`,
        }}
      >
        {werte.zweit}
      </div>
    </div>
  );

  return (
    <AbsoluteFill>
      {!hoch && (
        // Am Telefon fehlt der Schleier der Schreibtischfassung; die Schrift
        // braucht dort ihren eigenen Grund.
        <AbsoluteFill
          style={{
            background: `linear-gradient(270deg, rgb(${FARBE.inkRgb} / 0.6), transparent 60%)`,
          }}
        />
      )}
      {fortschritt}
      {titelBlock}
      {karte}
    </AbsoluteFill>
  );
};
