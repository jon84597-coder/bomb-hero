// 無頭測試 v520：RPG 收尾（洗點／模式隔離／全破／升級演出／營地樂觀鎖／RPG 每日任務／圖鑑／金幣合軌）
const fs = require('fs');
const path = require('path');
const os = require('os');
const { EventEmitter } = require('events');
const { makeEnv, rawHtml } = require('./_sandbox');
const cloudMod = require(path.join(__dirname, '..', '..', 'cloud.js'));

const env = makeEnv();
const P = env.BH;

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}
function head(t2) { console.log('\n=== ' + t2 + ' ==='); }

const html = rawHtml;

/* ================================================================ ⓪ */
head('⓪ 版本');
// v5.21：版本斷言改成「不低於 5.20」，升版不會再紅一支
const VN = P.VERSION.split('.').map(Number);
const MIN = [5, 20];
ok(VN[0] * 1000 + VN[1] >= MIN[0] * 1000 + MIN[1], '版本不低於 5.20（' + P.VERSION + '）');
ok(html.indexOf('id="verTxt">' + P.VERSION) > 0, '首頁徽章與 VERSION 同步（' + P.VERSION + '）');
ok(html.indexOf('id="verLogVer">' + P.VERSION) > 0, '版本紀錄標題與 VERSION 同步');
ok(P.VERSION_LOG[0].now === true, '版本紀錄最上面是 now:true');
const has520 = P.VERSION_LOG.filter(function (x) { return x.v === '5.20'; })[0];
ok(!!has520 && has520.now === false, '5.20 那一筆已經轉成舊版');
ok(has520 && has520.items.length >= 4, '5.20 版本紀錄至少 4 條（' + (has520 ? has520.items.length : 0) + ' 條）');
['../sw.js', '../../public/sw.js', '../../bomberman-online/public/sw.js'].forEach(function (rel) {
  const f = path.join(__dirname, rel);
  const v = (/SW_VERSION = '([^']+)'/.exec(fs.readFileSync(f, 'utf8')) || [])[1] || '';
  ok((function(a){a=String(v).replace(/^v/,'').split('.').map(Number);return a[0]*1000+(a[1]||0);})() >= 5000+MIN[1], rel + ' SW_VERSION 不低於 v5.20（' + v + '）');
});

/* ================================================================ ① */
head('① R1：配點可以全部退回');
ok(typeof P.Cloud.respec === 'function', 'Cloud.respec 存在');
ok(html.indexOf('id="btnRpgRespec"') > 0, '配點畫面有「全部退回」按鈕');
ok(html.indexOf("req('/api/rpg/respec'") > 0, '前端打 /api/rpg/respec');
ok(/allocation|全部退回/.test(html), '按鈕有可讀文字');
ok(P.rpgSum({ hp: 0, def: 0, spd: 0, atk: 0 }) === 0, '四項歸零 → 已用點數 0');

/* ================================================================ ② */
head('② R3：一般關卡與 RPG 的評價分開');
ok(html.indexOf('const solo = Game.mode !== \'rpg\';') > 0, '過關結算有 solo / rpg 分流');
ok(html.indexOf('if (solo && Gift.setStars(cleared, stars))') > 0, '星數只發給一般關卡');
ok(html.indexOf('if (solo && !hurt) Ach.count(') > 0, '「無傷」只算一般關卡');
ok(html.indexOf('if (solo && cleared === Gift.weekStage()') > 0, '每週最速榜只收一般關卡');
ok(html.indexOf("Ach.count(solo ? 'soloClear' : 'rpgClear', 1)") > 0, '通關次數仍然分模式計數');

/* ================================================================ ③ */
head('③ R7：升級有演出卡');
ok(typeof P.RpgUI.levelUp === 'function', 'RpgUI.levelUp 存在');
ok(html.indexOf('class="rpgpopcard"') > 0, '演出卡的 DOM 存在');
P.RpgUI.levelUp({ up: 2 }, 10);
const card1 = env.getId('rpgPopCard').innerHTML || '';
ok(env.getId('rpgPop')._cls.has('on'), '升級後卡片會出現');
ok(card1.indexOf('LEVEL UP') >= 0, '卡片標題是 LEVEL UP');
ok(card1.indexOf('Lv.10') >= 0, '卡片顯示等級 Lv.10');
ok(card1.indexOf('+1') >= 0, '卡片顯示本關升 2 級 → 配點 +1、技能點 +1');
ok(card1.indexOf('rgo') > 0, '卡片有一顆確認鈕');
ok(html.indexOf("try { RpgUI.levelUp(lvUp, L.lv); }") > 0, '升級時真的會呼叫演出卡（有 toast 退路）');

/* ================================================================ ④ */
head('④ R6：40 關全破有成績單');
ok(typeof P.RpgUI.finish === 'function', 'RpgUI.finish 存在');
ok(html.indexOf('if (cleared >= SOLO_STAGES) { try { RpgUI.finish(); }') > 0, '第 40 關（最後一關）過關會觸發成績單');
ok(html.indexOf("const END_KEY = 'bombhero-rpg-end';") > 0, '全破紀錄存本機（只彈一次）');
P.RPG.cleared = 32;
P.RPG.xp = 120000;
P.RpgUI.finish();
const card2 = env.getId('rpgPopCard').innerHTML || '';
ok(card2.indexOf('32 關全破') >= 0 || card2.indexOf('ADVENTURE') >= 0, '成績單標題正確');
ok(card2.indexOf('120,000') >= 0, '累積經驗有千分位（' + (card2.match(/12[\d,]+/) || ['無'])[0] + '）');
ok(card2.indexOf('最終等級') >= 0 && card2.indexOf('學會招式') >= 0, '成績單有四項統計');
P.RpgUI.pop.hide();

/* ================================================================ ⑤ */
head('⑤ R8：營地存檔的樂觀鎖');
ok(html.indexOf('baseRev: RPG.campRev | 0') > 0, '前端送 baseRev 上去');
ok(html.indexOf("r.err === 'CAMP_CONFLICT'") > 0, '前端處理衝突');
ok(typeof P.RpgUI.campMerge === 'function', 'campMerge 可以合併兩邊的購買紀錄');
const mg = P.RpgUI.campMerge(
  { perm: { hp: 1, bomb: 0, fire: 0 }, sk: { det: 2 }, skLoad: ['det'], bag: { hp1: 1 } },
  { perm: { hp: 0, bomb: 1, fire: 0 }, sk: { det: 1, kick: 1 }, skLoad: ['kick'], bag: { hp1: 2, arm1: 1 } }
);
ok(mg.perm.hp === 1 && mg.perm.bomb === 1, '永久強化取兩邊較高（不是後寫的贏）');
ok(mg.sk.det === 2 && mg.sk.kick === 1, '招式等級取聯集');
ok(mg.bag.hp1 === 2 && mg.bag.arm1 === 1, '補給數量取較多');
ok(mg.skLoad.indexOf('det') === 0, '出戰欄保留本地的編排優先');
ok(mg.skLoad.length <= 4, '出戰欄不超過 4 個');

/* ================================================================ ⑥ */
head('⑥ A：RPG 專屬每日任務');
const mis = P.Gift.missions();
ok(mis.length === 3, '每天三個任務（' + mis.length + '）');
const rpgMis = mis.filter(function (m) { return m.id.indexOf('rpg') === 0; });
ok(rpgMis.length === 1, '固定保底一個 RPG 任務（' + rpgMis.map(function (m) { return m.id; }).join(',') + '）');
ok(['rpgBoss', 'rpgLv', 'rpgClear'].indexOf(rpgMis[0].id) >= 0, 'RPG 任務是三個之一');
ok(html.indexOf("rpgBoss: 'gift.misRpgBoss'") > 0, 'RPG 任務有中文名稱對照');
ok(html.indexOf("if (!solo) Gift.add('rpgClear', 1);") > 0, 'RPG 過關會推進任務');
ok(html.indexOf("Gift.add('rpgLv', lvUp.up)") > 0, '升級會推進任務');
ok(html.indexOf("Gift.add('rpgBoss', 1)") > 0, '打倒魔王會推進任務');
const rpgKeyN = ['gift.misRpgBoss', 'gift.misRpgLv', 'gift.misRpgClear'].filter(function (k) {
  return P.LANGS.every(function (L) { return !!P.I18N[L.id][k]; });
}).length;
ok(rpgKeyN === 3, '三個 RPG 任務文案都有五種語言（' + rpgKeyN + '/3）');

/* ================================================================ ⑦ */
head('⑦ D：圖鑑');
ok(typeof P.Codex === 'object' && typeof P.CodexUI === 'object', 'Codex / CodexUI 存在');
ok(html.indexOf('id="codexBtn"') > 0, '首頁有圖鑑入口（浮動鈕）');
ok(html.indexOf("try { CodexUI.wire(); }") > 0, '圖鑑鈕在啟動時就接好線');
P.CodexUI.open('f');
const bodyF = env.getId('codexBody').innerHTML || '';
ok(env.getId('codexModal')._cls.has('on'), '圖鑑會打開');
ok((bodyF.match(/cdxcell/g) || []).length === 48, '怪物分頁 48 格（' + (bodyF.match(/cdxcell/g) || []).length + '）');
ok(bodyF.indexOf('cdxcell lk') > 0, '沒遇過的格子是鎖住的');
ok(bodyF.indexOf('<img') > 0, '鎖住的格子也畫剪影（不是一整片問號）');
ok(bodyF.indexOf('cdxq') < 0, '有剪影就不再加問號');
P.CodexUI.open('b');
ok((env.getId('codexBody').innerHTML.match(/cdxcell/g) || []).length === 8, '魔王分頁 8 格');
P.CodexUI.open('i');
const nItem = (env.getId('codexBody').innerHTML.match(/cdxcell/g) || []).length;
ok(nItem >= 10, '道具分頁 ' + nItem + ' 格');
P.CodexUI.open('s');
ok((env.getId('codexBody').innerHTML.match(/cdxcell/g) || []).length === 10, '招式分頁 10 格');
ok(P.Codex.has('f', 'slime') === false, '一開始沒遇過史萊姆');
P.Codex.mark('f', 'slime');
ok(P.Codex.has('f', 'slime') === true, '打倒過就點亮');
ok(P.Codex.mark('f', 'slime') === false, '重複打倒不會重複記錄');
const cdxN = ['codex.title', 'codex.tabFoe', 'codex.tabBoss', 'codex.tabItem', 'codex.tabSkill'].filter(function (k) {
  return P.LANGS.every(function (L) { return !!P.I18N[L.id][k]; });
}).length;
ok(cdxN === 5, '圖鑑標題與分頁都有五種語言（' + cdxN + '/5）');
ok(html.indexOf("Codex.mark('f', e.spec || e.type)") > 0, '打倒怪物時會記錄物種');
ok(html.indexOf("Codex.mark('i', type)") > 0, '撿到道具時會記錄');
P.CodexUI.close();

/* ================================================================ ⑧ */
head('⑧ 後端實跑：洗點／樂觀鎖／金幣合軌');
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
  r.end = function (s) {
    r.body = String(s || '');
    const ck = r.headers['Set-Cookie'] || r.headers['set-cookie'];
    if (ck) r.cookie = [].concat(ck)[0].split(';')[0];
  };
  r.write = function (s) { r.body += String(s || ''); };
  return r;
}
function makeFetch() {
  return function () {
    return Promise.resolve({
      ok: true, status: 200,
      json: function () { return Promise.resolve([]); },
      text: function () { return Promise.resolve('[]'); }
    });
  };
}

(async function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bh-v520-'));
  const cloud = cloudMod.createCloud({ dir: dir, persist: true, env: {}, fetch: makeFetch() });
  await cloud.ready;

  async function call(method, u, body, cookie) {
    const res = mkRes();
    await cloud.handle(mkReq(method, u, body, cookie), res, new URL('http://x' + u));
    let j = {};
    try { j = JSON.parse(res.body || '{}'); } catch (e) {}
    return { code: res.code, j: j, cookie: res.cookie };
  }
  const sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  let r = await call('POST', '/api/auth/guest', { deviceId: 'dev-v520-aaaa-1111' });
  ok(r.j.ok && r.j.account, '建立遊客帳號');
  const ck = r.cookie;
  ok(r.j.account.campRev === 0, '新帳號 campRev = 0');
  const points0 = r.j.account.points;
  ok(P.rpgSum(r.j.account.rpg.alloc) === 9, '新帳號先配好 9 點');

  // --- 洗點 ---
  r = await call('POST', '/api/rpg/respec', {}, ck);
  ok(r.j.ok, '洗點成功');
  ok(r.j.account.rpg.alloc.hp === 0 && r.j.account.rpg.alloc.atk === 0, '四項歸零');
  ok(r.j.account.left === points0, '點數全部退回（' + r.j.account.left + ' / ' + points0 + '）');

  // --- 樂觀鎖 ---
  r = await call('POST', '/api/rpg/camp', { perm: { hp: 1, bomb: 0, fire: 0 }, sk: {}, skLoad: [], bag: {}, baseRev: 0 }, ck);
  ok(r.j.ok && r.j.campRev === 1, '第一次存營地 → campRev 1');
  r = await call('POST', '/api/rpg/camp', { perm: { hp: 0, bomb: 2, fire: 0 }, sk: {}, skLoad: [], bag: {}, baseRev: 0 }, ck);
  ok(r.code === 409 && r.j.err === 'CAMP_CONFLICT', '拿舊版本再存 → 409 CAMP_CONFLICT');
  ok(r.j.account.rpg.perm.hp === 1, '衝突時回的是伺服器現況（沒有被硬蓋）');
  r = await call('POST', '/api/rpg/camp', { perm: { hp: 1, bomb: 2, fire: 0 }, sk: {}, skLoad: [], bag: {}, baseRev: 1 }, ck);
  ok(r.j.ok && r.j.campRev === 2, '帶對的版本重送 → 成功且版本 +1');

  // --- 金幣合軌 ---
  r = await call('POST', '/api/rpg/stage-clear', { stage: 1, exp: 5 }, ck);
  ok(r.j.ok, '過第 1 關');
  ok(r.j.account.rpg.gold === 0, 'rpg.gold 不再跟著過關成長（金幣只有商店那一個錢包）');
  ok(r.j.account.rpg.cleared === 1, '關卡進度照樣前進');

  console.log('\n' + (fail ? '✗ ' + fail + ' 失敗 / ' + pass + ' 通過' : '✅ v5.20：' + pass + ' 通過 / 0 失敗'));
  process.exit(fail ? 1 : 0);
})().catch(function (e) {
  console.error(e);
  process.exit(1);
});
