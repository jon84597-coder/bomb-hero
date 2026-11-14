// test/verify-v599.js —— v5.99：主角動作圖集「按需載入」＋ 素材預算分層
//   ① 開機不再一次解碼全部角色（舊版 8 隻角色會吃到約 115MB）
//   ② ensure() 只載被畫到的角色、release() 真的放掉、sweep() 只留名單內的
//   ③ draw() 進場會 ensure；drawSpriteChar 每 90 幀巡一次
//   ④ 素材預算分層（零件／動作圖集各自一條線），並算出「全 8 隻」的實際數字
const fs = require('fs');
const path = require('path');
const { makeEnv } = require('./_sandbox');

const ROOT = path.join(__dirname, '..');
const mainSrc = fs.readFileSync(path.join(ROOT, 'js', 'main.js'), 'utf8');
const SPR = path.join(ROOT, 'spr');

let pass = 0, fail = 0;
function ok(c, m, x) {
  if (c) { pass++; }
  else { fail++; console.log('  ✗ FAIL: ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); }
}
function sec(t) { console.log('\n' + t); }

/* ---------------------------------------------------------------- ① */
sec('① 開機不再全載');
ok(/const imgs = \{\}, ready = \{\}, started = \{\};/.test(mainSrc), '有 started 表（記錄「這隻開始載了沒」）');
const loadBlk = (mainSrc.match(/function load\(key\) \{([^}]*)\}/) || [])[1] || '';
ok(loadBlk.length > 0, 'load() 還在（舊呼叫端不會壞）');
ok(loadBlk.indexOf('Object.keys(SHEET)') < 0, 'load() 裡沒有「跑遍所有角色」的迴圈', loadBlk.trim());
ok(/function loadActs\(key\)/.test(mainSrc), '載入工作搬到 loadActs(key)（一次只載一隻）');

/* ---------------------------------------------------------------- ② */
sec('② ensure／release／sweep 行為');
// 假的 Image：只記錄「開了幾張」「清掉幾張」，不真的連網
//   注意：main.js 跑在 vm 沙盒裡，測試行程的 global.Image 它看不到 → 要掛在 env.sandbox 上
let made = 0, cleared = 0;
function FakeImage() {
  const o = { naturalWidth: 0, onload: null, onerror: null, _src: '' };
  made++;
  Object.defineProperty(o, 'src', {
    get: function () { return o._src; },
    set: function (v) { o._src = v; if (!v) cleared++; }
  });
  return o;
}
const env = makeEnv();
env.sandbox.Image = FakeImage;
const BH = env.BH;
const H = BH.HeroAnim;

made = 0;
H.load();
ok(made === 0, 'load() 不帶參數 → 一張圖都不開（舊版這裡會開 20 張）', made);

made = 0; cleared = 0;
H.ensure('rabbit');
/* v6.00：改成「按動作載入」—— 先開走路＋待機 2 支，其餘第一次用到才開（大逃殺開場不再一次解 40 張） */
ok(made === 2 && H.imgs.rabbit && H.imgs.rabbit.walk && H.imgs.rabbit.idle,
  'ensure(rabbit) 只先開走路＋待機 2 支', made);
ok(H.loaded().join(',') === 'rabbit', 'loaded() 只有 rabbit', H.loaded());

made = 0;
H.ensure('rabbit');
ok(made === 0, 'ensure 第二次不會重複開圖（同一隻只載一次）', made);

made = 0;
H.load('bear');
ok(made === 2, 'load(bear) 可以預載指定角色（2 支）', made);
ok(H.loaded().indexOf('bear') >= 0, 'bear 進入名單');

cleared = 0;
H.sweep(['bear'], 0);
ok(cleared === 2, 'sweep 只留名單內的 → rabbit 被釋放（2 支）', cleared);
ok(H.loaded().join(',') === 'bear', '名單外的角色真的從記憶體移除', H.loaded());

cleared = 0;
H.release('bear');
ok(cleared === 2, 'release(bear) 清掉 2 支', cleared);
ok(H.loaded().length === 0, '全部釋放後名單是空的', H.loaded());

// 名單內的不會被 sweep 誤殺
made = 0; cleared = 0;
H.ensure('cat');
H.sweep(['cat'], 0);
ok(cleared === 0 && H.loaded().join(',') === 'cat', '名單內的 cat 不會被釋放', cleared);
H.release('cat');

/* v6.00：拿炸彈（hold）第一次要用才開那一支 */
made = 0;
H.ensure('pig');
made = 0;                      // 只算「畫的時候」多開了幾張
const ctx0 = { drawImage: function () {}, save: function () {}, restore: function () {},
  translate: function () {}, scale: function () {} };
H.draw(ctx0, 'pig', 100, 200, 80, { carry: true, idle: 1, facing: 'down' });
ok(made === 1 && H.imgs.pig && H.imgs.pig.hold, '畫到「舉彈」時才去開 hold（開場不多解一張）', made);
made = 0;
H.draw(ctx0, 'pig', 100, 200, 80, { carry: true, idle: 1.1, facing: 'down' });
ok(made === 0, '已經開過就不會重開');
H.release('pig');

/* ---------------------------------------------------------------- ③ */
sec('③ 真的會自動載入／自動釋放');
const drawBlk = (mainSrc.match(/function draw\(g, key, x, footY, H, a\) \{([\s\S]*?)\n  \}/) || [])[1] || '';
ok(/tick\+\+;\s*\n\s*ensure\(key\);/.test(drawBlk), 'draw() 進來就 ensure(key)（第一次畫到才開始載）');
ok(/if \(\(!get\(key, act\)\)/.test(mainSrc) || /if \(!get\(key, act\)\)/.test(mainSrc),
  '圖片還沒好時仍會退回零件（不會破圖）');
ok(/if \(\(__haSweep|if \(\(\+\+_haSweep % 90\) === 0\) heroAnimSweep\(\);/.test(mainSrc),
  'drawSpriteChar 每 90 幀巡一次（把不在名單的角色放掉）');
ok(/\(Game\.players \|\| \[\]\)\.forEach\(function \(p\) \{/.test(mainSrc), '名單取自 Game.players（這局有哪些角色）');

/* ---------------------------------------------------------------- ④ */
sec('④ 素材預算分層');
const files = fs.readdirSync(SPR).filter(function (f) { return /\.webp$/.test(f); });
let total = 0, anim = 0;
files.forEach(function (f) {
  const n = fs.statSync(path.join(SPR, f)).size;
  total += n;
  /* v5.99.2：隨從的 15 支圖集也算「動作圖集」，不然會被算成零件讓這條紅。 */
  if (/^(hero|pet)-anim-/.test(f)) anim += n;
});
const mb = function (n) { return +(n / 1048576).toFixed(2); };
console.log('   現在：總 ' + mb(total) + ' MB（動作圖集 ' + mb(anim) + ' MB ＋ 零件與其他 ' + mb(total - anim) + ' MB）、' + files.length + ' 支');
ok(mb(total - anim) < 2.8, '零件與其他 ≤ 2.8 MB（不隨角色數量爆炸）', mb(total - anim));
ok(mb(anim) < 5.6, '動作圖集 ≤ 5.6 MB（8 隻 × 6 套的目標）', mb(anim));
ok(mb(total) < 8.2, '全部 webp ≤ 8.2 MB', mb(total));

// 解碼記憶體：cellW × 234 × 12 × 4 bytes（單人只載 1 隻）
const perChar = {};
files.filter(function (f) { return /^hero-anim-/.test(f); }).forEach(function (f) {
  const key = f.split('-')[2];        // hero-anim-<角色>-<動作>.webp
  const buf = fs.readFileSync(path.join(SPR, f));
  // WebP 檔頭取寬高（VP8X / VP8L / VP8）
  let w = 0, h = 0;
  const i = buf.indexOf('VP8X');
  if (i > 0 || i === 0) {
    // 'VP8X' + size(4) + flags(1) + reserved(3) → 畫布寬-1（3 bytes LE）、高-1
    w = 1 + (buf[i + 12] | (buf[i + 13] << 8) | (buf[i + 14] << 16));
    h = 1 + (buf[i + 15] | (buf[i + 16] << 8) | (buf[i + 17] << 16));
  }
  if (!w) {
    const j = buf.indexOf('VP8 ');
    if (j >= 0) { w = (buf[j + 14] | (buf[j + 15] << 8)) & 0x3fff; h = (buf[j + 16] | (buf[j + 17] << 8)) & 0x3fff; }
  }
  if (!w) {
    const k = buf.indexOf('VP8L');
    if (k >= 0) {
      const b = buf[k + 9] | (buf[k + 10] << 8) | (buf[k + 11] << 16) | (buf[k + 12] << 24);
      w = (b & 0x3fff) + 1; h = ((b >>> 14) & 0x3fff) + 1;
    }
  }
  if (!w || !h) return;
  const cell = w / 12;
  perChar[key] = (perChar[key] || 0) + cell * 234 * 12 * 4;
});
const one = Math.max.apply(null, Object.keys(perChar).map(function (k) { return perChar[k]; }) || [0]);
const all = Object.keys(perChar).reduce(function (a, k) { return a + perChar[k]; }, 0);
console.log('   解碼記憶體：最大的單一角色 ' + mb(one) + ' MB、目前 ' + Object.keys(perChar).length + ' 隻合計 ' + mb(all) + ' MB');
ok(!!one && mb(one) < 22, '單一角色全部動作 < 22 MB（單人模式只會載這一隻）', mb(one));
ok(Object.keys(perChar).length <= 8, '角色數 ≤ 8（不會無限長）', Object.keys(perChar).length);

/* ---------------------------------------------------------------- 版本 */
sec('版本戳記');
const vm = mainSrc.match(/const VERSION = '([\d.]+)'/);
ok(vm && parseFloat(vm[1]) >= 5.99, 'VERSION ≥ 5.99（' + (vm && vm[1]) + '）');
const SW = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
/* v5.99.1：改成「不低於」，以後補丁版才不會一直弄紅這支。 */
const swv599 = (SW.match(/var SW_VERSION = 'v([\d.]+)'/) || [])[1] || '0';
ok(parseFloat(swv599) >= 5.99, 'SW 版號 ≥ v5.99（實際 v' + swv599 + '）');

console.log('\n' + (fail ? '❌' : '✅') + ' v5.99：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
