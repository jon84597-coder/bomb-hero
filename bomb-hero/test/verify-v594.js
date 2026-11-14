// test/verify-v594.js —— v5.94 第二支主角色「小熊」（影片生成精靈動作）
//   ① 六套圖都在、尺寸／格數正確（v5.95 補 hurt、v5.96 補 throw）
//   ② HeroAnim 是多角色表：每隻自己的 cellW／ax（小熊比兔子胖，畫布 1080）
//   ③ 沒做的動作要退回待機，不能回 null 掉回零件骨架
//   ④ HOLD_BOMB.bear 逐格高度／水平偏移與 ball-bear-hold.json 一致
//   ⑤ 對位數學：球心在格子裡的位置 ＝ 炸彈擺的位置（ax / SCALE 的交叉驗證）
//   ⑥ 版本與素材清單
const fs = require('fs');
const path = require('path');
const { makeEnv } = require('./_sandbox');

const ROOT = path.join(__dirname, '..');
const SPR = path.join(ROOT, 'spr');
const mainSrc = fs.readFileSync(path.join(ROOT, 'js', 'main.js'), 'utf8');
const idxSrc = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; } else { fail++; console.log('  ✗ FAIL: ' + m); } }
function sec(t) { console.log('\n' + t); }

// ---------- ① 圖集 ----------
sec('① 小熊六套圖集');
const ACTS = ['walk', 'idle', 'hold', 'victory', 'hurt', 'throw'];
ACTS.forEach(function (a) {
  const f = path.join(SPR, 'hero-anim-bear-' + a + '.webp');
  ok(fs.existsSync(f), '有 hero-anim-bear-' + a + '.webp');
});
const meta = JSON.parse(fs.readFileSync(path.join(SPR, 'hero-anim-bear.json'), 'utf8'));
ok(meta.charHpx === 200, 'charHpx = 200（與兔子同一個量綱）');
ok(meta.cellW === 202 && meta.cellH === 234, '格子 202x234（兔子 142x234，寬是因為熊胖）');
ok(Math.abs(meta.ax - 101.03) < 0.05 && Math.abs(meta.ay - 226.38) < 0.05,
  '錨點 (101.03, 226.38)：ax 剛好是格子中線，ay 與兔子相同');
ok(Object.keys(meta.actions).length === 6, '六套齊全（v5.96：throw 改用「上拋接住」重生成後補上）');
ok(!!meta.actions.throw && !!meta.actions.hurt, 'throw 與 hurt 都真的補上了（不是空殼）');

// 每一張都要真的是 12 格
ACTS.forEach(function (a) {
  const buf = fs.readFileSync(path.join(SPR, 'hero-anim-bear-' + a + '.webp'));
  const magic = buf.slice(8, 12).toString();
  ok(magic === 'WEBP', a + ' 是合法 WEBP');
});

// ---------- ② 多角色表 ----------
sec('② HeroAnim 多角色');
const env = makeEnv();
const BA = env.BH.HeroAnim;
ok(!!BA, 'HeroAnim 存在');
ok(BA.has('rabbit') === true && BA.has('bear') === true, 'rabbit 與 bear 都有精靈動作');
/* v6.0：八隻全部都有圖集了 —— 改成驗「沒登記的 key 一律 false」，
   這樣才不會因為又補了一隻角色就變紅。 */
ok(BA.has('bunny') === false, '沒登記的角色（bunny）走零件，不會誤用別人的圖集');
const mt = mainSrc.match(/const META = \{ charHpx: ([\d.]+), cellH: (\d+), ay: ([\d.]+), frames: (\d+) \};/);
ok(!!mt && +mt[1] === 200 && +mt[2] === 234 && Math.abs(+mt[3] - 226.38) < .01,
  '全域 META 只剩「所有角色共用」的常數（cellW／ax 已下放到每隻角色）');
ok(/rabbit: \{ pre: 'rabbit',\s*cellW: 142,\s*ax: 71\.09/.test(mainSrc), '兔子格子 142／ax 71.09');
ok(/bear:\s*\{ pre: 'bear',\s*cellW: 202,\s*ax: 101\.03/.test(mainSrc), '小熊格子 202／ax 101.03');
ok(/im\.src = 'spr\/hero-anim-' \+ sh\.pre \+ '-' \+ k \+ '\.webp'/.test(mainSrc),
  '檔名是動態組的（hero-anim-<角色>-<動作>），不是硬寫 rabbit');

// ---------- ③ 動作退回 ----------
sec('③ 沒做的動作退回待機');
ok(BA.pick({ expr: 'cry' }) === 'hurt', '受傷的「意圖」還是 hurt');
ok(BA.pick({ carry: true }) === 'hold', '拿炸彈 → hold');
ok(BA.pick({ act: 'throw' }) === 'throw', '明確指定 throw 的意圖不變');
ok(/if \(!get\(key, act\)\) \{[\s\S]{0,200}?act = get\(key, 'idle'\) \? 'idle'/.test(mainSrc),
  'draw 會把不存在的動作退到 idle（小熊拿炸彈受傷時不會掉回零件骨架）');
ok(/if \(!act\) return null;/.test(mainSrc), '整套圖都沒載完才回 null');

// ---------- ④ 舉彈位置表 ----------
sec('④ 舉彈位置逐格表');
const ball = JSON.parse(fs.readFileSync(path.join(ROOT, 'art', 'anim-v2', 'ball-bear-hold.json'), 'utf8'));
const bearBlk = mainSrc.match(/bear: \{\n    up: [\d.]+, side: 0,\n    upFrames:   (\[[^\]]*\]),\n    sideFrames: (\[[^\]]*\])/);
ok(!!bearBlk, 'main.js 有 bear 的 upFrames／sideFrames');
if (bearBlk) {
  const ups = JSON.parse(bearBlk[1]), dxs = JSON.parse(bearBlk[2]);
  ok(ups.length === 12 && dxs.length === 12, '兩個表都是 12 格（對得上 12 張圖）');
  ok(ups.every(function (v) { return v > .70 && v < 1.02; }), 'up 都在 0.70~1.02H（舉在頭頂，不可能到腳底）');
  ok(Math.max.apply(null, dxs) - Math.min.apply(null, dxs) > .05, '水平偏移真的有變化（球會左右晃，所以要逐格跟）');
  let same = true;
  for (let i = 0; i < 12; i++) {
    if (Math.abs(ups[i] - ball.upFrames[i]) > 1e-6) same = false;
    if (Math.abs(dxs[i] - ball.sideFrames[i]) > 1e-6) same = false;
  }
  ok(same, '與 art/anim-v2/ball-bear-hold.json 完全一致（不是手抄的）');
}

// ---------- ⑤ 對位數學 ----------
sec('⑤ 對位數學交叉驗證');
const env2 = makeEnv();
if (env2.BH && typeof env2.BH.holdBombPos === 'function') {
  const r0 = env2.BH.holdBombPos('bear', { footY: 500, H: 200, frame: 0 });
  ok(!!r0 && Math.abs(r0.y - (500 - 0.8149 * 200)) < .01, '第 0 格 y = 腳底 − 0.8149H（實際 ' + (r0 && r0.y) + '）');
  ok(!!r0 && Math.abs(r0.dx - (-0.0346 * 200)) < .01, '第 0 格 dx = −0.0346H（實際 ' + (r0 && r0.dx) + '）');
  const r6 = env2.BH.holdBombPos('bear', { footY: 500, H: 200, frame: 6 });
  ok(!!r6 && Math.abs(r6.dx - (0.0819 * 200)) < .01, '第 6 格 dx 明顯偏右（逐格表真的有用到）');
  const rn = env2.BH.holdBombPos('bear', { footY: 500, H: 200 });
  ok(!!rn && Math.abs(rn.y - (500 - 0.83 * 200)) < .01, '沒給 frame 時用常數 up = 0.83');
} else {
  ok(false, 'holdBombPos 沒有暴露');
}

// 球心在格子裡的位置必須等於「錨點 + side*200」—— 驗 SCALE／ax 沒寫錯
const SCALE = 200 / 1069;
const axFromCanvas = 540 * SCALE;       // anim_batch 把小熊中心放在 canvas x=540
ok(Math.abs(axFromCanvas - 101.03) < 0.05, 'ax = 540 × (200/1069) = ' + axFromCanvas.toFixed(2) + '（格子中線）');
const ballCx = 540 + 0.0819 * 1069;     // 第 6 格球心（canvas 座標）
const ballInCell = ballCx * SCALE;
ok(Math.abs(ballInCell - (axFromCanvas + 0.0819 * 200)) < 0.5,
  '球心在格子裡 ＝ 錨點 + side·200（' + ballInCell.toFixed(1) + ' vs ' + (axFromCanvas + 0.0819 * 200).toFixed(1) + '）');

// ---------- ⑥ 版本與清單 ----------
sec('⑥ 版本與素材清單');
const vm = mainSrc.match(/const VERSION = '([\d.]+)'/);
ok(!!vm && parseFloat(vm[1]) >= 5.94, '主檔版本 ≥ 5.94（實際 ' + (vm ? vm[1] : '?') + '）');
ok(/<span id="verTxt">(5\.9\d|[6-9]\.\d+)<\/span>/.test(idxSrc), 'index.html 版本戳記同步');
const list = JSON.parse(fs.readFileSync(path.join(SPR, '_list.json'), 'utf8'));
ACTS.forEach(function (a) {
  ok(list.indexOf('hero-anim-bear-' + a + '.webp') >= 0, '_list.json 有小熊 ' + a);
});
ok(list.indexOf('hero-anim-bear.json') >= 0, '_list.json 有小熊 meta');
ok(list.indexOf('hero-anim-bear-throw.webp') >= 0 && list.indexOf('hero-anim-bear-hurt.webp') >= 0, '_list.json 有小熊 throw 與 hurt');

console.log('\n' + (fail ? '❌' : '✅') + ' v5.94：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
