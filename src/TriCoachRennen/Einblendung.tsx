import { AbsoluteFill, Easing, interpolate, useVideoConfig } from "remotion";
import { FARBE, SCHRIFT, type Format } from "./marke";

/** Triathlonreihenfolge, wie sie die Fortschrittsleiste zeigt. */
const DISZIPLINEN = ["Schwimmen", "Rad", "Lauf"] as const;

/** Sichtbare Länge einer Szene samt beider Überblendungen, in Frames. */
export const SZENE_FRAMES = 204;

export type Rennwerte = {
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

/**
 * Maße in Pixeln des jeweiligen Formats. Alles steht oben rechts: Oben links
 * liegt in der App das Logo, darunter am Schreibtisch Überschrift und
 * Vorteile, unten rechts der Pause-Knopf.
 *
 * Der Rand rechts ist breit, weil die App das Video mit `object-fit: cover`
 * beschneidet. Die Markenhälfte am Schreibtisch ist bei 1024×768 schmaler als
 * 4:5 (0,64) und verliert links und rechts je ein Zehntel; das Band am Telefon
 * ist bei 390×260 schmaler als 16:9 (1,5) und verliert je 8 %. Im Hochformat
 * endet der Block oberhalb der Überschrift der App, auch bei 768 px Höhe;
 * im Band steht der Titel so tief, dass ein flaches Band (es zeigt nur die
 * mittleren 60 % der Höhe) ihn noch trägt.
 */
const MASS = {
  hoch: {
    rand: 180,
    leisteOben: 96,
    leiste: 136,
    ziffer: 18,
    titelOben: 150,
    titel: 116,
    strich: { breite: 14, hoehe: 92 },
    wert: 72,
    einheit: 30,
    zweit: 21,
  },
  band: {
    rand: 240,
    leisteOben: 96,
    leiste: 190,
    ziffer: 24,
    titelOben: 280,
    titel: 172,
    strich: { breite: 20, hoehe: 136 },
    wert: 112,
    einheit: 48,
    zweit: 0,
  },
} as const;

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
  const m = MASS[format];
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

  // Nur Nummern über den Leisten: Welche Disziplin läuft, sagt der Titel
  // darunter, und mit Namen wäre die Leiste für die schmale Markenhälfte zu breit.
  const fortschritt = (
    <div
      style={{
        position: "absolute",
        top: m.leisteOben,
        right: m.rand,
        display: "flex",
        gap: m.leiste / 12,
        opacity: interpolate(zeit, [0, 16], [0.4, 1], { extrapolateRight: "clamp" }),
      }}
    >
      {DISZIPLINEN.map((name, i) => {
        const fuellung = i < index ? 1 : i > index ? 0 : interpolate(zeit, [0, SZENE_FRAMES], [0, 1]);
        return (
          <div key={name} style={{ width: m.leiste }}>
            <div
              style={{
                fontFamily: SCHRIFT.anzeige,
                fontWeight: 700,
                fontStretch: "80%",
                fontSize: m.ziffer,
                letterSpacing: "0.1em",
                color: i === index ? FARBE.volt : `rgb(${FARBE.hellRgb} / 0.6)`,
                marginBottom: m.ziffer / 2,
              }}
            >
              {String(i + 1).padStart(2, "0")}
            </div>
            <div
              style={{
                height: m.ziffer / 3,
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

  return (
    <AbsoluteFill>
      {format === "band" && (
        // Am Telefon fehlt der Schleier der Schreibtischfassung; die Schrift
        // braucht dort ihren eigenen Grund.
        <AbsoluteFill
          style={{
            background: `linear-gradient(270deg, rgb(${FARBE.inkRgb} / 0.6), transparent 60%)`,
          }}
        />
      )}
      {fortschritt}
      <div
        style={{
          position: "absolute",
          top: m.titelOben,
          right: m.rand,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
        }}
      >
        {/* Der Titel wird von rechts nach links aufgezogen und schräg wieder eingezogen. */}
        <div style={{ display: "flex", alignItems: "center", gap: m.strich.breite * 1.5 }}>
          <div
            style={{
              width: m.strich.breite,
              height: m.strich.hoehe,
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
              fontSize: m.titel,
              lineHeight: 0.9,
              letterSpacing: "-0.01em",
              color: FARBE.hell,
              textShadow: `0 6px 40px rgb(${FARBE.inkRgb} / 0.55)`,
              clipPath: `inset(-20% ${(1 - ein) * 100}% -20% ${aus * 100}%)`,
              translate: `${(1 - ein) * 60 - aus * 60}px 0`,
            }}
          >
            {DISZIPLINEN[index].toUpperCase()}
          </div>
        </div>
        <div
          style={{
            marginTop: m.wert / 5,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            opacity: sichtbar,
            translate: `0 ${(1 - ein) * 24}px`,
            textShadow: `0 4px 30px rgb(${FARBE.inkRgb} / 0.6)`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: m.einheit / 3,
              fontFamily: SCHRIFT.anzeige,
              fontWeight: 800,
              fontStretch: "78%",
              lineHeight: 1,
              color: FARBE.hell,
            }}
          >
            <span style={{ fontSize: m.wert, fontVariantNumeric: "tabular-nums" }}>
              {werte.wert(t, zaehlt)}
            </span>
            <span style={{ fontSize: m.einheit, color: FARBE.volt }}>{werte.einheit}</span>
          </div>
          {m.zweit > 0 && (
            // Im Band reicht der eine Wert; dort ist für eine Zeile mehr kein Platz.
            <div
              style={{
                marginTop: m.zweit / 2,
                fontFamily: SCHRIFT.text,
                fontWeight: 500,
                fontSize: m.zweit,
                fontVariantNumeric: "tabular-nums",
                color: `rgb(${FARBE.hellRgb} / 0.72)`,
              }}
            >
              SPLIT {uhr(werte.split + t)} · {werte.zweit}
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
