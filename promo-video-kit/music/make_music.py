"""Original, synthesized music + SFX for a promo, locked to the same beat grid as src/timeline.ts.

usage: python3 music/make_music.py data/desk.json public/music/desk.wav
"""
import json, sys
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt, fftconvolve

BEATS = {"hook": 4, "item": 5, "predrop": 2, "top": 6, "end": 5}  # keep in sync with timeline.ts
SR = 44100

cfg = json.load(open(sys.argv[1]))
out_path = sys.argv[2]
brand, bpm, n_items = cfg["brand"], cfg["bpm"], len(cfg["items"])
B = 60.0 / bpm

# section starts in beats
secs, b = [], 0
def push(kind, beats):
    global b
    secs.append((kind, b, beats)); b += beats
push("hook", BEATS["hook"])
for _ in range(n_items - 1): push("item", BEATS["item"])
push("predrop", BEATS["predrop"]); push("top", BEATS["top"]); push("end", BEATS["end"])
TOTAL_BEATS = b
DUR = TOTAL_BEATS * B + 1.5
N = int(DUR * SR)
music = np.zeros(N); drums = np.zeros(N); sfx = np.zeros(N)
rng = np.random.default_rng(11)
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
tt = lambda d: np.arange(int(d * SR)) / SR
def add(buf, t, w):
    s = int(t * SR)
    if s >= N or s < 0: return
    e = min(N, s + len(w)); buf[s:e] += w[:e - s]
def hp(f): return butter(2, f, 'hp', fs=SR, output='sos')
def bp(lo, hi): return butter(2, [lo, hi], 'bp', fs=SR, output='sos')
HP4K, HP7K, BPC = hp(4000), hp(7000), bp(900, 3000)

# ---------- instruments ----------
def kick(t, v=1.0, punch=110):
    x = tt(0.35); f = 45 + punch * np.exp(-x * 30)
    add(drums, t, v * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 9))
def clap(t, v=0.5):
    x = tt(0.2); add(drums, t, v * sosfilt(BPC, rng.standard_normal(len(x))) * np.exp(-x * 22))
def hat(t, v=0.15, d=70):
    x = tt(0.06); add(drums, t, v * sosfilt(HP4K, rng.standard_normal(len(x))) * np.exp(-x * d))
def snare(t, v=0.35):
    x = tt(0.12); add(drums, t, v * (sosfilt(BPC, rng.standard_normal(len(x))) + 0.4 * np.sin(2 * np.pi * 200 * x)) * np.exp(-x * 30))
def saw(f, x, nh=10):
    return sum(np.sin(2 * np.pi * f * k * x) / k for k in range(1, nh + 1) if f * k < 12000)
def tone(m, t, d, v, kind):
    x = tt(d + 0.5); f = hz(m); a = np.minimum(x / 0.004, 1)
    if kind == "rhodes":
        w = (np.sin(2 * np.pi * f * x) + 0.35 * np.sin(2 * np.pi * 2 * f * x) * np.exp(-x * 4)) * (1 + 0.15 * np.sin(2 * np.pi * 5 * x)) * np.exp(-x * 2.2)
    elif kind == "glock":
        w = (np.sin(2 * np.pi * f * x) + 0.5 * np.sin(2 * np.pi * 2.76 * f * x) * np.exp(-x * 6)) * np.exp(-x * 3)
    elif kind == "marimba":
        w = (np.sin(2 * np.pi * f * x) + 0.4 * np.sin(2 * np.pi * 4 * f * x) * np.exp(-x * 25)) * np.exp(-x * 7)
    elif kind == "pluck":
        w = saw(f, x, 8) * np.exp(-x * 9) * 0.6
    elif kind == "stab":
        w = (saw(f * 1.004, x, 7) + saw(f * 0.996, x, 7)) / 2 * np.exp(-x * 6)
    else:  # pad-ish sine
        w = np.sin(2 * np.pi * f * x) * np.exp(-x * 1.5)
    rel = np.clip(1 - (x - d) / 0.25, 0, 1)
    add(music, t, v * a * w * np.where(x > d, rel, 1))
def bass(m, t, d, v=0.35, grit=0.3):
    x = tt(d); env = np.minimum(x / 0.005, 1) * np.clip((d - x) / 0.03, 0, 1)
    add(music, t, v * env * (np.sin(2 * np.pi * hz(m) * x) + grit * saw(hz(m), x, 5)))
def riser(t0, t1, v=1.0):
    x = tt(t1 - t0); p = x / (t1 - t0)
    n = sosfilt(hp(1500), rng.standard_normal(len(x))) * 0.25 * p ** 2
    add(music, t0, v * (n + 0.08 * p * np.sin(2 * np.pi * np.cumsum(300 + 1500 * p ** 2) / SR)))
def impact(t, v=1.0):
    kick(t, 1.2); x = tt(1.6)
    add(drums, t, v * 0.3 * sosfilt(hp(2500), rng.standard_normal(len(x))) * np.exp(-x * 3.5))
    add(music, t, v * 0.5 * np.sin(2 * np.pi * 41 * x) * np.exp(-x * 2.5))
def jingle(t, v=0.12):
    for k in range(3):
        x = tt(0.08); add(drums, t + k * 0.012, v * sosfilt(HP7K, rng.standard_normal(len(x))) * np.exp(-x * 45))
def crackle():
    pops = rng.random(N) < 0.0004
    add(music, 0, sosfilt(hp(2000), pops * rng.standard_normal(N)) * 0.25 + rng.standard_normal(N) * 0.004)

# ---------- brand presets ----------
P = {
    "desk": dict(lead="rhodes", chord="rhodes", key=57, prog=[[57, 60, 64, 67], [53, 57, 60, 64], [60, 64, 67, 71], [55, 59, 62, 64]], roots=[45, 41, 48, 43],
                 mel=[(0, 76), (0.5, 79), (1.5, 76), (2, 74), (3, 72)], swing=0.0),
    "xmas": dict(lead="glock", chord="stab", key=60, prog=[[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]], roots=[48, 45, 41, 43],
                 mel=[(0, 76), (0.5, 76), (1, 76), (2, 76), (2.5, 76), (3, 76)], swing=0.08),
    "pet": dict(lead="marimba", chord="marimba", key=65, prog=[[65, 69, 72], [60, 64, 67], [62, 65, 69], [58, 62, 65]], roots=[41, 36, 38, 34],
                mel=[(0, 77), (0.5, 79), (1, 81), (1.5, 84), (2, 81), (3, 77), (3.5, 79)], swing=0.06),
    "home": dict(lead="pluck", chord="stab", key=62, prog=[[62, 65, 69], [58, 62, 65], [60, 64, 67], [57, 61, 64]], roots=[38, 34, 36, 33],
                 mel=[(0, 74), (0.25, 77), (0.5, 81), (0.75, 77), (1, 74), (2, 72), (2.25, 76), (2.5, 79), (3, 76)], swing=0.0),
}[brand]
if brand == "xmas":  # Jingle-adjacent but original: repeated-note figure then a turn
    P["mel"] = [(0, 76), (0.5, 76), (1, 79), (1.5, 72), (2, 74), (3, 76)]

def sw(i):  # swing offset for off-beat 8ths
    return P["swing"] * B if i % 2 else 0

def groove(b0, b1, lift=0):
    beat = b0
    while beat < b1 - 1e-6:
        t = beat * B; bi = int(round(beat)); bar = (bi // 4) % 4
        kick(t, 0.95 if brand != "desk" else 0.85)
        if bi % 2 == 1: clap(t, 0.45 if brand != "desk" else 0.3)
        for k in range(2): hat(t + k * B / 2 + sw(k), 0.13 if k else 0.06)
        if brand in ("xmas",): jingle(t + B / 2 + sw(1))
        if brand == "home":
            for k in range(4): tone(P["prog"][bar][k % 3] + 12 * (k == 3) + lift, t + k * B / 4, B / 4, 0.07, "pluck")
        if brand == "pet" and bi % 2 == 0: tone(P["prog"][bar][1] + 12, t + B / 2 + sw(1), B / 2, 0.08, "marimba")
        bass(P["roots"][bar], t + (B / 2 if brand != "desk" else 0), B / 2 * (0.9 if brand != "desk" else 1.8), 0.32 if brand != "desk" else 0.4, 0.15 if brand in ("desk", "pet") else 0.35)
        if bi % 4 == 0:
            for m in P["prog"][bar]: tone(m + lift, t, B * (2 if brand == "desk" else 0.4), 0.06 if brand == "desk" else 0.05, P["chord"])
        beat += 1
    # melody on 4-beat phrases
    ph = b0
    while ph < b1 - 1e-6:
        for off, m in P["mel"]:
            if ph + off < b1: tone(m + lift, (ph + off) * B + (sw(1) if (off * 2) % 2 else 0), B * 0.45, 0.11 if lift else 0.09, P["lead"])
        ph += 4

# ---------- brand SFX ----------
def click(t, v=0.25):
    if brand == "desk":   # mechanical key
        x = tt(0.03); add(sfx, t, v * (sosfilt(bp(2000, 6000), rng.standard_normal(len(x))) * np.exp(-x * 200) + 0.5 * np.sin(2 * np.pi * 180 * x) * np.exp(-x * 120)))
    elif brand == "home":  # UI tick
        x = tt(0.03); add(sfx, t, v * 0.6 * np.sin(2 * np.pi * 2400 * x) * np.exp(-x * 160))
    elif brand == "pet":   # woodblock
        x = tt(0.05); add(sfx, t, v * 0.7 * np.sin(2 * np.pi * 1100 * x) * np.exp(-x * 90))
    else:                  # tiny bell
        x = tt(0.08); add(sfx, t, v * 0.35 * np.sin(2 * np.pi * 3520 * x) * np.exp(-x * 60))
def stamp(t):
    if brand == "desk":
        x = tt(0.18); add(sfx, t, 0.7 * np.sin(2 * np.pi * np.cumsum(140 + 200 * np.exp(-x * 40)) / SR) * np.exp(-x * 18)); click(t, 0.4)
    elif brand == "xmas":
        x = tt(1.2); add(sfx, t, 0.35 * (np.sin(2 * np.pi * 1568 * x) + 0.5 * np.sin(2 * np.pi * 1568 * 2.76 * x) * np.exp(-x * 6)) * np.exp(-x * 3)); jingle(t, 0.25)
    elif brand == "pet":
        x = tt(0.25); add(sfx, t, 0.4 * np.sin(2 * np.pi * np.cumsum(600 + 900 * x / 0.25) / SR) * np.exp(-x * 10))
    else:
        for k, f in enumerate([1600, 2400]):
            x = tt(0.09); add(sfx, t + k * 0.07, 0.3 * np.sin(2 * np.pi * f * x) * np.exp(-x * 30))
def count_roll(t0, dur):
    n = 10
    for i in range(n): click(t0 + dur * (i / n) ** 0.8, 0.12 + 0.1 * i / n)
    x = tt(0.5); add(sfx, t0 + dur, 0.22 * np.sin(2 * np.pi * hz(P["key"] + 24) * x) * np.exp(-x * 8))
def whoosh(t, d=0.3, v=0.25):
    x = tt(d); p = x / d
    add(sfx, t, v * sosfilt(bp(500, 4000), rng.standard_normal(len(x))) * np.sin(np.pi * p) ** 2)
def type_clicks(t0, dur, chars):
    n = max(4, min(14, chars // 2))
    for i in range(n): click(t0 + dur * i / n, 0.16)

# ---------- arrange ----------
items_sorted = sorted(cfg["items"], key=lambda it: -it["rank"])
idx = 0
for kind, s, beats in secs:
    t = s * B
    if kind == "hook":
        for off, lvl in [(0, 0.9), (0.5, 1.0), (1.5, 1.0)]:
            kick(t + off * B, lvl); tone(P["key"] + 12, t + off * B, 0.3, 0.12, P["lead"]); stab_m = P["prog"][0]
            for m in stab_m: tone(m, t + off * B, 0.25, 0.05, P["chord"])
        type_clicks(t + 2.5 * B, B, len(cfg["hook"]["sub"]))
        for k in range(4): hat(t + (2 + k * 0.5) * B, 0.1)
        riser(t + 2 * B, t + 4 * B, 0.7)
    elif kind in ("item", "top"):
        it = items_sorted[idx]; idx += 1
        top = kind == "top"
        impact(t, 1.0 if top else 0.6) if top else (kick(t, 1.1), whoosh(t - 0.15, 0.3, 0.3))
        groove(s, s + beats - (0.0 if not top else 0), lift=12 if top else 0)
        c = t + B  # card starts after the rank slam beat
        whoosh(c - 0.1, 0.25, 0.2); type_clicks(c + 4 / 30, 0.8 * B, len(it["name"]))
        stamp(c + B)
        count_roll(c + 2 * B, 0.85 * B)
        click(c + 3 * B, 0.2)
    elif kind == "predrop":
        for k in range(int(beats * 4)):
            if k * 0.25 < beats - 0.25: snare(t + k * B / 4, 0.18 + 0.25 * k / (beats * 4))
        riser(t, t + (beats - 0.25) * B, 1.0)
    elif kind == "end":
        groove(s, s + beats - 1)
        impact(t + (beats - 1) * B, 0.8)
        for m in P["prog"][0]: tone(m + 12, t + (beats - 1) * B, 1.2, 0.09, P["chord"])
        tone(P["key"] + 24, t + (beats - 1) * B, 1.2, 0.12, P["lead"])

if brand == "desk": crackle()

# sidechain pump on music
pump = np.ones(N); x = tt(B); shape = 1 - 0.4 * np.exp(-x * 14)
for kind, s, beats in secs:
    if kind in ("item", "top", "end"):
        for k in range(beats):
            st = int((s + k) * B * SR); e = min(N, st + len(shape)); pump[st:e] = np.minimum(pump[st:e], shape[:e - st])
music *= pump
ir_t = tt(1.2 if brand != "home" else 0.8); ir = rng.standard_normal(len(ir_t)) * np.exp(-ir_t * 5) * 0.02
wet = fftconvolve(music + sfx * 0.3, ir)[:N]
mix = drums * 0.9 + music * 0.75 + sfx * 0.9 + wet * 0.5
mix = np.tanh(mix * 1.3) / np.tanh(1.3)
# hard silence for the last quarter beat before the #1 drop
for kind, s, beats in secs:
    if kind == "predrop":
        g0, g1 = int((s + beats - 0.25) * B * SR), int((s + beats) * B * SR)
        mix[g0:g1] *= np.clip(1 - np.arange(g1 - g0) / (0.015 * SR), 0, 1)
tsec = np.arange(N) / SR
mix *= np.clip((DUR - tsec) / 0.5, 0, 1)
mix /= np.abs(mix).max() / 0.95
st = np.stack([mix, np.concatenate([np.zeros(90), mix[:-90]])], 1)
wavfile.write(out_path, SR, (st * 32767).astype(np.int16))
print(out_path, f"{TOTAL_BEATS} beats @ {bpm} bpm = {TOTAL_BEATS * B:.2f}s")
