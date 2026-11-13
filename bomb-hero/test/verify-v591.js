// test/verify-v591.js —— v5.91 手舉炸彈的位置 ＋ 選角動畫速度
//   ① 炸彈要擺在「舉彈素材挖掉那顆球」的缺口裡（兔子 up ≈ 0.95~1.02H，水平不偏）
//   ② 每隻角色各自校準：HOLD_BOMB 表 + holdBombPos()，沒列到的走舊公式
//   ③ 拿炸彈一律用舉彈姿勢（含走動）—— walk 的手垂在身側，炸彈會脫手浮在頭上
//   ④ 拿在手上的彈不投影（影子會蓋在臉上）
//   ⑤ 選角預覽：精靈走路補 1.9 倍速，跟零件骨架的節奏一致（不然慢 1.9 倍）
//   ⑥ 版本
const fs = require('fs');
const path = require('path');
const { makeEnv } = require('./_sandbox');

const ROOT = path.join(__dirname, '..');
const mainSrc = fs.readFileSync(path.join(ROOT, 'js/main.js'), 'utf8');
const idxSrc = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const swSrc = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const json = JSON.parse(fs.readFileSync(path.join(ROOT, 'spr/hero-anim-rabbit.json'), 'utf8'));

let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; } else { fail++; console.log('  ✗ FAIL: ' + m); } }
function sec(n) { console.log('\n=== ' + n + ' ==='); }

/* ① 校準數字 */
sec('① 兔子炸彈位置（從素材反推）');
const tableM = mainSrc.match(/const HOLD_BOMB = \{([\s\S]*?)\n\};/);
ok(!!tableM, 'main.js 有 HOLD_BOMB 表（每隻角色各自校準）');
// v5.92：rabbit 的 up 後面多了 upFrames，正則改成「同一個 rabbit 物件裡找 up／side」
const upM = tableM && tableM[1].match(/rabbit:\s*\{[\s\S]{0,400}?up:\s*([\d.]+),[\s\S]{0,400}?side:\s*(-?[\d.]+)/);
ok(!!upM, 'rabbit 有自己的 up／side');
if (upM) {
  const up = +upM[1], side = +upM[2];
  // 素材實測：球心距腳底 0.949~0.968H（v5.92 逐格量測，取中位當常數）
  ok(up > 0.90 && up < 1.03, 'up 落在 0.90~1.03H（實際 ' + up + '，素材球心 0.95H）');
  ok(Math.abs(side) < 0.06, 'side 幾乎不偏（實際 ' + side + '）');
}

// 把 HOLD_BOMB + holdBombPos 抽出來單獨跑（跟 sw 的 warmBucket 同一招）
let holdPos = null;
try {
  const i = mainSrc.indexOf('const HOLD_BOMB = {');
  const j = mainSrc.indexOf('function holdBombPos', i);
  let d = 0, k = mainSrc.indexOf('{', j);
  for (; k < mainSrc.length; k++) { const c = mainSrc[k]; if (c === '{') d++; else if (c === '}') { d--; if (!d) { k++; break; } } }
  holdPos = new Function(mainSrc.slice(i, k) + '\nreturn holdBombPos;')();
} catch (e) { ok(false, 'holdBombPos 挖不出來：' + e.message); }

/* ② 位置計算 */
sec('② holdBombPos 計算');
if (typeof holdPos === 'function') {
  const r = holdPos('rabbit', { footY: 500, H: 200 });
  ok(!!r && Math.abs(r.y - (500 - (+upM[1]) * 200)) < 0.01, '兔子：y = 腳底 − up·H（實際 ' + (r && r.y) + '）');
  ok(!!r && Math.abs(r.dx) < 0.06 * 200, '兔子：水平偏移在 0.06H 內（實際 ' + (r && r.dx) + '）');
  ok(holdPos('bear', { footY: 500, H: 200 }) === null, '沒校準的角色 → null（走舊公式）');
  ok(holdPos('rabbit', { H: 200 }) === null, '沒有 footY → null（不會算出 NaN 座標）');
  ok(holdPos('rabbit', { footY: 500, H: 0 }) === null, '沒有 H → null');
}

/* ③ 接線 */
sec('③ drawPlayer 接線');
ok(/const hb = holdBombPos\(c\.animal, bd\);/.test(mainSrc), 'drawPlayer 用 holdBombPos(c.animal, bd)');
ok(/b\.px = p\.x; b\.py = bd\.topY - R \* 1\.7;/.test(mainSrc), '其餘角色仍走舊公式 topY − 1.7R');
ok(/if \(hb\) \{/.test(mainSrc), '有校準才換位置');

const env = makeEnv();
const H = env.BH.HeroAnim;
const holdImg = env.fakeImg(1704, 234);
const walkImg = env.fakeImg(1704, 234);
H.inject('hold', holdImg);
H.inject('walk', walkImg);

function drawn(ctx) {
  const c = ctx.__calls.filter(function (x) { return x[0] === 'drawImage'; });
  return c[c.length - 1] || null;
}

sec('④ 拿炸彈 → 舉彈圖');
let ctx = env.mkCtx2D();
H.draw(ctx, 'rabbit', 100, 300, 200, { carry: true, moving: true });
let d = drawn(ctx);
ok(!!d && d[1] === holdImg, '拿炸彈走動畫的是 hold（不是 walk）');
ok(H.pick({ carry: true, moving: true }) === 'hold', 'pick：carry + moving → hold');

sec('⑤ 拿在手上的彈不投影');
ok(/if \(!b\.held\) softShadow\(x, y \+ r \* \.9 - lift/.test(mainSrc), 'drawBomb 對 held 的彈跳過 softShadow');
ok(/if \(!b\.held\) softShadow/.test(mainSrc), '（同一條規則只寫一次）');

/* ⑥ 選角速度 */
sec('⑥ 選角預覽不會慢半拍');
ok(/const animSpd = 1\.9;/.test(mainSrc), 'CharPreview 給了 animSpd = 1.9');
ok(/animSpd: animSpd/.test(mainSrc), 'CharPreview 把 animSpd 傳進 drawSpriteChar');
ok(/const spd = \(a\.animSpd > 0\) \? a\.animSpd : 1;/.test(mainSrc), 'HeroAnim.frameOf 吃 animSpd');

// 實測幀序：walk = 7.5 → t = 0.5s → 15fps → 第 7 格；乘 1.9 → 第 14 格 → 12 格循環回 2
ctx = env.mkCtx2D();
H.draw(ctx, 'rabbit', 100, 300, 200, { walk: 7.5, moving: true });
d = drawn(ctx);
ok(!!d && d[2] === 7 * json.cellW, 'walk 7.5、無倍率 → 第 7 格（sx ' + (d && d[2]) + '）');
ctx = env.mkCtx2D();
H.draw(ctx, 'rabbit', 100, 300, 200, { walk: 7.5, moving: true, animSpd: 1.9 });
d = drawn(ctx);
ok(!!d && d[2] === (14 % 12) * json.cellW, 'walk 7.5、1.9 倍 → 第 14 格 → 循環回第 2 格（sx ' + (d && d[2]) + '）');
// 節奏對齊的算術：預覽 walk 4.6 rad/s，零件骨架一輪 2π/4.6 = 1.366 秒；
// 12 格 ÷ 1.366 秒 = 8.78fps，而 4.6fps × 1.9 = 8.74fps → 兩邊一輪都在 1.37 秒
const wantFps = 12 / (2 * Math.PI / 4.6);
ok(Math.abs(4.6 * 1.9 - wantFps) < 0.1, '倍率與零件骨架同節奏（4.6×1.9 = ' + (4.6 * 1.9).toFixed(2) + ' vs 需要 ' + wantFps.toFixed(2) + '）');

/* ⑦ 版本 */
sec('⑦ 版本');
const vm2 = mainSrc.match(/const VERSION = '([\d.]+)'/);
ok(!!vm2 && parseFloat(vm2[1]) >= 5.91, '主檔版本 ≥ 5.91（實際 ' + (vm2 ? vm2[1] : '?') + '）');
ok(/<span id="verTxt">5\.9\d<\/span>/.test(idxSrc), 'index.html 版本戳記同步');
ok(/SW_VERSION = 'v5\.9\d\.0'/.test(swSrc), 'sw.js 版號跟著升');
ok(/v: '5\.91'/.test(fs.readFileSync(path.join(ROOT, 'js/version-log.js'), 'utf8')), '版本紀錄有 5.91');
ok(mainSrc.length < 1950000, '主檔仍在預算內（' + mainSrc.length + ' / 1,950,000）');

console.log('\n' + '─'.repeat(28));
console.log('通過 ' + pass + ' 項，失敗 ' + fail + ' 項');
process.exit(fail ? 1 : 0);
