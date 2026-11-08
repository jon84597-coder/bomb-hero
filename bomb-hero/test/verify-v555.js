// test/verify-v555.js —— v5.55：SW 導覽流程加硬上限（伺服器叫不醒時不再無限轉圈）
//   ① 原始碼層面：HARD_TIMEOUT 存在、硬上限 timer 有被設、wakePage 三種文案齊備
//   ② 行為層面（假時鐘 + 假 fetch）：五種情境都要在時限內「一定 settle」
//      A 網路正常       → 立刻回網路回應
//      B fetch 失敗+無快取 → 回喚醒頁（不是白屏、不是 reject）
//      C fetch 永遠掛住+無快取 → 10 秒硬上限到就回喚醒頁（★ 這條在舊版永不 resolve）
//      D fetch 永遠掛住+有快取 → 2.2 秒就回快取
//      E 伺服器回 503    → 回喚醒頁（不讓瀏覽器丟錯誤頁）
//      F 離線（onLine=false）→ 回「目前沒有網路」
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const swSrc = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');

let pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }

/* ---------------- ① 原始碼 ---------------- */
ok(/var HARD_TIMEOUT = 10000;/.test(swSrc), '有 HARD_TIMEOUT = 10000');
ok(/function wakePage\(\)/.test(swSrc), '有 wakePage()');
ok(/var hard = setTimeout\(function \(\) \{ done\(wakePage\(\)\); \}, HARD_TIMEOUT\);/.test(swSrc),
  '硬上限 timer 有設（到點給喚醒頁）');
ok(/伺服器正在喚醒/.test(swSrc), '有「伺服器正在喚醒」文案');
ok(/目前沒有網路/.test(swSrc), '有「目前沒有網路」文案');
ok(/Waking the server/.test(swSrc), '有英文喚醒文案');
/* 硬上限不能被 catch 分支清掉 —— 它就是最後一道保險 */
const catchSeg = swSrc.slice(swSrc.indexOf("}).catch(function () {"), swSrc.indexOf("}).catch(function () {") + 220);
ok(catchSeg.indexOf('clearTimeout(hard)') < 0, 'catch 分支沒有 clearTimeout(hard)（保留兜底）');
ok(/if \(res && res\.status >= 500\) \{ done\(wakePage\(\)\); return; \}/.test(swSrc), '5xx 會回喚醒頁');
ok(/SW_VERSION = 'v5\.55\.0'/.test(swSrc), 'SW_VERSION 是 v5.55.0');
ok(swSrc.indexOf('\r') < 0, '整檔 LF');

/* ---------------- ② 假時鐘 + 假 SW 環境 ---------------- */
function makeEnv(opts) {
  const timers = new Map();
  let seq = 0, now = 0;
  const store = new Map();          // key -> Response（模擬 CacheStorage）
  const handlers = {};

  function setT(fn, ms) {
    const id = ++seq;
    timers.set(id, { fn: fn, at: now + (ms || 0), id: id });
    return id;
  }
  function clrT(id) { timers.delete(id); }

  const sandbox = {
    console: { log: function () {}, warn: function () {}, error: function () {} },
    Promise: Promise, Response: Response, Request: Request, URL: URL, Headers: Headers,
    setTimeout: setT, clearTimeout: clrT,
    setInterval: function () { return 0; }, clearInterval: function () {},
    navigator: { language: 'zh-TW', onLine: opts.onLine === false ? false : true }
  };
  sandbox.self = {
    addEventListener: function (t, f) { (handlers[t] = handlers[t] || []).push(f); },
    location: { origin: 'https://x.test' },
    clients: { matchAll: function () { return Promise.resolve([]); }, claim: function () {} },
    skipWaiting: function () {},
    registration: {}
  };
  sandbox.caches = {
    match: function (k) {
      const key = typeof k === 'string' ? k : (k && k.url) || '';
      if (store.has(key)) return Promise.resolve(store.get(key));
      if (store.has('./index.html')) return Promise.resolve(store.get('./index.html'));
      return Promise.resolve(undefined);
    },
    open: function () {
      return Promise.resolve({
        put: function () { return Promise.resolve(); },
        addAll: function () { return Promise.resolve(); },
        match: function () { return Promise.resolve(undefined); }
      });
    },
    keys: function () { return Promise.resolve([]); },
    delete: function () { return Promise.resolve(true); }
  };
  sandbox.fetch = function () { return opts.fetch(); };

  const ctx = vm.createContext(sandbox);
  vm.runInContext(swSrc, ctx, { filename: 'sw.js' });

  async function flush() { for (let i = 0; i < 12; i++) await new Promise(function (r) { setImmediate(r); }); }
  async function advance(ms) {
    const target = now + ms;
    for (;;) {
      let best = null;
      timers.forEach(function (t) {
        if (t.at > target) return;
        if (!best || t.at < best.at || (t.at === best.at && t.id < best.id)) best = t;
      });
      if (!best) break;
      timers.delete(best.id);
      now = best.at;
      try { best.fn(); } catch (e) {}
      await flush();
    }
    now = target;
    await flush();
  }
  return { ctx: ctx, store: store, advance: advance, flush: flush, handlers: handlers, now: function () { return now; } };
}

const REQ = { url: 'https://x.test/index.html', mode: 'navigate', headers: { get: function () { return 'text/html'; } } };
function net200(tag) { const r = new Response(tag, { status: 200 }); r._tag = tag; return r; }

async function run(opts, advanceMs) {
  const E = makeEnv(opts);
  if (opts.cache) {                       // 模擬「玩家之前開過、快取還在」
    const c = new Response('cached', { status: 200 });
    c._tag = 'CACHE';
    E.store.set('./index.html', c);
  }
  let out = null, err = null;
  E.ctx.navFetch(REQ).then(function (r) { out = r; }, function (e) { err = e; });
  await E.flush();
  if (advanceMs) await E.advance(advanceMs);
  await E.flush();
  return { res: out, err: err, env: E, body: out ? await out.text() : '' };
}

(async function () {
  /* A：網路正常 → 立刻回網路回應，且不會等硬上限 */
  {
    const r = await run({ fetch: function () { return Promise.resolve(net200('NET')); } }, 0);
    ok(r.res && r.res._tag === 'NET', 'A 網路正常 → 回網路回應');
    ok(r.env.now() === 0, 'A 沒有等到任何 timer（耗時 0ms）');
  }

  /* B：fetch 失敗 + 無快取 → 喚醒頁 */
  {
    const r = await run({ fetch: function () { return Promise.reject(new Error('ECONNRESET')); } }, 0);
    ok(r.res && r.res.status === 200, 'B fetch 失敗 → 有回東西（不是 reject）');
    ok(r.body.indexOf('伺服器正在喚醒') >= 0, 'B 無快取 → 回喚醒頁');
  }

  /* C：fetch 永遠掛住（模擬假死：TCP 連不上，promise 永不 settle）+ 無快取
        ★ 這是舊版會無限轉圈的那條 */
  {
    const r = await run({ fetch: function () { return new Promise(function () {}); } }, 10000);
    ok(r.res !== null, 'C fetch 掛住 → 10 秒後一定有回應（舊版永不 resolve）');
    ok(r.body.indexOf('伺服器正在喚醒') >= 0, 'C 回的是喚醒頁');
    ok(r.env.now() === 10000, 'C 剛好在硬上限 10 秒觸發（實測 ' + r.env.now() + 'ms）');
  }

  /* C2：只等 9.9 秒還不該回（證明 2.2 秒那層不會誤傷，硬上限也不是亂槍） */
  {
    const r = await run({ fetch: function () { return new Promise(function () {}); } }, 9900);
    ok(r.res === null, 'C2 9.9 秒時還不該有回應（硬上限確實是 10 秒）');
  }

  /* D：fetch 掛住但有快取 → 2.2 秒就給快取，先讓玩家看到畫面 */
  {
    const r = await run({
      fetch: function () { return new Promise(function () {}); },
      cache: true
    }, 2200);
    ok(r.res && r.res._tag === 'CACHE', 'D 有快取 → 2.2 秒回快取（不等硬上限）');
    ok(r.env.now() === 2200, 'D 在 2.2 秒就返回（實測 ' + r.env.now() + 'ms）');
  }

  /* E：伺服器回 503 → 喚醒頁（不要讓瀏覽器丟一張看不懂的錯誤頁） */
  {
    const r = await run({ fetch: function () { return Promise.resolve(new Response('down', { status: 503 })); } }, 0);
    ok(r.body.indexOf('伺服器正在喚醒') >= 0, 'E 5xx → 回喚醒頁');
  }

  /* F：離線 → 講清楚是沒網路，不是主機在睡 */
  {
    const r = await run({ onLine: false, fetch: function () { return new Promise(function () {}); } }, 10000);
    ok(r.body.indexOf('目前沒有網路') >= 0, 'F 離線 → 回「目前沒有網路」');
  }

  /* G：喚醒頁本身要有自動重試，且次數有上限（不會無限刷） */
  {
    const r = await run({ fetch: function () { return new Promise(function () {}); } }, 10000);
    ok(/location\.reload\(\)/.test(r.body) && /n<8/.test(r.body), 'G 喚醒頁會自動重試，且有次數上限');
    ok(/立即重試/.test(r.body), 'G 有手動重試按鈕');
  }

  /* H：SW 的四個事件都還有掛（別把 fetch 監聽弄丟） */
  {
    const E = makeEnv({ fetch: function () { return Promise.resolve(net200('NET')); } });
    ok(!!E.handlers.fetch && E.handlers.fetch.length === 1, 'H fetch 監聽還在');
    ok(!!E.handlers.install && !!E.handlers.activate, 'H install/activate 監聽都在');
  }

  console.log('\n' + (fail ? '❌' : '✅') + ' v5.55：通過 ' + pass + ' / ' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(2); });
