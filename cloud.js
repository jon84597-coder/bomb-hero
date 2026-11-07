'use strict';

/* ============================================================================
 * cloud.js —— 《爆爆英雄》帳號 / 第三方登入 / 雲端存檔 / 資安防護
 * ----------------------------------------------------------------------------
 * 零依賴（只用 Node 內建 crypto / fs / path + Node18 全域 fetch）。
 *
 * 設計原則（對應規格書）：
 *   1. 伺服器權威：前端只能送「意圖」（spend_point / stage_clear），
 *      所有點數、上限、解鎖順序、金幣全部由後端計算，前端送的數值一律不採信。
 *   2. 傳輸加密：由 server.js 強制 HTTPS（x-forwarded-proto）+ HSTS。
 *   3. 存檔簽章：伺服器用密鑰對存檔內容做 HMAC-SHA256，讀回時先驗章。
 *      簽章不符 → 拒絕載入、記錄 tamper 次數、回 409。
 *   4. 頻率限制：每個帳號 / IP 各自的 token bucket（存檔 1 次/秒）。
 *   5. 遊客可無痛升級：裝置（LocalStorage Device ID）對應一個 guest 帳號，
 *      綁定第三方帳號時把遊客進度「合併」（取聯集，不覆蓋）進正式帳號。
 * ========================================================================== */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
// v4.90：後台要顯示「後端版本」——直接讀 package.json，避免又多一處要手動同步
let PKG = null;
try { PKG = require('./package.json'); } catch (e) { PKG = null; }

const ATTRS = ['hp', 'def', 'spd', 'atk'];
const BASE_POINTS = 9;          // 創角配點
const CAP = 10;                 // 單項上限
const MAX_POINTS = ATTRS.length * CAP;   // 40（全部點滿）
const FREE_PER = 3;             // v5.46：每項前 3 格用免費點，第 4 格起一律金幣（價錢由前端算，這裡只當裁判）
const MAX_STAGE = 40;   // v5.36：單人/RPG 改成 40 關（8 大主題 × 5）
const SESSION_TTL = 30 * 24 * 3600 * 1000;
// v4.13：「維持登入」勾選後，這次登入的有效期改成 1 年（不勾則 30 天）
const KEEP_TTL = 365 * 24 * 3600 * 1000;
const COOKIE = 'bh_sid';

/* ---------------------------------------------------------------- 小工具 */

function b64u(buf) {
  return Buffer.from(buf).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function hmacB64(secret, data) {
  return b64u(crypto.createHmac('sha256', secret).update(String(data)).digest());
}
function sha256(s) {
  return crypto.createHash('sha256').update(String(s)).digest('hex');
}
function safeEq(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  try { return crypto.timingSafeEqual(ba, bb); } catch (e) { return false; }
}
function rid(n) {
  return crypto.randomBytes(n || 9).toString('hex');
}
function clampInt(v, lo, hi, def) {
  let n = Number(v);
  if (!isFinite(n)) return def;
  n = Math.floor(n);
  if (n < lo) return lo;
  if (n > hi) return hi;
  return n;
}
/* 穩定序列化：同樣內容永遠得到同樣字串（HMAC 才不會因為鍵序不同而失效） */
function canonical(v) {
  if (v === null || typeof v !== 'object') {
    if (v === undefined) return 'null';
    return JSON.stringify(v);
  }
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  const keys = Object.keys(v).filter(function (k) { return v[k] !== undefined; }).sort();
  return '{' + keys.map(function (k) { return JSON.stringify(k) + ':' + canonical(v[k]); }).join(',') + '}';
}

/* ================================================================
   v4.3：傳統帳密 —— 密碼雜湊（資安核心）
   ----------------------------------------------------------------
   本專案堅持「零 npm 依賴」，所以不用 bcrypt/argon2 套件（那些要編譯），
   改用 Node 內建 crypto.scrypt：記憶體困難（memory-hard）的 KDF，
   OWASP 把它列為 Argon2 之外的首選，抗 GPU／ASIC 暴力破解的強度同級。
   · 每位使用者一組獨立的 16-byte 隨機鹽（絕不加固定鹽、絕不共用）
   · 只存 algo/N/r/p/salt/hash —— 資料庫裡沒有任何明文或可逆加密的密碼
   · 比對用 crypto.timingSafeEqual，避免計時側通道
   ================================================================ */
const PW_MIN = 8, PW_MAX = 128;
const SCRYPT_N = 16384, SCRYPT_R = 8, SCRYPT_P = 1, SCRYPT_KEYLEN = 64;
const SCRYPT_MAXMEM = 96 * 1024 * 1024;
const RE_EMAIL = /^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/i;
const RE_USER = /^[a-z0-9_]{3,20}$/i;

function scryptAsync(pw, salt, N, r, p, keylen) {
  return new Promise(function (resolve, reject) {
    crypto.scrypt(pw, salt, keylen, { N: N, r: r, p: p, maxmem: SCRYPT_MAXMEM }, function (err, dk) {
      if (err) reject(err); else resolve(dk);
    });
  });
}
async function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const dk = await scryptAsync(String(pw), salt, SCRYPT_N, SCRYPT_R, SCRYPT_P, SCRYPT_KEYLEN);
  return {
    algo: 'scrypt', v: 1, N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P,
    salt: salt.toString('base64'), hash: dk.toString('base64')
  };
}
async function verifyPassword(pw, rec) {
  if (!rec || rec.algo !== 'scrypt' || !rec.salt || !rec.hash) return false;
  const salt = Buffer.from(String(rec.salt), 'base64');
  const want = Buffer.from(String(rec.hash), 'base64');
  if (!salt.length || want.length < 16) return false;
  const N = clampInt(rec.N, 1024, 1 << 20, SCRYPT_N);
  const r = clampInt(rec.r, 1, 32, SCRYPT_R);
  const p = clampInt(rec.p, 1, 16, SCRYPT_P);
  const dk = await scryptAsync(String(pw), salt, N, r, p, want.length);
  return dk.length === want.length && crypto.timingSafeEqual(dk, want);
}
/* 帳號：可用 Email 或「使用者名稱」（3~20 位英數／底線，不含特殊符號） */
function validIdent(v) {
  const s = String(v == null ? '' : v).trim();
  if (!s || s.length > 120) return { ok: false, err: 'BAD_ID' };
  const low = s.toLowerCase();
  if (s.indexOf('@') >= 0) {
    if (!RE_EMAIL.test(s)) return { ok: false, err: 'BAD_EMAIL' };
    return { ok: true, kind: 'email', id: low, key: 'web:' + low };
  }
  if (!RE_USER.test(s)) return { ok: false, err: 'BAD_USER' };
  return { ok: true, kind: 'user', id: low, key: 'web:' + low };
}
function pwProblem(pw) {
  const s = String(pw == null ? '' : pw);
  if (s.length < PW_MIN) return 'PW_SHORT';
  if (s.length > PW_MAX) return 'PW_LONG';
  if (!/[a-z]/i.test(s)) return 'PW_NEED_LETTER';
  if (!/[0-9]/.test(s)) return 'PW_NEED_DIGIT';
  return '';
}
/* 開發者白名單：預設 jon84597@gmail.com，可用環境變數 BH_DEV_EMAILS 追加（逗號分隔） */
const DEV_EMAILS_DEFAULT = ['jon84597@gmail.com'];
function devEmailList(env) {
  const list = DEV_EMAILS_DEFAULT.slice();
  const raw = String((env && env.BH_DEV_EMAILS) || '').trim();
  if (raw) {
    raw.split(/[,;\s]+/).forEach(function (e) {
      const s = e.trim().toLowerCase();
      if (s && list.indexOf(s) < 0) list.push(s);
    });
  }
  return list;
}
/* 後台「加入時間」要精確到秒：yyyy-mm-dd hh:mm:ss（伺服器本地時區） */
/* v5.7：時間字串一律輸出「台灣時間（UTC+8）」。
   以前用 getHours()＝「伺服器本機時區」，而 Render／Docker 容器是 UTC，
   於是後台看到的「最後上線／加入時間」都比台灣實際時間少 8 小時（玩家反映對不起來就是這個）。
   改成 getUTC* + 固定 +8 偏移 → 不管伺服器放在哪個時區，輸出都是同一種時間。
   注意：時間戳（a.created／a.lastSeen）本身一直是 UTC 毫秒，這支只影響「顯示字串」。 */
const TW_OFFSET_MS = 8 * 3600 * 1000;
function stamp(ms) {
  const d = new Date((ms || Date.now()) + TW_OFFSET_MS);
  function two(n) { return (n < 10 ? '0' : '') + n; }
  return d.getUTCFullYear() + '-' + two(d.getUTCMonth() + 1) + '-' + two(d.getUTCDate()) + ' ' +
    two(d.getUTCHours()) + ':' + two(d.getUTCMinutes()) + ':' + two(d.getUTCSeconds());
}

/* v5.7：「今天」一律以台灣時間切日（伺服器在 UTC，用 setHours(0,0,0,0) 會晚 8 小時換日） */
function twDayStart(ms) {
  const d = new Date((ms || Date.now()) + TW_OFFSET_MS);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime() - TW_OFFSET_MS;
}

/* v5.7：後台「誰在什麼時間玩了什麼」用的分類
   STAGE_EVENTS：帶關號、且要計入「各關卡遊玩次數」的事件
   PLAY_EVENTS ：算「玩了一場」的事件（總覽的今日場次／名單的最近遊玩） */
const STAGE_EVENTS = { solo: 1, boss: 1, rpg: 1, clear: 1, play: 1 };
const PLAY_EVENTS = { solo: 1, boss: 1, rpg: 1, clear: 1, play: 1, battle: 1, br: 1, online: 1 };
/* 給後台顯示用的中文模式名（前端也會自己翻譯，這裡是後端備援） */
const EVENT_LABEL = {
  solo: '單人闖關', boss: 'BOSS 連戰', rpg: 'RPG 模式', clear: '過關',
  play: '開始遊玩', battle: '本機對戰', br: '大逃殺', online: '線上配對', act: '操作',
  /* v5.14：以前這幾種只會印原始英文 type（save／bind／login／grant…），
     後台一看全是英文，客服根本不知道玩家當下做了什麼 */
  save: '雲端存檔', bind: '帳號綁定', register: '註冊帳號', login: '登入',
  'login-fail': '登入失敗', lock: '密碼錯誤鎖定', passwd: '修改密碼',
  share: '分享獎勵', ban: '被停權', unban: '解除停權', grant: '管理員調整進度',
  'reset-alloc': '管理員歸零配點'
};

function sumAlloc(a) {
  let n = 0;
  for (let i = 0; i < ATTRS.length; i++) n += (a && a[ATTRS[i]]) || 0;
  return n;
}
/* v5.46：這幾格是「花金幣買來的」——免費額度只算到每項第 3 格 */
function sumPaid(p) {
  let n = 0;
  for (let i = 0; i < ATTRS.length; i++) n += Math.max(0, (p && p[ATTRS[i]]) | 0);
  return n;
}
/* v5.46：洗點退款額 —— 跟前端 rpgPaidRefund() 同一套算法（2000 + 2500 + …） */
function paidRefund(rpg) {
  const p = (rpg && rpg.paid) || {};
  let sum = 0;
  for (let i = 0; i < ATTRS.length; i++) {
    const c = Math.max(0, p[ATTRS[i]] | 0);
    for (let j = 0; j < c; j++) sum += 2000 + 500 * j;
  }
  return sum;
}
const RESPEC_FEE = 1000;        // v5.46：洗點手續費（前端扣金幣用）
function freeCapOf(rpg) {
  return Math.min(pointsTotalFor(rpg), ATTRS.length * FREE_PER);
}
function freeLeftOf(rpg) {
  const p = rpg.paid || {};
  return Math.max(0, freeCapOf(rpg) - (sumAlloc(rpg.alloc) - sumPaid(p)));
}

/* ---------------------------------------------------------------- 進度數學 */

/* ================= v5.18：RPG 等級（1～65）與經驗值 =================
   經驗值只在後端計：前端送「這一關賺到多少」，這裡一律夾在
   「幾隻怪就算幾隻」的上限內，改機也塞不出天文數字。
   等級不存 —— 只存 xp，等級永遠由 xp 推導，兩邊不會不同步。 */
const LV_MAX = 65;
const XP_E0 = 8, XP_E1 = 1.8;          // 每隻怪：E0 + E1 × 怪物等級
const XP_C0 = 40, XP_C1 = 10;          // 過關：C0 + C1 × 關號
const XP_N0 = 80, XP_N1 = 2.34;        // 升到下一級需要：N0 + N1 × Lv^1.5
const XP_MIGRATE_FOES = 10;            // 舊帳號換算用（一關平均約 10 隻）
const XP_CAP_FOES = 22;                // 單關經驗上限（最多 20 隻怪 + 魔王，留一點餘裕）

function foeLvOfStage(stage) {
  const s = clampInt(stage, 1, MAX_STAGE, 1);
  return Math.min(LV_MAX - 1, 1 + Math.round((s - 1) * 2));   // 第 1 關 1 級、第 32 關 63 級
}
function foeXpOf(stage) {
  return Math.round(XP_E0 + XP_E1 * foeLvOfStage(stage));
}
function stageXpOf(stage, foes) {
  const s = clampInt(stage, 1, MAX_STAGE, 1);
  const f = clampInt(foes == null ? XP_MIGRATE_FOES : foes, 0, 40, XP_MIGRATE_FOES);
  let g = f * foeXpOf(s);
  if (s % 4 === 0) g += 5 * foeXpOf(s);            // 章節魔王
  return g + XP_C0 + XP_C1 * s;
}
function xpNeed(lv) {
  return Math.round(XP_N0 + XP_N1 * Math.pow(Math.max(1, clampInt(lv, 1, LV_MAX, 1)), 1.5));
}
function lvOfXp(xp) {
  let left = Math.max(0, Math.floor(Number(xp) || 0));
  let lv = 1;
  while (lv < LV_MAX && left >= xpNeed(lv)) { left -= xpNeed(lv); lv++; }
  return { lv: lv, cur: left, need: lv < LV_MAX ? xpNeed(lv) : 0 };
}
function xpTotalOfLv(lv) {
  const L = clampInt(lv, 1, LV_MAX, 1);
  let sum = 0;
  for (let i = 1; i < L; i++) sum += xpNeed(i);
  return sum;
}
const XP_MAX = xpTotalOfLv(LV_MAX);

/* 舊帳號沒有 xp → 用「已過幾關」換算一次（之後就以 xp 為準） */
function ensureXp(rpg) {
  if (!rpg || typeof rpg !== 'object') return 0;
  let xp = Math.floor(Number(rpg.xp));
  if (!isFinite(xp) || xp < 0) {
    xp = 0;
    const c = clampInt(rpg.cleared, 0, MAX_STAGE, 0);
    for (let i = 1; i <= c; i++) xp += stageXpOf(i, XP_MIGRATE_FOES);
    rpg.xp = xp;
  }
  if (xp > XP_MAX) rpg.xp = xp = XP_MAX;
  return xp;
}

/* 配點總數：創角 9 點 +「每 2 級 1 點」（65 級共 32 點 → 41，上限 40＝四項全滿）
   參數可以是 rpg 物件（新呼叫點）或「已過關數」（舊呼叫點，換算成等價經驗） */
function pointsTotalFor(rpgOrCleared) {
  let lv;
  if (rpgOrCleared && typeof rpgOrCleared === 'object') {
    lv = lvOfXp(ensureXp(rpgOrCleared)).lv;
  } else {
    let xp = 0;
    const c = clampInt(rpgOrCleared, 0, MAX_STAGE, 0);
    for (let i = 1; i <= c; i++) xp += stageXpOf(i, XP_MIGRATE_FOES);
    lv = lvOfXp(xp).lv;
  }
  return Math.min(MAX_POINTS, BASE_POINTS + Math.floor(lv / 2));
}
/* 每關金幣獎勵（每 4 關一個主題，越後面越多） */
function stageReward(stage) {
  const s = clampInt(stage, 1, MAX_STAGE, 1);
  return 40 + Math.floor((s - 1) / 4) * 10;
}
function goldFor(cleared) {
  let g = 0;
  const c = clampInt(cleared, 0, MAX_STAGE, 0);
  for (let i = 1; i <= c; i++) g += stageReward(i);
  return g;
}
function defaultRpg() {
  return {
    alloc: { hp: 3, def: 2, spd: 2, atk: 2 },
    bought: 0,                 // v5.44：花金幣買來的配點總數
    paid: { hp: 0, def: 0, spd: 0, atk: 0 },   // v5.45：各項買了幾格 → 決定下一格價錢
    cleared: 0,
    gold: 0,
    xp: 0,                     // v5.18：累積經驗（等級由它推導）
    char: 0,
    deaths: 0,
    playSec: 0,
    /* v5.19：營地 —— 永久強化 0~3、已學招式（id → 等級）、出戰 4 欄、這一場的補給 */
    perm: { hp: 0, bomb: 0, fire: 0 },
    sk: {},
    skLoad: [],
    bag: {},
    ver: 1,
    /* v5.20：營地存檔的樂觀鎖。每次寫入 +1，前端帶著自己看到的 baseRev 回來，
       對不上就代表「另一台裝置改過」→ 回 409 讓前端重讀，而不是無聲蓋掉。 */
    campRev: 0
  };
}

/* ---------- v5.19：營地的價目與門檻（後端權威，跟前端 RPG_BAG／RPG_PERM_UP／RPG_SKILLS 對齊）
   前端只送「買哪一個、學哪一招」，價格與點數在這裡算，
   所以改前端也刷不出便宜的道具或跳級的招式。 */
const CAMP_BAG = { hp1: 250, hp2: 600, arm1: 400, fire1: 500, rem1: 700, rev1: 1200 };
const CAMP_PERM = {
  hp: [600, 1200, 2400],
  bomb: [800, 1600, 3200],
  fire: [1000, 2000, 4000]
};
const CAMP_SK = {
  det: { lv: 1, max: 3 }, shield: { lv: 7, max: 3 }, frost: { lv: 14, max: 3 }, quake: { lv: 20, max: 3 },
  kick: { lv: 3, max: 1 }, pierce: { lv: 17, max: 1 }, bomb: { lv: 5, max: 3 },
  fire: { lv: 9, max: 3 }, hp: { lv: 12, max: 3 }, def: { lv: 24, max: 3 }
};
const SK_ACT = { det: 1, shield: 1, frost: 1, quake: 1 };
const SK_SLOTS = 4, SK_PER = 5, BAG_MAX = 9;

/* 技能點：起始 1 點，之後每 5 級 +1（跟前端 rpgSkPts 同一條公式） */
function rpgSkPtsOf(rpg) { return 1 + Math.floor(lvOfXp(ensureXp(rpg)).lv / SK_PER); }
function rpgSkSpentOf(rpg) {
  let t = 0;
  const o = (rpg && rpg.sk) || {};
  for (const k in o) if (CAMP_SK[k]) t += clampInt(o[k], 0, CAMP_SK[k].max, 0);
  return t;
}
function rpgSkLeftOf(rpg) { return Math.max(0, rpgSkPtsOf(rpg) - rpgSkSpentOf(rpg)); }

/* 把營地欄位夾成合法值（舊帳號沒有這些欄位時就補預設） */
function sanitizeCamp(rpg) {
  if (!rpg || typeof rpg !== 'object') return rpg;
  const p = (rpg.perm && typeof rpg.perm === 'object') ? rpg.perm : {};
  rpg.perm = {
    hp: clampInt(p.hp, 0, 3, 0),
    bomb: clampInt(p.bomb, 0, 3, 0),
    fire: clampInt(p.fire, 0, 3, 0)
  };
  const raw = (rpg.sk && typeof rpg.sk === 'object') ? rpg.sk : {};
  const sk = {};
  Object.keys(CAMP_SK).forEach(function (k) {
    const v = clampInt(raw[k], 0, CAMP_SK[k].max, 0);
    if (v > 0) sk[k] = v;
  });
  rpg.sk = sk;
  if (!Array.isArray(rpg.skLoad)) rpg.skLoad = [];
  const seenL = {};
  rpg.skLoad = rpg.skLoad.filter(function (id) {
    if (typeof id !== 'string' || !SK_ACT[id] || !(sk[id] > 0) || seenL[id]) return false;
    seenL[id] = 1;
    return true;
  }).slice(0, SK_SLOTS);
  const rb = (rpg.bag && typeof rpg.bag === 'object') ? rpg.bag : {};
  const bag = {};
  Object.keys(CAMP_BAG).forEach(function (k) {
    const v = clampInt(rb[k], 0, BAG_MAX, 0);
    if (v > 0) bag[k] = v;
  });
  rpg.bag = bag;
  rpg.bought = clampInt(rpg.bought, 0, 200, 0);   // v5.44：買來的配點上限 200（四項全滿也才 40）
  rpg.campRev = clampInt(rpg.campRev, 0, 1e9, 0);
  return rpg;
}

/* ---------- v4.2：觸控版面（模式／左右半邊／大小／自訂搖桿位置） ----------
   前端只送「玩家在設定裡選了什麼」，這裡一律重新夾成合法值，
   所以就算有人用改機工具塞 999 或字串進來，也只會被壓回允許範圍。 */
const LAYOUT_SIZE_MIN = 0.6, LAYOUT_SIZE_MAX = 1.6;
function clampNum(v, lo, hi, def) {
  const n = Number(v);
  if (!isFinite(n)) return def;
  return n < lo ? lo : (n > hi ? hi : n);
}
function round3(v) { return Math.round(v * 1000) / 1000; }
function defaultLayout() {
  return { mode: 'slide', side: 'left', act: 'right', size: 0.8, pad: null };
}
function sanitizeLayout(v) {
  if (!v || typeof v !== 'object') return null;
  const out = defaultLayout();
  out.mode = (v.mode === 'stick') ? 'stick' : 'slide';
  out.side = (v.side === 'right') ? 'right' : 'left';
  out.act = (v.act === 'left') ? 'left' : 'right';
  out.size = round3(clampNum(v.size, LAYOUT_SIZE_MIN, LAYOUT_SIZE_MAX, 0.8));
  const p = v.pad;
  if (p && typeof p === 'object' && isFinite(Number(p.x)) && isFinite(Number(p.y))) {
    out.pad = {
      x: round3(clampNum(p.x, 0, 1, 0.18)),
      y: round3(clampNum(p.y, 0, 1, 0.82))
    };
  } else {
    out.pad = null;
  }
  return out;
}

/* 驗證配點：只能是 0..10 的整數，總和不得超過「目前可用的總點數」 */
function validateAlloc(alloc, pointsTotal, paidBudget) {
  const cap = (pointsTotal == null || !isFinite(pointsTotal)) ? BASE_POINTS : clampInt(pointsTotal, 0, MAX_POINTS, BASE_POINTS);
  const out = {};
  let spent = 0, free = 0, over = 0;
  for (let i = 0; i < ATTRS.length; i++) {
    const k = ATTRS[i];
    const raw = alloc ? alloc[k] : 0;
    const n = Math.floor(Number(raw));
    if (!isFinite(n) || n < 0) return { ok: false, err: 'NEGATIVE', attr: k };
    if (n > CAP) return { ok: false, err: 'ATTR_CAP', attr: k, cap: CAP };
    out[k] = n;
    spent += n;
    free += Math.min(n, FREE_PER);
    over += Math.max(0, n - FREE_PER);
  }
  if (free > cap) return { ok: false, err: 'POINT_OVERFLOW', spent: free, cap: cap };
  // v5.46：超過第 3 格的格數，只能來自「已經買過的額度」，否則改前端就能白拿
  if (over > clampInt(paidBudget, 0, 200, 0)) return { ok: false, err: 'PAID_OVERFLOW', over: over };
  return { ok: true, alloc: out, spent: spent, cap: cap };
}

/* 單次配點（+1 / -1）：這是真正在後端執行的增減，前端只說「哪一項」。
   v5.44：免費點用完時，pay > 0 代表「玩家已在前端付了金幣買這一點」——
   金幣是 Shop 那一套（跟著整包存檔走，這裡向來不當金幣裁判），
   後端只負責記「買過幾點」，避免改前端就能無限配點。 */
function spendPoint(rpg, attr, delta, pay) {
  if (ATTRS.indexOf(attr) < 0) return { ok: false, err: 'BAD_ATTR' };
  let d = 1;
  if (delta === -1 || delta === '-1') d = -1;
  else if (delta === undefined || delta === null || delta === 1 || delta === '1') d = 1;
  else return { ok: false, err: 'BAD_DELTA' };
  const bought = clampInt(rpg.bought, 0, 200, 0);
  const paid = rpg.paid || (rpg.paid = { hp: 0, def: 0, spd: 0, atk: 0 });
  const total = freeCapOf(rpg);
  const cur = rpg.alloc[attr] || 0;
  if (d > 0) {
    if (cur >= CAP) return { ok: false, err: 'ATTR_CAP', attr: attr, cap: CAP };
    // v5.46：第 4 格起一律要金幣；前 3 格則看免費額度還夠不夠
    const mustPay = cur >= FREE_PER || freeLeftOf(rpg) <= 0;
    if (mustPay) {
      if (!(Number(pay) > 0)) return { ok: false, err: 'NO_POINTS', left: 0, total: total };
      rpg.bought = bought + 1;
      paid[attr] = (paid[attr] | 0) + 1;
    }
    rpg.alloc[attr] = cur + 1;
  } else {
    if (cur <= 0) return { ok: false, err: 'ATTR_EMPTY', attr: attr };
    rpg.alloc[attr] = cur - 1;
    if ((paid[attr] | 0) > 0) paid[attr] = (paid[attr] | 0) - 1;   // 先退買來的
  }
  rpg.ver = (rpg.ver || 1) + 1;
  return {
    ok: true, alloc: Object.assign({}, rpg.alloc),
    left: freeLeftOf(rpg), total: total,
    bought: clampInt(rpg.bought, 0, 200, 0), paid: Object.assign({}, paid)
  };
}

/* 過關：必須是按順序解鎖（只能打「下一關」，或重打已過關的舊關卡）
   opts.force = 開發者測試用：直接跳關（一般玩家永遠不會走到這條） */
function applyClear(rpg, stage, meta, opts) {
  const s = Math.floor(Number(stage));
  if (!isFinite(s) || s < 1 || s > MAX_STAGE) return { ok: false, err: 'BAD_STAGE' };
  const force = !!(opts && opts.force);
  if (!force && s > rpg.cleared + 1) return { ok: false, err: 'STAGE_LOCKED', need: rpg.cleared + 1, got: s };
  const replay = s <= rpg.cleared;
  const lvBefore = lvOfXp(ensureXp(rpg)).lv;
  /* v5.20：金幣合軌 —— 過關金幣一律由前端 Shop.addGold() 發（玩家眼前看到的那一個）。
     舊版這裡也加一次 rpg.gold，於是同一個玩家有兩個「💰」：商店錢包會動、rpg.gold 也會動，
     但兩邊數字不同步，買東西時永遠對不上。
     現在 rpg.gold 只保留舊帳號的殘值（不再成長、也不再顯示），新帳號永遠是 0。 */
  if (!replay) {
    rpg.cleared = s;
  }
  if (meta) {
    if (meta.deaths != null) rpg.deaths = Math.max(rpg.deaths || 0, clampInt(meta.deaths, 0, 999999, 0));
    if (meta.playSec != null) rpg.playSec = Math.max(rpg.playSec || 0, clampInt(meta.playSec, 0, 86400 * 60, 0));
  }
  /* v5.18：這一關賺到的經驗（前端依「實際打死幾隻」算，這裡只負責夾上限） */
  let gain = 0;
  if (meta && meta.exp != null) {
    gain = clampInt(meta.exp, 0, stageXpOf(s, XP_CAP_FOES), 0);
    rpg.xp = Math.min(XP_MAX, ensureXp(rpg) + gain);
  }
  const now = lvOfXp(ensureXp(rpg));
  rpg.ver = (rpg.ver || 1) + 1;
  return {
    ok: true, replay: replay, rpg: rpg,
    gold: rpg.gold, points: pointsTotalFor(rpg), unlocked: Math.min(MAX_STAGE, rpg.cleared + 1),
    expGain: gain, lv: now.lv, lvBefore: lvBefore, lvUp: now.lv - lvBefore, xp: now.cur, xpNeed: now.need
  };
}

/* v4.85：整包存檔（單機進度／金幣／隨從／票券／教學進度／每日最佳）的伺服器端清洗
 *   伺服器仍然是權威：前端送來的每個數字都要過 clampInt，超界一律夾回合法範圍，
 *   陣列長度、日期格式、寵物種類也一併限縮。
 *   這裡刻意不做「只能變大」的比較 —— 金幣會花掉、票券會用掉，
 *   合併策略放在前端（先 get → merge → put）。
 */
const SAVE_MAX_GOLD = 100000000;
const SAVE_MAX_TICKET = 9999;

function sanitizeSave(obj) {
  const o = (obj && typeof obj === 'object') ? obj : {};
  const out = { v: 1, ts: Date.now() };
  out.stage = clampInt(o.stage, 1, MAX_STAGE, 1);
  out.gold = clampInt(o.gold, 0, SAVE_MAX_GOLD, 0);
  out.tickets = clampInt(o.tickets, 0, SAVE_MAX_TICKET, 0);

  const pets = [];
  const PET_KINDS = { blade: 1, bomber: 1, guard: 1 };   // 只認商店真的有的三種
  if (Array.isArray(o.pets)) {
    const seen = {};
    for (let i = 0; i < o.pets.length && pets.length < 8; i++) {
      const p = o.pets[i];
      if (!p || typeof p.kind !== 'string') continue;
      const kind = p.kind.slice(0, 12).replace(/[^a-z]/g, '');
      if (!kind || !PET_KINDS[kind] || seen[kind]) continue;
      seen[kind] = 1;
      pets.push({ kind: kind, ch: clampInt(p.ch, 0, 99, 0) });
    }
  }
  out.pets = pets;

  const tut = (o.tut && typeof o.tut === 'object') ? o.tut : {};
  out.tut = { home: !!tut.home, play: !!tut.play };

  out.daily = {};
  if (o.daily && typeof o.daily === 'object') {
    Object.keys(o.daily).filter(function (k) { return /^\d{4}-\d{2}-\d{2}$/.test(k); })
      .sort().slice(-60).forEach(function (k) {
        const ms = clampInt(o.daily[k], 0, 3600000, 0);
        if (ms > 0) out.daily[k] = ms;
      });
  }

  out.stars = {};
  if (o.stars && typeof o.stars === 'object') {
    Object.keys(o.stars).slice(0, MAX_STAGE + 1).forEach(function (k) {
      const s = clampInt(k, 0, MAX_STAGE, 0);
      if (s >= 1) out.stars[String(s)] = clampInt(o.stars[k], 0, 3, 0);
    });
  }

  const seen = clampInt(o.seen, 0, 4102444800000, 0);
  if (seen > 0) out.seen = seen;

  /* ---------------- v4.87：簽到／每日任務／關卡三星／每週最佳 ----------------
     伺服器只存狀態、不發獎勵（獎勵在前端領，領完才寫進這份存檔），
     所以這裡的責任是「格式合法 + 數值夾回合理範圍」，擋掉改前端刷出來的離譜值：
       · streak 連續天數 0~7、last/mday 必須是 YYYY-MM-DD
       · mis 最多 3 筆、id 必須在任務池內、p 不超過 n
       · stars 每關 1~3 顆（0 等於沒打過，不存）
       · wbest 必須是 2026-W45:12345 這種格式 */
  out.gift = { streak: 0, last: '', mday: '', mis: [], stars: {}, wbest: '' };
  const gf = (o.gift && typeof o.gift === 'object') ? o.gift : {};
  out.gift.streak = clampInt(gf.streak, 0, 7, 0);
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(gf.last || ''))) out.gift.last = String(gf.last);
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(gf.mday || ''))) out.gift.mday = String(gf.mday);
  const MIS_N = { kill: 20, brick: 40, item: 8, clear: 2, jump: 12, perfect: 1 };
  if (Array.isArray(gf.mis)) {
    const seenM = {};
    for (let i = 0; i < gf.mis.length && out.gift.mis.length < 3; i++) {
      const m = gf.mis[i];
      if (!m || typeof m.id !== 'string' || !MIS_N[m.id] || seenM[m.id]) continue;
      seenM[m.id] = 1;
      const n = clampInt(m.n, 1, 99, MIS_N[m.id]);
      out.gift.mis.push({ id: m.id, n: n, p: clampInt(m.p, 0, n, 0), got: !!m.got });
    }
  }
  if (gf.stars && typeof gf.stars === 'object') {
    const ks = Object.keys(gf.stars).slice(0, MAX_STAGE + 1);
    for (let i = 0; i < ks.length; i++) {
      const st = clampInt(ks[i], 0, MAX_STAGE, 0);
      const v = clampInt(gf.stars[ks[i]], 0, 3, 0);
      if (st >= 1 && v > 0) out.gift.stars[String(st)] = v;
    }
  }
  if (/^\d{4}-W\d{2}:\d{1,9}$/.test(String(gf.wbest || ''))) out.gift.wbest = String(gf.wbest);
  /* ---------------- v5.13：成就／排名基準／線上個人資料 ----------------
     成就的計數器是「生涯統計」，只會往前 → 一律夾成 0~1e12 的非負整數；
     解鎖與領取用集合存（key 是成就 id），最多 400 筆（目前 ~190 個成就）。
     這裡刻意不做「合理上限」的業務判斷 —— 前端才是規則的主人，後端只擋爆量。 */
  out.ach = { v: 1, c: {}, u: {}, g: {}, lastDay: '', star3: {}, eq: [] };
  const ac = (o.ach && typeof o.ach === 'object') ? o.ach : null;
  if (ac) {
    if (ac.c && typeof ac.c === 'object') {
      Object.keys(ac.c).slice(0, 80).forEach(function (k) {
        if (!/^[A-Za-z0-9_]{1,24}$/.test(k)) return;
        out.ach.c[k] = clampInt(ac.c[k], 0, 1e12, 0);
      });
    }
    ['u', 'g', 'star3'].forEach(function (f) {
      if (ac[f] && typeof ac[f] === 'object') {
        Object.keys(ac[f]).slice(0, 400).forEach(function (k) {
          if (/^[A-Za-z0-9_\-]{1,24}$/.test(k)) out.ach[f][k] = 1;
        });
      }
    });
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(ac.lastDay || ''))) out.ach.lastDay = String(ac.lastDay);
    out.ach.devT = (ac.devT === 0) ? 0 : 1;      // v5.14：開發者稱號要不要戴
    if (Array.isArray(ac.eq)) {                  // v5.16：配戴的成就（最多 3 個 id）
      ac.eq.slice(0, 3).forEach(function (k) {
        if (typeof k === 'string' && /^[A-Za-z0-9_\-]{1,24}$/.test(k) && out.ach.eq.indexOf(k) < 0) out.ach.eq.push(k);
      });
    }
  }
  out.rank = { v: 1, week: '', base: {}, claimed: '' };
  const rk = (o.rank && typeof o.rank === 'object') ? o.rank : null;
  if (rk) {
    if (/^\d{4}-W\d{2}$/.test(String(rk.week || ''))) out.rank.week = String(rk.week);
    if (rk.base && typeof rk.base === 'object') {
      Object.keys(rk.base).slice(0, 20).forEach(function (k) {
        if (!/^[A-Za-z]{2,12}$/.test(k)) return;
        out.rank.base[k] = clampInt(rk.base[k], 0, 1e12, 0);
      });
    }
    if (/^\d{4}-W\d{2}$/.test(String(rk.claimed || ''))) out.rank.claimed = String(rk.claimed);
  }
  out.soc = { gender: '', region: '', bio: '' };
  const so = (o.soc && typeof o.soc === 'object') ? o.soc : null;
  if (so) {
    out.soc.gender = String(so.gender || '').slice(0, 8);
    out.soc.region = String(so.region || '').slice(0, 12);
    out.soc.bio = String(so.bio || '').slice(0, 24);
  }
  return out;
}

/* 把「比較強」的那一組配點留下來；超過可用點數時從點最多的往下修 */
function fitAlloc(alloc, cap) {
  const out = {};
  for (let i = 0; i < ATTRS.length; i++) out[ATTRS[i]] = clampInt(alloc && alloc[ATTRS[i]], 0, CAP, 0);
  let over = sumAlloc(out) - cap;
  let guard = 0;
  while (over > 0 && guard++ < 200) {
    let big = ATTRS[0];
    for (let i = 1; i < ATTRS.length; i++) if (out[ATTRS[i]] > out[big]) big = ATTRS[i];
    if (out[big] <= 0) break;
    out[big] -= 1;
    over -= 1;
  }
  return out;
}

/* 合併遊客進度 → 正式帳號：取聯集（關卡取最遠、金幣取多、配點取較強），絕不覆蓋歸零 */
function mergeProgress(base, guest) {
  const b = base || defaultRpg();
  const g = guest || defaultRpg();
  const cleared = Math.max(b.cleared || 0, g.cleared || 0);
  const xp = Math.max(ensureXp(b), ensureXp(g));
  const cap = pointsTotalFor({ xp: xp });
  const bSpent = sumAlloc(b.alloc), gSpent = sumAlloc(g.alloc);
  // 誰的冒險進度比較遠就沿用誰的配點；一樣遠就選點得比較多的那個
  let picked;
  if ((g.cleared || 0) > (b.cleared || 0)) picked = g.alloc;
  else if ((b.cleared || 0) > (g.cleared || 0)) picked = b.alloc;
  else picked = gSpent > bSpent ? g.alloc : b.alloc;
  const alloc = fitAlloc(picked, cap);
  const out = {
    alloc: alloc,
    cleared: cleared,
    gold: Math.max(b.gold || 0, g.gold || 0, 0),
    xp: xp,
    char: (b.cleared || 0) >= (g.cleared || 0) ? clampInt(b.char, 0, 7, 0) : clampInt(g.char, 0, 7, 0),
    deaths: Math.max(b.deaths || 0, g.deaths || 0),
    playSec: Math.max(b.playSec || 0, g.playSec || 0),
    ver: Math.max(b.ver || 1, g.ver || 1) + 1
  };
  /* v5.19：營地狀態取聯集 —— 永久強化與招式取等級高的、補給取多的（合併時不重複給，也不會歸零） */
  const bp = (b.perm || {}), gp = (g.perm || {});
  out.perm = {
    hp: Math.max(bp.hp | 0, gp.hp | 0),
    bomb: Math.max(bp.bomb | 0, gp.bomb | 0),
    fire: Math.max(bp.fire | 0, gp.fire | 0)
  };
  const bs = (b.sk || {}), gs = (g.sk || {});
  const sk = {};
  Object.keys(CAMP_SK).forEach(function (k) {
    const v = Math.max(bs[k] | 0, gs[k] | 0);
    if (v > 0) sk[k] = Math.min(CAMP_SK[k].max, v);
  });
  out.sk = sk;
  const bl = Array.isArray(b.skLoad) ? b.skLoad : [], gl = Array.isArray(g.skLoad) ? g.skLoad : [];
  const load = [];
  bl.concat(gl).forEach(function (id) {
    if (load.length < SK_SLOTS && SK_ACT[id] && sk[id] > 0 && load.indexOf(id) < 0) load.push(id);
  });
  out.skLoad = load;
  const bb = (b.bag || {}), gb = (g.bag || {});
  const bag = {};
  Object.keys(CAMP_BAG).forEach(function (k) {
    const v = Math.min(BAG_MAX, Math.max(bb[k] | 0, gb[k] | 0));
    if (v > 0) bag[k] = v;
  });
  out.bag = bag;
  return out;
}

/* ---------------------------------------------------------------- 簽章信封 */

function makeEnvelope(secret, acc, now) {
  const payload = {
    uid: acc.id,
    ver: acc.rpg.ver || 1,
    rpg: acc.rpg,
    iat: now || Date.now()
  };
  return { payload: payload, sig: hmacB64(secret, canonical(payload)) };
}
function verifyEnvelope(secret, payload, sig) {
  if (!payload || typeof payload !== 'object' || !sig) return { ok: false, err: 'NO_SIG' };
  if (!payload.uid || typeof payload.uid !== 'string') return { ok: false, err: 'BAD_PAYLOAD' };
  const want = hmacB64(secret, canonical(payload));
  if (!safeEq(want, String(sig))) return { ok: false, err: 'BAD_SIG' };
  return { ok: true, payload: payload };
}

/* ---------------------------------------------------------------- Session */

function makeToken(secret, uid, ttl) {
  const exp = Date.now() + (ttl || SESSION_TTL);
  const body = uid + '.' + exp;
  return body + '.' + hmacB64(secret, body);
}
function readToken(secret, tok) {
  if (!tok || typeof tok !== 'string') return null;
  const parts = tok.split('.');
  if (parts.length !== 3) return null;
  const body = parts[0] + '.' + parts[1];
  if (!safeEq(hmacB64(secret, body), parts[2])) return null;
  const exp = Number(parts[1]);
  if (!isFinite(exp) || exp < Date.now()) return null;
  return { uid: parts[0], exp: exp };
}

/* ---------------------------------------------------------------- 頻率限制 */

function makeLimiter() {
  const buckets = new Map();
  function take(key, cap, perSec, now) {
    const t = now || Date.now();
    let b = buckets.get(key);
    if (!b) { b = { tokens: cap, last: t }; buckets.set(key, b); }
    // 距離上次太久 → 直接補滿，省計算
    if (t - b.last > (cap / perSec) * 1000 + 1000) { b.tokens = cap; b.last = t; }
    else {
      b.tokens = Math.min(cap, b.tokens + ((t - b.last) / 1000) * perSec);
      b.last = t;
    }
    if (b.tokens < 1) {
      const wait = (1 - b.tokens) / perSec;
      return { ok: false, retry: Math.max(1, Math.ceil(wait)), left: 0 };
    }
    b.tokens -= 1;
    return { ok: true, left: Math.floor(b.tokens) };
  }
  function prune(now) {
    const t = now || Date.now();
    if (buckets.size < 4000) return;
    buckets.forEach(function (b, k) { if (t - b.last > 600000) buckets.delete(k); });
  }
  return { take: take, prune: prune, size: function () { return buckets.size; } };
}

/* ---------------------------------------------------------------- 檔案儲存 */

/* v4.85：儲存層大改 —— 遠端資料庫（Supabase REST）為權威來源，本機檔案只當快取
 *   為什麼非改不可：Render 免費實例的檔案系統是暫時的，**15 分鐘沒流量就休眠清空**，
 *   持久磁碟只有付費方案能掛。舊版又用「有沒有設 BH_DATA_DIR」來判斷是否持久化，
 *   於是設了 /data 卻沒真的掛盤時，連警告都不會印 → 帳號與進度無聲消失。
 *   現在的分工：
 *     ① Supabase（Postgres）＝真正永存，換主機、重新部署、休眠都不受影響
 *     ② ./data/accounts.json ＝ 本機快取（加速啟動；遠端掛掉時至少還有當次資料）
 *     ③ 遠端載入失敗時**不允許寫回遠端**（state.loaded=false），避免用空資料蓋掉雲端
 */
function createStore(dir, persist, remote) {
  const file = path.join(dir, 'accounts.json');
  // v4.80：lb = 每日挑戰排行榜（跟帳號同一份檔案，一起 flush）
  // v5.5：visits＝拜訪紀錄（歷史／當日人數）。跟帳號同一份檔一起 flush，
  //   分片推送時是獨立的一個 key，所以改一個數字不會重推全部帳號。
  const db = { v: 1, accounts: {}, devices: {}, tamper: 0, created: Date.now(), lb: { v: 1, days: {} }, announce: null,
    visits: { v: 1, pv: 0, dev: {}, days: {}, first: Date.now() },
    // v5.13：排名（十項總榜＋週榜）與線上玩家（名單／好友／私訊）
    rank: { v: 1, week: '', all: {}, wk: {}, claims: {} },
    social: { v: 1, players: {}, dm: {}, dmN: 0 },
    // v5.16：頭貼。刻意**不放進 social**：社交分片每次心跳都會重推，
    //   把 base64 圖片塞進去，等於每 45 秒重傳一次幾百 KB。
    avatars: { v: 1, m: {} } };
  let timer = null;
  let dirty = false;
  let retry = 0;
  let retryTimer = null;

  // v4.85：遠端設定（Supabase → Render 環境變數）
  const R = remote || {};
  const remoteOn = !!(R.url && R.key);
  const table = R.table || 'bh_kv';
  const state = {
    mode: remoteOn ? 'supabase' : (persist ? 'file' : 'memory'),
    ready: false,      // 初始化流程跑完了
    loaded: false,     // 真的從遠端讀到資料（false 時禁止寫回遠端）
    lastError: '', lastOk: 0, writes: 0, fails: 0, skipped: 0, parts: []
  };
  const lastSent = {};

  function rsUrl(q) { return String(R.url).replace(/\/+$/, '') + '/rest/v1/' + table + (q || ''); }
  function rsHeaders(extra) {
    return Object.assign({
      apikey: R.key,
      Authorization: 'Bearer ' + R.key,
      'Content-Type': 'application/json'
    }, extra || {});
  }

  /* 把 db 切成三個分片：accounts（含裝置）／lb（排行榜）／meta（公告、竄改計數、session 密鑰） */
  function parts() {
    // v4.85e：sec = session 簽章密鑰。放在 meta 分片裡，重新部署／休眠喚醒後仍然同一把，
    //   否則每換一個容器就重新生成 secret.key → 所有玩家的 cookie 立刻失效（被迫重新登入）。
    return {
      meta: { v: db.v, tamper: db.tamper, created: db.created, announce: db.announce, sec: db.sec || '' },
      accounts: { accounts: db.accounts, devices: db.devices },
      lb: db.lb,
      visits: db.visits || { v: 1, pv: 0, dev: {}, days: {}, first: Date.now() },  // v5.5：拜訪紀錄
      rank: db.rank || { v: 1, week: '', all: {}, wk: {}, claims: {} },              // v5.13：排名
      social: db.social || { v: 1, players: {}, dm: {}, dmN: 0 },                    // v5.13：線上玩家
      avatars: db.avatars || { v: 1, m: {} }                                        // v5.16：頭貼（只有換頭貼才推）
    };
  }
  /* v5.11：舊資料修補 —— 早期版本的帳號物件「只用物件鍵當索引」，沒有把 id 寫進欄位。
     後台名單直接用 a.id 產生 data-id，於是：
       名單的 UID 欄是空的 → data-id="" → 點人送出 /api/admin/player?id=undefined
       → findById 找不到 → 404 → 前端只閃一句 toast，右邊詳情永遠是空白提示。
     這裡在每次載入／套用遠端分片時補回 id（物件鍵才是權威），之後名單與查詢都拿得到。
     同時修正 key 與 id 不一致的狀況（合併帳號搬移過資料的情形）。
     ⚠️ 這支必須留在 createStore 內：applyPart／loadLocal 都在這裡，搬到 Cloud 建構函式裡
        會變成「呼叫端看不到」→ ReferenceError → state.loaded 永遠 false（雲端存檔整條斷）。 */
  function fixAccountIds() {
    let n = 0;
    for (const key in db.accounts) {
      const a = db.accounts[key];
      if (!a || typeof a !== 'object') continue;
      if (!a.id) { a.id = key; n++; }
      else if (String(a.id) !== key && !db.accounts[a.id]) { a.id = key; n++; }
    }
    return n;
  }

  function applyPart(key, val) {
    if (!val || typeof val !== 'object') return false;
    if (key === 'accounts') {
      db.accounts = (val.accounts && typeof val.accounts === 'object') ? val.accounts : {};
      db.devices = (val.devices && typeof val.devices === 'object') ? val.devices : {};
      fixAccountIds();   // v5.11：補回缺漏的 id（後台點人靠它）
      return true;
    }
    if (key === 'lb') { db.lb = val.days ? val : { v: 1, days: {} }; return true; }
    if (key === 'rank') {
      db.rank = (val && typeof val === 'object' && val.all) ? val : { v: 1, week: '', all: {}, wk: {}, claims: {} };
      return true;
    }
    if (key === 'social') {
      db.social = (val && typeof val === 'object') ? val : { v: 1, players: {}, dm: {}, dmN: 0 };
      if (!db.social.players) db.social.players = {};
      if (!db.social.dm) db.social.dm = {};
      return true;
    }
    if (key === 'avatars') {
      db.avatars = (val && typeof val === 'object' && val.m) ? val : { v: 1, m: {} };
      return true;
    }
    if (key === 'visits') {
      db.visits = (val && typeof val === 'object') ? val : { v: 1, pv: 0, dev: {}, days: {}, first: Date.now() };
      return true;
    }
    if (key === 'meta') {
      db.v = val.v || 1;
      db.tamper = val.tamper || 0;
      db.created = val.created || db.created;
      db.announce = val.announce || null;
      db.sec = typeof val.sec === 'string' ? val.sec : '';
      return true;
    }
    return false;
  }

  function loadLocal() {
    try {
      fs.mkdirSync(dir, { recursive: true });
      if (!fs.existsSync(file)) return;
      const obj = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (!obj || !obj.accounts) return;
      db.accounts = obj.accounts;
      db.devices = obj.devices || {};
      fixAccountIds();   // v5.11：本機快取也補 id（見 fixAccountIds 的說明）
      db.tamper = obj.tamper || 0;
      db.created = obj.created || db.created;
      db.announce = obj.announce || null;      // v4.3：全服公告
      db.sec = typeof obj.sec === 'string' ? obj.sec : '';
      db.lb = obj.lb && obj.lb.days ? obj.lb : { v: 1, days: {} };   // v4.80：排行榜
      db.visits = (obj.visits && typeof obj.visits === 'object') ? obj.visits : db.visits;   // v5.5：拜訪紀錄
      db.rank = (obj.rank && typeof obj.rank === 'object') ? obj.rank : db.rank;             // v5.13
      db.social = (obj.social && typeof obj.social === 'object') ? obj.social : db.social;    // v5.13
    } catch (e) {
      // 壞檔 → 備份起來再看，不要讓伺服器起不來
      try { fs.renameSync(file, file + '.bad-' + Date.now()); } catch (e2) {}
      console.error('[cloud] 本機存檔讀取失敗（改用遠端／空資料庫）：', e.message);
    }
  }

  function writeLocal() {
    if (!persist) return;
    try {
      const tmp = file + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(db));
      fs.renameSync(tmp, file);
    } catch (e) {
      // 這裡失敗不致命：遠端才是權威，本機只是快取
    }
  }

  function sendPart(key, val) {
    return fetchImpl(rsUrl(''), {
      method: 'POST',
      headers: rsHeaders({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify([{ key: key, val: val, updated: new Date().toISOString() }])
    }).then(function (r) {
      if (!r.ok) {
        return r.text().then(function (t) {
          throw new Error('supabase ' + r.status + ' ' + String(t).replace(/\s+/g, ' ').slice(0, 140));
        });
      }
      return true;
    });
  }

  function scheduleRetry() {
    if (retryTimer) return;
    const waits = [2000, 5000, 15000, 60000];
    const wait = waits[Math.min(retry, waits.length - 1)];
    retry++;
    retryTimer = setTimeout(function () {
      retryTimer = null;
      pushRemote();
    }, wait);
    if (retryTimer.unref) retryTimer.unref();
  }

  /* 只送「內容有變」的分片；失敗就清掉 lastSent，下次重送 */
  function pushRemote() {
    if (!remoteOn) return;
    if (!state.loaded) { state.skipped++; return; }
    const snap = parts();
    const jobs = [];
    Object.keys(snap).forEach(function (k) {
      const s = JSON.stringify(snap[k]);
      if (s === lastSent[k]) return;
      jobs.push({ k: k, s: s, v: snap[k] });
    });
    if (!jobs.length) return;
    jobs.forEach(function (j) { lastSent[j.k] = j.s; });
    Promise.all(jobs.map(function (j) { return sendPart(j.k, j.v); })).then(function () {
      retry = 0;
      state.writes += jobs.length;
      state.lastOk = Date.now();
      state.lastError = '';
    }, function (e) {
      state.fails++;
      state.lastError = String((e && e.message) || e);
      jobs.forEach(function (j) { delete lastSent[j.k]; });
      console.error('[cloud] 遠端寫入失敗：', state.lastError);
      scheduleRetry();
    });
  }

  function loadRemote(attempt) {
    const n = attempt || 1;
    return fetchImpl(rsUrl('?select=key,val'), { headers: rsHeaders() }).then(function (r) {
      if (!r.ok) {
        return r.text().then(function (t) {
          throw new Error('supabase ' + r.status + ' ' + String(t).replace(/\s+/g, ' ').slice(0, 140));
        });
      }
      return r.json();
    }).then(function (rows) {
      if (!Array.isArray(rows)) throw new Error('回傳格式不是陣列');
      let hit = 0;
      const seen = [];
      rows.forEach(function (row) {
        if (row && applyPart(row.key, row.val)) { hit++; seen.push(row.key); }
      });
      state.loaded = true;
      state.ready = true;
      state.lastOk = Date.now();
      state.lastError = '';
      state.parts = seen;
      // 遠端是空的（第一次啟用）→ 把本機快取推上去，完成一次性搬遷
      if (hit === 0) { dirty = true; flush(); }
      else console.log('[cloud] 已從 Supabase 載入：' + seen.join(', '));
      return true;
    }).catch(function (e) {
      state.lastError = String((e && e.message) || e);
      if (n < 3) {
        return new Promise(function (res) { setTimeout(res, n * 1200); }).then(function () { return loadRemote(n + 1); });
      }
      state.ready = true;   // loaded 仍為 false → 不會覆蓋雲端
      console.error('[cloud] Supabase 載入失敗（3 次）：' + state.lastError);
      console.error('[cloud] → 進入記憶體模式，**不會寫回雲端**；請檢查 BH_SUPABASE_URL / BH_SUPABASE_KEY / 資料表');
      return false;
    });
  }

  function flush() {
    if (!dirty) return;
    dirty = false;
    writeLocal();
    if (remoteOn) pushRemote();
  }
  function touch() {
    dirty = true;
    if (timer) return;
    timer = setTimeout(function () { timer = null; flush(); }, 400);
    if (timer.unref) timer.unref();
  }

  // 先讀本機快取（讓服務就算遠端慢也能起），再由遠端覆蓋
  if (persist) loadLocal();
  let readyP = Promise.resolve(true);
  if (remoteOn) readyP = loadRemote(1);
  else {
    state.ready = true;
    // 沒有遠端時「儲存可用」就等於本機檔案可用；
    // 若這裡留 false，/api/health 會顯示 storageLoaded:false，看起來像壞掉
    state.loaded = !!persist;
  }

  return {
    db: db, touch: touch, flush: flush, file: file,
    ready: readyP, state: state, remoteOn: remoteOn, pushNow: pushRemote
  };
}

/* ---------------------------------------------------------------- 第三方登入 */

const PROVIDERS = {
  google: {
    label: 'Google',
    color: '#4285f4',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scope: 'openid email profile',
    idEnv: 'GOOGLE_CLIENT_ID',
    secretEnv: 'GOOGLE_CLIENT_SECRET',
    profile: function (tok) {
      return fetchJson('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: 'Bearer ' + tok }
      }).then(function (j) {
        if (!j || !j.sub) throw new Error('no sub');
        return { sub: String(j.sub), name: j.name || j.email || 'Google 玩家', email: j.email || '', avatar: j.picture || '' };
      });
    }
  },
  facebook: {
    label: 'Facebook',
    color: '#1877f2',
    authUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v19.0/oauth/access_token',
    scope: 'public_profile,email',
    idEnv: 'FACEBOOK_APP_ID',
    secretEnv: 'FACEBOOK_APP_SECRET',
    profile: function (tok) {
      return fetchJson('https://graph.facebook.com/v19.0/me?fields=id,name,email,picture.type(large)&access_token=' + encodeURIComponent(tok))
        .then(function (j) {
          if (!j || !j.id) throw new Error('no id');
          return {
            sub: String(j.id), name: j.name || 'FB 玩家', email: j.email || '',
            avatar: (j.picture && j.picture.data && j.picture.data.url) || ''
          };
        });
    }
  },
  line: {
    label: 'LINE',
    color: '#06c755',
    authUrl: 'https://access.line.me/oauth2/v2.1/authorize',
    tokenUrl: 'https://api.line.me/oauth2/v2.1/token',
    scope: 'profile openid email',
    idEnv: 'LINE_CHANNEL_ID',
    secretEnv: 'LINE_CHANNEL_SECRET',
    profile: function (tok) {
      return fetchJson('https://api.line.me/v2/profile', {
        headers: { Authorization: 'Bearer ' + tok }
      }).then(function (j) {
        if (!j || !j.userId) throw new Error('no userId');
        return { sub: String(j.userId), name: j.displayName || 'LINE 玩家', email: '', avatar: j.pictureUrl || '' };
      });
    }
  }
};

let fetchImpl = (typeof fetch === 'function') ? fetch : null;

function fetchJson(url, opts) {
  if (!fetchImpl) return Promise.reject(new Error('fetch 不可用（需要 Node 18+）'));
  const ctl = (typeof AbortController === 'function') ? new AbortController() : null;
  const timer = ctl ? setTimeout(function () { ctl.abort(); }, 8000) : null;
  const o = Object.assign({}, opts || {});
  if (ctl) o.signal = ctl.signal;
  return fetchImpl(url, o).then(function (r) {
    if (timer) clearTimeout(timer);
    if (!r.ok) {
      return r.text().then(function (t) { throw new Error('HTTP ' + r.status + ' ' + String(t).slice(0, 160)); });
    }
    return r.json();
  }, function (e) { if (timer) clearTimeout(timer); throw e; });
}

/* ---------------------------------------------------------------- 主體 */

function createCloud(options) {
  const opt = options || {};
  const env = opt.env || process.env;
  const persist = opt.persist !== false;
  const dir = opt.dir || env.BH_DATA_DIR || path.join(__dirname, 'data');
  // v4.85：遠端資料庫（Supabase）優先；沒設就退回本機檔案（會警告）
  // v4.85f：環境變數常常被「貼上時多帶引號／前後空白」弄壞 → Supabase 會回 401 Invalid API key。
  //   這裡一律剝掉外層引號與不可見字元，並在 /api/health 留一組遮罩過的指紋，方便遠端核對。
  function cleanEnvKey(v) {
    let s = String(v == null ? '' : v).replace(/[\u200b-\u200d\ufeff]/g, '').trim();
    if ((s.charAt(0) === '"' && s.charAt(s.length - 1) === '"') ||
        (s.charAt(0) === "'" && s.charAt(s.length - 1) === "'")) s = s.slice(1, -1);
    return s.replace(/\s+/g, '');
  }
  const remote = {
    url: String(env.BH_SUPABASE_URL || '').trim().replace(/\/+$/, ''),
    key: cleanEnvKey(env.BH_SUPABASE_KEY),
    table: String(env.BH_SUPABASE_TABLE || 'bh_kv').trim()
  };
  /* v4.85h：實測踩到 —— 在 Render 後台貼值時，把 `sb_secret_` 那段一起黏進了「變數名稱」欄，
   *   結果變數叫 `BH_SUPABASE_KEYsb_secret_`，程式找不到 BH_SUPABASE_KEY → 靜默退回本機檔案模式
   *   （表面正常、其實休眠就丟資料）。這裡做一次容錯：找不到正名時，接受任何以
   *   `BH_SUPABASE_KEY` 開頭的多餘變數，並記下來讓 /api/health 提醒使用者去改名。 */
  let keyNameWarn = '';
  if (!remote.key) {
    const alt = Object.keys(env).filter(function (n) {
      return /^BH_SUPABASE_KEY./i.test(n) && String(env[n] == null ? '' : env[n]).trim();
    })[0];
    if (alt) { remote.key = cleanEnvKey(env[alt]); keyNameWarn = alt; }
  }
  /* 測試用：注入 fetch 實作。**必須在 createStore 之前**，因為 store 一建立就立刻開始
     向 Supabase 拉資料（loadRemote），晚一步設定就還是用到上一支（或原生 fetch）。 */
  if (opt.fetch) fetchImpl = opt.fetch;
  const store = createStore(dir, persist, remote);
  const db = store.db;
  // v4.13：偵測「這個資料夾會不會在重新部署後被清空」
  //   Render 免費方案的磁碟是暫時的 → 每次改版重新部署，帳號就歸零（要重新註冊）。
  //   判斷方式：路徑在 /opt/render（Render 的暫時檔案系統）且沒有明確指定 BH_DATA_DIR。
  const dataDirEnv = String((env && env.BH_DATA_DIR) || '').trim();
  const onCloud = /(^|[\\/])opt[\\/]render([\\/]|$)/.test(dir) ||
    /(^|[\\/])var[\\/]task([\\/]|$)/.test(dir) ||
    /srv[\\/]app/i.test(dir);
  // v4.13：沒設 BH_DATA_DIR → 用預設的 ./data → 雲端平台的暫時磁碟 → 重新部署帳號會消失
  const ephemeral = !dataDirEnv && (onCloud || /[\\/]data$/.test(dir) || dir === "data");
  // v4.85：有 Supabase 就不算「暫時」——雲端那份才是權威，本機只是快取
  const persistWarning = store.remoteOn
    ? ''
    : (ephemeral
      ? '沒有設定 BH_SUPABASE_URL／BH_SUPABASE_KEY，且資料夾位於暫時磁碟 → 休眠或重新部署後帳號會全部消失'
      : '沒有設定 BH_SUPABASE_URL／BH_SUPABASE_KEY → 只存在本機檔案，平台一旦清空容器就沒了');

  let secret = opt.secret || env.BH_AUTH_SECRET || '';
  const secretFromEnv = !!secret;
  const secretFile = path.join(dir, 'secret.key');
  if (!secret) {
    // 沒設環境變數 → 自己生一組並存檔（同一容器內重啟後 session 仍然有效）
    try {
      if (persist && fs.existsSync(secretFile)) secret = fs.readFileSync(secretFile, 'utf8').trim();
    } catch (e) {}
    if (!secret) {
      secret = rid(32);
      try {
        if (persist) { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(secretFile, secret); }
      } catch (e) {}
    }
  }
  /* v4.85e：Supabase 模式下，session 密鑰也存雲端（meta 分片的 sec）
   *   Render 免費實例 15 分鐘沒流量就休眠，喚醒時是一個全新的容器 —— secret.key 不見了，
   *   於是每次冷啟動都換一把密鑰，所有玩家的 cookie 立刻失效（會被退回登入）。
   *   這裡在「遠端載入完成後、開始接請求前」把密鑰對齊雲端那一把，並寫回本機檔，
   *   這樣下次遠端暫時連不上時，本機那份也還是正確的。
   *   注意：只在沒設 BH_AUTH_SECRET、且真的讀到雲端時才動，避免拿空值蓋掉本機。 */
  let readyAll = store.ready;
  if (store.remoteOn && !secretFromEnv) {
    readyAll = store.ready.then(function () {
      if (!store.state.loaded) return true;      // 沒讀到雲端 → 保持本機這把，不要亂寫
      if (store.db.sec) {
        secret = store.db.sec;
        try { if (persist) fs.writeFileSync(secretFile, secret); } catch (e) {}
      } else {
        store.db.sec = secret;
        store.touch();
        console.log('[cloud] 已把 session 密鑰寫進 Supabase（重啟後不會再被登出）');
      }
      return true;
    });
  }

  const states = new Map();     // OAuth state → { provider, bind, redirect, exp }
  const limiter = makeLimiter();
  const stats = { logins: 0, bindings: 0, tamper: 0, rateLimited: 0, syncs: 0, registers: 0, webLogins: 0, bans: 0 };
  const DEV_EMAILS = devEmailList(env);
  db.announce = db.announce || null;
  db.tamper = db.tamper || 0;

  /* ---------- 帳號 ---------- */
  function findById(id) { return db.accounts[id] || null; }

  /* 用識別鍵找帳號（web:xxx / google:sub …），已合併的舊帳號不算 */
  function findByKey(key) {
    for (const id in db.accounts) {
      const a = db.accounts[id];
      if (a && !a.mergedInto && a.key === key) return a;
    }
    return null;
  }
  function findByEmail(email) {
    const em = String(email || '').toLowerCase();
    if (!em) return null;
    for (const id in db.accounts) {
      const a = db.accounts[id];
      if (a && !a.mergedInto && a.kind === 'member' && String(a.email || '').toLowerCase() === em) return a;
    }
    return null;
  }
  function isDev(acc) {
    if (!acc) return false;
    if (acc.dev === true) return true;
    const em = String(acc.email || '').toLowerCase();
    return !!em && DEV_EMAILS.indexOf(em) >= 0;
  }
  /* 記錄來源 IP（保留最近 8 組，客服核對用） */
  function noteIp(acc, raw) {
    const s = String(raw || '').slice(0, 64);
    if (!acc || !s || s === 'unknown') return;
    acc.ip = s;
    if (!acc.firstIp) acc.firstIp = s;
    const ips = acc.ips || (acc.ips = []);
    if (ips.indexOf(s) < 0) { ips.push(s); if (ips.length > 8) ips.shift(); }
  }
  /* 操作足跡（環狀保留最近 40 筆） */
  function logEvent(acc, type, data) {
    if (!acc) return;
    const ev = Object.assign({ t: Date.now(), type: String(type || '').slice(0, 24) }, data || {});
    if (ev.label) ev.label = String(ev.label).slice(0, 48);
    const arr = acc.events || (acc.events = []);
    arr.push(ev);
    if (arr.length > 40) arr.splice(0, arr.length - 40);
  }

  function createAccount(kind, info) {
    const id = (kind === 'guest' ? 'g_' : 'u_') + rid(8);
    const acc = {
      id: id,
      kind: kind,
      provider: info.provider || '',
      sub: info.sub || '',
      name: info.name || (kind === 'guest' ? '遊客' : '玩家'),
      email: info.email || '',
      username: info.username || '',
      key: info.key || '',
      avatar: info.avatar || '',
      pass: null,                      // v4.3：scrypt 加鹽雜湊（絕不存明文）
      created: Date.now(),
      lastSeen: Date.now(),
      mergedInto: null,
      rpg: defaultRpg(),
      layout: null,                    // v4.2：手機觸控版面（null = 還沒設定過）
      /* ---- v4.3：後台需要的營運資料 ---- */
      dev: false,
      banned: null,                    // { at, reason } → 停權
      ip: '',
      firstIp: '',
      ips: [],
      loginCount: 0,
      fails: 0,
      lockUntil: 0,
      stages: {},                      // 各關卡遊玩次數
      events: []                       // 最近操作足跡
    };
    if (acc.email) acc.dev = DEV_EMAILS.indexOf(String(acc.email).toLowerCase()) >= 0;
    db.accounts[id] = acc;
    store.touch();
    return acc;
  }

  function upsertMember(provider, profile) {
    const key = provider + ':' + profile.sub;
    let acc = null;
    for (const id in db.accounts) {
      const a = db.accounts[id];
      if (a.kind === 'member' && a.key === key) { acc = a; break; }
    }
    if (!acc) {
      acc = createAccount('member', {
        provider: provider, sub: profile.sub, name: profile.name,
        email: profile.email, avatar: profile.avatar, key: key
      });
      acc.key = key;
    } else {
      acc.name = profile.name || acc.name;
      acc.email = profile.email || acc.email;
      acc.avatar = profile.avatar || acc.avatar;
      acc.lastSeen = Date.now();
    }
    acc.provider = provider;
    acc.sub = String(profile.sub || acc.sub || '');
    // v4.3：第三方登入也一樣標記開發者身分
    if (acc.email && DEV_EMAILS.indexOf(String(acc.email).toLowerCase()) >= 0) acc.dev = true;
    store.touch();
    return acc;
  }

  function guestByDevice(deviceHash) {
    const id = db.devices[deviceHash];
    return id ? findById(id) : null;
  }

  /* 綁定：正式帳號吃下遊客進度，並把所有用過這台裝置的 session 指向正式帳號 */
  function bindGuest(member, guest) {
    if (!member || !guest || guest.mergedInto || member.id === guest.id) return false;
    member.rpg = mergeProgress(member.rpg, guest.rpg);
    // v4.2：正式帳號還沒有版面就用遊客調好的那套（有設定過就維持自己的）
    if (!member.layout && guest.layout) member.layout = guest.layout;
    guest.mergedInto = member.id;
    for (const h in db.devices) if (db.devices[h] === guest.id) db.devices[h] = member.id;
    store.touch();
    return true;
  }

  /* ---------- cookie ---------- */
  function cookieGet(req, name) {
    const raw = req.headers.cookie || '';
    const parts = raw.split(';');
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i].trim();
      if (p.indexOf(name + '=') === 0) return decodeURIComponent(p.slice(name.length + 1));
    }
    return '';
  }
  function cookieSet(res, req, token, maxAgeSec) {
    const secure = isHttps(req);
    const bits = [
      COOKIE + '=' + encodeURIComponent(token),
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      'Max-Age=' + (maxAgeSec || Math.floor(SESSION_TTL / 1000))
    ];
    if (secure) bits.push('Secure');
    const prev = res.getHeader('Set-Cookie');
    const arr = prev ? (Array.isArray(prev) ? prev.slice() : [prev]) : [];
    arr.push(bits.join('; '));
    res.setHeader('Set-Cookie', arr);
  }
  function cookieClear(res) {
    res.setHeader('Set-Cookie', COOKIE + '=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
  }

  function isHttps(req) {
    const p = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
    if (p) return p === 'https';
    return !!(req.socket && req.socket.encrypted);
  }
  function originOf(req) {
    if (env.BH_PUBLIC_URL) return String(env.BH_PUBLIC_URL).replace(/\/+$/, '');
    const proto = isHttps(req) ? 'https' : 'http';
    return proto + '://' + (req.headers['x-forwarded-host'] || req.headers.host || 'localhost');
  }

  function session(req) {
    const tok = cookieGet(req, COOKIE) || bearer(req);
    const s = readToken(secret, tok);
    if (!s) return null;
    const acc = findById(s.uid);
    if (!acc || acc.mergedInto) return acc ? findById(acc.mergedInto) : null;
    if (acc.banned) return null;           // v4.3：停權帳號 → 一律當成沒登入
    acc.lastSeen = Date.now();
    return acc;
  }
  function bearer(req) {
    const h = String(req.headers.authorization || '');
    return h.indexOf('Bearer ') === 0 ? h.slice(7).trim() : '';
  }

  /* ================================================================
     v4.18：分享到社群平台拿金幣
     伺服器是唯一權威（前端改 localStorage 也刷不出金幣）：
       ① prepare 發一次性 token（HMAC 簽「帳號 + 平台 + nonce + 期限」，5 分鐘）
       ② claim 驗 token → 驗平台 → 驗沒領過 → 驗每日上限 → 才加金幣
       ③ 每個平台終身只能領一次，每天最多 3 次（記錄在帳號資料裡，重新部署也在）
     ================================================================ */
  const SHARE_PLATFORMS = ['line', 'fb', 'x', 'wa', 'copy'];
  const SHARE_REWARD = 1000;
  const SHARE_TTL = 5 * 60 * 1000;
  const SHARE_DAILY_MAX = 3;
  function shareState(a) {
    if (!a.share || typeof a.share !== 'object') a.share = {};
    if (!a.share.claimed || typeof a.share.claimed !== 'object') a.share.claimed = {};
    return a.share;
  }
  function shareDayKey(t) {
    const d = new Date(t || Date.now());
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }
  function shareToken(acc, platform, nonce, exp) {
    return crypto.createHmac('sha256', secret)
      .update('share|' + acc.id + '|' + platform + '|' + nonce + '|' + exp)
      .digest('hex').slice(0, 40);
  }
  function shareOut(acc) {
    const st = shareState(acc);
    const day = shareDayKey();
    return {
      claimed: st.claimed,
      day: day,
      n: st.day === day ? (st.n | 0) : 0,
      max: SHARE_DAILY_MAX,
      reward: SHARE_REWARD
    };
  }

  function publicAccount(acc) {
    try { sanitizeCamp(acc.rpg); } catch (e) {}
    const xp = ensureXp(acc.rpg);
    const lvNow = lvOfXp(xp);
    const points = pointsTotalFor(acc.rpg);
    const dev = isDev(acc);
    return {
      id: acc.id,
      kind: acc.kind,
      name: acc.name,
      email: acc.email,
      username: acc.username || '',
      avatar: acc.avatar,
      provider: acc.provider || '',
      created: acc.created,
      rpg: acc.rpg,
      points: points,
      lv: lvNow.lv,                 // v5.18：等級（1～65）
      xp: lvNow.cur,                // 這一級已經累積的經驗
      xpNeed: lvNow.need,           // 升下一級需要多少（65 級為 0）
      xpTotal: xp,                  // 累積總經驗
      xpMax: XP_MAX,
      left: freeLeftOf(acc.rpg),                 // v5.45：只剩免費額度（每項前 4 格）
      pointsBought: acc.rpg.bought | 0,          // v5.44：花金幣買來的配點
      skPts: rpgSkPtsOf(acc.rpg),          // v5.19：技能點總數（營地招式師用）
      skLeft: rpgSkLeftOf(acc.rpg),        //        還沒花掉的
      campRev: acc.rpg.campRev | 0,        // v5.20：營地存檔版本（前端拿來做樂觀鎖）
      // 開發者：全關卡解鎖（RPG 32 張全部直接可玩）
      unlocked: dev ? MAX_STAGE : Math.min(MAX_STAGE, acc.rpg.cleared + 1),
      layout: acc.layout || null,
      dev: dev,                        // v4.3：給前端做「全關卡解鎖 / 版本紀錄豁免」
      tier: dev ? 'developer' : 'player',
      hasPass: !!acc.pass,
      logins: acc.loginCount | 0,
      share: shareOut(acc),            // v4.18：哪些平台領過分享金幣
      save: makeEnvelope(secret, acc)
    };
  }

  /* ---------- HTTP ---------- */
  function send(res, code, obj, extra) {
    const h = Object.assign({
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }, extra || {});
    res.writeHead(code, h);
    res.end(JSON.stringify(obj));
  }
  function fail(res, code, err, extra) {
    send(res, code, Object.assign({ ok: false, err: err }, extra || {}));
  }
  function readJson(req, limit) {
    return new Promise(function (resolve) {
      let data = '';
      let over = false;
      req.on('data', function (c) {
        if (over) return;
        data += c;
        if (data.length > (limit || 16384)) { over = true; data = ''; req.destroy(); }
      });
      req.on('end', function () {
        if (over) return resolve(null);
        try { resolve(JSON.parse(data || '{}')); } catch (e) { resolve(null); }
      });
      req.on('close', function () { if (over) resolve(null); });
      req.on('error', function () { resolve(null); });
    });
  }
  function ip(req) {
    return String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
      (req.socket && req.socket.remoteAddress) || 'unknown';
  }
  function gate(req, res, name, cap, perSec, extra) {
    const acct = session(req);
    const key = name + ':' + (acct ? acct.id : 'ip:' + ip(req));
    const r = limiter.take(key, cap, perSec);
    if (!r.ok) {
      stats.rateLimited++;
      send(res, 429, { ok: false, err: 'RATE_LIMIT', retry: r.retry },
        Object.assign({ 'Retry-After': String(r.retry) }, extra || {}));
      return false;
    }
    return true;
  }

  /* ---------------- v4.80：每日挑戰排行榜 ----------------
   * 設計原則：
   *   1. 排行榜是「匿名」的（只存暱稱 + 毫秒數 + 裝置雜湊），不碰帳號系統 →
   *      前端從 GitHub Pages 也能跨網域讀寫（純 ACAO:* 、不帶 cookie）。
   *   2. 每天一張圖（種子由日期決定），排行榜以「當天」分桶；主榜是通關秒數，
   *      秒數小者在前。沒通關（陣亡／逾時）不進榜。
   *   3. 同一個裝置只保留它自己的最佳成績 → 洗榜沒意義，也讓新手不會被自己擠掉。
   *   4. 只信合理範圍：3 秒 ~ 60 分鐘。超出視為無效。
   *      真正防作弊要靠伺服器重跑地圖，那是另一個量級的工程；這裡走「信任 + 限流」。
   */
  const LB_MODES = { daily: 1, weekly: 1 };   // v4.87：weekly = 每週榜（同一週同一關比秒數）
  const LB_KEEP_DAYS = 21;         // 保留三週（跨月也還看得到舊榜）
  const LB_MAX_DAY = 300;          // 每天最多存 300 筆
  const LB_MAX_MS = 3600000, LB_MIN_MS = 3000;

  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  /* 以 UTC+8 為換日線（主要玩家在台灣／東南亞；跨時區最多差一天，不影響公平性） */
  function lbToday() {
    const t = new Date(Date.now() + 8 * 3600000);
    return t.getUTCFullYear() + '-' + pad2(t.getUTCMonth() + 1) + '-' + pad2(t.getUTCDate());
  }
  function lbDayOk(s) { return /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')); }
  /* v4.87：每週榜的 key 是「UTC+8 的 ISO 週」→ 2026-W45（星期一為一週第一天）
     刻意跟 lbToday() 用同一條時區換算，前端 Gift.weekKey() 也是同一套公式。 */
  function lbThisWeek() {
    const u = new Date(Date.now() + 8 * 3600000);
    const dow = (u.getUTCDay() + 6) % 7;
    const thu = new Date(Date.UTC(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate() - dow + 3));
    const jan1 = new Date(Date.UTC(thu.getUTCFullYear(), 0, 1));
    const week = 1 + Math.floor((thu - jan1) / 86400000 / 7);
    return thu.getUTCFullYear() + '-W' + pad2(week);
  }
  function lbWeekOk(s) { return /^\d{4}-W\d{2}$/.test(String(s || '')); }
  function lbCleanName(s) {
    let n = String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, '');
    n = n.replace(/[<>&"'`]/g, '').trim();
    if (!n) n = '匿名';
    return n.slice(0, 14);
  }
  /* 把太久以前的榜砍掉，避免檔案一直長大
     v4.87：改成「每種模式各留 N 筆」—— 每日榜每天多一筆，混在一起算會把每週榜擠掉。 */
  function lbPrune() {
    const days = db.lb && db.lb.days;
    if (!days) return;
    const byMode = {};
    Object.keys(days).forEach(function (k) {
      const mode = k.split(':')[0] || 'daily';
      (byMode[mode] || (byMode[mode] = [])).push(k);
    });
    Object.keys(byMode).forEach(function (mode) {
      const keys = byMode[mode].sort();
      while (keys.length > LB_KEEP_DAYS) {
        delete days[keys.shift()];
      }
    });
  }
  function lbBucket(mode, day, create) {
    if (!db.lb) db.lb = { v: 1, days: {} };
    if (!db.lb.days) db.lb.days = {};
    const key = mode + ':' + day;
    if (!db.lb.days[key] && create) db.lb.days[key] = { list: [] };
    return db.lb.days[key] || null;
  }
  function lbSort(list) {
    // 注意：at 是 Date.now()（毫秒，13 位），不能寫 e.at | 0 —— 會溢位成負數
    list.sort(function (a, b) { return (a.ms | 0) - (b.ms | 0) || (Number(a.at) || 0) - (Number(b.at) || 0); });
    return list;
  }
  function lbList(mode, day, limit) {
    const b = lbBucket(mode, day, false);
    const arr = (b && b.list) ? lbSort(b.list.slice()) : [];
    const out = [];
    for (let i = 0; i < arr.length && out.length < (limit || 50); i++) {
      const e = arr[i];
      out.push({ n: e.n, ms: e.ms | 0, at: Number(e.at) || 0 });
    }
    return out;
  }

  /* ---------------- v5.5：拜訪紀錄（後台「歷史／今日拜訪人數」） ----------------
   * /api/health 只有「當下連線數」、帳號數只有「註冊過的人」，
   * 看不出「今天有多少人打開過遊戲」→ 這裡自己記。
   *   · 用裝置雜湊去重（同一台同一天只算 1 人）；原始 deviceId 不落地，只存 sha256 前 16 碼
   *   · pv / dev 是歷史總量（永久累加）；days[day] 只留近 60 天（後台畫 7 天直條圖）
   */
  const VISIT_KEEP_DAYS = 60;
  const VISIT_MAX_DEV = 50000;
  function visitState() {
    if (!db.visits || typeof db.visits !== 'object') {
      db.visits = { v: 1, pv: 0, dev: {}, days: {}, first: Date.now() };
    }
    const v = db.visits;
    if (!v.dev || typeof v.dev !== 'object') v.dev = {};
    if (!v.days || typeof v.days !== 'object') v.days = {};
    if (!(v.pv >= 0)) v.pv = 0;
    if (!v.first) v.first = Date.now();
    return v;
  }
  function visitDayPeek(day) {
    const v = visitState();
    const d = v.days[day || lbToday()];
    return (d && typeof d === 'object') ? d : null;
  }
  function visitPrune() {
    const v = visitState();
    const keys = Object.keys(v.days).sort();
    const over = keys.length - VISIT_KEEP_DAYS;
    for (let i = 0; i < over; i++) delete v.days[keys[i]];
  }
  function visitOut() {
    const v = visitState();
    const t = visitDayPeek();
    const days = [];
    const keys = Object.keys(v.days).sort().slice(-7);
    for (let i = 0; i < keys.length; i++) {
      const d = v.days[keys[i]] || {};
      days.push({ day: keys[i], pv: d.pv | 0, uv: Object.keys(d.dev || {}).length });
    }
    return {
      pv: v.pv | 0,
      uv: Object.keys(v.dev).length,
      first: v.first || 0,
      last: v.last || 0,
      today: lbToday(),
      todayUv: t ? Object.keys(t.dev || {}).length : 0,
      todayPv: t ? (t.pv | 0) : 0,
      days: days
    };
  }
  function visitRecord(hash) {
    const v = visitState();
    v.pv = (v.pv | 0) + 1;
    v.last = Date.now();
    if (hash && !v.dev[hash] && Object.keys(v.dev).length < VISIT_MAX_DEV) v.dev[hash] = Date.now();
    const day = lbToday();
    if (!v.days[day] || typeof v.days[day] !== 'object') v.days[day] = { pv: 0, dev: {} };
    const d = v.days[day];
    if (!d.dev) d.dev = {};
    d.pv = (d.pv | 0) + 1;
    if (hash) d.dev[hash] = 1;
    visitPrune();
    return v;
  }

  function providerInfo(p) {
    const def = PROVIDERS[p];
    const id = env[def.idEnv] || '';
    const sec = env[def.secretEnv] || '';
    return { on: !!(id && sec), label: def.label, color: def.color, id: id };
  }

  /* v4.3：全服公告（後台發布，前端首頁／遊戲中顯示，過期自動消失） */
  function announceOut() {
    const a = db.announce;
    if (!a || !a.text) return null;
    if (a.until && a.until < Date.now()) return null;
    return { text: String(a.text).slice(0, 300), ts: a.ts || 0, until: a.until || 0 };
  }

  /* v5.7：這個帳號「最近玩了什麼」＋「台灣時間今天玩了幾場」
     只掃記憶體裡的事件（最多 40 筆），300 個帳號也不會慢。 */
  function playDigest(a) {
    const ev = (a && a.events) || [];
    const dayStart = twDayStart();
    let last = null, today = 0;
    for (let i = ev.length - 1; i >= 0; i--) {
      const e = ev[i];
      if (!PLAY_EVENTS[e.type]) continue;
      if (!last) last = e;
      if ((e.t || 0) >= dayStart) today++;
    }
    return { last: last, today: today };
  }

  /* v4.3：後台專用資料（只給開發者看，一般玩家一律 403） */
  function adminRow(a) {
    const pd = playDigest(a);
    return {
      id: a.id, kind: a.kind, name: a.name, username: a.username || '',
      email: a.email || '', provider: a.provider || 'guest', sub: a.sub || '',
      dev: isDev(a), banned: a.banned ? { at: a.banned.at, reason: a.banned.reason || '' } : null,
      ip: a.ip || '', firstIp: a.firstIp || '', ips: (a.ips || []).slice(-5),
      created: a.created || 0, createdStr: stamp(a.created),
      lastSeen: a.lastSeen || 0, lastSeenStr: stamp(a.lastSeen),
      logins: a.loginCount | 0,
      // v5.5：累計遊玩（帳號層級，所有模式）＋ 現在是否在線（5 分鐘內有動作）
      playSec: (a.playSec | 0) || (a.rpg ? (a.rpg.playSec | 0) : 0),
      online: (Date.now() - (a.lastSeen || 0)) < 300000,
      cleared: a.rpg ? (a.rpg.cleared | 0) : 0,
      gold: a.rpg ? (a.rpg.gold | 0) : 0,
      hasPass: !!a.pass,
      // v5.7：最近一次「玩」的事件（模式／關卡／時間）＋ 今天玩了幾場
      lastPlay: pd.last ? {
        t: pd.last.t || 0, type: pd.last.type || '',
        stage: pd.last.stage || 0, label: pd.last.label || '',
        mode: EVENT_LABEL[pd.last.type] || pd.last.type || ''
      } : null,
      playsToday: pd.today
    };
  }

  function adminOverview() {
    const list = [];
    let members = 0, guests = 0, devs = 0, banned = 0, today = 0, online = 0, playsToday = 0;
    const now = Date.now(), d0 = twDayStart(now), h24 = now - 86400000;
    for (const id in db.accounts) {
      const a = db.accounts[id];
      if (a.mergedInto) continue;
      if (a.kind === 'member') members++; else guests++;
      if (isDev(a)) devs++;
      if (a.banned) banned++;
      if ((a.created || 0) >= d0) today++;
      if ((a.lastSeen || 0) >= h24) online++;
      const row = adminRow(a);
      playsToday += row.playsToday | 0;
      list.push(row);
    }
    list.sort(function (x, y) { return (y.created || 0) - (x.created || 0); });
    return {
      ok: true,
      stats: (function () {
        const vo = visitOut();     // v5.5：拜訪紀錄（歷史／今日）
        return {
          accounts: members + guests, members: members, guests: guests, devs: devs,
          banned: banned, newToday: today, online24h: online,
          tamper: stats.tamper, rateLimited: stats.rateLimited,
          registers: stats.registers, webLogins: stats.webLogins,
          logins: stats.logins, bindings: stats.bindings,
          visitors: vo.uv, visitPv: vo.pv,
          visitToday: vo.todayUv, visitPvToday: vo.todayPv,
          visitDays: vo.days,
          playsToday: playsToday          // v5.7：今天（台灣時間）所有帳號合計玩了幾場
        };
      })(),
      announce: announceOut(),
      accounts: list.slice(0, 300),
      devEmails: DEV_EMAILS,
      // v4.13：把「資料會不會被清掉」的警告一起回傳 → 前端後台可直接看到
      dataEphemeral: ephemeral,
      persistWarning: persistWarning
    };
  }

  /* ================================================================
   * v5.13：排名（/api/rank/*）＆ 線上玩家（/api/social/*）
   * ----------------------------------------------------------------
   * 這兩組刻意「不帶 cookie」，身分用 deviceId 推導：
   *   · 遊戲可能放在 GitHub Pages（純靜態），跨網域帶不了 session cookie
   *   · pid = sha256(類別|deviceId|secret) 前 10 碼 → 客戶端無法指定別人的 pid
   * 排名：總榜只增不減（取 max）；週榜每週一 08:00（UTC+8）重置，前 10 名有金幣。
   * 線上：150 秒內有動靜＝在線；好友／邀請／封鎖都存在 player 物件裡。
   * ================================================================ */
  const RANK_CATS = { soloKill: 1, soloBoss: 1, rpgKill: 1, rpgBoss: 1, brKill: 1, brWin: 1, btKill: 1, btWin: 1, onKill: 1, onWin: 1 };
  const RANK_REWARD = [1000, 700, 500, 350, 350, 200, 200, 200, 200, 200];
  const RANK_MAX = 4000;
  const SOC_TTL = 150000;              // 在線判定：150 秒
  const SOC_KEEP = 7 * 86400000;       // 七天沒來就清掉
  const SOC_MAX = 600;                 // 最多記 600 個玩家
  const DM_MAX = 120, DM_KEEP = 3000;
/* v5.16：頭貼。128×128 的 WebP/JPEG 大約 3～8 KB（base64 後 4～11 KB）。
   上限刻意壓在 200 人 / 1.3 MB：這個分片只要有人換頭貼就會整份重推，
   放太大會讓「換一張大頭貼」變成一次幾 MB 的上傳。 */
const AV_MAX = 200, AV_KEEP = 45 * 86400000, AV_TOTAL = 1300000, AV_ONE = 24000;  // 每個對話留 120 則、最多 3000 個對話

  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function wkNow() {
    const u = new Date(Date.now() + 8 * 3600000);
    const day = (u.getUTCDay() + 6) % 7;
    const thu = new Date(Date.UTC(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate() - day + 3));
    const year = thu.getUTCFullYear();
    const jan1 = new Date(Date.UTC(year, 0, 1));
    const week = 1 + Math.floor((thu - jan1) / 86400000 / 7);
    return year + '-W' + p2(week);
  }
  function cleanName(s, n) {
    const v = String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n || 12);
    return v || '無名玩家';
  }
  function pidOf(kind, dev) {
    return (kind === 'p' ? 'p_' : 'r_') + sha256(kind + '|' + dev + '|' + secret).slice(0, 10);
  }

  function rankDb() {
    if (!db.rank || typeof db.rank !== 'object') db.rank = { v: 1, week: '', all: {}, wk: {}, claims: {} };
    const R = db.rank;
    if (!R.all) R.all = {};
    if (!R.wk) R.wk = {};
    if (!R.claims) R.claims = {};
    const w = wkNow();
    if (R.week !== w) { R.week = w; R.wk = {}; R.claims = {}; }   // 換週：週榜與領取紀錄歸零
    return R;
  }
  /* v5.17：同一個帳號登上排行榜時，把「這台裝置」舊的那一格併進來再刪掉。
     不然同一個人在總榜會有兩筆一模一樣的成績（換裝置就多一筆）。 */
  function rankMergeDevice(pid, dkey) {
    if (!pid || !dkey) return false;
    const oldPid = pidOf('r', dkey);
    if (!oldPid || oldPid === pid) return false;
    const R = rankDb();
    const old = R.all[oldPid];
    if (!old) return false;
    const a = R.all[pid] || (R.all[pid] = { n: old.n || '', ch: old.ch | 0, c: {}, t: old.t || 0 });
    for (const k in old.c) {
      const v = clampInt(old.c[k], 0, 1e9, 0);
      if (v > (a.c[k] | 0)) a.c[k] = v;
    }
    if (!a.n) a.n = old.n || '';
    if (!a.t || (old.t || 0) > a.t) a.t = old.t || a.t;
    delete R.all[oldPid];
    const ow = R.wk[oldPid];
    if (ow) {
      const b = R.wk[pid] || (R.wk[pid] = { n: ow.n || '', ch: ow.ch | 0, c: {}, t: ow.t || 0 });
      for (const k in ow.c) {
        const v = clampInt(ow.c[k], 0, 1e9, 0);
        if (v > (b.c[k] | 0)) b.c[k] = v;
      }
      if (!b.n) b.n = ow.n || '';
      delete R.wk[oldPid];
    }
    store.touch();
    return true;
  }
  function rankTrim(R) {
    const keys = Object.keys(R.all);
    if (keys.length <= RANK_MAX) return;
    keys.sort(function (a, b) { return (R.all[a].t || 0) - (R.all[b].t || 0); });
    const drop = keys.length - RANK_MAX;
    for (let i = 0; i < drop; i++) { delete R.all[keys[i]]; delete R.wk[keys[i]]; }
  }
  /* v5.28：排行榜的合理性檢查。
     以前 /api/rank/submit 完全相信前端 —— 改一個 fetch 就能把「擊殺 999999」送上榜。
     這不是防外掛（那要伺服器權威模擬），而是擋掉「一看就不可能」的數字：
       · 每個分類有每秒成長上限（寬鬆到正常玩家絕不會碰到）
       · 距離上次提交多久，就只准長多少（+5 的起步寬限）
       · 舊紀錄沒有基準（a.v !== 2）→ 第一次只建立基準，不砍任何東西
     被夾住時 rankClamped++，/api/health 看得到。 */
  const RANK_RATE = { soloKill: 3, soloBoss: .05, rpgKill: 3, rpgBoss: .05, brKill: 1,
                      brWin: .02, btKill: 1.5, btWin: .03, onKill: 1.5, onWin: .03 };
  let rankClamped = 0;
  function rankAllow(prev, rate, secs) {
    return prev + Math.max(5, Math.ceil(Math.max(0, secs) * rate));
  }

  function rankPut(pid, name, ch, cats, week) {
    const R = rankDb();
    const a = R.all[pid] || (R.all[pid] = { n: '', ch: 0, c: {}, t: 0 });
    const now = Date.now();
    const secs = (a.t > 0) ? (now - a.t) / 1000 : 0;
    const trusted = (a.v === 2);            // 有基準才驗；舊資料先放行一次
    a.n = cleanName(name, 12);
    a.ch = clampInt(ch, 0, 7, 0);
    a.t = now;
    const b = R.wk[pid] || (R.wk[pid] = { n: a.n, ch: a.ch, c: {}, t: 0 });
    for (const k in RANK_CATS) {
      const rate = RANK_RATE[k] || 1;
      let v = clampInt(cats && cats[k], 0, 1e7, 0);
      if (trusted) {
        const allow = rankAllow(a.c[k] | 0, rate, secs);
        if (v > allow) { v = allow; rankClamped++; }
      }
      if (v > (a.c[k] | 0)) a.c[k] = v;
      let wv = clampInt(week && week[k], 0, 1e7, 0);
      if (trusted) {
        const wAllow = rankAllow(b.c[k] | 0, rate, secs);
        if (wv > wAllow) { wv = wAllow; rankClamped++; }
      }
      if (wv > (b.c[k] | 0)) b.c[k] = wv;
    }
    a.v = 2;
    b.n = a.n; b.ch = a.ch; b.t = a.t;
    rankTrim(R);
    store.touch();
    return R;
  }
  function rankList(cat, scope, limit) {
    const R = rankDb();
    const src = (scope === 'week') ? R.wk : R.all;
    const out = [];
    for (const pid in src) {
      const p = src[pid];
      const v = (p.c && p.c[cat]) | 0;
      if (v > 0) out.push({ pid: pid, name: p.n || '無名玩家', ch: p.ch | 0, v: v, t: p.t || 0 });
    }
    out.sort(function (x, y) { return (y.v - x.v) || ((x.t || 0) - (y.t || 0)); });
    return out.slice(0, limit || 50);
  }
  function weekScore(p) {
    let n = 0;
    for (const k in RANK_CATS) n += (p && p.c && p.c[k]) | 0;
    return n;
  }

  /* ---------------- v5.16：頭貼 ---------------- */
  function avDb() {
    if (!db.avatars || typeof db.avatars !== 'object' || !db.avatars.m) db.avatars = { v: 1, m: {} };
    return db.avatars;
  }
  const AV_RE = /^data:image\/(jpeg|webp|png);base64,[A-Za-z0-9+/=]+$/;
  function avOk(str) {
    const d = String(str || '');
    return d.length >= 200 && d.length <= AV_ONE && AV_RE.test(d);
  }
  function avOf(pid) {
    const A = avDb();
    const r = A.m[pid];
    return (r && typeof r.d === 'string' && r.d) ? r : null;
  }
  function avPut(pid, dataUrl) {
    const A = avDb();
    if (!dataUrl) { delete A.m[pid]; return 0; }
    A.m[pid] = { d: dataUrl, t: Date.now() };
    avPrune(A);
    return dataUrl.length;
  }
  /* 先刪「太久沒換又很少上線」的，再從最舊的砍到符合人數／總量 */
  function avPrune(A) {
    const now = Date.now();
    const S = socDb();
    const keys = Object.keys(A.m);
    keys.forEach(function (k) {
      const r = A.m[k];
      if (!r) return;
      const seen = (S.players[k] && S.players[k].seen) || 0;
      if (now - (r.t || 0) > AV_KEEP && now - seen > AV_KEEP) delete A.m[k];
    });
    let left = Object.keys(A.m);
    function bytes() { let n = 0; left.forEach(function (k) { n += (A.m[k].d || '').length; }); return n; }
    if (left.length <= AV_MAX && bytes() <= AV_TOTAL) return;
    left.sort(function (a, b) { return (A.m[a].t || 0) - (A.m[b].t || 0); });
    let n = 0, drop = 0;
    for (let i = 0; i < left.length; i++) n += (A.m[left[i]].d || '').length;
    while (left.length - drop > 1 && (left.length - drop > AV_MAX || n > AV_TOTAL)) {
      n -= (A.m[left[drop]].d || '').length;
      delete A.m[left[drop]];
      drop++;
    }
  }
  /* 配戴成就：只存「要給別人看的」三格（圖示＋名稱），不存整份成就表 */
  function cleanEq(arr) {
    const out = [];
    if (!Array.isArray(arr)) return out;
    for (let i = 0; i < arr.length && out.length < 3; i++) {
      const it = arr[i];
      if (!it || typeof it !== 'object') continue;
      const ico = String(it.i || '').replace(/[\u0000-\u001f<>]/g, '').slice(0, 8);
      const name = String(it.n || '').replace(/[\u0000-\u001f<>]/g, '').slice(0, 16);
      if (!ico && !name) continue;
      out.push({ i: ico, n: name });
    }
    return out;
  }

  function socDb() {
    if (!db.social || typeof db.social !== 'object') db.social = { v: 1, players: {}, dm: {}, dmN: 0 };
    const S = db.social;
    if (!S.players) S.players = {};
    if (!S.dm) S.dm = {};
    if (!S.dmN) S.dmN = 0;
    return S;
  }
  function socGet(pid) {
    const S = socDb();
    let me = S.players[pid];
    if (!me) {
      me = S.players[pid] = { n: '無名玩家', ch: 0, g: '', r: '', b: '', k: 'guest', join: Date.now(),
        seen: 0, sec: 0, pts: 0, wins: 0, mode: '大廳', friends: [], reqs: [], blocks: [], read: {}, tt: -1 };
    }
    if (!me.friends) me.friends = [];
    if (!me.reqs) me.reqs = [];
    if (!me.blocks) me.blocks = [];
    if (!me.read || typeof me.read !== 'object') me.read = {};   // v5.14：每個人最後讀到哪
    return me;
  }
  function socApply(me, body) {
    me.n = cleanName(body.name, 12);
    me.ch = clampInt(body.ch, 0, 7, 0);
    me.g = String(body.gender || '').slice(0, 8);
    me.r = String(body.region || '').slice(0, 12);
    me.b = String(body.bio || '').replace(/[\u0000-\u001f<>]/g, '').slice(0, 24);
    me.k = (body.kind === 'member') ? 'member' : 'guest';
    me.sec = clampInt(body.sec, 0, 1e9, 0);
    me.pts = clampInt(body.pts, 0, 1e6, 0);
    me.wins = clampInt(body.wins, 0, 1e6, 0);
    me.mode = String(body.mode || '大廳').slice(0, 8);
    if (body.eq !== undefined) me.eq = cleanEq(body.eq);   // v5.16：配戴成就（最多 3 格）
    if (body.tt !== undefined) me.tt = clampInt(body.tt, -1, 8, -1);   // v5.18：戴的稱號代號
    me.seen = Date.now();
    return me;
  }
  function socPrune(S) {
    const now = Date.now();
    const keys = Object.keys(S.players);
    keys.forEach(function (k) {
      const p = S.players[k];
      if (!p) return;
      if (now - (p.seen || 0) > SOC_KEEP && !(p.friends && p.friends.length)) delete S.players[k];
    });
    const left = Object.keys(S.players);
    if (left.length <= SOC_MAX) return;
    left.sort(function (a, b) { return (S.players[a].seen || 0) - (S.players[b].seen || 0); });
    const drop = left.length - SOC_MAX;
    for (let i = 0; i < drop; i++) delete S.players[left[i]];
  }
  /* v5.17：同一個帳號第一次改用「帳號身分」出現時，把這台裝置原本的遊客紀錄
     （好友／邀請／黑名單）整併過來，然後刪掉舊的裝置紀錄。
     以前身分只綁 deviceId → 同一個人在手機＋電腦會是兩個玩家（名單兩個同名、
     成就分一模一樣），而且換登入方式就等於換一個人、好友名單直接消失。 */
  function socMergeDevice(pid, dkey) {
    if (!pid || !dkey) return false;
    const oldPid = pidOf('p', dkey);
    if (!oldPid || oldPid === pid) return false;
    const S = socDb();
    const old = S.players[oldPid];
    if (!old) return false;
    const me = socGet(pid);
    ['friends', 'reqs', 'blocks'].forEach(function (f) {
      const a = me[f] || (me[f] = []);
      (old[f] || []).forEach(function (id) {
        if (id && id !== pid && a.indexOf(id) < 0) a.push(id);
      });
    });
    // 別人的清單裡指向舊 pid 的也改指向新 pid，不然好友會「單向消失」
    for (const k in S.players) {
      const p = S.players[k];
      if (!p) continue;
      ['friends', 'reqs', 'blocks'].forEach(function (f) {
        const arr = p[f];
        if (!Array.isArray(arr) || !arr.length) return;
        let hit = false;
        for (let i = 0; i < arr.length; i++) {
          if (arr[i] === oldPid) { arr[i] = pid; hit = true; }
        }
        if (!hit) return;
        const uniq = [];
        arr.forEach(function (id) { if (id && uniq.indexOf(id) < 0) uniq.push(id); });
        p[f] = uniq;
      });
    }
    delete S.players[oldPid];
    store.touch();
    return true;
  }
  function socPublic(pid, me) {
    return { pid: pid, name: me.n, ch: me.ch | 0, kind: me.k, gender: me.g, region: me.r, bio: me.b,
      join: me.join || 0, seen: me.seen || 0, sec: me.sec | 0, pts: me.pts | 0, wins: me.wins | 0, mode: me.mode,
      avt: me.avt || 0, eq: Array.isArray(me.eq) ? me.eq : [],
      tt: (me.tt == null ? -1 : me.tt) };   // v5.16 頭貼／配戴成就、v5.18 稱號
  }
  function socOnline(pid, limit) {
    const S = socDb();
    const now = Date.now();
    const mine = pid ? S.players[pid] : null;
    const out = [];
    for (const k in S.players) {
      if (k === pid) continue;
      const p = S.players[k];
      if (!p || now - (p.seen || 0) > SOC_TTL) continue;
      if (mine) {
        if (mine.blocks.indexOf(k) >= 0) continue;             // 我封鎖的人不顯示
        if ((p.blocks || []).indexOf(pid) >= 0) continue;      // 封鎖我的人也不顯示
      }
      out.push(socPublic(k, p));
    }
    out.sort(function (a, b) { return (b.seen || 0) - (a.seen || 0); });
    return out.slice(0, limit || 80);
  }
  function socCount() {
    const S = socDb();
    const now = Date.now();
    let n = 0;
    for (const k in S.players) if (now - (S.players[k].seen || 0) <= SOC_TTL) n++;
    return n;
  }
  function dmKey(a, b) { return a < b ? a + '|' + b : b + '|' + a; }
  function dmList(a, b, limit) {
    const S = socDb();
    const arr = S.dm[dmKey(a, b)] || [];
    return arr.slice(-Math.max(1, Math.min(200, limit || 60))).map(function (m) {
      return { id: m.id, from: m.from, t: m.t, m: m.m };
    });
  }
  /* v5.14：未讀私訊（給首頁的驚嘆號通知用）
     read[對方pid] = 我最後一次打開那個對話的時間點 */
  function socUnread(pid) {
    const S = socDb();
    const me = S.players[pid];
    if (!me) return { n: 0, by: {} };
    const read = me.read || {};
    const by = {};
    let n = 0;
    for (const k in S.dm) {
      const i = k.indexOf('|');
      const a = k.slice(0, i), b = k.slice(i + 1);
      if (a !== pid && b !== pid) continue;
      const other = (a === pid) ? b : a;
      const arr = S.dm[k];
      if (!arr || !arr.length) continue;
      const since = read[other] || 0;
      for (let j = arr.length - 1; j >= 0; j--) {
        const m = arr[j];
        if ((m.t || 0) <= since) break;
        if (m.from === pid) continue;
        by[other] = (by[other] || 0) + 1;
        n++;
      }
    }
    return { n: n, by: by };
  }
  /* 把某個對話標成已讀（讀到最後一則的時間，不用「現在」→ 不會吃掉同時進來的訊息） */
  function socRead(pid, withPid) {
    const S = socDb();
    const me = S.players[pid];
    if (!me || !withPid) return;
    const arr = S.dm[dmKey(pid, withPid)] || [];
    const last = arr.length ? (arr[arr.length - 1].t || Date.now()) : Date.now();
    if (!me.read) me.read = {};
    if (last > (me.read[withPid] || 0)) me.read[withPid] = last;
    // read 表不要無限長大
    const ks = Object.keys(me.read);
    if (ks.length > 200) {
      ks.sort(function (x, y) { return (me.read[x] || 0) - (me.read[y] || 0); });
      for (let i = 0; i < ks.length - 200; i++) delete me.read[ks[i]];
    }
  }

  function socOut(pid) {
    const S = socDb();
    const me = socGet(pid);
    const un = socUnread(pid);
    return { me: socPublic(pid, me), friends: me.friends.slice(0, 200), blocks: me.blocks.slice(0, 200),
      reqs: me.reqs.slice(0, 100), list: socOnline(pid, 80), total: socCount(),
      unread: un.n, unreadBy: un.by };
  }

  async function handle(req, res, url) {
    const p = url.pathname;
    if (p.indexOf('/api/') !== 0) return false;
    const isAuth = p.indexOf('/api/auth/') === 0;
    // v4.85：/api/save/* 併進同一條「需要登入」的分支（同樣靠 session 認人）
    const isRpg = p.indexOf('/api/rpg/') === 0 || p.indexOf('/api/save/') === 0;
    const isAdmin = p.indexOf('/api/admin/') === 0;
    const isShare = p.indexOf('/api/share/') === 0;
    const isLb = p.indexOf('/api/lb/') === 0;              // v4.80：每日挑戰排行榜
    const isVisit = (p === '/api/visit');                  // v5.5：拜訪紀錄（不需要登入）
    const isRank = p.indexOf('/api/rank/') === 0;          // v5.13：十項排名（免登入、CORS）
    const isSoc = p.indexOf('/api/social/') === 0;         // v5.13：線上玩家／好友／私訊（免登入、CORS）
    if (!isAuth && !isRpg && !isAdmin && !isShare && !isLb && !isVisit && !isRank && !isSoc) return false;

    /* ---- 共用：全域 IP 限流（每分鐘 300 次，避免被腳本掃） ---- */
    if (!limiter.take('ip:' + ip(req), 300, 5).ok) {
      stats.rateLimited++;
      return send(res, 429, { ok: false, err: 'RATE_LIMIT', retry: 1 }), true;
    }

    try {
      /* ---------------- v5.5：拜訪紀錄 ----------------
       * 只記「有人打開了遊戲」：同一台裝置同一天只算 1 個訪客，pv 每次呼叫都 +1。
       * 刻意不帶 cookie（前端用 credentials:'omit'）→ 從 GitHub Pages 也能打，
       * 所以一定要回 Access-Control-Allow-Origin。
       */
      if (isVisit && req.method === 'POST') {
        const CORS_V = { 'Access-Control-Allow-Origin': '*' };
        if (!gate(req, res, 'visit', 30, .5, CORS_V)) return true;
        const body = await readJson(req, 4096);
        if (!body) return fail(res, 400, 'BAD_BODY', CORS_V), true;
        const dev = String(body.deviceId || '').slice(0, 128);
        if (dev.length < 6) return fail(res, 400, 'BAD_DEVICE', CORS_V), true;
        const hash = sha256(dev + '|visit|' + secret).slice(0, 16);
        visitRecord(hash);
        store.touch();
        const o = visitOut();
        return send(res, 200, {
          ok: true, pv: o.pv, uv: o.uv,
          today: { day: o.today, pv: o.todayPv, uv: o.todayUv }
        }, CORS_V), true;
      }
      if (isVisit) return fail(res, 404, 'NO_SUCH_API'), true;

      /* ================= v5.13：排名 ================= */
      const CORS_X = { 'Access-Control-Allow-Origin': '*' };
      if (isRank) {
        if (!gate(req, res, 'rank', 120, 2, CORS_X)) return true;
        const body = (req.method === 'POST') ? await readJson(req, 8192) : null;
        const dev = String((body && body.deviceId) || url.searchParams.get('deviceId') || '').slice(0, 128);

        if (p === '/api/rank/submit' && req.method === 'POST') {
          if (!body) return fail(res, 400, 'BAD_BODY', CORS_X), true;
          if (dev.length < 6) return fail(res, 400, 'BAD_DEVICE', CORS_X), true;
          const pid = pidOf('r', dev);
          rankMergeDevice(pid, String(body.dkey || '').slice(0, 128));   // v5.17：帳號身分整併舊紀錄
          const R = rankPut(pid, body.name, body.ch, body.cats, body.week);
          return send(res, 200, {
            ok: true, week: R.week,
            me: { pid: pid, cats: (R.all[pid] || {}).c || {}, week: (R.wk[pid] || {}).c || {} }
          }, CORS_X), true;
        }

        if (p === '/api/rank/top' && req.method === 'GET') {
          const cat = String(url.searchParams.get('cat') || 'soloKill');
          if (!RANK_CATS[cat]) return fail(res, 400, 'BAD_CAT', CORS_X), true;
          const scope = url.searchParams.get('scope') === 'week' ? 'week' : 'all';
          const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get('limit'), 10) || 50));
          const list = rankList(cat, scope, limit);
          let me = null;
          if (dev.length >= 6) {
            const pid = pidOf('r', dev);
            const R = rankDb();
            const src = (scope === 'week') ? R.wk[pid] : R.all[pid];
            let rank = 0;
            for (let i = 0; i < list.length; i++) if (list[i].pid === pid) { rank = i + 1; break; }
            me = { pid: pid, rank: rank, v: src ? ((src.c && src.c[cat]) | 0) : 0 };
          }
          return send(res, 200, { ok: true, cat: cat, scope: scope, week: rankDb().week, list: list, me: me }, CORS_X), true;
        }

        if (p === '/api/rank/claim' && req.method === 'POST') {
          if (!body) return fail(res, 400, 'BAD_BODY', CORS_X), true;
          if (dev.length < 6) return fail(res, 400, 'BAD_DEVICE', CORS_X), true;
          const R = rankDb();
          if (body.wk && String(body.wk) !== R.week) {
            return fail(res, 409, 'WRONG_WEEK', Object.assign({ week: R.week }, CORS_X)), true;
          }
          const pid = pidOf('r', dev);
          rankPut(pid, body.name, body.ch, {}, body.cats || body.week);   // 先把本週成績記下來
          // 「活動排名」= 十項本週成績加總（單看一項會被某一種玩法吃死）
          const arr = [];
          for (const k in R.wk) arr.push({ pid: k, v: weekScore(R.wk[k]) });
          arr.sort(function (x, y) { return y.v - x.v; });
          let rank = 0;
          for (let i = 0; i < arr.length; i++) if (arr[i].pid === pid) { rank = i + 1; break; }
          const gold = (rank >= 1 && rank <= 10) ? RANK_REWARD[rank - 1] : 0;
          R.claims[R.week] = R.claims[R.week] || {};
          const already = !!R.claims[R.week][pid];
          if (gold > 0 && !already) { R.claims[R.week][pid] = 1; store.touch(); }
          return send(res, 200, {
            ok: true, week: R.week, rank: rank, score: arr.length ? arr[Math.max(0, rank - 1)].v : 0,
            gold: already ? 0 : gold, claimed: already || gold > 0
          }, CORS_X), true;
        }
        return fail(res, 404, 'NO_SUCH_API', CORS_X), true;
      }

      /* ================= v5.13：線上玩家 / 好友 / 私訊 ================= */
      if (isSoc) {
        if (!gate(req, res, 'social', 180, 3, CORS_X)) return true;
        // v5.16：頭貼是這條分支裡唯一會超過 8 KB 的請求（base64 圖片最多約 24 KB）
        const body = (req.method === 'POST')
          ? await readJson(req, p === '/api/social/avatar' ? 40960 : 8192)
          : null;
        const dev = String((body && body.deviceId) || url.searchParams.get('deviceId') || '').slice(0, 128);
        // v5.16：補頭貼那條是唯讀的公開資料（只有圖示大小的圖），不需要裝置編號
        if (p !== '/api/social/av' && dev.length < 6) return fail(res, 400, 'BAD_DEVICE', CORS_X), true;
        const pid = dev ? pidOf('p', dev) : '';

        if (p === '/api/social/hb' && req.method === 'POST') {
          if (!body) return fail(res, 400, 'BAD_BODY', CORS_X), true;
          // v5.17：登入帳號後身分改成「帳號 id」→ 第一次心跳順便把裝置上的舊紀錄整併過來
          socMergeDevice(pid, String(body.dkey || '').slice(0, 128));
          const me = socApply(socGet(pid), body);
          socPrune(socDb());
          store.touch();
          const o = socOut(pid);
          return send(res, 200, {
            ok: true, me: o.me, total: o.total, list: o.list,
            friends: o.friends, blocks: o.blocks, reqs: o.reqs,
            unread: o.unread, unreadBy: o.unreadBy
          }, CORS_X), true;
        }

        if (p === '/api/social/list' && req.method === 'GET') {
          if (url.searchParams.get('name')) {
            // 只是路過（例如手機切回分頁）也順便更新一下在線時間，不必再打一次 hb
            const g = socGet(pid);
            g.n = cleanName(url.searchParams.get('name'), 12);
            g.seen = Date.now();
            store.touch();
          }
          const o = socOut(pid);
          return send(res, 200, {
            ok: true, me: o.me, total: o.total, list: o.list,
            friends: o.friends, blocks: o.blocks, reqs: o.reqs,
            unread: o.unread, unreadBy: o.unreadBy
          }, CORS_X), true;
        }

        /* v5.16：頭貼。圖片本身不跟著名單送（80 人 × 8 KB 會肥 10 倍），
           名單只帶 avt（版本時間），前端看到版本變了才來這裡補圖。 */
        if (p === '/api/social/av' && req.method === 'GET') {
          const raw = String(url.searchParams.get('pids') || '');
          const pids = raw.split(',').map(function (x) { return x.trim().slice(0, 24); })
            .filter(function (x) { return x.length >= 4; }).slice(0, 40);
          const out = {};
          pids.forEach(function (k) {
            const r = avOf(k);
            if (r) out[k] = { d: r.d, t: r.t || 0 };
          });
          return send(res, 200, { ok: true, av: out }, CORS_X), true;
        }

        if (p === '/api/social/avatar' && req.method === 'POST') {
          if (!body) return fail(res, 400, 'BAD_BODY', CORS_X), true;
          const img = String(body.img || '');
          if (img && !avOk(img)) return fail(res, 400, 'BAD_IMG', CORS_X), true;
          const me = socGet(pid);
          const n = avPut(pid, img);
          me.avt = Date.now();          // 版本一定變（含「移除」），別人才知道要重抓
          me.seen = Date.now();
          store.touch();
          return send(res, 200, { ok: true, avt: me.avt, bytes: n }, CORS_X), true;
        }

        if (p === '/api/social/act' && req.method === 'POST') {
          if (!body) return fail(res, 400, 'BAD_BODY', CORS_X), true;
          const S = socDb();
          const me = socGet(pid);
          const action = String(body.action || '');
          const target = String(body.target || '').slice(0, 24);
          if (!target) return fail(res, 400, 'NO_TARGET', CORS_X), true;
          if (target === pid) return fail(res, 400, 'SELF', CORS_X), true;
          const him = S.players[target];
          if (!him) return fail(res, 404, 'NO_TARGET', CORS_X), true;
          let note = '';
          function rm(arr, v) { const i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); }
          function add(arr, v, cap) { if (arr.indexOf(v) < 0 && arr.length < (cap || 200)) arr.push(v); }
          if (action === 'block') {
            add(me.blocks, target);
            rm(me.friends, target); rm(him.friends, pid);
            rm(me.reqs, target); rm(him.reqs, pid);
            note = '已封鎖，對方不會出現在名單也不能私訊你';
          } else if (action === 'unblock') {
            rm(me.blocks, target);
            note = '已解除封鎖';
          } else if (action === 'friend') {
            if (me.blocks.indexOf(target) >= 0) return fail(res, 403, 'BLOCKED', CORS_X), true;
            if (me.friends.length >= 100) return fail(res, 400, 'LIMIT', CORS_X), true;
            if ((him.reqs || []).indexOf(pid) >= 0) {
              add(me.friends, target); add(him.friends, pid);
              rm(me.reqs, target); rm(him.reqs, pid);
              note = '你們成為好友了 🤝';
            } else if (me.friends.indexOf(target) >= 0) {
              note = '已經是好友了';
            } else {
              add(him.reqs, pid, 100);
              note = '已送出好友邀請';
            }
          } else if (action === 'accept') {
            if ((me.reqs || []).indexOf(target) >= 0) {
              add(me.friends, target); add(him.friends, pid);
              rm(me.reqs, target); rm(him.reqs, pid);
              note = '已成為好友 🤝';
            }
          } else if (action === 'ignore') {
            // v5.14：忽略好友邀請（只刪邀請，不會像 unfriend 一樣把既有好友也拆掉）
            rm(me.reqs, target); rm(him.reqs, pid);
            note = '已忽略邀請';
          } else if (action === 'unfriend') {
            rm(me.friends, target); rm(him.friends, pid);
            rm(me.reqs, target); rm(him.reqs, pid);
            note = '已移除好友';
          } else {
            return fail(res, 400, 'BAD_ACTION', CORS_X), true;
          }
          me.seen = Date.now();
          store.touch();
          return send(res, 200, { ok: true, note: note, friends: me.friends, blocks: me.blocks, reqs: me.reqs }, CORS_X), true;
        }

        if (p === '/api/social/dm' && req.method === 'GET') {
          const withPid = String(url.searchParams.get('with') || '').slice(0, 24);
          if (!withPid) return fail(res, 400, 'NO_TARGET', CORS_X), true;
          const limit = Math.max(1, Math.min(200, parseInt(url.searchParams.get('limit'), 10) || 60));
          const me = socGet(pid);
          me.seen = Date.now();
          socRead(pid, withPid);                       // v5.14：打開對話就標已讀
          store.touch();
          return send(res, 200, { ok: true, list: dmList(pid, withPid, limit) }, CORS_X), true;
        }

        if (p === '/api/social/dm' && req.method === 'POST') {
          if (!body) return fail(res, 400, 'BAD_BODY', CORS_X), true;
          const S = socDb();
          const me = socGet(pid);
          const to = String(body.to || '').slice(0, 24);
          const him = S.players[to];
          if (!him) return fail(res, 404, 'NO_TARGET', CORS_X), true;
          if (to === pid) return fail(res, 400, 'SELF', CORS_X), true;
          if (me.blocks.indexOf(to) >= 0) return fail(res, 403, 'BLOCKED', CORS_X), true;
          if ((him.blocks || []).indexOf(pid) >= 0) return fail(res, 403, 'BLOCKED_BY', CORS_X), true;
          const text = String(body.text || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 60);
          if (!text) return fail(res, 400, 'BAD_TEXT', CORS_X), true;
          const key = dmKey(pid, to);
          const arr = S.dm[key] || (S.dm[key] = []);
          arr.push({ id: ++S.dmN, from: pid, t: Date.now(), m: text });
          if (arr.length > DM_MAX) arr.splice(0, arr.length - DM_MAX);
          const ks = Object.keys(S.dm);
          if (ks.length > DM_KEEP) {
            ks.sort(function (a, b) {
              const A = S.dm[a] || [], B = S.dm[b] || [];
              return ((A[A.length - 1] || {}).t | 0) - ((B[B.length - 1] || {}).t | 0);
            });
            const drop = ks.length - DM_KEEP;
            for (let i = 0; i < drop; i++) delete S.dm[ks[i]];
          }
          me.seen = Date.now();
          store.touch();
          return send(res, 200, { ok: true, list: dmList(pid, to, 60) }, CORS_X), true;
        }

        return fail(res, 404, 'NO_SUCH_API', CORS_X), true;
      }


      /* ---------------- v4.80：每日挑戰排行榜 ---------------- */
      // 這兩個端點刻意「不帶 cookie」：前端從 GitHub Pages（純靜態）也能直接跨網域讀寫，
      // 所以一定要回 Access-Control-Allow-Origin；帳號相關的端點完全不受影響。
      const CORS_LB = { 'Access-Control-Allow-Origin': '*' };

      if (p === '/api/lb/top' && req.method === 'GET') {
        const mode = String(url.searchParams.get('mode') || 'daily');
        if (!LB_MODES[mode]) return fail(res, 400, 'BAD_MODE', CORS_LB), true;
        const weekly = mode === 'weekly';
        const qd = String(url.searchParams.get('day') || '');
        const day = weekly
          ? (lbWeekOk(qd) ? qd : lbThisWeek())
          : (lbDayOk(qd) ? qd : lbToday());
        const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get('limit'), 10) || 50));
        const list = lbList(mode, day, limit);
        return send(res, 200, {
          ok: true, mode: mode, day: day,
          today: weekly ? lbThisWeek() : lbToday(),
          list: list, count: list.length
        }, CORS_LB), true;
      }

      if (p === '/api/lb/submit' && req.method === 'POST') {
        if (!gate(req, res, 'lb', 40, 0.25, CORS_LB)) return true;
        const body = await readJson(req, 2048);
        if (!body) return fail(res, 400, 'BAD_BODY', CORS_LB), true;
        const mode = String(body.mode || 'daily');
        if (!LB_MODES[mode]) return fail(res, 400, 'BAD_MODE', CORS_LB), true;
        const weekly = mode === 'weekly';
        const day = String(body.day || '');
        const today = weekly ? lbThisWeek() : lbToday();
        // 每日榜只收「今天」；每週榜只收「本週」（跨週後舊成績自動失效，不能補交）
        if (weekly ? !lbWeekOk(day) : !lbDayOk(day)) {
          return fail(res, 400, 'BAD_DAY', Object.assign({ today: today }, CORS_LB)), true;
        }
        if (day !== today) {
          return fail(res, 409, 'WRONG_DAY', Object.assign({ today: today }, CORS_LB)), true;
        }
        const deviceId = String(body.deviceId || '').slice(0, 128);
        if (deviceId.length < 8) return fail(res, 400, 'BAD_DEVICE', CORS_LB), true;
        const ms = Math.round(Number(body.ms));
        if (!isFinite(ms) || ms < LB_MIN_MS || ms > LB_MAX_MS) return fail(res, 400, 'BAD_TIME', CORS_LB), true;
        const name = lbCleanName(body.name);
        const dev = sha256(deviceId + '|lb|' + secret).slice(0, 20);

        const b = lbBucket(mode, day, true);
        if (!b.list) b.list = [];
        let mine = null;
        for (let i = 0; i < b.list.length; i++) { if (b.list[i].d === dev) { mine = b.list[i]; break; } }
        const improved = !mine || ms < (mine.ms | 0);
        if (improved) {
          if (mine) { mine.ms = ms; mine.n = name; mine.at = Date.now(); }
          else b.list.push({ d: dev, n: name, ms: ms, at: Date.now() });
          lbSort(b.list);
          if (b.list.length > LB_MAX_DAY) b.list.length = LB_MAX_DAY;
          lbPrune();
          store.touch();
        }
        lbSort(b.list);
        let rank = 0, best = ms, total = b.list.length;
        for (let i = 0; i < b.list.length; i++) {
          if (b.list[i].d === dev) { rank = i + 1; best = b.list[i].ms | 0; break; }
        }
        return send(res, 200, {
          ok: true, day: day, improved: improved, best: best, rank: rank, total: total,
          list: lbList(mode, day, 50)
        }, CORS_LB), true;
      }

      /* ---------------- v4.18：分享拿金幣 ---------------- */
      if (p === '/api/share/prepare' && req.method === 'POST') {
        if (!gate(req, res, 'share', 12, 3)) return true;
        const acc0 = session(req);
        if (!acc0) return fail(res, 401, 'NO_AUTH'), true;
        if (acc0.kind !== 'member') return fail(res, 403, 'NEED_LOGIN'), true;
        const body = await readJson(req, 1024);
        if (!body) return fail(res, 400, 'BAD_BODY'), true;
        const platform = String(body.platform || '');
        if (SHARE_PLATFORMS.indexOf(platform) < 0) return fail(res, 400, 'BAD_PLATFORM'), true;
        const st = shareState(acc0);
        if (st.claimed[platform]) return send(res, 409, { ok: false, err: 'ALREADY', share: shareOut(acc0) }), true;
        const day = shareDayKey();
        if (st.day !== day) { st.day = day; st.n = 0; }
        if ((st.n | 0) >= SHARE_DAILY_MAX) {
          return send(res, 429, { ok: false, err: 'DAILY_LIMIT', share: shareOut(acc0) }), true;
        }
        const nonce = rid(16), exp = Date.now() + SHARE_TTL;
        st.prep = { platform: platform, nonce: nonce, exp: exp };
        store.touch();
        return send(res, 200, {
          ok: true, token: shareToken(acc0, platform, nonce, exp), exp: exp, reward: SHARE_REWARD
        }), true;
      }

      if (p === '/api/share/claim' && req.method === 'POST') {
        if (!gate(req, res, 'share', 12, 3)) return true;
        const acc0 = session(req);
        if (!acc0) return fail(res, 401, 'NO_AUTH'), true;
        if (acc0.kind !== 'member') return fail(res, 403, 'NEED_LOGIN'), true;
        const body = await readJson(req, 1024);
        if (!body) return fail(res, 400, 'BAD_BODY'), true;
        const platform = String(body.platform || '');
        const token = String(body.token || '');
        const st = shareState(acc0);
        const prep = st.prep;
        if (!prep || prep.platform !== platform || !(prep.exp > Date.now())) {
          return send(res, 409, { ok: false, err: 'EXPIRED', share: shareOut(acc0) }), true;
        }
        if (shareToken(acc0, platform, prep.nonce, prep.exp) !== token) {
          stats.tamper++;
          return send(res, 409, { ok: false, err: 'BAD_TOKEN' }), true;
        }
        st.prep = null;                                   // 一次性：用完立刻作廢
        if (st.claimed[platform]) {
          return send(res, 409, { ok: false, err: 'ALREADY', share: shareOut(acc0) }), true;
        }
        const day = shareDayKey();
        if (st.day !== day) { st.day = day; st.n = 0; }
        if ((st.n | 0) >= SHARE_DAILY_MAX) {
          return send(res, 429, { ok: false, err: 'DAILY_LIMIT', share: shareOut(acc0) }), true;
        }
        st.claimed[platform] = Date.now();
        st.n = (st.n | 0) + 1;
        acc0.rpg.gold = Math.max(0, (acc0.rpg.gold | 0) + SHARE_REWARD);
        logEvent(acc0, 'share', { platform: platform, gold: acc0.rpg.gold | 0 });
        store.touch();
        return send(res, 200, {
          ok: true, reward: SHARE_REWARD, gold: acc0.rpg.gold | 0,
          share: shareOut(acc0), account: publicAccount(acc0)
        }), true;
      }

      /* ---------------- 登入設定 ---------------- */
      if (p === '/api/auth/config' && req.method === 'GET') {
        const out = { ok: true, origin: originOf(req), providers: {} };
        for (const k in PROVIDERS) out.providers[k] = providerInfo(k);
        return send(res, 200, out), true;
      }

      /* ---------------- 遊客身分 ---------------- */
      if (p === '/api/auth/guest' && req.method === 'POST') {
        if (!gate(req, res, 'guest', 10, 0.5)) return true;
        const body = await readJson(req, 2048);
        if (!body) return fail(res, 400, 'BAD_BODY'), true;
        const dev = String(body.deviceId || '').slice(0, 128);
        if (dev.length < 8) return fail(res, 400, 'BAD_DEVICE'), true;
        const hash = sha256(dev + '|' + secret).slice(0, 40);
        const cur = session(req);
        let acc = guestByDevice(hash);
        // 這台裝置之前綁定過正式帳號 → 登出後不要再被自動帶回去，改發一個新的遊客身分
        if (acc && acc.kind === 'member') acc = null;
        if (!acc) {
          acc = createAccount('guest', { name: '遊客' });
          acc.device = hash;
        }
        if (cur && cur.kind === 'member') {
          // 已經登入正式帳號就不要被降級成遊客
          db.devices[hash] = cur.id;
          store.touch();
          return send(res, 200, { ok: true, account: publicAccount(cur), announce: announceOut() }), true;
        }
        db.devices[hash] = acc.id;
        acc.lastSeen = Date.now();
        store.touch();
        cookieSet(res, req, makeToken(secret, acc.id));
        return send(res, 200, { ok: true, account: publicAccount(acc), announce: announceOut() }), true;
      }

      /* ---------------- 我是誰 ---------------- */
      if (p === '/api/auth/me' && req.method === 'GET') {
        const acc = session(req);
        const ann = announceOut();
        if (!acc) return send(res, 200, { ok: true, guest: true, account: null, announce: ann,
          persistWarning: persistWarning }), true;
        return send(res, 200, {
          ok: true, guest: acc.kind === 'guest', account: publicAccount(acc), announce: ann,
          persistWarning: persistWarning
        }), true;
      }

      /* ---------------- 登出 ---------------- */
      if (p === '/api/auth/logout' && req.method === 'POST') {
        cookieClear(res);
        return send(res, 200, { ok: true }), true;
      }

      /* ================================================================
         v4.3：傳統帳密（Email / 使用者名稱 ＋ 密碼）
         - 註冊：密碼經 scrypt 加鹽雜湊後才寫入，資料庫不存明文
         - 登入：同樣的 KDF 重算後 timingSafeEqual 比對 → 發 HttpOnly Session Cookie
         - 連續錯 5 次鎖 5 分鐘（Lockout），並用固定成本雜湊抹平「帳號是否存在」的時差
         ================================================================ */
      if (p === '/api/auth/register' && req.method === 'POST') {
        if (!gate(req, res, 'reg', 8, 0.5)) return true;
        const body = await readJson(req, 4096);
        if (!body) return fail(res, 400, 'BAD_BODY'), true;
        // v4.13：keep = true → 這次登入的有效期拉長（維持登入）
        const keep = !!(body && body.keep);
        const idc = validIdent(body.id || body.username || body.email);
        if (!idc.ok) return send(res, 400, { ok: false, err: idc.err }), true;
        const raw = String(body.pw || body.password || '');
        const pwErr = pwProblem(raw);
        if (pwErr) return send(res, 400, { ok: false, err: pwErr }), true;
        if (findByKey(idc.key)) return send(res, 409, { ok: false, err: 'ID_TAKEN' }), true;
        // 這個 Email 已經用 Google／FB／LINE 登入過 → 不要另開一個新帳號（進度會分家）
        if (idc.kind === 'email') {
          const other = findByEmail(idc.id);
          if (other) {
            return send(res, 409, {
              ok: false, err: 'EMAIL_OAUTH', provider: other.provider || ''
            }), true;
          }
        }
        const rec = await hashPassword(raw);            // ← 單向雜湊 + 每人獨立鹽
        const cur = session(req);
        const acc = createAccount('member', {
          provider: 'web',
          key: idc.key,
          username: idc.kind === 'user' ? idc.id : '',
          email: idc.kind === 'email' ? idc.id : '',
          name: String(body.name || '').trim().slice(0, 24) || idc.id,
          ip: ip(req)
        });
        acc.pass = rec;
        acc.loginCount = 1;
        acc.dev = (acc.email && DEV_EMAILS.indexOf(String(acc.email).toLowerCase()) >= 0) || false;
        noteIp(acc, ip(req));
        logEvent(acc, 'register', { ip: ip(req), via: '帳號密碼', name: acc.name });
        // 遊客進度完整轉移：關卡、配點、金幣、觸控版面一起帶過來
        if (cur && cur.kind === 'guest' && cur.id !== acc.id && !cur.mergedInto) {
          bindGuest(acc, cur);
          stats.bindings++;
          logEvent(acc, 'bind', { from: cur.id });
        }
        stats.registers++;
        stats.logins++;
        store.touch();
        // v4.13：維持登入 → cookie 與 token 都給 1 年；否則用預設的 30 天
        cookieSet(res, req, makeToken(secret, acc.id, keep ? KEEP_TTL : undefined),
          keep ? Math.floor(KEEP_TTL / 1000) : undefined);
        return send(res, 200, { ok: true, account: publicAccount(acc), merged: !!(cur && cur.kind === 'guest') }), true;
      }

      if (p === '/api/auth/login' && req.method === 'POST') {
        if (!gate(req, res, 'login', 20, 1)) return true;
        const body = await readJson(req, 4096);
        if (!body) return fail(res, 400, 'BAD_BODY'), true;
        // v4.13：keep = true → 這次登入的有效期拉長（維持登入）
        const keep = !!(body && body.keep);
        const idc = validIdent(body.id || body.username || body.email);
        const raw = String(body.pw || body.password || '');
        const acc = idc.ok ? findByKey(idc.key) : null;
        if (acc && acc.banned) {
          return send(res, 403, {
            ok: false, err: 'BANNED',
            reason: (acc.banned && acc.banned.reason) || ''
          }), true;
        }
        const now = Date.now();
        if (acc && acc.lockUntil && acc.lockUntil > now) {
          const retry = Math.ceil((acc.lockUntil - now) / 1000);
          return send(res, 423, { ok: false, err: 'LOCKED', retry: retry }, { 'Retry-After': String(retry) }), true;
        }
        let okPw = false;
        if (acc && acc.pass) okPw = await verifyPassword(raw, acc.pass);
        else await hashPassword(raw || 'x');        // 帳號不存在也花同樣成本，避免 timing 探測
        if (!acc || !acc.pass || !okPw) {
          if (acc) {
            acc.fails = (acc.fails | 0) + 1;
            if (acc.fails >= 5) { acc.lockUntil = now + 300000; acc.fails = 0; logEvent(acc, 'lock', { ip: ip(req), via: '帳號密碼' }); }
            logEvent(acc, 'login-fail', { ip: ip(req), via: '帳號密碼', fails: acc.fails | 0 });
            store.touch();
          }
          return send(res, 401, { ok: false, err: 'BAD_LOGIN' }), true;
        }
        acc.fails = 0;
        acc.lockUntil = 0;
        acc.loginCount = (acc.loginCount | 0) + 1;
        acc.lastSeen = now;
        noteIp(acc, ip(req));
        logEvent(acc, 'login', { ip: ip(req), via: '帳號密碼' });
        const cur = session(req);
        if (cur && cur.kind === 'guest' && cur.id !== acc.id && !cur.mergedInto) {
          bindGuest(acc, cur);
          stats.bindings++;
          logEvent(acc, 'bind', { from: cur.id });
        }
        stats.webLogins++;
        stats.logins++;
        store.touch();
        // v4.13：維持登入 → cookie 與 token 都給 1 年；否則用預設的 30 天
        cookieSet(res, req, makeToken(secret, acc.id, keep ? KEEP_TTL : undefined),
          keep ? Math.floor(KEEP_TTL / 1000) : undefined);
        return send(res, 200, { ok: true, account: publicAccount(acc), keep: keep }), true;
      }

      if (p === '/api/auth/password' && req.method === 'POST') {
        if (!gate(req, res, 'passwd', 4, 0.2)) return true;
        const acc = session(req);
        if (!acc) return fail(res, 401, 'NO_SESSION'), true;
        const body = await readJson(req, 2048);
        if (!body) return fail(res, 400, 'BAD_BODY'), true;
        const oldPw = String(body.old || body.oldPassword || '');
        const newPw = String(body.pw || body.password || '');
        if (acc.pass && !(await verifyPassword(oldPw, acc.pass))) {
          return send(res, 401, { ok: false, err: 'BAD_LOGIN' }), true;
        }
        const pwErr = pwProblem(newPw);
        if (pwErr) return send(res, 400, { ok: false, err: pwErr }), true;
        acc.pass = await hashPassword(newPw);      // 重新加鹽重算，舊雜湊直接作廢
        logEvent(acc, 'passwd', { ip: ip(req) });
        store.touch();
        return send(res, 200, { ok: true, account: publicAccount(acc) }), true;
      }

      /* ---------------- 第三方登入：導向 ---------------- */
      const mStart = p.match(/^\/api\/auth\/(google|facebook|line)\/start$/);
      if (mStart && req.method === 'GET') {
        const prov = mStart[1];
        const info = providerInfo(prov);
        const back = safeRedirect(url.searchParams.get('redirect'));
        if (!info.on) {
          return send(res, 503, {
            ok: false, err: 'PROVIDER_OFF', provider: prov,
            hint: '伺服器尚未設定 ' + PROVIDERS[prov].idEnv + ' / ' + PROVIDERS[prov].secretEnv
          }), true;
        }
        const cur = session(req);
        const bind = (url.searchParams.get('bind') === '1' && cur && cur.kind === 'guest') ? cur.id : '';
        const nonce = rid(12);
        const now = Date.now();
        states.forEach(function (v, k) { if (v.exp < now) states.delete(k); });
        states.set(nonce, { provider: prov, bind: bind, redirect: back, exp: now + 600000 });
        const redirectUri = originOf(req) + '/api/auth/' + prov + '/callback';
        const q = [
          'client_id=' + encodeURIComponent(info.id),
          'redirect_uri=' + encodeURIComponent(redirectUri),
          'response_type=code',
          'scope=' + encodeURIComponent(PROVIDERS[prov].scope),
          'state=' + encodeURIComponent(nonce)
        ];
        if (prov === 'google') q.push('prompt=select_account', 'access_type=online');
        if (prov === 'facebook') q.push('auth_type=rerequest');
        res.writeHead(302, { Location: PROVIDERS[prov].authUrl + '?' + q.join('&'), 'Cache-Control': 'no-store' });
        return res.end(), true;
      }

      /* ---------------- 第三方登入：回呼 ---------------- */
      const mCb = p.match(/^\/api\/auth\/(google|facebook|line)\/callback$/);
      if (mCb && req.method === 'GET') {
        const prov = mCb[1];
        const st = states.get(String(url.searchParams.get('state') || ''));
        const code = String(url.searchParams.get('code') || '');
        const back = (st && st.redirect) || '/';
        states.delete(String(url.searchParams.get('state') || ''));
        if (!st || st.provider !== prov || st.exp < Date.now()) return redirectBack(res, back, 'state');
        if (!code) return redirectBack(res, back, 'cancel');
        const info = providerInfo(prov);
        if (!info.on) return redirectBack(res, back, 'provider_off');
        let tok;
        try {
          tok = await exchangeCode(prov, code, originOf(req) + '/api/auth/' + prov + '/callback');
        } catch (e) {
          console.error('[cloud] token 交換失敗:', e.message);
          return redirectBack(res, back, 'token');
        }
        let profile;
        try { profile = await PROVIDERS[prov].profile(tok); }
        catch (e) {
          console.error('[cloud] 取個資失敗:', e.message);
          return redirectBack(res, back, 'profile');
        }
        let acc = upsertMember(prov, profile);
        stats.logins++;
        // 遊客綁定：把遊客進度併進正式帳號（不覆蓋、不歸零）
        if (st.bind) {
          const gust = findById(st.bind);
          if (gust && !gust.mergedInto && gust.id !== acc.id) {
            bindGuest(acc, gust);
            stats.bindings++;
            logEvent(acc, 'bind', { from: gust.id, via: prov });
          }
        }
        /* v5.14：第三方登入以前完全沒有足跡 —— 後台只看得到帳密登入，會誤判「這人沒在玩」 */
        logEvent(acc, 'login', {
          ip: ip(req),
          via: prov === 'google' ? 'Google' : prov === 'facebook' ? 'Facebook' : 'LINE'
        });
        cookieSet(res, req, makeToken(secret, acc.id));
        store.touch();
        return redirectBack(res, back, 'ok'), true;
      }

      /* ================================================================
         v4.3：開發者後台 API —— 只有 DEV_EMAILS 白名單（jon84597@gmail.com）
         的一般玩家一律 403，並記一次 tamper
         ================================================================ */
      if (isAdmin) {
        const me = session(req);
        if (!me) return fail(res, 401, 'NO_SESSION'), true;
        if (!isDev(me)) {
          stats.tamper++;
          db.tamper = (db.tamper || 0) + 1;
          store.touch();
          return fail(res, 403, 'NOT_DEV'), true;
        }
        if (!gate(req, res, 'admin', 60, 6)) return true;

        if (p === '/api/admin/overview' && req.method === 'GET') {
          return send(res, 200, adminOverview()), true;
        }

        /* v4.90：整包資料（後台「系統 → 原始 JSON」頁用）
           —— 後台看得到的每個欄位都在這裡，前端可直接複製／匯出。
           不含密碼雜湊（adminRow 只給 hasPass 布林），避免整包外流就能離線爆破。 */
        if (p === '/api/admin/dump' && req.method === 'GET') {
          const all = [];
          let members = 0, guests = 0, devs = 0, banned = 0, today = 0, online = 0, playsToday = 0;
          const now = Date.now(), d0 = twDayStart(now), h24 = now - 86400000;
          for (const id in db.accounts) {
            const a = db.accounts[id];
            if (a.mergedInto) continue;
            if (a.kind === 'member') members++; else guests++;
            if (isDev(a)) devs++;
            if (a.banned) banned++;
            if ((a.created || 0) >= d0) today++;
            if ((a.lastSeen || 0) >= h24) online++;
            const row = adminRow(a);
            playsToday += row.playsToday | 0;
            all.push(row);
          }
          all.sort(function (x, y) { return (y.created || 0) - (x.created || 0); });
          return send(res, 200, {
            ok: true,
            at: now,
            stats: (function () {
              const vo = visitOut();
              return {
                accounts: members + guests, members: members, guests: guests, devs: devs,
                banned: banned, newToday: today, online24h: online,
                tamper: stats.tamper, rateLimited: stats.rateLimited,
                registers: stats.registers, webLogins: stats.webLogins,
                logins: stats.logins, bindings: stats.bindings,
                visitors: vo.uv, visitPv: vo.pv,
                visitToday: vo.todayUv, visitPvToday: vo.todayPv,
                visitDays: vo.days,
                playsToday: playsToday
              };
            })(),
            visits: visitOut(),        // v5.5：整包拜訪紀錄（近 60 天）
            accounts: all,
            devices: db.devices,
            lb: db.lb,
            announce: announceOut(),
            flags: {
              version: PKG ? PKG.version : '',
              ephemeral: ephemeral,
              persistWarning: persistWarning,
              devEmails: DEV_EMAILS,
              accountLimit: 300
            }
          }), true;
        }

        /* 客服查詢：UID / Email / 使用者名稱都可以 */
        if (p === '/api/admin/player' && req.method === 'GET') {
          const q = String(url.searchParams.get('id') || url.searchParams.get('q') || '').trim();
          let acc = q ? findById(q) : null;
          if (!acc && q) {
            const idc = validIdent(q);
            if (idc.ok) acc = findByKey(idc.key);
            if (!acc) acc = findByEmail(q);
          }
          /* v5.11：上面三步都找不到時，再掃一遍 a.id。
             舊資料可能「物件鍵 ≠ a.id」（帳號合併搬移過），後台名單是拿 a.id 當 data-id，
             只查物件鍵就會 404 —— 這正是「後台點人沒顯示資訊」的來源。 */
          if (!acc && q && q !== 'undefined' && q !== 'null') {
            for (const k in db.accounts) {
              const a = db.accounts[k];
              if (a && !a.mergedInto && String(a.id || '') === q) { acc = a; break; }
            }
          }
          if (!acc) return fail(res, 404, 'NOT_FOUND', { q: q, total: Object.keys(db.accounts).length }), true;
          const row = adminRow(acc);
          row.alloc = acc.rpg ? Object.assign({}, acc.rpg.alloc) : null;
          row.cleared = acc.rpg ? (acc.rpg.cleared | 0) : 0;
          row.points = pointsTotalFor(row.cleared);
          row.lv = lvOfXp(ensureXp(acc.rpg)).lv;
          row.xp = ensureXp(acc.rpg);
          row.spent = acc.rpg ? sumAlloc(acc.rpg.alloc) : 0;
          // v5.5：playSec = 帳號層級（所有模式累加）；playRpgSec = 舊的 RPG 通關用時
          row.playSec = (acc.playSec | 0) || (acc.rpg ? (acc.rpg.playSec | 0) : 0);
          row.playRpgSec = acc.rpg ? (acc.rpg.playSec | 0) : 0;
          row.stages = acc.stages || {};
          row.events = (acc.events || []).slice(-30).reverse().map(function (e) {
            return Object.assign({}, e, {
              str: stamp(e.t),
              mode: EVENT_LABEL[e.type] || e.type || ''
            });
          });
          return send(res, 200, { ok: true, account: row }), true;
        }

        /* 停權 / 解除停權（IP 或 UID 對應的帳號） */
        if (p === '/api/admin/ban' && req.method === 'POST') {
          const body = await readJson(req, 2048);
          if (!body) return fail(res, 400, 'BAD_BODY'), true;
          const target = findById(String(body.id || ''));
          if (!target) return fail(res, 404, 'NOT_FOUND'), true;
          if (isDev(target) && target.id !== me.id) return fail(res, 403, 'CANT_BAN_DEV'), true;
          if (body.on === false || body.on === 0 || body.on === '0') {
            target.banned = null;
            logEvent(target, 'unban', { by: me.id });
          } else {
            target.banned = {
              at: Date.now(),
              reason: String(body.reason || '').slice(0, 120),
              by: me.id
            };
            stats.bans++;
            logEvent(target, 'ban', { by: me.id, reason: target.banned.reason || '' });
          }
          store.touch();
          return send(res, 200, { ok: true, account: adminRow(target) }), true;
        }

        /* 客服修復：直接改關卡進度／金幣（開發者測試數值用） */
        if (p === '/api/admin/grant' && req.method === 'POST') {
          const body = await readJson(req, 2048);
          if (!body) return fail(res, 400, 'BAD_BODY'), true;
          const target = findById(String(body.id || ''));
          if (!target) return fail(res, 404, 'NOT_FOUND'), true;
          if (body.cleared != null) {
            target.rpg.cleared = clampInt(body.cleared, 0, MAX_STAGE, target.rpg.cleared | 0);
          }
          if (body.gold != null) {
            target.rpg.gold = clampInt(body.gold, 0, 99999999, target.rpg.gold | 0);
          }
          target.rpg.alloc = fitAlloc(target.rpg.alloc, pointsTotalFor(target.rpg.cleared));
          target.rpg.ver = (target.rpg.ver || 1) + 1;
          logEvent(target, 'grant', { by: me.id, cleared: target.rpg.cleared | 0, gold: target.rpg.gold | 0 });
          store.touch();
          return send(res, 200, { ok: true, account: adminRow(target), rpg: target.rpg }), true;
        }

        /* 客服修復：把配點歸零重新配 */
        if (p === '/api/admin/reset-alloc' && req.method === 'POST') {
          const body = await readJson(req, 2048);
          if (!body) return fail(res, 400, 'BAD_BODY'), true;
          const target = findById(String(body.id || ''));
          if (!target) return fail(res, 404, 'NOT_FOUND'), true;
          target.rpg.alloc = { hp: 0, def: 0, spd: 0, atk: 0 };
          target.rpg.ver = (target.rpg.ver || 1) + 1;
          logEvent(target, 'reset-alloc', { by: me.id });
          store.touch();
          return send(res, 200, { ok: true, account: adminRow(target) }), true;
        }

        /* 線上公告：不用重新部署就能對全服推播 */
        if (p === '/api/admin/announce' && req.method === 'POST') {
          const body = await readJson(req, 4096);
          if (!body) return fail(res, 400, 'BAD_BODY'), true;
          const text = String(body.text || '').trim().slice(0, 300);
          if (!text) {
            db.announce = null;
          } else {
            const hours = clampInt(body.hours, 0, 720, 24);
            db.announce = {
              text: text,
              ts: Date.now(),
              until: hours > 0 ? Date.now() + hours * 3600000 : 0,
              by: me.id
            };
          }
          store.touch();
          return send(res, 200, { ok: true, announce: announceOut() }), true;
        }

        return fail(res, 404, 'NO_SUCH_API'), true;
      }

      /* ---------------- 需要登入的 RPG API ---------------- */
      if (isRpg) {
        const acc = session(req);
        if (!acc) return fail(res, 401, 'NO_SESSION'), true;

        /* v4.85：整包存檔 —— 讓「單機進度／金幣／隨從／票券／教學／每日最佳」
           跟著帳號走，不再只鎖在這台裝置的瀏覽器裡 */
        if (p === '/api/save/get' && req.method === 'POST') {
          if (!gate(req, res, 'saveget', 30, 6)) return true;
          return send(res, 200, {
            ok: true,
            save: acc.save || null,
            rev: acc.saveRev || 0,
            ts: acc.saveTs || 0
          }), true;
        }

        if (p === '/api/save/put' && req.method === 'POST') {
          if (!gate(req, res, 'saveput', 20, 4)) return true;
          const body = await readJson(req, 65536);
          if (!body || !body.save || typeof body.save !== 'object') return fail(res, 400, 'BAD_BODY'), true;
          acc.save = sanitizeSave(body.save);
          acc.saveRev = (acc.saveRev || 0) + 1;
          acc.saveTs = Date.now();
          /* v5.14：存檔只記時間對客服沒有用。記下「第幾次、多大、目前進度多少」，
             玩家回報「我金幣不見了」時，後台可以直接對照存檔前後的數字。 */
          logEvent(acc, 'save', {
            rev: acc.saveRev,
            kb: Math.round(JSON.stringify(acc.save).length / 102.4) / 10,
            lvl: acc.save.stage | 0,
            gold: acc.save.gold | 0,
            achN: Object.keys(acc.save.ach ? (acc.save.ach.u || {}) : {}).length,
            sec: acc.playSec | 0
          });
          store.touch();
          return send(res, 200, { ok: true, rev: acc.saveRev, ts: acc.saveTs }), true;
        }

        if (p === '/api/rpg/state' && req.method === 'GET') {
          return send(res, 200, { ok: true, account: publicAccount(acc) }), true;
        }

        if (p === '/api/rpg/spend' && req.method === 'POST') {
          if (!gate(req, res, 'spend', 8, 4)) return true;
          const body = await readJson(req, 2048);
          if (!body) return fail(res, 400, 'BAD_BODY'), true;
          const attr = String(body.attr || body.attribute || '');
          const delta = body.delta === -1 ? -1 : 1;
          if (Number(body.pay) > 0) logEvent(acc, 'alloc-buy', { attr: attr, pay: Number(body.pay) | 0 });
          const r = spendPoint(acc.rpg, attr, delta, Number(body.pay) || 0);
          if (!r.ok) return send(res, 409, Object.assign({ ok: false }, r)), true;
          store.touch();
          return send(res, 200, Object.assign({ ok: true, account: publicAccount(acc) }, r)), true;
        }

        if (p === '/api/rpg/alloc' && req.method === 'POST') {
          if (!gate(req, res, 'alloc', 3, 1)) return true;
          const body = await readJson(req, 2048);
          if (!body) return fail(res, 400, 'BAD_BODY'), true;
          const total = pointsTotalFor(acc.rpg);
          // 允許的「超 4 格」數量＝已買額度，或他現在就已經有的（舊帳號相容）
          let overNow = 0;
          for (let i = 0; i < ATTRS.length; i++) overNow += Math.max(0, (acc.rpg.alloc[ATTRS[i]] | 0) - FREE_PER);
          const v = validateAlloc(body.alloc, total, Math.max(clampInt(acc.rpg.bought, 0, 200, 0), overNow));
          if (!v.ok) {
            stats.tamper++;
            return send(res, 409, { ok: false, err: 'BAD_ALLOC', detail: v }), true;
          }
          acc.rpg.alloc = v.alloc;
          acc.rpg.ver = (acc.rpg.ver || 1) + 1;
          store.touch();
          return send(res, 200, { ok: true, account: publicAccount(acc), left: freeLeftOf(acc.rpg), total: total }), true;
        }

        /* ---- v5.19：營地（永久強化／招式／出戰欄／補給）----
           金幣是 Shop 那一套（跟著整包存檔走），rpg.gold 是過關獎勵，兩者不同步，
           所以這裡不當金幣裁判：只負責把營地狀態存進帳號，並夾回合法範圍。
           永久強化 0~3、補給 0~9、招式等級 0~3、出戰欄最多 4 個「已學會的主動招」。 */
        /* ---- v5.20：重新配點 ----
           把四項歸零，點數全部回到「未分配」。
           刻意不收費、不限次數：這是單機 RPG，配點有重量是好事，
           但「點錯就毀了這輪」不是重量、是懲罰。想換打法的人應該隨時能試。
           要注意的是陣營天賦（角色）不會跟著換 —— 那個要在角色畫面選。 */
        if (p === '/api/rpg/respec' && req.method === 'POST') {
          if (!gate(req, res, 'respec', 6, 2)) return true;
          acc.rpg.alloc = { hp: 0, def: 0, spd: 0, atk: 0 };
          const refund = paidRefund(acc.rpg);
          const fee = refund > 0 ? RESPEC_FEE : 0;
          acc.rpg.paid = { hp: 0, def: 0, spd: 0, atk: 0 };   // v5.46：洗點＝價格階也重來
          acc.rpg.bought = 0;                                 //          買過的額度一起歸零
          acc.rpg.ver = (acc.rpg.ver || 1) + 1;
          store.touch();
          logEvent(acc, 'respec', { refund: refund, fee: fee });
          const capAll = freeCapOf(acc.rpg);
          return send(res, 200, {
            ok: true, account: publicAccount(acc),
            left: capAll, total: capAll, bought: acc.rpg.bought | 0,
            refund: refund, fee: fee, back: Math.max(0, refund - fee)   // v5.46：前端據此退金幣
          }), true;
        }

        if (p === '/api/rpg/camp' && req.method === 'POST') {
          if (!gate(req, res, 'campsave', 20, 8)) return true;
          const body = await readJson(req, 4096);
          if (!body) return fail(res, 400, 'BAD_BODY'), true;
          /* v5.20：樂觀鎖 —— 前端帶著它「看到的那個版本」回來。
             對不上代表另一台裝置在這之間改過（買了東西、學了招），
             直接覆寫會讓那邊的購買紀錄消失，所以回 409 + 目前帳號，讓前端重讀再重試。 */
          const baseRev = body.baseRev;
          const curRev = acc.rpg.campRev | 0;
          if (baseRev != null && Number(baseRev) !== curRev) {
            return send(res, 409, {
              ok: false, err: 'CAMP_CONFLICT',
              account: publicAccount(acc), campRev: curRev
            }), true;
          }
          acc.rpg.perm = body.perm;
          acc.rpg.sk = body.sk;
          acc.rpg.skLoad = body.skLoad;
          acc.rpg.bag = body.bag;
          sanitizeCamp(acc.rpg);
          acc.rpg.campRev = curRev + 1;
          acc.rpg.ver = (acc.rpg.ver || 1) + 1;
          store.touch();
          return send(res, 200, {
            ok: true,
            account: publicAccount(acc),
            campRev: acc.rpg.campRev,
            skPts: rpgSkPtsOf(acc.rpg),
            skLeft: rpgSkLeftOf(acc.rpg)
          }), true;
        }

        if (p === '/api/rpg/stage-clear' && req.method === 'POST') {
          if (!gate(req, res, 'clear', 3, 2)) return true;
          const body = await readJson(req, 2048);
          if (!body) return fail(res, 400, 'BAD_BODY'), true;
          // v4.3：開發者可以跳關（一般玩家照規矩，只能打下一關）
          const r = applyClear(acc.rpg, body.stage, { deaths: body.deaths, playSec: body.playSec, exp: body.exp },
            { force: isDev(acc) });
          if (!r.ok) {
            if (r.err === 'STAGE_LOCKED') stats.tamper++;
            return send(res, 409, Object.assign({ ok: false }, r)), true;
          }
          logEvent(acc, 'clear', { stage: Math.floor(Number(body.stage)) | 0 });
          store.touch();
          return send(res, 200, Object.assign({ ok: true, account: publicAccount(acc) }, r)), true;
        }

        /* v4.3：行為足跡（上線、開關卡、拿道具、配點…）→ 後台客服核對用 */
        if (p === '/api/rpg/event' && req.method === 'POST') {
          if (!gate(req, res, 'event', 40, 3)) return true;
          const body = await readJson(req, 2048);
          if (!body) return fail(res, 400, 'BAD_BODY'), true;
          const type = String(body.type || '').slice(0, 24);
          if (!type) return fail(res, 400, 'BAD_TYPE'), true;
          const st = body.stage != null ? clampInt(body.stage, 0, MAX_STAGE, 0) : 0;
          const label = body.label ? String(body.label).slice(0, 48) : '';
          // v5.7：只有「關卡型」事件才算進各關卡遊玩次數。
          //   以前任何帶 stage 的事件都算 —— 大逃殺把名次當 stage 傳進來，
          //   stages[1..N] 就被名次灌爆，看不出真正玩了哪一關。
          if (st && STAGE_EVENTS[type]) {
            acc.stages = acc.stages || {};
            acc.stages[st] = (acc.stages[st] | 0) + 1;
          }
          const extra = {};
          if (st) extra.stage = st;
          if (label) extra.label = label;
          logEvent(acc, type, (st || label) ? extra : null);
          store.touch();
          return send(res, 200, { ok: true }), true;
        }

        /* v5.5：累計遊玩時間（前端每 60 秒回報一次「這次玩了几秒」）
           為什麼要獨立一支：舊版只有 stage-clear 帶 playSec，而且用 Math.max 取大
           → 幾乎永遠是第一個值（0）。這裡改成「加法」，帳號層級累加所有模式
           （單人／RPG／對戰／大逃殺都算）。單次上限 2 小時，避免有人一次塞天文數字。 */
        if (p === '/api/rpg/play' && req.method === 'POST') {
          if (!gate(req, res, 'play', 12, .5)) return true;
          const body = await readJson(req, 2048);
          if (!body) return fail(res, 400, 'BAD_BODY'), true;
          const sec = Math.round(Number(body.sec));
          if (!isFinite(sec) || sec < 1) return fail(res, 400, 'BAD_SEC'), true;
          const add = Math.min(7200, sec);
          const cap = 86400 * 365 * 5;                 // 上限 5 年，防止數字爆掉
          acc.playSec = Math.min(cap, (acc.playSec | 0) + add);
          acc.playTs = Date.now();
          store.touch();
          return send(res, 200, { ok: true, playSec: acc.playSec }), true;
        }

        /* 存檔同步：前端帶回伺服器簽發的信封，先驗章再驗內容 */
        if (p === '/api/rpg/sync' && req.method === 'POST') {
          if (!gate(req, res, 'save', 3, 1)) return true;
          const body = await readJson(req, 32768);
          if (!body) return fail(res, 400, 'BAD_BODY'), true;
          const chk = verifyEnvelope(secret, body.payload, body.sig);
          if (!chk.ok) {
            stats.tamper++;
            db.tamper++;
            store.touch();
            return send(res, 409, { ok: false, err: 'SAVE_TAMPERED', detail: chk.err }), true;
          }
          const pl = chk.payload;
          if (pl.uid !== acc.id) {
            stats.tamper++;
            return send(res, 409, { ok: false, err: 'UID_MISMATCH' }), true;
          }
          const claim = pl.rpg || {};
          const far = clampInt(claim.cleared, 0, MAX_STAGE, 0);
          // 離線最多容忍領先 3 關（再多就當成改檔）
          if (far > acc.rpg.cleared + 3) {
            stats.tamper++;
            db.tamper++;
            store.touch();
            return send(res, 409, { ok: false, err: 'TOO_FAR_AHEAD', server: acc.rpg.cleared, got: far }), true;
          }
          const v = validateAlloc(claim.alloc, pointsTotalFor(far));
          if (!v.ok) {
            stats.tamper++;
            db.tamper++;
            store.touch();
            return send(res, 409, { ok: false, err: 'BAD_ALLOC', detail: v }), true;
          }
          if (far > acc.rpg.cleared) {
            while (acc.rpg.cleared < far) {
              const r = applyClear(acc.rpg, acc.rpg.cleared + 1, null);
              if (!r.ok) break;
            }
          }
          acc.rpg.alloc = v.alloc;
          acc.rpg.char = clampInt(claim.char, 0, 7, acc.rpg.char);
          acc.rpg.ver = Math.max(acc.rpg.ver || 1, pl.ver || 1) + 1;
          stats.syncs++;
          store.touch();
          return send(res, 200, { ok: true, account: publicAccount(acc) }), true;
        }

        /* v4.2：觸控版面（模式 / 左右 / 大小 / 自訂搖桿位置）
           只存「玩家在設定裡選了什麼」，一律經 sanitizeLayout() 夾回合法值 */
        if (p === '/api/rpg/layout' && req.method === 'POST') {
          if (!gate(req, res, 'layout', 6, 1)) return true;
          const body = await readJson(req, 2048);
          if (!body) return fail(res, 400, 'BAD_BODY'), true;
          acc.layout = sanitizeLayout(body.layout);
          acc.lastSeen = Date.now();
          store.touch();
          return send(res, 200, { ok: true, layout: acc.layout, account: publicAccount(acc) }), true;
        }

        if (p === '/api/rpg/reset' && req.method === 'POST') {
          if (!gate(req, res, 'reset', 2, 0.2)) return true;
          const body = await readJson(req, 1024);
          if (!body || body.confirm !== 'RESET') return fail(res, 400, 'NEED_CONFIRM'), true;
          acc.rpg = defaultRpg();
          store.touch();
          return send(res, 200, { ok: true, account: publicAccount(acc) }), true;
        }

        return fail(res, 404, 'NO_SUCH_API'), true;
      }

      return fail(res, 404, 'NO_SUCH_API'), true;
    } catch (e) {
      console.error('[cloud] 未預期錯誤:', e && e.stack || e);
      try { send(res, 500, { ok: false, err: 'SERVER_ERROR' }); } catch (e2) {}
      return true;
    }
  }

  function safeRedirect(v) {
    const s = String(v || '/');
    if (s.charAt(0) !== '/' || s.charAt(1) === '/' || s.charAt(1) === '\\') return '/';
    return s.slice(0, 200);
  }
  function redirectBack(res, back, status) {
    const sep = back.indexOf('?') >= 0 ? '&' : '?';
    res.writeHead(302, { Location: back + sep + 'login=' + encodeURIComponent(status), 'Cache-Control': 'no-store' });
    res.end();
  }

  async function exchangeCode(prov, code, redirectUri) {
    const info = providerInfo(prov);
    const form = new URLSearchParams({
      code: code,
      client_id: info.id,
      client_secret: env[PROVIDERS[prov].secretEnv] || '',
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    });
    const json = await fetchJson(PROVIDERS[prov].tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString()
    });
    if (!json || !json.access_token) throw new Error('no access_token');
    return json.access_token;
  }

  function statsOut() {
    let guests = 0, members = 0, devs = 0, banned = 0;
    for (const id in db.accounts) {
      const a = db.accounts[id];
      if (a.mergedInto) continue;
      if (a.kind === 'member') members++; else guests++;
      if (isDev(a)) devs++;
      if (a.banned) banned++;
    }
    return {
      accounts: guests + members,
      guests: guests,
      members: members,
      devs: devs,
      banned: banned,
      tamper: stats.tamper,
      rateLimited: stats.rateLimited,
      logins: stats.logins,
      registers: stats.registers,
      webLogins: stats.webLogins,
      bindings: stats.bindings,
      syncs: stats.syncs,
      persisted: store.remoteOn ? store.state.loaded : !!persist,
      storage: store.state.mode,
      storageLoaded: store.state.loaded,
      storageError: store.state.lastError,
      storageWrites: store.state.writes,
      storageFails: store.state.fails,
      storageSkipped: store.state.skipped,
      // v4.85f：遮罩過的設定指紋 —— 用來判斷「Render 上那把 key 跟正確的是不是同一把」
      //   只露前綴（sb_secret_ / sb_publishable_）、長度與 sha256 前 8 碼，不外洩金鑰本身。
      rankClamped: rankClamped,   // v5.28：排行榜被合理性檢查夾住的次數
      storageDiag: (function () {
        const k = String(remote.key || '');
        const pfx = k.slice(0, 10);
        let h = '';
        try { h = crypto.createHash('sha256').update(k).digest('hex').slice(0, 8); } catch (e) {}
        return {
          urlHost: String(remote.url || '').replace(/^https?:\/\//, '').split('/')[0],
          table: remote.table,
          keyLen: k.length,
          keyPfx: pfx,
          keyHash: h,
          keySet: !!k,
          keyNameWarn: keyNameWarn || '',
          // 只看「名稱含 SUPABASE 的環境變數」叫什麼、值有多長（不露值本體）：
          //   常見症狀是變數名打錯（多一個空白、少一個 E）或存檔時只存了一個。
          envNames: Object.keys(env)
            .filter(function (n) { return /SUPABASE/i.test(n); })
            .sort()
            .map(function (n) { return n + ':' + String(env[n] == null ? '' : env[n]).length; })
        };
      })(),
      dir: dir
    };
  }

  return {
    handle: handle,
    stats: statsOut,
    flush: store.flush,
    ready: readyAll,
    storage: store.state,
    // v4.85e：密鑰可能在 cloud.ready 之後才從 Supabase 換成雲端那一把 → 用 getter 讀最新值
    get secret() { return secret; },
    db: db,
    _internals: {
      session: session, publicAccount: publicAccount, findById: findById,
      findByKey: findByKey, findByEmail: findByEmail, isDev: isDev,
      createAccount: createAccount, mergeProgress: mergeProgress, store: store,
      bindGuest: bindGuest, upsertMember: upsertMember, db: db,
      sanitizeLayout: sanitizeLayout, adminOverview: adminOverview, logEvent: logEvent,
      noteIp: noteIp, hashPassword: hashPassword, verifyPassword: verifyPassword
    }
  };
}

module.exports = {
  createCloud: createCloud,
  // 給測試用的純函式
  ATTRS: ATTRS, BASE_POINTS: BASE_POINTS, CAP: CAP, MAX_POINTS: MAX_POINTS, MAX_STAGE: MAX_STAGE,
  FREE_PER: FREE_PER, sumPaid: sumPaid, freeLeftOf: freeLeftOf, spendPoint: spendPoint,
  paidRefund: paidRefund, RESPEC_FEE: RESPEC_FEE,   // v5.46
  pointsTotalFor: pointsTotalFor, goldFor: goldFor, stageReward: stageReward,
  applyClear: applyClear, spendPoint: spendPoint,
  LV_MAX: LV_MAX, XP_MAX: XP_MAX, xpNeed: xpNeed, lvOfXp: lvOfXp, xpTotalOfLv: xpTotalOfLv,
  foeLvOfStage: foeLvOfStage, foeXpOf: foeXpOf, stageXpOf: stageXpOf, ensureXp: ensureXp,
  defaultRpg: defaultRpg, validateAlloc: validateAlloc, spendPoint: spendPoint,
  defaultLayout: defaultLayout, sanitizeLayout: sanitizeLayout,
  applyClear: applyClear, mergeProgress: mergeProgress, fitAlloc: fitAlloc,
  makeEnvelope: makeEnvelope, verifyEnvelope: verifyEnvelope,
  makeToken: makeToken, readToken: readToken, canonical: canonical,
  makeLimiter: makeLimiter, sumAlloc: sumAlloc,
  /* v4.3：帳密註冊／資安 */
  hashPassword: hashPassword, verifyPassword: verifyPassword,
  validIdent: validIdent, pwProblem: pwProblem, stamp: stamp,
  devEmailList: devEmailList, DEV_EMAILS_DEFAULT: DEV_EMAILS_DEFAULT,
  PW_MIN: PW_MIN,
  /* v5.7：後台時間與遊玩足跡（測試用） */
  TW_OFFSET_MS: TW_OFFSET_MS, twDayStart: twDayStart,
  STAGE_EVENTS: STAGE_EVENTS, PLAY_EVENTS: PLAY_EVENTS, EVENT_LABEL: EVENT_LABEL
};
