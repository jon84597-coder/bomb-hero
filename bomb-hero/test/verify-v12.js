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
const fs2 = require('fs');
const htmlSrc = require('./_sandbox').rawHtml;

console.log('=== 1. 觸控介面存在於 HTML ===');
['id="tpad"', 'id="tpknob"', 'class="tpring"', 'data-t="action"', 'data-t="pause"', 'id="touchUI"']
  .forEach(function (needle) { ok(htmlSrc.indexOf(needle) >= 0, '有 ' + needle); });
ok(htmlSrc.indexOf('body.touch #touchUI') >= 0, '僅觸控裝置（body.touch）才顯示觸控介面');
ok(htmlSrc.indexOf('class="tbtn tup"') < 0 && htmlSrc.indexOf('data-t="left"') < 0,
  '舊的四顆方向鍵已移除（改成圓形搖桿）');

console.log('=== 2. 觸控輸入 → 控制方案 ===');
const IN = BH.Input;
ok(!!IN.schemes.touch, '存在 touch 控制方案');
IN.setTouch('right', true);
ok(IN.schemes.touch.dirs()[0] === 'right', '按住右 → dirs 回 right（實際 ' + JSON.stringify(IN.schemes.touch.dirs()) + '）');
IN.setTouch('right', false); IN.setTouch('up', true);
ok(IN.schemes.touch.dirs().join(',') === 'up', '放開右改按上 → 只剩 up');
IN.setTouch('up', false);
ok(IN.schemes.touch.dirs().length === 0, '全部放開 → 不移動');

console.log('=== 1b. 搖桿 360° → 8 方向（含 45° 斜走） ===');
function axisDir(ax, ay) { IN.setTouchAxis(ax, ay); return IN.schemes.touch.dirs().join(','); }
ok(axisDir(1, 0) === 'right', '推正右 → right');
ok(axisDir(-1, 0) === 'left', '推正左 → left');
ok(axisDir(0, -1) === 'up', '推正上 → up');
ok(axisDir(0, 1) === 'down', '推正下 → down');
ok(axisDir(.707, -.707) === 'up,right', '右上 45° → 上＋右（斜走）');
ok(axisDir(-.707, -.707) === 'up,left', '左上 45° → 上＋左');
ok(axisDir(.707, .707) === 'down,right', '右下 45° → 下＋右');
ok(axisDir(-.707, .707) === 'down,left', '左下 45° → 下＋左');
ok(axisDir(.975, -.22) === 'right', '偏 13° 只算右（不會誤判成斜走）');
ok(axisDir(0, 0) === '', '死區（不推）→ 不移動');
IN.setTouchAxis(0, 0);

console.log('=== 3. 動作鍵為「單次觸發」邊緣 ===');
IN.flush();
IN.setTouch('action', true);
ok(IN.schemes.touch.action() === true, '按下動作鍵 → action() = true');
IN.flush();
ok(IN.schemes.touch.action() === false, '同一偵（flush 後）不會重複觸發');
IN.setTouch('action', false);
IN.setTouch('action', true);
ok(IN.schemes.touch.action() === true, '放開再按 → 可再次觸發');
IN.setTouch('action', false); IN.flush();

console.log('=== 4. 觸控裝置自動改用觸控方案（模擬 IS_TOUCH）===');
ok(typeof BH.IS_TOUCH === 'boolean', 'IS_TOUCH 有值（此無頭環境應為 false）');

console.log('=== 5. 觸控玩家實際能移動與放彈 ===');
BH.settings.size = 'M'; BH.settings.hazards = 'off'; BH.settings.sd = 'off'; BH.settings.revenge = 'off';
BH.Battle.resetSlots();
BH.startBattle(); G.state = 'play';
const T = G.T;
const P = G.players[0];
// 把玩家換成觸控方案，模擬手機操縱
P.scheme = IN.schemes.touch;
P.invuln = 99;
P.x = 1 * T + T / 2; P.y = 1 * T + T / 2;
G.grid[1][2] = 0;
IN.setTouch('right', true);
const x0 = P.x;
for (let i = 0; i < 30; i++) { BH.controlHuman(P, 1 / 60); IN.flush(); }
IN.setTouch('right', false);
ok(P.x > x0 + 10, '觸控右鍵讓角色往右移動（+' + (P.x - x0).toFixed(1) + 'px）');
G.bombs.length = 0;
IN.setTouch('action', true);
BH.controlHuman(P, 1 / 60);
IN.flush(); IN.setTouch('action', false);
ok(G.bombs.length === 1, '觸控動作鍵可以放炸彈（炸彈數 ' + G.bombs.length + '）');

console.log('\n結果：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
