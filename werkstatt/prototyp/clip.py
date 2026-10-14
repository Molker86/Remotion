import sys, numpy as np
from PIL import Image
sys.path.insert(0, sys.argv[1])
import puppe as P
name, ziel, fps = sys.argv[2], sys.argv[3], int(sys.argv[4])
bew = next(b for b in P.BIB if b['schluessel'] == name)
kam = P.Kamera(bew); st = kam.strahlen()
T = P.dauer(bew); n = round(T * fps)
print('Zyklus', T, 's =', T * fps, 'Bilder bei', fps, 'fps → gerundet', n)
for k in range(n):
    p, tiefe, nrm, teil, koerper, boden = P.rendere(kam, P.pose_bei(bew, k * T / n), st)
    Image.fromarray(P.bild_puppe(kam, tiefe, nrm, koerper, boden, st, list(p.values()))).save(f'{ziel}/f{k:04d}.png')
