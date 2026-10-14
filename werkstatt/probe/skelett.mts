/**
 * Machbarkeitsprobe "Steuervideo": Bewegung aus bibliothek.json -> 3D-Punkte
 * (koerper.ts aus Tri-Coach, nur gelesen) -> COCO-18-Skelett im Stil von
 * controlnet_aux/DWPose draw_bodypose (farbig auf Schwarz) -> SVG je Frame.
 *
 * Aufruf: node --experimental-strip-types --no-warnings skelett.mts <schluessel> <ausgabeordner> [fps] [breite] [hoehe]
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { glatt, punkte, wert, zwischen, type Pose, type Punkt } from '../../../Tri-Coach/frontend/src/animation/koerper.ts'

const [schluessel = 'glute-bridge', ziel = 'out', fpsArg = '16', bArg = '832', hArg = '480'] = process.argv.slice(2)
const FPS = Number(fpsArg)
const B = Number(bArg)
const H = Number(hArg)

type Bild = { pose: Pose; halten_s?: number; uebergang_s?: number; zwischen?: Pose[] }
type Bewegung = { schluessel: string; ansicht?: { gieren?: number; neigen?: number }; ablauf: Bild[] }

const bib = JSON.parse(readFileSync(new URL('../../../Tri-Coach/backend/app/animation/bibliothek/bibliothek.json', import.meta.url), 'utf8')) as {
  uebungen: Bewegung[]
}
const bew = bib.uebungen.find((u) => u.schluessel === schluessel)
if (!bew) throw new Error(`unbekannt: ${schluessel}`)

// --- Abspielen: Kopie von bewegung.ts (dort Import ohne Endung -> in Node nicht ladbar)
const haltenS = (b: Bild) => b.halten_s ?? 0.4
const uebergangS = (b: Bild) => b.uebergang_s ?? 1.0
const dauer = (bw: Bewegung) => Math.max(0.1, bw.ablauf.reduce((s, b) => s + haltenS(b) + uebergangS(b), 0))
function poseBei(bw: Bewegung, zeit: number): Pose {
  const bilder = bw.ablauf
  let t = zeit % dauer(bw)
  if (t < 0) t += dauer(bw)
  for (let i = 0; i < bilder.length; i++) {
    const bild = bilder[i]
    if (t < haltenS(bild)) return bild.pose
    t -= haltenS(bild)
    if (t < uebergangS(bild)) {
      const kette = [bild.pose, ...(bild.zwischen ?? []), bilder[(i + 1) % bilder.length].pose]
      const e = glatt(t / uebergangS(bild)) * (kette.length - 1)
      const j = Math.min(Math.floor(e), kette.length - 2)
      return zwischen(kette[j], kette[j + 1], e - j)
    }
    t -= uebergangS(bild)
  }
  return bilder[0].pose
}

// --- Vektoren
const add = (a: Punkt, b: Punkt): Punkt => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const sub = (a: Punkt, b: Punkt): Punkt => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const mul = (a: Punkt, s: number): Punkt => [a[0] * s, a[1] * s, a[2] * s]
const dot = (a: Punkt, b: Punkt) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Punkt, b: Punkt): Punkt => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const norm = (a: Punkt): Punkt => mul(a, 1 / (Math.hypot(...a) || 1))
const mitte = (a: Punkt, b: Punkt): Punkt => mul(add(a, b), 0.5)

// --- Kamera wie szene.ts (orthografisch, gieren/neigen)
const ga = ((bew.ansicht?.gieren ?? 70) * Math.PI) / 180
const ne = ((bew.ansicht?.neigen ?? 15) * Math.PI) / 180
const zurKamera: Punkt = [Math.sin(ga) * Math.cos(ne), Math.sin(ne), Math.cos(ga) * Math.cos(ne)]
const blick = mul(zurKamera, -1)
const rechts = norm([-blick[2], 0, blick[0]])
const oben = cross(rechts, blick)

// --- Kopfrahmen exakt aus kopf, nacken, nase (koerper.ts: kopf = nacken + rk*(0, .1035, .01),
//     nase = kopf + rk*(0, -.01, .10925)) -> rk-Spalten X (links), Y (oben), Z (vorn)
function kopfrahmen(p: Record<string, Punkt>): [Punkt, Punkt, Punkt] {
  const a = sub(p.kopf, p.nacken)
  const b = sub(p.nase, p.kopf)
  const det = 0.1035 * 0.10925 + 0.01 * 0.01
  const Y = mul(sub(mul(a, 0.10925), mul(b, 0.01)), 1 / det)
  const Z = mul(add(mul(a, 0.01), mul(b, 0.1035)), 1 / det)
  return [cross(Y, Z), Y, Z]
}
const lokal = (p: Record<string, Punkt>, v: Punkt) => {
  const [X, Y, Z] = kopfrahmen(p)
  return add(p.kopf, add(add(mul(X, v[0]), mul(Y, v[1])), mul(Z, v[2])))
}

/** COCO-18 in OpenPose-Reihenfolge; null = nicht sichtbar (wie DWPose unter der Schwelle). */
function coco18(pose: Pose): (Punkt | null)[] {
  const p = punkte(pose)
  const gesicht = (v: Punkt) => {
    const q = lokal(p, v)
    // Abgewandte Gesichtspunkte lässt auch DWPose weg (Konfidenz < 0,3).
    return dot(norm(sub(q, p.kopf)), zurKamera) > -0.25 ? q : null
  }
  return [
    gesicht([0, -0.01, 0.10925]), // 0 Nase (= nase)
    mitte(p.schulter_l, p.schulter_r), // 1 Hals: wie DWPose als Schultermitte
    p.schulter_r, p.ellbogen_r, p.hand_r, // 2-4
    p.schulter_l, p.ellbogen_l, p.hand_l, // 5-7
    p.huefte_r, p.knie_r, p.knoechel_r, // 8-10
    p.huefte_l, p.knie_l, p.knoechel_l, // 11-13
    gesicht([-0.032, 0.03, 0.088]), // 14 rechtes Auge (abgeleitet)
    gesicht([0.032, 0.03, 0.088]), // 15 linkes Auge
    gesicht([-0.08, 0.0, -0.005]), // 16 rechtes Ohr
    gesicht([0.08, 0.0, -0.005]), // 17 linkes Ohr
  ]
}

// controlnet_aux/dwpose/util.py draw_bodypose
const LIMB = [[2, 3], [2, 6], [3, 4], [4, 5], [6, 7], [7, 8], [2, 9], [9, 10], [10, 11], [2, 12], [12, 13], [13, 14], [2, 1], [1, 15], [15, 17], [1, 16], [16, 18]]
const FARBEN = [[255, 0, 0], [255, 85, 0], [255, 170, 0], [255, 255, 0], [170, 255, 0], [85, 255, 0], [0, 255, 0], [0, 255, 85], [0, 255, 170], [0, 255, 255], [0, 170, 255], [0, 85, 255], [0, 0, 255], [85, 0, 255], [170, 0, 255], [255, 0, 255], [255, 0, 170], [255, 0, 85]]

// --- Ausschnitt über die ganze Schleife (wie szene.ts), damit die Kamera steht
const gesamt = dauer(bew)
const frames = Math.round(gesamt * FPS)
const alle: Punkt[] = []
for (let f = 0; f < frames; f++) for (const q of coco18(poseBei(bew, f / FPS))) if (q) alle.push(q)
const kx = alle.map((q) => dot(q, rechts))
const ky = alle.map((q) => dot(q, oben))
const [x0, x1, y0, y1] = [Math.min(...kx), Math.max(...kx), Math.min(...ky), Math.max(...ky)]
const rand = 0.12
const m = Math.min((B * (1 - 2 * rand)) / (x1 - x0), (H * (1 - 2 * rand)) / (y1 - y0))
const bild = (q: Punkt): [number, number] => [B / 2 + (dot(q, rechts) - (x0 + x1) / 2) * m, H / 2 - (dot(q, oben) - (y0 + y1) / 2) * m]

const STICK = 4 * (H / 512) // DWPose: 4 px bei ~512 px Erkennungsauflösung
const rgb = (c: number[], s = 1) => `rgb(${c.map((v) => Math.floor(v * s)).join(',')})`

function svg(pose: Pose): string {
  const kp = coco18(pose).map((q) => (q ? bild(q) : null))
  const teile: string[] = [`<rect width="${B}" height="${H}" fill="black"/>`]
  LIMB.forEach(([a, b], i) => {
    const pa = kp[a - 1]
    const pb = kp[b - 1]
    if (!pa || !pb) return
    const [mx, my] = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2]
    const len = Math.hypot(pa[0] - pb[0], pa[1] - pb[1])
    const winkel = (Math.atan2(pb[1] - pa[1], pb[0] - pa[0]) * 180) / Math.PI
    // Gliedmaßen mit 60 % Helligkeit: DWPose dunkelt die Leinwand nach den Gliedern ab.
    teile.push(`<ellipse cx="${mx.toFixed(2)}" cy="${my.toFixed(2)}" rx="${(len / 2).toFixed(2)}" ry="${STICK.toFixed(2)}" transform="rotate(${winkel.toFixed(2)} ${mx.toFixed(2)} ${my.toFixed(2)})" fill="${rgb(FARBEN[i], 0.6)}"/>`)
  })
  kp.forEach((q, i) => {
    if (q) teile.push(`<circle cx="${q[0].toFixed(2)}" cy="${q[1].toFixed(2)}" r="${STICK.toFixed(2)}" fill="${rgb(FARBEN[i])}"/>`)
  })
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${B}" height="${H}" viewBox="0 0 ${B} ${H}">${teile.join('')}</svg>\n`
}

mkdirSync(join(ziel, 'frames'), { recursive: true })
for (let f = 0; f < frames; f++) writeFileSync(join(ziel, 'frames', `f${String(f).padStart(4, '0')}.svg`), svg(poseBei(bew, f / FPS)))
// Schlüsselbilder einzeln (Haltephasen)
let t = 0
bew.ablauf.forEach((b, i) => {
  writeFileSync(join(ziel, `schluesselbild${i}.svg`), svg(b.pose))
  t += haltenS(b) + uebergangS(b)
})
const p1 = punkte(bew.ablauf[1]?.pose ?? bew.ablauf[0].pose)
console.log(JSON.stringify({
  schluessel, schleife_s: gesamt, fps: FPS, frames, breite: B, hoehe: H,
  ansicht: bew.ansicht, massstab_px_je_m: +m.toFixed(1),
  oben_y: { becken: +p1.becken[1].toFixed(3), knie_l: +p1.knie_l[1].toFixed(3), schulter_l: +p1.schulter_l[1].toFixed(3), kopf: +p1.kopf[1].toFixed(3) },
  sichtbar_kp1: coco18(bew.ablauf[1]?.pose ?? bew.ablauf[0].pose).map((q) => (q ? 1 : 0)).join(''),
  unbenutzt: ['finger_l/r', 'ferse_l/r', 'zehen_l/r', 'gesaess_l/r', 'becken', 'taille', 'brust'],
  wertY: wert({}, 'y'),
}))
