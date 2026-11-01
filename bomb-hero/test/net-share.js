// test/net-share.js —— v4.18 分享拿金幣：端到端（真的起伺服器）
//   ① 遊客不能領（NEED_LOGIN）
//   ② 註冊會員 → prepare 拿一次性 token → claim 拿 1000 金幣
//   ③ 偽造 token / 重放 token / 換平台重放 → 全部擋掉
//   ④ 同一平台只能領一次（ALREADY）
//   ⑤ 每天最多 3 次（DAILY_LIMIT）
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const ROOT = (function () {
  const a = path.join(__dirname, '..');
  const b = path.join(__dirname, '..', '..', 'bomberman-online');
  if (fs.existsSync(path.join(a, 'server.js'))) return a;
  return b;
})();
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'bh-share-'));

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

let BASE = '';
const jar = new Map();
function cookieHeader() {
  const out = [];
  jar.forEach(function (v, k) { out.push(k + '=' + v); });
  return out.join('; ');
}
function keepCookies(res) {
  let list = [];
  if (typeof res.headers.getSetCookie === 'function') list = res.headers.getSetCookie();
  else {
    const raw = res.headers.get('set-cookie');
    if (raw) list = [raw];
  }
  list.forEach(function (c) {
    const first = String(c).split(';')[0];
    const i = first.indexOf('=');
    if (i < 0) return;
    const k = first.slice(0, i).trim(), v = first.slice(i + 1).trim();
    if (/Max-Age=0/i.test(c)) jar.delete(k); else jar.set(k, v);
  });
}
async function api(pathname, opts) {
  const o = Object.assign({ headers: {} }, opts || {});
  o.headers = Object.assign({}, o.headers);
  const ck = cookieHeader();
  if (ck) o.headers.Cookie = ck;
  if (o.body && typeof o.body !== 'string') {
    o.body = JSON.stringify(o.body);
    o.headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(BASE + pathname, o);
  keepCookies(res);
  let json = null;
  try { json = await res.json(); } catch (e) {}
  return { status: res.status, json: json || {} };
}
function startServer(port) {
  const env = Object.assign({}, process.env, {
    PORT: String(port), BH_DATA_DIR: DATA,
    BH_AUTH_SECRET: 'net-share-test-secret', BH_FORCE_HTTPS: '0'
  });
  const p = spawn(process.execPath, ['server.js'], { cwd: ROOT, env: env, stdio: ['ignore', 'pipe', 'pipe'] });
  p.stdout.on('data', function () {});
  p.stderr.on('data', function (d) { const s = String(d); if (s.indexOf('Error') >= 0) console.error('[server]', s.trim()); });
  return p;
}
async function waitUp(port) {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch('http://127.0.0.1:' + port + '/api/health', { signal: AbortSignal.timeout(400) });
      if (r.ok) return true;
    } catch (e) {}
    await sleep(120);
  }
  return false;
}

(async function () {
  const PORT = 3231;
  BASE = 'http://127.0.0.1:' + PORT;
  const srv = startServer(PORT);
  const up = await waitUp(PORT);
  if (!up) { console.log('伺服器起不來'); srv.kill(); process.exit(1); }

  try {
    console.log('\n=== 1. 遊客不能領分享金幣 ===');
    let r = await api('/api/auth/guest', { method: 'POST', body: { deviceId: 'share-guest-device-01' } });
    ok(r.json.ok === true && r.json.account.kind === 'guest', '先建立遊客身分');
    r = await api('/api/share/prepare', { method: 'POST', body: { platform: 'line' } });
    ok(r.status === 403 && r.json.err === 'NEED_LOGIN', '★ 遊客 prepare → 403 NEED_LOGIN');
    r = await api('/api/share/claim', { method: 'POST', body: { platform: 'line', token: 'x' } });
    ok(r.status === 403 && r.json.err === 'NEED_LOGIN', '★ 遊客 claim → 403 NEED_LOGIN');

    console.log('\n=== 2. 註冊會員 ===');
    r = await api('/api/auth/register', { method: 'POST', body: { id: 'shareuser1', pw: 'pass1234', name: '分享測試' } });
    ok(r.json.ok === true && r.json.account.kind === 'member', '註冊成功（member）');
    ok(r.json.account.share && typeof r.json.account.share.claimed === 'object', '帳號資料帶 share 欄位');
    const gold0 = r.json.account.rpg.gold | 0;
    ok(gold0 === 0, '新帳號金幣 0');

    console.log('\n=== 3. 非法平台 / 沒 token ===');
    r = await api('/api/share/prepare', { method: 'POST', body: { platform: 'hack' } });
    ok(r.status === 400 && r.json.err === 'BAD_PLATFORM', '亂填平台 → 400 BAD_PLATFORM');
    r = await api('/api/share/claim', { method: 'POST', body: { platform: 'line', token: '' } });
    ok(r.status === 409 && r.json.err === 'EXPIRED', '沒先 prepare 就 claim → 409 EXPIRED');

    console.log('\n=== 4. 正常流程：prepare → claim ===');
    r = await api('/api/share/prepare', { method: 'POST', body: { platform: 'line' } });
    ok(r.status === 200 && r.json.ok === true, 'prepare 成功');
    ok(typeof r.json.token === 'string' && r.json.token.length === 40, 'token 是 40 碼 HMAC（' + (r.json.token || '').length + '）');
    ok(r.json.reward === 1000, '獎勵 1000');
    ok(r.json.exp > Date.now(), '有到期時間（5 分鐘）');
    const token1 = r.json.token;

    // 偽造 token
    r = await api('/api/share/claim', { method: 'POST', body: { platform: 'line', token: 'a'.repeat(40) } });
    ok(r.status === 409 && r.json.err === 'BAD_TOKEN', '★ 偽造 token → BAD_TOKEN');

    // 正確 token（剛才失敗的 claim 不該把 prep 吃掉？—— 我們的設計：只有驗證成功才清 prep）
    r = await api('/api/share/claim', { method: 'POST', body: { platform: 'line', token: token1 } });
    ok(r.status === 200 && r.json.ok === true, '★ 正確 token → 領到金幣');
    ok(r.json.reward === 1000, '實拿 1000');
    ok((r.json.gold | 0) === 1000, '伺服器金幣 0 → 1000（' + r.json.gold + '）');
    ok(r.json.share.claimed.line > 0, '記錄了 line 已領');
    ok(r.json.share.n === 1, '今日已領次數 = 1');

    console.log('\n=== 5. 重放 / 重複領 ===');
    r = await api('/api/share/claim', { method: 'POST', body: { platform: 'line', token: token1 } });
    ok(r.status === 409 && (r.json.err === 'EXPIRED' || r.json.err === 'ALREADY'),
      '★ 同一個 token 再送一次 → 擋掉（' + r.json.err + '）');
    await sleep(120);
    r = await api('/api/share/prepare', { method: 'POST', body: { platform: 'line' } });
    ok(r.status === 409 && r.json.err === 'ALREADY', '★ 同平台再 prepare → ALREADY');
    r = await api('/api/share/prepare', { method: 'POST', body: { platform: 'fb' } });
    const token2 = r.json.token;
    ok(r.status === 200 && !!token2, '換平台（fb）可以 prepare');

    // 跨平台重放：拿 fb 的 token 去領 line
    r = await api('/api/share/claim', { method: 'POST', body: { platform: 'line', token: token2 } });
    ok(r.status === 409 && (r.json.err === 'BAD_TOKEN' || r.json.err === 'EXPIRED' || r.json.err === 'ALREADY'),
      '★ fb 的 token 拿去領 line → 擋掉（' + r.json.err + '）');

    console.log('\n=== 6. 每日上限 3 次 ===');
    r = await api('/api/share/claim', { method: 'POST', body: { platform: 'fb', token: token2 } });
    ok(r.status === 200 && r.json.ok === true, '第 2 次領取成功（fb）');
    ok((r.json.gold | 0) === 2000, '金幣 2000');
    ok(r.json.share.n === 2, '今日次數 2');
    await sleep(120);
    r = await api('/api/share/prepare', { method: 'POST', body: { platform: 'x' } });
    const token3 = r.json.token;
    r = await api('/api/share/claim', { method: 'POST', body: { platform: 'x', token: token3 } });
    ok(r.status === 200 && (r.json.gold | 0) === 3000, '第 3 次領取成功（x）→ 共 3000');
    await sleep(120);
    r = await api('/api/share/prepare', { method: 'POST', body: { platform: 'wa' } });
    ok(r.status === 429 && r.json.err === 'DAILY_LIMIT', '★ 第 4 次 → 429 DAILY_LIMIT');
    ok(r.json.share.max === 3, '回報每日上限 3');

    console.log('\n=== 7. 重新登入後狀態仍在（存在伺服器）===');
    r = await api('/api/auth/logout', { method: 'POST' });
    ok(r.json.ok === true, '登出');
    r = await api('/api/auth/login', { method: 'POST', body: { id: 'shareuser1', pw: 'pass1234' } });
    ok(r.json.ok === true, '重新登入');
    ok((r.json.account.rpg.gold | 0) === 3000, '金幣還在（3000）');
    ok(r.json.account.share.claimed.line > 0 && r.json.account.share.claimed.x > 0, '已領記錄還在');
    ok(r.json.account.share.n === 3, '今日次數還是 3');

    console.log('\n=== 8. 資料真的落地 ===');
    const files = fs.readdirSync(DATA);
    ok(files.length > 0, '資料目錄有檔案（' + files.join(',') + '）');
    const blob = files.map(function (f) {
      try { return fs.readFileSync(path.join(DATA, f), 'utf8'); } catch (e) { return ''; }
    }).join('');
    ok(blob.indexOf('"share"') >= 0 || blob.indexOf('claimed') >= 0, '★ 分享記錄寫進伺服器檔案（重啟也不會重置）');
  } catch (e) {
    fail++;
    console.log('  ✗ 例外：' + e.message);
  } finally {
    srv.kill();
  }

  console.log('\n----------------------------------------');
  console.log('net-share：' + pass + ' 通過 / ' + fail + ' 失敗');
  process.exit(fail ? 1 : 0);
})();
