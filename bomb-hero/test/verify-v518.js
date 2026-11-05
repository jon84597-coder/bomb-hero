/* =====================================================================
 * verify-v518：稱號可以自己挑（顯示在個人資料）＋ RPG 等級／經驗值
 *   ① 稱號：自動／指定階級／開發者／不戴，四個狀態都要能存、能合併
 *   ② 名片與名單要真的看得到別人的稱號（心跳只送代號，後端要存、要回）
 *   ③ RPG：1～65 級、每 2 級 1 點、怪的等級與經驗隨大關上升
 *   ④ 後端：經驗值由伺服器入帳並夾上限（前端塞天文數字也只拿到上限）
 * ================================================================== */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { EventEmitter } = require('events');
const { makeEnv } = require('./_sandbox');

const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const CLOUD_SRC = fs.readFileSync(path.join(ROOT, '..', 'cloud.js'), 'utf8');
const cloudMod = require(path.join(ROOT, '..', 'cloud.js'));

let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  \u2713 ' + m); } else { fail++; console.log('  \u2717 ' + m); } }
function head(t) { console.log('\n' + t); }

const vm = SRC.match(/const VERSION = '([^']+)'/);
head('⓪ 版本');
ok(vm && vm[1].split('.').map(Number)[1] >= 18, '版本是 5.18 以上（' + (vm ? vm[1] : '?') + '）');
ok(SRC.indexOf("{ v: '5.18'") > 0, 'VERSION_LOG 第一筆是 5.18');

/* ================================================================ ① */
head('① 稱號：自己挑一個戴');
function newAch() {
  const e = makeEnv();
  return { B: e.BH, A: e.BH.Ach, e: e };
}
{
  const { A } = newAch();
  ok(typeof A.setTitle === 'function' && typeof A.titleSel === 'function', '有 setTitle／titleSel');
  ok(A.titleSel() === 'auto', '預設是「自動」');
  ok(A.titleOf() === null, '沒有成就分 → 沒有稱號');

  A.count('soloKill', 900);                     // 衝成就分
  A.setMax('brKill', 500);
  A.setMax('btWin', 60);
  const pts = A.points();
  ok(pts >= 100, '成就分 ' + pts + '（足以解鎖好幾階）');
  const autoT = A.titleOf();
  ok(autoT && autoT === A.autoTitle(pts), '自動＝依成就分選最高的那個（' + (autoT ? autoT.name : '—') + '）');

  ok(A.setTitle('0') === true, '可以指定第 1 階');
  ok(A.titleOf().name === '見習英雄', '指定後就戴見習英雄（不是最高的那個）');
  ok(A.titleSel() === '0', 'titleSel 回 "0"');
  ok(A.wornIdx() === 0, 'wornIdx = 0（名單用的代號）');

  ok(A.setTitle('7') === false, '沒解鎖的階級不能戴（回 false）');
  ok(A.titleOf().name === '見習英雄', '失敗時原來的稱號不會掉');

  ok(A.setTitle('none') === true && A.titleOf() === null, '可以選「不戴」');
  ok(A.wornIdx() === -1, '不戴 → 代號 -1');
  ok(A.setTitle('auto') === true && A.titleOf() === autoT, '切回自動又回到最高階');
  ok(A.setTitle('亂打') === false, '亂塞字串會被擋掉');

  /* 開發者 */
  ok(A.devOn() === false, '一般玩家沒有開發者稱號');
  ok(A.setTitle('dev') === false, '一般玩家不能戴開發者稱號');
  A.forceDev(true);
  ok(A.setTitle('dev') === true && A.titleOf().name === '遊戲開發者', '開發者帳號可以戴開發者稱號');
  ok(A.wornIdx() === 8, '開發者代號 8');
  A.setDev(false);
  ok(A.titleOf() === autoT, '「卸下」之後回到成就稱號（不會卡在開發者）');

  /* 存檔 / 還原 / 合併 */
  A.setTitle('0');
  ok(A.state().title === '0', '存檔記得住挑的稱號');
  const e2 = newAch();
  ok(e2.A.setState({ title: '5', c: A.state().c, u: A.state().u, g: A.state().g }) === true, 'setState 可以還原');
  ok(e2.A.titleSel() === 'auto' || e2.A.titleSel() === '5', 'setState 之後 title 合法（' + e2.A.titleSel() + '）');
  e2.A.setState({ title: '99' });
  ok(e2.A.titleSel() !== '99', '不合法的 title 會被丟掉');

  const m = A.merge({ title: 'auto', c: A.state().c, u: A.state().u, g: A.state().g },
    { title: '1', c: A.state().c, u: A.state().u, g: A.state().g });
  ok(m.title === '1', '合併會帶著「挑過的稱號」走（換裝置不用重挑）');
}

head('② 名片與名單看得到稱號');
ok(SRC.indexOf('function myTitleHTML()') > 0, '「我的資料」有 myTitleHTML');
ok(SRC.indexOf('data-mytitle="auto"') > 0, '名片上有「自動」可選');
ok(/Ach\.TITLES \|\| \[\]\)\.forEach\(function \(t, i\) \{[\s\S]{0,220}data-mytitle="' \+ i/.test(SRC),
  '解鎖過的階級都列出來，點了就戴（不再只能看最高的）');
ok(SRC.indexOf('data-mytitle="none"') > 0, '名片上有「不戴」');
ok(SRC.indexOf('myTitleHTML() +') > 0, '名片真的把它插進去了');
ok(SRC.indexOf('titleChip(titleByNo(p.tt))') > 0, '別人的資料顯示他的稱號');
ok(SRC.indexOf('tt: (typeof Ach !== \'undefined\' && Ach.wornIdx) ? Ach.wornIdx() : -1') > 0,
  '心跳只送稱號代號（不送色碼、不送整份字典）');
ok(SRC.indexOf('data-ahtitle="\' + ti + \'"') > 0, '成就「稱號」頁每一階都有「戴上」按鈕');
ok(SRC.indexOf('data-ahtitle="none"') > 0, '稱號頁也有「不戴稱號」');
ok(CLOUD_SRC.indexOf('me.tt = clampInt(body.tt, -1, 8, -1)') > 0, '後端會存稱號代號（並夾在 -1~8）');
ok(CLOUD_SRC.indexOf('tt: (me.tt == null ? -1 : me.tt)') > 0, '名單把稱號代號回給其他人');

/* ================================================================ ③ */
head('③ RPG 等級與經驗（數學）');
{
  const { B } = newAch();
  ok(B.RPG_LV_MAX === 65, '最高 65 級');
  ok(B.rpgLvOf(0).lv === 1 && B.rpgLvOf(0).cur === 0, '0 經驗 = 1 級');
  ok(B.rpgLvOf(B.rpgXpTotalOf(10)).lv === 10, '剛好湊滿 → 10 級（邊界）');
  ok(B.rpgLvOf(B.rpgXpTotalOf(10) - 1).lv === 9, '少 1 點經驗就只有 9 級');
  ok(B.rpgLvOf(B.rpgXpTotalOf(80)).lv === 65, '經驗再多也不會超過 65 級');
  ok(B.rpgPointsOf(1) === 9, '1 級：9 點（創角配點）');
  ok(B.rpgPointsOf(2) === 10 && B.rpgPointsOf(3) === 10, '每 2 級 +1 點（2 級給、3 級不給）');
  ok(B.rpgPointsOf(10) === 14, '10 級 = 9 + 5 = 14 點');
  ok(B.rpgPointsOf(65) === 40, '65 級封頂 40 點（四項全滿）');
  ok(B.rpgXpNeed(1) < B.rpgXpNeed(30) && B.rpgXpNeed(30) < B.rpgXpNeed(64), '升級需求愈來愈高');

  /* 怪的等級與經驗 */
  ok(B.rpgFoeLv(1) === 1 && B.rpgFoeLv(2) === 3, '第 1 關怪 Lv.1、第 2 關 Lv.3（每關 +2）');
  ok(B.rpgFoeLv(32) === 63, '第 32 關（第八大關最後）怪 Lv.63');
  ok(B.rpgFoeXp(32) > B.rpgFoeXp(16) && B.rpgFoeXp(16) > B.rpgFoeXp(1), '後面的關卡經驗比較多');
  ok(B.rpgFoeXp(32) >= B.rpgFoeXp(1) * 8, '第 32 關的單隻經驗是第 1 關的 8 倍以上（' +
    B.rpgFoeXp(1) + ' → ' + B.rpgFoeXp(32) + '）');

  /* 入帳 */
  const lv0 = B.RPG.lv;
  const r1 = B.rpgAddXp(B.rpgXpTotalOf(12));
  ok(r1.lv === 12 && r1.up === 12 - lv0, '一次進帳 → 直接升到 12 級（回報升了幾級）');
  ok(B.RPG.lv === 12, 'RPG.lv 跟著更新');
  B.rpgAddXp(999999);
  ok(B.RPG.lv === 65, '經驗爆量也只到 65 級');
}

head('④ 原始碼：等級系統真的接進遊戲');
ok(SRC.indexOf('e.lv = foeLv; e.exp = rpgFoeXp(stage);') > 0, '每隻怪有自己的等級與經驗');
ok(SRC.indexOf('e.hp = Math.max(1, Math.round(F.hp * foeHpMul));') > 0, '後面大關的怪血比較厚');
ok(SRC.indexOf('boss.lv = foeLv; boss.exp = rpgFoeXp(stage) * 5;') > 0, '魔王經驗 5 倍');
ok(SRC.indexOf('rpgGainFoeExp(e);') > 0, '打死怪就累積經驗');
ok(SRC.indexOf('RPG.xpGain = 0;') > 0, '陣亡／換關要把這一關的暫存經驗清掉');
ok(SRC.indexOf("rpgAddXp(gain);") > 0 && SRC.indexOf("{ exp: gain }") > 0, '過關才入帳（本機＋後端一起）');
ok(SRC.indexOf('id="rpgLvBar"') > 0, 'RPG 面板有等級／經驗列');
ok(SRC.indexOf('data-k="lv"') > 0, '遊戲中的 HUD 有 Lv 晶片');
ok(SRC.indexOf('經驗值') > 0 || SRC.indexOf('EXP ') > 0, '畫面上看得到經驗');

/* ================================================================ ⑤ */
head('⑤ 後端真的跑一次：經驗入帳與上限');
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
  r.end = function (s) { r.body = String(s || ''); if (r.headers['Set-Cookie'] || r.headers['set-cookie']) r.cookie = [].concat(r.headers['Set-Cookie'] || r.headers['set-cookie'])[0].split(';')[0]; };
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bh-v518-'));
  const cloud = cloudMod.createCloud({ dir: dir, persist: true, env: {}, fetch: makeFetch() });
  await cloud.ready;

  async function call(method, u, body, cookie) {
    const res = mkRes();
    await cloud.handle(mkReq(method, u, body, cookie), res, new URL('http://x' + u));
    let j = {};
    try { j = JSON.parse(res.body || '{}'); } catch (e) {}
    return { code: res.code, j: j, cookie: res.cookie };
  }

  const dev = 'dev-lv-aaaaaaaa-1111';
  let r = await call('POST', '/api/auth/guest', { deviceId: dev });
  ok(r.j.ok && r.j.account, '建立遊客帳號');
  const ck = r.cookie;
  ok(!!ck, '拿到 session（後面要帶著它）');
  ok(r.j.account.lv === 1, '新帳號 1 級');
  ok(r.j.account.points === 9, '新帳號 9 點（創角）');
  ok(r.j.account.xp === 0 && r.j.account.xpNeed === 82, '0 / 82 經驗');

  // 只有 9 點時不能亂配
  r = await call('POST', '/api/rpg/spend', { attr: 'hp', delta: 1 }, ck);
  ok(r.j.ok === false && r.j.err === 'NO_POINTS', '點數用完就不能再加（9 點全配在預設值上）');

  // 過關（帶經驗）
  const CAP1 = cloudMod.stageXpOf(1, 22);
  r = await call('POST', '/api/rpg/stage-clear', { stage: 1, exp: 999999 }, ck);
  ok(r.j.ok && r.j.expGain === CAP1, '經驗被夾在單關上限（' + r.j.expGain + '）');
  ok(r.j.lv >= 2, '拿了經驗就升級（Lv.' + r.j.lv + '）');
  ok(r.j.account.points === 9 + Math.floor(r.j.lv / 2), '配點跟著等級長');
  ok(r.j.account.xpTotal === CAP1, '累積經驗存進帳號');

  const lvNow = r.j.lv, ptsNow = r.j.account.points;
  r = await call('POST', '/api/rpg/stage-clear', { stage: 2, exp: 0 }, ck);
  ok(r.j.ok && r.j.expGain === 0, '經驗 0 也照樣過關（不給經驗）');
  r = await call('POST', '/api/rpg/stage-clear', { stage: 3, exp: -500 }, ck);
  ok(r.j.ok && r.j.expGain === 0, '負數經驗會被夾成 0（想倒扣別人的經驗也沒辦法）');

  // 剩下的關卡直接呼叫後端函式（HTTP 有「3 次／2 秒」的節流，跑 29 關會撞到）
  const rpg = { alloc: { hp: 3, def: 2, spd: 2, atk: 2 }, cleared: 0, gold: 0, xp: 0, char: 0, ver: 1 };
  let rr = cloudMod.applyClear(rpg, 30, { exp: 100 });
  ok(!rr.ok && rr.err === 'STAGE_LOCKED', '不能跳關（照規矩一關一關來）');
  rr = cloudMod.applyClear(rpg, 1, { exp: 999999 });
  ok(rr.ok && rr.expGain === CAP1, '直接呼叫也一樣夾上限');
  for (let st = 2; st <= 32; st++) rr = cloudMod.applyClear(rpg, st, { exp: 999999 });
  ok(rr.lv === 65, '一路打完 32 關 → 65 級（實際 ' + rr.lv + '）');
  ok(rr.points === 40 && cloudMod.pointsTotalFor(rpg) === 40, '65 級 → 40 點（四項全滿，不會溢出）');
  ok(rpg.xp <= cloudMod.XP_MAX, '累積經驗不會超過滿級所需（' + rpg.xp + ' ≤ ' + cloudMod.XP_MAX + '）');
  ok(cloudMod.pointsTotalFor(rpg) - cloudMod.BASE_POINTS === 31, '65 級剛好 31 點來自等級（每 2 級 1 點）');

  // 舊帳號換算
  const old = { cleared: 32 };
  const xpOld = cloudMod.ensureXp(old);
  ok(xpOld > 0 && old.xp === xpOld, '舊帳號（只有 cleared）會自動換算出經驗並寫回去');
  ok(cloudMod.lvOfXp(xpOld).lv >= 55, '打完全部 32 關的舊玩家至少 55 級（' + cloudMod.lvOfXp(xpOld).lv + '）');
  ok(cloudMod.pointsTotalFor({ xp: xpOld }) >= 36, '換算後點數不會比舊制（15 點）少');
  ok(cloudMod.ensureXp({ cleared: 0, xp: -5 }) === 0, '壞掉的 xp（負數）會被修好');

  // 稱號：心跳帶代號 → 別人看得到
  const A = 'dev-tt-aaaaaaaa-1111', B2 = 'dev-tt-bbbbbbbb-2222';
  r = await call('POST', '/api/social/hb', { deviceId: A, name: '戴稱號的人', ch: 0, kind: 'guest', tt: 3 });
  const pidA = r.j.me.pid;
  ok(r.j.me.tt === 3, '心跳帶 tt=3 → 存起來');
  r = await call('POST', '/api/social/hb', { deviceId: A, name: '戴稱號的人', ch: 0, kind: 'guest', tt: 99 });
  ok(r.j.me.tt === 8, '亂塞 99 會被夾成 8（開發者代號）');
  r = await call('GET', '/api/social/list?deviceId=' + B2 + '&name=乙');
  const seen = (r.j.list || []).filter(function (p) { return p.pid === pidA; })[0];
  ok(seen && seen.tt === 8, '別人的名單看得到你的稱號代號');
  r = await call('POST', '/api/social/hb', { deviceId: A, name: '戴稱號的人', ch: 0, kind: 'guest', tt: -1 });
  ok(r.j.me.tt === -1, '改成「不戴」也存得住');

  console.log('\n' + (fail ? '\u274c 通過 ' + pass + ' / ' + (pass + fail) : '\u2705 通過 ' + pass + ' / ' + (pass + fail)));
  process.exit(fail ? 1 : 0);
})().catch(function (e) { console.error('FAIL', e && e.stack || e); process.exit(1); });
