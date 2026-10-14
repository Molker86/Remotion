"""Tempo und Phase aus erkannten Punkten: Periode per Autokorrelation, Versatz per Kreuzkorrelation gegen das Soll."""
import sys, numpy as np
sys.path.insert(0, sys.argv[1])
import puppe as P
from rtmlib import Wholebody
rtm = Wholebody(mode='balanced', backend='onnxruntime', device='cpu')
name = sys.argv[2]; fps = 15
bew = next(b for b in P.BIB if b['schluessel'] == name)
kam = P.Kamera(bew); st = kam.strahlen(); T = P.dauer(bew)
K = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]

def merkmal(kp, groesse):
    # skalierungsfreie Merkmale: Punkte relativ zur Beckenmitte, durch die Personengröße
    m = (kp[11] + kp[12]) / 2
    return ((kp[K] - m) / groesse).ravel()

def serie(tempo, dauer_s):
    ist, soll = [], []
    for k in range(int(dauer_s * fps)):
        t = k / fps
        p, tiefe, nrm, teil, koerper, boden = P.rendere(kam, P.pose_bei(bew, t * tempo), st)
        img = P.bild_puppe(kam, tiefe, nrm, koerper, boden, st, list(p.values()))
        ys, xs = np.nonzero(koerper); g = max(xs.max() - xs.min(), ys.max() - ys.min())
        kps, sc = rtm(img[..., ::-1])
        kp = kps[int(np.argmax(sc[:, :17].mean(1))), :17].astype(float)
        ist.append(merkmal(kp, g))
        # Soll mit dem vorgesehenen Tempo
        p0 = P.punkte(P.pose_bei(bew, t))
        uv, _ = P.coco_soll(kam, p0, np.full(tiefe.shape, np.inf))
        soll.append(merkmal(uv, g))
    return np.array(ist), np.array(soll)

def periode(x):
    x = x - x.mean(0)
    n = len(x); ac = np.array([np.sum(x[:n - L] * x[L:]) / (n - L) for L in range(n // 2)])
    ac /= ac[0]
    # erstes Maximum nach dem ersten Nulldurchgang, parabolisch verfeinert
    z = np.argmax(ac < 0); L = z + np.argmax(ac[z:])
    if 0 < L < len(ac) - 1:
        a, b, c = ac[L - 1], ac[L], ac[L + 1]; L = L + 0.5 * (a - c) / (a - 2 * b + c)
    return L / fps

for tempo in (1.0, 0.93):
    ist, soll = serie(tempo, 2.6 * T)
    per = periode(ist)
    # Versatz: mittlere Abweichung Ist gegen verschobenes Soll
    lags = range(-int(0.5 * fps), int(0.5 * fps) + 1)
    fehler = [np.mean(np.linalg.norm(ist[max(0, l):len(ist) + min(0, l)] - soll[max(0, -l):len(soll) - max(0, l)], axis=1)) for l in lags]
    print(f'{name}: Tempo-Faktor {tempo}: Soll-Periode {T:.2f}s, erwartet {T/tempo:.2f}s, gemessen {per:.2f}s ({(per/T-1)*100:+.1f} %), bester Versatz {list(lags)[int(np.argmin(fehler))]/fps:+.2f}s')
