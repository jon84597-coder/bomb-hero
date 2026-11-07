// v5.5 驗證：
//   ① 縮小看大地圖（42%~100%）時的「我在這裡」定位標示
//   ② 首頁 🛠 小圖示已移除（入口仍在）
//   ③ 後台：拜訪人數（歷史／當日）＋ 會員名單排序 ＋ 累計遊玩時間真的有累加
// 跑法：node test/verify-v505.js
const fs = require('fs');
const path = require('path');
const http = require('http');
const { makeEnv } = require('./_sandbox');

let pass = 0, fail = 0;
function ok(cond, msg, extra) {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ FAIL: ' + msg + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}
function head(s) { console.log('\n' + s); }

const SRC = require('./_sandbox').rawHtml;
const CLOUD = fs.readFileSync(path.join(__dirname, '..', '..', 'cloud.js'), 'utf8');
const SERVER = fs.readFileSync(path.join(__dirname, '..', '..', 'server.js'), 'utf8');
const env = makeEnv();
const B = env.BH, G = env.G;

// ---------------------------------------------------------------
head('① 縮小看大地圖的「我在這裡」標示');
ok(typeof B.drawSelfPin === 'function' && typeof B.selfPinAlpha === 'function', 'drawSelfPin / selfPinAlpha 存在');
G.state = 'play';
// v5.8：前 5 秒不管縮放都畫（開局最重要的就是找到自己在哪）；
//       五秒後只有大逃殺留著，而且回到原本「42%~100%」這一段的規則。
G._meT = 0; G.mode = 'br';
G.zoom = 1;    ok(B.selfPinAlpha() === 1, 'v5.8：前 5 秒連 100% 都看得到（開局找自己）');
G._meT = 9;    // 五秒後
G.zoom = 1;    ok(B.selfPinAlpha() === 0, '五秒後 100% 不畫（角色本來就看得見）');
G.zoom = .99;  ok(B.selfPinAlpha() === 0, '99% 也還不畫');
G.zoom = .9;   const a90 = B.selfPinAlpha(); ok(a90 > 0 && a90 < 1, '90% 淡入中（' + a90.toFixed(2) + '）');
G.zoom = .42;  ok(B.selfPinAlpha() === 1, '42%（最小）全亮');
G.zoom = .6;   ok(B.selfPinAlpha() === 1, '60% 全亮');
G.zoom = .6; G.state = 'over';  ok(B.selfPinAlpha() === 0, '結束畫面不畫');
G.zoom = .6; G.state = 'idle';  ok(B.selfPinAlpha() === 0, '選單狀態不畫');
G.state = 'play';
// v5.8：非大逃殺 → 五秒後就算縮到 42% 也不畫
['solo', 'rpg', 'battle'].forEach(function (m) {
  G.mode = m; G._meT = 9; G.zoom = .42;
  ok(B.selfPinAlpha() === 0, 'v5.8：' + m + ' 五秒後收掉（縮到 42% 也不畫）');
  G._meT = 0;
  ok(B.selfPinAlpha() === 1, 'v5.8：' + m + ' 前五秒還是看得到');
});
G.mode = 'br'; G._meT = 9;

// 螢幕座標換算：zoom=1、cam=0 時，世界座標＝螢幕座標
G.zoom = 1; G.camX = 0; G.camY = 0;
const sp1 = B.playerScreenPos({ x: 100, y: 60 });
ok(Math.abs(sp1.x - 100) < .001 && Math.abs(sp1.y - 60) < .001, '100% 時世界座標 = 螢幕座標', sp1);
G.zoom = .5;
const sp2 = B.playerScreenPos({ x: 100, y: 60 });
// 螢幕中心 + 0.5 *（世界點相對畫面中心的偏移）
const W = 720, H = 540;
ok(Math.abs(sp2.x - (W / 2 + .5 * (100 - W / 2))) < .001, '50% 時以畫面中心縮放（x=' + sp2.x + '）');
ok(Math.abs(sp2.y - (H / 2 + .5 * (60 - H / 2))) < .001, '50% 時以畫面中心縮放（y=' + sp2.y + '）');

// 真的會畫：故意把玩家放在畫面中央，數 arc() 呼叫
function countPin(zoom, mode, meT) {
  G.zoom = zoom;
  G.state = 'play';
  G.mode = mode || 'br';
  G._meT = (meT === undefined) ? 9 : meT;   // 預設「五秒後」
  G.T = 32; G.gameT = 1.2;
  G.players = [B.makePlayer(0, 0, null, { x: 5, y: 5, px: 5.5 * 32, py: 5.5 * 32 })];
  G.players[0].alive = true;
  G.players[0].x = W / 2; G.players[0].y = H / 2;
  G.camX = 0; G.camY = 0;
  env.rec.calls.length = 0;
  B.drawSelfPin();
  return env.rec.calls.filter(function (c) { return c[0] === 'arc'; }).length;
}
const n100 = countPin(1);
const n50 = countPin(.5);
ok(n100 === 0, '五秒後（大逃殺）100% 時一個 arc 都不畫（' + n100 + '）');
ok(n50 >= 4, '五秒後（大逃殺）50% 時畫出定位環＋箭頭（arc 呼叫 ' + n50 + ' 次）');

// v5.8：五秒內四個模式都畫（連 100% 也畫）；五秒後只有大逃殺留著
['solo', 'rpg', 'battle', 'br'].forEach(function (m) {
  ok(countPin(.5, m, 0) >= 4, m + ' 前五秒有定位標示（' + countPin(.5, m, 0) + '）');
  ok(countPin(1, m, 0) >= 4, m + ' 前五秒連 100% 也有（' + countPin(1, m, 0) + '）');
});
['solo', 'rpg', 'battle'].forEach(function (m) {
  ok(countPin(.5, m, 9) === 0, 'v5.8：' + m + ' 五秒後不再畫定位環');
});
ok(countPin(.5, 'br', 9) >= 4, 'v5.8：大逃殺五秒後繼續畫（' + countPin(.5, 'br', 9) + '）');

// 死亡/沒有玩家 → 不畫（不能畫在 0,0）
G.zoom = .5; G.players[0].alive = false; G.players[0].cart = null;
env.rec.calls.length = 0;
B.drawSelfPin();
ok(env.rec.calls.filter(function (c) { return c[0] === 'arc'; }).length === 0, '玩家已死（也沒有推車）→ 不畫');
ok(/try \{ drawSelfPin\(\); \} catch/.test(SRC), 'render() 有呼叫 drawSelfPin（且包在 try 裡）');
ok(/const SELF_PIN_R = 15;/.test(SRC), '標示半徑固定 15px（不隨縮放變小）');

// ---------------------------------------------------------------
head('② 首頁 🛠 小圖示已移除');
ok(!/id="devBtn"/.test(SRC), '沒有 #devBtn');
ok(!/devbtn/.test(SRC), '沒有殘留 .devbtn');
ok(/const toggle = function \(\) \{ if \(A\.open\) close\(\); else open\(\); \};/.test(SRC), '後台 toggle 還在');
ok(/addEventListener\('keydown', function \(e\) \{\s*const isD/.test(SRC), 'Ctrl+Alt+D 入口還在');
ok(/indexOf\('admin=1'\)/.test(SRC), '?admin=1 入口還在');

// ---------------------------------------------------------------
head('③ 後台：拜訪人數');
ok(/id="bhVisits"/.test(SRC), '總覽頁有拜訪紀錄容器 #bhVisits');
ok(/function renderVisits\(st\)/.test(SRC), '有 renderVisits()');
['歷史訪客', '今日訪客', '歷史瀏覽', '今日瀏覽'].forEach(function (k) {
  ok(SRC.indexOf("'"+k+"'") > 0, '統計格有「' + k + '」');
});
ok(/renderVisits\(r\.stats\)/.test(SRC), 'refresh() 會畫拜訪紀錄');

head('③b 後端：/api/visit');
ok(/p === '\/api\/visit'/.test(CLOUD), 'cloud.js 有 /api/visit 路由');
ok(/const isVisit = \(p === '\/api\/visit'\)/.test(CLOUD), '/api/visit 不需要登入');
ok(/visitRecord\(hash\)/.test(CLOUD), '會寫入拜訪紀錄（裝置雜湊去重）');
ok(/visits: db\.visits/.test(CLOUD), 'visits 是獨立分片（改數字不用重推帳號）');
ok(/if \(key === 'visits'\)/.test(CLOUD), 'applyPart 認得 visits 分片');
ok(/url\.pathname === '\/api\/visit'/.test(SERVER), 'server.js 路由白名單有 /api/visit');
ok(/visitors: vo\.uv, visitPv: vo\.pv/.test(CLOUD), 'overview 有回傳訪客數字');
ok(/visits: visitOut\(\)/.test(CLOUD), 'dump 有整包拜訪紀錄');

// ---------------------------------------------------------------
head('④ 後台：會員名單排序');
const A = B.Admin.state;
const SORTS = B.Admin.SORTS;
['lastDesc', 'lastAsc', 'online', 'joinDesc', 'joinAsc', 'loginDesc', 'loginAsc', 'playDesc', 'memberFirst', 'nameAsc']
  .forEach(function (k) { ok(!!SORTS[k], '排序選項 ' + k + '：' + (SORTS[k] || '缺')); });
ok(/id="bhSort"/.test(SRC), '會員頁有排序下拉 #bhSort');
ok(/sel\.innerHTML = Object\.keys\(SORTS\)\.map/.test(SRC), '選項由 SORTS 動態產生（單一來源）');
ok(/localStorage\.setItem\(SORT_KEY, A\.sort\)/.test(SRC), '排序選擇會記住');

const now = Date.now();
const rows = [
  { id: 'a', name: 'Zoe', kind: 'guest', created: now - 9000, lastSeen: now - 1000, logins: 3, playSec: 10 },
  { id: 'b', name: 'Amy', kind: 'member', created: now - 1000, lastSeen: now - 9 * 60000, logins: 40, playSec: 900 },
  { id: 'c', name: 'Bob', kind: 'member', created: now - 5000, lastSeen: now - 100, logins: 1, playSec: 0 },
  { id: 'd', name: 'Cid', kind: 'guest', created: now - 3000, lastSeen: now - 20 * 60000, logins: 12, playSec: 300 }
];
function order(sort) { A.sort = sort; return B.Admin._sort(rows).map(function (r) { return r.id; }).join(''); }
ok(order('lastDesc') === 'cabd', '最後上線 新→舊：' + order('lastDesc'));
ok(order('lastAsc') === 'dbac', '最後上線 舊→新：' + order('lastAsc'));
ok(order('online') === 'cabd', '在線優先（5 分鐘內）：' + order('online'));
ok(order('joinDesc') === 'bdca', '加入時間 新→舊：' + order('joinDesc'));
ok(order('joinAsc') === 'acdb', '加入時間 舊→新：' + order('joinAsc'));
ok(order('loginDesc') === 'bdac', '登入次數 多→少：' + order('loginDesc'));
ok(order('loginAsc') === 'cadb', '登入次數 少→多：' + order('loginAsc'));
ok(order('playDesc') === 'bdac', '遊玩時間 長→短：' + order('playDesc'));
ok(order('memberFirst') === 'bcda', '註冊會員優先（同類再依加入時間新→舊）：' + order('memberFirst'));
ok(order('nameAsc') === 'bcda', '名稱 A→Z：' + order('nameAsc'));
ok(B.Admin.ONLINE_MS === 300000, '在線判定＝最後心跳 5 分鐘內');
ok(SRC.indexOf("'　遊玩 ' + fmtDur(a.playSec || 0)") > 0, '名單每一列都顯示遊玩時間');

// ---------------------------------------------------------------
head('⑤ 累計遊玩時間（前端 PlayStat）');
const PS = B.PlayStat;
ok(!!PS, 'PlayStat 存在');
PS._reset();
G.state = 'play'; G.mode = 'solo';
PS.tick(.5); PS.tick(.5); PS.tick(.5); PS.tick(.5);
ok(PS.state().local === 2, 'playing 才累加（' + PS.state().local + ' 秒）');
G.state = 'title'; PS.tick(.5);
ok(PS.state().local === 2, '非 play 狀態不累加（選單／結算不算）');
G.state = 'play'; G.mode = 'map'; PS.tick(.5);
ok(PS.state().local === 2, '地圖測試（map）不算遊玩');
['solo', 'rpg', 'battle', 'br'].forEach(function (m) {
  PS._reset(); G.state = 'play'; G.mode = m; PS.tick(.5); PS.tick(.5);
  ok(PS.state().local === 1, '模式 ' + m + ' 會累加（1 秒）');
});
PS._reset();
G.state = 'play'; G.mode = 'solo'; PS.tick(.9);
ok(PS.state().local === 0, 'dt 異常（>0.5 秒，例如分頁被凍結）不計入');
G.state = 'play'; G.mode = 'solo';
for (let i = 0; i < 40; i++) PS.tick(.5);
ok(PS.pending() === 20, 'pending 回報「還沒送出的秒數」（' + PS.pending() + '）');
ok(PS.MAX_PER_POST === 7200, '單次最多送 2 小時（後端也夾一次）');
ok(typeof PS.flush().then === 'function', 'flush() 回傳 thenable（沒 session 時直接略過）');
ok(/\/api\/rpg\/play/.test(SRC), '前端會打 /api/rpg/play');
ok(/const cap = 86400 \* 365 \* 5;/.test(CLOUD), '後端有總量上限（5 年）');
ok(/acc\.playSec = Math\.min\(cap, \(acc\.playSec \| 0\) \+ add\)/.test(CLOUD), '後端是「加法」累積（不是 Math.max）');
ok(/playSec: \(a\.playSec \| 0\) \|\| \(a\.rpg/.test(CLOUD), 'adminRow 回傳帳號層級的 playSec');
ok(/'累計遊玩', fmtDur\(a\.playSec/.test(SRC), '會員詳情顯示累計遊玩');

// ---------------------------------------------------------------
head('⑥ 後端整合：真的開一台伺服器打 /api/visit 與 /api/rpg/play');
const { createCloud } = require('../../cloud.js');
const cloud = createCloud({ persist: false, env: {} });
const srv = http.createServer(function (req, res) {
  const url = new URL(req.url, 'http://127.0.0.1');
  cloud.handle(req, res, url).then(function (done) {
    if (!done) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); }
  }, function () { try { res.writeHead(500); res.end('{}'); } catch (e) {} });
});

function post(base, p, body, cookie) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  return fetch(base + p, { method: 'POST', headers: headers, body: JSON.stringify(body || {}) })
    .then(function (r) {
      const sc = r.headers.get('set-cookie') || '';
      return r.json().then(function (j) { return { status: r.status, json: j, cookie: sc }; });
    });
}

cloud.ready.then(function () {
  return new Promise(function (res) { srv.listen(0, '127.0.0.1', res); });
}).then(function () {
  const base = 'http://127.0.0.1:' + srv.address().port;
  return post(base, '/api/visit', { deviceId: 'dev-aaaaaaaa-1111' }).then(function (r) {
    ok(r.json.ok && r.json.uv === 1 && r.json.today.uv === 1, '第一位訪客：uv=1（' + JSON.stringify(r.json) + '）');
    return post(base, '/api/visit', { deviceId: 'dev-aaaaaaaa-1111' });
  }).then(function (r) {
    ok(r.json.ok && r.json.pv === 2 && r.json.uv === 1, '同一台再訪：pv=2、uv 仍 1（不重複算人）');
    return post(base, '/api/visit', { deviceId: 'dev-bbbbbbbb-2222' });
  }).then(function (r) {
    ok(r.json.ok && r.json.uv === 2 && r.json.today.uv === 2, '第二台裝置：uv=2');
    return post(base, '/api/visit', { deviceId: 'x' });
  }).then(function (r) {
    ok(r.status === 400 && r.json.err === 'BAD_DEVICE', '裝置 id 太短 → 400 BAD_DEVICE');
    return post(base, '/api/auth/guest', { deviceId: 'dev-cccccccc-3333' });
  }).then(function (r) {
    ok(r.json.ok && r.json.account && r.json.account.id, '拿到遊客session（' + (r.cookie ? '有 cookie' : '沒 cookie') + '）');
    const ck = String(r.cookie || '').split(';')[0];
    return post(base, '/api/rpg/play', { sec: 125 }, ck).then(function (p1) {
      ok(p1.json.ok && p1.json.playSec === 125, '回報 125 秒 → playSec=125');
      return post(base, '/api/rpg/play', { sec: 75 }, ck);
    }).then(function (p2) {
      ok(p2.json.ok && p2.json.playSec === 200, '再回報 75 秒 → 累加成 200（不是取大）');
      return post(base, '/api/rpg/play', { sec: 0 }, ck);
    }).then(function (p3) {
      ok(p3.status === 400 && p3.json.err === 'BAD_SEC', 'sec=0 → 400 BAD_SEC');
      return post(base, '/api/rpg/play', { sec: 99 * 3600 }, ck);
    }).then(function (p4) {
      ok(p4.json.playSec === 200 + 7200, '單次夾在 2 小時（' + p4.json.playSec + '）');
      return post(base, '/api/rpg/play', { sec: 60 }, '');
    });
  }).then(function (r) {
    ok(r.status === 401 && r.json.err === 'NO_SESSION', '沒有 session → 401（不會亂加別人的時間）');
    const db = cloud.db;
    const hashes = Object.keys(db.visits.dev);
    ok(hashes.length === 2, '裝置表只存雜湊、共 2 筆（' + hashes.length + '）');
    ok(hashes.every(function (h) { return /^[0-9a-f]{16}$/.test(h); }), '雜湊格式正確（16 碼 hex，不含原始 id）');
    ok(db.visits.pv === 3, '總瀏覽次數 pv=3');
    const day = Object.keys(db.visits.days)[0];
    ok(!!day && /^\d{4}-\d{2}-\d{2}$/.test(day), '日期 key 是 YYYY-MM-DD（' + day + '）');
    const acc = Object.keys(db.accounts).map(function (k) { return db.accounts[k]; })[0];
    ok(acc && acc.playSec === 200 + 7200, '帳號上的 playSec 真的累積了（' + (acc && acc.playSec) + '）');
    const ov = cloud._internals.adminOverview();
    ok(ov && ov.ok, 'adminOverview() 跑得起來');
    ok(ov.stats.visitors === 2 && ov.stats.visitPv === 3, '總覽統計帶出歷史訪客／瀏覽（' + ov.stats.visitors + '/' + ov.stats.visitPv + '）');
    ok(ov.stats.visitToday === 2 && ov.stats.visitPvToday === 3, '總覽統計帶出今日訪客／瀏覽');
    ok(Array.isArray(ov.stats.visitDays) && ov.stats.visitDays.length === 1 && ov.stats.visitDays[0].uv === 2,
      'visitDays 有當天的點（uv=2）');
    const row = ov.accounts.filter(function (a) { return a.id === acc.id; })[0];
    ok(row && row.playSec === 7400, 'adminRow.playSec 帶出累積時間（' + (row && row.playSec) + '）');
    ok(row && row.online === true, 'adminRow.online 判定為在線（剛剛才回報過）');
  });
}).catch(function (e) {
  ok(false, '後端整合測試爆掉', e && e.message);
}).then(function () {
  try { srv.close(); } catch (e) {}
  console.log('\n' + (fail === 0 ? '✅' : '❌') + ' v5.5：' + pass + ' 通過 / ' + fail + ' 失敗');
  process.exit(fail ? 1 : 0);
});
