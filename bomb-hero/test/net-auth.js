// 端到端測試 v4.2：帳號 / 遊客 / 配點 / 存檔簽章 / 限流 / HTTPS（需要真的起伺服器）
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// 目錄結構有兩種：本機開發（bomb-hero/test → ../../bomberman-online）與
// 匯出後的專案根目錄（server.js 就在 test/ 上一層）—— 兩邊都要能跑。
const ROOT = (function () {
  const a = path.join(__dirname, '..');
  const b = path.join(__dirname, '..', '..', 'bomberman-online');
  if (fs.existsSync(path.join(a, 'server.js'))) return a;
  return b;
})();
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'bh-cloud-'));

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
    const k = first.slice(0, i).trim();
    const v = first.slice(i + 1).trim();
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
  return { status: res.status, json: json, headers: res.headers };
}
function startServer(port, extraEnv) {
  const env = Object.assign({}, process.env, {
    PORT: String(port),
    BH_DATA_DIR: DATA,
    BH_AUTH_SECRET: 'net-auth-test-secret',
    BH_FORCE_HTTPS: '0'
  }, extraEnv || {});
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
  const PORT = 3211;
  BASE = 'http://127.0.0.1:' + PORT;
  const srv = startServer(PORT, {});
  const up = await waitUp(PORT);
  if (!up) { console.log('伺服器起不來'); process.exit(1); }

  console.log('\n=== 1. 健康檢查與安全標頭 ===');
  let r = await api('/api/health');
  ok(r.status === 200 && r.json.ok, '/api/health 正常');
  ok(typeof r.json.accounts === 'number', 'health 會回報帳號數');
  ok(r.headers.get('x-content-type-options') === 'nosniff', '有 X-Content-Type-Options: nosniff');
  ok(r.headers.get('referrer-policy') === 'strict-origin-when-cross-origin', '有 Referrer-Policy');
  ok(r.headers.get('x-frame-options') === 'SAMEORIGIN', '有 X-Frame-Options');

  console.log('\n=== 2. 登入設定 ===');
  r = await api('/api/auth/config');
  ok(r.status === 200 && r.json.providers.google && r.json.providers.facebook, 'config 回報 Google / Facebook');
  ok(r.json.providers.google.on === false, '沒設環境變數時 Google = 未啟用');

  console.log('\n=== 3. 遊客自動身分（Device ID）===');
  r = await api('/api/auth/me');
  ok(r.status === 200 && r.json.guest === true && r.json.account === null, '還沒建身分前是「無帳號」');
  r = await api('/api/auth/guest', { method: 'POST', body: { deviceId: 'device-abcdef-0001' } });
  ok(r.status === 200 && r.json.ok, '建立遊客身分成功');
  const guestId = r.json.account.id;
  ok(guestId.indexOf('g_') === 0, '帳號 id 是遊客前綴（g_）');
  ok(jar.has('bh_sid'), '拿到 HttpOnly session cookie');
  ok(r.json.account.rpg.alloc.hp === 3 && r.json.account.points === 9, '遊客初始 9 點、預設配點');
  ok(r.json.account.save && r.json.account.save.sig, '回傳伺服器簽章的存檔信封');

  r = await api('/api/auth/guest', { method: 'POST', body: { deviceId: 'device-abcdef-0001' } });
  ok(r.json.account.id === guestId, '同一台裝置重進 → 同一個遊客帳號（進度不會掉）');
  r = await api('/api/auth/guest', { method: 'POST', body: { deviceId: 'x' } });
  ok(r.status === 400 && r.json.err === 'BAD_DEVICE', '裝置 id 太短 → 擋掉');

  console.log('\n=== 4. 配點只有後端能改 ===');
  r = await api('/api/rpg/spend', { method: 'POST', body: { attr: 'hp' } });
  ok(r.status === 409 && r.json.err === 'NO_POINTS', '9 點用完再加點 → 409 NO_POINTS');
  r = await api('/api/rpg/spend', { method: 'POST', body: { attr: 'hp', delta: -1 } });
  ok(r.status === 200 && r.json.account.rpg.alloc.hp === 2 && r.json.left === 1, '退 1 點 → 伺服器回新狀態');
  r = await api('/api/rpg/spend', { method: 'POST', body: { attr: 'hp', delta: 1 } });
  ok(r.json.account.rpg.alloc.hp === 3 && r.json.left === 0, '加回來 → 回到 9 點');
  r = await api('/api/rpg/spend', { method: 'POST', body: { attr: 'hp', delta: 1, points: 999 } });
  ok(r.status === 409, '前端偷塞 points 參數沒有用（伺服器不採信）');
  r = await api('/api/rpg/spend', { method: 'POST', body: { attr: 'nope' } });
  ok(r.status === 409 && r.json.err === 'BAD_ATTR', '非法屬性被擋');

  console.log('\n=== 5. 關卡解鎖順序 ===');
  r = await api('/api/rpg/stage-clear', { method: 'POST', body: { stage: 2 } });
  ok(r.status === 409 && r.json.err === 'STAGE_LOCKED', '跳打第 2 關 → 擋掉');
  r = await api('/api/rpg/stage-clear', { method: 'POST', body: { stage: 1 } });
  ok(r.status === 200 && r.json.account.rpg.cleared === 1, '打第 1 關 → cleared=1');
  ok(r.json.account.rpg.gold === 40, '金幣由後端給（40）');
  ok(r.json.unlocked === 2, '解鎖第 2 關');
  r = await api('/api/rpg/stage-clear', { method: 'POST', body: { stage: 1 } });
  ok(r.status === 200 && r.json.replay === true && r.json.account.rpg.gold === 40, '重打舊關不重複給金幣');
  await sleep(1200);   // 等限流額度補回來（過關 API 也有防刷）
  r = await api('/api/rpg/stage-clear', { method: 'POST', body: { stage: 99 } });
  ok(r.status === 409 && r.json.err === 'BAD_STAGE', '第 99 關 → 擋掉');

  console.log('\n=== 6. 存檔簽章（HMAC）===');
  r = await api('/api/rpg/state');
  const save = r.json.account.save;
  ok(r.status === 200 && !!save.sig, '取得已簽章存檔');
  let good = await api('/api/rpg/sync', { method: 'POST', body: save });
  ok(good.status === 200 && good.json.ok, '原封不動上傳 → 接受');
  const bad = JSON.parse(JSON.stringify(save));
  bad.payload.rpg.gold = 999999;
  let tb = await api('/api/rpg/sync', { method: 'POST', body: bad });
  ok(tb.status === 409 && tb.json.err === 'SAVE_TAMPERED', '改金幣 → SAVE_TAMPERED');
  const bad2 = JSON.parse(JSON.stringify(save));
  bad2.payload.uid = 'g_hacker';
  tb = await api('/api/rpg/sync', { method: 'POST', body: bad2 });
  ok(tb.status === 409, '改帳號 id → 擋掉');
  r = await api('/api/health');
  ok(r.json.tamper >= 1, 'health 會累計 tamper 次數（' + r.json.tamper + '）');

  console.log('\n=== 7. 頻率限制（存檔 1 次/秒）===');
  await sleep(1600);   // 先讓存檔額度補滿，才能驗「第一次可以、之後被擋」
  const codes = [];
  for (let i = 0; i < 6; i++) {
    const rr = await api('/api/rpg/sync', { method: 'POST', body: save });
    codes.push(rr.status);
    if (rr.status === 429) {
      ok(rr.json.err === 'RATE_LIMIT' && Number(rr.headers.get('retry-after')) >= 1, '429 會帶 Retry-After');
    }
  }
  ok(codes.indexOf(429) > 0, '連續存檔會被限流（' + codes.join(',') + '）');
  ok(codes[0] === 200, '第一次存檔是允許的');

  console.log('\n=== 7b. 觸控版面（v4.2）===');
  await sleep(1200);
  r = await api('/api/rpg/layout', { method: 'POST', body: { layout: { mode: 'stick', side: 'right', act: 'left', size: 1.2, pad: { x: 0.25, y: 0.75 } } } });
  ok(r.status === 200 && r.json.ok, '可以存觸控版面');
  ok(r.json.layout && r.json.layout.mode === 'stick', '回傳清洗後的版面（mode=stick）');
  ok(r.json.account && r.json.account.layout && r.json.account.layout.pad.x === 0.25, '帳號資料裡帶著版面');
  r = await api('/api/rpg/state');
  ok(r.json.account.layout && r.json.account.layout.size === 1.2, '重讀仍拿得到版面');
  r = await api('/api/rpg/layout', { method: 'POST', body: { layout: { mode: 'hack', size: 999, pad: { x: -5, y: 5 } } } });
  ok(r.status === 200 && r.json.layout.mode === 'slide', '亂填 mode → 退回 slide');
  ok(r.json.layout.size === 1.6 && r.json.layout.pad.x === 0 && r.json.layout.pad.y === 1, '亂填數字 → 夾回合法範圍');
  r = await api('/api/rpg/layout', { method: 'POST', body: { layout: null } });
  ok(r.status === 200 && r.json.layout === null, '送 null 可以清掉版面');
  r = await api('/api/rpg/layout', { method: 'POST', body: '{oops', headers: { 'Content-Type': 'application/json' } });
  ok(r.status === 400 && r.json.err === 'BAD_BODY', '爛 body → 400');
  for (let i = 0; i < 8; i++) r = await api('/api/rpg/layout', { method: 'POST', body: { layout: {} } });
  ok(r.status === 429, '版面 API 也有限流（' + r.status + '）');
  await sleep(1200);

  console.log('\n=== 8. 登出 ===');
  r = await api('/api/auth/logout', { method: 'POST' });
  ok(r.status === 200, '登出成功');
  r = await api('/api/auth/me');
  ok(r.json.account === null, '登出後沒有帳號');
  r = await api('/api/rpg/state');
  ok(r.status === 401, '沒有 session 不能讀雲端存檔');

  console.log('\n=== 9. 傳統帳密註冊／登入（v4.3） ===');
  r = await api('/api/auth/register', { method: 'POST', body: { id: 'ab', pw: 'abc12345' } });
  ok(r.status === 400 && r.json.err === 'BAD_USER', '帳號太短 → 400 BAD_USER');
  r = await api('/api/auth/register', { method: 'POST', body: { id: 'bad name', pw: 'abc12345' } });
  ok(r.status === 400 && r.json.err === 'BAD_USER', '帳號含空白 → 400 BAD_USER');
  r = await api('/api/auth/register', { method: 'POST', body: { id: 'e2e@test.com', pw: '123' } });
  ok(r.status === 400 && r.json.err === 'PW_SHORT', '密碼太短 → 400 PW_SHORT');
  r = await api('/api/auth/register', { method: 'POST', body: { id: 'e2e@test.com', pw: 'abcdefgh' } });
  ok(r.status === 400 && r.json.err === 'PW_NEED_DIGIT', '純字母密碼 → 400 PW_NEED_DIGIT');

  await sleep(600);
  r = await api('/api/auth/register', { method: 'POST', body: { id: 'e2e@test.com', pw: 'Passw0rd123' } });
  ok(r.status === 200 && r.json.ok, '註冊成功（200）');
  ok(r.json.account && r.json.account.email === 'e2e@test.com', '回傳的帳號就是剛註冊的 Email');
  ok(r.json.account.kind === 'member' && r.json.account.hasPass === true, 'kind=member、hasPass=true');
  ok(r.json.account.unlocked === 1, '新帳號只開到第 1 關');
  ok(!/Passw0rd123/.test(JSON.stringify(r.json)), '回應裡沒有明文密碼');
  ok(/bh_sid/.test(cookieHeader()), '發了 session cookie（bh_sid）');
  const setCk = r.headers.getSetCookie ? r.headers.getSetCookie().join('|') : (r.headers.get('set-cookie') || '');
  ok(/HttpOnly/i.test(setCk), 'cookie 是 HttpOnly（JS 讀不到）');

  await sleep(600);
  r = await api('/api/auth/register', { method: 'POST', body: { id: 'E2E@Test.com', pw: 'Passw0rd123' } });
  ok(r.status === 409 && r.json.err === 'ID_TAKEN', '同帳號再註冊（大小寫不同）→ 409 ID_TAKEN');

  // 通關 → 進度進帳號
  await sleep(400);
  r = await api('/api/rpg/stage-clear', { method: 'POST', body: { stage: 1 } });
  ok(r.status === 200 && r.json.account.rpg.cleared === 1, '第 1 關通關存進帳號');
  await sleep(700);
  r = await api('/api/rpg/stage-clear', { method: 'POST', body: { stage: 3 } });
  ok(r.json && r.json.ok === false, '不能跳關（3 > 2）→ 被擋');

  // 登出 → 錯密碼 → 對密碼
  await api('/api/auth/logout', { method: 'POST' });
  await sleep(300);
  r = await api('/api/auth/login', { method: 'POST', body: { id: 'e2e@test.com', pw: 'wrongpass1' } });
  ok(r.status === 401 && r.json.err === 'BAD_LOGIN', '密碼錯 → 401 BAD_LOGIN');
  r = await api('/api/auth/login', { method: 'POST', body: { id: 'nobody@test.com', pw: 'wrongpass1' } });
  ok(r.status === 401 && r.json.err === 'BAD_LOGIN', '帳號不存在也回同一個錯誤（不洩漏帳號是否存在）');
  r = await api('/api/auth/login', { method: 'POST', body: { id: 'E2E@test.com', pw: 'Passw0rd123' } });
  ok(r.status === 200 && r.json.ok, '大小寫不敏感的帳號也能登入');
  ok(r.json.account.rpg.cleared === 1, '登入後進度還在（1 關）');
  ok((r.json.account.logins | 0) >= 1, '有累計登入次數（' + r.json.account.logins + '）');

  // 改密碼
  r = await api('/api/auth/password', { method: 'POST', body: { old: 'nope12345', pw: 'NewPassw0rd9' } });
  ok(r.status === 401 || (r.json && r.json.ok === false), '舊密碼錯 → 不給改');
  await sleep(300);
  r = await api('/api/auth/password', { method: 'POST', body: { old: 'Passw0rd123', pw: 'NewPassw0rd9' } });
  ok(r.status === 200 && r.json.ok, '舊密碼正確 → 改密碼成功');
  await api('/api/auth/logout', { method: 'POST' });
  await sleep(300);
  r = await api('/api/auth/login', { method: 'POST', body: { id: 'e2e@test.com', pw: 'Passw0rd123' } });
  ok(r.status === 401, '舊密碼已失效');
  r = await api('/api/auth/login', { method: 'POST', body: { id: 'e2e@test.com', pw: 'NewPassw0rd9' } });
  ok(r.status === 200 && r.json.ok, '新密碼可以登入');

  console.log('\n=== 9b. 開發者帳號與後台（v4.3） ===');
  r = await api('/api/admin/overview');
  ok(r.status === 403, '一般會員打後台 → 403');
  await api('/api/auth/logout', { method: 'POST' });
  await sleep(700);
  r = await api('/api/auth/register', { method: 'POST', body: { id: 'jon84597@gmail.com', pw: 'DevPass8899' } });
  ok(r.status === 200 && r.json.account.dev === true, '白名單帳號一註冊就被標記 dev');
  ok(r.json.account.tier === 'developer', 'tier = developer');
  ok(r.json.account.unlocked === 32, '開發者 RPG 全 32 關解鎖');
  await sleep(400);
  r = await api('/api/rpg/stage-clear', { method: 'POST', body: { stage: 20 } });
  ok(r.status === 200 && r.json.account.rpg.cleared === 20, '開發者可以直接跳第 20 關（豁免循序解鎖）');

  r = await api('/api/admin/overview');
  ok(r.status === 200 && r.json.ok && Array.isArray(r.json.accounts), '後台拿得到會員名單');
  ok(r.json.stats.devs >= 1 && r.json.stats.members >= 2, '統計：開發者 ' + r.json.stats.devs + '、會員 ' + r.json.stats.members);
  ok(r.json.devEmails.indexOf('jon84597@gmail.com') >= 0, '名單帶回開發者白名單');
  const me = (r.json.accounts || []).filter(function (a) { return a.email === 'jon84597@gmail.com'; })[0] || {};
  ok(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(me.createdStr || ''), '加入時間精確到秒（' + me.createdStr + '）');
  ok(me.firstIp === '127.0.0.1' || me.ip === '127.0.0.1', '有記註冊 IP（' + (me.firstIp || me.ip) + '）');
  ok(me.provider === 'web', '來源記為 web（傳統帳密）');
  ok(me.hasPass === true, '名單看得出有沒有設密碼');
  const e2e = (r.json.accounts || []).filter(function (a) { return a.email === 'e2e@test.com'; })[0] || {};
  ok(e2e.id && r.json.accounts.length >= 2, '另一個會員也在名單裡');

  r = await api('/api/admin/player?id=' + encodeURIComponent(me.id));
  ok(r.status === 200 && r.json.account, '後台查單一玩家詳情');
  ok(Array.isArray(r.json.account.events), '詳情裡有操作足跡陣列');

  r = await api('/api/admin/announce', { method: 'POST', body: { text: 'E2E 停機公告', hours: 1 } });
  ok(r.status === 200 && r.json.ok, '發布全服公告');
  await api('/api/auth/logout', { method: 'POST' });
  await sleep(300);
  r = await api('/api/auth/guest', { method: 'POST', body: { deviceId: 'net-auth-e2e-device-0001' } });
  ok(r.status === 200 && r.json.account, '回到遊客身分');
  ok(r.json.announce && /E2E 停機公告/.test(r.json.announce.text), '遊客一進來就收到公告');
  r = await api('/api/admin/overview');
  ok(r.status === 403, '遊客打後台 → 403');

  console.log('\n=== 10. 第三方登入（未設定 / 已設定）===');
  r = await api('/api/auth/google/start', { redirect: 'manual' });
  ok(r.status === 503 && r.json.err === 'PROVIDER_OFF', '沒設定 client id → 503（前端會顯示提示）');

  // 另開一個「有設定」的實例，只驗證導向網址，不會真的連出去
  const PORT2 = 3212;
  const srv2 = startServer(PORT2, {
    GOOGLE_CLIENT_ID: 'test-client-id.apps.googleusercontent.com',
    GOOGLE_CLIENT_SECRET: 'test-secret',
    FACEBOOK_APP_ID: '1234567890',
    FACEBOOK_APP_SECRET: 'fb-secret',
    BH_FORCE_HTTPS: '1'
  });
  await waitUp(PORT2);
  const oldBase = BASE; BASE = 'http://127.0.0.1:' + PORT2;
  jar.clear();
  r = await fetch(BASE + '/api/auth/google/start', { redirect: 'manual' });
  const loc = r.headers.get('location') || '';
  ok(r.status === 302, '有設定時 /start 會 302 到 Google');
  ok(loc.indexOf('https://accounts.google.com') === 0, '導向 accounts.google.com');
  ok(loc.indexOf('client_id=test-client-id') > 0, '帶上 client_id');
  ok(loc.indexOf('redirect_uri=') > 0 && loc.indexOf(encodeURIComponent('/api/auth/google/callback')) > 0, '帶上回呼網址');
  ok(loc.indexOf('state=') > 0, '帶上防 CSRF 的 state');
  ok(loc.indexOf('scope=') > 0, '帶上 scope');

  r = await fetch(BASE + '/api/auth/google/callback?code=abc&state=forged', { redirect: 'manual' });
  const loc2 = r.headers.get('location') || '';
  ok(r.status === 302 && loc2.indexOf('login=state') > 0, 'state 被竄改 → 導回並標記 state 錯誤');

  console.log('\n=== 10. 強制 HTTPS ===');
  r = await fetch(BASE + '/api/health', { headers: { 'x-forwarded-proto': 'http' }, redirect: 'manual' });
  ok(r.status === 308, 'x-forwarded-proto: http → 308 轉址');
  ok((r.headers.get('location') || '').indexOf('https://') === 0, '轉到 https://');
  r = await fetch(BASE + '/api/health', { headers: { 'x-forwarded-proto': 'https' } });
  ok(r.status === 200, 'https 請求正常');
  ok(r.headers.get('strict-transport-security') !== null, 'https 回應帶 HSTS');

  srv.kill();
  srv2.kill();
  try { fs.rmSync(DATA, { recursive: true, force: true }); } catch (e) {}

  console.log('\n[net-auth] ' + pass + ' 通過、' + fail + ' 失敗');
  process.exit(fail ? 1 : 0);
})().catch(function (e) {
  console.error('測試失敗：', e && e.stack || e);
  process.exit(1);
});
