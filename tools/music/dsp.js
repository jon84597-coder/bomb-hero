// tools/music/dsp.js —— 離線音樂渲染核心（零依賴）
//
// 設計原則：
//   1. 只用「真樂器取樣」發聲，不用任何方波／鋸齒波 → 不會有紅白機味。
//   2. 取樣樣本固定 3.136s（產生器切齊），鋼琴自然衰減、弦樂要「顆粒串接」延長。
//   3. 混音走 乾 + Freeverb 殘響 + 匯流壓縮 + 軟限幅，最後折疊成無縫循環。

const fs = require('fs');
const path = require('path');

const SR = 44100;
const TAU = Math.PI * 2;

// ---------- 音名 ↔ MIDI ----------
const BASE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function mn(s) {                       // 'F#5' / 'Bb3' / 'C4' → midi
  const m = /^([A-G])([#b]?)(-?\d+)$/.exec(String(s).trim());
  if (!m) throw new Error('bad note: ' + s);
  let v = BASE[m[1]];
  if (m[2] === '#') v += 1;
  if (m[2] === 'b') v -= 1;
  return v + (parseInt(m[3], 10) + 1) * 12;
}
function hz(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

// ---------- 取樣庫 ----------
const PCM = path.join(__dirname, '..', '..', 'outputs', 'music', 'pcm');

class Library {
  constructor() { this.inst = new Map(); }
  load(name) {
    if (this.inst.has(name)) return this.inst.get(name);
    const dir = path.join(PCM, name);
    const idxF = path.join(dir, 'index.json');
    if (!fs.existsSync(idxF)) throw new Error('缺少樣本：' + name + '（先跑 tools/music/extract.js）');
    const idx = JSON.parse(fs.readFileSync(idxF, 'utf8'));
    const lib = { name, notes: idx, cache: new Map(), dir };
    this.inst.set(name, lib);
    return lib;
  }
  // 同一個 midi 可能有多個力度層（Salamander）；FluidR3 每音只有一層
  pick(lib, midi, vel) {
    const v = vel == null ? 0.7 : vel;
    let bm = 1e9, bv = 1e9, best = null;
    for (const n of lib.notes) {
      const dm = Math.abs(n.midi - midi);
      const dv = Math.abs((n.vel == null ? 0.7 : n.vel) - v);
      // 音高優先：先在同一個（或最接近的）midi 內挑力度層
      if (dm < bm - 1e-6 || (Math.abs(dm - bm) < 1e-6 && dv < bv)) {
        if (dm < bm - 1e-6) { bm = dm; bv = dv; best = n; }
        else if (dv < bv) { bv = dv; best = n; }
      }
    }
    return best;
  }
  get(name, midi, vel) {
    const lib = this.load(name);
    const s = this.pick(lib, midi, vel);
    const key = s.note + (s.layer ? 'v' + s.layer : '');
    if (!lib.cache.has(key)) {
      const buf = fs.readFileSync(path.join(lib.dir, s.note + (s.layer ? 'v' + s.layer : '') + '.f32'));
      let frames = buf.length / 8;
      const L = new Float32Array(frames), R = new Float32Array(frames);
      for (let i = 0; i < frames; i++) { L[i] = buf.readFloatLE(i * 8); R[i] = buf.readFloatLE(i * 8 + 4); }
      // 去掉開頭約 10ms 的靜音前導（Salamander 每顆音都有），否則整體節奏會拖
      let off = 0;
      while (off < frames - 2 && Math.abs(L[off]) < 0.002 && Math.abs(R[off]) < 0.002) off++;
      off = Math.max(0, off - 2);
      if (off > 0) {
        frames -= off;
        lib.cache.set(key, { L: L.subarray(off), R: R.subarray(off), frames, midi: s.midi, vel: s.vel == null ? 0.7 : s.vel });
      } else {
        lib.cache.set(key, { L, R, frames, midi: s.midi, vel: s.vel == null ? 0.7 : s.vel });
      }
    }
    return lib.cache.get(key);
  }
}

// ---------- 匯流排 ----------
function makeBus(sec) {
  const n = Math.ceil(sec * SR) + 16;
  return { L: new Float32Array(n), R: new Float32Array(n), n };
}

// Catmull-Rom 內插（比線性乾淨很多，高音區不會有金屬毛邊）
function cubic(a, i, t) {
  const i0 = i > 0 ? i - 1 : 0, i1 = i, i2 = i + 1, i3 = i + 2 < a.length ? i + 2 : a.length - 1;
  const p0 = a[i0], p1 = a[i1], p2 = a[i2], p3 = a[i3];
  const t2 = t * t, t3 = t2 * t;
  return p1 + 0.5 * ((p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

// ---------- 單音（鋼琴／豎琴／音樂盒／貝斯都是這種「打一下自然衰減」） ----------
// o: { inst, midi, t, dur, vel, pan, rel, gain, lp, velLp, attack }
function addNote(bus, lib, o) {
  const vel = o.vel == null ? 0.8 : o.vel;
  const smp = lib.get(o.inst, o.midi, vel);
  const ratio = Math.pow(2, (o.midi - smp.midi) / 12);
  const step = ratio;                                   // 每個輸出樣本前進多少來源樣本

  const t0 = Math.max(0, Math.round(o.t * SR));
  const dur = Math.max(0.03, o.dur || 2.5);
  const rel = o.rel == null ? 0.10 : o.rel;             // 收尾淡出（避免切斷爆音）
  // 力度：取樣層本身已帶音量差，這裡只做微調（不把弱層硬拉成強層）
  const lv = smp.vel || 1;
  const vadj = Math.min(1.5, Math.max(0.65, Math.pow(vel / lv, 0.45)));
  const gain = (o.gain == null ? 1 : o.gain) * vadj;
  const pan = o.pan || 0;
  const gl = Math.cos((pan + 1) * Math.PI / 4), gr = Math.sin((pan + 1) * Math.PI / 4);

  const att = o.attack == null ? 0.003 : o.attack;
  const attN = Math.max(1, Math.round(att * SR));
  const relStart = dur;
  const total = Math.min(dur + rel + 0.02, smp.frames / step);

  // 力度 → 亮度（小聲的音少一點泛音，這是最像真樂器的關鍵之一）
  const cut = o.lp != null ? o.lp : (o.velLp ? 2200 + 12500 * Math.min(1, vel * 1.35) : 0);
  let lpA = 1, yl = 0, yr = 0;
  if (cut) { const w = TAU * cut / SR; lpA = w / (w + 1); }

  const outN = Math.ceil(total * SR);
  for (let i = 0; i < outN; i++) {
    const idx = t0 + i;
    if (idx >= bus.n) break;

    // 振幅包絡：起音 → 1 → 收尾餘弦淡出
    let env;
    if (i < attN) env = Math.sin((i / attN) * Math.PI / 2);
    else env = 1;
    if (i > relStart * SR) {
      const k = (i - relStart * SR) / (rel * SR);
      if (k >= 1) break;
      env *= Math.cos(k * Math.PI / 2) ** 2;
    }

    const sp = i * step;
    const si = sp | 0;
    if (si + 2 >= smp.frames) break;
    const fr = sp - si;
    let l = cubic(smp.L, si, fr), r = cubic(smp.R, si, fr);
    if (cut) { yl += lpA * (l - yl); yr += lpA * (r - yr); l = yl; r = yr; }

    const g = env * gain;
    bus.L[idx] += l * g * gl;
    bus.R[idx] += r * g * gr;
  }
}

// ---------- 顆粒串接的長音（弦樂／pad 用） ----------
// 弦樂樣本是「平直延音」被硬切在 3.136s，所以要靠重疊顆粒接成長音。
function addPad(bus, lib, o) {
  const smp = lib.get(o.inst, o.midi, o.vel == null ? 0.7 : o.vel);
  const ratio = Math.pow(2, (o.midi - smp.midi) / 12);
  const bodyFrames = (smp.frames - Math.floor(smp.frames * 0.42));
  const bodySec = bodyFrames / SR / ratio;
  const fade = Math.min(0.75, bodySec * 0.42);
  const hop = bodySec - fade;

  const dur = Math.max(0.5, o.dur);
  const vel = o.vel == null ? 0.7 : o.vel;
  const gain = (o.gain == null ? 1 : o.gain) * (0.35 + 0.65 * vel);
  const pan = o.pan || 0;
  const gl = Math.cos((pan + 1) * Math.PI / 4), gr = Math.sin((pan + 1) * Math.PI / 4);
  const att = o.attack == null ? 0.35 : o.attack;
  const rel = o.rel == null ? 0.55 : o.rel;

  const nOut = Math.ceil((dur + rel + 0.05) * SR);
  const t0 = Math.max(0, Math.round(o.t * SR));
  const fadeN = Math.round(fade * SR);

  let grains = 0;
  for (let k = 0; ; k++) {
    const gt = k * hop;
    if (gt > dur - 0.05) break;
    const srcOff = Math.floor((k === 0 ? 0 : 0.42 * smp.frames));
    const grainOut = Math.ceil(Math.min(bodySec, dur - gt + rel) * SR);
    if (grainOut <= 0) break;
    const isFirst = k === 0;
    for (let i = 0; i < grainOut; i++) {
      const idx = t0 + Math.round(gt * SR) + i;
      if (idx >= bus.n) break;
      // 顆粒窗：首顆用自然起音，其餘用等功率淡入/淡出
      let w = 1;
      if (!isFirst) { if (i < fadeN) w = Math.sin((i / fadeN) * Math.PI / 2); }
      if (i > grainOut - fadeN) {
        const kk = (i - (grainOut - fadeN)) / fadeN;
        if (kk >= 1) break;
        w *= Math.cos(kk * Math.PI / 2);
      }
      // 整段包絡（起音只在第一顆做）
      const tt = i / SR;
      let e = 1;
      if (tt < att) e *= Math.sin((tt / att) * Math.PI / 2);
      const sp = srcOff + i * ratio;
      const si = sp | 0;
      if (si + 2 >= smp.frames) break;
      const fr = sp - si;
      const l = cubic(smp.L, si, fr), r = cubic(smp.R, si, fr);
      const g = w * e * gain;
      bus.L[idx] += l * g * gl;
      bus.R[idx] += r * g * gr;
    }
    if (++grains > 60) break;
  }
}

// ---------- RBJ 二階濾波（EQ 用） ----------
function biquad(buf, type, f0, Q, dbGain) {
  const A = Math.pow(10, (dbGain || 0) / 40);
  const w0 = TAU * f0 / SR, cw = Math.cos(w0), sw = Math.sin(w0);
  const alpha = sw / (2 * Q);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lp') {
    b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = b0;
    a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha;
  } else if (type === 'hp') {
    b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = b0;
    a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha;
  } else if (type === 'peak') {
    b0 = 1 + alpha * A; b1 = -2 * cw; b2 = 1 - alpha * A;
    a0 = 1 + alpha / A; a1 = -2 * cw; a2 = 1 - alpha / A;
  } else if (type === 'lowshelf') {
    const s = 2 * Math.sqrt(A) * alpha;
    b0 = A * ((A + 1) - (A - 1) * cw + s);
    b1 = 2 * A * ((A - 1) - (A + 1) * cw);
    b2 = A * ((A + 1) - (A - 1) * cw - s);
    a0 = (A + 1) + (A - 1) * cw + s;
    a1 = -2 * ((A - 1) + (A + 1) * cw);
    a2 = (A + 1) + (A - 1) * cw - s;
  } else { // highshelf
    const s = 2 * Math.sqrt(A) * alpha;
    b0 = A * ((A + 1) + (A - 1) * cw + s);
    b1 = -2 * A * ((A - 1) + (A + 1) * cw);
    b2 = A * ((A + 1) + (A - 1) * cw - s);
    a0 = (A + 1) - (A - 1) * cw + s;
    a1 = 2 * ((A - 1) - (A + 1) * cw);
    a2 = (A + 1) - (A - 1) * cw - s;
  }
  const B0 = b0 / a0, B1 = b1 / a0, B2 = b2 / a0, A1 = a1 / a0, A2 = a2 / a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < buf.length; i++) {
    const x = buf[i];
    const y = B0 * x + B1 * x1 + B2 * x2 - A1 * y1 - A2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    buf[i] = y;
  }
}

// ---------- Freeverb ----------
// o.wetOnly = true 時回傳「只有殘響」的 {L,R}（用來當送出匯流排），否則直接疊進傳入的緩衝。
function reverb(L, R, o) {
  o = o || {};
  const room = o.room == null ? 0.86 : o.room;
  const damp = o.damp == null ? 0.34 : o.damp;
  const wet = o.wet == null ? 0.30 : o.wet;
  const pre = Math.round((o.pre == null ? 0.028 : o.pre) * SR);
  const combT = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const apT = [556, 441, 341, 225];
  const spread = 23;
  const feedback = room * 0.28 + 0.7;
  const damp1 = damp, damp2 = 1 - damp;
  const n = L.length;

  const lp = new Float32Array(n), rp = new Float32Array(n);
  for (let i = 0; i < n; i++) { lp[i] = i >= pre ? L[i - pre] : 0; rp[i] = i >= pre ? R[i - pre] : 0; }

  const wetOnly = !!o.wetOnly;
  const outL = wetOnly ? new Float32Array(n) : L;
  const outR = wetOnly ? new Float32Array(n) : R;

  function channel(inp, out, off) {
    const combs = combT.map(t => ({ b: new Float32Array(t + off), i: 0, s: 0 }));
    const aps = apT.map(t => ({ b: new Float32Array(t + off), i: 0 }));
    for (let k = 0; k < n; k++) {
      const x = inp[k] * 0.015;
      let y = 0;
      for (const c of combs) {
        const o2 = c.b[c.i];
        c.s = o2 * damp2 + c.s * damp1;
        c.b[c.i] = x + c.s * feedback;
        c.i = (c.i + 1) % c.b.length;
        y += o2;
      }
      for (const a of aps) {
        const bo = a.b[a.i];
        const outv = -y + bo;
        a.b[a.i] = y + bo * 0.5;
        a.i = (a.i + 1) % a.b.length;
        y = outv;
      }
      out[k] += y * wet;
    }
  }
  channel(lp, outL, 0);
  channel(rp, outR, spread);
  return wetOnly ? { L: outL, R: outR } : null;
}

// ---------- FFT + STFT 頻譜等化 ----------
function fftRadix(re, im, inverse) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (inverse ? 2 : -2) * Math.PI / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k], ui = im[i + k];
        const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ur + vr; im[i + k] = ui + vi;
        re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
        const ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}

// gainFn(freq) → 線性倍率；用 STFT 重疊相加套用（比一串 biquad 精準，也看得到結果）
function applyEq(L, R, gainFn, N) {
  N = N || 8192;
  const hop = N / 4;
  const n = L.length;
  const win = new Float64Array(N);
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(TAU * i / N);
  const wsum = new Float64Array(n + N);
  const outL = new Float32Array(n), outR = new Float32Array(n);
  const binHz = SR / N;
  const g = new Float64Array(N / 2 + 1);
  for (let k = 0; k <= N / 2; k++) g[k] = gainFn(k * binHz);

  for (let s = 0; s + N <= n; s += hop) {
    for (const [src, dst] of [[L, outL], [R, outR]]) {
      const re = new Float64Array(N), im = new Float64Array(N);
      for (let i = 0; i < N; i++) re[i] = src[s + i] * win[i];
      fftRadix(re, im, false);
      for (let k = 0; k <= N / 2; k++) { re[k] *= g[k]; im[k] *= g[k]; }
      for (let k = 1; k < N / 2; k++) { re[N - k] = re[k]; im[N - k] = -im[k]; }  // 實訊號共軛對稱
      fftRadix(re, im, true);
      for (let i = 0; i < N; i++) dst[s + i] += re[i] * win[i];
    }
    for (let i = 0; i < N; i++) wsum[s + i] += win[i] * win[i];
  }
  for (let i = 0; i < n; i++) {
    const w = wsum[i];
    if (w > 1e-6) { outL[i] /= w; outR[i] /= w; }
  }
  L.set(outL); R.set(outR);
}

// 把「目標曲線」寫成 (freq) → dB，再轉成 gainFn
//   pts: [[hz, dB], …]，以 1kHz 為 0，對數頻率上線性內插
function curveToGainFn(pts, refDb) {
  const p = pts.slice().sort((a, b) => a[0] - b[0]);
  const at = f => {
    if (f <= p[0][0]) return p[0][1];
    if (f >= p[p.length - 1][0]) return p[p.length - 1][1];
    for (let i = 0; i < p.length - 1; i++) {
      if (f >= p[i][0] && f <= p[i + 1][0]) {
        const t = Math.log(f / p[i][0]) / Math.log(p[i + 1][0] / p[i][0]);
        return p[i][1] + (p[i + 1][1] - p[i][1]) * t;
      }
    }
    return 0;
  };
  return f => Math.pow(10, (at(f) - (refDb || 0)) / 20);
}

// ---------- 量測：1/3 八度（響度閘門） ----------
// 為什麼要閘門：鋼琴長樣本／整首曲子的平均會被「安靜的尾巴」拉暗，
// 耳朵聽到的音色其實集中在比較大聲的片段。
const THIRD = (() => {
  const a = [];
  for (let f = 40; f < 17500; f *= Math.pow(2, 1 / 3)) a.push(f);
  return a;
})();

function measureBands(L, R, o) {
  o = o || {};
  const N = o.fft || 4096, hop = o.hop || 1024, gateDb = o.gateDb == null ? -14 : o.gateDb;
  const n = L.length;
  const win = new Float64Array(N);
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(TAU * i / N);
  const rms = [];
  let maxR = 0;
  for (let s = 0; s + N <= n; s += hop) {
    let e = 0;
    for (let i = 0; i < N; i++) { const a = L[s + i], b = R[s + i]; e += a * a + b * b; }
    const r = Math.sqrt(e / (2 * N));
    rms.push(r); if (r > maxR) maxR = r;
  }
  const thr = maxR * Math.pow(10, gateDb / 20);
  const acc = new Float64Array(N / 2);
  let frames = 0, fi = 0;
  for (let s = 0; s + N <= n; s += hop, fi++) {
    if (rms[fi] < thr) continue;
    const re = new Float64Array(N), im = new Float64Array(N);
    for (let i = 0; i < N; i++) re[i] = L[s + i] * win[i];
    fftRadix(re, im, false);
    for (let k = 0; k < N / 2; k++) acc[k] += re[k] * re[k] + im[k] * im[k];
    re.fill(0); im.fill(0);
    for (let i = 0; i < N; i++) re[i] = R[s + i] * win[i];
    fftRadix(re, im, false);
    for (let k = 0; k < N / 2; k++) acc[k] += re[k] * re[k] + im[k] * im[k];
    frames++;
  }
  for (let k = 0; k < acc.length; k++) acc[k] /= Math.max(1, frames);
  const binHz = SR / N;
  const out = [];
  for (let i = 0; i < THIRD.length; i++) {
    const f1 = THIRD[i], f2 = THIRD[i + 1] || f1 * Math.pow(2, 1 / 3);
    const k1 = Math.max(1, Math.round(f1 / binHz)), k2 = Math.max(k1 + 1, Math.round(f2 / binHz));
    let sum = 0, cnt = 0;
    for (let k = k1; k < k2 && k < acc.length; k++) { sum += acc[k]; cnt++; }
    out.push({ f: Math.sqrt(f1 * f2), db: 10 * Math.log10(sum / Math.max(1, cnt) + 1e-20) });
  }
  // 以 200-4k 中位數為 0
  const ref = out.filter(b => b.f >= 200 && b.f <= 4000).map(b => b.db).sort((a, b) => a - b);
  const med = ref[Math.floor(ref.length / 2)];
  out.forEach(b => b.db -= med);
  return out;
}

// 由 1/3 八度表算出「校正曲線」→ 一個 (f)=>dB 的函式
function correctionCurve(measured, targetDbAt, clamp) {
  const lo = clamp == null ? -8 : -clamp, hi = clamp == null ? 8 : clamp;
  const pts = measured.map(b => [b.f, Math.max(lo, Math.min(hi, targetDbAt(b.f) - b.db))]);
  return f => {
    if (f <= pts[0][0]) return pts[0][1];
    if (f >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
    for (let i = 0; i < pts.length - 1; i++) {
      if (f >= pts[i][0] && f <= pts[i + 1][0]) {
        const t = Math.log(f / pts[i][0]) / Math.log(pts[i + 1][0] / pts[i][0]);
        return pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t;
      }
    }
    return 0;
  };
}

// ---------- 匯流壓縮 + 軟限幅 ----------
function compress(L, R, o) {
  o = o || {};
  const thr = Math.pow(10, (o.thr == null ? -20 : o.thr) / 20);
  const ratio = o.ratio == null ? 2.2 : o.ratio;
  const atk = 1 - Math.exp(-1 / (0.012 * SR));
  const rel = 1 - Math.exp(-1 / (0.22 * SR));
  let env = 0;
  for (let i = 0; i < L.length; i++) {
    const x = Math.max(Math.abs(L[i]), Math.abs(R[i]));
    env += (x > env ? atk : rel) * (x - env);
    let g = 1;
    if (env > thr) g = Math.pow(env / thr, 1 / ratio - 1);
    L[i] *= g; R[i] *= g;
  }
}
function limiter(L, R, ceil) {
  const c = ceil == null ? 0.985 : ceil;
  for (let i = 0; i < L.length; i++) {
    L[i] = Math.tanh(L[i] * 1.02) * c;
    R[i] = Math.tanh(R[i] * 1.02) * c;
  }
}
function normalize(L, R, peakDb) {
  const target = Math.pow(10, (peakDb == null ? -1.5 : peakDb) / 20);
  let pk = 0;
  for (let i = 0; i < L.length; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
  if (pk < 1e-9) return { peak: pk, gain: 1 };
  const g = target / pk;
  for (let i = 0; i < L.length; i++) { L[i] *= g; R[i] *= g; }
  return { peak: pk, gain: g };
}

// ---------- 量測 ----------
function stats(L, R) {
  let pk = 0, sum = 0;
  for (let i = 0; i < L.length; i++) {
    pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
    sum += L[i] * L[i] + R[i] * R[i];
  }
  const rms = Math.sqrt(sum / (2 * L.length));
  return { peakDb: 20 * Math.log10(pk + 1e-12), rmsDb: 20 * Math.log10(rms + 1e-12) };
}

// ---------- 區段量測（看每一段有沒有過響／過空） ----------
function sections(L, R, secs) {
  return secs.map(([a, b, tag]) => {
    const s0 = Math.round(a * SR), s1 = Math.min(L.length, Math.round(b * SR));
    let pk = 0, sum = 0;
    for (let i = s0; i < s1; i++) { pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i])); sum += L[i] * L[i] + R[i] * R[i]; }
    const rms = Math.sqrt(sum / (2 * Math.max(1, s1 - s0)));
    return { tag, peakDb: 20 * Math.log10(pk + 1e-12), rmsDb: 20 * Math.log10(rms + 1e-12) };
  });
}

// ---------- 無縫循環：把尾巴疊回開頭 ----------
function foldLoop(L, R, loopSec) {
  const lp = Math.round(loopSec * SR);
  const outL = new Float32Array(lp), outR = new Float32Array(lp);
  outL.set(L.subarray(0, lp)); outR.set(R.subarray(0, lp));
  for (let i = lp; i < L.length; i++) {
    const j = i - lp;
    if (j < lp) { outL[j] += L[i]; outR[j] += R[i]; }
  }
  return { L: outL, R: outR, n: lp };
}

// ---------- 匯出 ----------
function toRaw(L, R) {
  const n = L.length;
  const buf = Buffer.alloc(n * 8);
  for (let i = 0; i < n; i++) { buf.writeFloatLE(L[i], i * 8); buf.writeFloatLE(R[i], i * 8 + 4); }
  return buf;
}
function encode(L, R, outBase, opts) {
  opts = opts || {};
  const raw = toRaw(L, R);
  const tmp = outBase + '.f32raw';
  fs.writeFileSync(tmp, raw);
  const res = {};
  const jobs = [
    ['m4a', ['-c:a', 'aac', '-b:a', opts.aac || '128k', '-movflags', '+faststart', '-f', 'ipod']],
    ['ogg', ['-c:a', 'libvorbis', '-q:a', String(opts.oggQ == null ? 4 : opts.oggQ), '-f', 'ogg']],
    ['wav', ['-c:a', 'pcm_s16le', '-f', 'wav']]
  ];
  for (const [ext, args] of jobs) {
    if (opts.only && !opts.only.includes(ext)) continue;
    const out = outBase + '.' + ext;
    require('child_process').execFileSync('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-f', 'f32le', '-ar', String(SR), '-ac', '2', '-i', tmp,
      ...args, out
    ], { stdio: 'inherit' });
    res[ext] = { file: out, kb: +(fs.statSync(out).size / 1024).toFixed(1) };
  }
  fs.unlinkSync(tmp);
  return res;
}

module.exports = {
  SR, mn, hz, Library, makeBus, addNote, addPad, biquad, reverb,
  fftRadix, applyEq, curveToGainFn, measureBands, correctionCurve, THIRD,
  compress, limiter, normalize, stats, sections, foldLoop, encode, toRaw
};
