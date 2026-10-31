// test/_probe-auth43.js — 開發中用的後端快速驗證（v4.3 帳密 + 後台）
// 直接呼叫 cloud.handle（不開 server），用假 req/res
const path = require('path');
const { createCloud } = require('../../bomberman-online/cloud.js');

function mkReq(method, url, body, cookie) {
  const u = new URL('http://127.0.0.1' + url);
  const chunks = body === undefined ? [] : [Buffer.from(JSON.stringify(body))];
  const headers = {
    'x-forwarded-proto': 'http',
    'x-forwarded-for': '1.2.3.4',
    host: '127.0.0.1:3000',
    'content-type': 'application/json'
  };
  if (cookie) headers.cookie = cookie;
  const req = {
    method, url: u.pathname + u.search, headers, socket: { remoteAddress: '1.2.3.4' },
    on(ev, fn) {
      if (ev === 'data') chunks.forEach(c => fn(c));
      if (ev === 'end') fn();
      if (ev === 'close' || ev === 'error') { /* noop */ }
      return req;
    },
    destroy() {}
  };
  return { req, url: u };
}
function mkRes() {
  const out = { code: 0, body: null, headers: {}, cookies: [] };
  const res = {
    writeHead(c, h) { out.code = c; Object.assign(out.headers, h || {}); },
    setHeader(k, v) { out.headers[k] = v; if (k === 'Set-Cookie') out.cookies = [].concat(v); },
    getHeader(k) { return out.headers[k]; },
    end(s) { try { out.body = JSON.parse(s); } catch (e) { out.body = s; } }
  };
  return { res, out };
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
function ok(c, n, x) { if (c) { pass++; console.log('  ✓ ' + n + (x === undefined ? '' : '（' + x + '）')); } else { fail++; console.log('  ✗ FAIL ' + n + (x === undefined ? '' : '（' + x + '）')); } }

(async () => {
  const cloud = createCloud({ persist: false, secret: 'test-secret' });
  async function call(method, url, body, cookie) {
    const { req, url: u } = mkReq(method, url, body, cookie);
    const { res, out } = mkRes();
    await cloud.handle(req, res, u);
    const sc = out.cookies[0] || '';
    const m = sc.match(/bh_sid=([^;]+)/);
    out.sid = m ? decodeURIComponent(m[1]) : '';
    return out;
  }
  const ck = (sid) => 'bh_sid=' + encodeURIComponent(sid);

  console.log('=== 1. 註冊 ===');
  let r = await call('POST', '/api/auth/guest', { deviceId: 'device-abcdefgh-1234' });
  ok(r.body && r.body.ok, '先拿到遊客身分');
  const guestSid = r.sid;
  const guestId = r.body.account.id;
  ok(r.body.account.kind === 'guest', '身分是 guest');

  // 先給遊客一點進度
  await call('POST', '/api/rpg/stage-clear', { stage: 1 }, ck(guestSid));
  await call('POST', '/api/rpg/stage-clear', { stage: 2 }, ck(guestSid));

  r = await call('POST', '/api/auth/register', { id: 'ab', pw: 'abc12345' }, '');
  ok(r.code === 400 && r.body.err === 'BAD_USER', '使用者名稱太短被拒', r.body && r.body.err);
  r = await call('POST', '/api/auth/register', { id: 'test@mail.com', pw: 'short1' }, '');
  ok(r.code === 400 && r.body.err === 'PW_SHORT', '密碼太短被拒', r.body && r.body.err);
  r = await call('POST', '/api/auth/register', { id: 'test@mail.com', pw: 'abcdefgh' }, '');
  ok(r.code === 400 && r.body.err === 'PW_NEED_DIGIT', '純字母密碼被拒', r.body && r.body.err);
  r = await call('POST', '/api/auth/register', { id: 'bad@@mail', pw: 'abc12345' }, '');
  ok(r.code === 400 && r.body.err === 'BAD_EMAIL', '爛 Email 被拒', r.body && r.body.err);

  r = await call('POST', '/api/auth/register', { id: 'Test@Mail.com', pw: 'abc12345' }, ck(guestSid));
  ok(r.code === 200 && r.body.ok, '註冊成功（大小寫不影響）', r.code);
  ok(r.sid && r.sid !== guestSid, '有發新的 session cookie');
  const webId = r.body.account.id;
  ok(r.body.account.unlocked === 3, '遊客的 2 關進度完整轉移 → 解鎖到第 3 關', r.body.account.unlocked);
  ok(r.body.account.hasPass === true, '回傳 hasPass（但絕不回傳密碼）');
  ok(!JSON.stringify(r.body).match(/abc12345/), '回應裡沒有明文密碼');
  const dbAcc = cloud.db.accounts[webId];
  ok(dbAcc.pass && dbAcc.pass.algo === 'scrypt', '資料庫存的是 scrypt 雜湊');
  ok(dbAcc.pass.hash !== 'abc12345' && dbAcc.pass.salt, '有 salt、不是明文');
  ok(dbAcc.ip === '1.2.3.4', '記錄了註冊 IP', dbAcc.ip);
  ok(dbAcc.kind === 'member' && dbAcc.provider === 'web', 'kind=member / provider=web');

  console.log('=== 2. 重複註冊 / 登入 ===');
  r = await call('POST', '/api/auth/register', { id: 'test@mail.com', pw: 'abc12345' }, '');
  ok(r.code === 409 && r.body.err === 'ID_TAKEN', '同帳號不能重複註冊', r.body && r.body.err);

  r = await call('POST', '/api/auth/login', { id: 'test@mail.com', pw: 'wrong123' }, '');
  ok(r.code === 401 && r.body.err === 'BAD_LOGIN', '密碼錯 → 401', r.code);
  r = await call('POST', '/api/auth/login', { id: 'nobody@mail.com', pw: 'abc12345' }, '');
  ok(r.code === 401 && r.body.err === 'BAD_LOGIN', '帳號不存在 → 一樣 401（不洩漏帳號是否存在）', r.code);

  r = await call('POST', '/api/auth/login', { id: 'TEST@mail.com', pw: 'abc12345' }, '');
  ok(r.code === 200 && r.body.ok, '密碼正確 → 登入成功');
  ok(r.body.account.id === webId, '登入到同一個帳號');
  const sid2 = r.sid;
  ok(cloud.db.accounts[webId].loginCount === 2, '登入次數累加到 2', cloud.db.accounts[webId].loginCount);

  r = await call('GET', '/api/auth/me', undefined, ck(sid2));
  ok(r.body.ok && r.body.account.id === webId, '/auth/me 認得這個 session');

  console.log('=== 3. 鎖帳號（連續錯誤）===');
  for (let i = 0; i < 5; i++) await call('POST', '/api/auth/login', { id: 'test@mail.com', pw: 'bad' + i + 'x' }, '');
  r = await call('POST', '/api/auth/login', { id: 'test@mail.com', pw: 'abc12345' }, '');
  ok(r.code === 423 && r.body.err === 'LOCKED', '連續錯 5 次 → 暫時鎖定 423', r.code);
  ok(r.body.retry > 0 && r.headers['Retry-After'], '有給 Retry-After', r.body.retry);
  cloud.db.accounts[webId].lockUntil = 0;   // 解鎖繼續測

  console.log('=== 4. 開發者 ===');
  r = await call('POST', '/api/auth/register', { id: 'jon84597@gmail.com', pw: 'DevPass8899' }, '');
  ok(r.code === 200 && r.body.account.dev === true, '開發者帳號自動標記 dev=true');
  ok(r.body.account.tier === 'developer', 'tier=developer');
  ok(r.body.account.unlocked === 32, '開發者全關卡解鎖（32）', r.body.account.unlocked);
  const devSid = r.sid;

  r = await call('GET', '/api/admin/overview', undefined, ck(sid2));
  ok(r.code === 403 && r.body.err === 'NOT_DEV', '一般玩家進後台 → 403', r.code);
  r = await call('GET', '/api/admin/overview', undefined, '');
  ok(r.code === 401, '沒登入進後台 → 401', r.code);

  r = await call('GET', '/api/admin/overview', undefined, ck(devSid));
  ok(r.code === 200 && r.body.ok, '開發者進後台 OK');
  ok(r.body.stats.members >= 2, '後台統計有會員數', r.body.stats.members);
  const row = r.body.accounts.find(a => a.id === webId);
  ok(!!row, '列表裡找得到剛才註冊的玩家');
  ok(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(row.createdStr), '加入時間精確到秒', row.createdStr);
  ok(row.provider === 'web' && row.ip === '1.2.3.4', '來源與 IP 都記錄了', row.provider + ' / ' + row.ip);

  r = await call('GET', '/api/admin/player?q=test@mail.com', undefined, ck(devSid));
  ok(r.code === 200 && r.body.account.id === webId, '用 Email 查得到玩家');
  ok(r.body.account.alloc && r.body.account.alloc.hp >= 0, '查得到目前配點', JSON.stringify(r.body.account.alloc));
  ok(Array.isArray(r.body.account.events) && r.body.account.events.length > 0, '查得到操作足跡', r.body.account.events.length + ' 筆');
  ok(!!r.body.account.events[0].str, '足跡有時間字串');

  console.log('=== 5. 停權 / 修資料 / 公告 ===');
  r = await call('POST', '/api/admin/ban', { id: webId, on: true, reason: '測試外掛' }, ck(devSid));
  ok(r.body.ok && r.body.account.banned, '停權成功');
  r = await call('GET', '/api/auth/me', undefined, ck(sid2));
  ok(r.body.account === null, '被停權後舊 session 立刻失效');
  r = await call('POST', '/api/auth/login', { id: 'test@mail.com', pw: 'abc12345' }, '');
  ok(r.code === 403 && r.body.err === 'BANNED', '被停權後不能登入', r.body.reason);
  r = await call('POST', '/api/admin/ban', { id: webId, on: false }, ck(devSid));
  ok(r.body.ok && !r.body.account.banned, '解除停權');
  await sleep(1200);
  r = await call('POST', '/api/auth/login', { id: 'test@mail.com', pw: 'abc12345' }, '');
  ok(r.code === 200, '解除後可以登入', r.code + ' / ' + (r.body && r.body.err));
  const sid3 = r.sid;

  r = await call('POST', '/api/admin/grant', { id: webId, cleared: 12, gold: 5000 }, ck(devSid));
  ok(r.body.ok && r.body.rpg.cleared === 12, '客服可以直接修關卡進度', r.body.rpg.cleared);
  r = await call('GET', '/api/rpg/state', undefined, ck(sid3));
  ok(r.body.account.rpg.cleared === 12 && r.body.account.unlocked === 13, '玩家端立刻看到新進度');

  r = await call('POST', '/api/admin/announce', { text: '今晚 23:00 停機維護', hours: 24 }, ck(devSid));
  ok(r.body.ok && r.body.announce.text, '發布全服公告');
  r = await call('GET', '/api/auth/me', undefined, ck(sid3));
  ok(r.body.announce && /停機維護/.test(r.body.announce.text), '玩家端讀得到公告');
  r = await call('POST', '/api/admin/announce', { text: '' }, ck(devSid));
  ok(!r.body.announce, '可以清掉公告');

  console.log('=== 6. 開發者跳關 ===');
  r = await call('POST', '/api/rpg/stage-clear', { stage: 30 }, ck(devSid));
  ok(r.body.ok && r.body.rpg.cleared === 30, '開發者可以直接跳過 30 關', r.body.rpg && r.body.rpg.cleared);
  r = await call('POST', '/api/rpg/stage-clear', { stage: 20 }, ck(sid3));
  ok(r.code === 409 && r.body.err === 'STAGE_LOCKED', '一般玩家跳關仍被擋', r.body && r.body.err);

  console.log('=== 7. 改密碼 ===');
  await sleep(1200);
  r = await call('POST', '/api/auth/password', { old: 'abc12345', pw: 'NewPass5566' }, ck(sid3));
  ok(r.body.ok, '改密碼成功');
  await sleep(1200);
  r = await call('POST', '/api/auth/login', { id: 'test@mail.com', pw: 'abc12345' }, '');
  ok(r.code === 401, '舊密碼失效', r.code + ' / ' + (r.body && r.body.err));
  await sleep(1200);
  r = await call('POST', '/api/auth/login', { id: 'test@mail.com', pw: 'NewPass5566' }, '');
  ok(r.code === 200, '新密碼可以登入', r.code + ' / ' + (r.body && r.body.err));

  console.log('\n結果：' + pass + ' 通過 / ' + fail + ' 失敗');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(1); });
