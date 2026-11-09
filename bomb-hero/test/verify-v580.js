// test/verify-v580.js —— v5.79 復仇推車換成「木箱四輪車」
//   ① 四顆輪子都真的畫出來（沙盒記錄 draw call，數 arc 的半徑）
//   ② 木箱有木紋／節疤／釘頭／角柱（bezier + ellipse + 小圓）
//   ③ 箱上有塗鴉（四組配色，依車號固定）
//   ④ 「角色裁到箱口上緣」→ 下半身一定在箱子裡；前板壓在角色之後才畫
//   ⑤ 車上的人不再跟著受傷閃爍（不然整台車會沒人）
//   ⑥ 集氣條／手上炸彈／落點預告都還在（沒被新畫法擠掉）
//   ⑦ 版本 >= 5.79 七處一致
const fs = require('fs');
const path = require('path');
const { makeEnv } = require('./_sandbox');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const mainJs = read('js/main.js');
const idx = read('index.html');

let pass = 0, fail = 0;
function ok(c, m, x) {
  if (c) { pass++; console.log('  ✓ ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); }
  else { fail++; console.log('  ✗ FAIL: ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }

/* 取 drawCart 的原始碼片段 */
const cartSrc = (function () {
  const a = mainJs.indexOf('function drawCart(p, T)');
  const b = mainJs.indexOf('// 回傳 { topY', a);
  return mainJs.slice(a, b > a ? b : a + 26000);
})();

// ================================================================
head('1. 真的畫出四顆輪子（不是只畫兩顆）');
{
  const env = makeEnv();
  const P = env.BH, G = P.Game, rec = env.rec;
  P.startSolo(1, false, false);
  const T = 60;
  const p = G.players[0];
  p.cart = true; p.alive = false; p.dead = false;
  p.x = 6 * T; p.y = 6 * T;
  p.moving = true; p.walkT = .9; p.invuln = 0; p.cartCd = 1.5; p.cartCharge = 0;
  G.mode = 'battle'; G.gameT = 1.4;

  rec.calls.length = 0; rec.sets.length = 0;
  let boom = null;
  try { P.drawCart(p, T); } catch (e) { boom = String(e); }
  ok(!boom, 'drawCart 跑得起來', boom || 'ok');

  const calls = rec.calls.filter(function (c) { return c[0] === 'arc'; });
  const near = function (r, want) { return calls.filter(function (c) { return Math.abs(c[3] - want) < .08; }); };
  const front = near(0, T * .180), rear = near(0, T * .150);
  ok(front.length === 2, '前輪 2 顆（半徑 T×.180）', front.length);
  ok(rear.length === 2, '後輪 2 顆（半徑 T×.150）', rear.length);
  ok(front.length + rear.length === 4, '★ 四輪都在（不是只剩前面兩顆）', front.length + rear.length);
  /* 前輪要比後輪大，而且都在箱子下方／後方 */
  ok(front[0][3] > rear[0][3], '前輪比後輪大（透視：近大遠小）',
    { 前: +front[0][3].toFixed(1), 後: +rear[0][3].toFixed(1) });

  const anyClip = rec.calls.some(function (c) { return c[0] === 'clip'; });
  ok(anyClip, '★ 有 clip（角色被裁在箱口上緣）');
  const saves = rec.calls.filter(function (c) { return c[0] === 'save'; }).length;
  const rest = rec.calls.filter(function (c) { return c[0] === 'restore'; }).length;
  ok(saves === rest, 'save／restore 數量對得上（不會漏還原）', { save: saves, restore: rest });
}

// ================================================================
head('2. 木箱的細節：木紋、節疤、釘頭、角柱');
{
  const env = makeEnv();
  const P = env.BH, G = P.Game, rec = env.rec;
  P.startSolo(1, false, false);
  const T = 60;
  const p = G.players[0];
  p.cart = true; p.alive = false; p.x = 6 * T; p.y = 6 * T;
  p.moving = false; p.walkT = 0; p.invuln = 0; p.cartCd = 0;
  G.mode = 'battle'; G.gameT = 1.4;

  rec.calls.length = 0;
  try { P.drawCart(p, T); } catch (e) {}
  const bez = rec.calls.filter(function (c) { return c[0] === 'bezierCurveTo'; }).length;
  const ell = rec.calls.filter(function (c) { return c[0] === 'ellipse'; }).length;
  const fills = rec.calls.filter(function (c) { return c[0] === 'fillRect'; }).length;
  ok(bez >= 6, '木紋／簽名用曲線畫（bezier ≥ 6）', bez);
  ok(ell >= 4, '有節疤與噴漆色塊（ellipse ≥ 4）', ell);
  ok(fills >= 8, '有板面／釘頭／角柱這種方塊細節（fillRect ≥ 8）', fills);
}

// ================================================================
head('3. 塗鴉：四組配色，依車號固定');
{
  ok(/const GP = \[\['#ff4f86'/.test(cartSrc), '有塗鴉配色表 GP');
  const m = cartSrc.match(/const GP = \[([\s\S]*?)\];/);
  const n = m ? (m[1].match(/#[0-9a-fA-F]{6}/g) || []).length : 0;
  ok(n >= 8, '至少四組（每組兩色）', n);
  ok(/GP\[cgi % GP\.length\]/.test(cartSrc), '依車號挑色（同一台車每幀都一樣）');
  ok(/Game\.players\.indexOf\(p\)/.test(cartSrc), '車號來自 players 順序');
}

// ================================================================
head('4. 角色一定在箱子裡：裁切 ＋ 前板壓在角色之後');
{
  const iClip = cartSrc.indexOf('ctx.clip()');
  const iDraw = cartSrc.indexOf('drawPlayer(p, T)');
  ok(iClip > 0 && iDraw > 0, '有「裁切 → 畫角色」兩步');
  ok(iClip < iDraw, '★ 先 clip 再畫角色（下半身自動被切掉）', { clip: iClip, draw: iDraw });
  ok(/p\.y = y - T \* \.10/.test(cartSrc), '角色坐在箱子裡（不是站在箱子前）');
  /* 裁切矩形要停在箱口上緣 frontTop，不能一路裁到腳底 */
  ok(/\(frontTop - \(y - T \* 3\.2\)\) \+ 1/.test(cartSrc), '裁切框底部 = 箱口前緣 frontTop');

  const iPlate = cartSrc.indexOf('前板：壓在角色前面');
  ok(iPlate > iDraw, '★ 前板在角色「之後」才畫（蓋住切邊）', { draw: iDraw, plate: iPlate });
  const iFront = cartSrc.indexOf("cartWheel(x - T * .290");
  ok(iFront > iPlate, '前輪在最外層（壓在前板上）', { plate: iPlate, front: iFront });
  ok(/frontTop = y - T \* \.06/.test(cartSrc) && /bottom = y \+ T \* \.33/.test(cartSrc),
    '箱口 / 箱底高度固定（前板夠深，木紋與塗鴉有面積）');
}

// ================================================================
head('5. 車上的人不會跟著受傷閃爍');
{
  ok(/p\.invuln = 0;/.test(cartSrc), '畫之前把無敵時間歸零（不閃爍）');
  ok(/p\.y = savedY; p\.invuln = savedInv;/.test(cartSrc), '畫完還原（不影響玩法判定）');
}

// ================================================================
head('6. 原本的投擲 UI 沒被新畫法擠掉');
{
  ok(/drawBombArt\(holdR, 2\.4, hotHold, true, false/.test(cartSrc), '手上拿著炸彈（沿用地上那顆的畫法）');
  ok(/const holdR = T \* \.23/.test(cartSrc), '手上炸彈大小固定');
  ok(/集氣 ' \+ Math\.round\(q \* 100\)/.test(cartSrc), '集氣條顯示百分比');
  ok(/ctx\.setLineDash\(\[T \* \.26, T \* \.14\]\)/.test(cartSrc), '落點用跑動的粗虛線框');
  ok(/const fp = land\.path \|\| \[\]/.test(cartSrc), '瞄準線沿飛行路徑畫');
  ok(/冷卻 ' \+ Math\.max\(0, p\.cartCd\)\.toFixed\(1\)/.test(cartSrc), '冷卻時顯示剩餘秒數');
}

// ================================================================
head('7. 版本 >= 5.79 七處一致');
{
  const ver = mainJs.match(/const VERSION = '([\d.]+)'/);
  ok(ver && parseFloat(ver[1]) >= 5.79, 'VERSION >= 5.79', ver && ver[1]);
  const V = ver ? ver[1] : '0';
  const esc = V.replace(/\./g, '\\.');
  ok(new RegExp('id="verTxt"[^>]*>' + esc + '<').test(idx), 'index.html verTxt = ' + V);
  ok(new RegExp('id="verLogVer"[^>]*>' + esc + '<').test(idx), 'index.html 版本面板 = ' + V);
  const vlog = read('js/version-log.js');
  ok(/\{ v: '5\.79'/.test(vlog), 'VERSION_LOG 有 5.79');
  ok(/\{ v: '5\.78',[^}]*now: false/.test(vlog), '5.78 收成 now:false');
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, '..', 'package.json'), 'utf8'));
  ok(parseFloat(pkg.version) >= 5.79, 'package.json >= 5.79', pkg.version);
  [path.join(ROOT, 'sw.js'), path.join(ROOT, '..', 'public', 'sw.js'),
    path.join(ROOT, '..', 'bomberman-online', 'public', 'sw.js')].forEach(function (f) {
      if (!fs.existsSync(f)) return;
      const m = fs.readFileSync(f, 'utf8').match(/SW_VERSION = 'v([\d.]+)'/);
      ok(m && parseFloat(m[1]) >= 5.79, path.relative(path.join(ROOT, '..'), f) + ' → v' + (m && m[1]));
    });
}

console.log('\n' + (fail === 0 ? '✅' : '❌') + ' ' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail === 0 ? 0 : 1);
