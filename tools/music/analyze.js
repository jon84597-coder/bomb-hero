// tools/music/analyze.js —— 對渲染結果做客觀檢查（頻段能量／立體聲／接縫）
// 用法：node tools/music/analyze.js outputs/music/home.wav
const fs = require('fs');
const { execFileSync } = require('child_process');

const file = process.argv[2] || 'outputs/music/home.wav';
const SR = 44100;

// 用 ffmpeg 解成 f32 立體聲
const raw = execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', file,
  '-f', 'f32le', '-acodec', 'pcm_f32le', '-ac', '2', '-ar', String(SR), 'pipe:1'], { maxBuffer: 1 << 30 });
const N = raw.length / 8;
const L = new Float32Array(N), R = new Float32Array(N);
for (let i = 0; i < N; i++) { L[i] = raw.readFloatLE(i * 8); R[i] = raw.readFloatLE(i * 8 + 4); }
console.log(`檔案 ${file}  長度 ${(N / SR).toFixed(2)}s`);

// ---- 峰值／RMS／方波度 ----
let pk = 0, sum = 0, clipped = 0;
for (let i = 0; i < N; i++) {
  const a = Math.abs(L[i]), b = Math.abs(R[i]);
  pk = Math.max(pk, a, b); sum += L[i] * L[i] + R[i] * R[i];
  if (a > 0.999 || b > 0.999) clipped++;
}
console.log(`峰值 ${(20 * Math.log10(pk)).toFixed(2)} dBFS  RMS ${(20 * Math.log10(Math.sqrt(sum / (2 * N)))).toFixed(2)} dBFS  爆檔樣本 ${clipped}`);

// ---- 立體聲 ----
let ll = 0, rr = 0, lr = 0;
for (let i = 0; i < N; i++) { ll += L[i] * L[i]; rr += R[i] * R[i]; lr += L[i] * R[i]; }
console.log(`L/R 相關 ${(lr / Math.sqrt(ll * rr)).toFixed(3)}  L-R 能量差 ${(10 * Math.log10(ll / rr)).toFixed(2)} dB`);

// ---- Goertzel 頻段能量（5 段，看有沒有「悶」或「刺」） ----
function bandEnergy(f0, f1) {
  // 用 FFT 太麻煩，這裡用多個 Goertzel 抽樣
  const freqs = [];
  for (let f = f0; f <= f1; f *= 1.12) freqs.push(f);
  let tot = 0;
  const win = Math.min(N, SR * 4);   // 取前 4 秒
  for (const f of freqs) {
    const w = 2 * Math.PI * f / SR, cw = 2 * Math.cos(w);
    let s1 = 0, s2 = 0;
    for (let i = 0; i < win; i++) { const s = L[i] + cw * s1 - s2; s2 = s1; s1 = s; }
    tot += s1 * s1 + s2 * s2 - cw * s1 * s2;
  }
  return tot / freqs.length;
}
const bands = [['超低 20-60', 20, 60], ['低 60-250', 60, 250], ['中低 250-800', 250, 800],
  ['中 800-2.5k', 800, 2500], ['中高 2.5-6k', 2500, 6000], ['空氣 6k-14k', 6000, 14000]];
const es = bands.map(([n, a, b]) => [n, bandEnergy(a, b)]);
const mx = Math.max(...es.map(e => e[1]));
console.log('頻段能量（相對 dB）：');
es.forEach(([n, v]) => console.log(`  ${n.padEnd(16)} ${(10 * Math.log10(v / mx)).toFixed(1)}`));

// ---- 循環接縫：結尾 50ms 與開頭 50ms 的跳變 ----
const w = Math.round(0.05 * SR);
let jump = 0, typ = 0;
for (let i = 0; i < w; i++) jump = Math.max(jump, Math.abs(L[N - w + i] - L[i]));
for (let i = 1; i < N; i++) typ = Math.max(typ, Math.abs(L[i] - L[i - 1]) * 0.02);
console.log(`接縫跳變 ${jump.toFixed(4)}（一般相鄰差約 ${typ.toFixed(4)}，接縫不該明顯更大）`);
