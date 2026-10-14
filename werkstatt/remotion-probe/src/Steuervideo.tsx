import { AbsoluteFill, useCurrentFrame, useVideoConfig, type CalculateMetadataFunction } from "remotion";
// Direkt aus dem Nachbar-Checkout — nur zum Probieren (später: Kopie per Skript).
import { punkte, type Punkt } from "../../../../Tri-Coach/frontend/src/animation/koerper";
import { dauer, poseBei } from "../../../../Tri-Coach/frontend/src/animation/bewegung";
import bibliothek from "../../../../Tri-Coach/backend/app/animation/bibliothek/bibliothek.json";
import type { Bewegung } from "../../../../Tri-Coach/frontend/src/types";

export type SteuerProps = { schluessel: string; wiederholungen: number; zielFps: number };

const finde = (s: string) => {
  const u = (bibliothek.uebungen as unknown as (Bewegung & { schluessel: string })[]).find((x) => x.schluessel === s);
  if (!u) throw new Error(`Unbekannte Übung ${s}`);
  return u;
};

export const metadaten: CalculateMetadataFunction<SteuerProps> = ({ props }) => ({
  fps: props.zielFps,
  durationInFrames: Math.round(dauer(finde(props.schluessel)) * props.wiederholungen * props.zielFps),
});

const add = (a: Punkt, b: Punkt): Punkt => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Punkt, b: Punkt): Punkt => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: Punkt, s: number): Punkt => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Punkt, b: Punkt) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Punkt, b: Punkt): Punkt => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: Punkt): Punkt => mul(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1));

const LIMB = [[2, 3], [2, 6], [3, 4], [4, 5], [6, 7], [7, 8], [2, 9], [9, 10], [10, 11], [2, 12], [12, 13], [13, 14], [2, 1], [1, 15], [15, 17], [1, 16], [16, 18]];
const FARBEN = [[255, 0, 0], [255, 85, 0], [255, 170, 0], [255, 255, 0], [170, 255, 0], [85, 255, 0], [0, 255, 0], [0, 255, 85], [0, 255, 170], [0, 255, 255], [0, 170, 255], [0, 85, 255], [0, 0, 255], [85, 0, 255], [170, 0, 255], [255, 0, 255], [255, 0, 170], [255, 0, 85]];

function coco18(p: Record<string, Punkt>, zurKamera: Punkt): (Punkt | null)[] {
  const a = sub(p.kopf, p.nacken), b = sub(p.nase, p.kopf);
  const det = 0.1035 * 0.10925 + 0.0001;
  const Y = mul(sub(mul(a, 0.10925), mul(b, 0.01)), 1 / det);
  const Z = mul(add(mul(a, 0.01), mul(b, 0.1035)), 1 / det);
  const X = cross(Y, Z);
  const g = (v: Punkt) => {
    const q = add(p.kopf, add(add(mul(X, v[0]), mul(Y, v[1])), mul(Z, v[2])));
    return dot(norm(sub(q, p.kopf)), zurKamera) > -0.25 ? q : null;
  };
  return [g([0, -0.01, 0.10925]), mul(add(p.schulter_l, p.schulter_r), 0.5),
    p.schulter_r, p.ellbogen_r, p.hand_r, p.schulter_l, p.ellbogen_l, p.hand_l,
    p.huefte_r, p.knie_r, p.knoechel_r, p.huefte_l, p.knie_l, p.knoechel_l,
    g([-0.032, 0.03, 0.088]), g([0.032, 0.03, 0.088]), g([-0.08, 0, -0.005]), g([0.08, 0, -0.005])];
}

export const Steuervideo: React.FC<SteuerProps> = ({ schluessel }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const bew = finde(schluessel);
  const ga = ((bew.ansicht?.gieren ?? 70) * Math.PI) / 180, ne = ((bew.ansicht?.neigen ?? 15) * Math.PI) / 180;
  const zk: Punkt = [Math.sin(ga) * Math.cos(ne), Math.sin(ne), Math.cos(ga) * Math.cos(ne)];
  const rechts = norm([zk[2], 0, -zk[0]]);
  const oben = cross(rechts, mul(zk, -1));
  // Ausschnitt fest über die ganze Schleife (in echt: einmal in calculateMetadata rechnen).
  const n = Math.round(dauer(bew) * fps);
  const alle = Array.from({ length: n }, (_, f) => coco18(punkte(poseBei(bew, f / fps)), zk)).flat().filter((q): q is Punkt => q !== null);
  const kx = alle.map((q) => dot(q, rechts)), ky = alle.map((q) => dot(q, oben));
  const x0 = Math.min(...kx), x1 = Math.max(...kx), y0 = Math.min(...ky), y1 = Math.max(...ky);
  const m = Math.min((width * 0.76) / (x1 - x0), (height * 0.76) / (y1 - y0));
  const px = (q: Punkt): [number, number] => [width / 2 + (dot(q, rechts) - (x0 + x1) / 2) * m, height / 2 - (dot(q, oben) - (y0 + y1) / 2) * m];
  const kp = coco18(punkte(poseBei(bew, frame / fps)), zk).map((q) => (q ? px(q) : null));
  const sw = 4 * (height / 512);
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <svg width={width} height={height}>
        {LIMB.map(([a, b], i) => {
          const pa = kp[a - 1], pb = kp[b - 1];
          if (!pa || !pb) return null;
          const mx = (pa[0] + pb[0]) / 2, my = (pa[1] + pb[1]) / 2;
          const w = (Math.atan2(pb[1] - pa[1], pb[0] - pa[0]) * 180) / Math.PI;
          return <ellipse key={i} cx={mx} cy={my} rx={Math.hypot(pa[0] - pb[0], pa[1] - pb[1]) / 2} ry={sw}
            transform={`rotate(${w} ${mx} ${my})`} fill={`rgb(${FARBEN[i].map((c) => Math.floor(c * 0.6)).join(",")})`} />;
        })}
        {kp.map((q, i) => (q ? <circle key={`k${i}`} cx={q[0]} cy={q[1]} r={sw} fill={`rgb(${FARBEN[i].join(",")})`} /> : null))}
      </svg>
    </AbsoluteFill>
  );
};
