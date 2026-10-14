"""Soll-gestützte Ausrichtung: Bild so drehen, dass der Soll-Rumpf senkrecht steht, dann RTMW."""
import sys, collections, math
import numpy as np, cv2
sys.path.insert(0, sys.argv[1])
import puppe as P
from rtmlib import Wholebody
rtm = Wholebody(mode='balanced', backend='onnxruntime', device='cpu')
TAUSCH = [0, 2, 1, 4, 3, 6, 5, 8, 7, 10, 9, 12, 11, 14, 13, 16, 15]
SIG = np.array([.26, .25, .25, .35, .35, .79, .79, .72, .72, .62, .62, 1.07, 1.07, .87, .87, .89, .89]) / 10.0
K = list(range(5, 17))
def oks(a, b, fl): return float(np.exp(-((a - b) ** 2).sum(-1) / (2 * fl * (2 * SIG) ** 2))[K].mean())
def kategorie(bew):
    ps = [P.punkte(x['pose']) for x in bew['ablauf']]
    beck = max(p['becken'][1] for p in ps); brust = min(p['brust'][1] for p in ps)
    hand = any(min(p['hand_l'][1], p['hand_r'][1]) < 0.1 for p in ps); knie = any(min(p['knie_l'][1], p['knie_r'][1]) < 0.1 for p in ps)
    if beck > 0.85: return 'stehend'
    if brust < 0.4 and beck < 0.4: return 'liegend'
    if hand and knie and beck > 0.4: return 'vierfuessler'
    return 'stuetz/sitz/knie'
def schaetze(img):
    kps, sc = rtm(img[..., ::-1])
    if len(kps) == 0: return None
    return kps[int(np.argmax(sc[:, :17].mean(1))), :17].astype(float)
erg = collections.defaultdict(list)
for bew in P.BIB:
    kat = kategorie(bew)
    if kat == 'stehend': continue
    kam = P.Kamera(bew); st = kam.strahlen()
    for bild in bew['ablauf']:
        p, tiefe, nrm, teil, koerper, boden = P.rendere(kam, bild['pose'], st)
        img = P.bild_puppe(kam, tiefe, nrm, koerper, boden, st, list(p.values()))
        soll, _ = P.coco_soll(kam, p, tiefe)
        ys, xs = np.nonzero(koerper); fl = (xs.max() - xs.min()) * (ys.max() - ys.min()) * 0.53; g = max(xs.max() - xs.min(), ys.max() - ys.min())
        h, w = img.shape[:2]
        for art in ('ohne', 'soll-ausgerichtet'):
            if art == 'ohne':
                ist = schaetze(img)
            else:
                hm = (soll[11] + soll[12]) / 2; sm = (soll[5] + soll[6]) / 2
                winkel = math.degrees(math.atan2(sm[0] - hm[0], -(sm[1] - hm[1])))  # Abweichung des Rumpfs von „oben"
                M = cv2.getRotationMatrix2D((float(hm[0]), float(hm[1])), winkel, 1.0)
                s2 = np.c_[soll, np.ones(17)] @ M.T; v = (s2[5]+s2[6])/2 - (s2[11]+s2[12])/2; assert v[1] < 0 and abs(v[0]) < 1e-6 * 1e6 * 0.05 * abs(v[1]) + 1e-3, v
                # größere Leinwand, damit nichts abgeschnitten wird
                gr = int(math.hypot(w, h)); M[:, 2] += [(gr - w) / 2, (gr - h) / 2]
                rot = cv2.warpAffine(img, M, (gr, gr), borderValue=(220, 220, 215))
                ist = schaetze(rot)
                if ist is not None:
                    Mi = cv2.invertAffineTransform(M); ist = (np.c_[ist, np.ones(17)] @ Mi.T)
            if ist is None: erg[(art, kat)].append(None); continue
            d = np.linalg.norm(ist - soll, axis=1)
            erg[(art, kat)].append((float((d[K] < 0.1 * g).mean()), oks(ist, soll, fl), oks(ist[TAUSCH], soll, fl) > oks(ist, soll, fl) + 0.05))
for k in sorted(erg):
    v = [x for x in erg[k] if x]; print(f'{k[0]:18s} {k[1]:17s} n={len(erg[k])} fehlt={len(erg[k])-len(v)} PCK@.1(Körper)={np.mean([x[0] for x in v]):.2f} OKS(Körper)={np.mean([x[1] for x in v]):.2f} >0.75: {np.mean([x[1]>.75 for x in v]):.2f} Tausch={sum(x[2] for x in v)}')
