// 無頭測試 v21：v1.3
//   1. 壽命用完 → 按「再來一場」真的能重新開始（迴歸：結束畫面不再每幀重建按鈕）
//   2. 選角清單 8 隻動物（兔/熊/狗/貓/豬/熊貓/青蛙/雞）＋ 特色標籤
//   3. 選角預覽有走路動作（手腳擺動）／眨眼／跳躍，且只在選角畫面跑動畫
const fs = require('fs');
const vm = require('vm');

const html = require('./_sandbox').rawHtml;
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.error('no script'); process.exit(1); }
const code = m[1];

// ----- 模擬瀏覽環境（加強版：記錄事件監聽、innerHTML 設定次數） -----
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
const els = {};
const qmap = {};
function getId(id) {
  if (els[id]) return els[id];
  const el = {
    id, style: {}, dataset: {}, children: [], _cls: new Set(), _on: {}, _sets: 0, attrs: {},
    classList: {
      add(c) { el._cls.add(c); }, remove(c) { el._cls.delete(c); },
      toggle(c, on) { const want = on === undefined ? !el._cls.has(c) : !!on; want ? el._cls.add(c) : el._cls.delete(c); },
      contains(c) { return el._cls.has(c); }
    },
    addEventListener(type, fn) { (el._on[type] = el._on[type] || []).push(fn); },
    removeEventListener() {},
    appendChild(c) { el.children.push(c); return c; },
    getContext: () => mkCtx2D(),
    querySelectorAll: () => [],
    // 同一個選擇器回傳同一個假節點（才能取得先前註冊的點擊處理）
    querySelector(sel) {
      const k = id + '|' + sel;
      if (!qmap[k]) qmap[k] = getId(k);
      return qmap[k];
    },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 720, height: 540 }),
    setAttribute(n, v) { el.attrs[n] = String(v); },
    getAttribute(n) { return n in el.attrs ? el.attrs[n] : null; },
    setPointerCapture() {}, releasePointerCapture() {},
    focus() {}, click() {},
    width: 720, height: 540, textContent: '', value: ''
  };
  let _inner = '';
  Object.defineProperty(el, 'innerHTML', {
    get() { return _inner; },
    set(v) { _inner = v; el.children = []; el._sets++; }
  });
  els[id] = el;
  return el;
}

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
function mkEl(tag) { return getId(tag + '#' + Math.random().toString(36).slice(2)); }
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
const P = BH;

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}
function click(id) {
  const el = els[id];
  if (!el || !el._on || !el._on.click || !el._on.click.length) return false;
  el._on.click.slice().forEach(function (fn) { fn({ preventDefault() {} }); });
  return true;
}
function freshSolo(stage) {
  P.settings.size = 'M';
  P.settings.hazards = 'off';
  P.settings.sd = 'off';
  P.settings.ctrl = 'kb';
  P.settings.soloDiff = 'normal';
  P.settings.soloTime = 300;
  P.startSolo(stage || 1, false);
  G.state = 'play';
  G.bombs.length = 0; G.flames.length = 0;
  G.particles.length = 0; G.bubbles.length = 0;
  G.players[0].invuln = 0;
  return G.players[0];
}
function dieOnce(p) {
  p.invuln = 0;
  P.killPlayer(p, false, null);
  for (let i = 0; i < 300 && p.dead; i++) P.updateSolo(0.02);
}

console.log('=== 1. 版本 ===');
ok(parseFloat(BH.VERSION) >= 1.3, '版本至少 1.3（目前 ' + BH.VERSION + '）');
ok(html.indexOf('id="verTxt">' + BH.VERSION + '<') > 0, '畫面上的版本文字同步 ' + BH.VERSION);

console.log('\n=== 2. 壽命死完 → 按「再來一場」可以重新開始 ===');
let p = freshSolo(2);
ok(p.lives === 3, '一開始 3 條命');
dieOnce(p);
ok(p.lives === 2, '第一次死亡 → 剩 2 條命並自動復活');
dieOnce(p);
ok(p.lives === 1, '第二次死亡 → 剩 1 條命並自動復活');
dieOnce(p);
ok(p.lives === 0, '第三次死亡 → 命數歸零');
ok(G.state === 'over', '遊戲狀態切成 over（凍結更新，不會再每幀重建結束畫面）');
ok(p.dead === true, '玩家維持死亡狀態，不會被反覆復活');

// 迴歸重點：舊版狀態是 roundover，主循環仍呼叫 updateSolo → showEnd 每幀重建 innerHTML
// → 按鈕在 mousedown/mouseup 之間被換掉，點擊永遠沒反應
const setsBefore = els.ovBox ? els.ovBox._sets : 0;
for (let i = 0; i < 30; i++) P.updateSolo(0.016);
ok(els.ovBox._sets === setsBefore, '結束畫面只建立一次（30 幀內沒有被重建）');
ok(G.state === 'over', '空轉 30 幀後狀態仍是 over');
ok(p.lives === 0 && p.alive === false, '命數與死亡狀態都沒有被改動');

ok(!!els.btnAgain && !!els.btnAgain._on.click, '結束畫面有「再來一場」按鈕且已綁定點擊');
const clicked = click('btnAgain');
ok(clicked, '「再來一場」按鈕點得下去（事件確實送達）');
ok(G.state === 'idle', '點下後回到出發前（state=idle），不是卡在 over');
ok(G.endShown === false, '結束畫面標記已重置');
ok(G.stage === 2, '重開的是同一關（第 2 關）');
const np = G.players[0];
ok(!!np && np.alive === true, '產生新的玩家而且活著');
ok(np.lives === 3, '命數回到 3');
ok(G.timer > 0, '計時器重新設定（' + Math.round(G.timer) + '）');
ok(!els.ovIn._cls.has('hide'), '出發前的確認視窗已顯示');
// 接著按「出發！」應該進入倒數
const goOk = click('ovBox|button');
ok(goOk && G.state === 'countdown', '按「出發！」進入倒數（state=' + G.state + '）');

console.log('\n=== 3. BOSS 模式死完也能重開 ===');
P.startBossRush();
G.state = 'play';
let bp = G.players[0];
bp.invuln = 0;
for (let k = 0; k < 3; k++) {
  bp.invuln = 0;
  P.killPlayer(bp, false, null);
  for (let i = 0; i < 300 && bp.dead; i++) P.updateSolo(0.02);
}
ok(G.state === 'over' && bp.lives === 0, 'BOSS 模式命數歸零 → over');
click('btnAgain');
ok(G.bossRush === true && G.stage === 32, 'v4.14：BOSS 模式重開仍直接進第 32 關');
ok(G.players[0].lives === 3 && G.state === 'idle', 'BOSS 模式重開後狀態正常');

console.log('\n=== 4. 八隻動物（對應選角圖的順序與特色） ===');
const CH = BH.CHARACTERS;
ok(CH.length === 8, '選角清單共 8 隻（' + CH.length + '）');
const want = [
  ['rabbit', 'Rabbit', '美貌的'],
  ['bear', 'Bear', '非常有特色的'],
  ['dog', 'Dog', '有個性的'],
  ['cat', 'Cat', '賤賤的'],
  ['pig', 'Pig', '非常可愛的'],
  ['panda', 'Panda', '膽小的'],
  ['frog', 'Frog', '獨特的'],
  ['chick', 'Chick', '特別的']
];
want.forEach(function (w, i) {
  const c = CH[i];
  ok(c && c.animal === w[0] && c.en === w[1] && c.tag === w[2],
    '第 ' + (i + 1) + ' 隻：' + (c ? c.name : '?') + '（' + w[1] + ' · ' + w[2] + '）');
});
const ids = CH.map(function (c) { return c.animal; });
ok(new Set(ids).size === 8, '8 隻動物沒有重複');
ok(CH.every(function (c) { return c.name && c.color && c.dark; }), '每隻都有名字與配色');

console.log('\n=== 5. 選角清單（8 張角色卡） ===');
BH.Solo.renderChar();
const rowHtml = els.soloCharRow ? els.soloCharRow.innerHTML : '';
ok((rowHtml.match(/class="chcard/g) || []).length === 8, '選角列產生 8 張角色卡');
ok(/data-ch="0"/.test(rowHtml) && /data-ch="7"/.test(rowHtml), '每張卡都掛了自己的角色編號');
ok(rowHtml.indexOf('美貌的') > 0 && rowHtml.indexOf('特別的') > 0, '卡片上顯示特色標籤');
ok(rowHtml.indexOf('兔兔BIBI') > 0 && rowHtml.indexOf('小雞DODO') > 0, '卡片上顯示角色名字');
ok(els.soloCharHint && /目前選用/.test(els.soloCharHint.innerHTML), '下方提示顯示目前選用的角色');
ok(rowHtml.indexOf('charge') < 0 && rowHtml.indexOf('chcard sel') > 0, '預設選中的那張卡有 sel 高亮');

console.log('\n=== 6. 選角預覽的走路／眨眼動畫 ===');
// 用會記錄呼叫的 canvas context 檢查 drawCharBody 真的有在動
function recCtx() {
  const calls = [];
  const grad = { addColorStop() {} };
  const proxy = new Proxy({}, {
    get(t, k) {
      if (k === '__calls') return calls;
      if (k === 'canvas') return { width: 132, height: 164 };
      if (k === 'measureText') return () => ({ width: 10 });
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => grad;
      if (typeof t[k] !== 'undefined') return t[k];
      return function () { calls.push([k].concat(Array.prototype.slice.call(arguments))); };
    },
    set(t, k, v) { t[k] = v; return true; }
  });
  return proxy;
}
const g1 = recCtx();
BH.drawCharBody(g1, CH[0], 66, 130, 35, { walk: 0, moving: true, facing: 'right', bob: 0 });
const g2 = recCtx();
BH.drawCharBody(g2, CH[0], 66, 130, 35, { walk: Math.PI / 2, moving: true, facing: 'right', bob: 0 });
const feet1 = g1.__calls.filter(function (c) { return c[0] === 'ellipse'; });
const feet2 = g2.__calls.filter(function (c) { return c[0] === 'ellipse'; });
ok(feet1.length > 0 && feet2.length > 0, '角色本體有畫出身體部件（' + feet1.length + ' 個橢圓）');
ok(feet1[0][2] !== feet2[0][2], '走路時腳會前後擺動（y ' + feet1[0][2].toFixed(2) + ' → ' + feet2[0][2].toFixed(2) + '）');
ok(feet1[2][2] !== feet2[2][2], '另一隻腳往相反方向擺（交替邁步）');
// 眨眼：眼睛數量與形狀不同
const g3 = recCtx();
BH.drawCharBody(g3, CH[0], 66, 130, 35, { walk: 0, moving: false, blink: true });
const g4 = recCtx();
BH.drawCharBody(g4, CH[0], 66, 130, 35, { walk: 0, moving: false, blink: false });
const eyesOpen = g4.__calls.filter(function (c) { return c[0] === 'ellipse'; }).length;
const eyesShut = g3.__calls.filter(function (c) { return c[0] === 'ellipse'; }).length;
ok(eyesOpen !== eyesShut, '眨眼時眼睛換成閉眼弧線（橢圓 ' + eyesOpen + ' → ' + eyesShut + '）');

// 配件：8 隻都有專屬小配件
let wearAll = 0;
CH.forEach(function (c, i) {
  const gw = recCtx(), ga = recCtx();
  BH.animalWear(gw, c, 66, 130, 35, 0);
  BH.animalAccessory(ga, c, 66, 130, 95, 35);
  const n = gw.__calls.length + ga.__calls.length;
  if (n > 0) wearAll++;
});
ok(wearAll === 8, '8 隻角色都有自己的配件（花環／領巾／外套／魚骨T／領結／竹子／荷葉帽／蛋殼帽）');

// 預覽動畫模組：只在選角畫面跑、而且真的會畫
const fakeCanvases = [];
for (let i = 0; i < 8; i++) {
  fakeCanvases.push({
    width: 132, height: 164, _n: 0,
    getAttribute(n) { return n === 'data-ch' ? String(i) : null; },
    getContext() {
      const o = this;
      return new Proxy({}, {
        get(t, k) {
          if (k === 'canvas') return { width: o.width, height: o.height };
          if (k === 'measureText') return () => ({ width: 10 });
          if (typeof t[k] !== 'undefined') return t[k];
          return function () { o._n++; };
        },
        set(t, k, v) { t[k] = v; return true; }
      });
    }
  });
}
BH.CharPreview.mount({ querySelectorAll: () => fakeCanvases });
ok(BH.CharPreview.items().length === 8, '預覽模組掛上 8 張卡');
BH.Screen.show('solo');
const n0 = fakeCanvases.reduce(function (s, c) { return s + c._n; }, 0);
BH.CharPreview.tick(0.016);
BH.CharPreview.tick(0.016);
const n1 = fakeCanvases.reduce(function (s, c) { return s + c._n; }, 0);
ok(n1 > n0, '在選角畫面時 8 隻角色持續被繪製（幀間有動作）');
ok(fakeCanvases.every(function (c) { return c._n > 0; }), '每張卡的 canvas 都有畫東西');
BH.Screen.show('title');
const n2 = fakeCanvases.reduce(function (s, c) { return s + c._n; }, 0);
BH.CharPreview.tick(0.016);
ok(fakeCanvases.reduce(function (s, c) { return s + c._n; }, 0) === n2, '離開選角畫面就停止繪製（不浪費效能）');
// 選中會跳一下
BH.CharPreview.hop(3);
ok(true, '選角有「跳一下」回饋（hop 不報錯）');

console.log('\n=== 7. 選好的角色會真的帶進遊戲 ===');
P.settings.soloChar = 5;   // 熊貓
P.startSolo(1, false);
ok(G.players[0].chIdx === 5 && G.players[0].ch.animal === 'panda', '單人開場用的是選角選的熊貓');
P.settings.soloChar = 2;   // 柴犬
P.startSolo(1, false);
ok(G.players[0].ch.animal === 'dog', '換成柴犬也正確帶入');
P.settings.soloChar = 0;

console.log('\n=== 8. 對戰選角同樣吃到 8 隻 ===');
P.settings.size = 'M'; P.settings.count = 4; P.settings.ctrl = 'kb';
P.Battle.resetSlots();
P.startBattle();
const battleChars = G.players.map(function (q) { return q.ch.animal; });
ok(battleChars.length === 4, '4 人對戰 4 位玩家都有角色');
ok(battleChars.every(function (a) { return CH.some(function (c) { return c.animal === a; }); }), '對戰角色都來自這 8 隻動物');

console.log('\n' + (fail === 0 ? '通過 ' + pass + ' / ' + (pass + fail) : '✗ ' + fail + ' 項失敗（通過 ' + pass + '）'));
process.exit(fail === 0 ? 0 : 1);
