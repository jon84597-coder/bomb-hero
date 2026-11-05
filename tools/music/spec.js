// tools/music/spec.js —— 用 FFT 做 1/3 八度頻譜，判斷「悶／刺」
// 用法：node tools/music/spec.js <audio 檔> [標籤]
//       node tools/music/spec.js --raw <inst> <note>   直接量一個取樣樣本
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const SR = 44100;

// ---- radix-2 FFT ----
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len;
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
}

// ---- 取樣檔 → 立體聲 ----
function loadAudio(file) {
  const raw = execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', file,
    '-f', 'f32le', '-acodec', 'pcm_f32le', '-ac', '2', '-ar', String(SR), 'pipe:1'], { maxBuffer: 1 << 30 });
  const N = raw.length / 8;
  const L = new Float32Array(N), R = new Float32Array(N);
  for (let i = 0; i < N; i++) { L[i] = raw.readFloatLE(i * 8); R[i] = raw.readFloatLE(i * 8 + 4); }
  return { L, R, N };
}

// ---- Welch 平均功率譜 ----
// 注意兩件事：
//   1) 不能先 (L+R)/2 再 FFT —— 立體聲相位差會讓高頻互相抵消，量起來「假的悶」。
//   2) 不能整段平均 —— 鋼琴長樣本的尾巴幾乎只剩基頻，會把音色拉得很暗。
//      所以加「響度閘門」：只統計接近最大聲的片段（那才是耳朵聽到的音色）。
function welch(L, R, fftN, o) {
  o = o || {};
  const N = L.length, hop = o.hop || fftN / 2;
  const gate = o.gateDb == null ? -14 : o.gateDb;
  const win = new Float64Array(fftN);
  for (let i = 0; i < fftN; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (fftN - 1));

  // 先掃一遍每個 frame 的 RMS，決定閘門
  const rms = [];
  let maxR = 0;
  for (let s = 0; s + fftN <= N; s += hop) {
    let e = 0;
    for (let i = 0; i < fftN; i++) { const a = L[s + i], b = R[s + i]; e += a * a + b * b; }
    const r = Math.sqrt(e / (2 * fftN));
    rms.push(r); if (r > maxR) maxR = r;
  }
  const thr = maxR * Math.pow(10, gate / 20);

  const acc = new Float64Array(fftN / 2);
  let frames = 0, fi = 0;
  for (let s = 0; s + fftN <= N; s += hop, fi++) {
    if (rms[fi] < thr) continue;
    const re = new Float64Array(fftN), im = new Float64Array(fftN);
    for (let i = 0; i < fftN; i++) re[i] = L[s + i] * win[i];
    fft(re, im);
    for (let k = 0; k < fftN / 2; k++) acc[k] += (re[k] * re[k] + im[k] * im[k]) * 0.5;
    re.fill(0); im.fill(0);
    for (let i = 0; i < fftN; i++) re[i] = R[s + i] * win[i];
    fft(re, im);
    for (let k = 0; k < fftN / 2; k++) acc[k] += (re[k] * re[k] + im[k] * im[k]) * 0.5;
    frames++;
  }
  for (let k = 0; k < acc.length; k++) acc[k] /= Math.max(1, frames);
  return acc;
}

const THIRD = [];
for (let f = 25; f < 18000; f *= Math.pow(2, 1 / 3)) THIRD.push(f);

function bandTable(psd, fftN) {
  const binHz = SR / fftN;
  return THIRD.map((f, i) => {
    const f1 = THIRD[i], f2 = i + 1 < THIRD.length ? THIRD[i + 1] : f1 * Math.pow(2, 1 / 3);
    let sum = 0, cnt = 0;
    const k1 = Math.max(1, Math.round(f1 / binHz)), k2 = Math.max(k1 + 1, Math.round(f2 / binHz));
    for (let k = k1; k < k2 && k < psd.length; k++) { sum += psd[k]; cnt++; }
    return { f: Math.sqrt(f1 * f2), db: 10 * Math.log10(sum / Math.max(1, cnt) + 1e-20) };
  });
}

function medianRef(tbl) {
  const vals = tbl.filter(b => b.f >= 200 && b.f <= 4000).map(b => b.db).sort((a, b) => a - b);
  return vals[Math.floor(vals.length / 2)];
}

function report(tbl, label) {
  const ref = medianRef(tbl);
  const marks = [62, 125, 250, 500, 1000, 2000, 4000, 6000, 8000, 12000, 16000];
  console.log(`\n=== ${label} ===  （以 200-4k 中位數為 0 dB）`);
  for (const m of marks) {
    let best = tbl[0], bd = 1e9;
    for (const b of tbl) { const d = Math.abs(Math.log(b.f / m)); if (d < bd) { bd = d; best = b; } }
    const v = best.db - ref;
    const bar = '█'.repeat(Math.max(0, Math.round((v + 30) / 2)));
    console.log(`  ${String(m).padStart(5)} Hz  ${v >= 0 ? '+' : ''}${v.toFixed(1).padStart(6)} dB  ${bar}`);
  }
}

function rawSample(inst, note) {
  const dir = path.join(__dirname, '..', '..', 'outputs', 'music', 'pcm', inst);
  const buf = fs.readFileSync(path.join(dir, note + '.f32'));
  const N = buf.length / 8;
  const L = new Float32Array(N), R = new Float32Array(N);
  for (let i = 0; i < N; i++) { L[i] = buf.readFloatLE(i * 8); R[i] = buf.readFloatLE(i * 8 + 4); }
  return { L, R, N };
}

const a = process.argv.slice(2);
let audio, label;
if (a[0] === '--raw') {
  const s = rawSample(a[1], a[2]);
  // 只取起音後 2.5 秒：長樣本的尾巴幾乎只剩基頻，整段平均會嚴重低估高頻
  const cut = Math.min(s.N, Math.round(2.5 * SR));
  audio = { L: s.L.subarray(0, cut), R: s.R.subarray(0, cut), N: cut };
  label = `原始樣本 ${a[1]} ${a[2]}（前 2.5s）`;
} else { audio = loadAudio(a[0]); label = a[1] || path.basename(a[0]); }
const FFTN = 4096;
const tbl = bandTable(welch(audio.L, audio.R, FFTN, { hop: 1024, gateDb: -14 }), FFTN);
report(tbl, label);

// 主觀風險提示
const ref = medianRef(tbl);
const at = f => { let best = tbl[0], bd = 1e9; for (const b of tbl) { const d = Math.abs(Math.log(b.f / f)); if (d < bd) { bd = d; best = b; } } return best.db - ref; };
const low = at(250), pres = at(3000), air = at(10000);
console.log('\n判讀：');
console.log(`  250Hz ${low.toFixed(1)}dB / 3kHz ${pres.toFixed(1)}dB / 10kHz ${air.toFixed(1)}dB`);
if (pres < -8) console.log('  ⚠ 3kHz 偏低（> -8 才會有「清楚、聽得懂」的存在感）→ 悶');
if (air < -20) console.log('  ⚠ 10kHz 太低（建議 -8 ~ -16）→ 沒有空氣感，聽起來像隔著棉被');
if (low > 3) console.log('  ⚠ 250Hz 太厚（建議 -3 ~ +2）→ 糊、樂器黏在一起');
if (pres > -2) console.log('  ⚠ 3kHz 太衝 → 刺耳');
