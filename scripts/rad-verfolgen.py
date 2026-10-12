"""Hält die Zeitfahrerin aus Pexels 31000125 im Bild.

Die Drohne fliegt nicht exakt mit, die Fahrerin pendelt deshalb um ein
Zehntel der Bildbreite hin und her. Gesucht wird ihr Einteiler (Magenta, sonst
nichts im Bild hat die Farbe), zehnmal je Sekunde; geglättet über 0,5 s, damit
die Kamera ruhig mitzieht statt am Rumpf festzukleben. Ausgegeben wird ein
`crop`-Filter für ffmpeg, dessen x und y dieser Spur folgen.

Aufruf: python3 scripts/rad-verfolgen.py <4k-datei> <start-s> <dauer-s>
"""

import subprocess
import sys

import numpy as np

B, H = 960, 540
AUSSCHNITT = (2400, 1350)  # aus 3840×2160, also 1,6-fach vergrößert
ZIEL = (0.35, 0.40)  # wo der Rumpf im Ausschnitt steht: links, Blick nach rechts ins Bild


def spur(datei: str, start: float, dauer: float) -> list[tuple[float, float, float]]:
    roh = subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-ss", str(start - 0.2), "-t", str(dauer + 0.4),
         "-i", datei, "-vf", f"fps=10,scale={B}:{H}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        check=True, capture_output=True,
    ).stdout
    bilder = np.frombuffer(roh, np.uint8).reshape(-1, H, B, 3).astype(np.int16)
    punkte = []
    for i, bild in enumerate(bilder):
        r, g, b = bild[..., 0], bild[..., 1], bild[..., 2]
        maske = (r > 140) & (b > 90) & (g < 0.6 * r) & (g < 0.75 * b)
        maske[: int(H * 0.3)] = False  # Banner und Himmel
        ys, xs = np.nonzero(maske)
        if len(xs) < 50:
            continue
        # Um den Median herum, damit ein rosa Banner am Rand nicht mitzieht.
        nah = (abs(xs - np.median(xs)) < 120) & (abs(ys - np.median(ys)) < 120)
        punkte.append((i / 10 - 0.2, xs[nah].mean() / B, ys[nah].mean() / H))
    return punkte


def geglaettet(punkte):
    aus = []
    for i, (t, _, _) in enumerate(punkte):
        nachbarn = punkte[max(0, i - 2): i + 3]
        aus.append((t, *(sum(p[k] for p in nachbarn) / len(nachbarn) for k in (1, 2))))
    return aus


def ausdruck(werte):
    """Stückweise linear zwischen den Messpunkten, als verschachteltes if()."""
    expr = f"{werte[-1][1]:.1f}"
    for (t0, a), (t1, b) in reversed(list(zip(werte, werte[1:]))):
        expr = f"if(lt(t,{t1:.2f}),{a:.1f}+({b - a:.1f})*(t-({t0:.2f}))/{t1 - t0:.2f},{expr})"
    return expr


def main():
    datei, start, dauer = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
    cb, ch = AUSSCHNITT
    punkte = geglaettet(spur(datei, start, dauer))
    xs = [(t, min(max(x * 3840 - ZIEL[0] * cb, 0), 3840 - cb)) for t, x, _ in punkte]
    ys = [(t, min(max(y * 2160 - ZIEL[1] * ch, 0), 2160 - ch)) for t, _, y in punkte]
    print(f"crop={cb}:{ch}:'{ausdruck(xs)}':'{ausdruck(ys)}'")


if __name__ == "__main__":
    main()
