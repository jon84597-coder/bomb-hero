// 無頭測試 v18：推車邊緣丟彈 / 圓形搖桿 8 向 / 死亡擊殺對話框 / 版本號 / 畫面細節
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync(__dirname + '/../index.html', 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.error('no script'); process.exit(1); }
const code = m[1];

// ----- 模擬瀏覽環境 -----
const gradCalls = [];
function mkCtx2D() {
  const grad = { addColorStop() { gradCalls.push(1); } };
  return new Proxy({}, {
    get(t, k) {
      if (k === 'canvas') return { width: 720, height: 540 };
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => grad;
      if (k === 'measureText') return () => ({ width: 10 });
      if (k === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) });
      if (typeof t[k] !== 'undefined') return t[k];
      return () => {};
    },
    set(t, k, v) { t[k] = v; return true; }
  });
}
function mkEl(id) {
  const el = {
    id, style: {}, dataset: {}, children: [], _cls: new Set(),
    classList: {
      add(c) { el._cls.add(c); }, remove(c) { el._cls.delete(c); },
      toggle(c) { el._cls.has(c) ? el._cls.delete(c) : el._cls.add(c); },
      contains(c) { return el._cls.has(c); }
    },
    addEventListener() {}, removeEventListener() {},
    appendChild(c) { el.children.push(c); return c; },
    getContext: () => mkCtx2D(),
    querySelectorAll: () => [],
    querySelector: () => mkEl(id + '-q'),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 720, height: 540 }),
    setPointerCapture() {}, releasePointerCapture() {},
    focus() {}, click() {},
    width: 720, height: 540, textContent: '', value: ''
  };
  let _inner = '';
  Object.defineProperty(el, 'innerHTML', {
    get() { return _inner; },
    set(v) { _inner = v; el.children = []; }
  });
  return el;
}
const els = {};
function getId(id) { if (!els[id]) els[id] = mkEl(id); return els[id]; }

const listeners = {};
const storage = {};
const sandbox = {
  console, Math, JSON, Object, Array, Date, parseInt, parseFloat, isNaN, isFinite,
  Uint8ClampedArray, Infinity, NaN, undefined,
  setTimeout: () => 0,
  clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  requestAnimationFrame: () => 0,
  performance: { now: () => Date.now() },
  localStorage: {
    getItem: k => (k in storage ? storage[k] : null),
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: k => { delete storage[k]; }
  },
  navigator: { getGamepads: () => [] },
  document: {
    getElementById: getId,
    querySelectorAll: () => [],
    querySelector: () => mkEl('q'),
    addEventListener: (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); },
    removeEventListener() {},
    createElement: t => mkEl(t),
    body: mkEl('body'),
    documentElement: mkEl('html')
  }
};
sandbox.window = sandbox;
sandbox.addEventListener = (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); };
sandbox.removeEventListener = () => {};
sandbox.globalThis = sandbox;
sandbox.window.window = sandbox;
vm.createContext(sandbox);

vm.runInContext(code, sandbox, { filename: 'index.html' });

const BH = sandbox.window.__BH;
if (!BH) { console.error('no __BH'); process.exit(1); }
const G = BH.Game;
const N = BH.Net;

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}

// 開一場對戰（乾淨狀態）
function freshBattle() {
  BH.settings.size = 'M'; BH.settings.hazards = 'off'; BH.settings.sd = 'off';
  BH.settings.revenge = 'off'; BH.settings.ctrl = 'kb'; BH.settings.count = 4;
  BH.Battle.resetSlots();
  BH.startBattle();
  G.state = 'play';
  G.bombs.length = 0; G.flames.length = 0; G.bubbles.length = 0;
  G.players.forEach(function (p) { p.invuln = 0; p.cart = false; p.alive = true; p.gloat = 0; });
}
function clearArea(x0, y0, x1, y1) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) G.grid[y][x] = 0;
}
function edgeOf(x, y) { return Math.min(x, y, G.cols - 1 - x, G.rows - 1 - y); }

// ================================================================
console.log('=== 1. 版本號（每次改版 +0.1） ===');
ok(typeof BH.VERSION === 'string' && /^\d+\.\d+$/.test(BH.VERSION), '版本號格式為 x.y（' + BH.VERSION + '）');
ok(parseFloat(BH.VERSION) >= 1.0, '版本號從 1.0 起算、每次改版 +0.1（目前 ' + BH.VERSION + '）');
ok(html.indexOf('id="verTxt"') >= 0, '標題畫面有版本號顯示位置');
ok(getId('verTxt').textContent === BH.VERSION, '啟動時把版本號寫進畫面（' + getId('verTxt').textContent + '）');
ok(html.indexOf('const VERSION = ') >= 0, '版本號是單一常數（改一處即可）');

// ================================================================
console.log('=== 2. 推車丟彈：只丟場內邊緣（往內 2 格），不砸在人頭上 ===');
freshBattle();
const T = G.T;
const me = G.players[0], aiP = G.players[1];
me.x = Math.floor(G.cols / 2) * T + T / 2;
me.y = Math.floor(G.rows / 2) * T + T / 2;
G.players[2].cart = true; G.players[3].cart = true;

// 推車在四個不同邊 → 只能「垂直於那一邊往場內」丟（v4.38：不再有邊緣帶）
const ringSpots = [[0, 2], [2, 0], [G.cols - 1, 3], [4, G.rows - 1]];
const REACH18 = BH.CART_LV[1].reach;                  // 沒給等級 → 預設第 2 段
ringSpots.forEach(function (sp, i) {
  aiP.cart = true; aiP.ai = true;
  aiP.x = sp[0] * T + T / 2; aiP.y = sp[1] * T + T / 2;
  G.bombs.length = 0;
  const d18 = BH.cartThrowDir(aiP);
  // 先清出一條暢通的射線走廊 → 落點剛好是預設段的距離（不受隨機地圖影響）
  for (let k = 1; k <= 20; k++) {
    const rx = sp[0] + d18.d.x * k, ry = sp[1] + d18.d.y * k;
    if (rx < 1 || rx > G.cols - 2 || ry < 1 || ry > G.rows - 2) break;
    G.grid[ry][rx] = 0;
  }
  const threw = BH.cartThrowBomb(aiP);
  const b = G.bombs[G.bombs.length - 1];
  ok(threw === true && !!b, '推車在 (' + sp[0] + ',' + sp[1] + ') 成功丟彈');
  if (!b) return;
  const onRay =
    (d18.dn === 'down' && b.cx === sp[0] && b.cy > sp[1]) ||
    (d18.dn === 'up' && b.cx === sp[0] && b.cy < sp[1]) ||
    (d18.dn === 'right' && b.cy === sp[1] && b.cx > sp[0]) ||
    (d18.dn === 'left' && b.cy === sp[1] && b.cx < sp[0]);
  const fly18 = Math.abs(b.cx - sp[0]) + Math.abs(b.cy - sp[1]);
  ok(onRay, '  落點在同一條垂直射線上（方向 ' + d18.dn + '，落點 ' + b.cx + ',' + b.cy + '）');
  const preyCx = Math.floor(me.x / T), preyCy = Math.floor(me.y / T);
  ok(Math.abs(b.cx - preyCx) + Math.abs(b.cy - preyCy) >= 3, '  不是丟在人旁邊（距人 ' +
    (Math.abs(b.cx - preyCx) + Math.abs(b.cy - preyCy)) + ' 格）');
  ok(fly18 === REACH18, '  剛好飛滿預設段 ' + REACH18 + ' 格（實際 ' + fly18 + ' 格）');
  ok(!!b.flying, '  拋物線飛進場（不是直接生成在場內）');
});

// 人類坐推車也丟到射線上（不是丟腳邊）
aiP.cart = false;
me.cart = true; me.ai = false;
me.x = T / 2; me.y = T * 3 + T / 2;
clearArea(1, 3, G.cols - 2, 3);                          // 清出射線，落點才會剛好是 6 格
G.bombs.length = 0;
ok(BH.cartThrowBomb(me) === true, '人類推車也能丟彈');
const hb = G.bombs[G.bombs.length - 1];
ok(hb && hb.cy === 3 && hb.cx === BH.CART_LV[1].reach,
  '人類落點同樣在射線上（' + (hb ? hb.cx + ',' + hb.cy : '-') + '）');
me.cart = false;

// v4.42：石牆也能丟（炸彈坐在牆頂），不會被牆擋在半路
freshBattle();
clearArea(1, 1, G.cols - 2, G.rows - 2);
me.cart = true;
me.x = T / 2; me.y = T * 2 + T / 2;                     // 最左邊 → 只能往右射
G.grid[2][2] = 1;                                       // 第 2 格是石牆
G.bombs.length = 0;
ok(BH.cartThrowBomb(me, 1) === true && G.bombs.length === 1, '第 2 格是石牆 → 照樣丟得出去（丟在牆上）');
const fb = G.bombs[G.bombs.length - 1];
ok(fb && fb.cx === 3 && fb.cy === 2, '丟到石牆 → 彈一格，落在牆後的空地（' +
  (fb ? fb.cx + ',' + fb.cy : '-') + '）');
ok(fb && fb.onWall === false, '落地了（不再停在牆頂）');
ok(fb && fb.flying && fb.flying.path.length === 4, '路徑 4 格（推車 → 牆 → 彈到的空地）' +
  '（' + (fb && fb.flying ? fb.flying.path.length : 0) + ' 格）');

// 整個內場都被牆塞滿 → 丟在牆上，不當機
clearArea(0, 0, G.cols - 1, G.rows - 1);
for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) G.grid[y][x] = 1;
G.bombs.length = 0;
ok(BH.cartThrowBomb(me) === true && G.bombs.length === 1, '全場都是牆時仍丟得出去（落在牆上，不當機）');
me.cart = false;

// ================================================================
console.log('=== 3. 死亡／擊殺對話框 ===');
freshBattle();
ok(BH.DEAD_LINES.length === 3, '死者台詞有 3 句');
ok(BH.DEAD_LINES.indexOf('哎呀！糟糕糟糕！！') >= 0 && BH.DEAD_LINES.indexOf('可惡..我下次一定會贏...！') >= 0 &&
   BH.DEAD_LINES.indexOf('天啊！不～！') >= 0, '死者台詞內容正確（v3.8）');
ok(BH.KILL_LINES.length === 3, '凶手台詞有 3 句');
ok(BH.KILL_LINES.indexOf('哈哈！你還得加把勁！') >= 0 && BH.KILL_LINES.indexOf('還是我厲害！') >= 0 &&
   BH.KILL_LINES.indexOf('我的炸彈好吃嗎？') >= 0, '凶手台詞內容正確');

G.bubbles.length = 0;
const A = G.players[0], B = G.players[1];
BH.bubbleDead(A);
ok(G.bubbles.length === 1 && G.bubbles[0].kind === 'dead', '被殺的人頭上冒出一個對話框');
ok(BH.DEAD_LINES.indexOf(G.bubbles[0].text) >= 0, '台詞取自死者 3 句（' + G.bubbles[0].text + '）');
ok(G.bubbles[0].ref === A, '氣泡跟著死者');

G.bubbles.length = 0;
BH.bubbleDeathPair(A, B);
ok(G.bubbles.length === 2, '一殺一死 → 兩個對話框');
const bubDead = G.bubbles.filter(function (b) { return b.ref === A; })[0];
const bubKill = G.bubbles.filter(function (b) { return b.ref === B; })[0];
ok(bubDead && bubDead.kind === 'dead', '死者拿到哀號');
ok(bubKill && bubKill.kind === 'kill' && BH.KILL_LINES.indexOf(bubKill.text) >= 0,
  '凶手拿到得意台詞（' + (bubKill ? bubKill.text : '-') + '）');

// 自殺：只冒自己的哀號，不會自己誇自己
G.bubbles.length = 0;
BH.bubbleDeathPair(A, A);
ok(G.bubbles.length === 1 && G.bubbles[0].kind === 'dead', '自殺只冒一個哀號（不會自我誇獎）');

// 氣泡會跟著活人跑、會過期消失
G.bubbles.length = 0;
BH.bubbleKill(B);
const bb = G.bubbles[0];
const bx0 = bb.x;
B.x = bx0 + 60;
BH.updateBubbles(.1);
ok(Math.abs(G.bubbles[0].x - (bx0 + 60)) < .001, '凶手跑動時對話框跟著跑');
let guard = 0;
while (G.bubbles.length && guard++ < 200) BH.updateBubbles(.1);
ok(G.bubbles.length === 0, '時間到自動消失');

// 真的被炸死 → 兩邊都冒出對話框（killBattlePlayer）
freshBattle();
G.bubbles.length = 0;
const victim = G.players[0], killer = G.players[2];
victim.x = 2.5 * T; victim.y = 2.5 * T; victim.invuln = 0;
killer.x = 3.5 * T; killer.y = 2.5 * T; killer.invuln = 0;
BH.killBattlePlayer(victim, killer);
ok(!victim.alive, '死者已淘汰');
ok(G.bubbles.some(function (b) { return b.ref === victim && b.kind === 'dead'; }), '死者頭上冒出對話框');
ok(G.bubbles.some(function (b) { return b.ref === killer && b.kind === 'kill'; }), '凶手頭上冒出對話框');

// 怪物被炸死 → 怪物也冒對話框
freshBattle();
G.bubbles.length = 0;
clearArea(1, 1, 10, 8);
const mon = BH.makeEnemy(3, 3, 'walker', 1);
mon.x = 3 * T + T / 2; mon.y = 3 * T + T / 2;
G.enemies = [mon];
G.flames = [{ cx: 3, cy: 3, type: 'center', dir: null, t: .4, owner: G.players[0] }];
BH.updateEnemy(mon, 1 / 60);
ok(mon.dead === true, '怪物被火焰燒死');
ok(G.bubbles.some(function (b) { return b.ref === mon && b.kind === 'dead'; }), '怪物死掉也會冒出對話框');
ok(G.bubbles.some(function (b) { return b.ref === G.players[0] && b.kind === 'kill'; }), '放彈的人冒出得意台詞');

// 怪物撞死玩家 → 玩家哀號、怪物得意
freshBattle();
G.bubbles.length = 0;
const mon2 = BH.makeEnemy(4, 4, 'chaser', 1);
mon2.x = G.players[0].x; mon2.y = G.players[0].y;
G.players[0].invuln = 0;
BH.killPlayer(G.players[0], false, mon2);
ok(G.bubbles.some(function (b) { return b.kind === 'dead'; }), '被怪物撞死也會冒哀號');
ok(G.bubbles.some(function (b) { return b.ref === mon2 && b.kind === 'kill'; }), '撞死人的怪物也會冒出得意台詞');

// 線上快照同步
freshBattle();
G.bubbles.length = 0;
BH.bubbleDead(G.players[1]);
N.slotOf = { a: 0, b: 1 };
const snap = BH.buildSnap();
ok(Array.isArray(snap.bb) && snap.bb.length === 1, '快照帶上對話框資料');
ok(snap.bb[0][2] === G.bubbles[0].text, '快照內容＝台詞');
G.bubbles.length = 0;
BH.applySnap(snap);
ok(G.bubbles.length === 1 && G.bubbles[0].text === snap.bb[0][2], '客人端照快照重建對話框');
ok(G.bubbles[0].kind === 'dead', '客人端分得出哀號／得意');

// ================================================================
console.log('=== 4. 手機圓形搖桿（360°／8 向斜走） ===');
const IN = BH.Input;
ok(typeof IN.setTouchAxis === 'function', '搖桿軸向輸入介面存在');
ok(html.indexOf('class="tpknob"') >= 0 && html.indexOf('class="tpring"') >= 0, '圓形搖桿 UI（底盤＋搖桿頭）');
ok(html.indexOf('border-radius: 50%; pointer-events: auto') >= 0 || html.indexOf('#touchUI .tpad') >= 0,
  '搖桿是本體可拖曳的圓盤');
ok(html.indexOf('pointerdown') >= 0 && html.indexOf('setPointerCapture') >= 0, '用 pointer 事件拖曳搖桿');
ok(html.indexOf('Math.hypot(dx, dy)') >= 0, '依推的方向算角度（360°）');
ok(html.indexOf('padHeld') >= 0 && html.indexOf('releaseAll(false)') >= 0,
  '多點觸控：另一隻手點放彈鍵時，搖桿不會被一起歸零');
ok(html.indexOf('pointercancel') >= 0 && html.indexOf('lostpointercapture') >= 0, '手指滑出搖桿／中斷也會正確放開');

function dirOf(ax, ay) { IN.setTouchAxis(ax, ay); return IN.schemes.touch.dirs().join(','); }
ok(dirOf(.707, -.707) === 'up,right', '右上 → up+right（45° 斜走）');
ok(dirOf(-.707, .707) === 'down,left', '左下 → down+left');
ok(dirOf(0, -1) === 'up', '正上 → 只有 up');
IN.setTouchAxis(0, 0);

// 斜向移動真的會兩軸同時前進
freshBattle();
clearArea(1, 1, 8, 8);
const dp = G.players[0];
dp.x = 3.5 * T; dp.y = 3.5 * T; dp.facing = 'down';
const startX = dp.x, startY = dp.y;
for (let i = 0; i < 20; i++) BH.tryMoveDiag(dp, 1, 1, 1 / 60);
ok(dp.x > startX + 1 && dp.y > startY + 1, '斜走時 X、Y 同時移動（' +
  (dp.x - startX).toFixed(1) + ' / ' + (dp.y - startY).toFixed(1) + ' px）');

// 斜角被牆擋住 → 不會穿牆
freshBattle();
clearArea(1, 1, 8, 8);
const wp = G.players[0];
wp.x = 3.5 * T; wp.y = 3.5 * T;
G.grid[4][4] = 1;                    // 斜角那格放硬牆
for (let i = 0; i < 90; i++) BH.tryMoveDiag(wp, 1, 1, 1 / 60);
ok(!(Math.floor(wp.x / T) === 4 && Math.floor(wp.y / T) === 4), '斜角有牆時不會穿牆過去');
ok(G.grid[Math.floor(wp.y / T)][Math.floor(wp.x / T)] === 0, '斜走全程都待在空格（不會卡進牆裡）');

// 側面有牆 → 沿牆滑
freshBattle();
clearArea(1, 1, 8, 8);
const sp2 = G.players[0];
sp2.x = 3.5 * T; sp2.y = 3.5 * T;
G.grid[3][4] = 1;                    // 右側是牆，下面還是空的
const sy0 = sp2.y;
for (let i = 0; i < 20; i++) BH.tryMoveDiag(sp2, 1, 1, 1 / 60);
ok(sp2.y > sy0 + 1, '側面撞牆時沿著牆往下滑（不會卡死）');

// 搖桿 → 真的驅動角色斜走
freshBattle();
clearArea(1, 1, 8, 8);
const tp = G.players[0];
BH.settings.ctrl = 'touch';
tp.scheme = IN.schemes.touch;
tp.x = 3.5 * T; tp.y = 3.5 * T;
IN.setTouchAxis(-.707, -.707);
const tx0 = tp.x, ty0 = tp.y;
for (let i = 0; i < 20; i++) BH.controlHuman(tp, 1 / 60);
ok(tp.x < tx0 - 1 && tp.y < ty0 - 1, '搖桿推左上 → 角色往左上斜走');
IN.setTouchAxis(0, 0);
BH.settings.ctrl = 'kb';

// ================================================================
console.log('=== 5. 畫面細節：陰影與角色美術 ===');
ok(typeof BH.softShadow === 'function', '有柔和陰影工具函式');
ok(/function drawPlayer[\s\S]{0,900}softShadow\(/.test(html), '角色有落地陰影（依跳動高度縮放）');
ok(/function drawEnemy[\s\S]{0,600}softShadow\(/.test(html), '怪物有落地陰影');
ok(/function drawBomb[\s\S]{0,700}softShadow\(/.test(html), '炸彈有落地陰影（飛行時變小）');
ok(/function drawCart[\s\S]{0,400}softShadow\(/.test(html), '推車有落地陰影');
ok(html.indexOf('softShadow(px, it.cy * T + T / 2 + T * .30') >= 0, '道具也有落地陰影');
// v5.21：暗角從「世界座標（整張地圖）」改成「螢幕座標」的離屏快取 ——
//   每幀一次 drawImage 取代整張地圖的大漸層，而且暗角永遠框住視窗。
ok(/vignetteCanvas|drawVignette/.test(html), '場地中央打光＋四周暗角');
ok(/createRadialGradient\(w \/ 2, h \/ 2/.test(html) && /createLinearGradient\(0, 0, 0, h \* \.34\)/.test(html),
  '上下打光漸層（立體感）');
ok(html.indexOf('R * 1.045') >= 0, '角色頭部有描邊（立體輪廓）');
ok(html.indexOf('topY + R * .34, R * .93, 0, Math.PI') >= 0, '角色頭部有環境遮蔽陰影');
ok(html.indexOf('rgba(255,255,255,.14)') >= 0, '角色頭部有反光高光');

// 真的畫一次不會爆
freshBattle();
let drew = false;
try { BH.render(); drew = true; } catch (e) { console.log('    render error: ' + e.message); }
ok(drew, '完整渲染一次不報錯');

// ================================================================
console.log('');
console.log('結果：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
