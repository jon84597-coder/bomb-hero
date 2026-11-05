// v5.12 驗證（線上 hotfix）：
//   v5.11 把 fixAccountIds() 寫進 Cloud 建構函式，但呼叫它的 applyPart()/loadLocal() 在 createStore() 裡
//   → ReferenceError → loadRemote 的 catch → state.loaded 永遠 false
//   → **雲端存檔整條斷掉**（前端因 loaded=false 拒絕寫回、後台載入不了遠端分片）。
//   線上 /api/health 實際回：storageError: "fixAccountIds is not defined"
//
//   教訓：這種「同一個檔、只是 scope 不對」的錯，grep/正則斷言抓不到（字串都在），
//   一定要**真的跑一次 createStore 的遠端載入流程**。
// 跑法：node test/verify-v512.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const cloudMod = require('../../cloud.js');

let pass = 0, fail = 0;
function ok(cond, msg, extra) {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ FAIL: ' + msg + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}
function head(s) { console.log('\n' + s); }

const src = fs.readFileSync(path.join(__dirname, '..', '..', 'cloud.js'), 'utf8');

// 假的 Supabase REST：GET 回分片、其他回成功
function makeFetch(rows) {
  const calls = [];
  function res(obj) {
    return { ok: true, status: 200, json: () => Promise.resolve(obj), text: () => Promise.resolve(JSON.stringify(obj)) };
  }
  const fn = function (url, o) {
    const method = (o && o.method) || 'GET';
    calls.push(method + ' ' + url);
    if (method === 'GET') return Promise.resolve(res(rows));
    return Promise.resolve(res({}));
  };
  fn.calls = calls;
  return fn;
}

(async function main() {
  head('① 原始碼：fixAccountIds 必須和呼叫端同一個 scope（createStore 內）');
  const iStore = src.indexOf('function createStore(');
  const iCloud = src.indexOf('function createCloud(');
  const iDef = src.indexOf('function fixAccountIds(');
  ok(iStore > 0 && iCloud > iStore, 'createStore 在 createCloud 之前');
  ok(iDef > iStore && iDef < iCloud, 'fixAccountIds 定義在 createStore 之內、createCloud 之外', iDef);
  // 定義之後才呼叫（hoist 以內都算安全，但只要同 scope 就好；這裡確認沒有第二個定義）
  ok((src.match(/function fixAccountIds\(/g) || []).length === 1, '全檔只有一個 fixAccountIds 定義');
  ok(/applyPart[\s\S]{0,600}fixAccountIds\(\)/.test(src), 'applyPart 內有呼叫');
  ok(/loadLocal[\s\S]{0,900}fixAccountIds\(\)/.test(src), 'loadLocal 內有呼叫');
  // 舊帳號缺 id 的修補要用物件鍵當權威，不能再依賴 Cloud 內的 findById
  const defBody = src.slice(iDef, src.indexOf('\n  }', iDef));
  ok(/db\.accounts\[key\]/.test(defBody), '用物件鍵（db.accounts[key]）補 id');
  ok(!/findById\(/.test(defBody), '不再呼叫 Cloud 內的 findById（那支在這裡看不到）');

  head('② 真的跑一次遠端載入（v5.11 的錯就死在這裡）');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bh-v512-'));
  const rows = [
    { key: 'meta', val: { v: 1, tamper: 0, created: 1, announce: null, sec: 'SEC123' } },
    { key: 'accounts', val: { accounts: { u1: { key: 'web:u1', kind: 'guest', nick: '甲' }, u2: { id: 'u2', key: 'web:u2' } }, devices: { d1: 'u1' } } },
    { key: 'lb', val: { v: 1, days: { '2026-11-05': { daily: [{ n: 1 }] } } } }
  ];
  const fetchFake = makeFetch(rows);
  let cloud = null, err = null;
  try {
    cloud = cloudMod.createCloud({
      dir: dir,
      persist: true,
      env: { BH_SUPABASE_URL: 'https://example.supabase.co', BH_SUPABASE_KEY: 'sb_secret_testkey' },
      fetch: fetchFake
    });
    await cloud.ready;
  } catch (e) { err = e; }

  ok(!err, '建立＋載入不拋錯', err && String(err.message || err));
  ok(!!cloud, '拿得到 store');
  if (cloud) {
    ok(cloud.storage.loaded === true, 'state.loaded === true（可以寫回遠端）', cloud.storage);
    ok(!cloud.storage.lastError, 'state.lastError 是空的', cloud.storage.lastError);
    ok(cloud.storage.mode === 'supabase', 'mode 是 supabase', cloud.storage.mode);
    ok((cloud.storage.parts || []).indexOf('accounts') >= 0, '有套用到 accounts 分片', cloud.storage.parts);
    ok(cloud.db.accounts.u1 && cloud.db.accounts.u1.id === 'u1', '舊帳號 u1 補上了 id', cloud.db.accounts.u1);
    ok(cloud.db.accounts.u2 && cloud.db.accounts.u2.id === 'u2', '本來就有 id 的 u2 沒被動到', cloud.db.accounts.u2);
    ok(cloud.db.devices && cloud.db.devices.d1 === 'u1', 'devices 一起載入');
    ok(fetchFake.calls.some(s => s.indexOf('/rest/v1/bh_kv') >= 0), '真的打了 Supabase REST', fetchFake.calls);

    head('③ 載入後寫入要能推上去（loaded 為真才不 skip）');
    const before = cloud.storage.skipped;
    cloud._internals.store.touch();
    await new Promise(r => setTimeout(r, 700));
    ok(cloud.storage.skipped === before, 'pushRemote 沒有被 skip', { skipped: cloud.storage.skipped, before: before });
  }

  head('④ 回歸：遠端掛掉時仍然保護雲端（loaded=false、不寫回）');
  const dir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'bh-v512b-'));
  const badFetch = function () { return Promise.resolve({ ok: false, status: 401, text: () => Promise.resolve('Invalid API key'), json: () => Promise.resolve({}) }); };
  let c2 = null;
  try {
    c2 = cloudMod.createCloud({
      dir: dir2, persist: true,
      env: { BH_SUPABASE_URL: 'https://example.supabase.co', BH_SUPABASE_KEY: 'sb_secret_bad' },
      fetch: badFetch
    });
    await c2.ready;
  } catch (e) {}
  if (c2) {
    ok(c2.storage.loaded === false, '載入失敗時 loaded 保持 false');
    ok(!!c2.storage.lastError, '有記錄錯誤原因', c2.storage.lastError);
    const sk = c2.storage.skipped;
    c2._internals.store.touch();
    await new Promise(r => setTimeout(r, 400));
    ok(c2.storage.skipped > sk, 'loaded=false 時 pushRemote 直接 skip（不會蓋掉雲端）', { skipped: c2.storage.skipped, before: sk });
  } else ok(false, '建立 store（壞 key 情境）');

  console.log('\n' + (fail ? '❌ ' + fail + ' 失敗 / ' + pass + ' 通過' : '✅ 全部通過 / ' + pass + ' 項通過'));
  process.exit(fail ? 1 : 0);
})();
