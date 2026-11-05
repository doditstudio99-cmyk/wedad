"""Builds the music bed and sound effects for the DODIT Studio reels promo.

Everything is synthesized here (no samples or licensed music), so the files
are safe to use in a paid Facebook ad. Output goes to public/dodit-promo/.

    python3 promo/make_audio.py
"""
import os
import wave

import numpy as np

SR = 44100
BPM = 120
BEAT = 60 / BPM
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "dodit-promo")
rng = np.random.default_rng(7)


def write(name, x):
    x = np.clip(x, -1, 1)
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    data = (x * 32767).astype("<i2")
    with wave.open(os.path.join(OUT, name), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


def t(sec):
    return np.arange(int(sec * SR)) / SR


def lowpass(x, cutoff):
    # one-pole low-pass, good enough for noise shaping
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y


def kick():
    tt = t(0.45)
    freq = 45 + 110 * np.exp(-tt * 28)
    phase = 2 * np.pi * np.cumsum(freq) / SR
    return np.sin(phase) * np.exp(-tt * 7) * 0.95


def snare():
    tt = t(0.25)
    noise = rng.uniform(-1, 1, len(tt))
    body = np.sin(2 * np.pi * 190 * tt) * np.exp(-tt * 30)
    return (noise * np.exp(-tt * 18) * 0.45 + body * 0.35)


def hat(open_=False):
    tt = t(0.18 if open_ else 0.05)
    noise = rng.uniform(-1, 1, len(tt))
    hp = noise - lowpass(noise, 7000)
    return hp * np.exp(-tt * (25 if open_ else 90)) * 0.35


def bass_note(freq, dur):
    tt = t(dur)
    saw = 2 * ((tt * freq) % 1) - 1
    sub = np.sin(2 * np.pi * freq * tt)
    env = np.minimum(1, tt * 200) * np.exp(-tt * 2.5)
    return (lowpass(saw, 400) * 0.5 + sub * 0.6) * env * 0.5


def place(buf, sample, at):
    i = int(at * SR)
    j = min(len(buf), i + len(sample))
    if i < len(buf):
        buf[i:j] += sample[: j - i]


def music(total):
    buf = np.zeros(int(total * SR))
    k, s, h, ho = kick(), snare(), hat(), hat(True)
    # A minor-ish driving progression (Am - F - C - G), one bar each
    roots = [55.0, 43.65, 65.41, 49.0]
    bars = int(total / (4 * BEAT)) + 1
    for bar in range(bars):
        start = bar * 4 * BEAT
        intro = bar < 2  # first 4 seconds: lighter, tension build
        for b in range(4):
            bt = start + b * BEAT
            if not intro or b in (0, 2):
                place(buf, k, bt)
            if not intro and b in (1, 3):
                place(buf, s, bt)
            for e in range(4):
                place(buf, h if e != 2 else ho, bt + e * BEAT / 4)
            if not intro:
                place(buf, bass_note(roots[bar % 4], BEAT * 0.45), bt)
                place(buf, bass_note(roots[bar % 4], BEAT * 0.3), bt + BEAT * 0.75)
    # pad: soft chord stabs for a premium feel
    pad = np.zeros_like(buf)
    for bar in range(bars):
        root = roots[bar % 4] * 4
        tt = t(4 * BEAT)
        chord = sum(np.sin(2 * np.pi * root * r * tt) for r in (1, 1.26, 1.5))
        env = np.minimum(1, tt * 3) * np.minimum(1, (4 * BEAT - tt) * 3)
        place(pad, chord * env * 0.06, bar * 4 * BEAT)
    buf += pad
    # fade the very end
    fade = int(1.5 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)
    return buf / np.max(np.abs(buf)) * 0.8


def whoosh():
    tt = t(0.6)
    noise = rng.uniform(-1, 1, len(tt))
    sweep = np.zeros_like(noise)
    # sweep the cutoff up then down
    for lo, hi in ((0, len(tt) // 2), (len(tt) // 2, len(tt))):
        sweep[lo:hi] = lowpass(noise[lo:hi], 2500 if lo == 0 else 1200)
    env = np.sin(np.pi * tt / tt[-1]) ** 2
    return sweep * env * 1.6


def riser():
    tt = t(1.5)
    noise = rng.uniform(-1, 1, len(tt))
    tone = np.sin(2 * np.pi * np.cumsum(200 + 900 * (tt / tt[-1]) ** 2) / SR)
    env = (tt / tt[-1]) ** 2
    return (lowpass(noise, 3000) * 0.6 + tone * 0.25) * env


def impact():
    # cinematic boom: deep sine drop + noise burst + long tail
    tt = t(3.0)
    freq = 30 + 90 * np.exp(-tt * 9)
    boom = np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.exp(-tt * 1.4)
    noise = rng.uniform(-1, 1, len(tt))
    burst = lowpass(noise, 1800) * np.exp(-tt * 6) * 1.5
    return (boom + burst) / 1.8


def pop():
    tt = t(0.12)
    return np.sin(2 * np.pi * (900 - 4000 * tt) * tt) * np.exp(-tt * 40) * 0.6


def cash():
    # bright "ding" for price reveals
    tt = t(0.9)
    tone = sum(np.sin(2 * np.pi * f * tt) * a for f, a in ((1568, 0.5), (2093, 0.35), (3136, 0.15)))
    return tone * np.exp(-tt * 5) * 0.6


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    write("music.wav", music(44))
    write("whoosh.wav", whoosh())
    write("riser.wav", riser())
    write("impact.wav", impact())
    write("pop.wav", pop())
    write("ding.wav", cash())
    print("wrote audio to", os.path.abspath(OUT))
