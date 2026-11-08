// test/verify-v566.js —— v5.65：後台累計計數（註冊／登入／綁定…）要能撐過重新部署
//   症狀：後台總覽那排數字（註冊次數／登入次數／綁定／同步／竄改／限流）
//         每次部署或 Render 休眠喚醒就全部變 0，名單卻還在 → 看起來像「所有人的紀錄都不見了」。
//   根因：const stats = {...} 只活在記憶體，從來沒被存進資料庫。
//   修法：stats 直接就是 db.cnt（跟著 meta 分片存），載入時就地合併、只往上不合往下。
//
// 這支不是正則比對：真的開兩個 cloud 實例（第二次＝模擬重啟）跑同一份檔案。
const fs = require('fs');
const path = require('path');
const os = require('os');
const EventEmitter = require('events');

const ROOT = path.join(__dirname, '..');
const CLOUD = require(path.join(ROOT, '..', 'cloud.js'));
const cloudSrc = fs.readFileSync(path.join(ROOT, '..', 'cloud.js'), 'utf8');

let pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('  ✗ FAIL: ' + m); } }
function sec(n) { console.log('\n=== ' + n + ' ==='); }

const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'bh566-'));
const SECRET = 'test-secret-566';
const FILE = path.join(DIR, 'accounts.json');

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
let ipN = 0;
async function call(cloud, method, p, body) {
  const headers = { 'x-forwarded-proto': 'https', 'x-forwarded-for': '10.1.' + (++ipN % 250) + '.' + (ipN % 200) };
  await cloud.handle(makeReq(method, headers, body), makeRes(), new URL('https://x' + p));
  return 1;
}
async function boot() {
  const c = CLOUD.createCloud({ dir: DIR, persist: true, secret: SECRET, env: {} });
  await c.ready;
  return c;
}

(async function () {
  /* ---------------- ① 計數真的會動 ---------------- */
  sec('① 基準：註冊／登入會讓計數往上');
  let A = await boot();
  const s0 = A.stats();
  await call(A, 'POST', '/api/auth/register', { id: 'cnt01', pw: 'abc12345' });
  await call(A, 'POST', '/api/auth/register', { id: 'cnt02', pw: 'abc12345' });
  await call(A, 'POST', '/api/auth/login', { id: 'cnt01', pw: 'abc12345' });
  await call(A, 'POST', '/api/auth/login', { id: 'cnt02', pw: 'abc12345' });
  await call(A, 'POST', '/api/auth/login', { id: 'cnt01', pw: '9999wrong' });
  const s1 = A.stats();
  ok(s1.registers === s0.registers + 2, '註冊次數 +2（' + s0.registers + ' → ' + s1.registers + '）');
  ok(s1.webLogins >= s0.webLogins + 2, '帳密登入次數有累加（' + s1.webLogins + '）');
  ok(s1.authBadPw === 1, '密碼錯計到 authBadPw（' + s1.authBadPw + '）');
  ok(A.db.cnt.registers === s1.registers, '★ stats 就是 db.cnt 本體（改一個另一個跟著動）');

  /* ---------------- ② 檔案裡真的有存 ---------------- */
  sec('② 計數寫進存檔（不是只活在記憶體）');
  A.flush();
  ok(fs.existsSync(FILE), 'accounts.json 產生了');
  const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  ok(raw.cnt && typeof raw.cnt === 'object', '存檔裡有 cnt');
  ok(raw.cnt.registers === s1.registers, '存檔的 registers = ' + (raw.cnt && raw.cnt.registers));
  ok(raw.cnt.webLogins === s1.webLogins, '存檔的 webLogins = ' + (raw.cnt && raw.cnt.webLogins));

  /* ---------------- ③ 模擬重新部署 ---------------- */
  sec('③ 重啟後（新實例讀同一份檔案）數字還在');
  const B = await boot();
  const s2 = B.stats();
  ok(s2.registers === s1.registers, '★ 註冊次數撐過重啟（' + s2.registers + '）');
  ok(s2.webLogins === s1.webLogins, '★ 登入次數撐過重啟（' + s2.webLogins + '）');
  ok(s2.authBadPw === s1.authBadPw, '★ 密碼錯次數撐過重啟（' + s2.authBadPw + '）');

  /* ---------------- ④ 後台總覽看得到 ---------------- */
  sec('④ 後台總覽用的就是這組數字');
  const ov = B._internals.adminOverview();
  ok(ov.stats.registers === s1.registers, 'adminOverview().stats.registers = ' + ov.stats.registers);
  ok(ov.stats.webLogins === s1.webLogins, 'adminOverview().stats.webLogins = ' + ov.stats.webLogins);
  ok(ov.accounts.length >= 2, '名單照樣有人（' + ov.accounts.length + ' 筆）');

  /* ---------------- ⑤ 舊存檔沒有 cnt 也要能開 ---------------- */
  sec('⑤ 相容：舊存檔完全沒有 cnt 欄位');
  const old = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  delete old.cnt;
  fs.writeFileSync(FILE, JSON.stringify(old));
  const C = await boot();
  const s3 = C.stats();
  ok(typeof s3.registers === 'number' && s3.registers === 0,
    '沒有 cnt → 從 0 開始，不會變 NaN（' + s3.registers + '）');
  ok(isFinite(s3.webLogins) && isFinite(s3.logins), '其他計數也都是有限數字');
  ok((C._internals.db.accounts ? Object.keys(C._internals.db.accounts).length : 0) >= 2,
    '帳號本身不受影響');

  /* ---------------- ⑥ 只往上不合往下 ----------------
     真實情境：本機快取先載入（數字較新），Supabase 回來的是較舊的快照。
     舊版寫法會照單全收 → 數字往回跳。這裡直接餵兩個 meta 分片驗規則。 */
  sec('⑥ 合併規則：舊快照不能把數字壓回去');
  const low = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  low.cnt = { registers: 0, webLogins: 0, logins: 0 };
  fs.writeFileSync(FILE, JSON.stringify(low));
  const D = await boot();
  await call(D, 'POST', '/api/auth/login', { id: 'cnt01', pw: 'abc12345' });
  const before = D.stats().webLogins;
  ok(before >= 1, '有先累加到一次登入（' + before + '）');
  const metaOf = function (cnt) {
    return { v: 1, tamper: 0, created: 1, announce: null, sec: '', cnt: cnt };
  };
  D._internals.store.applyPart('meta', metaOf({ webLogins: 0, registers: 0 }));
  ok(D.stats().webLogins === before, '★ 較小的舊快照不會蓋掉現有計數（' + before + ' → ' + D.stats().webLogins + '）');
  D._internals.store.applyPart('meta', metaOf({ webLogins: before + 9 }));
  ok(D.stats().webLogins === before + 9, '★ 較大的遠端數字會補上（' + D.stats().webLogins + '）');
  D._internals.store.applyPart('meta', metaOf({ webLogins: 'x', y: -5 }));
  ok(D.stats().webLogins === before + 9, '壞值（非數字／負數）不會污染計數');

  /* ---------------- ⑦ 竄改次數沿用既有的 db.tamper ---------------- */
  sec('⑦ 竄改攔阻：沿用本來就有存檔的 db.tamper');
  const t = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  delete t.cnt;
  t.tamper = 5;
  fs.writeFileSync(FILE, JSON.stringify(t));
  const F = await boot();
  ok(F.stats().tamper === 5, '★ 沒有 cnt 時用 db.tamper 當基準（' + F.stats().tamper + '）');

  /* ---------------- ⑧ 結構：meta 分片有帶 cnt、有定時落盤 ---------------- */
  sec('⑧ 接線檢查');
  ok(/meta:\s*\{[^}]*cnt:\s*db\.cnt/.test(cloudSrc), 'meta 分片有帶 cnt');
  ok(/function mergeCnt\(src\)/.test(cloudSrc), '有 mergeCnt 就地合併');
  ok(/for \(const k in src\)[\s\S]{0,200}?v > \(Number\(db\.cnt\[k\]\) \|\| 0\)/.test(cloudSrc),
    '合併時只往上（不比現有值小才寫）');
  ok(/setInterval\(function \(\) \{[\s\S]{0,240}?JSON\.stringify\(db\.cnt/.test(cloudSrc),
    '有每分鐘比對計數並排 flush');
  ok(/const stats = db\.cnt \|\| \(db\.cnt = \{\}\)/.test(cloudSrc), 'stats 直接指向 db.cnt');
  ok(!/const stats = \{ logins: 0,/.test(cloudSrc), '舊的「純記憶體 stats」已經拿掉');

  console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + ' 通過 / ' + fail + ' 失敗');
  try { fs.rmSync(DIR, { recursive: true, force: true }); } catch (e) {}
  process.exit(fail ? 1 : 0);
})().catch(function (e) {
  console.log('  ✗ 例外：' + (e && e.message || e));
  process.exit(1);
});
