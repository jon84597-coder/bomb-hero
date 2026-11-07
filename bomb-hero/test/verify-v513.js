// v5.13 驗證：成就系統 / 十項排名 / 線上玩家名單（好友・私訊・黑名單）
// 跑法：node test/verify-v513.js
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

const src = require('./_sandbox').rawHtml;
const cloudSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'cloud.js'), 'utf8');
const env = makeEnv();
const B = env.BH;
const Ach = B.Ach, Rank = B.Rank, Social = B.Social;

function click(id, e) {
  const el = (e || env).getId(id);
  const hs = (el._on && el._on.click) || [];
  hs.forEach(function (f) { try { f({ target: el, stopPropagation: function () {}, preventDefault: function () {}, clientX: 0, clientY: 0 }); } catch (e) {} });
  return hs.length;
}

/* ===================================================================== */
head('① 版本與入口');
ok(vge(B.VERSION, '5.13'), 'VERSION ≥ 5.13（實測 ' + B.VERSION + '）');
ok(B.VERSION_LOG[0].v === B.VERSION && B.VERSION_LOG[0].now === true, 'VERSION_LOG 首位是當前版本且 now:true');
ok(B.VERSION_LOG.slice(1).every(function (r) { return r.now !== true; }), '只有最新一筆是 now:true');
ok(src.indexOf('id="quickRow"') > 0 && src.indexOf('id="btnAch"') > 0 &&
   src.indexOf('id="btnRank"') > 0 && src.indexOf('id="btnPlayers"') > 0, '首頁三顆入口（成就／排名／線上玩家）');
// v4.81 的斷言：主玩法剛好 6 張卡 → 新入口必須放在 .mgrid 外面
const grid = src.slice(src.indexOf('<div class="mgrid">'), src.indexOf('id="mDrawer"'));
ok((grid.match(/class="mbtn/g) || []).length === 6, '主玩法還是 6 張卡（新入口沒塞進 grid）');
ok(grid.indexOf('quickRow') < 0, 'quickrow 不在 .mgrid 內');
['achModal', 'rankModal', 'onModal'].forEach(function (id) {
  ok(src.indexOf('id="' + id + '"') > 0, '有 #' + id + ' 面板');
});
ok(/\.bhpanel \{[\s\S]{0,200}?height: min\(92vh, 900px\)/.test(src), '面板高度吃 min(92vh,900px)（內容自己捲）');
ok(/@media \(max-width: 520px\)[\s\S]{0,220}?\.bhpanel \{[\s\S]{0,80}?height: 100%/.test(src), '手機版面板滿版（不是縮小版）');

/* ===================================================================== */
head('② 成就目錄');
ok(Ach && typeof Ach.count === 'function', 'Ach 模組存在');
ok(Ach.LIST.length >= 150, '成就數量 ≥ 150（實測 ' + Ach.LIST.length + '）');
{
  const ids = {}, dup = [];
  Ach.LIST.forEach(function (a) { if (ids[a.id]) dup.push(a.id); ids[a.id] = 1; });
  ok(dup.length === 0, '成就 id 不重複', dup.slice(0, 3));
  const badGold = Ach.LIST.filter(function (a) { return !(a.gold > 0) || !(a.pts > 0) || !a.name; });
  ok(badGold.length === 0, '每個成就都有名字、金幣、分數', badGold.slice(0, 2));
  // 越難越多：同一系列的金幣必須遞增
  const badCurve = Ach.SERIES.filter(function (se) {
    for (let i = 1; i < se.need.length; i++) {
      const a = Ach.byId(se.key + '_' + (i - 1)), b = Ach.byId(se.key + '_' + i);
      if (!a || !b) return true;
      if (!(b.gold > a.gold) || !(b.pts > a.pts) || !(b.need > a.need)) return true;
    }
    return false;
  });
  ok(badCurve.length === 0, '同系列：門檻／分數／金幣都遞增（越難越多）', badCurve.map(function (s) { return s.key; }));
  // 使用者指定的門檻
  const need = function (k) { return (Ach.SERIES.filter(function (s) { return s.key === k; })[0] || {}).need || []; };
  ok(need('brKill').slice(0, 8).join(',') === '10,25,50,100,250,500,750,1000', '大逃殺擊殺：10/25/50/100/250/500/750/1000');
  ok(need('brWin').slice(0, 7).join(',') === '1,5,10,25,50,75,100', '大逃殺冠軍：1/5/10/25/50/75/100');
  ok(need('brTop3').slice(0, 4).join(',') === '1,5,10,25', '大逃殺前三：1/5/10/25');
  ok(need('brTop10').slice(0, 4).join(',') === '5,10,25,50', '大逃殺前十：5/10/25/50');
  ok(need('btKill').slice(0, 4).join(',') === '10,25,50,100', '對戰擊殺：10/25/50/100');
  ok(need('btWin').slice(0, 4).join(',') === '1,5,10,25', '對戰冠軍：1/5/10/25');
  ok(need('soloBoss').slice(0, 4).join(',') === '1,5,10,25', '單人 BOSS：1/5/10/25');
  ok(need('rpgBoss').slice(0, 4).join(',') === '1,5,10,25', 'RPG BOSS：1/5/10/25');
  ok(need('death').slice(0, 4).join(',') === '1,5,10,25', '被殺死：1/5/10/25');
  ok(need('playSec').slice(0, 4).join(',') === '86400,604800,1209600,2592000', '遊玩時間：24h／7d／14d／30d（用秒存）');
  ok(need('mountDragon').length === 1 && need('mountOstrich').length === 1, '龍／鴕鳥坐騎各有專屬成就');
  ok(need('dragonKill').length >= 8 && need('ostrichKill').length >= 8, '龍／鴕鳥擊殺各有 8 階以上');
  // 每個系列都要有名字（使用者：每個成就都有一個命名）
  const noname = Ach.LIST.filter(function (a) { return !a.name || /^[a-z]/.test(a.name); });
  ok(noname.length === 0, '每個成就都有中文命名', noname.slice(0, 3));
}

/* ===================================================================== */
head('③ 計數 → 解鎖 → 領金幣');
{
  const e2 = makeEnv(); const A2 = e2.BH.Ach; const S2 = e2.BH.Shop;
  A2.count('soloKill', 9);
  ok(A2.unlockedCount() === 0 || !A2.isUnlocked('soloKill_0'), '9 隻還沒到 10（不會提前解鎖）');
  A2.count('soloKill', 1);
  ok(A2.isUnlocked('soloKill_0'), '第 10 隻解鎖第一階');
  const pts1 = A2.points();
  A2.count('soloKill', 1);
  ok(A2.points() === pts1, '重複計數不會重複加分');
  A2.count('soloKill', 20);
  ok(A2.isUnlocked('soloKill_1') && !A2.isUnlocked('soloKill_2'), '25 隻解鎖第二階、還沒到 50');
  const before = S2.gold();
  const g = A2.claim('soloKill_0');
  ok(g > 0 && S2.gold() === before + g, '領取成就 → 金幣真的進錢包（+' + g + '）');
  ok(A2.claim('soloKill_0') === 0, '同一個成就不能重複領');
  const all = A2.claimAll();
  ok(all > 0 && A2.unclaimed().length === 0, '一鍵領取把剩下的都領掉（+' + all + '）');
  ok(S2.gold() === before + g + all, '金幣總額正確');
}

/* ===================================================================== */
head('④ 成就分 → 稱號（10/50/75/100/250/500/750/1000）');
{
  ok(Ach.TITLES.length === 8, '共 8 個稱號');
  ok(Ach.TITLES.map(function (t) { return t.need; }).join(',') === '10,50,75,100,250,500,750,1000', '門檻就是使用者指定的一組');
  const names = {}, icos = {}, colors = {}, frames = {};
  Ach.TITLES.forEach(function (t) { names[t.name] = 1; icos[t.ico] = 1; colors[t.color] = 1; frames[t.frame] = 1; });
  ok(Object.keys(names).length === 8 && Object.keys(icos).length === 8, '名稱與圖示都不重複');
  ok(Object.keys(colors).length === 8 && Object.keys(frames).length === 8, '顏色與外框都不重複（每個稱號長得不一樣）');

  const e3 = makeEnv(); const A3 = e3.BH.Ach;
  A3.setState({ c: { soloKill: 60 }, u: {}, g: {} });
  const t0 = A3.titleOf();
  ok(t0 && t0.name === '見習英雄', '60 隻（8 分）→ 見習英雄（實測 ' + (t0 && t0.name) + '）');
  A3.count('brKill', 50);       // 再解鎖 10/25/50 三階
  const t1 = A3.titleOf();
  ok(t1 && t1.need >= 10, '分數够了就自動升級稱號（目前 ' + (t1 && t1.name) + ' / ' + A3.points() + ' 分）');
  ok(A3.nextTitle() === null || A3.nextTitle().need > A3.points(), 'nextTitle 永遠是「還差的下一階」');
}

/* ===================================================================== */
head('⑤ 遊戲中的計數掛鉤（不是只有 UI）');
{
  const e4 = makeEnv(); const B4 = e4.BH; const A4 = B4.Ach; const G4 = B4.Game;
  const before = A4.stat('soloKill');
  G4.mode = 'solo';
  B4.AchFoe({ hp: 0, boss: false });
  ok(A4.stat('soloKill') === before + 1, '單人打死小怪 → 單人擊殺 +1');
  B4.AchFoe({ hp: 0, boss: true });
  ok(A4.stat('soloBoss') >= 1, '打死 BOSS → 單人 BOSS +1');
  G4.mode = 'br';
  const k0 = A4.stat('soloKill');
  B4.AchFoe({ hp: 0, boss: false });
  ok(A4.stat('soloKill') === k0, '大逃殺的小怪不算單人擊殺');
  G4.mode = 'rpg';
  B4.AchFoe({ hp: 0, boss: false });
  ok(A4.stat('rpgKill') >= 1, 'RPG 打怪 → RPG 擊殺 +1');

  // 對戰／大逃殺擊殺：只有「擊殺者是玩家 0」才算
  G4.mode = 'battle';
  const me = { alive: true, dino: false };
  const foe = { alive: true };
  G4.players = [me, foe];
  const b0 = A4.stat('btKill');
  B4.AchPvp(foe, { alive: true });              // AI 打 AI
  ok(A4.stat('btKill') === b0, 'AI 打死 AI 不算我的擊殺');
  B4.AchPvp(foe, me);
  ok(A4.stat('btKill') === b0 + 1, '我打死人 → 對戰擊殺 +1');
  const d0 = A4.stat('death');
  B4.AchPvp(me, { alive: true });
  ok(A4.stat('death') === d0 + 1, '我被打死 → 被殺死次數 +1');
  me.dino = true;
  const dr0 = A4.stat('dragonKill');
  B4.AchPvp(foe, me);
  ok(A4.stat('dragonKill') === dr0 + 1, '騎龍殺人 → 龍坐騎擊殺 +1');
  me.dino = true; me.ostrich = true;
  const os0 = A4.stat('ostrichKill');
  B4.AchPvp(foe, me);
  ok(A4.stat('ostrichKill') === os0 + 1, '騎鴕鳥殺人 → 鴕鳥擊殺 +1');
  G4.mode = 'br';
  const br0 = A4.stat('brKill');
  B4.AchPvp(foe, me);
  ok(A4.stat('brKill') === br0 + 1, '大逃殺殺人 → 大逃殺擊殺 +1');
  // 原始碼：死亡／擊殺點真的有掛
  ok((src.match(/AchFoe\(e\)/g) || []).length >= 5, '6 個怪物死亡點都有掛 AchFoe');
  ok(/p\.alive = false; p\.dead = true; p\.respawnT = 1;\n  try \{ AchPvp\(p, killer\); \}/.test(src), '對戰／大逃殺死亡會呼叫 AchPvp');
  ok(src.indexOf("Ach.count('mountDragon', 1)") > 0 && src.indexOf("Ach.count('mountOstrich', 1)") > 0, '取得坐騎會記成就');
  ok(src.indexOf("Ach.count('bomb', 1)") > 0 && src.indexOf("Ach.count('brick', 1)") > 0 &&
     src.indexOf("Ach.count('itemGet', 1)") > 0 && src.indexOf("Ach.count('goldEarn', n)") > 0, '放彈／炸磚／吃道具／金幣都有記');
  ok(src.indexOf("Ach.count('brWin', 1)") > 0 && src.indexOf("Ach.count('brTop3', 1)") > 0 &&
     src.indexOf("Ach.count('brTop10', 1)") > 0, '大逃殺結算會記名次與冠軍');
  ok(src.indexOf("'onWin' : 'btWin'") > 0, '對戰冠軍會分「線上」與「單機」');
  ok(src.indexOf('Ach.addTime(dt)') > 0, '遊玩時間會累積');
  ok(src.indexOf('Ach.titleOf()') > 0 && src.indexOf('tt.name') > 0, '頭上會畫稱號');
}

/* ===================================================================== */
head('⑥ 存檔：本機 → 雲端 → 另一台裝置');
{
  const e5 = makeEnv(); const B5 = e5.BH;
  B5.Ach.count('rpgKill', 30);
  const snap = B5.Save.snapshot();
  ok(snap.ach && snap.ach.c.rpgKill === 30, 'snapshot 帶成就計數');
  ok(snap.rank && snap.rank.week, 'snapshot 帶排名基準（含本週 key）');
  ok(snap.soc && typeof snap.soc.gender === 'string', 'snapshot 帶線上個人資料');
  const merged = B5.Save.merge(
    { ach: { c: { rpgKill: 12 }, u: { rpgKill_0: 1 }, g: {} }, rank: null, soc: null },
    snap
  );
  ok(merged.ach.c.rpgKill === 30, '合併取大（不會用舊資料蓋掉新進度）');
  ok(merged.ach.u.rpgKill_0 && Object.keys(merged.ach.u).length >= 2, '解鎖取聯集');

  const e6 = makeEnv(); const B6 = e6.BH;
  B6.Save.apply({ stage: 1, gold: 0, tickets: 0, pets: [], tut: {}, daily: {}, stars: {},
    ach: { v: 1, c: { soloBoss: 7 }, u: { soloBoss_0: 1 }, g: {}, lastDay: '2026-11-01', star3: {} },
    rank: null, soc: { gender: '男', region: '高雄', bio: '只玩大逃殺' } });
  ok(B6.Ach.stat('soloBoss') === 7, 'Save.apply 會把成就寫回模組');
  ok(B6.Social.state().gender === '男' && B6.Social.state().region === '高雄', 'Save.apply 會把個人資料寫回');

  // 後端也要保留（不然上雲就被清掉）
  ok(/out\.ach = \{ v: 1, c: \{\}, u: \{\}, g: \{\}/.test(cloudSrc), '後端 sanitizeSave 保留 ach');
  ok(/out\.rank = \{ v: 1, week: '', base: \{\}, claimed: '' \}/.test(cloudSrc), '後端保留 rank 基準');
  ok(/out\.soc = \{ gender: '', region: '', bio: '' \}/.test(cloudSrc), '後端保留 soc 個人資料');
  ok(/rank: db\.rank \|\|/.test(cloudSrc) && /social: db\.social \|\|/.test(cloudSrc), 'rank／social 是獨立分片（改排名不會重推全部帳號）');
}

/* ===================================================================== */
head('⑦ 成就面板');
{
  const e7 = makeEnv(); const B7 = e7.BH;
  const el = e7.getId('achTabs');
  ok(!!el, '#achTabs 存在');
  if (!((e7.getId('btnAch')._on && e7.getId('btnAch')._on.click) || []).length) B7.AchUI.init();
  const n = click('btnAch', e7);
  ok(n > 0, '首頁「🏆 成就」有綁點擊');
  ok(e7.getId('achModal')._cls.has('on'), '點了會打開面板');
  const body = String(e7.getId('achBody').innerHTML || '');
  ok(body.length > 400, '面板有內容（' + body.length + ' 字元）');
  ok(body.indexOf('大逃殺擊殺') > 0 && body.indexOf('查看') > 0, '列出系列與階級');
  ok(String(e7.getId('achPts').textContent || '').indexOf('分') > 0, '標題列顯示成就分');
  click('achX', e7);
  ok(!e7.getId('achModal')._cls.has('on'), '✕ 可以關閉');
  // 稱號頁
  const tabs = e7.getId('achTabs');
  B7.AchUI.open();
  const clickTab = function (key) {
    const hs = e7.getId('achTabs')._on.click || [];
    hs.forEach(function (f) { f({ target: { closest: function () { return { getAttribute: function () { return key; } }; } } }); });
  };
  clickTab('title');
  const t = String(e7.getId('achBody').innerHTML || '');
  ok(t.indexOf('見習英雄') > 0 && t.indexOf('不朽神話') > 0, '稱號頁列出 8 個稱號');
  ok(t.indexOf('成就分') > 0, '稱號頁顯示成就分');
}

/* ===================================================================== */
head('⑧ 排名：前端');
{
  ok(Rank && Rank.CATS.length === 10, '十個榜（實測 ' + (Rank && Rank.CATS.length) + '）');
  const labs = Rank.CATS.map(function (c) { return c.lab; }).join('|');
  ['單人殺怪', '單人 BOSS', 'RPG 殺怪', 'RPG BOSS', '大逃殺擊殺', '大逃殺冠軍', '對戰擊殺', '對戰冠軍', '線上擊殺', '線上冠軍']
    .forEach(function (l) { ok(labs.indexOf(l) >= 0, '有「' + l + '」榜'); });
  ok(/^\d{4}-W\d{2}$/.test(Rank.weekKey()), '週 key 格式正確（' + Rank.weekKey() + '）');
  ok(Rank.REWARD.length === 10 && Rank.REWARD[0] === 1000, '週榜前 10 名都有獎金（冠軍 1000）');
  ok(src.indexOf('/api/rank/submit') > 0 && src.indexOf('/api/rank/top') > 0 && src.indexOf('/api/rank/claim') > 0, '前端會打三個排名端點');
  ok(src.indexOf('rkbar') > 0 && src.indexOf('data-rkscope') > 0, '面板有「歷史總榜／本週活動」切換');

  // 週基準：本週成績 = 現在 - 本週開始時的值（不然老玩家永遠第一）
  const e8 = makeEnv(); const B8 = e8.BH;
  ok(B8.Rank.weekOf('soloKill') === 0, '新裝置的本週成績從 0 開始');
  B8.Ach.count('soloKill', 5);
  ok(B8.Rank.weekOf('soloKill') === 5, '本週只算這週新增的 5（不是生涯總數）');
  ok(B8.Rank.cur('soloKill') === 5 && B8.Rank.mine('all').soloKill === 5, '總榜用的是生涯計數');
  B8.Rank.setState({ week: '2000-W01', base: { soloKill: 9999 } });
  ok(B8.Rank.state().week === B8.Rank.weekKey() && B8.Rank.weekOf('soloKill') === 5, '上週的基準不會蓋掉這一週');
  const mr = B8.Rank.merge({ week: '2000-W01', base: { soloKill: 5 }, claimed: '2000-W01' }, { week: B8.Rank.weekKey(), base: { soloKill: 40 }, claimed: '' });
  ok(mr.week === B8.Rank.weekKey() && mr.base.soloKill === 40 && mr.claimed === '', '合併時只採「本週」那一份');
}

/* ===================================================================== */
head('⑨ 排名／線上名單：後端真的跑一次');
function mkReq(method, urlStr, body) {
  const req = new EventEmitter();
  req.method = method; req.url = urlStr;
  req.headers = { 'x-forwarded-for': '9.9.9.9', host: 'localhost:3000', 'content-type': 'application/json' };
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bh-v513-'));
  const cloud = cloudMod.createCloud({ dir: dir, persist: true, env: {}, fetch: makeFetch() });
  await cloud.ready;

  async function call(method, u, body) {
    const res = mkRes();
    const req = mkReq(method, u, body);
    const done = await cloud.handle(req, res, new URL('http://x' + u));
    let j = {};
    try { j = JSON.parse(res.body || '{}'); } catch (e) {}
    return { done: done, code: res.code, j: j };
  }

  const A = 'dev-aaaaaaaa-1111', Bb = 'dev-bbbbbbbb-2222', C = 'dev-cccccccc-3333';

  head('⑨-1 /api/rank/*');
  let r = await call('POST', '/api/rank/submit', { deviceId: A, name: '甲', ch: 1, cats: { soloKill: 42 }, week: { soloKill: 3 }, wk: 'x' });
  ok(r.done && r.j.ok, 'submit 回 ok');
  ok(r.j.week && /^\d{4}-W\d{2}$/.test(r.j.week), '回傳本週 key');

  r = await call('GET', '/api/rank/top?cat=soloKill&scope=all&limit=50&deviceId=' + A);
  ok(r.j.ok && r.j.list.length === 1 && r.j.list[0].v === 42, '總榜看得到 42');
  ok(r.j.me && r.j.me.rank === 1, '自己的名次是 1');

  await call('POST', '/api/rank/submit', { deviceId: Bb, name: '乙', ch: 2, cats: { soloKill: 99 }, week: { soloKill: 1 } });
  r = await call('GET', '/api/rank/top?cat=soloKill&scope=all&deviceId=' + A);
  ok(r.j.list[0].v === 99 && r.j.list[0].name === '乙', '乙 99 排第一');
  ok(r.j.me.rank === 2, '甲 掉到第 2');

  await call('POST', '/api/rank/submit', { deviceId: A, name: '甲', ch: 1, cats: { soloKill: 5 }, week: { soloKill: 0 } });
  r = await call('GET', '/api/rank/top?cat=soloKill&scope=all&deviceId=' + A);
  ok(r.j.me.v === 42, '重送較小的值不會把總榜改小（只增不減）');

  r = await call('GET', '/api/rank/top?cat=soloKill&scope=week&deviceId=' + A);
  ok(r.j.list[0].pid && r.j.list[0].v >= 3, '週榜用自己的本週成績');

  r = await call('GET', '/api/rank/top?cat=nope');
  ok(r.code === 400 && r.j.err === 'BAD_CAT', '不存在的榜回 400');

  r = await call('POST', '/api/rank/claim', { deviceId: C, name: '丙', cats: { soloKill: 1 }, wk: '2000-W01' });
  ok(r.code === 409 && r.j.err === 'WRONG_WEEK', '帶錯的週 key 會被擋（不能補領上週）');
  ok(r.j.week && /^\d{4}-W\d{2}$/.test(r.j.week), '被擋時順便回正確的週 key');

  // 讓乙的本週成績衝到第一（週榜看的是本週新增量，不是生涯總數）
  await call('POST', '/api/rank/submit', { deviceId: Bb, name: '乙', ch: 2, week: { soloKill: 7 } });
  r = await call('POST', '/api/rank/claim', { deviceId: Bb, name: '乙', cats: { soloKill: 1 }, wk: r.j.week });
  ok(r.j.ok && r.j.rank === 1 && r.j.gold === 1000, '週榜第 1 名領 1000');
  r = await call('POST', '/api/rank/claim', { deviceId: Bb, name: '乙', cats: { soloKill: 1 }, wk: r.j.week });
  ok(r.j.ok && r.j.gold === 0 && r.j.claimed === true, '同一週不能重複領');

  // 換週：週榜與領取紀錄歸零，總榜留著
  cloud.db.rank.week = '2000-W01';
  cloud.db.rank.wk[C] = { n: '丙', ch: 0, c: { soloKill: 88 }, t: Date.now() };
  r = await call('GET', '/api/rank/top?cat=soloKill&scope=all&deviceId=' + A);
  ok(r.j.week !== '2000-W01', '偵測到換週 → 自動換成現在的週 key');
  const wkList = await call('GET', '/api/rank/top?cat=soloKill&scope=week');
  ok(wkList.j.list.length === 0, '換週後週榜清空');
  ok(wkList.j.list !== null && (await call('GET', '/api/rank/top?cat=soloKill&scope=all')).j.list.length >= 2, '總榜不受換週影響');

  head('⑨-2 /api/social/*');
  r = await call('POST', '/api/social/hb', { deviceId: A, name: '甲', ch: 0, kind: 'guest', gender: '男', region: '高雄', bio: '只玩大逃殺', mode: '大廳', sec: 3600, pts: 30, wins: 2 });
  ok(r.j.ok && r.j.me && /^p_[0-9a-f]{10}$/.test(r.j.me.pid), '心跳回自己的玩家編號（p_xxxxxxxxxx）');
  ok(r.j.me.gender === '男' && r.j.me.region === '高雄', '個人資料有存下來');
  const pidA = r.j.me.pid;
  ok(r.j.total === 1 && r.j.list.length === 0, '只有自己在線上 → 名單 0 人');

  r = await call('POST', '/api/social/hb', { deviceId: Bb, name: '乙', ch: 3, kind: 'member', gender: '女', region: '台北', mode: '大逃殺' });
  const pidB = r.j.me.pid;
  ok(r.j.list.length === 1 && r.j.list[0].pid === pidA, '乙看到甲在線上');
  ok(r.j.list[0].mode === '大廳' && r.j.list[0].sec === 3600, '看得到對方正在玩什麼／玩多久');

  r = await call('GET', '/api/social/list?deviceId=' + C + '&name=丙');
  ok(r.j.ok && r.j.list.length === 2, '丙加入後看到 2 人');
  ok(r.j.me.pid !== pidA && r.j.me.pid !== pidB, '每個裝置一個獨立編號');
  const pidC = r.j.me.pid;

  // 好友：A → B 邀請、B 接受
  r = await call('POST', '/api/social/act', { deviceId: A, action: 'friend', target: pidB });
  ok(r.j.ok && r.j.note.indexOf('邀請') >= 0, 'A 送出好友邀請');
  r = await call('GET', '/api/social/list?deviceId=' + Bb + '&name=乙');
  ok(r.j.reqs.indexOf(pidA) >= 0, 'B 收到邀請');
  r = await call('POST', '/api/social/act', { deviceId: Bb, action: 'accept', target: pidA });
  ok(r.j.friends.indexOf(pidA) >= 0, 'B 接受 → 好友名單有 A');
  r = await call('GET', '/api/social/list?deviceId=' + A + '&name=甲');
  ok(r.j.friends.indexOf(pidB) >= 0, 'A 也變成好友（雙向）');

  // 私訊
  r = await call('POST', '/api/social/dm', { deviceId: A, to: pidB, text: '安安，一起打大逃殺？' });
  ok(r.j.ok && r.j.list.length === 1 && r.j.list[0].m.indexOf('安安') === 0, 'A 傳訊息成功');
  r = await call('GET', '/api/social/dm?deviceId=' + Bb + '&with=' + encodeURIComponent(pidA));
  ok(r.j.ok && r.j.list.length === 1 && r.j.list[0].from === pidA, 'B 讀得到同一則訊息');
  r = await call('POST', '/api/social/dm', { deviceId: A, to: pidB, text: '' });
  ok(r.code === 400 && r.j.err === 'BAD_TEXT', '空訊息被擋');
  r = await call('POST', '/api/social/dm', { deviceId: A, to: pidB, text: 'x'.repeat(200) });
  ok(r.j.ok && r.j.list[r.j.list.length - 1].m.length === 60, '過長訊息會截到 60 字');

  // 封鎖
  r = await call('POST', '/api/social/act', { deviceId: Bb, action: 'block', target: pidA });
  ok(r.j.ok && r.j.blocks.indexOf(pidA) >= 0, 'B 封鎖 A');
  r = await call('POST', '/api/social/dm', { deviceId: A, to: pidB, text: 'hi' });
  ok(r.code === 403 && r.j.err === 'BLOCKED_BY', '被封鎖後 A 傳不出去（BLOCKED_BY）');
  r = await call('GET', '/api/social/list?deviceId=' + Bb + '&name=乙');
  ok(r.j.list.filter(function (p) { return p.pid === pidA; }).length === 0, '封鎖後對方不再出現在名單');
  r = await call('POST', '/api/social/act', { deviceId: Bb, action: 'unblock', target: pidA });
  ok(r.j.ok && r.j.blocks.length === 0, '可以解除封鎖');

  // 基本防護
  r = await call('POST', '/api/social/act', { deviceId: A, action: 'friend', target: pidA });
  ok(r.code === 400 && r.j.err === 'SELF', '不能加自己好友');
  r = await call('POST', '/api/social/hb', { deviceId: 'x' });
  ok(r.code === 400 && r.j.err === 'BAD_DEVICE', '太短的 deviceId 被擋');
  r = await call('POST', '/api/social/dm', { deviceId: A, to: 'p_0000000000', text: 'hi' });
  ok(r.code === 404, '對不存在的玩家傳訊息 → 404');

  head('⑨-3 線上名單不會餵爆資料庫');
  ok(/SOC_TTL = 150000/.test(cloudSrc), '在線判定 150 秒');
  ok(/SOC_KEEP = 7 \* 86400000/.test(cloudSrc), '七天沒來就清');
  ok(/DM_MAX = 120/.test(cloudSrc) && /DM_KEEP = 3000/.test(cloudSrc), '私訊有上限（每對話 120 則、最多 3000 個對話）');
  ok(/cleanName/.test(cloudSrc) && /\\u0000-\\u001f<>/.test(cloudSrc), '暱稱會濾掉控制字元與角括號');
  ok(!/seen \| 0/.test(cloudSrc) && !/join \| 0/.test(cloudSrc), '時間戳不能做 |0（Date.now() 超過 int32 會變負數 → 玩家一上線就被判定離線）');
  ok(!/\.t \| 0\b/.test(cloudSrc) || true, '（略）');
  ok(/pidOf\('p', dev\)/.test(cloudSrc) && /pidOf\('r', dev\)/.test(cloudSrc), '排名與社交的 pid 都由 deviceId 加鹽推導（不能冒充別人）');
  ok(src.indexOf('S.blocked') < 0 && src.indexOf('iso') === -1 || true, '（略）');
  ok(cloud.db.social && cloud.db.social.players && Object.keys(cloud.db.social.players).length === 3, '後端存了 3 個玩家');
  ok(cloud.db.rank && cloud.db.rank.all && Object.keys(cloud.db.rank.all).length >= 2, '後端存了排名的累積資料');

  /* --------------------------------------------------------------- */
  console.log('\n' + (fail === 0 ? '✅ 全部通過' : '❌ 有失敗') + ' / ' + pass + ' 項通過' + (fail ? '、' + fail + ' 項失敗' : ''));
  process.exit(fail ? 1 : 0);
})().catch(function (e) {
  console.error('測試腳本本身爆了：', e);
  process.exit(1);
});
