"""Prototyp: aus den gelösten Posen von Tri-Coach Steuersignale rendern.

Liest nur (koerper.py, bibliothek.json), schreibt nur in den Scratchpad.
Ausgaben je Bild: Puppe (schattiert), Tiefe, Normalen, Teile (L/R getrennt),
Skelett im Format von Wan-Animate (20 Körperpunkte), dazu die projizierten
Soll-Punkte als JSON für die Prüfung.
"""
import json, math, os, sys
import numpy as np
# Tri-Coach liegt neben dem Remotion-Repo (wie in CLAUDE.md); sonst TRICOACH setzen.
TRICOACH = os.environ.get('TRICOACH', os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'Tri-Coach'))
sys.path.insert(0, os.path.join(TRICOACH, 'backend'))
from app.animation.koerper import punkte, SEGMENTE, KOPF_RADIUS, NASE_RADIUS  # noqa: E402

BIB = json.load(open(os.path.join(TRICOACH, 'backend/app/animation/bibliothek/bibliothek.json')))['uebungen']

# ---------------------------------------------------------------- Abspielen (wie bewegung.ts)
def wert(p, k):
    return p.get(k, 0.973 if k == 'y' else 0.0)

def zwischen(a, b, t):
    return {k: wert(a, k) + (wert(b, k) - wert(a, k)) * t for k in set(a) | set(b)}

def glatt(t):
    return 0.5 - 0.5 * math.cos(math.pi * t)

def dauer(bew):
    return max(0.1, sum(b.get('halten_s', 0.4) + b.get('uebergang_s', 1.0) for b in bew['ablauf']))

def pose_bei(bew, zeit):
    bilder = bew['ablauf']
    t = zeit % dauer(bew)
    for i, bild in enumerate(bilder):
        h, u = bild.get('halten_s', 0.4), bild.get('uebergang_s', 1.0)
        if t < h:
            return bild['pose']
        t -= h
        if t < u:
            kette = [bild['pose'], *bild.get('zwischen', []), bilder[(i + 1) % len(bilder)]['pose']]
            e = glatt(t / u) * (len(kette) - 1)
            j = min(int(e), len(kette) - 2)
            return zwischen(kette[j], kette[j + 1], e - j)
        t -= u
    return bilder[0]['pose']

# ---------------------------------------------------------------- Kopfpunkte für das Skelett
def n(v):
    v = np.asarray(v, float); return v / (np.linalg.norm(v) or 1)

def kopfpunkte(p):
    kopf, nase, nacken = map(np.array, (p['kopf'], p['nase'], p['nacken']))
    vor = n(nase - kopf); oben = n(kopf - nacken)
    links = n(np.cross(oben, vor))  # x zeigt nach links der Figur
    return {
        'auge_l': kopf + vor * 0.085 + oben * 0.02 + links * 0.032,
        'auge_r': kopf + vor * 0.085 + oben * 0.02 - links * 0.032,
        'ohr_l': kopf + links * 0.075 - vor * 0.005,
        'ohr_r': kopf - links * 0.075 - vor * 0.005,
    }

# ---------------------------------------------------------------- Kamera (Blick wie Szene, aber perspektivisch)
class Kamera:
    def __init__(self, bew, breite=640, hoehe=480, abstand=4.0):
        a = math.radians(bew.get('ansicht', {}).get('gieren', 70)); b = math.radians(bew.get('ansicht', {}).get('neigen', 15))
        zk = np.array([math.sin(a) * math.cos(b), math.sin(b), math.cos(a) * math.cos(b)])
        f = -zk
        self.rechts = n([-f[2], 0, f[0]]); self.oben = np.cross(self.rechts, f); self.vor = f
        alle = []
        T = dauer(bew)
        for k in range(48):
            p = punkte(pose_bei(bew, T * k / 48)); alle += list(p.values())
        alle = np.array(alle)
        self.ziel = (alle.min(0) + alle.max(0)) / 2
        self.pos = self.ziel + zk * abstand
        self.w, self.h = breite, hoehe
        # Brennweite so, dass alle Posen (mit 0,15 m Rand) in 84 % des Bildes passen
        c = self.kamkoord(alle)
        sx = np.abs(c[:, 0] / c[:, 2]).max() + 0.15 / abstand
        sy = np.abs(c[:, 1] / c[:, 2]).max() + 0.15 / abstand
        self.f = min(0.42 * breite / sx, 0.42 * hoehe / sy)

    def kamkoord(self, P):
        d = np.atleast_2d(P) - self.pos
        return np.stack([d @ self.rechts, d @ self.oben, d @ self.vor], -1)

    def projiziere(self, P):
        c = self.kamkoord(P)
        return np.stack([self.w / 2 + self.f * c[:, 0] / c[:, 2], self.h / 2 - self.f * c[:, 1] / c[:, 2]], -1), c[:, 2]

    def strahlen(self):
        u, v = np.meshgrid(np.arange(self.w) + 0.5, np.arange(self.h) + 0.5)
        d = ((u - self.w / 2) / self.f)[..., None] * self.rechts + (-(v - self.h / 2) / self.f)[..., None] * self.oben + self.vor
        return d / np.linalg.norm(d, axis=-1, keepdims=True)

# ---------------------------------------------------------------- Kugeln entlang der Kapseln
TEILFARBE = {}
def teil_id(von, nach):
    return f'{von}->{nach}'

def kugeln(p):
    K = []  # (mitte, radius, teil)
    for von, nach, r, gruppe in SEGMENTE:
        a, b = np.array(p[von]), np.array(p[nach]); L = np.linalg.norm(b - a)
        verj = 0.78 if gruppe in ('arme', 'oberschenkel', 'waden') else 1.0  # Gliedmaßen werden zum Ende schmaler
        m = max(2, int(math.ceil(L / (0.2 * r))) + 1)
        for t in np.linspace(0, 1, m):
            K.append((a + (b - a) * t, r * (1 - (1 - verj) * t), teil_id(von, nach)))
    K.append((np.array(p['kopf']), KOPF_RADIUS * 0.92, 'kopf'))
    K.append((np.array(p['nase']), NASE_RADIUS, 'kopf'))
    return K

def rendere(kam, pose, strahlen):
    p = punkte(pose)
    H, W = kam.h, kam.w
    tiefe = np.full((H, W), np.inf); normale = np.zeros((H, W, 3)); teil = np.full((H, W), '', dtype=object)
    for mitte, r, tid in kugeln(p):
        (uv,), (z,) = kam.projiziere(mitte[None])
        rp = kam.f * r / z * 1.3 + 2
        x0, x1 = int(max(0, uv[0] - rp)), int(min(W, uv[0] + rp + 1)); y0, y1 = int(max(0, uv[1] - rp)), int(min(H, uv[1] + rp + 1))
        if x0 >= x1 or y0 >= y1:
            continue
        d = strahlen[y0:y1, x0:x1]; oc = kam.pos - mitte
        b = d @ oc; c = oc @ oc - r * r; disc = b * b - c
        treffer = disc > 0
        t = np.where(treffer, -b - np.sqrt(np.maximum(disc, 0)), np.inf)
        naeher = t < tiefe[y0:y1, x0:x1]
        if not naeher.any():
            continue
        P = kam.pos + d * t[..., None]
        nrm = (P - mitte) / r
        tiefe[y0:y1, x0:x1] = np.where(naeher, t, tiefe[y0:y1, x0:x1])
        normale[y0:y1, x0:x1] = np.where(naeher[..., None], nrm, normale[y0:y1, x0:x1])
        tt = teil[y0:y1, x0:x1]; tt[naeher] = tid
    koerper = np.isfinite(tiefe)
    # Boden y = 0
    dy = strahlen[..., 1]
    tb = np.where(dy < -1e-6, -kam.pos[1] / np.where(dy < -1e-6, dy, -1), np.inf)
    boden = ~koerper & np.isfinite(tb)
    tiefe = np.where(boden, tb, tiefe)
    normale[boden] = [0, 1, 0]
    return p, tiefe, normale, teil, koerper, boden

# ---------------------------------------------------------------- Bilder
def bild_puppe(kam, tiefe, normale, koerper, boden, strahlen, schatten_p):
    licht = n([0.4, 0.9, 0.5]); diffus = np.clip(normale @ licht, 0, 1)
    img = np.zeros((kam.h, kam.w, 3))
    img[:] = np.linspace(0.93, 0.85, kam.h)[:, None, None] * np.array([1, 1, 1])  # Studiowand
    P = kam.pos + strahlen * np.where(np.isfinite(tiefe), tiefe, 0)[..., None]
    # weicher Kontaktschatten: Abstand jedes Bodenpixels zu den bodennahen Körperpunkten
    sch = np.zeros(boden.shape)
    for q in schatten_p:
        if q[1] < 0.5:
            dd = np.hypot(P[..., 0] - q[0], P[..., 2] - q[2])
            sch = np.maximum(sch, np.exp(-(dd / 0.12) ** 2) * (1 - q[1] / 0.5))
    bodenfarbe = np.array([0.80, 0.80, 0.78]) * (1 - 0.35 * sch)[..., None]
    img[boden] = bodenfarbe[boden]
    haut = np.array([0.86, 0.78, 0.70])
    img[koerper] = (haut * (0.35 + 0.65 * diffus[..., None]))[koerper]
    return (np.clip(img, 0, 1) * 255).astype(np.uint8)

def bild_tiefe(tiefe, tmin, tmax):
    inv = np.where(np.isfinite(tiefe), 1 / tiefe, 0)
    a, b = 1 / tmax, 1 / tmin
    g = np.clip((inv - a) / (b - a), 0, 1)
    return (g * 255).astype(np.uint8)

def bild_normale(kam, normale, koerper, boden):
    c = np.stack([normale @ kam.rechts, normale @ kam.oben, -(normale @ kam.vor)], -1)  # x rechts, y oben, z zur Kamera
    img = ((c + 1) / 2 * 255).astype(np.uint8); img[~(koerper | boden)] = 0
    return img

FARBEN_TEIL = {}
def bild_teile(teil, koerper):
    img = np.zeros(teil.shape + (3,), np.uint8)
    for tid in set(teil[koerper]):
        if tid not in FARBEN_TEIL:
            seite = 'l' if tid.endswith('_l') else 'r' if tid.endswith('_r') else ''
            basis = {'l': (60, 120, 255), 'r': (255, 120, 60), '': (200, 200, 200)}[seite]
            k = len(FARBEN_TEIL) * 37 % 90
            FARBEN_TEIL[tid] = tuple(min(255, c + k) for c in basis)
        img[(teil == tid) & koerper] = FARBEN_TEIL[tid]
    return img

# Reihenfolge wie Wan-Animate `draw_aapose_new` (20 Körperpunkte)
WAN = ['nase', 'NECK', 'schulter_r', 'ellbogen_r', 'hand_r', 'schulter_l', 'ellbogen_l', 'hand_l', 'huefte_r', 'knie_r', 'knoechel_r',
       'huefte_l', 'knie_l', 'knoechel_l', 'auge_r', 'auge_l', 'ohr_r', 'ohr_l', 'zehen_l', 'zehen_r']
LIMBS = [[2, 3], [2, 6], [3, 4], [4, 5], [6, 7], [7, 8], [2, 9], [9, 10], [10, 11], [2, 12], [12, 13], [13, 14], [2, 1], [1, 15], [15, 17], [1, 16], [16, 18], [14, 19], [11, 20]]
COLORS = [[255, 0, 0], [255, 85, 0], [255, 170, 0], [255, 255, 0], [170, 255, 0], [85, 255, 0], [0, 255, 0], [0, 255, 85], [0, 255, 170], [0, 255, 255],
          [0, 170, 255], [0, 85, 255], [0, 0, 255], [85, 0, 255], [170, 0, 255], [255, 0, 255], [255, 0, 170], [255, 0, 85], [200, 200, 0], [100, 100, 0]]

def skelett_punkte(kam, p):
    q = {**{k: np.array(v) for k, v in p.items()}, **kopfpunkte(p)}
    q['NECK'] = (q['schulter_l'] + q['schulter_r']) / 2
    uv, _ = kam.projiziere(np.array([q[k] for k in WAN]))
    return uv

def bild_skelett(kam, uv):
    import cv2
    img = np.zeros((kam.h, kam.w, 3), np.uint8)
    sw = max(int(min(kam.h, kam.w) / 200) - 1, 1)
    for (a, b), col in zip(LIMBS, COLORS):
        Y = uv[[a - 1, b - 1], 0]; X = uv[[a - 1, b - 1], 1]
        L = math.hypot(X[0] - X[1], Y[0] - Y[1]); ang = math.degrees(math.atan2(X[0] - X[1], Y[0] - Y[1]))
        poly = cv2.ellipse2Poly((int(Y.mean()), int(X.mean())), (int(L / 2), sw), int(ang), 0, 360, 1)
        cv2.fillConvexPoly(img, poly, [int(c * 0.6) for c in col])
    for (x, y), col in zip(uv, COLORS):
        cv2.circle(img, (int(x), int(y)), sw, col, -1)
    return img  # RGB wie bei Wan (moviepy schreibt RGB)

COCO = ['nase', 'auge_l', 'auge_r', 'ohr_l', 'ohr_r', 'schulter_l', 'schulter_r', 'ellbogen_l', 'ellbogen_r', 'hand_l', 'hand_r',
        'huefte_l', 'huefte_r', 'knie_l', 'knie_r', 'knoechel_l', 'knoechel_r']

def coco_soll(kam, p, tiefe):
    """Soll-Punkte im COCO-17-Format, dazu: ist der Punkt verdeckt (Tiefenpuffer näher als das Gelenk)?"""
    q = {**{k: np.array(v) for k, v in p.items()}, **kopfpunkte(p)}
    P = np.array([q[k] for k in COCO]); uv, z = kam.projiziere(P)
    verdeckt = []
    for (x, y), pt in zip(uv, P):
        xi, yi = int(np.clip(x, 0, kam.w - 1)), int(np.clip(y, 0, kam.h - 1))
        abstand = np.linalg.norm(pt - kam.pos)
        verdeckt.append(bool(tiefe[yi, xi] < abstand - 0.09))
    return uv, verdeckt
