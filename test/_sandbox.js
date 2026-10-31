// test/_sandbox.js — 共用無頭沙盒（把 index.html 的 <script> 丟進 vm 跑，不需要真瀏覽器）
// 用法：const { makeEnv } = require('./_sandbox'); const env = makeEnv();
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync(__dirname + '/../index.html', 'utf8');

function makeEnv(opts) {
  opts = opts || {};
  const m = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('no script');
  const code = m[1];

  // calls = 方法呼叫；sets = 屬性指派（fillStyle / strokeStyle …）
  // sets 設上限，避免長時間 render 把記憶體吃光（測試要自己 rec.sets.length = 0 清空）
  const rec = { calls: [], sets: [], SETS_CAP: 60000 };
  function mkCtx2D() {
    const grad = { addColorStop() {} };
    return new Proxy({}, {
      get(t, k) {
        if (k === '__calls') return rec.calls;
        if (k === 'canvas') return { width: 720, height: 540 };
        if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => grad;
        if (k === 'measureText') return () => ({ width: 10 });
        if (k === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) });
        if (typeof t[k] !== 'undefined') return t[k];
        return function () { rec.calls.push([k].concat(Array.prototype.slice.call(arguments))); };
      },
      set(t, k, v) {
        if (rec.sets.length < rec.SETS_CAP) rec.sets.push([k, v]);
        t[k] = v; return true;
      }
    });
  }

  const els = {};
  const qmap = {};
  function getId(id) {
    if (els[id]) return els[id];
    const el = {
      id, style: {}, dataset: {}, children: [], _cls: new Set(), _on: {}, attrs: {},
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
      set(v) { _inner = v; el.children = []; }
    });
    els[id] = el;
    return el;
  }

  const listeners = {};
  const storage = {};
  // v4.2：可以預先塞 localStorage（測「老玩家升級後的行為」這種情境）
  if (opts.storage) { for (const k in opts.storage) storage[k] = String(opts.storage[k]); }
  function mkEl(tag) { return getId(tag + '#' + Math.random().toString(36).slice(2)); }
  const sandbox = {
    console, Math, JSON, Object, Array, Date, parseInt, parseFloat, isNaN, isFinite,
    Uint8ClampedArray, Infinity, NaN, undefined,
    setTimeout: (fn, ms) => { if (opts.runTimers) { try { fn(); } catch (e) {} } return 0; },
    clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    requestAnimationFrame: () => 0,
    performance: { now: () => Date.now() },
    localStorage: {
      getItem: k => (k in storage ? storage[k] : null),
      setItem: (k, v) => { storage[k] = String(v); },
      removeItem: k => { delete storage[k]; }
    },
    navigator: { getGamepads: () => [] },
    location: { search: opts.search || '', href: 'file:///index.html', protocol: 'file:' },
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
  if (!BH) throw new Error('no __BH');
  return { html, sandbox, BH, rec, mkCtx2D, getId, listeners, storage, els,
           G: BH.Game, P: BH, fakeImg: (w, h) => ({ naturalWidth: w, naturalHeight: h, __fake: true }) };
}

module.exports = { makeEnv, html };
