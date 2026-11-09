// test/_sandbox.js — 共用無頭沙盒（把 index.html 的 <script> 丟進 vm 跑，不需要真瀏覽器）
// 用法：const { makeEnv } = require('./_sandbox'); const env = makeEnv();
const fs = require('fs');
const vm = require('vm');

// index.html 可能在專案根（開發目錄），也可能在 public/（E 槽／部署副本）
const HTML_PATH = (function () {
  const a = __dirname + '/../index.html';
  const b = __dirname + '/../public/index.html';
  return fs.existsSync(a) ? a : b;
})();
const JS_DIR = __dirname + '/../js/';
const RAW = fs.readFileSync(HTML_PATH, 'utf8');

function readJs(name) {
  try { return fs.readFileSync(JS_DIR + name, 'utf8'); } catch (e) { return ''; }
}

/* v5.74：拆檔（js/rpg.js）之後，沙盒不能只認 js/main.js。
   這裡改成「照 index.html 的文件順序，逐支外部檔執行」，跟瀏覽器完全一致：
     1. i18n 字典（js/i18n-src.js）→ 當成 pre（舊測試靠 html 裡找文案）
     2. 版本紀錄（js/version-log.js）→ 瀏覽器是動態載入，沙盒一律預先載入
     3. <script src="js/*.js"> 依序：main.js → keys-ui.js → onboard.js → …
   之後再拆引擎段（js/*.js）不必再改沙盒，只要在 index.html 加一行 script。

   兩個細節：
   • 只有 main 那支「失敗＝整支測試該紅」，其餘外部 UI 模組（鍵盤面板／引導／外觀…）
     在無頭環境本來就可能摸不到真實 DOM —— 失敗只記在 env.extErrors，不拖垮全部 170 支。
     verify-v574 會斷言 extErrors 是空的，所以「真的壞掉」還是會被發現。
   • rawHtml／html 只內聯「核心檔」（main.js ＋ 之後拆出去的 rpg.js 等），
     不含 keys-ui 這一類純 UI 檔 —— 體積斷言（v484／v556）才不會被連帶打歪。 */
const EXT_FILES = (function () {
  const list = [];
  const re = /<script src="(?:\.\/)?js\/([\w.\-]+\.js)"><\/script>/g;
  let m;
  while ((m = re.exec(RAW))) if (list.indexOf(m[1]) < 0) list.push(m[1]);
  return list;
})();
// 內聯進 html 文字版的核心檔（純 UI 檔不列入，見上面說明）
const CORE_INLINE = ['main.js', 'rpg.js'];

const MAINJS = readJs('main.js');
const html = (function () {
  if (!MAINJS) return RAW;
  let out = RAW;
  CORE_INLINE.forEach(function (f) {
    const body = readJs(f);
    if (!body) return;
    const esc = f.replace(/\./g, '\\.');
    const re = new RegExp('<script src="\\.?\\/?js\\/' + esc + '"><\\/script>');
    out = out.replace(re, function () { return '<script>\n' + body + '</script>'; });
  });
  return out;
})();
// v5.20：i18n 字典抽成外部檔 —— 對外仍然提供「邏輯全文」（字典 + 主檔），
// 這樣所有「在原始碼裡找文案」的舊測試都不用改。
const I18N_PRE = (function () {
  const q = __dirname + '/../js/i18n-src.js';
  return fs.existsSync(q) ? fs.readFileSync(q, 'utf8') + '\n' : '';
})();
// v5.38：版本更新紀錄也搬到外部檔了（js/version-log.js）—— 沙盒一樣要比照瀏覽器先載入。
const VLOG_PRE = (function () {
  const q = __dirname + '/../js/version-log.js';
  return fs.existsSync(q) ? fs.readFileSync(q, 'utf8') + '\n' : '';
})();

function makeEnv(opts) {
  opts = opts || {};
  // v4.68：可指定其他檔案（A/B 對照舊版行為用；不給就讀 index.html）
  const src = opts.file ? fs.readFileSync(opts.file, 'utf8') : html;
  // v5.74：要執行的外部檔（照文件順序；字典本身走 pre，不重複跑）
  const runList = (opts.core || EXT_FILES).filter(function (f) { return f !== 'i18n-src.js'; });
  let legacyCode = '';
  if (opts.file) {
    // 舊備份檔：字典還內嵌、主邏輯是唯一的無屬性 script
    const m = src.match(/<script>([\s\S]*?)<\/script>/);
    if (!m) throw new Error('no script');
    legacyCode = m[1];
  }
  // v5.20：i18n 字典抽成外部檔（js/i18n-src.js）—— 沙盒比照瀏覽器，先載入再跑主程式。
  const pre = I18N_PRE + VLOG_PRE;

  // calls = 方法呼叫；sets = 屬性指派（fillStyle / strokeStyle …）
  // sets 設上限，避免長時間 render 把記憶體吃光（測試要自己 rec.sets.length = 0 清空）
  const rec = { calls: [], sets: [], texts: [], SETS_CAP: 60000 };
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
      get firstChild() { return el.children.length ? el.children[0] : null; },
      get lastChild() { return el.children.length ? el.children[el.children.length - 1] : null; },
      get firstElementChild() { return el.children.length ? el.children[0] : null; },
      get lastElementChild() { return el.children.length ? el.children[el.children.length - 1] : null; },
      get childElementCount() { return el.children.length; },
      appendChild(c) { el.children.push(c); c.parentNode = el; return c; },
      removeChild(c) { const i = el.children.indexOf(c); if (i >= 0) el.children.splice(i, 1); return c; },
      remove() { if (el.parentNode && el.parentNode.removeChild) el.parentNode.removeChild(el); },
      insertBefore(c) { el.children.unshift(c); c.parentNode = el; return c; },
      getContext: () => mkCtx2D(),
      querySelectorAll: () => [],
      querySelector(sel) {
        const k = id + '|' + sel;
        if (!qmap[k]) qmap[k] = getId(k);
        return qmap[k];
      },
      // v4.71：跟著 clientWidth/clientHeight 走 —— 真瀏覽器兩者一致，
      //   而 tileSize()/canvasSize() 現在會讀 rect（舊版固定 720×540，測試設了尺寸也量不到）
      getBoundingClientRect: () => ({ left: 0, top: 0, width: el.clientWidth || 720, height: el.clientHeight || 540 }),
      setAttribute(n, v) { el.attrs[n] = String(v); },
      getAttribute(n) { return n in el.attrs ? el.attrs[n] : null; },
      setPointerCapture() {}, releasePointerCapture() {},
      focus() {}, click() {},
      width: 720, height: 540, value: ''
    };
    // v4.77：記錄所有寫進 DOM 的文字（i18n 掃描用）
    let _inner = '', _txt = '';
    if (rec.texts) {
      Object.defineProperty(el, 'textContent', {
        get() { return _txt; },
        set(v) { _txt = String(v); if (_txt) rec.texts.push(_txt); }
      });
    } else el.textContent = '';
    Object.defineProperty(el, 'innerHTML', {
      get() { return _inner; },
      set(v) {
        _inner = String(v); el.children = [];
        if (rec.texts && _inner) rec.texts.push(_inner);
        /* v5.40：可選「真 innerHTML 行為」—— 重畫之後舊的子節點就作廢了，
           真瀏覽器 getElementById 會拿到新節點（舊節點的事件監聽自然消失）。
           預設不開（139 支舊測試靠「同一個 id 永遠同一個物件」），
           要驗「重畫後事件有沒有重綁」的測試請 makeEnv({ realInner: true })。 */
        if (opts.realInner) {
          const re = /id="([\w-]+)"/g;
          let m;
          while ((m = re.exec(_inner))) {
            delete els[m[1]];
            for (const k in qmap) if (k.indexOf(m[1] + '|') === 0) delete qmap[k];
          }
        }
      }
    });
    els[id] = el;
    return el;
  }

  const listeners = {};
  const storage = {};
  const qcache = {};
  // v4.11：querySelector 要「同個 selector 永遠回傳同一個元素」（真瀏覽器就是如此）。
  //   舊版每次都 mkEl() 產生新元素 → 測試根本觀察不到 classList 的切換
  //   （例如「遙控鍵只在拿到遙控器時出現」這種顯隱邏輯會測不出來）。
  function qsa(sel) {
    if (!qcache[sel]) qcache[sel] = getId('q#' + sel);
    return qcache[sel];
  }
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
      querySelector: (sel) => qsa(sel),
      addEventListener: (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); },
      removeEventListener() {},
      createElement: t => mkEl(t),
      // v4.6：body／documentElement 要「同一個」（真瀏覽器就是同一個），
      // 不然測試拿 getId('body') 跟程式拿 document.body 會是兩個不同物件
      body: getId('body'),
      documentElement: getId('html')
    }
  };
  sandbox.window = sandbox;
  sandbox.addEventListener = (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); };
  sandbox.removeEventListener = () => {};
  sandbox.globalThis = sandbox;
  sandbox.window.window = sandbox;
  vm.createContext(sandbox);
  // pre（字典 ＋ 版本紀錄）先跑；字典裡只是資料，不會失敗
  vm.runInContext(pre, sandbox, { filename: 'pre' });
  const extErrors = [];
  if (opts.file && legacyCode) {
    vm.runInContext(legacyCode, sandbox, { filename: opts.file });
  } else {
    runList.forEach(function (f) {
      const body = readJs(f);
      if (!body) { extErrors.push([f, 'missing']); return; }
      try {
        vm.runInContext(body, sandbox, { filename: f });
      } catch (e) {
        if (f === 'main.js') throw e;           // 主程式壞掉＝測試該紅
        extErrors.push([f, String(e && e.message || e)]);
      }
    });
  }

  const BH = sandbox.window.__BH;
  if (!BH) throw new Error('no __BH');
  /* v5.50：單人／RPG 的預設地圖改成「隨機生成」。
     舊測試（一百多支）幾乎都假設 15×13 手工圖：地圖一隨機，尺寸／縮放 T／速度係數／牆位
     每個 run 都不一樣 → 會變成「這次紅這支、下次紅那支」的隨機失敗。
     所以沙盒預設釘回 classic；要驗真正的預設值（random）或隨機地圖行為，
     請自己 makeEnv({ realMapDefault: true })，或建立後再 settings.mapMode = 'random'。 */
  if (!opts.realMapDefault) { try { BH.settings.mapMode = 'classic'; } catch (e) {} }
  // v5.20：html 回傳「邏輯全文」（外部字典 + 主檔）—— 舊測試會直接在裡面找中文文案
  return { html: pre + src, sandbox, BH, rec, mkCtx2D, getId, listeners, storage, els,
           extErrors, extFiles: EXT_FILES,
           G: BH.Game, P: BH, fakeImg: (w, h) => ({ naturalWidth: w, naturalHeight: h, __fake: true }) };
}

// rawHtml：只有 index.html（給「量主檔大小」「掃靜態文案」這種必須看真實檔案的測試用）
// i18nPre：外部字典原始碼（給自己另開 vm 的測試用，例如 verify-v22）
/* v5.38：html 維持「字典＋主檔」（掃 UI 文案的測試不該被歷史更新紀錄干擾）；
   要驗版本紀錄的測試請用 vlog（純資料檔）或 htmlAll。 */
module.exports = { makeEnv, html: I18N_PRE + html, rawHtml: html, i18nPre: I18N_PRE,
  vlog: VLOG_PRE, htmlAll: I18N_PRE + VLOG_PRE + html, extFiles: EXT_FILES };
