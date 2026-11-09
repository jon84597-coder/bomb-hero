// 無頭測試 v20：道具不被炸掉 / 手把自動偵測與選單導航 / BOSS 模式 / 單人難度與無限時間 /
//               起始速度 / 撞牆不卡 / 場外丟彈兩格 / 推車加速 / 取消地雷 / E 鍵引爆 / 恐龍蛋 / 每關都有門
const fs = require('fs');
const vm = require('vm');

const html = require('./_sandbox').rawHtml;
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.error('no script'); process.exit(1); }
const code = m[1];

// ----- 模擬瀏覽環境 -----
function mkCtx2D() {
  const grad = { addColorStop() {} };
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
  navigator: { getGamepads: () => (sandbox.__pads || []) },
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

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}

function freshBattle() {
  BH.settings.size = 'M'; BH.settings.hazards = 'off'; BH.settings.sd = 'off';
  BH.settings.revenge = 'off'; BH.settings.ctrl = 'kb'; BH.settings.count = 4;
  BH.Battle.resetSlots();
  BH.startBattle();
  G.state = 'play';
  G.bombs.length = 0; G.flames.length = 0; G.bubbles.length = 0; G.particles.length = 0;
  G.players.forEach(function (p) {
    p.invuln = 0; p.cart = false; p.alive = true; p.gloat = 0;
    p.beltMul = 1; p.warpLock = ''; p.warpCool = 0; p.slide = null;
  });
}
function clearArea(x0, y0, x1, y1) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) G.grid[y][x] = 0;
}
function clearHazards() {
  for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) G.hazards[y][x] = null;
}

const P = BH;
/* v5.66：v5.49 起地圖預設「隨機」，尺寸一變 → 怪量／藏門／速度全都跟著飄。
   這支驗的是固定關卡的既有規則，釘回 classic。 */
try { P.settings.mapMode = 'classic'; } catch (e) {}
try { P.WeekMod.pin([]); } catch (e) {}   // 每週變異會改怪量／血量，這支驗的是基準值

// ---------- 共用小工具 ----------
function clearAll() {
  const G = P.Game;
  for (let y = 1; y < G.rows - 1; y++) for (let x = 1; x < G.cols - 1; x++) G.grid[y][x] = 0;
}
function freshSolo(stage) {
  P.settings.size = 'M';
  P.settings.hazards = 'off';
  P.settings.sd = 'off';
  P.settings.ctrl = 'kb';
  P.startSolo(stage || 1, false);
  P.Game.state = 'play';
  P.Game.bombs.length = 0; P.Game.flames.length = 0;
  P.Game.particles.length = 0; P.Game.bubbles.length = 0;
  P.Game.players[0].invuln = 0;
  return P.Game.players[0];
}
function freshBattle() {
  P.settings.size = 'M'; P.settings.hazards = 'off'; P.settings.sd = 'off';
  P.settings.revenge = 'off'; P.settings.count = 4; P.settings.ctrl = 'kb';
  P.Battle.resetSlots();
  P.startBattle();
  P.Game.state = 'play';
  P.Game.bombs.length = 0; P.Game.flames.length = 0;
  P.Game.players.forEach(function (p) { p.invuln = 0; p.cart = false; p.alive = true; });
  return P.Game.players[0];
}
function fakePad(pressed) {
  const buttons = [];
  for (let i = 0; i < 16; i++) buttons.push({ pressed: !!(pressed && pressed.indexOf(i) >= 0) });
  return { id: 'Xbox Wireless Controller (STANDARD GAMEPAD)', axes: [0, 0], buttons: buttons };
}

// ================================================================
console.log('=== 1. 版本號 & BOSS 跳關入口（v5.66 已移除） ===');
ok(parseFloat(P.VERSION) >= 1.2, '版本已推進（目前 v' + P.VERSION + '，每次改版 +0.1）');
// v5.66：移除「跳過關卡，直接單挑最終魔王」（v4.81 搬進單人畫面的那一顆）
ok(!/id="btnSoloBoss"/.test(html), '單人關卡畫面沒有「跳過關卡」按鈕');
ok(!/function startBossRush/.test(html) && typeof P.startBossRush === 'undefined', 'startBossRush 已整個移除（連匯出都沒有）');
ok(typeof P.goBoss === 'undefined', 'goBoss 也移除');
ok(html.indexOf("q.get('boss')") < 0, '?boss=1 這個除錯入口一併移除');
P.settings.ctrl = 'kb';
P.settings.soloDiff = 'normal';
P.settings.soloTime = 300;
P.startSolo(P.SOLO_STAGES, false);
const GB = P.Game;
ok(GB.stage === P.SOLO_STAGES, '第 ' + P.SOLO_STAGES + ' 關＝最終魔王關（正常遊玩走到底才到得了）');
ok(!!GB.bossArena, '最終關走決戰場（Game.bossArena）');
ok(GB.enemies.length === 1 && GB.enemies[0].boss === true, '場上只有魔王、沒有小怪（敵人數 ' + GB.enemies.length + '）');
ok(GB.players[0].lives === 3, '最終關 3 條命');
ok(!!GB.door, '魔王關也有出口門');

// ================================================================
console.log('=== 2. PC 自動控制：鍵盤／藍牙手把自動辨識 ===');
P.settings.ctrl = 'auto';
sandbox.__pads = [];
P.Input.framePads();
P.Pad.setActive(false);
ok(P.ctrlMode() === 'kb', '沒有手把時自動用鍵盤');
sandbox.__pads = [fakePad([0])];
P.Input.framePads();          // 這一幀偵測到 A 被按下（edge）
P.Pad.tick();
ok(P.ctrlMode() === 'pad', '偵測到手把並自動切到手把模式');
ok(P.Pad.name().indexOf('Xbox') >= 0, '讀得到手把名稱（' + P.Pad.name() + '）');
ok(typeof P.PadUI.tick === 'function', '手把選單導航模組存在');
ok(html.indexOf('.padfocus') >= 0, '選單有手把焦點樣式（方向鍵可選項目）');
// v5.66：v5.x 手把導航重寫（支援多支手把與多層彈窗）→ 改成對應目前的寫法
ok(/if \(Input\.padEdge\([^,]+, 0\)\) activate\(\);/.test(html), '手把 A 鍵可以確認選項');
ok(/if \(Input\.padEdge\([^,]+, 1\)\) back\(\);/.test(html), '手把 B 鍵可以返回');
ok(/Input\.padDown\([^,]+, 12\)[\s\S]{0,60}?dir = 'up'/.test(html), '手把十字鍵可以選擇選單項目');
// 一按鍵盤就切回鍵盤
const kd = (listeners.keydown || []);
kd.forEach(function (fn) { fn({ code: 'KeyD', preventDefault: function () {} }); });
P.Input.framePads();
P.Pad.tick();
ok(P.ctrlMode() === 'kb', '按鍵盤後自動切回鍵盤模式');
sandbox.__pads = [];
P.settings.ctrl = 'kb';

// ================================================================
console.log('=== 3. 地雷取消 ===');
ok(P.ITEM_POOL.indexOf('mine') < 0, '道具池已沒有地雷');
ok(!P.ITEMS.mine, '道具表已沒有地雷');
let mineSeen = 0;
for (let i = 0; i < 800; i++) if (P.ITEM_POOL[Math.floor(Math.random() * P.ITEM_POOL.length)] === 'mine') mineSeen++;
ok(mineSeen === 0, '抽 800 次道具池都沒有地雷');
ok(P.ITEM_POOL.indexOf('remote') >= 0, '遙控器還在道具池裡');

// ================================================================
console.log('=== 4. 遙控炸彈：可以放好幾發，按 E 才引爆 ===');
freshBattle();
clearAll();
const P0 = P.Game.players[0];
P0.remote = true; P0.maxBombs = 4; P0.power = 1;
P0.x = 3 * P.Game.T + P.Game.T / 2; P0.y = 3 * P.Game.T + P.Game.T / 2;
P.placeBomb(P0);
P0.x = 5 * P.Game.T + P.Game.T / 2;
P.placeBomb(P0);
ok(P.Game.bombs.length === 2, '遙控器可以連續放 2 發（實際 ' + P.Game.bombs.length + '）');
ok(P.Game.bombs.every(function (b) { return b.remoteArmed; }), '兩發都是待引爆的遙控彈');
for (let i = 0; i < 120; i++) P.updateWorld(1 / 60);
ok(P.Game.bombs.length === 2, '遙控彈不會自己爆（2 秒後還在）');
const nDet = P.detonateRemote(P0);
ok(nDet === 2, 'E 鍵引爆一次炸掉 2 發（回傳 ' + nDet + '）');
for (let i = 0; i < 4; i++) P.updateWorld(1 / 60);
ok(P.Game.bombs.length === 0, '引爆後炸彈全部消失');
ok(P.Game.flames.length > 0, '引爆產生火焰');
// v5.66：預設鍵位早就改成「滑鼠右鍵引爆／空白鍵吐火」（E／F 是 v2.x 的舊預設）
ok(/detonate: function \(\) \{ return keyEdge\(getMap\(\)\.det\); \}/.test(html), '引爆鍵接上遙控引爆（keyEdge → getMap().det）');
ok(P.DEF_KEYS1.det === 'Mouse2', '預設引爆鍵是滑鼠右鍵（' + P.DEF_KEYS1.det + '）');
ok(P.DEF_KEYS1.fire === 'Space', '預設吐火鍵是空白鍵（' + P.DEF_KEYS1.fire + '）');

// ================================================================
console.log('=== 5. 道具被炸到不會消失 ===');
freshBattle();
clearAll();
const G5 = P.Game;
G5.items.length = 0;
P.spawnItem(6, 6, 'fire');
const bomb = { cx: 5, cy: 6, px: 5 * G5.T + G5.T / 2, py: 6 * G5.T + G5.T / 2, timer: .01, power: 1,
  owner: G5.players[0], passers: [], remoteArmed: false, mine: false, moving: null, flying: null, held: false, seed: 0, armT: 9 };
G5.bombs.push(bomb);
for (let i = 0; i < 6; i++) P.updateWorld(1 / 60);
ok(G5.items.filter(function (it) { return it.cx === 6 && it.cy === 6; }).length === 1,
  '爆炸後道具還在場上（(6,6) 有 ' + G5.items.filter(function (it) { return it.cx === 6 && it.cy === 6; }).length + ' 個 / 全場 ' + G5.items.length + '）');
ok(G5.items[0].type === 'fire', '還是原本的道具');
ok(G5.items[0].glint > 0, '被波及的道具有閃光提示');

// ================================================================
console.log('=== 6. 起始速度變快 ===');
freshBattle();
const pS = P.Game.players[0];
pS.speedLv = 0;
ok(P.playerSpeed(pS) >= 140, '起始速度 ' + P.playerSpeed(pS) + '（原本 118）');
pS.speedLv = 3;
ok(P.playerSpeed(pS) > P.playerSpeed(Object.assign({}, pS, { speedLv: 0 })), '滑冰鞋仍然會加速');

// ================================================================
console.log('=== 7. 撞牆不卡：往牆走會自動滑到可通行的那一列 ===');
freshBattle();
clearAll();
const G7 = P.Game, T7 = G7.T;
const pw = G7.players[0];
G7.players.forEach(function (q, i) { if (i) { q.alive = false; } });
// 牆在 (5,4)，上方 (4,3)/(5,3) 可通行
G7.grid[4][5] = 1;
pw.x = 4 * T7 + T7 / 2; pw.y = 4 * T7 + T7 / 2 - 10;   // 站在格子偏上
const y0 = pw.y;
for (let i = 0; i < 20; i++) P.tryMove(pw, 1, 0, 1 / 60);
ok(pw.y < y0 - 1, '撞牆後會往上滑（y ' + y0.toFixed(1) + ' → ' + pw.y.toFixed(1) + '）');
ok(!(Math.floor(pw.x / T7) === 5 && Math.floor(pw.y / T7) === 4), '沒有卡進牆格（格 ' +
  Math.floor(pw.x / T7) + ',' + Math.floor(pw.y / T7) + '）');
// 滑到上一列後就能繼續往右走
for (let i = 0; i < 40; i++) P.tryMove(pw, 1, 0, 1 / 60);
ok(pw.x > 5 * T7, '滑開後能繼續往右通過（x=' + pw.x.toFixed(1) + '）');

// ================================================================
console.log('=== 8. 場外丟彈丟進「往內第 2 格」 ===');
P.settings.revenge = 'on';
freshBattle();
clearAll();
const G8 = P.Game, T8 = G8.T;
const cartP = G8.players[0];
G8.players.forEach(function (q, i) { if (i) { q.alive = false; } });
G8.players[1].alive = true;                       // 留一個場內目標
G8.players[1].x = 8 * T8 + T8 / 2; G8.players[1].y = 8 * T8 + T8 / 2;
cartP.cart = true; cartP.alive = false;
cartP.x = T8 / 2; cartP.y = 6 * T8 + T8 / 2;      // 場外左側軌道
const okThrow = P.cartThrowBomb(cartP);
ok(okThrow === true, '推車可以丟彈入場');
const nb = G8.bombs[G8.bombs.length - 1];
// v4.38：落點改成「推車垂直射線上、飛滿集氣距離」（不再是離外牆第 2 格）
const dn20 = P.cartThrowDir(cartP).dn;
ok(nb.cy === 6 && nb.cx === P.CART_LV[1].reach,
  '落點在推車的垂直射線上（往' + dn20 + '，炸在 ' + nb.cx + ',' + nb.cy + '）');
ok(nb.flying && nb.flying.fx !== nb.cx, '炸彈是從推車飛進場（拋物線）');

// ================================================================
console.log('=== 9. 場外推車移動變快 ===');
ok(html.indexOf('const CART_SPEED = 250;') >= 0 &&
  html.indexOf('const sp = (rev ? CART_SPEED * .42 : CART_SPEED) * dt;') >= 0,
  '推車速度 105 → 250 px/s（滑冰鞋 5 級）');
freshBattle();
clearAll();
const G9 = P.Game, T9 = G9.T;
const pc = G9.players[0];
pc.cart = true; pc.alive = false; pc.cartDir = null;
pc.x = T9 / 2; pc.y = 3 * T9 + T9 / 2;
pc.scheme = { dirs: function () { return ['down']; }, action: function () { return false; }, actionHeld: function () { return false; } };
const cy0 = pc.y;
for (let i = 0; i < 30; i++) P.updateCart(pc, 1 / 60);
ok(pc.y - cy0 > 55, '0.5 秒推車前進 ' + (pc.y - cy0).toFixed(1) + 'px（原本約 52px）');

// ================================================================
console.log('=== 10. 恐龍蛋：可以炸掉、可以孵出恐龍、多擋一次傷害、吐火 2 格 3 秒冷卻 ===');
freshSolo(1);
clearAll();
const G10 = P.Game, T10 = G10.T;
const pd = G10.players[0];
G10.enemies.length = 0;
G10.eggs.length = 0;
ok(html.indexOf('function spawnEggs') >= 0 && html.indexOf('🥚') >= 0, '關卡會產生恐龍蛋');
G10.eggs.push({ x: 4, y: 4, bob: 0, wob: 0 });
G10.eggs.push({ x: 9, y: 9, bob: 0, wob: 0 });
ok(G10.eggs.length === 2, '場上有 2 顆蛋');
// 火焰炸蛋
P.addFlamePublic ? 0 : 0;
G10.flames.push({ cx: 9, cy: 9, type: 'center', dir: null, t: .4, owner: null });
P.updateWorld(1 / 60);
ok(G10.eggs.length === 1, '被火焰燒到的蛋會被炸掉（剩 ' + G10.eggs.length + ' 顆）');
// 走上蛋 → 騎恐龍
pd.x = 4 * T10 + T10 / 2; pd.y = 4 * T10 + T10 / 2;
P.controlHuman(pd, 1 / 60);
ok(pd.dino === true, '走上蛋格孵出恐龍並騎上去');
ok(G10.eggs.length === 0, '蛋被孵掉');
// 多擋一次傷害
pd.invuln = 0; pd.lives = 3;
P.killPlayer(pd, false, null);
ok(pd.alive === true && pd.dino === false, '騎恐龍時被打 → 只失去恐龍、人沒死');
ok(pd.lives === 3, '生命沒有減少（還是 3）');
ok(pd.invuln > 0, '恐龍幫擋後有短暫無敵');
// 再被打就死
pd.invuln = 0;
if (typeof pd.sHp === 'number') pd.sHp = 1;   // v5.30 起有格血：先打到剩 1 格，一擊才算一條命
P.killPlayer(pd, false, null);
ok(pd.alive === false && pd.lives === 2, '恐龍沒了再被打就正常陣亡');
// 吐火
pd.alive = true; pd.dead = false; pd.invuln = 0; pd.dino = true; pd.fireCd = 0;
pd.facing = 'right';
pd.x = 4 * T10 + T10 / 2; pd.y = 4 * T10 + T10 / 2;
G10.flames.length = 0;
const before = G10.flames.length;
const fired = P.fireBreath(pd);
ok(fired === true, '恐龍可以吐火');
// v4.38：吐火範圍調回 2 格（前 2 格 ＋ 左右各溢一格），第 3 格不再燒到
ok(G10.flames.length >= 4, '吐火燒到前方 2 格＋左右扇形（實際 ' + G10.flames.length + ' 格）');
const fxs = G10.flames.map(function (f) { return f.cx; });
ok(fxs.indexOf(5) >= 0 && fxs.indexOf(6) >= 0 && fxs.indexOf(7) < 0,
  '正前方 2 格有火、第 3 格沒有（x=5,6 有、x=7 沒有）');
ok(Math.abs(pd.fireCd - P.DINO_FIRE_CD) < 1e-6, '吐火後冷卻 ' + pd.fireCd.toFixed(1) + ' 秒');
const again = P.fireBreath(pd);
ok(again === false, '冷卻中不能再吐火');
for (let i = 0; i < 200; i++) P.updateWorld(1 / 60);
ok(pd.fireCd === 0, '3 秒後冷卻結束可以再吐');
pd.dino = false;

// ================================================================
console.log('=== 11. 單人難易度與時間設定 ===');
P.settings.soloDiff = 'easy'; P.settings.soloTime = 180;
let eEasy = 0, eHard = 0;
for (let k = 0; k < 5; k++) { freshSolo(4); eEasy += P.Game.enemies.length; }
P.settings.soloDiff = 'hard';
for (let k = 0; k < 5; k++) { freshSolo(4); eHard += P.Game.enemies.length; }
ok(eHard > eEasy, '困難的敵人比簡單多（' + eEasy + ' → ' + eHard + '）');
P.settings.soloDiff = 'normal';
P.settings.soloTime = 0;
freshSolo(2);
ok(P.Game.timer === Infinity, '無限時間：計時器是 ∞');
ok(P.Game.players[0].alive === true, '無限時間不會倒數');
// v4.19：怪物會在 2 格內主動攻擊，5 秒內可能真的被打死 → 這段只驗「時間到不扣命」，先清場
P.Game.enemies = []; P.Game.bombs = [];
for (let i = 0; i < 300; i++) P.updateSolo(1 / 60);
ok(P.Game.players[0].alive === true && P.Game.players[0].lives === 3, '跑 5 秒也不會因時間到而扣命');
P.settings.soloTime = 180;
freshSolo(2);
ok(P.Game.timer === 180, '選 3 分 → 計時器 180 秒');

// ================================================================
console.log('=== 12. 每一關都一定有門、清光敵人一定進得去 ===');
let doorAll = true, doorOpenAll = true, unlockedAll = true;
for (let st = 1; st <= 8; st++) {
  for (let rep = 0; rep < 4; rep++) {
    P.settings.size = ['S', 'M', 'L', 'XL'][rep % 4];
    freshSolo(st);
    const G = P.Game;
    if (!G.door) { doorAll = false; continue; }
    if (G.door.x < 1 || G.door.y < 1 || G.door.x > G.cols - 2 || G.door.y > G.rows - 2) unlockedAll = false;
    if (st !== 8) G.enemies.length = 0; else G.enemies.length = 0;
    P.updateSolo(1 / 60);
    // v2.0：門藏在軟磚底下 → 清光敵人當下還不會現身（磚還沒炸）
    // v5.36 起第 5 關是 BOSS 決戰場：門一開始就看得見、王死才開，不適用「藏在磚下」這條
    if (!P.isBossStage(st) && G.door.revealed && G.door.open) doorOpenAll = false;
    // 炸掉場上所有軟磚 → 門一定現身且可通過（不會卡關）
    for (let yy = 1; yy < G.rows - 1; yy++) for (let xx = 1; xx < G.cols - 1; xx++)
      if (G.grid[yy][xx] === 2) P.destroySoft(xx, yy);
    P.updateSolo(1 / 60);
    // v5.36：第 5 關是 BOSS 決戰場 —— 門一開始就看得見，但要「王死」才開
    if (P.isBossStage(st) && G.bossArena && G.bossArena.boss) { G.bossArena.boss.hp = 0; P.updateSolo(1 / 60); }
    if (!(G.door.revealed && G.door.open)) doorOpenAll = false;
  }
}
ok(doorAll, '8 關 × 4 種地圖尺寸，每一張都有出口門');
ok(unlockedAll, '門都在地圖可走的範圍內');
ok(doorOpenAll, 'v2.0+：門藏軟磚下（清光敵人未現身）、炸完磚一定現身可過（不會卡關）');

// ================================================================
console.log('=== 13. UI 與說明同步 ===');
ok(html.indexOf('id="segSoloDiff"') >= 0 && html.indexOf('id="segSoloTime"') >= 0, '單人畫面有難易度與時間設定');
ok(html.indexOf('data-v="0">♾️ 無限時間') >= 0, '時間選項有「無限時間」');
ok(html.indexOf('id="segTime"') >= 0, '對戰的時間設定還在');
ok(html.indexOf('💣地雷') < 0 && html.indexOf('遙控・地雷') < 0, '對戰說明不再列出地雷道具');
ok(html.indexOf('🐉') < 0, '（無多餘符號）');
ok(html.indexOf('class="tbtn tdet hide"') >= 0 && html.indexOf('class="tbtn tfire hide"') >= 0, '手機多了 🧨 引爆與 🔥 吐火鍵');
ok(html.indexOf('DINO_FIRE_CD = 2') >= 0, '吐火冷卻固定 2 秒（v4.11：使用者要求改成 2 秒）');

console.log('');
console.log(fail === 0 ? '通過 ' + pass + ' / ' + (pass + fail) : '✗ ' + fail + ' 項失敗（通過 ' + pass + '）');
process.exit(fail === 0 ? 0 : 1);
