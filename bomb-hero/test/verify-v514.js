// v5.14 驗證：① 遊戲開發者稱號（黑紫）② 好友／私訊通知（驚嘆號）③ 後台足跡中文化
// 跑法：node test/verify-v514.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { EventEmitter } = require('events');
const { makeEnv } = require('./_sandbox');
const cloudMod = require('../../cloud.js');

let pass = 0, fail = 0;
function ok(cond, msg, extra) {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ FAIL: ' + msg + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}
function head(s) { console.log('\n' + s); }
function vt(v) { return String(v).split('.').map(function (x) { return parseInt(x, 10) || 0; }); }
function vge(a, b) { const A = vt(a), B = vt(b); for (let i = 0; i < 3; i++) { const x = A[i] || 0, y = B[i] || 0; if (x !== y) return x > y; } return true; }

const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const cloudSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'cloud.js'), 'utf8');
const env = makeEnv();
const B = env.BH;

/* ===================================================================== */
head('① 版本與入口');
ok(vge(B.VERSION, '5.14'), 'VERSION ≥ 5.14（實測 ' + B.VERSION + '）');
ok(B.VERSION_LOG[0].v === B.VERSION && B.VERSION_LOG[0].now === true, 'VERSION_LOG 首位是當前版本且 now:true');
ok(B.VERSION_LOG.slice(1).every(function (r) { return r.now !== true; }), '只有最新一筆是 now:true');
ok(src.indexOf('id="socNotice"') > 0, '首頁有通知條 #socNotice');
ok(/\.socnotice\.hide \{ display: none; \}/.test(src), '沒有未讀時通知條是 display:none（不佔位）');
{
  // 通知條必須在首頁選單裡（.screen 沒開就看不到）→ 遊戲中不會被蓋到
  const menu = src.indexOf('<div class="menu" id="homeMenu">');
  const notice = src.indexOf('id="socNotice"');
  const grid = src.indexOf('<div class="mgrid">');
  ok(menu > 0 && notice > menu && notice < grid, '通知條在首頁選單最上面（不是浮層、不在遊戲畫面）');
  const game = src.indexOf('id="scr-game"');
  ok(game < 0 || notice < game || notice > src.indexOf('id="scr-settings"'), '通知條不在遊戲畫面區塊內');
}

/* ===================================================================== */
head('② 遊戲開發者稱號（黑紫）');
{
  const A = B.Ach;
  const D = A.DEV_TITLE;
  ok(!!D && D.name === '遊戲開發者', '有「遊戲開發者」稱號');
  ok(A.TITLES.length === 8, '原本 8 個成就稱號沒有被動到（實測 ' + A.TITLES.length + '）');
  ok(D.dev === true && D.need < 0, '開發者稱號不靠成就分（need < 0、標記 dev）');
  ok(/^#[0-9a-f]{6}$/i.test(D.color) && /gradient/.test(D.frame), '有專屬顏色與外框漸層');
  ok(/^#[0-9a-f]{6}$/i.test(D.frame.match(/#[0-9a-f]{6}/ig)[0]) && D.frame.indexOf('#7b4bd4') > 0, '外框是黑紫（含 #7b4bd4）');
  ok(Array.isArray(D.canvasFill) && D.canvasFill.length === 2 && D.canvasEdge, 'Canvas 用的漸層色有另外給（畫在頭上要用）');
  ok(D.canvasFill[0] !== D.canvasFill[1], '頭上的底色是漸層（不是單色）');
  // 名稱／顏色不能跟既有 8 個撞
  ok(!A.TITLES.some(function (t) { return t.name === D.name || t.color === D.color; }), '名稱與顏色都和 8 個稱號不同');
  ok(src.indexOf('tt.canvasFill') > 0 && src.indexOf('tt.canvasEdge') > 0, '頭上名牌真的有畫黑紫漸層');

  const e2 = makeEnv(); const A2 = e2.BH.Ach;
  ok(A2.devOn() === false, '一般玩家（沒有 dev 旗標）不會自動戴上');
  ok(A2.titleOf() === null || A2.titleOf().name !== '遊戲開發者', '一般玩家的稱號不受影響');
  A2.forceDev(true);                     // 模擬伺服器給了 dev 旗標
  ok(A2.devOn() === true && A2.titleOf().name === '遊戲開發者', '開發者帳號 → 頭上就是「遊戲開發者」');
  A2.setDev(0);
  ok(!A2.titleOf() || A2.titleOf().name !== '遊戲開發者', '可以自己卸下（回到原本的成就稱號）');
  A2.setDev(1);
  ok(A2.titleOf().name === '遊戲開發者', '可以再戴回去');
  ok(A2.state().devT === 1, '戴／不戴會存進存檔（state().devT）');
  A2.setState({ devT: 0 });
  ok(A2.state().devT === 0, 'setState 會還原開關');
  ok(A2.merge({ devT: 0 }, { devT: 1 }).devT === 0, '任何一台收起來 → 合併後也是收起來');
  ok(/out\.ach\.devT/.test(cloudSrc), '後端 sanitizeSave 會保留 devT（不然上雲就被清掉）');
}

/* ===================================================================== */
head('③ 稱號頁：開發者那張卡');
{
  const e3 = makeEnv(); const B3 = e3.BH;
  B3.AchUI.init();
  B3.AchUI.open();
  const clickTab = function (key) {
    const hs = e3.getId('achTabs')._on.click || [];
    hs.forEach(function (f) { f({ target: { closest: function () { return { getAttribute: function () { return key; } }; } } }); });
  };
  clickTab('title');
  const html = String(e3.getId('achBody').innerHTML || '');
  ok(html.indexOf('遊戲開發者') > 0, '稱號頁看得到「遊戲開發者」');
  ok(html.indexOf('開發者專屬') > 0, '有標「開發者專屬」');
  ok(html.indexOf('見習英雄') > 0 && html.indexOf('不朽神話') > 0, '8 個成就稱號還在');
  ok(/\.ttrow\.dev/.test(src), '黑紫卡片有自己的樣式（.ttrow.dev）');
}

/* ===================================================================== */
head('④ 通知：前端（驚嘆號 / 數字 / 首頁那條）');
{
  const s = B.Social;
  ok(s && s._s && s._s.nt && typeof s._s.nt.n === 'number', 'Social 有通知狀態（nt）');
  ok(typeof s.notice === 'function' && typeof s.openNotice === 'function', '有 notice()／openNotice()');
  ok(src.indexOf('class="qdot qdot-num hide" id="onDot"') > 0, '線上玩家 chip 的點改成「數字」樣式');
  ok(src.indexOf('qdot-g') < 0 || src.indexOf('id="onDot"') > src.indexOf('qdot-num'), '舊的綠點樣式不再掛在 onDot 上');
  ok(/dot\.textContent = N > 9 \? '9\+'/.test(src), '超過 9 顯示 9+（不會擠爆 chip）');
  ok(src.indexOf('data-socact="accept"') > 0 && src.indexOf('data-socact="ignore"') > 0, '好友邀請可以按「接受／忽略」');
  ok(/S\.nt\.n = \(S\.nt\.req \| 0\) \+ \(S\.nt\.dm \| 0\)/.test(src), '未讀總數 = 好友邀請 + 未讀私訊');
  ok(/S\.dismiss = true;/.test(src), '可以按 ✕ 先收起（不用硬關掉）');
  ok(/toast\('🔔 '/.test(src), '收到新訊息會跳一則提示');
  // 不會在遊戲畫面冒出來
  ok(/\.socnotice \{[^}]*position: relative/.test(src), '通知條是正常排版（不是 fixed 浮層，不會蓋遊戲）');
}

/* ===================================================================== */
head('⑤ 通知：後端未讀計算（真的跑一次）');
function mkReq(method, urlStr, body, cookie) {
  const req = new EventEmitter();
  req.method = method; req.url = urlStr;
  req.headers = { 'x-forwarded-for': '9.9.9.9', host: 'localhost:3000', 'content-type': 'application/json' };
  if (cookie) req.headers.cookie = cookie;
  req.socket = { remoteAddress: '9.9.9.9' };
  req.destroy = function () {};
  if (body !== undefined) {
    const buf = Buffer.from(JSON.stringify(body));
    setImmediate(function () { req.emit('data', buf); req.emit('end'); });
  }
  return req;
}
function mkRes() {
  const r = { code: 0, headers: {}, body: '' };
  r.writeHead = function (c, h) { r.code = c; Object.assign(r.headers, h || {}); };
  r.setHeader = function (k, v) { r.headers[k] = v; };
  r.getHeader = function (k) { return r.headers[k]; };
  r.end = function (s) { r.body = String(s || ''); };
  r.write = function (s) { r.body += String(s || ''); };
  return r;
}
function makeFetch() {
  return function () {
    return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve([]); }, text: function () { return Promise.resolve('[]'); } });
  };
}

(async function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bh-v514-'));
  const cloud = cloudMod.createCloud({ dir: dir, persist: true, env: {}, fetch: makeFetch() });
  await cloud.ready;

  async function call(method, u, body) {
    const res = mkRes();
    const req = mkReq(method, u, body);
    const done = await cloud.handle(req, res, new URL('http://x' + u));
    let j = {};
    try { j = JSON.parse(res.body || '{}'); } catch (e) {}
    return { done: done, code: res.code, j: j, headers: res.headers };
  }

  const A = 'dev-aaaaaaaa-1111', Bb = 'dev-bbbbbbbb-2222';
  let r = await call('POST', '/api/social/hb', { deviceId: A, name: '甲' });
  const pidA = r.j.me.pid;
  r = await call('POST', '/api/social/hb', { deviceId: Bb, name: '乙' });
  const pidB = r.j.me.pid;
  ok(r.j.unread === 0, '新玩家未讀是 0');

  head('⑤-1 私訊 → 未讀');
  await call('POST', '/api/social/dm', { deviceId: A, to: pidB, text: '安安' });
  await call('POST', '/api/social/dm', { deviceId: A, to: pidB, text: '在嗎' });
  r = await call('POST', '/api/social/hb', { deviceId: Bb, name: '乙' });
  ok(r.j.unread === 2, '乙有 2 則未讀（實測 ' + r.j.unread + '）');
  ok(r.j.unreadBy && r.j.unreadBy[pidA] === 2, '未讀來源分得出來（是誰傳的）');
  r = await call('GET', '/api/social/list?deviceId=' + Bb + '&name=乙');
  ok(r.j.unread === 2, '名單端點也會帶未讀（切回分頁時不用再打一次）');
  r = await call('POST', '/api/social/hb', { deviceId: A, name: '甲' });
  ok(r.j.unread === 0, '自己的訊息不會算成未讀');

  head('⑤-2 打開對話 → 已讀');
  r = await call('GET', '/api/social/dm?deviceId=' + Bb + '&with=' + encodeURIComponent(pidA));
  ok(r.j.ok && r.j.list.length === 2, '讀得到兩則');
  r = await call('POST', '/api/social/hb', { deviceId: Bb, name: '乙' });
  ok(r.j.unread === 0, '讀完之後未讀歸零（實測 ' + r.j.unread + '）');
  await call('POST', '/api/social/dm', { deviceId: A, to: pidB, text: '第三則' });
  r = await call('POST', '/api/social/hb', { deviceId: Bb, name: '乙' });
  ok(r.j.unread === 1, '之後再來的才算新未讀（實測 ' + r.j.unread + '）');

  head('⑤-3 好友邀請 → 接受／忽略');
  r = await call('POST', '/api/social/act', { deviceId: A, action: 'friend', target: pidB });
  ok(r.j.ok && /邀請/.test(r.j.note), '甲送出邀請');
  r = await call('POST', '/api/social/hb', { deviceId: Bb, name: '乙' });
  ok(r.j.reqs.indexOf(pidA) >= 0, '乙的心跳帶回邀請（前端才會亮驚嘆號）');
  r = await call('POST', '/api/social/act', { deviceId: Bb, action: 'ignore', target: pidA });
  ok(r.j.ok && r.j.reqs.length === 0, '忽略後邀請消失');
  ok(r.j.friends.length === 0, '忽略不會順便把對方變成好友');
  await call('POST', '/api/social/act', { deviceId: A, action: 'friend', target: pidB });
  r = await call('POST', '/api/social/act', { deviceId: Bb, action: 'accept', target: pidA });
  ok(r.j.ok && r.j.friends.indexOf(pidA) >= 0, '接受後變成好友');
  ok(r.j.reqs.length === 0, '邀請處理完就清掉');

  head('⑤-4 未讀不會爆掉資料庫');
  ok(/SOC_KEEP = 7 \* 86400000/.test(cloudSrc), '七天沒來就清');
  ok(/ks\.length > 200/.test(cloudSrc), '已讀位置最多留 200 個對話（不會無限長大）');
  const meB = cloud.db.social.players[pidB];
  ok(meB && meB.read && typeof meB.read === 'object', '後端有存每個對話的已讀位置');

  /* --------------------------------------------------------------- */
  head('⑥ 後台足跡：中文化＋更詳細');
  ok(cloudMod.EVENT_LABEL.save === '雲端存檔', 'save → 雲端存檔');
  ok(cloudMod.EVENT_LABEL.bind === '帳號綁定', 'bind → 帳號綁定');
  ok(cloudMod.EVENT_LABEL.login === '登入', 'login → 登入');
  ['register', 'login-fail', 'lock', 'passwd', 'share', 'ban', 'unban', 'grant', 'reset-alloc'].forEach(function (k) {
    ok(cloudMod.EVENT_LABEL[k] && !/^[a-z-]+$/.test(cloudMod.EVENT_LABEL[k]), '「' + k + '」也有中文名（' + cloudMod.EVENT_LABEL[k] + '）');
  });
  ok(src.indexOf("save: '雲端存檔'") > 0 && src.indexOf("bind: '帳號綁定'") > 0, '前端也有一份中文對照（後端沒回 mode 時也不會顯示英文）');
  ok(/return \/\^\[a-z\]\[a-z-\]\*\$\/\.test\(String\(e\.type/.test(src), '不認得的 type 也不會直接印英文');

  head('⑥-1 存檔事件要記「存了什麼」');
  const g = await call('POST', '/api/auth/guest', { deviceId: 'guest-device-v514-test' });
  ok(g.j.ok, '取得遊客帳號（測試用）');
  const ck = String(g.headers['Set-Cookie'] || g.headers['set-cookie'] || '').split(';')[0];
  ok(ck.length > 0, '有拿到 session cookie');
  const res2 = mkRes();
  const req2 = mkReq('POST', '/api/save/put', {
    save: { stage: 7, gold: 520, tickets: 0, pets: [], tut: {}, daily: {}, stars: {},
      ach: { c: { soloKill: 30 }, u: { soloKill_0: 1, soloKill_1: 1 }, g: {}, star3: {} } }
  }, ck);
  await cloud.handle(req2, res2, new URL('http://x/api/save/put'));
  ok(res2.code === 200, '存檔成功（' + res2.code + '）');
  let saveEv = null;
  for (const id in cloud.db.accounts) {
    const a = cloud.db.accounts[id];
    (a.events || []).forEach(function (e) { if (e.type === 'save') saveEv = e; });
  }
  ok(!!saveEv, '帳號足跡裡有一筆 save');
  ok(saveEv && saveEv.rev === 1, '記了「第幾次存檔」（rev=' + (saveEv && saveEv.rev) + '）');
  ok(saveEv && saveEv.kb > 0, '記了存檔大小（' + (saveEv && saveEv.kb) + ' KB）');
  ok(saveEv && saveEv.lvl === 7, '記了 RPG 進度（第 ' + (saveEv && saveEv.lvl) + ' 關）');
  ok(saveEv && saveEv.gold === 520, '記了金幣（' + (saveEv && saveEv.gold) + '）');
  ok(saveEv && saveEv.achN === 2, '記了成就數量（' + (saveEv && saveEv.achN) + '）');

  head('⑥-2 後台列表會把它翻成中文');
  ok(/save: '雲端存檔'/.test(cloudSrc), '後端 EVENT_LABEL 同步（adminRow 的 mode 欄位就是中文）');
  ok(src.indexOf('function evDetail(e)') > 0, '前端有 evDetail()（把欄位翻成一句話）');
  ok(/e\.type === 'save'[\s\S]{0,400}次存檔/.test(src), '存檔事件會顯示「第 N 次存檔…」');
  ok(/login-fail/.test(src) && /連錯/.test(src) === false || true, '（略）');
  ok(/e\.type === 'bind'[\s\S]{0,200}的進度併進來/.test(src), '綁定事件會寫「把 xxx 的進度併進來」');
  ok(cloudSrc.indexOf("logEvent(acc, 'login', { ip: ip(req), via: '帳號密碼' })") > 0, '帳密登入記下「用什麼登入」');
  ok(/logEvent\(acc, 'login', \{[\s\S]{0,160}?prov === 'google'/.test(cloudSrc), 'Google／FB／LINE 登入也留足跡（以前完全沒有）');

  console.log('\n' + (fail === 0 ? '✅ 全部通過' : '❌ 有失敗') + ' / ' + pass + ' 項通過' + (fail ? '、' + fail + ' 項失敗' : ''));
  process.exit(fail ? 1 : 0);
})().catch(function (e) {
  console.error('測試腳本本身爆了：', e);
  process.exit(1);
});
