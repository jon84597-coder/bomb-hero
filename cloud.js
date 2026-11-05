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
const MAX_STAGE = 32;
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
function stamp(ms) {
  const d = new Date(ms || Date.now());
  function two(n) { return (n < 10 ? '0' : '') + n; }
  return d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate()) + ' ' +
    two(d.getHours()) + ':' + two(d.getMinutes()) + ':' + two(d.getSeconds());
}

function sumAlloc(a) {
  let n = 0;
  for (let i = 0; i < ATTRS.length; i++) n += (a && a[ATTRS[i]]) || 0;
  return n;
}

/* ---------------------------------------------------------------- 進度數學 */

/* 每 5 關多給 1 點配點（最多 40 點＝四項全滿），全部由後端決定 */
function pointsTotalFor(cleared) {
  const c = clampInt(cleared, 0, MAX_STAGE, 0);
  return Math.min(MAX_POINTS, BASE_POINTS + Math.floor(c / 5));
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
    cleared: 0,
    gold: 0,
    char: 0,
    deaths: 0,
    playSec: 0,
    ver: 1
  };
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
function validateAlloc(alloc, pointsTotal) {
  const cap = (pointsTotal == null || !isFinite(pointsTotal)) ? BASE_POINTS : clampInt(pointsTotal, 0, MAX_POINTS, BASE_POINTS);
  const out = {};
  let spent = 0;
  for (let i = 0; i < ATTRS.length; i++) {
    const k = ATTRS[i];
    const raw = alloc ? alloc[k] : 0;
    const n = Math.floor(Number(raw));
    if (!isFinite(n) || n < 0) return { ok: false, err: 'NEGATIVE', attr: k };
    if (n > CAP) return { ok: false, err: 'ATTR_CAP', attr: k, cap: CAP };
    out[k] = n;
    spent += n;
  }
  if (spent > cap) return { ok: false, err: 'POINT_OVERFLOW', spent: spent, cap: cap };
  return { ok: true, alloc: out, spent: spent, cap: cap };
}

/* 單次配點（+1 / -1）：這是真正在後端執行的增減，前端只說「哪一項」 */
function spendPoint(rpg, attr, delta) {
  if (ATTRS.indexOf(attr) < 0) return { ok: false, err: 'BAD_ATTR' };
  let d = 1;
  if (delta === -1 || delta === '-1') d = -1;
  else if (delta === undefined || delta === null || delta === 1 || delta === '1') d = 1;
  else return { ok: false, err: 'BAD_DELTA' };
  const total = pointsTotalFor(rpg.cleared);
  const cur = rpg.alloc[attr] || 0;
  if (d > 0) {
    if (cur >= CAP) return { ok: false, err: 'ATTR_CAP', attr: attr, cap: CAP };
    if (sumAlloc(rpg.alloc) >= total) return { ok: false, err: 'NO_POINTS', left: 0, total: total };
    rpg.alloc[attr] = cur + 1;
  } else {
    if (cur <= 0) return { ok: false, err: 'ATTR_EMPTY', attr: attr };
    rpg.alloc[attr] = cur - 1;
  }
  rpg.ver = (rpg.ver || 1) + 1;
  return { ok: true, alloc: Object.assign({}, rpg.alloc), left: total - sumAlloc(rpg.alloc), total: total };
}

/* 過關：必須是按順序解鎖（只能打「下一關」，或重打已過關的舊關卡）
   opts.force = 開發者測試用：直接跳關（一般玩家永遠不會走到這條） */
function applyClear(rpg, stage, meta, opts) {
  const s = Math.floor(Number(stage));
  if (!isFinite(s) || s < 1 || s > MAX_STAGE) return { ok: false, err: 'BAD_STAGE' };
  const force = !!(opts && opts.force);
  if (!force && s > rpg.cleared + 1) return { ok: false, err: 'STAGE_LOCKED', need: rpg.cleared + 1, got: s };
  const replay = s <= rpg.cleared;
  if (!replay) {
    rpg.cleared = s;
    rpg.gold = Math.max(0, (rpg.gold || 0) + stageReward(s));
  }
  if (meta) {
    if (meta.deaths != null) rpg.deaths = Math.max(rpg.deaths || 0, clampInt(meta.deaths, 0, 999999, 0));
    if (meta.playSec != null) rpg.playSec = Math.max(rpg.playSec || 0, clampInt(meta.playSec, 0, 86400 * 60, 0));
  }
  rpg.ver = (rpg.ver || 1) + 1;
  return {
    ok: true, replay: replay, rpg: rpg,
    gold: rpg.gold, points: pointsTotalFor(rpg.cleared), unlocked: Math.min(MAX_STAGE, rpg.cleared + 1)
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
  const cap = pointsTotalFor(cleared);
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
    char: (b.cleared || 0) >= (g.cleared || 0) ? clampInt(b.char, 0, 7, 0) : clampInt(g.char, 0, 7, 0),
    deaths: Math.max(b.deaths || 0, g.deaths || 0),
    playSec: Math.max(b.playSec || 0, g.playSec || 0),
    ver: Math.max(b.ver || 1, g.ver || 1) + 1
  };
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
    visits: { v: 1, pv: 0, dev: {}, days: {}, first: Date.now() } };
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
      visits: db.visits || { v: 1, pv: 0, dev: {}, days: {}, first: Date.now() }   // v5.5：拜訪紀錄
    };
  }
  function applyPart(key, val) {
    if (!val || typeof val !== 'object') return false;
    if (key === 'accounts') {
      db.accounts = (val.accounts && typeof val.accounts === 'object') ? val.accounts : {};
      db.devices = (val.devices && typeof val.devices === 'object') ? val.devices : {};
      return true;
    }
    if (key === 'lb') { db.lb = val.days ? val : { v: 1, days: {} }; return true; }
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
      db.tamper = obj.tamper || 0;
      db.created = obj.created || db.created;
      db.announce = obj.announce || null;      // v4.3：全服公告
      db.sec = typeof obj.sec === 'string' ? obj.sec : '';
      db.lb = obj.lb && obj.lb.days ? obj.lb : { v: 1, days: {} };   // v4.80：排行榜
      db.visits = (obj.visits && typeof obj.visits === 'object') ? obj.visits : db.visits;   // v5.5：拜訪紀錄
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
  if (opt.fetch) fetchImpl = opt.fetch;

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
    const points = pointsTotalFor(acc.rpg.cleared);
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
      left: points - sumAlloc(acc.rpg.alloc),
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

  /* v4.3：後台專用資料（只給開發者看，一般玩家一律 403） */
  function adminRow(a) {
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
      hasPass: !!a.pass
    };
  }

  function adminOverview() {
    const list = [];
    let members = 0, guests = 0, devs = 0, banned = 0, today = 0, online = 0;
    const now = Date.now(), day0 = new Date(); day0.setHours(0, 0, 0, 0);
    const d0 = day0.getTime(), h24 = now - 86400000;
    for (const id in db.accounts) {
      const a = db.accounts[id];
      if (a.mergedInto) continue;
      if (a.kind === 'member') members++; else guests++;
      if (isDev(a)) devs++;
      if (a.banned) banned++;
      if ((a.created || 0) >= d0) today++;
      if ((a.lastSeen || 0) >= h24) online++;
      list.push(adminRow(a));
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
          visitDays: vo.days
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
    if (!isAuth && !isRpg && !isAdmin && !isShare && !isLb && !isVisit) return false;

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
        logEvent(acc, 'register', { ip: ip(req) });
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
            if (acc.fails >= 5) { acc.lockUntil = now + 300000; acc.fails = 0; logEvent(acc, 'lock', { ip: ip(req) }); }
            logEvent(acc, 'login-fail', { ip: ip(req) });
            store.touch();
          }
          return send(res, 401, { ok: false, err: 'BAD_LOGIN' }), true;
        }
        acc.fails = 0;
        acc.lockUntil = 0;
        acc.loginCount = (acc.loginCount | 0) + 1;
        acc.lastSeen = now;
        noteIp(acc, ip(req));
        logEvent(acc, 'login', { ip: ip(req) });
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
          }
        }
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
          let members = 0, guests = 0, devs = 0, banned = 0, today = 0, online = 0;
          const now = Date.now(), day0 = new Date(); day0.setHours(0, 0, 0, 0);
          const d0 = day0.getTime(), h24 = now - 86400000;
          for (const id in db.accounts) {
            const a = db.accounts[id];
            if (a.mergedInto) continue;
            if (a.kind === 'member') members++; else guests++;
            if (isDev(a)) devs++;
            if (a.banned) banned++;
            if ((a.created || 0) >= d0) today++;
            if ((a.lastSeen || 0) >= h24) online++;
            all.push(adminRow(a));
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
                visitDays: vo.days
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
          if (!acc) return fail(res, 404, 'NOT_FOUND'), true;
          const row = adminRow(acc);
          row.alloc = acc.rpg ? Object.assign({}, acc.rpg.alloc) : null;
          row.cleared = acc.rpg ? (acc.rpg.cleared | 0) : 0;
          row.points = pointsTotalFor(row.cleared);
          row.spent = acc.rpg ? sumAlloc(acc.rpg.alloc) : 0;
          // v5.5：playSec = 帳號層級（所有模式累加）；playRpgSec = 舊的 RPG 通關用時
          row.playSec = (acc.playSec | 0) || (acc.rpg ? (acc.rpg.playSec | 0) : 0);
          row.playRpgSec = acc.rpg ? (acc.rpg.playSec | 0) : 0;
          row.stages = acc.stages || {};
          row.events = (acc.events || []).slice(-30).reverse().map(function (e) {
            return Object.assign({}, e, { str: stamp(e.t) });
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
            logEvent(target, 'ban', { by: me.id });
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
          logEvent(acc, 'save', {});
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
          const r = spendPoint(acc.rpg, attr, delta);
          if (!r.ok) return send(res, 409, Object.assign({ ok: false }, r)), true;
          store.touch();
          return send(res, 200, Object.assign({ ok: true, account: publicAccount(acc) }, r)), true;
        }

        if (p === '/api/rpg/alloc' && req.method === 'POST') {
          if (!gate(req, res, 'alloc', 3, 1)) return true;
          const body = await readJson(req, 2048);
          if (!body) return fail(res, 400, 'BAD_BODY'), true;
          const total = pointsTotalFor(acc.rpg.cleared);
          const v = validateAlloc(body.alloc, total);
          if (!v.ok) {
            stats.tamper++;
            return send(res, 409, { ok: false, err: 'BAD_ALLOC', detail: v }), true;
          }
          acc.rpg.alloc = v.alloc;
          acc.rpg.ver = (acc.rpg.ver || 1) + 1;
          store.touch();
          return send(res, 200, { ok: true, account: publicAccount(acc), left: total - v.spent, total: total }), true;
        }

        if (p === '/api/rpg/stage-clear' && req.method === 'POST') {
          if (!gate(req, res, 'clear', 3, 2)) return true;
          const body = await readJson(req, 2048);
          if (!body) return fail(res, 400, 'BAD_BODY'), true;
          // v4.3：開發者可以跳關（一般玩家照規矩，只能打下一關）
          const r = applyClear(acc.rpg, body.stage, { deaths: body.deaths, playSec: body.playSec },
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
          if (st) {
            acc.stages = acc.stages || {};
            acc.stages[st] = (acc.stages[st] | 0) + 1;
          }
          logEvent(acc, type, st ? { stage: st } : null);
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
  pointsTotalFor: pointsTotalFor, goldFor: goldFor, stageReward: stageReward,
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
  PW_MIN: PW_MIN
};
