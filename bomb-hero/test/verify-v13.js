// 無頭測試：驗證 穿牆 / 投擲 / 拳擊 / 踢彈
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
const S = BH.settings;

console.log('=== 1. 三種控制模式切換 ===');
S.ctrl = 'kb'; BH.applyCtrl();
ok(BH.ctrlMode() === 'kb', '鍵盤模式 ctrlMode = kb');
ok(!sandbox.document.body.classList.contains('touch'), '鍵盤模式 → body 沒有 touch 類別（電腦不顯示手機按鈕）');
S.ctrl = 'touch'; BH.applyCtrl();
ok(BH.ctrlMode() === 'touch', '手機模式 ctrlMode = touch');
ok(sandbox.document.body.classList.contains('touch'), '手機模式 → body 加上 touch（顯示虛擬按鍵）');
S.ctrl = 'pad'; BH.applyCtrl();
ok(BH.ctrlMode() === 'pad', '手把模式 ctrlMode = pad');
ok(!sandbox.document.body.classList.contains('touch'), '手把模式 → 不顯示手機按鈕');
S.ctrl = 'auto'; BH.applyCtrl();
ok(BH.ctrlMode() === (BH.IS_TOUCH ? 'touch' : 'kb'), '自動模式依裝置判斷（此環境 IS_TOUCH=' + BH.IS_TOUCH + ' → ' + BH.ctrlMode() + '）');
ok(BH.touchEnabled() === (BH.ctrlMode() === 'touch'), 'touchEnabled 與模式一致');
ok(html.indexOf('body.touch #touchUI') >= 0, 'CSS 只在 body.touch 時顯示 #touchUI');

console.log('=== 2. 鍵盤按鍵可自訂（玩家 1）===');
S.ctrl = 'kb'; S.keys1 = Object.assign({}, BH.DEF_KEYS1);
BH.applyCtrl();
ok(BH.Input.schemes.kb1.dirs()[0] === undefined, '未按鍵 → 不移動');
key('KeyW', true);
ok(BH.Input.schemes.kb1.dirs().indexOf('up') >= 0, '預設 W = 上');
key('KeyW', false);
S.keys1.up = 'KeyI';              // 改鍵
key('KeyW', true);
ok(BH.Input.schemes.kb1.dirs().indexOf('up') < 0, '改鍵後舊的 W 不再觸發上');
key('KeyW', false);
key('KeyI', true);
ok(BH.Input.schemes.kb1.dirs().indexOf('up') >= 0, '改鍵後 I = 上（立即生效，不需重開）');
key('KeyI', false);
S.keys1.act = 'KeyF';
BH.Input.flush();
key('KeyF', true);
ok(BH.Input.schemes.kb1.action() === true, '動作鍵改成 F → 可放彈');
BH.Input.flush();
key('KeyF', false);
key('Space', true);
ok(BH.Input.schemes.kb1.action() === false, '舊的空白鍵不再放彈');
key('Space', false);

console.log('=== 3. 玩家 2 按鍵也可自訂 ===');
S.keys2 = Object.assign({}, BH.DEF_KEYS2);
key('ArrowLeft', true);
ok(BH.Input.schemes.kb2.dirs().indexOf('left') >= 0, 'P2 預設 ← = 左');
key('ArrowLeft', false);
S.keys2.left = 'KeyJ';
key('ArrowLeft', true);
ok(BH.Input.schemes.kb2.dirs().indexOf('left') < 0, 'P2 改鍵後 ← 失效');
key('ArrowLeft', false);
key('KeyJ', true);
ok(BH.Input.schemes.kb2.dirs().indexOf('left') >= 0, 'P2 改鍵後 J = 左');
key('KeyJ', false);
ok(BH.Input.schemes.kb1.dirs().indexOf('left') < 0, 'P1 不受 P2 改鍵影響');

console.log('=== 4. 按鍵名稱顯示 ===');
ok(BH.keyName('KeyW') === 'W', 'KeyW → W');
ok(BH.keyName('ArrowUp') === '↑', 'ArrowUp → ↑');
ok(BH.keyName('Space') === '空白鍵', 'Space → 空白鍵');
ok(BH.keyName('Numpad5') === 'Num5', 'Numpad5 → Num5');
ok(BH.keyName(null) === '未設定', 'null → 未設定');

console.log('=== 5. 開局套用所選模式 ===');
S.keys1 = Object.assign({}, BH.DEF_KEYS1); S.keys2 = Object.assign({}, BH.DEF_KEYS2);
S.ctrl = 'kb'; BH.applyCtrl();
BH.startSolo(1);
ok(G.players[0].scheme === BH.Input.schemes.kb1, '鍵盤模式單人 → 使用 kb1 方案');
S.ctrl = 'touch'; BH.applyCtrl();
BH.startSolo(1);
ok(G.players[0].scheme === BH.Input.schemes.touch, '手機模式單人 → 使用觸控方案');
S.ctrl = 'pad'; BH.applyCtrl();
BH.startSolo(1);
ok(G.players[0].scheme !== BH.Input.schemes.kb1 && G.players[0].scheme !== BH.Input.schemes.touch, '手把模式單人 → 使用手把方案');

S.ctrl = 'touch'; BH.applyCtrl();
S.size = 'M'; S.hazards = 'off'; S.sd = 'off'; S.revenge = 'off'; S.time = 120;
// v1.9：P2 起預設交給 AI，只有 P1 是人類 → 想多人再手動把 P2 切回人類
BH.Battle.resetSlots(); BH.Battle.slots[1].joined = true; BH.Battle.slots[1].forceAi = false;
BH.startBattle();
const humans = G.players.filter(function (p) { return !p.ai; });
ok(humans.length === 2, '把 P2 切回人類後 → 對戰有 2 位人類玩家');
ok(humans.every(function (p) { return p.scheme === BH.Input.schemes.touch; }), '手機模式 → 所有人類都用觸控方案');
S.ctrl = 'pad'; BH.applyCtrl();
BH.Battle.resetSlots(); BH.Battle.slots[1].joined = true; BH.Battle.slots[1].forceAi = false;
BH.startBattle();
const h2 = G.players.filter(function (p) { return !p.ai; });
ok(h2.length === 2 && h2[0].scheme !== h2[1].scheme, '手把模式 → 兩位人類分配到不同手把');
// v1.9：預設（不動設定）只有 P1 是人類
S.ctrl = 'touch'; BH.applyCtrl();
BH.Battle.resetSlots(); BH.startBattle();
ok(G.players.filter(function (p) { return !p.ai; }).length === 1, 'v1.9：預設只有 P1 是人類（P2 起是 AI）');

console.log('=== 6. 手機按鈕版面可調 ===');
S.ctrl = 'touch'; BH.applyCtrl();
S.tpad = { side: 'left', act: 'right', size: 1 };
let v = BH.touchLayoutVars();
ok(v['--pad-left'] === '10px' && v['--pad-right'] === 'auto', '方向鍵在左 → pad-left 生效');
ok(v['--act-right'] === '14px' && v['--act-left'] === 'auto', '放彈鍵在右');
ok(v['--tscale'] === '1', '大小中 → scale 1');
S.tpad = { side: 'right', act: 'left', size: 1.2 };
v = BH.touchLayoutVars();
ok(v['--pad-right'] === '10px' && v['--pad-left'] === 'auto', '方向鍵在右 → pad-right 生效');
ok(v['--act-left'] === '14px' && v['--act-right'] === 'auto', '放彈鍵在左');
ok(v['--tscale'] === '1.2', '大小大 → scale 1.2');
BH.applyTouchLayout();
ok(els['touchUI'].style['--tscale'] === '1.2' && els['touchUI'].style['--pad-right'] === '10px',
  'applyTouchLayout 真的寫進 #touchUI 樣式（' + els['touchUI'].style['--tscale'] + '）');

console.log('=== 7. 設定會存檔 ===');
delete storage['bombhero-settings-v1'];
S.ctrl = 'touch'; S.tpad.side = 'right'; S.tpad.size = 1.2; S.keys1.up = 'KeyI';
BH.saveSettings();
const saved = JSON.parse(storage['bombhero-settings-v1'] || '{}');
ok(saved.ctrl === 'touch', '控制模式存檔（ctrl=' + saved.ctrl + '）');
ok(saved.tpad && saved.tpad.side === 'right', '手機按鈕版面存檔（side=' + (saved.tpad || {}).side + '）');
ok(saved.keys1 && saved.keys1.up === 'KeyI', '自訂按鍵存檔（keys1.up=' + (saved.keys1 || {}).up + '）');

console.log('\n結果：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
