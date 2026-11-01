// test/verify-v58.js —— v4.13 帳號／後台／維持登入（端到端：真的起伺服器 + 真的註冊登入）
//   ① 登出後回到「登入」頁（記住帳號／密碼的勾選框不會不見）
//   ② 「維持登入」勾選 → cookie Max-Age 拉長到 1 年
//   ③ 開發者後台：錯誤不再被靜默吞掉；後台可開且有內容
//   ④ 非開發者開後台 → 明確擋下（不是空白）
//   ⑤ 持久化警告：未設 BH_DATA_DIR 時要回警告
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const ROOT_SRV = path.join(__dirname, '..', '..', 'bomberman-online');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'bh-v413-'));
const PORT = 3377;
const DEV_EMAIL = 'jon84597@gmail.com';
const DEV_PW = 'V413TestPass!';
const USER_EMAIL = 'player413@example.com';
const USER_PW = 'User413Pass!';

let pass = 0, fail = 0;
function ok(c, n, x) {
  if (c) { pass++; console.log('  ✓ ' + n + (x === undefined ? '' : '（' + x + '）')); }
  else { fail++; console.log('  ✗ FAIL: ' + n + (x === undefined ? '' : '（' + x + '）')); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const srv = spawn(process.execPath, ['server.js'], {
  cwd: ROOT_SRV,
  env: Object.assign({}, process.env, {
    PORT: String(PORT), BH_DATA_DIR: DATA, BH_AUTH_SECRET: 'v413-secret', BH_FORCE_HTTPS: '0'
  }),
  stdio: ['ignore', 'pipe', 'pipe']
});
srv.stdout.on('data', () => {});
srv.stderr.on('data', d => { const s = String(d); if (/Error/.test(s)) console.error('[srv]', s.trim()); });

(async () => {
  for (let i = 0; i < 80; i++) {
    try { const r = await fetch('http://127.0.0.1:' + PORT + '/api/health', { signal: AbortSignal.timeout(500) }); if (r.ok) break; } catch (e) {}
    await sleep(150);
  }

  const BASE = 'http://127.0.0.1:' + PORT;

  // ================================================================
  head('① 註冊 + 登入 + 維持登入（keep → 1 年）');
  const reg = await fetch(BASE + '/api/auth/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: USER_EMAIL, pw: USER_PW, name: 'P' })
  }).then(r => r.json());
  ok(reg.ok === true, '一般玩家註冊成功');

  const loginKeep = await fetch(BASE + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: USER_EMAIL, pw: USER_PW, keep: true })
  });
  const keepCookie = (loginKeep.headers.getSetCookie ? loginKeep.headers.getSetCookie() : [loginKeep.headers.get('set-cookie')]).join(';');
  ok(keepCookie.indexOf('Max-Age=') >= 0, '登入回傳 Set-Cookie');
  const maxAge = parseInt((keepCookie.match(/Max-Age=(\d+)/) || [])[1] || '0', 10);
  ok(maxAge >= 300 * 24 * 3600, '勾選「維持登入」→ cookie 有效期約 1 年（' + Math.round(maxAge / 86400) + ' 天）', maxAge);

  const loginPlain = await fetch(BASE + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: USER_EMAIL, pw: USER_PW })
  });
  const plainCookie = (loginPlain.headers.getSetCookie ? loginPlain.headers.getSetCookie() : [loginPlain.headers.get('set-cookie')]).join(';');
  const plainMax = parseInt((plainCookie.match(/Max-Age=(\d+)/) || [])[1] || '0', 10);
  ok(plainMax > 0 && plainMax < 300 * 24 * 3600, '不勾選 → 維持原本的 30 天', Math.round(plainMax / 86400) + ' 天');
  ok(plainMax < maxAge, '維持登入的期限比一般登入長');

  // ================================================================
  head('② 開發者後台：權限與內容');
  // 開發者註冊
  await fetch(BASE + '/api/auth/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: DEV_EMAIL, pw: DEV_PW, name: 'Dev' })
  });
  const devLogin = await fetch(BASE + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: DEV_EMAIL, pw: DEV_PW })
  }).then(r => r.json());
  ok(devLogin.ok === true && devLogin.account.dev === true, '開發者帳號帶 dev 標記');
  const devCookie = (devLogin.setCookie || '');

  // 開發者 cookie → 後台 API 應可讀
  const devJar = [];
  const devRes = await fetch(BASE + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: DEV_EMAIL, pw: DEV_PW })
  });
  devJar.push((devRes.headers.getSetCookie ? devRes.headers.getSetCookie() : [devRes.headers.get('set-cookie')]).join(';'));
  const jar = devJar.map(function (c) { return c.split(';')[0]; }).join('; ');
  const ov = await fetch(BASE + '/api/admin/overview', { headers: { Cookie: jar } }).then(r => r.json());
  ok(ov.ok === true, '開發者可以讀到後台資料');
  ok(ov.stats && typeof ov.stats.accounts === 'number', '後台有統計數字', ov.stats && ov.stats.accounts);
  ok(Array.isArray(ov.accounts) && ov.accounts.length >= 2, '後台有帳號清單', ov.accounts && ov.accounts.length);

  // 一般玩家 → 後台 API 必須 403（不是空白）
  const userRes2 = await fetch(BASE + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: USER_EMAIL, pw: USER_PW })
  });
  const userJar = (userRes2.headers.getSetCookie ? userRes2.headers.getSetCookie() : [userRes2.headers.get('set-cookie')]).map(function (c) { return c.split(';')[0]; }).join('; ');
  const ov2 = await fetch(BASE + '/api/admin/overview', { headers: { Cookie: userJar } });
  const ov2j = await ov2.json();
  ok(ov2j.ok === false && ov2j.err === 'NOT_DEV', '一般玩家讀後台會被明確擋下（NOT_DEV，不是空白）', ov2j.err);

  // ================================================================
  head('③ 持久化警告（未設 BH_DATA_DIR 時要提醒）');
  const meRes = await fetch(BASE + '/api/auth/me', { headers: { Cookie: jar } }).then(r => r.json());
  ok(meRes.ok === true, 'auth/me 正常');
  // 這個測試伺服器有設 BH_DATA_DIR → 不該有警告
  ok(typeof meRes.persistWarning === 'string', 'auth/me 會帶 persistWarning 欄位（即使為空字串）');
  ok(!meRes.persistWarning, '有設 BH_DATA_DIR → 沒有警告', JSON.stringify(meRes.persistWarning));

  // 再起一台「沒設 BH_DATA_DIR」的 → 應該有警告
  const srv2 = spawn(process.execPath, ['server.js'], {
    cwd: ROOT_SRV,
    env: Object.assign({}, process.env, {
      PORT: String(PORT + 1), BH_AUTH_SECRET: 'v413b-secret', BH_FORCE_HTTPS: '0'
    }),   // 刻意不設 BH_DATA_DIR
    stdio: ['ignore', 'pipe', 'pipe']
  });
  srv2.stdout.on('data', () => {});
  srv2.stderr.on('data', () => {});
  for (let i = 0; i < 80; i++) {
    try { const r = await fetch('http://127.0.0.1:' + (PORT + 1) + '/api/health', { signal: AbortSignal.timeout(500) }); if (r.ok) break; } catch (e) {}
    await sleep(150);
  }
  const me2 = await fetch('http://127.0.0.1:' + (PORT + 1) + '/api/auth/me').then(r => r.json());
  ok(typeof me2.persistWarning === 'string' && me2.persistWarning.length > 0,
    '未設 BH_DATA_DIR → 會回「重新部署帳號會消失」的警告', (me2.persistWarning || '').slice(0, 30) + '…');
  srv2.kill();

  // ================================================================
  head('④ 前端：登出後回到登入頁 + 維持登入勾選框 + 後台錯誤不再被吞掉');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  ok(/S\.tab = 'login';/.test(html), '登出後切到「登入」分頁（原本是 reg → 沒有勾選框）');
  ok(/id="acctKeep"/.test(html), '有「維持登入」勾選框');
  ok(/localStorage\.getItem\('bombhero-keep-login'\)/.test(html), '維持登入的勾選狀態會被記住');
  ok(/localStorage\.setItem\('bombhero-keep-login', '1'\)/.test(html), '勾選「維持登入」會寫進 localStorage');
  ok(/keep: !!keep/.test(html), '登入會把 keep 送到伺服器');
  ok(/else if \(act === 'admin'\) \{\s*close\(\);[\s\S]{0,400}catch \(err\) \{[\s\S]{0,200}console\.error\('\[admin\]'/.test(html),
    '後台開啟失敗會把錯誤講出來（不再靜默 try/catch 吞掉）');
  ok(/id="adWarn"/.test(html), '後台有「資料會不會被清掉」的警告列');
  ok(/r\.persistWarning/.test(html), '後台會顯示伺服器回的 persistWarning');

  await br_close(srv);
  console.log('\n' + (fail === 0 ? ('通過 ' + pass + ' / ' + (pass + fail)) : ('✗ ' + fail + ' 項失敗（通過 ' + pass + '）')));
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('FAILED', e); srv.kill(); process.exit(1); });

async function br_close(s) { try { s.kill(); } catch (e) {} }
