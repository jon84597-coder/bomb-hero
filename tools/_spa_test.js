// SPA 無頭 DOM 測試：解析 index.html，跑三段腳本，驗證路由與遊戲循環
'use strict';
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('public/index.html', 'utf8');

// ---------- 極簡 HTML 解析 ----------
const VOID = new Set(['br', 'img', 'input', 'meta', 'link', 'hr', 'circle', 'ellipse', 'path', 'rect', 'line', 'polygon']);

function parseEl(tag, attrs) {
  return {
    tagName: tag.toUpperCase(), attrs: attrs || {}, children: [], parent: null,
    id: (attrs && attrs.id) || '',
    style: {}, listeners: {}, _html: '', value: '', hidden: false, disabled: false,
    textContent: '', width: 0, height: 0,
    classList: {
      _s: new Set((attrs && attrs['class'] ? attrs['class'] : '').split(/\s+/).filter(Boolean)),
      add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
      toggle(c) { this._s.has(c) ? this._s.delete(c) : this._s.add(c); },
      contains(c) { return this._s.has(c); }
    },
    getAttribute(n) { return this.attrs[n] !== undefined ? this.attrs[n] : null; },
    setAttribute(n, v) { this.attrs[n] = v; if (n === 'id') this.id = v; },
    appendChild(c) { c.parent = this; this.children.push(c); return c; },
    addEventListener(t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); },
    removeEventListener() {},
    focus() {},
    matches(sel) { return matchSimple(this, sel); },
    querySelector(sel) {
      let r = qsAll(this, sel, 1);
      if (r.length) return r[0];
      // innerHTML 動態內容的寬鬆處理
      if (this._html && this._html.indexOf(sel.replace(/^[.#]/, '')) >= 0) {
        if (!this._dummy) this._dummy = parseEl('div', {});
        return this._dummy;
      }
      return null;
    },
    querySelectorAll(sel) { return qsAll(this, sel, Infinity); }
  };
}

function matchSimple(el, sel) {
  sel = sel.trim();
  if (sel.startsWith('#')) return el.id === sel.slice(1);
  if (sel.startsWith('.')) return el.classList.contains(sel.slice(1));
  if (sel.startsWith('[')) {
    const m = sel.slice(1, -1).split('=');
    const key = m[0];
    if (m.length === 1) return el.attrs[key] !== undefined;
    return el.attrs[key] === m[1].replace(/"/g, '');
  }
  return el.tagName === sel.toUpperCase();
}

function qsAll(root, sel, limit) {
  const parts = sel.trim().split(/\s+/);
  const out = [];
  (function walk(node) {
    for (const c of node.children) {
      if (matchSimple(c, parts[parts.length - 1])) {
        let ok = true;
        // 檢查祖先鏈
        let anc = c.parent, pi = parts.length - 2;
        while (pi >= 0 && anc) {
          if (matchSimple(anc, parts[pi])) pi--;
          anc = anc.parent;
        }
        if (pi < 0) { out.push(c); if (out.length >= limit) return; }
      }
      walk(c);
      if (out.length >= limit) return;
    }
  })(root);
  return out;
}

// 解析 body 標記
const bodyM = html.match(/<body>([\s\S]*?)<\/body>/)[1];
const scripts = [];
const markup = bodyM.replace(/<script>([\s\S]*?)<\/script>/g, function (_, s) { scripts.push(s); return ''; });

const root = parseEl('root', {});
const byId = {};
const stack = [root];
const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^<>]*?)?)\/?>|([^<]+)/g;
let m;
function parseAttrs(s) {
  const attrs = {};
  const re = /([a-zA-Z-]+)(?:="([^"]*)")?/g; let a;
  while ((a = re.exec(s))) attrs[a[1]] = a[2] === undefined ? '' : a[2];
  return attrs;
}
while ((m = tagRe.exec(markup))) {
  if (m[3] !== undefined) continue; // 文字
  const closing = m[0].startsWith('</');
  const tag = m[1].toLowerCase();
  if (closing) {
    if (stack.length > 1) stack.pop();
    continue;
  }
  const el = parseEl(tag, parseAttrs(m[2] || ''));
  el.parent = stack[stack.length - 1];
  stack[stack.length - 1].children.push(el);
  if (el.id) byId[el.id] = el;
  if (!VOID.has(tag) && !m[0].endsWith('/>')) stack.push(el);
}

// ---------- canvas 2d ctx（Proxy 記錄呼叫） ----------
function makeCtx() {
  const t = { __calls: 0 };
  const gradient = { addColorStop() {} };
  return new Proxy(t, {
    get(o, p) {
      if (p in o) return o[p];
      o.__calls++;
      if (p === 'createLinearGradient' || p === 'createRadialGradient' || p === 'createPattern')
        return function () { return gradient; };
      if (p === 'measureText') return function () { return { width: 20 }; };
      if (typeof p === 'string' && /^(Canvas|canvas)/.test(p)) return null;
      return function () {};
    },
    set(o, p, v) { o[p] = v; return true; }
  });
}

// ---------- 文件 / 沙盒 ----------
const document = {
  getElementById(id) {
    if (!byId[id]) console.log('[MISSING ID]', id);
    return byId[id] || null;
  },
  createElement(tag) { return parseEl(tag, {}); },
  querySelector(sel) { return qsAll(root, sel, 1)[0] || null; },
  querySelectorAll(sel) { return qsAll(root, sel, Infinity); },
  addEventListener() {}, body: parseEl('body', {})
};
for (const k in byId) {
  const el = byId[k];
  if (el.tagName === 'CANVAS') el.getContext = function () {
    if (!this._ctx) this._ctx = makeCtx();
    return this._ctx;
  };
}

let rafQ = [];
const sandbox = {
  console, Date, Math, JSON, Promise, Object, Array, String, Number, Boolean,
  parseInt, parseFloat, isNaN, setTimeout(fn) { return 0; }, clearTimeout() {},
  setInterval() { return 0; }, clearInterval() {},
  requestAnimationFrame(fn) { rafQ.push(fn); return rafQ.length; },
  document,
  navigator: { sendBeacon: function () { return true; }, maxTouchPoints: 0 },
  fetch: function () { return Promise.reject(new Error('no net')); },
  Blob: function () {},
  location: { search: '?sharecode=TI2OMANY5G', hash: '', pathname: '/index.html', href: '' },
  history: { replaceState() {} },
  scrollTo() {},
  devicePixelRatio: 1
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

let failures = 0;
function check(name, cond, extra) {
  console.log((cond ? 'PASS' : 'FAIL') + '  ' + name + (cond ? '' : '  [' + (extra || '') + ']'));
  if (!cond) failures++;
}

// ---------- 執行三段腳本（window.addEventListener 會被攔截記錄） ----------
rafQ = [];
const listeners = {};
const sb2 = Object.assign({}, sandbox);
sb2.addEventListener = function (t, fn) { (listeners[t] = listeners[t] || []).push(fn); };
sb2.window = sb2;
vm.createContext(sb2);
try {
  for (const s of scripts) vm.runInContext(s, sb2, { timeout: 5000 });
  check('三段腳本載入無例外', true);
} catch (e) {
  check('三段腳本載入無例外', false, e.message);
  process.exit(1);
}

const secLobby = byId['sec-lobby'], secSolo = byId['sec-solo'], secMulti = byId['sec-multi'];
check('初始顯示大廳', secLobby.style.display !== 'none' && secSolo.style.display === 'none' && secMulti.style.display === 'none');
check('切換開關已註冊', typeof sb2.__setSoloOn === 'function' && typeof sb2.__setMultiOn === 'function');

function click(id) {
  const el = byId[id];
  const ev = { preventDefault() { this.pd = true; } };
  (el.listeners.click || []).forEach(fn => fn.call(el, ev));
  return ev;
}
function key(code) { return null; }

const soloCtx = byId['s-cv']._ctx;
check('大廳階段遊戲循環不渲染（被閘住）', (function () {
  for (let i = 0; i < 60; i++) { const q = rafQ; rafQ = []; q.forEach(fn => fn(1000 + i * 16)); }
  return soloCtx.__calls <= 3;  // 只允許初始化的 setTransform 呼叫
})(), 'calls=' + soloCtx.__calls);

// 切到單人
const ev1 = click('btn-solo');
check('點擊單人按鈕：切換畫面', secSolo.style.display === '' && secLobby.style.display === 'none' && ev1.pd);
(function runFrames() {
  for (let i = 0; i < 120; i++) { const q = rafQ; rafQ = []; q.forEach(fn => fn(2000 + i * 16)); }
})();
check('單人模式渲染循環啟動', soloCtx.__calls > 50, 'calls=' + soloCtx.__calls);

// 鍵盤（單人開啟時）
let pdArrow = false;
(listeners.keydown || []).forEach(fn => {
  if (!pdArrow) {
    const ev = { code: 'ArrowRight', target: { tagName: 'BODY' }, repeat: false, preventDefault() { pdArrow = true; } };
    fn(ev);
  }
});
check('單人鍵盤生效', pdArrow);

// 切到多人
click('btn-multi');
check('切換到多人：單人被隱藏', secMulti.style.display === '' && secSolo.style.display === 'none');
let pdInInput = false, soloOff = false;
(listeners.keydown || []).forEach(fn => {
  const ev = { code: 'KeyW', target: { tagName: 'INPUT' }, repeat: false, preventDefault() { pdInInput = true; } };
  fn(ev);
});
(listeners.keydown || []).forEach(fn => {
  const ev = { code: 'ArrowUp', target: { tagName: 'BODY' }, repeat: false, preventDefault() { soloOff = true; } };
  fn(ev);
});
check('輸入框打字不會被方向鍵攔截', !pdInInput);
check('多人頁開啟時方向鍵由多人處理', soloOff);

// 多人：點加入（無網路 → 顯示錯誤而不是崩潰）
try {
  click('m-joinBtn');
  check('無網路時加入不崩潰', true);
} catch (e) {
  check('無網路時加入不崩潰', false, e.message);
}

// 雜項檢查
const spa = html;
check('CSS 已作用域化（solo）', spa.indexOf('#sec-solo .game') > 0);
check('CSS 已作用域化（multi）', spa.indexOf('#sec-multi .card') > 0);
check('無殘留 body 選擇器衝突', (spa.match(/(^|\n)\s*body\s*\{/g) || []).length === 1);
check('無重複 ID', (function () {
  const ids = [...spa.matchAll(/id="([^"]+)"/g)].map(x => x[1]);
  return new Set(ids).size === ids.length;
})());

console.log('\n' + (failures === 0 ? 'ALL PASS' : failures + ' FAILED'));
process.exit(failures === 0 ? 0 : 1);
