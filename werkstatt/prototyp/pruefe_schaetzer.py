"""Prüft Posen-Schätzer gegen die Soll-Punkte der Puppe — alle Schlüsselbilder der Bibliothek."""
import sys, json, time, collections
import numpy as np
sys.path.insert(0, sys.argv[1])
import puppe as P

SIG = np.array([.26, .25, .25, .35, .35, .79, .79, .72, .72, .62, .62, 1.07, 1.07, .87, .87, .89, .89]) / 10.0
TAUSCH = [0, 2, 1, 4, 3, 6, 5, 8, 7, 10, 9, 12, 11, 14, 13, 16, 15]

def oks(ist, soll, flaeche, maske=None):
    d2 = ((ist - soll) ** 2).sum(-1)
    e = d2 / (2 * flaeche * (2 * SIG) ** 2)
    m = np.ones(17, bool) if maske is None else maske
    return float(np.exp(-e)[m].mean())

def kategorie(bew):
    ps = [P.punkte(x['pose']) for x in bew['ablauf']]
    beck = max(p['becken'][1] for p in ps); brust = min(p['brust'][1] for p in ps)
    hand = any(min(p['hand_l'][1], p['hand_r'][1]) < 0.1 for p in ps)
    knie = any(min(p['knie_l'][1], p['knie_r'][1]) < 0.1 for p in ps)
    if beck > 0.85: return 'stehend'
    if brust < 0.4 and beck < 0.4: return 'liegend'
    if hand and knie and beck > 0.4: return 'vierfuessler'
    return 'stuetz/sitz/knie'

def rot(img, k):
    return np.ascontiguousarray(np.rot90(img, k))

def zurueck(kp, k, w, h):
    # Punkte aus einem um k*90° (gegen den Uhrzeigersinn, np.rot90) gedrehten Bild zurückrechnen
    kp = kp.copy()
    for _ in range(k % 4):
        # rot90 ccw: neues (x', y') = (y, W-1-x)  =>  x = W-1-y', y = x'
        x, y = kp[:, 0].copy(), kp[:, 1].copy()
        kp[:, 0], kp[:, 1] = (w - 1) - y, x
        w, h = h, w
    return kp

def main():
    from rtmlib import Wholebody
    import mediapipe as mp
    from mediapipe.tasks.python import vision, BaseOptions
    rtm = Wholebody(mode='balanced', backend='onnxruntime', device='cpu')
    lm = vision.PoseLandmarker.create_from_options(vision.PoseLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=sys.argv[2]), running_mode=vision.RunningMode.IMAGE, num_poses=1))
    MP17 = [0, 2, 5, 7, 8, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]

    def lauf_rtm(img):
        kps, sc = rtm(img[..., ::-1])  # rtmlib erwartet BGR
        if len(kps) == 0: return None, 0.0
        i = int(np.argmax(sc[:, :17].mean(1)))
        return kps[i, :17].astype(float), float(sc[i, :17].mean())

    def lauf_mp(img):
        r = lm.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(img)))
        if not r.pose_landmarks: return None, 0.0
        L = r.pose_landmarks[0]
        h, w = img.shape[:2]
        kp = np.array([[L[j].x * w, L[j].y * h] for j in MP17])
        return kp, float(np.mean([L[j].visibility for j in MP17]))

    erg = collections.defaultdict(list)
    zeiten = collections.defaultdict(list)
    for bew in P.BIB:
        kat = kategorie(bew)
        kam = P.Kamera(bew); st = kam.strahlen()
        for i, bild in enumerate(bew['ablauf']):
            p, tiefe, nrm, teil, koerper, boden = P.rendere(kam, bild['pose'], st)
            img = P.bild_puppe(kam, tiefe, nrm, koerper, boden, st, list(p.values()))
            soll, verdeckt = P.coco_soll(kam, p, tiefe)
            ys, xs = np.nonzero(koerper)
            bw, bh = xs.max() - xs.min(), ys.max() - ys.min()
            flaeche = bw * bh * 0.53  # COCO: Fläche der Segmentierung, grob 0,53 der Box
            gross = max(bw, bh)
            for name, f in (('rtmw', lauf_rtm), ('mediapipe', lauf_mp)):
                for tta in (False, True):
                    t0 = time.time()
                    kandidaten = []
                    for k in ((0, 1, 3) if tta else (0,)):
                        kp, conf = f(rot(img, k))
                        if kp is not None:
                            kandidaten.append((conf, zurueck(kp, k, img.shape[1], img.shape[0])))
                    zeiten[(name, tta)].append(time.time() - t0)
                    key = (name, 'TTA' if tta else 'ohne', kat)
                    if not kandidaten:
                        erg[key].append(dict(fehlt=1)); continue
                    kp = max(kandidaten, key=lambda c: c[0])[1]
                    d = np.linalg.norm(kp - soll, axis=1)
                    o = oks(kp, soll, flaeche); o_t = oks(kp[TAUSCH], soll, flaeche)
                    erg[key].append(dict(fehlt=0, pck10=float((d < 0.1 * gross).mean()), pck20=float((d < 0.2 * gross).mean()),
                                         oks=o, tausch=int(o_t > o + 0.05), pck10_sichtbar=float((d < 0.1 * gross)[~np.array(verdeckt)].mean())))
    print(f"{'Schätzer':10s} {'TTA':5s} {'Kategorie':17s} {'n':>3s} {'fehlt':>5s} {'PCK@.1':>7s} {'PCK@.2':>7s} {'PCK.1sicht':>10s} {'OKS':>5s} {'OKS>.75':>8s} {'L/R-Tausch':>10s}")
    for key in sorted(erg):
        v = erg[key]; ok = [x for x in v if not x['fehlt']]
        m = lambda k: np.mean([x[k] for x in ok]) if ok else float('nan')
        print(f"{key[0]:10s} {key[1]:5s} {key[2]:17s} {len(v):3d} {sum(x['fehlt'] for x in v):5d} {m('pck10'):7.2f} {m('pck20'):7.2f} {m('pck10_sichtbar'):10.2f} {m('oks'):5.2f} {np.mean([x['oks']>0.75 for x in ok]) if ok else float('nan'):8.2f} {sum(x['tausch'] for x in ok):10d}")
    for k, v in zeiten.items():
        print('Zeit', k, f'{np.mean(v):.2f}s/Bild')

main()
