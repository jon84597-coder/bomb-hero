// 無頭測試：驗證 穿牆 / 投擲 / 拳擊 / 踢彈
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync(__dirname + '/../index.html', 'utf8');
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
    id, style: {}, dataset: {}, children: [],
    _cls: new Set(),
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
    focus() {}, click() {},
    width: 720, height: 540, textContent: '', value: ''
  };
  let _inner = '';
  Object.defineProperty(el, 'innerHTML', {
    get() { return _inner; },
    set(v) {
      _inner = v;
      // 設定畫面的段落按鈕用 querySelectorAll 綁定，這裡提供假子節點即可
      el.children = [];
    }
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
  setTimeout: (fn) => { /* 不執行，避免回合流程 */ return 0; },
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

// 執行遊戲主程式
vm.runInContext(code, sandbox, { filename: 'index.html' });

const BH = sandbox.window.__BH;
if (!BH) { console.error('no __BH'); process.exit(1); }
const G = BH.Game;

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}

// 模擬鍵盤
function key(codeName, down) {
  (listeners[down ? 'keydown' : 'keyup'] || []).forEach(fn =>
    fn({ code: codeName, preventDefault() {} }));
}
console.log('=== 1. 畫面尺寸量測與格子大小 ===');
const wrapEl = els['stageWrap'] || sandbox.document.getElementById('stageWrap');
wrapEl.clientWidth = 1280; wrapEl.clientHeight = 600;
const vi = BH.resizeView();
ok(vi.w === 1280 && vi.h === 600, 'resizeView 量到 1280×600（實際 ' + vi.w + '×' + vi.h + '）');
ok(sandbox.document.getElementById('cv').width === 1280, 'canvas 解析度跟著放大（' + sandbox.document.getElementById('cv').width + '）');
const t600 = BH.tileSize();
ok(t600 >= 30 && t600 <= 62, '格子大小在合理範圍（T=' + t600 + '）');
wrapEl.clientWidth = 800; wrapEl.clientHeight = 300;
BH.resizeView();
const t300 = BH.tileSize();
ok(t300 < t600, '畫面較矮 → 格子變小（' + t300 + ' < ' + t600 + '）');

console.log('=== 2. 相機跟隨：角色置中 ===');
wrapEl.clientWidth = 800; wrapEl.clientHeight = 600;
BH.settings.size = 'M'; BH.settings.hazards = 'off'; BH.settings.sd = 'off'; BH.settings.revenge = 'off';
BH.settings.ctrl = 'kb';
BH.Battle.resetSlots();
BH.startBattle(); G.state = 'play';
const T = G.T, V = BH.viewInfo();
const P = G.players[0];
ok(V.w === 800 && V.h === 600, '對戰使用 800×600 的畫面（' + V.w + '×' + V.h + '）');
ok(G.cols * T > V.w || G.rows * T > V.h, '地圖（' + (G.cols * T) + '×' + (G.rows * T) + '）比畫面大 → 需要相機移動');
// 移到地圖正中央
P.x = (G.cols / 2) * T; P.y = (G.rows / 2) * T; P.invuln = 99;
G.camSnap = true; BH.updateCamera(1 / 60);
ok(Math.abs(G.camX - (V.w / 2 - P.x)) < 1, '玩家在地圖中央 → 相機把角色放到畫面正中央（camX=' + G.camX.toFixed(1) + '）');
ok(Math.abs((P.x + G.camX) - V.w / 2) < 1 && Math.abs((P.y + G.camY) - V.h / 2) < 1, '角色螢幕座標 = 畫面中心');

console.log('=== 3. 相機邊界：不會看到地圖外的空白 ===');
P.x = 1 * T + T / 2; P.y = 1 * T + T / 2;
G.camSnap = true; BH.updateCamera(1 / 60);
ok(G.camX <= 0.01, '角色在左上 → 相機不會露出左邊空白（camX=' + G.camX.toFixed(1) + '）');
ok(G.camX + 0 > -1, '地圖左緣對齊畫面左緣（世界 x=0 → 螢幕 ' + (0 + G.camX).toFixed(1) + '）');
P.x = (G.cols - 1) * T + T / 2; P.y = (G.rows - 1) * T + T / 2;
G.camSnap = true; BH.updateCamera(1 / 60);
ok(G.camX + G.cols * T >= V.w - 1, '角色在右下 → 地圖右緣仍填滿畫面（右緣螢幕 ' + (G.camX + G.cols * T).toFixed(1) + ' >= ' + V.w + '）');
ok(G.camX + G.cols * T <= V.w + T, '相機不會滑超過地圖邊界太多');

console.log('=== 4. 平滑跟隨（不是硬跳）===');
P.x = (G.cols / 2) * T; P.y = (G.rows / 2) * T;
G.camSnap = true; BH.updateCamera(1 / 60);
const cam0 = G.camX;
P.x += T * 3;                                   // 角色往右移動 3 格
BH.updateCamera(1 / 60);
const d1 = Math.abs(G.camX - cam0);
BH.updateCamera(1 / 60);
ok(d1 > 0, '角色移動後相機開始跟上（位移 ' + d1.toFixed(1) + 'px）');
ok(d1 < T * 3, '一幀內不會直接跳到定位（平滑跟隨）');
for (let i = 0; i < 60; i++) BH.updateCamera(1 / 60);
const wantCam = Math.max(V.w - G.cols * T, Math.min(0, V.w / 2 - P.x));
ok(Math.abs(G.camX - wantCam) < 2, '一段時間後鏡頭停在目標位置（camX=' + G.camX.toFixed(1) + '，期望 ' + wantCam.toFixed(1) + '）');

console.log('=== 5. 地圖比畫面小 → 置中不亂跑 ===');
wrapEl.clientWidth = 1280; wrapEl.clientHeight = 900; BH.resizeView();
BH.settings.size = 'S';
BH.startBattle(); G.state = 'play';
const T2 = G.T, V2 = BH.viewInfo();
const P2 = G.players[0];
if (G.cols * T2 <= V2.w) {
  P2.x = T2 * 2; P2.invuln = 99;
  G.camSnap = true; BH.updateCamera(1 / 60);
  ok(Math.abs(G.camX - (V2.w - G.cols * T2) / 2) < 2, '小地圖水平置中（camX=' + G.camX.toFixed(1) + '）');
} else {
  ok(true, '小地圖仍大於畫面寬度 → 由相機跟隨（略過置中檢查）');
}

console.log('=== 6. 手機橫向：直放自動轉 90 度 ===');
ok(html.indexOf('@media (orientation: portrait)') >= 0, '有直放（portrait）媒體查詢');
ok(!/body\.touch \.wrap\.game[\s\S]{0,600}?rotate\(90deg\)/.test(html), 'v2.3：不再強制旋轉 90 度（直式就能玩）');
ok(/body\.touch #stageWrap \{ padding-bottom: 162px; \}/.test(html), 'v2.3：直式時地圖下方留一列給搖桿');
ok(html.indexOf('requestFullscreen') >= 0 && html.indexOf("lock('landscape')") >= 0, '開局會嘗試全螢幕 + 鎖定橫向');
ok(html.indexOf("data-t=\"full\"") >= 0, '手機介面有全螢幕切換鍵');
ok(html.indexOf('#scr-game.on { display: flex') >= 0, '遊戲畫面為滿版 flex 版面（橫向填滿）');

console.log('=== 7. 跑 10 秒模擬：相機不亂跳、不崩潰 ===');
BH.settings.size = 'L'; BH.settings.revenge = 'super'; BH.settings.time = 120;
BH.Battle.resetSlots(); BH.startBattle(); G.state = 'play';
let camBad = 0, err = null;
try {
  for (let f = 0; f < 60 * 10; f++) {
    BH.updateBattle(1 / 60);
    BH.updateCamera(1 / 60);
    const vi2 = BH.viewInfo(), w = G.cols * G.T, h = G.rows * G.T;
    if (w > vi2.w) { if (G.camX < vi2.w - w - 1 || G.camX > 1) camBad++; }
    else if (Math.abs(G.camX - (vi2.w - w) / 2) > 2) camBad++;
    if (h > vi2.h) { if (G.camY < vi2.h - h - 1 || G.camY > 1) camBad++; }
    else if (Math.abs(G.camY - (vi2.h - h) / 2) > 2) camBad++;
    if (G.frame === undefined) G.frame = 0;
  }
} catch (e) { err = e; }
ok(!err, '10 秒模擬無例外' + (err ? '（' + err.message + '）' : ''));
ok(camBad === 0, '相機全程留在合法範圍（越界 ' + camBad + ' 次）');
const tg = BH.cameraTarget();
ok(tg && !tg.ai, '相機目標優先跟人類玩家（' + (tg && tg.label) + '）');

console.log('\n結果：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
