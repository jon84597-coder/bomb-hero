/* ================================================================
   v5.89 驗收：開發者「玩家後台資料卡」
   ---------------------------------------------------------------
   需求：開發者在遊戲裡點到某個玩家時，除了公開名片（八格數字）之外，
   要能直接看這個人的後台詳細資料；一般玩家看不到這個入口。

   ① 後端 /api/admin/player 接受社交編號 pid（p_xxxxxxxxxx）→ 換成帳號
   ② 回應帶 soc（社交身分）／save（存檔摘要）／sameName（同名歧義）
   ③ 權限：沒 session → 401、不是開發者 → 403（前端藏按鈕不是防線）
   ④ 只有社交身分、還沒上傳存檔的人 → 200 + account:null（不是 404）
   ⑤ 前端：好友資料頁的「🛠 後台資料」按鈕，非開發者的 DOM 裡不存在
   ⑥ 玩家名片（playercard）同樣只在 isDev 時組出按鈕
   ⑦ devcard.js 走 same-origin（後台需要 cookie）、不把請求計進公開統計
   ⑧ Admin.player() 可以從外部定位到某個帳號（「完整後台」用）
   ================================================================ */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { EventEmitter } = require('events');
const { makeEnv } = require('./_sandbox');

const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'js/main.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const pcSrc = fs.readFileSync(path.join(ROOT, 'js/playercard.js'), 'utf8');
const dcPath = path.join(ROOT, 'js/devcard.js');
const dcSrc = fs.readFileSync(dcPath, 'utf8');
const cloudMod = require(path.join(ROOT, '..', 'cloud.js'));

let pass = 0, fail = 0;
function ok(c, m, x) {
  if (c) { pass++; console.log('  ✓ ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); }
  else { fail++; console.log('  ✗ FAIL: ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }

const env = makeEnv();
const P = env.BH;
const Soc = P.Social;
const S = Soc._s;

function mkReq(method, url, body, cookie) {
  const req = new EventEmitter();
  req.method = method; req.url = url;
  req.headers = { 'content-type': 'application/json' };
  if (cookie) req.headers.cookie = cookie;
  const s = body === undefined ? '' : JSON.stringify(body);
  req.headers['content-length'] = Buffer.byteLength(s);
  req.setEncoding = function () {};
  setTimeout(function () { if (s) req.emit('data', s); req.emit('end'); }, 0);
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
function noFetch() {
  return function () {
    return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve([]); }, text: function () { return Promise.resolve('[]'); } });
  };
}
function cookieOf(res) {
  const v = res.headers['Set-Cookie'] || res.headers['set-cookie'] || '';
  return String(v).split(';')[0];
}

/* 好友資料頁：把 detail 視圖畫進沙盒 DOM，回傳字串 */
function paintDetail(sel) {
  S.view = 'detail';
  S.sel = sel;
  Soc.render();
  const el = env.getId('onBody');
  return String((el && el.innerHTML) || '');
}

(async function main() {

  /* ─────────────────────────────────────── ① 後端：pid → 帳號 */
  head('① 後端：社交編號 → 帳號（/api/admin/player?pid=）');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bh-v589-'));
  const cloud = cloudMod.createCloud({ dir: dir, persist: true, env: {}, fetch: noFetch() });
  await cloud.ready;

  async function call(method, u, body, cookie) {
    const res = mkRes();
    await cloud.handle(mkReq(method, u, body, cookie), res, new URL('http://x' + u));
    let j = {};
    try { j = JSON.parse(res.body || '{}'); } catch (e) {}
    return { code: res.code, j: j, res: res, cookie: cookieOf(res) };
  }

  /* 開發者帳號 */
  let r = await call('POST', '/api/auth/guest', { deviceId: 'dev-aaaaaaaa-1111' });
  const devCookie = r.cookie;
  const devId = r.j.account && r.j.account.id;
  ok(!!devCookie && !!devId, '開發者帳號建立並取得 session cookie', { id: devId });
  cloud.db.accounts[devId].dev = true;
  cloud.db.accounts[devId].name = '開發者';

  /* 受測玩家（一般帳號） */
  r = await call('POST', '/api/auth/guest', { deviceId: 'dev-bbbbbbbb-2222' });
  const userCookie = r.cookie;
  const userId = r.j.account && r.j.account.id;
  ok(!!userId, '一般玩家帳號建立', { id: userId });
  cloud.db.accounts[userId].name = '小明';
  cloud.db.accounts[userId].save = {
    stage: 12, gold: 3400, tickets: 2,
    pets: [{ kind: 'dog', ch: 3, lv: 4 }],
    skins: { own: { a: 1, b: 1 } },
    stars: { '1': 3, '2': 2 },
    daily: { '2026-11-10': 83000 },
    ach: { u: { a: 1, b: 1, c: 1 } },
    tut: { home: true, play: false }
  };

  /* 讓他在社交名單裡出現（名字要跟帳號一致才對得上） */
  r = await call('POST', '/api/social/hb', { deviceId: 'dev-bbbbbbbb-2222', name: '小明', mode: '大逃殺', st: 'busy' });
  const pidB = r.j.me.pid;
  ok(/^p_[0-9a-f]{10}$/.test(pidB), '取得社交編號', { pid: pidB });

  /* 加一個好友、一則私訊，驗 soc 統計 */
  r = await call('POST', '/api/social/hb', { deviceId: 'dev-cccccccc-3333', name: '小華' });
  const pidC = r.j.me.pid;
  await call('POST', '/api/social/act', { deviceId: 'dev-bbbbbbbb-2222', action: 'friend', target: pidC });
  await call('POST', '/api/social/act', { deviceId: 'dev-cccccccc-3333', action: 'accept', target: pidB });
  await call('POST', '/api/social/dm', { deviceId: 'dev-cccccccc-3333', to: pidB, text: '嗨' });
  await call('POST', '/api/social/dm', { deviceId: 'dev-bbbbbbbb-2222', to: pidC, text: '你好' });

  /* ── 開發者查 pid ── */
  r = await call('GET', '/api/admin/player?pid=' + pidB, null, devCookie);
  ok(r.code === 200 && r.j.ok === true, '開發者用 pid 查得到', { code: r.code });
  ok(r.j.account && r.j.account.id === userId, '★ pid 正確對到帳號（靠名字）', r.j.account && r.j.account.id);
  ok(r.j.account.name === '小明', '回傳帳號名字');
  ok(r.j.soc && r.j.soc.found === 1 && r.j.soc.pid === pidB, '回應帶社交身分（soc）');
  ok(r.j.soc.nFriends === 1, '★ soc 帶好友數', r.j.soc.nFriends);
  ok(r.j.soc.dm === 2, '★ soc 帶私聊訊息數（兩個對話各一則）', r.j.soc.dm);
  ok(r.j.soc.st === 'busy' && r.j.soc.mode === '大逃殺', 'soc 帶狀態與遊樂區域');
  ok(r.j.soc.online === true, 'soc 標記在線');

  /* ── 存檔摘要 ── */
  const sv = r.j.save;
  ok(sv && sv.stage === 12 && sv.gold === 3400 && sv.tickets === 2, '★ 存檔摘要：關卡／金幣／票券', sv && [sv.stage, sv.gold, sv.tickets]);
  ok(sv.pets.length === 1 && sv.pets[0].kind === 'dog' && sv.pets[0].lv === 4,
    '★ 隨從保留下來（含等級 —— v5.86 就是在這裡吃過虧）', sv.pets);
  ok(sv.stars === 5, '★ 星數是逐關加總（3+2）', sv.stars);
  ok(sv.skins === 2, '外觀擁有數', sv.skins);
  ok(sv.achN === 3, '成就解鎖數', sv.achN);
  ok(sv.daily['2026-11-10'] === 83000, '每日最佳帶得回來');
  ok(sv.tut && sv.tut.home === true && sv.tut.play === false, '教學進度');

  /* ── 用名字查也要通 ── */
  r = await call('GET', '/api/admin/player?q=' + encodeURIComponent('小明'), null, devCookie);
  ok(r.code === 200 && r.j.account && r.j.account.id === userId, '★ 用名字查也找得到同一個帳號');

  /* ── 同名歧義 ── */
  head('② 同名：要標出「有幾個帳號叫這個名字」');
  const dup = cloudMod.__mkDup ? null : null;   // 佔位，實際用 guest 再改名
  r = await call('POST', '/api/auth/guest', { deviceId: 'dev-dddddddd-4444' });
  const dupId = r.j.account.id;
  cloud.db.accounts[dupId].name = '小明';
  r = await call('GET', '/api/admin/player?pid=' + pidB, null, devCookie);
  ok(r.j.sameName === 2, '★ 兩個同名帳號 → sameName=2（面板會提示看的是哪一個）', r.j.sameName);
  ok(r.j.account.name === '小明', '同名時回傳的仍是「小明」（取最近活躍的那一個）', r.j.account.name);
  delete cloud.db.accounts[dupId];

  /* ─────────────────────────────────────── ③ 權限 */
  head('③ 權限：前端藏按鈕不是防線');
  r = await call('GET', '/api/admin/player?pid=' + pidB, null, null);
  ok(r.code === 401 && r.j.err === 'NO_SESSION', '★ 沒有 session → 401 NO_SESSION', { code: r.code, err: r.j.err });
  r = await call('GET', '/api/admin/player?pid=' + pidB, null, userCookie);
  ok(r.code === 403 && r.j.err === 'NOT_DEV', '★ 一般玩家帳號 → 403 NOT_DEV', { code: r.code, err: r.j.err });
  r = await call('POST', '/api/save/get', {}, userCookie);
  ok(r.code === 200, '（對照）一般玩家自己的存檔接口是通的，擋的只有後台');

  /* ─────────────────────────────────────── ④ 只有社交身分 */
  head('④ 只有社交身分、還沒上傳存檔的人');
  r = await call('GET', '/api/admin/player?pid=' + pidC, null, devCookie);
  /* 小華 也是 guest 帳號（名字 遊客），所以名字對不上 → 應該回 200 但 account 為 null */
  ok(r.code === 200, '★ 不是 404，而是 200（社交資料是有的）', { code: r.code });
  ok(r.j.account === null, 'account 為 null（沒有對應帳號）', r.j.account);
  ok(r.j.soc && r.j.soc.found === 1 && r.j.soc.name === '小華', '★ 社交資料照樣回得來');

  r = await call('GET', '/api/admin/player?pid=p_ffffffffff', null, devCookie);
  ok(r.code === 404 && r.j.err === 'NOT_FOUND', '完全查無此人也沒有社交紀錄 → 404', { code: r.code });

  /* ─────────────────────────────────────── ⑤ 前端：好友資料頁 */
  head('⑤ 好友資料頁：按鈕只給開發者');
  const sel = { pid: pidB, name: '小明', kind: 'guest', gender: '男', region: '台北',
    join: Date.now() - 86400000, sec: 3600, pts: 12, wins: 1, mode: '大逃殺', st: 'busy', stx: '',
    tt: -1, avt: 0, eq: [], seen: Date.now() };
  S.friends = []; S.blocks = []; S.reqs = []; S.list = []; S.fdata = [];

  P.setDevBuild(false);
  let h = paintDetail(sel);
  ok(h.indexOf('onDev') < 0, '★ 一般玩家（DEV_BUILD=false）的 DOM 裡沒有 #onDev');
  ok(h.indexOf('onFriend') > 0, '（對照）加好友按鈕正常存在');

  P.setDevBuild(true);
  h = paintDetail(sel);
  ok(h.indexOf('id="onDev"') > 0, '★ 開發者看得到「🛠 後台資料」');
  ok(h.indexOf('後台資料') > 0, '按鈕文字正確');
  ok(/onDev[\s\S]{0,200}#2b3a55/.test(h) || h.indexOf('#2b3a55') > 0, '按鈕用深色（跟暖色遊戲 UI 區隔）');

  /* 自己看自己不顯示（避免誤點自己） */
  S.me = { pid: pidB, name: '小明' };
  h = paintDetail(sel);
  ok(h.indexOf('id="onDev"') < 0 && h.indexOf('這是你自己') > 0, '看自己的資料時不顯示後台按鈕');
  S.me = null;
  P.setDevBuild(false);

  /* ─────────────────────────────────────── ⑥ 玩家名片 */
  head('⑥ 玩家名片（playercard）：同樣只給開發者');
  ok(pcSrc.indexOf("id=\"pcDev\"") > 0, '名片有 #pcDev 按鈕');
  ok(/if \(DC && typeof DC\.isDev === 'function' && DC\.isDev\(\) && \(d\.pid \|\| n\)\)/.test(pcSrc),
    '★ 按鈕的條件包含 isDev()（不是開發者時字串根本不會被組出來）');
  ok(/function devOpen\(\)[\s\S]{0,400}?DC\.open\(\{ pid: cur\.pid, name: cur\.n \}\)/.test(pcSrc),
    '★ 點下去把 pid 與名字交給 devcard');
  ok(/\} catch \(e0\) \{ devBtn = ''; \}/.test(pcSrc), '取不到 devcard 時不會壞掉（按鈕直接不顯示）');
  ok(pcSrc.indexOf('#dvcModal') > 0 || pcSrc.indexOf(',#pcModal') > 0, '名片不再攔截開發者面板內的點擊');

  /* ─────────────────────────────────────── ⑦ devcard.js */
  head('⑦ devcard.js：獨立模組、走後台權限');
  ok(dcSrc.indexOf('window.__BHDevCard') > 0, '對外暴露 __BHDevCard');
  ok(/credentials: 'same-origin'/.test(dcSrc), '★ 請求帶 same-origin（後台靠 session cookie 認人）');
  ok(dcSrc.indexOf("'/api/admin/player?") > 0, '★ 打的是 /api/admin/player（後端會驗 isDev）');
  ok(/if \(!isDev\(\)\) \{[\s\S]{0,120}?return false;/.test(dcSrc), '★ open() 自己再擋一次（非開發者直接 false）');
  ok(/function isDev\(\)[\s\S]{0,220}?\.isDev\(\)/.test(dcSrc) && dcSrc.indexOf("api('Cloud')") > 0,
    'isDev 取自 Cloud.isDev()（跟後台入口同一來源）');
  ok(dcSrc.indexOf('#e8eefb') > 0 && dcSrc.indexOf('#0e131b') > 0, '深色面板（跟遊戲的暖色 UI 區隔）');
  ok(/ST_NAME = \{ auto: '自動', busy: '忙碌'/.test(dcSrc), '狀態代號翻成人話');
  ok(/sameName \| 0\) > 1/.test(dcSrc), '同名時在面板上提示（避免看錯人）');
  ok(dcSrc.indexOf('dvFull') > 0 && dcSrc.indexOf('A.player(uid)') > 0,
    '「完整後台」會定位到同一個帳號');

  /* 真的在沙盒裡跑一次 isDev 判定（不需真實 DOM：只呼叫函式） */
  ok(dcSrc.indexOf('function load(opt)') > 0 && /_k: opt\._k/.test(dcSrc), '連點不同人時舊請求不會蓋掉新畫面（請求序號）');

  /* ─────────────────────────────────────── ⑧ 主檔整合 */
  head('⑧ 主檔整合');
  ok(html.indexOf('<script src="js/devcard.js"></script>') > 0, 'index.html 引入 devcard.js');
  ok(html.indexOf('js/playercard.js') < html.indexOf('js/devcard.js'), '★ devcard 排在 playercard 之後（名片才取得到它）');
  ok(/player: function \(id\) \{[\s\S]{0,200}?return pick\(w\);/.test(src), '★ Admin.player() 可以從外部定位帳號');
  ok(src.indexOf("id=\"onDev\"") > 0, '好友資料頁有 #onDev 按鈕');
  ok(/DC\.open\(\{ pid: S\.sel\.pid, name: S\.sel\.name \}\)/.test(src), '★ 好友頁把 pid 與名字交給 devcard');
  ok(/Cloud\.isDev && Cloud\.isDev\(\)[\s\S]{0,900}?id="onDev"/.test(src),
    '★ 按鈕用 Cloud.isDev() 判定（與後台入口同源）');
  // 這一支是 v5.89 的驗收，版本戳記只驗「不低於 5.89」——之後每一版升號都不該讓它紅
  const vm = src.match(/const VERSION = '([\d.]+)'/);
  const vh = html.match(/<span id="verTxt">([\d.]+)<\/span>/);
  const vnum = s => (s ? parseFloat(s) : 0);
  ok(!!vm && vnum(vm[1]) >= 5.89, '主檔版本 ≥ 5.89（實際 ' + (vm ? vm[1] : '?') + '）');
  ok(!!vh && vnum(vh[1]) >= 5.89, 'index.html 版本戳記 ≥ 5.89（實際 ' + (vh ? vh[1] : '?') + '）');

  /* 主檔預算 */
  const chars = src.length;
  ok(chars < 1950000, '主檔仍在預算內（' + chars.toLocaleString() + ' 字元 / 1,950,000）');

  console.log('\n────────────────────────────');
  console.log('通過 ' + pass + ' 項，失敗 ' + fail + ' 項');
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
  process.exit(fail ? 1 : 0);
})().catch(function (e) {
  console.error('EXCEPTION', e && e.stack || e);
  process.exit(1);
});
