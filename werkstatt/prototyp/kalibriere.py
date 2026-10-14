import sys, collections
import numpy as np
sys.path.insert(0, sys.argv[1])
import puppe as P
SIG = np.array([.26, .25, .25, .35, .35, .79, .79, .72, .72, .62, .62, 1.07, 1.07, .87, .87, .89, .89]) / 10.0
KOERPER = list(range(5, 17))  # Schultern bis Knöchel — Augen/Ohren der Puppe sind geschätzt
NAMEN = P.COCO

def oks(ist, soll, flaeche, idx=KOERPER):
    d2 = ((ist - soll) ** 2).sum(-1)
    return float(np.exp(-d2 / (2 * flaeche * (2 * SIG) ** 2))[idx].mean())

def spiegel(pose):
    neu = {}
    for k, v in pose.items():
        if k.endswith('_l'): neu[k[:-2] + '_r'] = v
        elif k.endswith('_r'): neu[k[:-2] + '_l'] = v
        elif k in ('x', 'gieren', 'rollen', 'drehen', 'rumpf_seit', 'rumpf_drehen'): neu[k] = -v
        else: neu[k] = v
    return neu

from rtmlib import Wholebody
rtm = Wholebody(mode='balanced', backend='onnxruntime', device='cpu')
werte = collections.defaultdict(list)
gelenkfehler = collections.defaultdict(list)
for bew in P.BIB:
    kam = P.Kamera(bew); st = kam.strahlen()
    soll = []; bilder = []
    for bild in bew['ablauf']:
        p, tiefe, nrm, teil, koerper, boden = P.rendere(kam, bild['pose'], st)
        img = P.bild_puppe(kam, tiefe, nrm, koerper, boden, st, list(p.values()))
        uv, _ = P.coco_soll(kam, p, tiefe)
        ys, xs = np.nonzero(koerper)
        soll.append(uv); bilder.append((img, (xs.max() - xs.min()) * (ys.max() - ys.min()) * 0.53, max(xs.max() - xs.min(), ys.max() - ys.min())))
    for i, bild in enumerate(bew['ablauf']):
        img, fl, gross = bilder[i]
        kps, sc = rtm(img[..., ::-1])
        if len(kps) == 0: continue
        ist = kps[int(np.argmax(sc[:, :17].mean(1))), :17].astype(float)
        werte['richtig'].append(oks(ist, soll[i], fl))
        d = np.linalg.norm(ist - soll[i], axis=1) / gross
        for j in KOERPER: gelenkfehler[NAMEN[j]].append(d[j])
        # falsches Schlüsselbild — nur wenn es sich vom richtigen überhaupt unterscheidet
        for j in range(len(bew['ablauf'])):
            if j != i and oks(soll[j], soll[i], fl) < 0.9:
                werte['anderes_bild'].append(oks(ist, soll[j], fl))
        # falsche Seite
        sp = P.punkte(spiegel(bild['pose']))
        p2, tiefe2, *_ = P.rendere(kam, spiegel(bild['pose']), st)
        uv2, _ = P.coco_soll(kam, p2, tiefe2)
        if oks(uv2, soll[i], fl) < 0.9:
            werte['gespiegelt'].append(oks(ist, uv2, fl))
for k, v in werte.items():
    v = np.array(v)
    print(f'{k:13s} n={len(v):3d}  OKS(Körper) Median {np.median(v):.2f}  10%-Quantil {np.quantile(v, .1):.2f}  90%-Quantil {np.quantile(v, .9):.2f}  Anteil >0.75: {np.mean(v > .75):.2f}  >0.6: {np.mean(v > .6):.2f}')
print('Mittlerer Fehler je Gelenk (Anteil der Personengröße), richtige Pose:')
print('  ' + ', '.join(f'{k} {np.mean(v):.3f}' for k, v in gelenkfehler.items()))
