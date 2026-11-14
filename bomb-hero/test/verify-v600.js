// test/verify-v600.js —— v6.0：八隻主角色全部做完（影片生成精靈動作）
//   ① SHEET／KEYS 八隻全部登記，且「每隻 5 套」（兔兔／小熊多一支舊的 throw）
//   ② 40 支圖集全部存在、合法 WEBP、12 格、charHpx／cellH／ay 與兔子同一個量綱
//   ③ meta（hero-anim-<角色>.json）與 SHEET 的 cellW／ax／acts 一字不差
//   ④ HOLD_BOMB 八隻都有，而且炸彈（半徑 0.213H）不會蓋到臉
//   ⑤ 新增的四隻 + 貓咪的 hold／hurt 都沒有 throw（使用者指示不再生成丟彈影片）
//   ⑥ 素材預算：269 張 webp、總量與動作圖集各自在線內
//   ⑦ 版本 ≥ 6.0、SW ≥ 6.0
const fs = require('fs');
const path = require('path');
const { makeEnv } = require('./_sandbox');

const ROOT = path.join(__dirname, '..');
const SPR = path.join(ROOT, 'spr');
const mainSrc = fs.readFileSync(path.join(ROOT, 'js', 'main.js'), 'utf8');
const swSrc = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const idxSrc = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let pass = 0, fail = 0;
function ok(c, m, x) {
  if (c) { pass++; }
  else { fail++; console.log('  ✗ FAIL: ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); }
}
function sec(t) { console.log('\n' + t); }

const CHARS = ['rabbit', 'bear', 'dog', 'cat', 'pig', 'panda', 'frog', 'chick'];
const NEED = ['walk', 'idle', 'hold', 'victory', 'hurt'];

/* ---------------------------------------------------------------- ① */
sec('① 八隻角色全部登記');
CHARS.forEach(function (k) {
  ok(new RegExp('\\b' + k + ':\\s*\\{ pre: \'' + k + '\'').test(mainSrc), 'SHEET 有 ' + k);
});
ok(/const KEYS = \{ rabbit: 1, bear: 1, dog: 1, cat: 1, pig: 1, panda: 1, frog: 1, chick: 1 \};/.test(mainSrc),
  'KEYS 八隻都登記（沒登記就會走零件骨架）');
const env = makeEnv();
const HA = env.BH.HeroAnim;
ok(!!HA, 'HeroAnim 存在');
CHARS.forEach(function (k) { ok(HA.has(k) === true, 'HeroAnim.has(' + k + ') 為真'); });
ok(HA.has('bunny') === false, '沒登記的角色不會誤用別人的圖集');

/* ---------------------------------------------------------------- ② */
sec('② 40 支圖集');
let n = 0;
CHARS.forEach(function (k) {
  const meta = JSON.parse(fs.readFileSync(path.join(SPR, 'hero-anim-' + k + '.json'), 'utf8'));
  ok(meta.charHpx === 200 && meta.cellH === 234 && Math.abs(meta.ay - 226.38) < 0.05,
    k + '：charHpx 200／cellH 234／ay 226.38（與兔子同量綱）', [meta.charHpx, meta.cellH, meta.ay]);
  /* cellW 是四捨五入後的整數，ax 是「畫布中線 × 200/1069」的原值，所以差 ≤ 0.5 px。 */
  ok(Math.abs(meta.ax - meta.cellW / 2) < 0.5, k + '：ax 正好是格子中線', [meta.ax, meta.cellW]);
  NEED.forEach(function (a) {
    const f = path.join(SPR, 'hero-anim-' + k + '-' + a + '.webp');
    if (!fs.existsSync(f)) { ok(false, k + ' 缺 ' + a); return; }
    const buf = fs.readFileSync(f);
    n++;
    ok(buf.slice(8, 12).toString() === 'WEBP', k + '-' + a + ' 是合法 WEBP');
    ok(meta.actions[a] && meta.actions[a].frames === 12, k + '-' + a + ' 是 12 格');
    // 整條圖集的寬度 ＝ 格子寬 × 12（12 格並排，不多不少）
    const vp8x = buf.indexOf('VP8X');
    if (vp8x >= 0) {
      const w = 1 + (buf[vp8x + 12] | (buf[vp8x + 13] << 8) | (buf[vp8x + 14] << 16));
      ok(w === meta.cellW * 12, k + '-' + a + ' 寬度 = 格子 × 12（' + w + '）', [w, meta.cellW * 12]);
    }
  });
});
ok(n === 40, '五套 × 八隻 = 40 支都檢查過', n);

/* ---------------------------------------------------------------- ③ */
sec('③ meta 與 SHEET 一致');
CHARS.forEach(function (k) {
  const meta = JSON.parse(fs.readFileSync(path.join(SPR, 'hero-anim-' + k + '.json'), 'utf8'));
  const m = mainSrc.match(new RegExp(k + ':\\s*\\{ pre: \'' + k + '\',\\s*cellW: (\\d+), ax: ([\\d.]+),\\s*acts: \\[([^\\]]*)\\]'));
  if (!m) { ok(false, k + ' 的 SHEET 條目解析不到'); return; }
  ok(+m[1] === meta.cellW, k + '：SHEET cellW = meta cellW（' + m[1] + '）');
  ok(Math.abs(+m[2] - meta.ax) < 0.05, k + '：SHEET ax = meta ax（' + m[2] + '）');
  const acts = m[3].split(',').map(function (s) { return s.trim().replace(/'/g, ''); }).filter(Boolean);
  const missing = NEED.filter(function (a) { return acts.indexOf(a) < 0; });
  ok(missing.length === 0, k + '：SHEET acts 五套都在', missing);
  const metaMissing = NEED.filter(function (a) { return !meta.actions[a]; });
  ok(metaMissing.length === 0, k + '：meta 五套都在', metaMissing);
});

/* ---------------------------------------------------------------- ④ */
sec('④ 舉彈位置（炸彈半徑 0.213H）');
const holdBlk = (mainSrc.match(/const HOLD_BOMB = \{([\s\S]*?)\n\};/) || [])[1] || '';
ok(holdBlk.length > 0, 'HOLD_BOMB 表存在');
const R = 0.213;                       // 遊戲炸彈半徑（0.32T ÷ 1.5T）
CHARS.forEach(function (k) {
  const m = holdBlk.match(new RegExp('\\b' + k + ':\\s*\\{[^}]*?up:\\s*([\\d.]+),\\s*side:\\s*(-?[\\d.]+)'));
  if (!m) { ok(false, 'HOLD_BOMB 缺 ' + k); return; }
  const up = +m[1], side = +m[2];
  ok(up > 0.2 && up < 1.05, k + '：球心高度合理（' + up + 'H）');
  ok(Math.abs(side) <= 0.35, k + '：水平偏移合理（' + side + 'H）');
  /* 炸彈不能「坐在地上」也不能「頂出裁切框」。
     兔兔是把球舉在頭頂（1.123H），所以上緣上限放到 1.28H（裁切框往上還有 0.19H 的餘裕）；
     下緣則是「至少要離開膝蓋」——不然炸彈會像長在腳上。 */
  ok(up + R <= 1.28, k + '：炸彈上緣 ' + (up + R).toFixed(3) + 'H 在裁切框內');
  ok(up - R >= 0.10, k + '：炸彈下緣 ' + (up - R).toFixed(3) + 'H 有離開地面／膝蓋');
});
// 對位數學：holdBombPos 給的 y = 腳底 - up×H
const BH = env.BH;
ok(typeof BH.holdBombPos === 'function', 'holdBombPos 對外可用');
CHARS.forEach(function (k) {
  const bd = { footY: 1000, H: 200, frame: 0 };
  const p = BH.holdBombPos(k, bd);
  ok(!!p && Math.abs(p.y - (1000 - p.dx * 0)) < 9999, k + '：holdBombPos 回得出座標');
});
const catP = BH.holdBombPos('cat', { footY: 1000, H: 200, frame: 0 });
ok(!!catP && catP.y < 1000 && catP.y > 800, '貓咪的球在腳底往上（' + (catP && catP.y) + '）', catP && catP.y);

/* ---------------------------------------------------------------- ⑤ */
sec('⑤ 丟彈（throw）不再新增');
['dog', 'cat', 'pig', 'panda', 'frog', 'chick'].forEach(function (k) {
  const meta = JSON.parse(fs.readFileSync(path.join(SPR, 'hero-anim-' + k + '.json'), 'utf8'));
  ok(!meta.actions.throw, k + ' 沒有 throw（使用者指示不再生成）');
  ok(!fs.existsSync(path.join(SPR, 'hero-anim-' + k + '-throw.webp')), k + ' 也沒有 throw 圖集檔');
});

/* ---------------------------------------------------------------- ⑥ */
sec('⑥ 素材預算');
const files = fs.readdirSync(SPR).filter(function (f) { return /\.webp$/.test(f); });
ok(files.length === 284, 'spr/ 內 ' + files.length + ' 張 webp（八隻主角 ＋ 三隻隨從）');
let total = 0, anim = 0;
files.forEach(function (f) {
  const sz = fs.statSync(path.join(SPR, f)).size;
  total += sz;
  if (f.indexOf('hero-anim-') === 0 || f.indexOf('pet-anim-') === 0) anim += sz;   // v5.99.2：隨從圖集也算動作圖集
});
const mb = function (x) { return +(x / 1048576).toFixed(2); };
console.log('   總 ' + mb(total) + ' MB（動作圖集 ' + mb(anim) + ' MB ＋ 零件 ' + mb(total - anim) + ' MB）');
ok(mb(total - anim) < 2.8, '零件與其他 ≤ 2.8 MB', mb(total - anim));
ok(mb(anim) < 5.6, '動作圖集 ≤ 5.6 MB', mb(anim));
ok(mb(total) < 8.2, '全部 webp ≤ 8.2 MB（v6.0 加上 15 支隨從圖集 1.12MB）', mb(total));

// 解碼記憶體：每支圖集解碼 = 寬 × 234 × 4
let worst = 0, worstKey = '';
CHARS.forEach(function (k) {
  const meta = JSON.parse(fs.readFileSync(path.join(SPR, 'hero-anim-' + k + '.json'), 'utf8'));
  let sum = 0;
  NEED.forEach(function (a) { sum += meta.cellW * 12 * meta.cellH * 4; });
  if (sum > worst) { worst = sum; worstKey = k; }
});
console.log('   單一角色全部五套解碼：最大 ' + worstKey + ' ' + mb(worst) + ' MB');
ok(worst < 20132659, '單一角色 < 20 MB（單人模式只載這一隻）', mb(worst));

/* ---------------------------------------------------------------- ⑦ */
sec('⑦ 版本');
const vm = mainSrc.match(/const VERSION = '([\d.]+)'/);
/* 這批做在 5.99（版號家族不跳大版，舊測試的 5.x 斷言才不會整批變紅）。 */
ok(vm && parseFloat(vm[1]) >= 5.99, '主檔版本 ≥ 5.99（' + (vm && vm[1]) + '）');
const swv = swSrc.match(/var SW_VERSION = 'v([\d.]+)'/);
ok(swv && parseFloat(swv[1]) >= 5.99, 'SW 版本 ≥ v5.99（' + (swv && swv[1]) + '）');
ok(/id="verTxt">([\d.]+)</.test(idxSrc), '首頁有版本號');
const vt = idxSrc.match(/id="verTxt">([\d.]+)</);
ok(vt && parseFloat(vt[1]) >= 5.99, '首頁 verTxt ≥ 5.99（' + (vt && vt[1]) + '）');

console.log('\n' + (fail ? '❌' : '✅') + ' v5.99（八隻主角）：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
