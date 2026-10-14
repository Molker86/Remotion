import sys, json, time, numpy as np
from PIL import Image
sys.path.insert(0, '.')
import puppe as P

ziel = sys.argv[1]
namen = sys.argv[2].split(',')
for name in namen:
    bew = next(b for b in P.BIB if b['schluessel'] == name)
    kam = P.Kamera(bew)
    st = kam.strahlen()
    t0 = time.time()
    zeilen = []
    for i, bild in enumerate(bew['ablauf'][:2]):
        p, tiefe, nrm, teil, koerper, boden = P.rendere(kam, bild['pose'], st)
        fin = tiefe[np.isfinite(tiefe)]
        puppe = P.bild_puppe(kam, tiefe, nrm, koerper, boden, st, list(p.values()))
        tf = P.bild_tiefe(tiefe, fin.min(), fin.max())
        nb = P.bild_normale(kam, nrm, koerper, boden)
        tb = P.bild_teile(teil, koerper)
        sk = P.bild_skelett(kam, P.skelett_punkte(kam, p))
        zeilen.append(np.concatenate([puppe, np.repeat(tf[..., None], 3, -1), nb, tb, sk], 1))
    Image.fromarray(np.concatenate(zeilen, 0)).resize((5 * 320, len(zeilen) * 240)).save(f'{ziel}/{name}.png')
    print(name, f'{(time.time()-t0)/len(zeilen):.2f}s/Bild')
