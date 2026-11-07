/* =====================================================================
 * verify-v519：RPG 傷害重做（攻擊＝純傷害）＋ 角色畫面／營地／招式系統
 *   ① 傷害公式：2 + 1.2×atk（0→2、10→14），攻擊不再影響爆炸範圍
 *   ② 爆炸範圍：起始 2 格，每 15 級 +1，再加永久強化與場上道具
 *   ③ 角色天賦：8 個角色各一個，乘在最終數值上
 *   ④ 招式：10 招（4 主動 6 被動）、純冷卻、零傷害、每 5 級 1 點技能點
 *   ⑤ 補給（這一場）與永久強化（買了就一直）兩張表
 *   ⑥ 畫面與匯出：角色畫面／營地／雜貨商人／招式師／技能列
 *   ⑦ i18n：新文案 5 種語言都有
 * ================================================================== */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { EventEmitter } = require('events');
const { makeEnv } = require('./_sandbox');
const cloudMod = require(path.join(__dirname, '..', '..', 'cloud.js'));

const ROOT = path.join(__dirname, '..');
// v5.38：版本紀錄搬到 js/version-log.js
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8') + '\n' +
  (function () { try { return fs.readFileSync(path.join(ROOT, 'js', 'version-log.js'), 'utf8'); } catch (e) { return ''; } })();
const env = makeEnv();
const P = env.BH;

let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } }
function head(t) { console.log('\n' + t); }

/* ================================================================ ⓪ */
head('⓪ 版本');
const vm = SRC.match(/const VERSION = '([^']+)'/);
ok(vm && (vm[1].split('.').map(Number)[1] | 0) >= 19, '版本是 5.19 以上（' + (vm ? vm[1] : '?') + '）');
ok(vm && SRC.indexOf('id="verTxt">' + vm[1]) > 0, '徽章 verTxt 與 VERSION 同步（' + (vm ? vm[1] : '?') + '）');
ok(SRC.indexOf("{ v: '5.19'") > 0, 'VERSION_LOG 留著 5.19 這一筆');
ok(/\{ v: '5\.18', date: '[^']+', now: false/.test(SRC), '上一版 5.18 已標成 now:false');
{
  const m = SRC.match(/\{ v: '5\.19',[\s\S]*?items: \[([\s\S]*?)\] \}/);
  const cnt = m ? (m[1].match(/^\s*'/gm) || []).length : 0;
  ok(cnt >= 4, '5.19 版本紀錄 ' + cnt + ' 條（至少 4 條）');
  ok(cnt > 0 && !/後台|開發者/.test(m[1]), '版本紀錄不出現「後台」「開發者」');
}

/* ================================================================ ① */
head('① 攻擊＝純傷害');
const D = P.rpgDerive;
const OPT = { talent: {}, lv: 1, bonus: { hp: 0, def: 0, fire: 0 } };
const want = [2, 3, 4, 6, 7, 8, 9, 10, 12, 13, 14];
let dmgOk = true, dmgList = [];
for (let a = 0; a <= 10; a++) {
  const d = D({ hp: 0, def: 0, spd: 0, atk: a }, OPT).dmg;
  dmgList.push(d);
  if (d !== want[a]) dmgOk = false;
}
ok(dmgOk, 'atk 0~10 → ' + dmgList.join('/') + '（2 + 1.2×atk）');
ok(D({ atk: 0 }, OPT).dmg === 2, '完全沒點攻擊也能打 2（不會卡 1 點）');
ok(D({ atk: 10 }, OPT).dmg === 14, '攻擊點滿 10 → 傷害 14');
ok(D({ atk: 0 }, OPT).dmg === D({ atk: 0 }, OPT).dmg, '同配點每次算出來一樣（沒有隨機）');
ok(D({ hp: 9, atk: 0 }, OPT).dmg === D({ hp: 0, atk: 0 }, OPT).dmg, '生命點數不影響傷害');
ok(D({ spd: 9, atk: 0 }, OPT).dmg === D({ hp: 0, atk: 0 }, OPT).dmg, '速度點數不影響傷害');
ok(P.flameHitDamage && typeof P.flameHitDamage === 'function', '有 flameHitDamage');
{
  const G = P.Game;
  const bak = G.rpg;
  G.rpg = true;
  G.players = [{ rpg: { hp: 0, def: 0, spd: 0, atk: 10 }, rpgDmg: 14 }];
  ok(P.flameHitDamage({ def: 0 }) === 14, '火焰讀 p.rpgDmg：14');
  ok(P.flameHitDamage({ def: 2 }) === 12, '怪物防禦 2 → 12（硬殼有意義）');
  ok(P.flameHitDamage({ def: 99 }) === 1, '防禦再高至少 1 點');
  G.players = [{ rpg: { atk: 0 } }];
  ok(P.flameHitDamage({ def: 0 }) === 1, '沒有 rpgDmg 時退回 1（安全值）');
  G.rpg = bak;
}

/* ================================================================ ② */
head('② 爆炸範圍改由等級提供');
ok(typeof P.rpgPowerOf === 'function', '有 rpgPowerOf');
const rng = [];
for (let lv = 1; lv <= 65; lv += 8) rng.push(lv + ':' + P.rpgPowerOf(lv, 0));
ok(P.rpgPowerOf(1, 0) === 2, 'Lv.1 → 2 格');
ok(P.rpgPowerOf(15, 0) === 3, 'Lv.15 → 3 格');
ok(P.rpgPowerOf(30, 0) === 4, 'Lv.30 → 4 格');
ok(P.rpgPowerOf(45, 0) === 5, 'Lv.45 → 5 格');
ok(P.rpgPowerOf(60, 0) === 6, 'Lv.60 → 6 格（上限附近）');
ok(P.rpgPowerOf(1, 3) === 5, '永久強化 +3 → Lv.1 也有 5 格');
ok(P.rpgPowerOf(1, 99) === 10, '範圍上限 10 格（' + P.rpgPowerOf(1, 99) + '）');
ok(D({ atk: 10 }, OPT).range === D({ atk: 0 }, OPT).range, '攻擊點數完全不影響範圍');
ok(D({}, { talent: {}, lv: 30, bonus: { hp: 0, def: 0, fire: 1 } }).range === 5, 'Lv.30 + 永久強化 1 = 5 格');

/* ================================================================ ③ */
head('③ 角色天賦');
ok(Array.isArray(P.CHAR_TALENTS) && P.CHAR_TALENTS.length === P.CHARACTERS.length,
  '天賦數量 = 角色數量（' + (P.CHAR_TALENTS || []).length + '）');
{
  let allOk = true;
  (P.CHAR_TALENTS || []).forEach(function (t) {
    if (!t || !t.n || !t.d) allOk = false;
  });
  ok(allOk, '每個天賦都有名稱與一行說明');
  const names = (P.CHAR_TALENTS || []).map(function (t) { return t.n; });
  ok(new Set(names).size === names.length, '天賦名稱不重複（' + names.join('、') + '）');
}
{
  const t0 = P.charTalent(0);
  ok(t0 && t0.n, 'charTalent(0) 拿得到天賦（' + (t0 ? t0.n : '?') + '）');
  const t0b = P.charTalent(0), t1 = P.charTalent(1);
  const anyDiff = t0b.n !== (t1 ? t1.n : '');
  ok(anyDiff, '不同角色天賦不同（' + t0b.n + ' / ' + (t1 ? t1.n : '?') + '）');
}
{
  // 天賦要真的乘進最終數值
  const fast = { n: 't', d: 't', spd: 1.1 };
  const a = D({ hp: 0, def: 0, spd: 0, atk: 0 }, { talent: fast, lv: 1, bonus: {} });
  ok(Math.abs(a.spdMul - 1.1) < 1e-9, '天賦速度 ×1.1 → spdMul = 1.1');
  const tough = { n: 't', d: 't', hp: 2, armor: 1 };
  const b = D({ hp: 0, def: 0, spd: 0, atk: 0 }, { talent: tough, lv: 1, bonus: {} });
  ok(b.maxHp === 4 && b.armor === 1, '天賦生命 +2／護甲 +1 有算進去（' + b.maxHp + '/' + b.armor + '）');
}

/* ================================================================ ④ */
head('④ 招式');
const SK = P.RPG_SKILLS || [];
ok(SK.length === 10, '一共 10 招（' + SK.length + '）');
ok(SK.filter(function (x) { return x.kind === 'act'; }).length === 4, '主動 4 招');
ok(SK.filter(function (x) { return x.kind === 'pas'; }).length === 6, '被動 6 招');
{
  let bad = [];
  SK.forEach(function (x) {
    if (!x.id || !x.n || !x.ico || !x.desc) bad.push(x.id + ':缺欄位');
    if (!(x.lv >= 1 && x.lv <= 30)) bad.push(x.id + ':lv=' + x.lv);
    if (!(x.max >= 1 && x.max <= 3)) bad.push(x.id + ':max=' + x.max);
  });
  ok(bad.length === 0, '每招都有 id／名稱／圖示／說明，lv 1~30、max 1~3' + (bad.length ? '（' + bad.join('、') + '）' : ''));
  const ids = SK.map(function (x) { return x.id; });
  ok(new Set(ids).size === ids.length, '招式 id 不重複');
}
ok(SK[0].id === 'det' && SK[0].lv === 1, '第一招是遙控引爆、Lv.1 就能學（新手 1 點技能點不會卡住）');
ok(SK.filter(function (x) { return x.kind === 'act' && x.grow && x.grow.length === x.max; }).length === 4,
  '主動招式每一級都有成長描述');
/* 招式零傷害 */
{
  const i0 = SRC.indexOf('const RpgSkill = (function');
  const i1 = SRC.indexOf('})();', SRC.indexOf('return { reset: reset', i0));
  const seg = i0 > 0 && i1 > i0 ? SRC.slice(i0, i1) : '';
  ok(seg.length > 2000, 'RpgSkill 模組抓得到（' + seg.length + ' 字元）');
  ok(!/\.hp\s*-=/.test(seg), '招式不會直接扣怪物血（零傷害）');
  ok(!/Game\.foes[\s\S]{0,40}hp\s*=/.test(seg), '招式不會改怪物血量');
  ok(/Game\.players\[0\]/.test(seg), '招式只作用在玩家自己身上');
}
/* 技能點 */
ok(typeof P.rpgSkPts === 'function' && typeof P.rpgSkLeft === 'function', '有 rpgSkPts／rpgSkLeft');
{
  const RP = P.RPG;
  const bak = RP.xp;
  function ptsAt(lv) {
    // 直接換算：rpgSkPts 讀 RPG.xp
    RP.xp = 0;
    let guard = 0;
    while (P.rpgLvOf(RP.xp).lv < lv && guard++ < 400) {
      RP.xp = P.rpgXpNext ? RP.xp : RP.xp;
      break;
    }
    return null;
  }
  RP.xp = bak;
  ok(P.rpgSkPts() === 1 + Math.floor(P.rpgLvOf(RP.xp).lv / 5), '技能點 = 1 + floor(Lv/5)');
  ok(P.rpgSkPts() >= 1, 'Lv.1 就有 1 點（' + P.rpgSkPts() + '）');
}
{
  const RP = P.RPG;
  const bakSk = RP.sk, bakLoad = RP.skLoad;
  RP.sk = { det: 1 };
  RP.skLoad = ['det'];
  const lo = P.rpgLoadout();
  ok(lo.length === 1 && lo[0] === 'det', '出戰欄會自動收進已學會的主動招式');
  RP.sk = { kick: 1 };            // 被動不算出戰欄
  RP.skLoad = ['kick'];
  ok(P.rpgLoadout().length === 0, '被動招式不會佔出戰欄');
  RP.sk = { det: 1, shield: 1, frost: 1, quake: 1 };
  RP.skLoad = ['det', 'shield', 'frost', 'quake'];
  ok(P.rpgLoadout().length === 4, '出戰欄最多 4 個');
  RP.sk = bakSk; RP.skLoad = bakLoad;
}
ok(P.RPG_SK_MAX === 3 && P.RPG_SK_SLOTS === 4, '每招 3 級、出戰 4 欄');

/* ================================================================ ⑤ */
head('⑤ 補給與永久強化');
const BAG = P.RPG_BAG || [];
const PERM = P.RPG_PERM_UP || [];
ok(BAG.length === 6, '雜貨商人有 6 件補給（' + BAG.length + '）');
ok(BAG.every(function (x) { return x.id && x.n && x.price > 0 && x.desc; }), '每件補給都有名稱、價格、說明');
ok(BAG.some(function (x) { return x.buff && x.buff.revive; }), '有復活幣（buff.revive）');
ok(PERM.length === 3, '永久強化 3 項（' + PERM.length + '）');
ok(PERM.every(function (x) { return x.id && x.prices && x.prices.length === 3; }), '每項永久強化都有 3 級價格');
{
  const RP = P.RPG;
  const bak = JSON.stringify(RP.perm || {});
  RP.perm = { hp: 0, bomb: 0, fire: 0 };
  const b0 = P.rpgBonus();
  ok((b0.hp | 0) === 0 && (b0.fire | 0) === 0 && (b0.def | 0) === 0, '沒強化時加成全是 0');
  RP.perm = { hp: 2, bomb: 1, fire: 3 };
  const b1 = P.rpgBonus();
  ok((b1.hp | 0) === 2 && (b1.bomb | 0) === 1 && (b1.fire | 0) === 3, '強化等級會轉成加成（2/1/3）');
  RP.perm = JSON.parse(bak);
}

/* ================================================================ ⑥ */
head('⑥ 畫面與匯出');
['scr-char', 'scr-camp', 'rpgShopModal', 'rpgSkillModal'].forEach(function (id) {
  ok(SRC.indexOf('id="' + id + '"') > 0, '有 #' + id);
});
ok(SRC.indexOf('id="skillBar"') > 0, '有 #skillBar 招式列');
ok(SRC.indexOf('id="btnChar"') > 0, '首頁抽屜有「角色」入口');
ok(SRC.indexOf('id="npcShop"') > 0 && SRC.indexOf('id="npcSkill"') > 0, '營地有雜貨商人與招式師');
ok(SRC.indexOf('id="campGo"') > 0, '營地有「出發」');
['RpgUI', 'RpgSkill', 'rpgDerive', 'rpgBonus', 'rpgLoadout', 'rpgSkLv', 'rpgSkPts', 'rpgSkLeft',
 'rpgPowerOf', 'RPG_SKILLS', 'RPG_BAG', 'RPG_PERM_UP', 'rpgTakeBag', 'charTalent', 'CHAR_TALENTS',
 'rpgApplyCamp'].forEach(function (k) {
  ok(P[k] !== undefined, '__BH 匯出 ' + k);
});
ok(typeof P.RpgUI.openChar === 'function' && typeof P.RpgUI.openCamp === 'function', 'RpgUI 有 openChar／openCamp');
ok(typeof P.RpgUI.depart === 'function', 'RpgUI 有 depart（營地出發）');
ok(typeof P.RpgUI.buyBag === 'function' && typeof P.RpgUI.buyPerm === 'function', 'RpgUI 有 buyBag／buyPerm');
ok(typeof P.RpgUI.learn === 'function', 'RpgUI 有 learn（學招式）');
ok(typeof P.RpgSkill.cast === 'function' && typeof P.RpgSkill.syncBar === 'function', 'RpgSkill 有 cast／syncBar');
/* 進場有把配點換成實際戰鬥數值 */
ok(/p\.rpgDmg\s*=/.test(SRC), 'startRpg 會把傷害算進 p.rpgDmg');
ok(/p\.power\s*=\s*rpgDerive\(p\.rpg\)\.range/.test(SRC), 'startRpg 會把範圍算進 p.power');
ok(/RpgSkill\.reset\(\);/.test(SRC) && /RpgSkill\.syncBar\(\);/.test(SRC), 'startRpg 會重置並同步招式列');
ok(/RpgSkill\.tick\(dt\)/.test(SRC), '主迴圈有跑招式冷卻');
/* 復活幣 */
ok(/p\.revive/.test(SRC) && /hpMax\s*\/\s*2/.test(SRC), '復活幣會以半血復活');
/* 商店扣款 */
ok(/spend\s*:\s*spend/.test(SRC) || /function spend/.test(SRC), 'Shop 有扣款函式 spend');

/* ================================================================ ⑦ */
head('⑦ i18n：新文案 5 種語言');
{
  const need = ['char.title', 'char.sk', 'char.prog', 'char.go', 'char.alloc', 'char.swap',
    'camp.title', 'camp.desc', 'camp.desc2', 'camp.shop', 'camp.skill', 'camp.stage', 'camp.go',
    'camp.back', 'camp.bagHave', 'camp.bagNone', 'camp.stageNow',
    'shop.title', 'shop.tabBag', 'shop.tabPerm', 'shop.note', 'shop.notePerm', 'shop.done',
    'skill.title', 'skill.tabLearn', 'skill.tabLoad', 'skill.per', 'skill.ptsLeft', 'skill.note',
    'rpg.talent.light', 'rpg.talent.light.d', 'rpg.gotoCamp', 'rpg.toCamp'];
  const LANGS = P.LANGS.map(function (l) { return l.id; });
  let miss = [];
  need.forEach(function (k) {
    LANGS.forEach(function (lg) {
      const d = P.I18N[lg];
      if (!d || typeof d[k] !== 'string' || !d[k]) miss.push(lg + ':' + k);
    });
  });
  ok(miss.length === 0, '33 條新文案 × 5 語都齊全' + (miss.length ? '（缺 ' + miss.slice(0, 5).join('、') + '）' : ''));
  ok(P.tr('雜貨商人') !== '雜貨商人' || P.LANG === 'zh-TW', 'tr() 認得新文案「雜貨商人」');
  P.setLang('en', true);
  ok(P.t('camp.go').indexOf('Set out') >= 0, '英文：camp.go = ' + P.t('camp.go'));
  ok(P.t('shop.done') === 'Done', '英文：shop.done = Done');
  P.setLang('ja', true);
  ok(P.t('camp.title').indexOf('キャンプ') >= 0, '日文：camp.title = ' + P.t('camp.title'));
  P.setLang('zh-TW', true);
}

/* ================================================================ ⑧ */
head('⑧ 怪物血量與魔王（配合新傷害）');
{
  const F = P.RPG_FOE || {};
  const all = Object.keys(F).map(function (k) { return F[k].hp; });
  ok(all.every(function (v) { return v >= 4 && v <= 6; }), '小怪血量 4~6（' + all.join('/') + '）');
  ok(P.FOE_HP.slime === 4, '史萊姆 4 血（攻擊 0 也要打 2 下）');
  // v5.36：最終魔王搬到第 8 章決戰場（bossFin）→ 一樣 48 血；其他章節依章數遞增
  ok(/makeBoss\([^)]*bossFin \? 48 :/.test(SRC), '最終魔王 48 血（其餘章節 12 + 章節 × 2）');
  ok(/boss\.def\s*=\s*2/.test(SRC), '最終魔王防禦 2');
}

/* ================================================================ ⑨ */
head('⑨ 後端真的跑一次：營地端點');
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bh-v519-'));
  const cloud = cloudMod.createCloud({ dir: dir, persist: true, env: {}, fetch: makeFetch() });
  await cloud.ready;

  async function call(method, u, body, cookie) {
    const res = mkRes();
    await cloud.handle(mkReq(method, u, body, cookie), res, new URL('http://x' + u));
    let j = {};
    try { j = JSON.parse(res.body || '{}'); } catch (e) {}
    return { code: res.code, j: j, cookie: res.cookie };
  }

  let r = await call('POST', '/api/auth/guest', { deviceId: 'dev-camp-aaaaaaaa-1111' });
  ok(r.j.ok && r.j.account, '建立遊客帳號');
  const ck = r.cookie;
  ok(!!ck, '拿到 session');
  ok(r.j.account.rpg.perm && r.j.account.rpg.perm.hp === 0, '新帳號有 perm 欄位（0/0/0）');
  ok(r.j.account.rpg.sk && Object.keys(r.j.account.rpg.sk).length === 0, '新帳號沒有半招');
  ok(r.j.account.rpg.bag && Object.keys(r.j.account.rpg.bag).length === 0, '新帳號背包是空的');
  ok(r.j.account.skPts === 1 && r.j.account.skLeft === 1, '新帳號 1 點技能點（' + r.j.account.skPts + '/' + r.j.account.skLeft + '）');

  /* 營地狀態：伺服器只負責存 + 夾回合法範圍（金幣是 Shop 那一套，不歸這裡管） */
  r = await call('POST', '/api/rpg/camp', {
    perm: { hp: 99, bomb: -5, fire: 2 },
    sk: { det: 9, quake: 1, nope: 5 },
    skLoad: ['det', 'det', 'kick', 'nope', 'det', 'det'],
    bag: { hp1: 99, hack: 3 }
  }, ck);
  ok(r.j.ok, '存營地狀態成功');
  const ap = r.j.account.rpg;
  ok(ap.perm.hp === 3, '永久強化夾在 3（送 99 → 3）');
  ok(ap.perm.bomb === 0, '負數夾成 0（送 −5 → 0）');
  ok(ap.perm.fire === 2, '合法值原樣保留（fire 2）');
  ok(ap.sk.det === 3, '招式等級夾在 max 3（送 9 → 3）');
  ok(ap.sk.quake === 1, '其他招式保留（quake 1）');
  ok(ap.sk.nope === undefined, '不存在的招式被丟掉');
  ok(ap.skLoad.length === 1 && ap.skLoad[0] === 'det',
    '出戰欄去重、擋未學、擋被動（6 個亂送的 id → 只剩 det）');
  ok(ap.bag.hp1 === 9, '補給夾在 9（送 99 → 9）');
  ok(ap.bag.hack === undefined, '不存在的補給被丟掉');
  ok(r.j.skPts === 1 && r.j.skLeft === 0, '技能點由伺服器算（總 1 點、已用 4 → 剩 0）');

  r = await call('POST', '/api/rpg/camp', { perm: null, sk: 'x', skLoad: 'abc', bag: [] }, ck);
  ok(r.j.ok && r.j.account.rpg.perm.hp === 0 && Object.keys(r.j.account.rpg.sk).length === 0,
    '亂傳型別也不會壞（全部回到預設）');

  r = await call('GET', '/api/rpg/state', undefined, ck);
  ok(r.j.account.rpg.perm && r.j.account.rpg.sk && r.j.account.rpg.bag, '回傳的帳號一定帶著 perm／sk／bag');
  ok(typeof r.j.account.skPts === 'number' && typeof r.j.account.skLeft === 'number', '回傳帶著技能點（總數／剩餘）');

  console.log('\n' + (fail ? '✗' : '✓') + ' 通過 ' + pass + ' 項，失敗 ' + fail + ' 項');
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
  process.exit(fail ? 1 : 0);
})().catch(function (e) {
  console.error('✗ 後端測試爆掉：' + (e && e.message));
  process.exit(1);
});
