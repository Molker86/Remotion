/**
 * Probe "2,5D-Tiefe ohne WebGL": die Kapseln des Körpermodells (SEGMENTE mit
 * Radius, Kopf als Kugel) als Graustufen nach Abstand zur Kamera, hinten nach
 * vorn gemalt, dazu der Boden als Ebene. Nah = hell (Konvention von MiDaS /
 * Depth-Anything-Steuerbildern). Nur für ein Schlüsselbild.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { KOPF_RADIUS, SEGMENTE, punkte, type Pose, type Punkt } from '../../../Tri-Coach/frontend/src/animation/koerper.ts'

const [schluessel = 'glute-bridge', bildIndex = '1', aus = 'tiefe.svg', B = 832, H = 480] = process.argv.slice(2) as [string, string, string, number, number]
const bib = JSON.parse(readFileSync(new URL('../../../Tri-Coach/backend/app/animation/bibliothek/bibliothek.json', import.meta.url), 'utf8'))
const bew = bib.uebungen.find((u: { schluessel: string }) => u.schluessel === schluessel)
const pose: Pose = bew.ablauf[Number(bildIndex)].pose

const dot = (a: Punkt, b: Punkt) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Punkt, b: Punkt): Punkt => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const ga = ((bew.ansicht?.gieren ?? 70) * Math.PI) / 180
const ne = ((bew.ansicht?.neigen ?? 15) * Math.PI) / 180
const zk: Punkt = [Math.sin(ga) * Math.cos(ne), Math.sin(ne), Math.cos(ga) * Math.cos(ne)]
const re: Punkt = (() => { const v: Punkt = [zk[2], 0, -zk[0]]; const l = Math.hypot(...v); return [v[0] / l, 0, v[2] / l] })()
const ob = cross(re, [-zk[0], -zk[1], -zk[2]])

const pk = punkte(pose)
// Rahmen: alle Schlüsselbilder (vereinfacht), Rand 12 %
const alle = bew.ablauf.flatMap((b: { pose: Pose }) => Object.values(punkte(b.pose)))
const kx = alle.map((q: Punkt) => dot(q, re)), ky = alle.map((q: Punkt) => dot(q, ob))
const [x0, x1, y0, y1] = [Math.min(...kx), Math.max(...kx), Math.min(...ky), Math.max(...ky)]
const m = Math.min((B * 0.76) / (x1 - x0), (H * 0.76) / (y1 - y0))
const px = (q: Punkt): [number, number] => [B / 2 + (dot(q, re) - (x0 + x1) / 2) * m, H / 2 - (dot(q, ob) - (y0 + y1) / 2) * m]

// Tiefenbereich: Figur samt Kapselradius, Boden darf dunkler werden
const tiefen = Object.values(pk).map((q) => dot(q, zk))
const dNah = Math.max(...tiefen) + 0.15, dFern = Math.min(...tiefen) - 0.6
const grau = (d: number) => Math.round(255 * Math.min(1, Math.max(0, (d - dFern) / (dNah - dFern))))
const g = (d: number) => `rgb(${grau(d)},${grau(d)},${grau(d)})`

// Boden y=0: bei orthografischer Kamera hängt die Tiefe nur von der Bildzeile ab
// (Tiefe = -v * oben_y / zk_y mit v = Bildhöhe in Metern).
const vAus = (yPx: number) => (H / 2 - yPx) / m + (y0 + y1) / 2
const bodenTiefe = (yPx: number) => (-vAus(yPx) * ob[1]) / zk[1]
// Horizont: wo die Bodentiefe sehr fern wird — oberhalb schwarz
const teile: string[] = [
  `<defs><linearGradient id="boden" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${H}">` +
    `<stop offset="0" stop-color="${g(bodenTiefe(0))}"/><stop offset="1" stop-color="${g(bodenTiefe(H))}"/></linearGradient></defs>`,
  `<rect width="${B}" height="${H}" fill="url(#boden)"/>`,
]
type Teil = { d: number; svg: string }
const stuecke: Teil[] = []
SEGMENTE.forEach((s, i) => {
  const a = pk[s.von], b = pk[s.nach]
  if (!a || !b) return
  const [ax, ay] = px(a), [bx, by] = px(b)
  // Die Kapsel ist zur Kamera hin um ihren Radius näher als ihre Achse
  const da = dot(a, zk) + s.radius, db = dot(b, zk) + s.radius
  stuecke.push({
    d: (da + db) / 2,
    svg: `<linearGradient id="s${i}" gradientUnits="userSpaceOnUse" x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}"><stop offset="0" stop-color="${g(da)}"/><stop offset="1" stop-color="${g(db)}"/></linearGradient>` +
      `<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="url(#s${i})" stroke-width="${2 * s.radius * m}" stroke-linecap="round"/>`,
  })
})
const [kx0, ky0] = px(pk.kopf)
stuecke.push({ d: dot(pk.kopf, zk) + KOPF_RADIUS, svg: `<circle cx="${kx0}" cy="${ky0}" r="${KOPF_RADIUS * m}" fill="${g(dot(pk.kopf, zk) + KOPF_RADIUS)}"/>` })
for (const s of stuecke.sort((p, q) => p.d - q.d)) teile.push(s.svg)
writeFileSync(aus, `<svg xmlns="http://www.w3.org/2000/svg" width="${B}" height="${H}">${teile.join('')}</svg>\n`)
