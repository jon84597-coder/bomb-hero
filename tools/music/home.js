// tools/music/home.js —— 爆爆英雄「營火與奶油木框」首頁主題曲
//
// 曲式：D 大調 / 68 BPM / 4-4 / 16 小節無縫循環（≈56.5s）
//   1-4   Gmaj7 A6 | F#m7 Bm7 → 鋼琴分解和弦獨奏，音樂盒點題
//   5-8   Gmaj7 A6 | Dmaj7 Dmaj7 → 主旋律進、貝斯與弦樂進
//   9-12  Em7 A7 | F#m7 Bm7 → 豎琴加入、旋律推到高點
//   13-16 Gmaj7 A6 | Dmaj7 A7sus4 → 鐘琴亮片、留白收尾接回開頭
//
// 混音架構：主奏匯流（乾、近）＋ 鋪底匯流（濕、遠）→ 共用一顆殘響，送量不同
// 產出：outputs/music/home.wav / .m4a / .ogg

const path = require('path');
const fs = require('fs');
const D = require('./dsp');

const BPM = 68;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const BARS = 16;
const LOOP_SEC = BARS * BAR;
const TAIL_SEC = 4.0;               // 殘響尾巴（最後折回開頭）

const P = 'salamander_hq';          // 鋼琴（48kHz 實錄、力度分層）
const S = 'string_ensemble_1';      // 弦樂鋪底
const B = 'acoustic_bass';          // 貝斯
const H = 'orchestral_harp';        // 豎琴
const M = 'music_box';              // 音樂盒
const G = 'glockenspiel';           // 鐘琴

// ---------- 和弦 ----------
const CH = {
  'G':   { lh: 'G2', rh: ['B3', 'D4', 'F#4'], st: ['G3', 'D4'],    bs: 'G2' },
  'A':   { lh: 'A2', rh: ['C#4', 'E4', 'F#4'], st: ['A3', 'E4'],   bs: 'A2' },
  'F#m': { lh: 'F#2', rh: ['A3', 'C#4', 'E4'], st: ['F#3', 'C#4'], bs: 'F#2' },
  'Bm':  { lh: 'B2', rh: ['D4', 'F#4', 'A4'], st: ['B3', 'F#4'],   bs: 'B2' },
  'Em':  { lh: 'E2', rh: ['G3', 'B3', 'D4'],  st: ['E3', 'B3'],    bs: 'E2' },
  'A7':  { lh: 'A2', rh: ['C#4', 'E4', 'G4'], st: ['A3', 'E4'],    bs: 'A2' },
  'D':   { lh: 'D2', rh: ['F#3', 'A3', 'C#4'], st: ['D3', 'A3'],   bs: 'D2' },
  'A7s': { lh: 'A2', rh: ['D4', 'E4', 'G4'],  st: ['A3', 'E4'],    bs: 'A2' }
};
const PROG = ['G', 'A', 'F#m', 'Bm', 'G', 'A', 'D', 'D', 'Em', 'A7', 'F#m', 'Bm', 'G', 'A', 'D', 'A7s'];

// ---------- 主旋律（小節, 拍, 長度拍, 音, 力度） ----------
const MELODY = [
  [5, 0, 2, 'F#5', .60], [5, 2, 1, 'E5', .52], [5, 3, 1, 'D5', .50],
  [6, 0, 2, 'E5', .58], [6, 2, 1, 'C#5', .50], [6, 3, 1, 'E5', .52],
  [7, 0, 2.5, 'F#5', .62], [7, 2.5, .5, 'E5', .46], [7, 3, 1, 'D5', .50],
  [8, 0, 2, 'D5', .56], [8, 2, 1.5, 'C#5', .46], [8, 3.5, .5, 'A4', .42],
  [9, 0, 2, 'B4', .56], [9, 2, 1, 'D5', .50], [9, 3, 1, 'E5', .52],
  [10, 0, 2, 'E5', .60], [10, 2, 1, 'C#5', .50], [10, 3, 1, 'A4', .46],
  [11, 0, 1.5, 'A4', .48], [11, 1.5, .5, 'B4', .46], [11, 2, 2, 'C#5', .56],
  [12, 0, 3.5, 'D5', .62],
  [13, 0, 2, 'D5', .58], [13, 2, 1, 'B4', .48], [13, 3, 1, 'D5', .50],
  [14, 0, 2, 'E5', .60], [14, 2, 1, 'C#5', .50], [14, 3, 1, 'E5', .52],
  [15, 0, 3, 'F#5', .62], [15, 3, 1, 'A5', .56],
  [16, 0, 2, 'G5', .56], [16, 2, 1, 'E5', .50], [16, 3, 1, 'C#5', .46]
];

// 音樂盒點題（1-4 小節）
const BOX = [
  [1, 2, .5, 'D5'], [1, 2.5, .5, 'F#5'], [1, 3, 1, 'A5'],
  [2, 2, .5, 'E5'], [2, 2.5, .5, 'A5'], [2, 3, 1, 'C#6'],
  [3, 2, .5, 'C#5'], [3, 2.5, .5, 'F#5'], [3, 3, 1, 'A5'],
  [4, 2, .5, 'D5'], [4, 2.5, .5, 'F#5'], [4, 3, 1, 'B5']
];

// 豎琴上行過門（12 小節尾 → 13 小節）
const HARP_RUN = (() => {
  const seq = ['D4', 'F#4', 'A4', 'D5', 'F#5', 'A5'];
  return seq.map((n, i) => [12, 2.5 + i * .25, .6, n, .16 + i * .012]);
})();

// ---------- 力度校準 ----------
const CALIB_FILE = path.join(__dirname, '..', '..', 'outputs', 'music', 'calib.json');
const TARGET_RMS = -20;

function calibrate(lib) {
  if (fs.existsSync(CALIB_FILE)) return JSON.parse(fs.readFileSync(CALIB_FILE, 'utf8'));
  const probes = [
    [P, 'C4', 'note', .6],
    [S, 'C4', 'pad', .7],
    [B, 'C2', 'note', .6],
    [H, 'C4', 'note', .5],
    [M, 'C5', 'note', .5],
    [G, 'C5', 'note', .5]
  ];
  const out = {};
  for (const [inst, note, kind, vel] of probes) {
    const bus = D.makeBus(2.6);
    if (kind === 'pad') D.addPad(bus, lib, { inst, midi: D.mn(note), t: .05, dur: 1.5, vel, gain: 1 });
    else D.addNote(bus, lib, { inst, midi: D.mn(note), t: .05, dur: 1.8, vel, gain: 1, velLp: inst === P });
    const st = D.stats(bus.L, bus.R);
    out[inst] = +(Math.pow(10, (TARGET_RMS - st.rmsDb) / 20)).toFixed(4);
  }
  fs.mkdirSync(path.dirname(CALIB_FILE), { recursive: true });
  fs.writeFileSync(CALIB_FILE, JSON.stringify(out, null, 1));
  return out;
}

// ---------- 組曲 ----------
function build(lib, CAL) {
  const lead = D.makeBus(LOOP_SEC + TAIL_SEC);   // 乾／近：鋼琴、貝斯、音樂盒、鐘琴
  const pad = D.makeBus(LOOP_SEC + TAIL_SEC);    // 濕／遠：弦樂、豎琴
  const g = k => CAL[k] || 1;
  const at = (bar, beat) => (bar - 1) * BAR + beat * BEAT;

  let seed = 20261106;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const hum = ms => (rnd() * 2 - 1) * ms / 1000;
  const kpan = midi => Math.max(-0.42, Math.min(0.42, (midi - 62) / 46));

  for (let b = 1; b <= BARS; b++) {
    const c = CH[PROG[b - 1]];
    const intro = b <= 4;
    const lift = b >= 9;

    // ---- 鋼琴左手：根音 ----
    // 有貝斯的小節把左手提高八度，避免和貝斯彈同一個音（那個疊加會讓 125Hz 多 6dB，聽起來糊）
    const lhMidi = intro ? D.mn(c.lh) : D.mn(c.lh) + 12;
    D.addNote(lead, lib, {
      inst: P, midi: lhMidi, t: at(b, 0) + hum(6),
      dur: intro ? 2.6 : 1.9, vel: intro ? .39 : .42,
      gain: g(P), pan: kpan(lhMidi), rel: .9, velLp: true
    });
    // 五度（第 3 拍）
    D.addNote(lead, lib, {
      inst: P, midi: lhMidi + 7, t: at(b, 2) + hum(7),
      dur: 1.4, vel: intro ? .30 : .34,
      gain: g(P) * .92, pan: kpan(lhMidi + 7), rel: .8, velLp: true
    });

    // ---- 鋼琴右手：分解和弦 / 拍點和聲 ----
    if (intro) {
      const fig = [0, 2, 1, 2, 0, 2, 1, 2];
      fig.forEach((ix, i) => {
        const midi = D.mn(c.rh[ix]);
        D.addNote(lead, lib, {
          inst: P, midi, t: at(b, i * .5) + hum(9),
          dur: 1.35, vel: .28 + (i % 2 ? -.05 : .05) + rnd() * .04,
          gain: g(P) * 1.02, pan: kpan(midi), rel: 1.0, velLp: true
        });
      });
    } else {
      [0, 2].forEach((bt, i) => {
        c.rh.forEach((n, j) => {
          const midi = D.mn(n) + (i === 1 && j === 2 ? 12 : 0);
          D.addNote(lead, lib, {
            inst: P, midi, t: at(b, bt) + hum(7) + j * .011,
            dur: 1.25, vel: (bt === 0 ? .25 : .21) - j * .012 + rnd() * .025,
            gain: g(P) * (i === 0 ? 1 : .95), pan: kpan(midi), rel: .9, velLp: true
          });
        });
      });
    }

    // ---- 弦樂鋪底（長音，走 pad 匯流） ----
    if (b >= 3) {
      const v = b <= 4 ? .28 : (b >= 13 ? .44 : .36);
      c.st.forEach((n, j) => {
        D.addPad(pad, lib, {
          inst: S, midi: D.mn(n), t: at(b, 0) - .05 + j * .06,
          dur: BAR + .12, vel: v + (j ? .03 : 0), gain: g(S) * 1.05,
          pan: j ? 0.26 : -0.20, attack: b <= 4 ? 1.0 : .55, rel: 1.0
        });
      });
    }

    // ---- 貝斯 ----
    if (!intro) {
      D.addNote(lead, lib, {
        inst: B, midi: D.mn(c.bs), t: at(b, 0) + hum(5),
        dur: 1.9, vel: .44, gain: g(B) * .86, pan: 0, rel: .35, lp: 900
      });
      if (b % 2 === 0 || lift) {
        D.addNote(lead, lib, {
          inst: B, midi: D.mn(c.bs) + 7, t: at(b, 2) + hum(5),
          dur: 1.3, vel: .34, gain: g(B) * .82, pan: 0, rel: .3, lp: 900
        });
      }
    }

    // ---- 豎琴：9-16 小節的柔琶音（填在拍點空隙） ----
    if (lift) {
      const fig = [c.rh[0], c.rh[1], c.rh[2], c.rh[1]];
      [1, 3].forEach((bt, i) => {
        fig.forEach((n, j) => {
          D.addNote(pad, lib, {
            inst: H, midi: D.mn(n) + 12, t: at(b, bt) + j * BEAT / 4 + hum(10),
            dur: .9, vel: .14 + (i === 1 ? .02 : 0) - j * .008,
            gain: g(H), pan: 0.28, rel: .6
          });
        });
      });
    }
  }

  // ---- 主旋律（鋼琴，最上層） ----
  MELODY.forEach(([bar, beat, blen, n, vel]) => {
    const midi = D.mn(n);
    D.addNote(lead, lib, {
      inst: P, midi, t: at(bar, beat) + hum(6),
      dur: Math.max(.4, blen * BEAT * .96), vel, gain: g(P) * 1.30,
      pan: kpan(midi) + .06, rel: 1.1, velLp: true
    });
    // 高音長音偶爾墊鐘琴亮片（只做後段，避免太甜）
    if (bar >= 13 && blen >= 2) {
      D.addNote(lead, lib, {
        inst: G, midi: midi + 12, t: at(bar, beat) + .025,
        dur: 1.0, vel: vel * .26, gain: g(G), pan: 0.30, rel: .5
      });
    }
  });

  // ---- 音樂盒點題 ----
  BOX.forEach(([bar, beat, blen, n]) => {
    D.addNote(lead, lib, {
      inst: M, midi: D.mn(n), t: at(bar, beat) + hum(8),
      dur: Math.max(.4, blen * BEAT * .95), vel: .30,
      gain: g(M), pan: 0.24, rel: .35
    });
  });

  // ---- 豎琴過門 ----
  HARP_RUN.forEach(([bar, beat, blen, n, vel]) => {
    D.addNote(pad, lib, {
      inst: H, midi: D.mn(n), t: at(bar, beat), dur: 1.0, vel,
      gain: g(H) * 1.1, pan: 0.20, rel: .5
    });
  });

  return { lead, pad };
}

// ---------- 主流程 ----------
function main() {
  const lib = new D.Library();
  const CAL = calibrate(lib);
  const t0 = Date.now();
  const { lead, pad } = build(lib, CAL);
  console.log(`  取樣渲染 ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  // 兩條匯流：主奏乾一點、鋪底送多一點 → 有前後層次
  const n = lead.n;
  const sendL = new Float32Array(n), sendR = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    sendL[i] = lead.L[i] * 0.22 + pad.L[i] * 0.75;
    sendR[i] = lead.R[i] * 0.22 + pad.R[i] * 0.75;
  }
  const wet = D.reverb(sendL, sendR, { room: 0.88, damp: 0.20, wet: 0.60, pre: 0.034, wetOnly: true });

  const L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    L[i] = lead.L[i] + pad.L[i] * 0.85 + wet.L[i] * 0.30;
    R[i] = lead.R[i] + pad.R[i] * 0.85 + wet.R[i] * 0.30;
  }

  // 母帶：先量測，再「算出差距」用 STFT 直接校正到目標曲線（比手調 biquad 準）
  D.biquad(L, 'hp', 38, 0.7); D.biquad(R, 'hp', 38, 0.7);

  const TARGET = [
    [40, -16], [60, -9], [100, -3], [160, 0.5], [250, 0], [400, -0.5], [700, -0.5],
    [1000, 0], [1600, -2.5], [2500, -6], [4000, -10], [6000, -14],
    [8000, -17], [12000, -21], [16000, -27]
  ];
  const tgt = f => {
    if (f <= TARGET[0][0]) return TARGET[0][1];
    if (f >= TARGET[TARGET.length - 1][0]) return TARGET[TARGET.length - 1][1];
    for (let i = 0; i < TARGET.length - 1; i++) {
      if (f >= TARGET[i][0] && f <= TARGET[i + 1][0]) {
        const t = Math.log(f / TARGET[i][0]) / Math.log(TARGET[i + 1][0] / TARGET[i][0]);
        return TARGET[i][1] + (TARGET[i + 1][1] - TARGET[i][1]) * t;
      }
    }
    return 0;
  };

  const before = D.measureBands(L, R);
  // 兩道修正：第一道拉大方向，第二道補剩下的坑（鋼琴在 5-7k 天生有個洞）
  for (let pass = 0; pass < 2; pass++) {
    const m = D.measureBands(L, R);
    const corr = D.correctionCurve(m, tgt, pass === 0 ? 10 : 6);
    D.applyEq(L, R, f => Math.pow(10, corr(f) / 20));
  }
  const after = D.measureBands(L, R);

  const marks = [62, 125, 250, 500, 1000, 2000, 4000, 6000, 10000];
  const pick = (t, f) => { let b = t[0], bd = 1e9; for (const x of t) { const d = Math.abs(Math.log(x.f / f)); if (d < bd) { bd = d; b = x; } } return b.db; };
  console.log('  頻譜校正（dB，1kHz = 0）：');
  console.log('    頻率      校正前   目標   校正後');
  marks.forEach(f => console.log(`    ${String(f).padStart(5)}Hz  ${pick(before, f).toFixed(1).padStart(6)}  ${tgt(f).toFixed(1).padStart(5)}  ${pick(after, f).toFixed(1).padStart(6)}`));

  D.compress(L, R, { thr: -18, ratio: 1.7 });
  const looped = D.foldLoop(L, R, LOOP_SEC);
  D.limiter(looped.L, looped.R, 0.97);
  const nz = D.normalize(looped.L, looped.R, -1.5);

  const st = D.stats(looped.L, looped.R);
  console.log(`  峰值 ${st.peakDb.toFixed(2)} / RMS ${st.rmsDb.toFixed(2)} dBFS（正規化 ×${nz.gain.toFixed(2)}）`);
  console.log(`  長度 ${(looped.n / D.SR).toFixed(2)}s`);

  const secs = [];
  for (let i = 0; i < 4; i++) secs.push([i * BAR * 4 + .1, (i + 1) * BAR * 4 - .1, `第${i * 4 + 1}-${i * 4 + 4}小節`]);
  D.sections(looped.L, looped.R, secs).forEach(s =>
    console.log(`    ${s.tag.padEnd(11)} 峰值 ${s.peakDb.toFixed(1)} / RMS ${s.rmsDb.toFixed(1)}`));

  const outDir = path.join(__dirname, '..', '..', 'outputs', 'music');
  const res = D.encode(looped.L, looped.R, path.join(outDir, 'home'), { aac: '144k', oggQ: 5 });
  Object.entries(res).forEach(([k, v]) => console.log(`    ${k}: ${(v.kb / 1024).toFixed(2)} MB`));
}

main();
