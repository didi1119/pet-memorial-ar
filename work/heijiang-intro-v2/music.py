"""黑醬・在身邊 二版配樂。F 大調、每分鐘 60 拍（一拍＝一秒），對齊 film.js 的場景時間。
MIDI → fluidsynth（MuseScore General 音色）→ numpy 加入音效、混音、母帶。
執行：python3 music.py  → out/score.mid、out/music.wav
"""
import subprocess, numpy as np, mido
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SF = '/usr/share/sounds/sf3/MuseScore_General_Full.sf3'
OUT = 'out'
LEN = 78.0
N = {}
for o in range(1, 8):
    for name, semi in [('C', 0), ('Db', 1), ('D', 2), ('Eb', 3), ('E', 4), ('F', 5), ('Gb', 6), ('G', 7), ('Ab', 8), ('A', 9), ('Bb', 10), ('B', 11)]:
        N[f'{name}{o}'] = 12 * (o + 1) + semi

ev = []  # (time, ch, kind, a, b)
def note(t, n, d, v, ch=0):
    ev.append((t, ch, 'on', N[n] if isinstance(n, str) else n, int(v)))
    ev.append((t + d, ch, 'off', N[n] if isinstance(n, str) else n, 0))
def cc(t, ch, num, val): ev.append((t, ch, 'cc', num, int(val)))
def prog(ch, p): ev.append((0, ch, 'prog', p, 0))

PIANO, STR, CEL, PIZ, GLK = 0, 1, 2, 3, 4
prog(PIANO, 0); prog(STR, 49); prog(CEL, 8); prog(PIZ, 45); prog(GLK, 9)
for ch, vol, pan in [(PIANO, 100, 64), (STR, 82, 70), (CEL, 70, 50), (PIZ, 72, 78), (GLK, 60, 58)]:
    cc(0, ch, 7, vol); cc(0, ch, 10, pan); cc(0, ch, 91, 70); cc(0, ch, 93, 20)
cc(0, STR, 11, 0)

# 和弦（根音、和弦音）
CH = {
    'F': ('F2', ['C3', 'A3', 'F4']), 'Fmaj7': ('F2', ['C3', 'E3', 'A3']), 'F/A': ('A2', ['F3', 'C4']), 'Fadd9': ('F2', ['C3', 'G3', 'A3']),
    'Bb': ('Bb1', ['F2', 'D3', 'F3']), 'Bbmaj7': ('Bb1', ['F2', 'A2', 'D3']), 'Bbadd9': ('Bb1', ['F2', 'C3', 'D3']), 'Bb/F': ('F2', ['Bb2', 'D3', 'F3']),
    'C': ('C2', ['G2', 'E3', 'G3']), 'C/E': ('E2', ['G2', 'C3', 'E3']), 'Csus': ('C2', ['G2', 'F3', 'G3']),
    'Dm': ('D2', ['A2', 'F3', 'A3']), 'Dm7': ('D2', ['A2', 'C3', 'F3']), 'Gm7': ('G1', ['D2', 'F2', 'Bb2']), 'Am7': ('A1', ['E2', 'G2', 'C3']),
}
def pad(t, d, chord, v=46, up=0):
    r, tones = CH[chord]
    note(t, r, d, v + 4)
    for i, n in enumerate(tones):
        note(t + .03 * (i + 1), N[n] + up, d - .05, v - 6 - i * 2)
def arp(t, d, chord, v=44, step=.5, pattern=(0, 1, 2, 3, 2, 1)):
    r, tones = CH[chord]
    seq = [r] + tones
    k = 0; x = t
    while x < t + d - 1e-6:
        n = seq[pattern[k % len(pattern)] % len(seq)]
        note(x, n, min(step * 2.2, t + d - x + .4), v - (6 if k % 2 else 0)); k += 1; x += step
def strings(t, d, chord, lvl=70, fade_in=1.5, fade_out=1.5, up=12):
    r, tones = CH[chord]
    for n in [N[r] + 12] + [N[x] + up for x in tones]:
        note(t, n, d, 70, STR)
    steps = 12
    for i in range(steps + 1):
        u = i / steps
        cc(t + u * fade_in, STR, 11, lvl * u)
        cc(t + d - fade_out + u * fade_out, STR, 11, lvl * (1 - u))
def pedal(t0, t1, step=None):
    cc(t0, PIANO, 64, 127); cc(t1, PIANO, 64, 0)
def mel(lst, v=60, ch=PIANO):
    for t, n, d, *rest in lst:
        note(t, n, d, rest[0] if rest else v, ch)

# ---- A 夜裡（0–8）
pad(0.0, 4.2, 'Fmaj7', 36); pad(4.0, 4.4, 'Dm7', 34)
mel([(1.0, 'C6', .8, 44), (1.8, 'A5', .8, 38), (2.6, 'F5', 1.4, 40), (4.5, 'E5', .8, 38), (5.3, 'D5', .8, 36), (6.1, 'A5', 1.6, 42)], ch=CEL)
mel([(2.9, 'C6', .3, 30), (3.1, 'A5', .5, 26)], ch=CEL)            # 小貓探頭
pedal(0, 3.95); pedal(4.0, 7.95)

# ---- B 群組（8–14）：「我！」在 12.3 落在 F
arp(8.0, 2.0, 'Bbadd9', 40); arp(10.0, 2.3, 'Csus', 40)
pad(12.3, 1.7, 'F', 50); arp(14.0 - .01, .01, 'F', 1)
mel([(8.6, 'F5', .5, 48), (9.1, 'D5', .5, 44), (9.6, 'C5', .9, 46), (10.6, 'D5', .5, 46), (11.1, 'E5', .5, 46), (11.6, 'G5', .7, 50), (12.3, 'A5', 1.4, 64), (12.3, 'F5', 1.4, 44)])
mel([(12.5, 'C6', .4, 36), (12.75, 'F6', .9, 34)], ch=CEL)
pedal(8, 9.95); pedal(10, 12.25); pedal(12.3, 13.95)

# ---- C 77 說：我（14–20）主題第一次
arp(14.0, 2.0, 'Gm7', 42); arp(16.0, 2.0, 'Csus', 42); pad(17.95, 2.1, 'F', 46); arp(18.6, 1.4, 'F', 38)
mel([(14.0, 'D5', 1.0, 58), (15.0, 'C5', .5, 52), (15.5, 'Bb4', .5, 50), (16.0, 'A4', 1.0, 54), (17.0, 'C5', 1.0, 56), (18.0, 'F5', 1.5, 64), (19.5, 'E5', .5, 50)])
pedal(14, 15.95); pedal(16, 17.9); pedal(18, 19.95)

# ---- D 長大（20–26）
arp(20.0, 2.0, 'Bb', 42, .5, (0, 1, 2, 3)); arp(22.0, 2.0, 'C', 42, .5, (0, 1, 2, 3)); arp(24.0, 1.0, 'Dm', 42, .5, (0, 1)); arp(25.0, 1.0, 'C/E', 40, .5, (0, 2))
mel([(20.5, 'F5', .5), (21.0, 'D5', .5), (21.5, 'F5', .5), (22.0, 'G5', .5, 62), (22.5, 'E5', .5), (23.0, 'G5', .5), (23.5, 'C6', .5, 56), (24.0, 'A5', 1.0, 64), (25.0, 'G5', .5), (25.5, 'E5', .5)], v=54)
pedal(20, 21.95); pedal(22, 23.95); pedal(24, 24.95); pedal(25, 25.95)

# ---- E 早上六點（26–31）
pad(26.0, 2.0, 'F', 40); pad(28.0, 2.0, 'Bb/F', 40); pad(30.0, 1.0, 'C', 40)
for i, t in enumerate([26.5, 27.0, 27.5, 28.0, 28.5]):   # 踩踩
    note(t, ['C5', 'A4', 'C5', 'D5', 'F5'][i], .22, 46)
mel([(29.1, 'A5', .6, 56), (29.8, 'G5', .4, 48), (30.2, 'E5', .4, 46), (30.6, 'G5', .4, 48)])
pedal(26, 27.95); pedal(28, 29.95); pedal(30, 30.9)

# ---- F 紙箱（31–35）：撥弦
for t, n in [(31.0, 'F2'), (31.5, 'C3'), (32.2, 'Bb2'), (33.0, 'G2'), (33.5, 'D3'), (34.0, 'C3'), (34.5, 'G2')]: note(t, n, .4, 70, PIZ)
mel([(31.5, 'A4', .2, 44), (31.75, 'C5', .2, 44), (32.2, 'F5', .5, 66), (32.2, 'D5', .5, 50), (32.7, 'D5', .2, 44), (33.0, 'Bb4', .4, 46), (33.5, 'D5', .4, 46), (34.0, 'E5', .4, 50), (34.5, 'G5', .4, 52)])
mel([(32.25, 'F6', .3, 40)], ch=CEL)

# ---- G 門口（35–40）
for t, n in [(35.0, 'F2'), (35.5, 'C3')]: note(t, n, .4, 60, PIZ)
pad(36.0, 1.5, 'F', 46); pad(37.5, 1.0, 'Am7', 42); pad(38.5, 1.0, 'Bb', 42); pad(39.5, .5, 'C', 42)
strings(36.0, 4.2, 'F', 52, 1.2, 1.0)
mel([(36.0, 'A5', 1.0, 62), (37.0, 'G5', .5, 54), (37.5, 'E5', .5, 52), (38.0, 'C5', .5, 50), (38.5, 'F5', .5, 54), (39.0, 'D5', .5, 50), (39.5, 'E5', .5, 52)])
pedal(36, 37.45); pedal(37.5, 38.45); pedal(38.5, 39.45); pedal(39.5, 39.95)

# ---- H 領巾（40–45）
pad(40.0, 1.0, 'F', 42); pad(41.0, 1.0, 'Dm7', 42); arp(42.0, 1.0, 'Bb', 40, .25, (0, 1, 2, 3)); pad(43.0, 1.0, 'C', 44); pad(44.0, 1.0, 'C/E', 42)
strings(40.0, 5.0, 'Dm7', 46, 1.0, .8)
mel([(40.5, 'C5', .5, 50), (41.0, 'F5', .5, 56), (41.5, 'D5', .5, 50), (41.8, 'F5', .2, 46), (42.0, 'G5', .2, 48), (42.2, 'A5', .2, 50), (42.4, 'Bb5', .2, 52), (42.6, 'C6', .3, 54), (43.0, 'A5', 1.0, 62), (44.0, 'G5', .5, 54), (44.5, 'E5', .5, 52)])
mel([(43.15, 'F6', .4, 42), (43.3, 'C7', .5, 34)], ch=CEL)
pedal(40, 40.95); pedal(41, 41.95); pedal(42, 42.95); pedal(43, 43.95); pedal(44, 44.95)

# ---- I 婚禮（45–50.6）主題，弦樂撐起來
pad(45.0, 1.5, 'F', 52); pad(46.5, 1.0, 'C/E', 50); pad(47.5, 1.0, 'Dm', 50); pad(48.5, 1.0, 'Bb', 50); pad(49.5, 1.1, 'Gm7', 48)
for t in [45.0, 46.5, 47.5, 48.5, 49.5]:
    pass
strings(45.0, 5.7, 'F', 92, 1.6, .5)
mel([(45.0, 'A5', 1.0, 70), (46.0, 'G5', .5, 62), (46.5, 'F5', .5, 62), (47.0, 'E5', 1.0, 64), (48.0, 'D5', .5, 60), (48.5, 'F5', .5, 62), (49.0, 'A5', 1.0, 70), (50.0, 'G5', .6, 62)])
mel([(45.0, 'F4', 1.0, 44), (47.0, 'C4', 1.0, 42), (49.0, 'F4', 1.0, 44)])
pedal(45, 46.45); pedal(46.5, 47.45); pedal(47.5, 48.45); pedal(48.5, 49.45); pedal(49.5, 50.55)
# 閃光：鐘琴 + 懸掛和弦
note(50.6, 'C7', 1.6, 70, GLK); note(50.6, 'G6', 1.6, 50, GLK)
pad(50.6, 3.0, 'Bbmaj7', 44, 12); pedal(50.6, 54.9)

# ---- J 窗邊空了（51–57）：很少的音
mel([(52.6, 'D5', 1.2, 44), (54.0, 'C5', .9, 40), (55.2, 'A4', 1.6, 42)])
pad(55.0, 2.0, 'Am7', 34); pedal(55.0, 56.95)
strings(51.0, 6.0, 'Bbmaj7', 36, 2.0, 2.0)

# ---- K 沙發（57–64）主題輕輕回來
pad(57.0, 2.0, 'Dm', 40); pad(59.0, 2.0, 'Bb', 40); pad(61.0, 2.0, 'F/A', 40); pad(63.0, 1.0, 'Gm7', 38)
strings(57.0, 7.0, 'Dm', 58, 2.0, 1.0)
mel([(57.0, 'A4', 1.0, 50), (58.0, 'C5', .5, 48), (58.5, 'D5', 1.5, 54), (60.0, 'F5', 1.0, 56), (61.0, 'E5', .5, 50), (61.5, 'D5', .5, 50), (62.0, 'C5', 1.5, 54), (63.5, 'Bb4', .5, 46)])
pedal(57, 58.95); pedal(59, 60.95); pedal(61, 62.95); pedal(63, 63.95)

# ---- L 屋頂（64–68）往上走
arp(64.0, 1.5, 'Bb', 46, .25, (0, 1, 2, 3, 2, 1)); arp(65.5, 1.2, 'C', 46, .25, (0, 1, 2, 3, 2, 1)); pad(66.7, 1.3, 'Dm', 52)
strings(64.0, 4.0, 'Bb', 80, 1.0, .8)
mel([(64.0, 'D5', .5, 56), (64.5, 'F5', .5, 58), (65.0, 'A5', 1.0, 64), (66.0, 'G5', .4, 58), (66.4, 'E5', .3, 56), (66.7, 'F5', 1.3, 68), (66.7, 'D6', 1.3, 50)])
pedal(64, 65.45); pedal(65.5, 66.65); pedal(66.7, 67.95)

# ---- M 眨眼（68–71.5）
pad(68.0, 3.5, 'Bbmaj7', 36, 12); strings(68.0, 3.5, 'Bbmaj7', 50, 1.0, 1.0)
mel([(68.4, 'A5', 1.0, 48), (69.5, 'F5', 1.0, 44), (70.7, 'C6', .9, 46)])
pedal(68, 71.45)

# ---- N 片名（71.5–76）
pad(71.5, 5.5, 'Fadd9', 46); strings(71.5, 5.5, 'F', 60, 1.0, 3.5)
mel([(71.5, 'A5', 4.0, 54), (71.5, 'C5', 4.0, 40)])
mel([(72.6, 'C6', .8, 40), (73.4, 'A6', .8, 34), (74.2, 'F6', 1.6, 36)], ch=CEL)
pedal(71.5, 77.5)

# ---- 寫 MIDI
mid = mido.MidiFile(ticks_per_beat=480)
tr = mido.MidiTrack(); mid.tracks.append(tr)
tr.append(mido.MetaMessage('set_tempo', tempo=1000000, time=0))
order = {'prog': 0, 'cc': 1, 'off': 2, 'on': 3}
ev.sort(key=lambda e: (round(e[0] * 480), order[e[2]]))
last = 0
for t, ch, kind, a, b in ev:
    tick = max(0, round(t * 480)); dt = tick - last; last = tick
    if kind == 'on': tr.append(mido.Message('note_on', channel=ch, note=a, velocity=max(1, min(127, b)), time=dt))
    elif kind == 'off': tr.append(mido.Message('note_off', channel=ch, note=a, velocity=0, time=dt))
    elif kind == 'cc': tr.append(mido.Message('control_change', channel=ch, control=a, value=max(0, min(127, b)), time=dt))
    else: tr.append(mido.Message('program_change', channel=ch, program=a, time=dt))
mid.save(f'{OUT}/score.mid')

subprocess.run(['fluidsynth', '-ni', '-q', '-F', f'{OUT}/raw.wav', '-r', '48000', '-g', '0.55',
                '-o', 'synth.reverb.active=1', '-o', 'synth.reverb.room-size=0.72', '-o', 'synth.reverb.damp=0.35',
                '-o', 'synth.reverb.width=0.9', '-o', 'synth.reverb.level=0.55', '-o', 'synth.chorus.active=0', SF, f'{OUT}/score.mid'], check=True)

# ---- 音效與母帶
sr, x = wavfile.read(f'{OUT}/raw.wav'); x = x.astype(np.float32) / 32768.0
if x.ndim == 1: x = np.stack([x, x], 1)
n = int(LEN * sr)
x = np.pad(x, ((0, max(0, n - len(x))), (0, 0)))[:n]
rng = np.random.default_rng(3)
def at(t): return int(t * sr)
def lp(sig, f): return sosfilt(butter(4, f, 'low', fs=sr, output='sos'), sig)
def hp(sig, f): return sosfilt(butter(2, f, 'high', fs=sr, output='sos'), sig)
fx = np.zeros_like(x)
# 鑰匙聲（35.5）：幾顆小金屬片互相碰
for k, t0 in enumerate([35.45, 35.52, 35.61, 35.66, 35.78]):
    L = int(.45 * sr); tt = np.arange(L) / sr
    s = sum(np.sin(2 * np.pi * f * tt + rng.random() * 6) * a for f, a in [(4200 + 300 * k, 1), (6100 + 410 * k, .7), (7900 + 190 * k, .5), (9300 + 220 * k, .35)])
    s *= np.exp(-tt * (22 + 4 * k)) * .05
    i = at(t0); fx[i:i + L, 0] += s * .9; fx[i:i + L, 1] += s * 1.1
# 快門（50.6）
L = int(.12 * sr); tt = np.arange(L) / sr
cl = hp(rng.standard_normal(L), 1800) * np.exp(-tt * 70) * .09
cl2 = hp(rng.standard_normal(L), 1200) * np.exp(-tt * 90) * .06
i = at(50.58); fx[i:i + L] += cl[:, None]; j = at(50.66); fx[j:j + L] += cl2[:, None]
# 呼嚕聲（58.6–64.2）：很輕
L = at(64.2) - at(58.6); tt = np.arange(L) / sr
noise = lp(rng.standard_normal(L), 260)
purr = noise * (0.55 + 0.45 * np.sin(2 * np.pi * 23 * tt)) ** 2
breath = 0.6 + 0.4 * np.sin(2 * np.pi * tt / 2.2 - 1.2)
env = np.minimum(1, tt / 1.5) * np.minimum(1, (L / sr - tt) / 1.5)
purr = purr * breath * env * .05
i = at(58.6); fx[i:i + L, 0] += purr; fx[i:i + L, 1] += purr * .95
y = x + fx
# 很輕的房間底噪，讓安靜的地方不是死寂
amb = lp(rng.standard_normal((n, 2)).T, 900).T * .0007
y += amb
# 母帶：限幅（快攻慢放）把整體提到手機上聽得清楚的音量，再正規化
def limiter(sig, thresh=.12, rel=.18):
    from scipy.ndimage import maximum_filter1d
    look = int(.004 * sr)
    env = maximum_filter1d(np.max(np.abs(sig), axis=1), size=2 * look + 1)
    g = np.minimum(1.0, thresh / np.maximum(env, 1e-9))
    r = np.exp(-1 / (rel * sr)); gs = np.empty_like(g); cur = 1.0
    for i in range(len(g)):
        cur = g[i] if g[i] < cur else r * cur + (1 - r) * g[i]
        gs[i] = cur
    return sig * gs[:, None]
y = y / np.max(np.abs(y))
y = limiter(y, .22)
peak = np.max(np.abs(y)); y = y / peak * .9
fade = np.ones(n); fo = at(LEN - 2.5); fade[fo:] = np.linspace(1, 0, n - fo) ** 2
fade[:at(.3)] = np.linspace(0, 1, at(.3))
y *= fade[:, None]
wavfile.write(f'{OUT}/music.wav', sr, (np.clip(y, -1, 1) * 32767).astype(np.int16))
rms = [float(np.sqrt(np.mean(y[at(s):at(s + 1)] ** 2))) for s in range(int(LEN))]
print('peak', round(float(np.max(np.abs(y))), 3))
print(' '.join(f'{s}:{r:.3f}' for s, r in enumerate(rms)))
