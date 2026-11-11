/* ================================================================
   v5.88 驗收：好友名單不再消失 ＋ 狀態列表
   ---------------------------------------------------------------
   ① 好友離線就消失（真 bug）：好友分頁以前是拿「150 秒內線上名單」
      去 filter，朋友一下線整列就不見 → 玩家回報「好友名單被清空」。
      現在伺服器回 fdata（好友完整名片，含離線與最後上線時間），
      前端以 S.friends 為準畫名單。
   ② 狀態列表：自動（顯示遊樂區域）／忙碌／閒置／不在位子上／自訂文字
   ③ 好友上限 99（伺服器與文案一致）
   ④ 清掃保護：有好友關係的人不會被當路人砍掉（避免好友變空號）
   ================================================================ */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { EventEmitter } = require('events');
const { makeEnv } = require('./_sandbox');

const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'js/main.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
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

function mkReq(method, url, body) {
  const req = new EventEmitter();
  req.method = method; req.url = url; req.headers = { 'content-type': 'application/json' };
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

/* 把面板畫到沙盒 DOM，回傳 #onBody 的 HTML（重畫會毀輸入框，這裡只讀字串） */
function paintWith(o) {
  if (o.tab) S.tab = o.tab;
  if (o.view) S.view = o.view;
  if (o.friends) S.friends = o.friends;
  if (o.fdata) S.fdata = o.fdata;
  if (o.list) S.list = o.list;
  if (o.me !== undefined) S.me = o.me;
  if (o.sel !== undefined) S.sel = o.sel;
  Soc.render();
  const el = env.getId('onBody');
  return String((el && el.innerHTML) || '');
}

(async function main() {

  /* ─────────────────────────────────────── ① 好友名單 */
  head('① 好友名單：離線也要畫得出來');
  ok(/if \(S\.tab === 'friend'\) \{[\s\S]{0,240}?arr = S\.friends\.map/.test(src),
    '好友分頁改成以 S.friends 為準（不再 filter 線上名單）');
  ok(src.indexOf("if (S.tab === 'friend') arr = arr.filter") < 0,
    '舊的「用線上名單 filter」寫法已經移除');
  ok(/for \(let i = 0; i < S\.fdata\.length; i\+\+\)[\s\S]{0,600}?off: 1/.test(src),
    'findPid 會查 fdata，並標記為離線');

  const now = Date.now();
  const off1 = { pid: 'p_aaaa000001', name: '離線小明', ch: 2, kind: 'guest', gender: '男', region: '台北',
    seen: now - 7200000, sec: 3600, pts: 12, wins: 1, mode: '大逃殺', st: 'busy', stx: '', tt: -1, avt: 0, eq: [] };
  S.blocks = []; S.reqs = []; S.at = now; S.total = 0;
  let h = paintWith({ tab: 'friend', view: 'list', friends: ['p_aaaa000001'], fdata: [off1], list: [] });
  ok(h.indexOf('離線小明') > 0, '★ 好友不在線上也畫得出來（以前整列消失）');
  ok(/onrow off/.test(h), '離線好友的列有 off 樣式（灰階）');
  ok(h.indexOf('⚪ 離線 · 2 小時前') > 0, '顯示「離線 · 2 小時前」');
  ok(h.indexOf('⛔ 忙碌') > 0, '狀態標籤顯示「⛔ 忙碌」');
  ok(h.indexOf('好友 1 / 99') > 0, '抬頭寫「好友 1 / 99」而不是「線上 0 人」');
  ok(h.indexOf('其中 0 人在線上') > 0, '抬頭順便講幾人在線上');

  const online = { pid: 'p_aaaa000001', name: '線上的小明', ch: 2, kind: 'guest', gender: '男', region: '台北',
    seen: now, sec: 3600, pts: 12, wins: 1, mode: '單人模式', st: 'auto', stx: '', tt: -1, avt: 0, eq: [] };
  h = paintWith({ friends: ['p_aaaa000001'], fdata: [off1], list: [online] });
  ok(h.indexOf('線上的小明') > 0 && h.indexOf('🟢 線上') > 0, '在線時以線上資料為準（同名不重複兩列）');
  ok((h.match(/data-pid="p_aaaa000001"/g) || []).length === 1, '同一個好友只出現一次');
  ok(h.indexOf('其中 1 人在線上') > 0, '抬頭的在線人數跟著變');

  h = paintWith({ friends: ['p_bbbb000002'], fdata: [{ pid: 'p_bbbb000002', gone: 1 }], list: [] });
  ok(h.indexOf('找不到這位玩家的資料') > 0, '資料真的被清掉的好友 → 老實說找不到，不是消失');

  S.fdata = [off1];
  const f1 = Soc.findPid('p_aaaa000001');
  ok(f1 && f1.off === 1 && f1.st === 'busy', 'findPid 找得到離線好友（帶狀態）');
  ok(Soc.findPid('p_nope') === null, '真的沒有的人回 null');

  h = paintWith({ tab: 'online', friends: [], fdata: [], list: [online] });
  ok(h.indexOf('線上的小明') > 0 && h.indexOf('🎮 單人模式') > 0, '線上分頁：自動狀態顯示遊樂區域');

  /* ─────────────────────────────────────── ② 伺服器 fdata */
  head('② 伺服器：好友名單要回完整名片');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bh-v588-'));
  const cloud = cloudMod.createCloud({ dir: dir, persist: true, env: {}, fetch: noFetch() });
  await cloud.ready;
  async function call(method, u, body) {
    const res = mkRes();
    await cloud.handle(mkReq(method, u, body), res, new URL('http://x' + u));
    let j = {};
    try { j = JSON.parse(res.body || '{}'); } catch (e) {}
    return { code: res.code, j: j };
  }
  const A = 'dev-aaaaaaaa-1111', Bb = 'dev-bbbbbbbb-2222';

  let r = await call('POST', '/api/social/hb', { deviceId: A, name: '甲', mode: '大逃殺', st: 'idle' });
  const pidA = r.j.me.pid;
  ok(Array.isArray(r.j.fdata), '心跳一定回 fdata（哪怕是空陣列）');
  ok(r.j.me.st === 'idle' && r.j.me.mode === '大逃殺', '狀態與區域都存下來');

  r = await call('POST', '/api/social/hb', { deviceId: Bb, name: '乙', mode: '多人對戰', st: 'custom', stx: ' 打深淵中，勿擾 ' });
  const pidB = r.j.me.pid;
  ok(r.j.me.stx === '打深淵中，勿擾', '自訂狀態去掉前後空白');
  await call('POST', '/api/social/act', { deviceId: A, action: 'friend', target: pidB });
  await call('POST', '/api/social/act', { deviceId: Bb, action: 'accept', target: pidA });

  cloud.db.social.players[pidB].seen = Date.now() - 7200000;   // 乙 兩小時前下線
  r = await call('GET', '/api/social/list?deviceId=' + A + '&name=甲');
  ok(r.j.list.every(function (p) { return p.pid !== pidB; }), '乙 不在線上名單裡');
  ok(r.j.fdata.length === 1 && r.j.fdata[0].pid === pidB, '★ 但 fdata 還是有乙（名單不會消失）');
  ok(r.j.fdata[0].name === '乙' && r.j.fdata[0].st === 'custom' && r.j.fdata[0].stx === '打深淵中，勿擾',
    'fdata 帶著名字與狀態');
  ok(r.j.fdata[0].seen > 0 && r.j.fdata[0].mode === '多人對戰', 'fdata 帶著最後上線時間與區域');

  /* 好友上限 99 */
  const db = cloud.db.social;
  db.players[pidA].friends = [];
  for (let i = 0; i < 98; i++) {
    const id = 'p_fill' + String(i).padStart(6, '0');
    db.players[id] = { n: '路人' + i, friends: [], reqs: [], blocks: [], seen: Date.now() };
    db.players[pidA].friends.push(id);
  }
  const extra = 'p_fill999999';
  /* 先讓他送過邀請 → 按「加好友」會直接成為好友（否則只是送邀請、好友數不變） */
  db.players[extra] = { n: '第 99 位', friends: [], reqs: [pidA], blocks: [], seen: Date.now() };
  r = await call('POST', '/api/social/act', { deviceId: A, action: 'friend', target: extra });
  ok(r.j.ok === true && db.players[pidA].friends.length === 99, '第 99 位可以加（實測 ' + db.players[pidA].friends.length + '）');
  r = await call('POST', '/api/social/act', { deviceId: A, action: 'friend', target: pidB });
  ok(r.code === 400 && r.j.err === 'LIMIT', '★ 滿 99 再加 → LIMIT');
  ok(db.players[pidA].friends.length === 99, '被擋下之後好友數還是 99，沒有偷偷塞進去');

  /* 清掃保護 */
  head('③ 清掃：有關係的人不能被當路人砍掉');
  db.players[pidA].friends = [pidB];
  db.players[pidB].friends = [pidA];
  db.players[pidB].seen = Date.now() - 30 * 86400000;   // 乙 一個月沒上線
  for (let i = 0; i < 700; i++) {
    const id = 'p_junk' + String(i).padStart(6, '0');
    db.players[id] = { n: '路人' + i, friends: [], reqs: [], blocks: [], seen: Date.now() - i * 1000 };
  }
  await call('POST', '/api/social/hb', { deviceId: Bb, name: '乙' });   // 觸發 socPrune
  cloud.db.social.players[pidB].seen = Date.now() - 30 * 86400000;
  r = await call('GET', '/api/social/list?deviceId=' + A + '&name=甲');
  ok(!!cloud.db.social.players[pidB], '★ 30 天沒上線但還是別人的好友 → 不會被清掉');
  ok(r.j.fdata.some(function (f) { return f.pid === pidB; }), '好友名單裡還是看得到他');
  const junkLeft = Object.keys(cloud.db.social.players).filter(function (k) { return k.indexOf('p_junk') === 0; }).length;
  ok(junkLeft < 700, '沒有關係的路人會被清掉（剩 ' + junkLeft + '）');

  /* ─────────────────────────────────────── ④ 狀態 */
  head('④ 狀態列表');
  ok(Array.isArray(Soc.ST_LIST) && Soc.ST_LIST.length === 5, '五種狀態');
  ok(['auto', 'busy', 'idle', 'away', 'custom'].every(function (k) {
    return Soc.ST_LIST.some(function (o) { return o.k === k; });
  }), '自動／忙碌／閒置／不在位子上／自訂 齊全');
  ok(Soc.status().k === 'auto', '預設是自動');

  function so(o) { const v = Soc.statusOf(o); return v.i + ' ' + v.t; }
  ok(so({ mode: '大廳' }) === '🎮 大廳', 'auto：沒有區域時顯示大廳');
  ok(so({ mode: '大逃殺' }) === '🎮 大逃殺', 'auto：顯示遊樂區域');
  ok(so({ st: 'busy' }) === '⛔ 忙碌' && so({ st: 'idle' }) === '🌙 閒置' && so({ st: 'away' }) === '🚶 不在位子上',
    '忙碌／閒置／不在位子上 各有圖示');
  ok(so({ st: 'custom', stx: '打副本中' }) === '💬 打副本中', '自訂：直接顯示玩家填的字');
  ok(so({ st: 'custom', stx: '' }) === '🎮 大廳', '自訂空白 → 退回自動（不會出現空標籤）');

  ok(Soc.setStatus('busy', '') === true && Soc.status().k === 'busy', '設定忙碌');
  ok(Soc.setStatus('custom', '   ') === false && Soc.status().k === 'busy', '自訂空白會被拒（狀態不變）');
  ok(Soc.setStatus('custom', '  打 深淵 中 ') === true && Soc.status().x === '打 深淵 中', '自訂文字去頭尾空白');
  Soc.setStatus('custom', '一二三四五六七八九十一二三四五六七八九十超過了');
  ok(Soc.status().x.length === 20, '自訂文字最多 20 字（實測 ' + Soc.status().x.length + '）');
  ok(Soc.setStatus('hacked', 'x') === true && Soc.status().k === 'auto', '亂填代號 → 退回自動');

  /* 遊樂區域 */
  const G = P.Game;
  function mode() { return Soc.state().mode; }
  G.state = 'menu'; G.mode = 'solo'; G.abyss = null;
  ok(mode() === '大廳', '不在遊戲裡 → 大廳');
  G.state = 'play'; G.mode = 'solo';
  ok(mode() === '單人模式', '單人 → 單人模式');
  G.abyss = { layer: 3 };
  ok(mode() === '深淵探險', '深淵 → 深淵探險（跟普通單人分開）');
  G.abyss = null; G.mode = 'battle';
  ok(mode() === '多人對戰', '對戰 → 多人對戰');
  G.mode = 'br';
  ok(mode() === '大逃殺', 'BR → 大逃殺');
  G.mode = 'rpg';
  ok(mode() === 'RPG 冒險', 'RPG → RPG 冒險');
  G.state = 'menu'; G.mode = 'solo';

  /* 心跳帶狀態 */
  ok(/st: P\.status\.k, stx: P\.status\.k === 'custom' \? P\.status\.x : ''/.test(src),
    '心跳 body 帶 st／stx（非 custom 不送文字）');

  h = paintWith({ tab: 'me', me: { pid: 'p_self000001', name: '我', kind: 'guest', seen: now, mode: '大廳', st: 'auto', stx: '' } });
  ok(h.indexOf('我的狀態') > 0, '我的資料頁有「我的狀態」區塊');
  ok((h.match(/data-stpick="/g) || []).length === 5, '五顆狀態按鈕');
  ok(h.indexOf('id="socStIn"') > 0 && h.indexOf('套用自訂') > 0, '有自訂輸入框與套用鍵');
  ok(h.indexOf('目前顯示：') > 0, '直接寫出目前顯示什麼（不必猜）');

  h = paintWith({ tab: 'online', view: 'detail', sel: { pid: 'p_x', name: '阿明', kind: 'guest', mode: '多人對戰', st: 'custom', stx: '休息一下', seen: now, sec: 0, pts: 0, wins: 0, tt: -1 } });
  ok(h.indexOf('狀態') > 0 && h.indexOf('💬 休息一下') > 0, '資料頁把狀態寫出來');
  ok(h.indexOf('遊樂區域') > 0 && h.indexOf('多人對戰') > 0, '資料頁的「區域」與「狀態」分開兩格');

  /* 伺服器端狀態清洗 */
  r = await call('POST', '/api/social/hb', { deviceId: A, name: '甲', st: 'nonsense', stx: '<b>粗體</b>' });
  ok(r.j.me.st === 'auto', '伺服器不認得的狀態代號 → auto');
  ok(r.j.me.stx === 'b粗體/b', '狀態文字去掉角括號（不能塞標籤）');

  /* 跨裝置接回 */
  S.statusBackup = null;
  Soc.setStatus('auto', '');
  const oldPost = null;
  ok(typeof Soc.setState === 'function', '有對外接口給測試與玩家卡用');
  Soc.setState({ st: 'away' });
  ok(Soc.status().k === 'away', 'setState 也能設狀態');

  /* ─────────────────────────────────────── ⑤ 樣式 */
  head('⑤ 樣式與文案');
  ok(/\.onmode\.st \{[^}]*max-width/.test(html), '狀態標籤有寬度上限（長文字不會撐歪名單）');
  ok(/\.stpick\.on \{/.test(html) && /\.stpicks \{/.test(html), '狀態按鈕有自己的樣式');
  ok(/\.onrow\.off \{/.test(html), '離線好友的列有灰階樣式');
  ok(src.indexOf('好友已滿（上限 99 位）') > 0, '好友滿了的提示寫出上限');
  ok(src.indexOf('還沒有好友（最多 99 位）') > 0, '空名單也寫出上限');

  console.log('\n========================================');
  console.log('v5.88 好友名單與狀態：' + pass + ' 通過 / ' + fail + ' 失敗');
  process.exit(fail === 0 ? 0 : 1);
})().catch(function (e) {
  console.error(e);
  process.exit(1);
});
