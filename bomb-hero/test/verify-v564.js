// test/verify-v564.js —— v5.64：登入／登出問題的根因修正
//   ① 重複識別鍵：同一個帳號名有兩筆時，要用「密碼對得上的那一筆」登入
//      （舊版只取第一筆 → 密碼明明正確卻一直說帳號或密碼錯誤）
//   ② 只有第三方登入的帳號 → 回 NEED_OAUTH 並帶出提供者，而不是「密碼錯誤」
//   ③ 帶著失效 cookie 進來 → /api/auth/guest 回 expired:true（前端才能說「登入已過期」）
//   ④ /api/auth/me 滑動續期：快到期就重發 cookie，玩得久不會被登出
//   ⑤ 真的密碼錯仍然是 BAD_LOGIN，而且統計分得出「查無帳號」與「密碼不符」
//   ⑥ 前端：連線類錯誤不再冒充「帳號或密碼錯誤」＋冷啟動自動重試
//   ⑦ 字典六語言
//
// 這一支直接跑 cloud.js 的 handle（用假的 req/res），不是正則比對 —— 這種邏輯
// 用正則是驗不出來的。
const fs = require('fs');
const path = require('path');
const os = require('os');
const EventEmitter = require('events');

const ROOT = path.join(__dirname, '..');
const CLOUD = require(path.join(ROOT, '..', 'cloud.js'));
const mainSrc = fs.readFileSync(path.join(ROOT, 'js/main.js'), 'utf8');
const i18nSrc = fs.readFileSync(path.join(ROOT, 'js/i18n-src.js'), 'utf8');

let pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('  ✗ FAIL: ' + m); } }
function sec(n) { console.log('\n=== ' + n + ' ==='); }

const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'bh564-'));
const SECRET = 'test-secret-564';

function makeReq(method, headers, body) {
  const req = new EventEmitter();
  req.method = method;
  req.headers = headers || {};
  req.socket = { remoteAddress: '127.0.0.1' };
  req.destroy = function () {};
  process.nextTick(function () {
    if (body !== undefined) req.emit('data', Buffer.from(JSON.stringify(body)));
    req.emit('end');
  });
  return req;
}
function makeRes() {
  const res = { code: 0, headers: {}, body: '' };
  res.setHeader = function (k, v) { res.headers[String(k).toLowerCase()] = v; };
  res.getHeader = function (k) { return res.headers[String(k).toLowerCase()]; };
  res.writeHead = function (code, h) {
    res.code = code;
    Object.keys(h || {}).forEach(function (k) { res.headers[k.toLowerCase()] = h[k]; });
  };
  res.end = function (t) { res.body = String(t || ''); };
  return res;
}
function cookieOf(res) {
  const sc = res.headers['set-cookie'];
  const arr = Array.isArray(sc) ? sc : (sc ? [sc] : []);
  const out = [];
  arr.forEach(function (s) {
    const m = String(s).match(/^[^=]+=([^;]*)/);
    if (m) out.push(decodeURIComponent(m[1]));
  });
  return out;
}

let ipN = 0;
function ip() { ipN++; return '10.0.' + (ipN % 250) + '.' + (ipN % 200); }

async function call(cloud, method, p, body, extraHeaders) {
  const headers = Object.assign({ 'x-forwarded-proto': 'https', 'x-forwarded-for': ip() }, extraHeaders || {});
  const req = makeReq(method, headers, body);
  const res = makeRes();
  const url = new URL('https://x' + p);
  await cloud.handle(req, res, url);
  let json = null;
  try { json = JSON.parse(res.body); } catch (e) {}
  return { code: res.code, json: json, res: res, cookie: cookieOf(res) };
}

(async function () {
  const cloud = CLOUD.createCloud({ dir: DIR, persist: true, secret: SECRET, env: {} });
  await cloud.ready;

  /* ---------------- ① 基本註冊／登入 ---------------- */
  sec('① 註冊與登入（基準）');
  let r = await call(cloud, 'POST', '/api/auth/register', { id: 'kid01', pw: 'abc12345', name: '小明' });
  ok(r.code === 200 && r.json && r.json.ok, '註冊成功');
  const uid1 = r.json && r.json.account && r.json.account.id;
  ok(!!uid1, '回傳帳號 id');
  const tok1 = r.cookie[r.cookie.length - 1];
  ok(!!tok1, '註冊後直接發 session cookie');

  r = await call(cloud, 'POST', '/api/auth/login', { id: 'KID01', pw: 'abc12345' });
  ok(r.code === 200 && r.json && r.json.ok, '大小寫不同也能登入（伺服器統一小寫）');

  r = await call(cloud, 'POST', '/api/auth/login', { id: 'kid01', pw: 'wrong9999' });
  ok(r.code === 401 && r.json.err === 'BAD_LOGIN', '密碼錯 → BAD_LOGIN');

  /* ---------------- ② 重複識別鍵（本次核心修復） ---------------- */
  sec('② 重複識別鍵：密碼對得上的那一筆才該被選到');
  const internals = cloud._internals;
  const acc1 = internals.findById(uid1);
  const pw2 = await internals.hashPassword('zzz99999');
  /* 造一筆「比較晚建、但 lastSeen 比較舊」的同名帳號 —— 舊版會因為迴圈順序永遠選到它 */
  const dup = internals.createAccount('member', {
    provider: 'web', key: 'web:kid01', username: 'kid01', email: '', name: '小明(舊)'
  });
  dup.pass = pw2;
  dup.lastSeen = 1;
  ok(acc1 && acc1.key === dup.key, '兩筆帳號的識別鍵相同');

  r = await call(cloud, 'POST', '/api/auth/login', { id: 'kid01', pw: 'abc12345' });
  ok(r.code === 200 && r.json && r.json.ok, '用第一筆的密碼登入仍然成功');
  ok(r.json && r.json.account && r.json.account.id === uid1, '而且回傳的是第一筆帳號');

  r = await call(cloud, 'POST', '/api/auth/login', { id: 'kid01', pw: 'zzz99999' });
  ok(r.code === 200 && r.json && r.json.ok, '★ 用第二筆的密碼也能登入（舊版會一直說密碼錯）');
  ok(r.json && r.json.account && r.json.account.id === dup.id, '回傳的是密碼對得上的那一筆');

  r = await call(cloud, 'POST', '/api/auth/login', { id: 'kid01', pw: 'nope1234' });
  ok(r.code === 401 && r.json.err === 'BAD_LOGIN', '兩筆都不對 → 仍然是 BAD_LOGIN');

  /* ---------------- ③ 只有第三方登入的帳號 ---------------- */
  sec('③ 只有第三方登入的帳號 → 說清楚要用哪個按鈕');
  const oa = internals.createAccount('member', {
    provider: 'google', sub: 'g-123', key: 'google:g-123', name: 'OAuth 玩家', email: 'o@x.com'
  });
  oa.pass = null;
  r = await call(cloud, 'POST', '/api/auth/login', { id: 'o@x.com', pw: 'abc12345' });
  ok(r.code === 401, '登入失敗');
  ok(r.json && r.json.err === 'NEED_OAUTH', '★ 回 NEED_OAUTH 而不是 BAD_LOGIN');
  ok(r.json && /Google/.test(String(r.json.provider)), '帶出提供者名稱（Google）');

  /* ---------------- ④ 失效 cookie → expired ---------------- */
  sec('④ 帶著失效 cookie 進來：要說「你被登出了」');
  r = await call(cloud, 'POST', '/api/auth/guest',
    { deviceId: 'device-abcdefgh' }, { cookie: 'bh_sid=garbage.token.sig' });
  ok(r.code === 200 && r.json && r.json.ok, '仍然給一個遊客身分（遊戲進得去）');
  ok(r.json && r.json.expired === true, '★ expired:true（前端才能提示要重新登入）');
  ok(!!r.cookie[r.cookie.length - 1], '順便把失效 cookie 換掉');

  r = await call(cloud, 'POST', '/api/auth/guest', { deviceId: 'device-abcdefgh' });
  ok(r.json && r.json.expired === false, '沒帶 cookie 的新玩家不會被誤報「登出」');

  /* ---------------- ⑤ 滑動續期 ---------------- */
  sec('⑤ /api/auth/me 滑動續期：常玩的人不該因為 30 天到期被登出');
  const fresh = CLOUD.makeToken(SECRET, uid1);                 // 30 天
  r = await call(cloud, 'GET', '/api/auth/me', undefined, { cookie: 'bh_sid=' + fresh });
  ok(r.code === 200 && r.json.account && r.json.account.id === uid1, '有效 cookie → 認得出來');
  ok(!r.res.headers['set-cookie'], '剛發的 cookie 不會被重發（省流量）');

  const nearly = CLOUD.makeToken(SECRET, uid1, 60 * 1000);     // 剩 1 分鐘
  r = await call(cloud, 'GET', '/api/auth/me', undefined, { cookie: 'bh_sid=' + nearly });
  ok(r.code === 200 && r.json.account && r.json.account.id === uid1, '快到期仍然認得出來');
  ok(!!r.res.headers['set-cookie'], '★ 快到期 → 重發 cookie（續期）');
  const renewed = r.cookie[r.cookie.length - 1];
  const rt = CLOUD.readToken(SECRET, renewed);
  ok(rt && rt.exp - Date.now() > 29 * 24 * 3600 * 1000, '續期後效期回到 30 天');

  /* ---------------- ⑥ 統計分得出病因 ---------------- */
  sec('⑥ /api/health 的登入健檢數字');
  const st = cloud.stats();
  ok(st.authNoAcc >= 1, 'authNoAcc 有計數（查無帳號）');
  ok(st.authBadPw >= 1, 'authBadPw 有計數（密碼不符）');
  ok(st.dupKey >= 1, 'dupKey 有計數（發現重複帳號）');
  ok(st.sessionsExpired >= 1, 'sessionsExpired 有計數（有人被登出）');
  ok(st.sessionsRenewed >= 1, 'sessionsRenewed 有計數（續期過）');

  /* ---------------- ⑦ 鎖定仍然有效 ---------------- */
  sec('⑦ 連續錯 5 次仍然會鎖（安全性不能被改壞）');
  await call(cloud, 'POST', '/api/auth/register', { id: 'kid02', pw: 'abc12345', name: '小華' });
  let last = null;
  for (let i = 0; i < 5; i++) last = await call(cloud, 'POST', '/api/auth/login', { id: 'kid02', pw: 'bad' + i + 'xxxx' });
  ok(last.code === 401, '前 5 次是 401');
  const locked = await call(cloud, 'POST', '/api/auth/login', { id: 'kid02', pw: 'abc12345' });
  ok(locked.code === 423 && locked.json.err === 'LOCKED', '第 6 次（即使密碼正確）回 423 LOCKED');
  ok(locked.json.retry > 0, '帶出還要等幾秒');

  /* ---------------- ⑧ 前端：錯誤訊息不再冒充密碼錯 ---------------- */
  sec('⑧ 前端訊息與冷啟動重試');
  ok(/function authPost\(/.test(mainSrc), '有 authPost 冷啟動重試');
  ok(/authPost\('\/api\/auth\/login'/.test(mainSrc), '登入走 authPost');
  ok(/authPost\('\/api\/auth\/register'/.test(mainSrc), '註冊也走 authPost');
  ok(/r\.err === 'NET' \|\| r\.err === 'OFFLINE'/.test(mainSrc), '只對連線類錯誤重試');
  ok(/else say\(t\('web\.errNet'\)\);/.test(mainSrc), '★ 未知錯誤不再說「帳號或密碼錯誤」');
  ok(/NEED_OAUTH/.test(mainSrc), '前端認得 NEED_OAUTH');
  ok(/function clearPw\(/.test(mainSrc), '密碼錯會清掉輸入框（避免舊密碼＋新字）');
  ok(/onfocus="this\.select\(\)"/.test(mainSrc), '填回的密碼點進去先全選');
  ok(/g\.expired/.test(mainSrc), '前端會處理 expired');
  ok(/function meStep\(/.test(mainSrc), '★ /api/auth/me 失敗會先重試再降級成遊客');

  sec('⑨ 字典六語言');
  ['web.errNet', 'web.waking', 'acct.expired'].forEach(function (k) {
    const line = i18nSrc.split('\n').filter(function (l) { return l.indexOf(k + '|') === 0; })[0];
    ok(!!line, k + ' 存在');
    ok(!!line && line.split('|').length === 6, k + ' 有六個語言欄位');
  });

  /* ---------------- 收尾 ---------------- */
  sec('⑩ 後端統計欄位有真正接出去');
  const health = fs.readFileSync(path.join(ROOT, '..', 'server.js'), 'utf8');
  ok(/auth:\s*\{/.test(health), '/api/health 有 auth 區塊');
  ok(/noAcc:\s*cs\.authNoAcc/.test(health), 'health 帶 noAcc');
  ok(/dupKey:\s*cs\.dupKey/.test(health), 'health 帶 dupKey');

  try { fs.rmSync(DIR, { recursive: true, force: true }); } catch (e) {}
  console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + ' 通過 / ' + fail + ' 失敗');
  process.exit(fail ? 1 : 0);
})().catch(function (e) {
  console.log('\n💥 例外：' + (e && e.stack || e));
  try { fs.rmSync(DIR, { recursive: true, force: true }); } catch (e2) {}
  process.exit(1);
});
