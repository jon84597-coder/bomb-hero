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

const ATTRS = ['hp', 'def', 'spd', 'atk'];
const BASE_POINTS = 9;          // 創角配點
const CAP = 10;                 // 單項上限
const MAX_POINTS = ATTRS.length * CAP;   // 40（全部點滿）
const MAX_STAGE = 32;
const SESSION_TTL = 30 * 24 * 3600 * 1000;
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

/* 過關：必須是按順序解鎖（只能打「下一關」，或重打已過關的舊關卡） */
function applyClear(rpg, stage, meta) {
  const s = Math.floor(Number(stage));
  if (!isFinite(s) || s < 1 || s > MAX_STAGE) return { ok: false, err: 'BAD_STAGE' };
  if (s > rpg.cleared + 1) return { ok: false, err: 'STAGE_LOCKED', need: rpg.cleared + 1, got: s };
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

function createStore(dir, persist) {
  const file = path.join(dir, 'accounts.json');
  const db = { v: 1, accounts: {}, devices: {}, tamper: 0, created: Date.now() };
  let timer = null;
  let dirty = false;

  if (persist) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, 'utf8');
        const obj = JSON.parse(raw);
        if (obj && obj.accounts) {
          db.accounts = obj.accounts;
          db.devices = obj.devices || {};
          db.tamper = obj.tamper || 0;
          db.created = obj.created || db.created;
        }
      }
    } catch (e) {
      // 壞檔 → 備份起來再看，不要讓伺服器起不來
      try { fs.renameSync(file, file + '.bad-' + Date.now()); } catch (e2) {}
      console.error('[cloud] 存檔讀取失敗，改用空資料庫：', e.message);
    }
  }

  function flush() {
    if (!persist || !dirty) return;
    dirty = false;
    try {
      const tmp = file + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(db));
      fs.renameSync(tmp, file);
    } catch (e) {
      console.error('[cloud] 寫入失敗：', e.message);
    }
  }
  function touch() {
    dirty = true;
    if (!persist) return;
    if (timer) return;
    timer = setTimeout(function () { timer = null; flush(); }, 400);
    if (timer.unref) timer.unref();
  }
  return { db: db, touch: touch, flush: flush, file: file };
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
  const store = createStore(dir, persist);
  const db = store.db;

  let secret = opt.secret || env.BH_AUTH_SECRET || '';
  if (!secret) {
    // 沒設環境變數 → 自己生一組並存檔（重啟後 session 仍然有效）
    const sf = path.join(dir, 'secret.key');
    try {
      if (persist && fs.existsSync(sf)) secret = fs.readFileSync(sf, 'utf8').trim();
    } catch (e) {}
    if (!secret) {
      secret = rid(32);
      try {
        if (persist) { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(sf, secret); }
      } catch (e) {}
    }
  }
  if (opt.fetch) fetchImpl = opt.fetch;

  const states = new Map();     // OAuth state → { provider, bind, redirect, exp }
  const limiter = makeLimiter();
  const stats = { logins: 0, bindings: 0, tamper: 0, rateLimited: 0, syncs: 0 };
  db.tamper = db.tamper || 0;

  /* ---------- 帳號 ---------- */
  function findById(id) { return db.accounts[id] || null; }

  function createAccount(kind, info) {
    const id = (kind === 'guest' ? 'g_' : 'u_') + rid(8);
    const acc = {
      id: id,
      kind: kind,
      provider: info.provider || '',
      sub: info.sub || '',
      name: info.name || (kind === 'guest' ? '遊客' : '玩家'),
      email: info.email || '',
      avatar: info.avatar || '',
      created: Date.now(),
      lastSeen: Date.now(),
      mergedInto: null,
      rpg: defaultRpg(),
      layout: null                     // v4.2：手機觸控版面（null = 還沒設定過）
    };
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
        email: profile.email, avatar: profile.avatar
      });
      acc.key = key;
    } else {
      acc.name = profile.name || acc.name;
      acc.email = profile.email || acc.email;
      acc.avatar = profile.avatar || acc.avatar;
      acc.lastSeen = Date.now();
    }
    acc.provider = provider;
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
    acc.lastSeen = Date.now();
    return acc;
  }
  function bearer(req) {
    const h = String(req.headers.authorization || '');
    return h.indexOf('Bearer ') === 0 ? h.slice(7).trim() : '';
  }

  function publicAccount(acc) {
    const points = pointsTotalFor(acc.rpg.cleared);
    return {
      id: acc.id,
      kind: acc.kind,
      name: acc.name,
      email: acc.email,
      avatar: acc.avatar,
      provider: acc.provider || '',
      created: acc.created,
      rpg: acc.rpg,
      points: points,
      left: points - sumAlloc(acc.rpg.alloc),
      unlocked: Math.min(MAX_STAGE, acc.rpg.cleared + 1),
      layout: acc.layout || null,
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
  function gate(req, res, name, cap, perSec) {
    const acct = session(req);
    const key = name + ':' + (acct ? acct.id : 'ip:' + ip(req));
    const r = limiter.take(key, cap, perSec);
    if (!r.ok) {
      stats.rateLimited++;
      send(res, 429, { ok: false, err: 'RATE_LIMIT', retry: r.retry }, { 'Retry-After': String(r.retry) });
      return false;
    }
    return true;
  }

  function providerInfo(p) {
    const def = PROVIDERS[p];
    const id = env[def.idEnv] || '';
    const sec = env[def.secretEnv] || '';
    return { on: !!(id && sec), label: def.label, color: def.color, id: id };
  }

  async function handle(req, res, url) {
    const p = url.pathname;
    if (p.indexOf('/api/') !== 0) return false;
    const isAuth = p.indexOf('/api/auth/') === 0;
    const isRpg = p.indexOf('/api/rpg/') === 0;
    if (!isAuth && !isRpg) return false;

    /* ---- 共用：全域 IP 限流（每分鐘 300 次，避免被腳本掃） ---- */
    if (!limiter.take('ip:' + ip(req), 300, 5).ok) {
      stats.rateLimited++;
      return send(res, 429, { ok: false, err: 'RATE_LIMIT', retry: 1 }), true;
    }

    try {
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
          return send(res, 200, { ok: true, account: publicAccount(cur) }), true;
        }
        db.devices[hash] = acc.id;
        acc.lastSeen = Date.now();
        store.touch();
        cookieSet(res, req, makeToken(secret, acc.id));
        return send(res, 200, { ok: true, account: publicAccount(acc) }), true;
      }

      /* ---------------- 我是誰 ---------------- */
      if (p === '/api/auth/me' && req.method === 'GET') {
        const acc = session(req);
        if (!acc) return send(res, 200, { ok: true, guest: true, account: null }), true;
        return send(res, 200, { ok: true, guest: acc.kind === 'guest', account: publicAccount(acc) }), true;
      }

      /* ---------------- 登出 ---------------- */
      if (p === '/api/auth/logout' && req.method === 'POST') {
        cookieClear(res);
        return send(res, 200, { ok: true }), true;
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

      /* ---------------- 需要登入的 RPG API ---------------- */
      if (isRpg) {
        const acc = session(req);
        if (!acc) return fail(res, 401, 'NO_SESSION'), true;

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
          const r = applyClear(acc.rpg, body.stage, { deaths: body.deaths, playSec: body.playSec });
          if (!r.ok) {
            if (r.err === 'STAGE_LOCKED') stats.tamper++;
            return send(res, 409, Object.assign({ ok: false }, r)), true;
          }
          store.touch();
          return send(res, 200, Object.assign({ ok: true, account: publicAccount(acc) }, r)), true;
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
    let guests = 0, members = 0;
    for (const id in db.accounts) {
      const a = db.accounts[id];
      if (a.mergedInto) continue;
      if (a.kind === 'member') members++; else guests++;
    }
    return {
      accounts: guests + members,
      guests: guests,
      members: members,
      tamper: stats.tamper,
      rateLimited: stats.rateLimited,
      logins: stats.logins,
      bindings: stats.bindings,
      syncs: stats.syncs,
      persisted: !!persist,
      dir: dir
    };
  }

  return {
    handle: handle,
    stats: statsOut,
    flush: store.flush,
    secret: secret,
    db: db,
    _internals: {
      session: session, publicAccount: publicAccount, findById: findById,
      createAccount: createAccount, mergeProgress: mergeProgress, store: store,
      bindGuest: bindGuest, upsertMember: upsertMember, db: db,
      sanitizeLayout: sanitizeLayout
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
  makeLimiter: makeLimiter, sumAlloc: sumAlloc
};
