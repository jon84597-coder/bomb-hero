/* ================================================================
   爆爆英雄 — 外觀收藏（v5.56）
   ---------------------------------------------------------------
   要解決的問題：
     「簽到／成就／賽季全部給金幣，但金幣買不到任何真正想要的東西。」
     貨幣沒有稀缺目標，就不構成期待 —— 玩家拿到 200 金幣沒有任何情緒。

   做法：一批「不能用金幣買」的外觀，只能靠行為解鎖。
     · 爆風顏色（打起來整片都是你的顏色，視覺最強）
     · 腳下光環（別人一眼看到你）
     · 炸彈外殼

   主檔只認三個欄位（讀 window.__BHSKIN.cache）：
     flame = [5 個 rgba(...,A) 色停] 或 null（null = 走原本的橙火）
     aura  = '#rrggbb' 或 ''
     bomb  = '#rrggbb' 或 ''

   依賴 __BH（Solo / Ach / Daily / Season / Shop / AudioSys），沒有就安靜停用。
   ================================================================ */
(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  var KEY = 'bombhero-skins-v1';
  var PANEL = 'skinPanel';

  function BH() { return window.__BH || null; }
  function api(n) { var b = BH(); return (b && b[n]) || null; }

  function ls(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      localStorage.setItem(k, v);
    } catch (e) { return null; }
    return v;
  }

  /* 字典走主檔；缺條目就退回繁中原文，玩家永遠不會看到 key */
  function T(k, p, dflt) {
    var s = '';
    try {
      var b = BH();
      if (b && typeof b.t === 'function') s = String(b.t(k, p) || '');
    } catch (e) { s = ''; }
    if (!s || s === k) {
      s = String(dflt == null ? '' : dflt);
      if (p) {
        for (var q in p) {
          if (Object.prototype.hasOwnProperty.call(p, q)) s = s.split('{' + q + '}').join(p[q]);
        }
      }
    }
    return s || k;
  }

  /* ---------------- 外觀定義 ----------------
     how.kind：
       stage  → 已通關關數達 v（bombhero-stage - 1）
       ach    → 成就分達 v
       daily  → 完成過 v 天的每日挑戰
       season → 賽季層級達 v
       br     → 大逃殺奪冠 v 次
       boss   → 打贏 BOSS 決戰場 v 次
     palette 是 5 段色停（第 5 段 alpha 0 = 外緣淡出），主檔直接餵給 drawFlameBlob。
     ------------------------------------------- */
  var SLOTS = [
    { k: 'flame', n: '爆風', d: '炸彈炸開的顏色' },
    { k: 'aura', n: '光環', d: '腳下那圈光' },
    { k: 'bomb', n: '炸彈', d: '手上的炸彈外殼' }
  ];

  var ITEMS = [
    /* --- 爆風 --- */
    { id: 'flame.orange', slot: 'flame', n: '經典烈焰', how: { kind: 'free' },
      pal: ['rgba(255,255,255,A)', 'rgba(255,246,214,A)', 'rgba(255,214,130,A)', 'rgba(255,150,50,A)', 'rgba(214,60,16,0)'] },
    { id: 'flame.blue', slot: 'flame', n: '深海蒼焰', how: { kind: 'stage', v: 5 },
      pal: ['rgba(255,255,255,A)', 'rgba(214,242,255,A)', 'rgba(120,198,255,A)', 'rgba(40,120,240,A)', 'rgba(12,40,140,0)'] },
    { id: 'flame.green', slot: 'flame', n: '翠毒孢子', how: { kind: 'stage', v: 12 },
      pal: ['rgba(255,255,255,A)', 'rgba(226,255,214,A)', 'rgba(150,240,120,A)', 'rgba(50,180,60,A)', 'rgba(12,80,30,0)'] },
    { id: 'flame.violet', slot: 'flame', n: '虛空紫電', how: { kind: 'ach', v: 60 },
      pal: ['rgba(255,255,255,A)', 'rgba(242,220,255,A)', 'rgba(200,140,255,A)', 'rgba(130,50,230,A)', 'rgba(60,12,110,0)'] },
    { id: 'flame.rose', slot: 'flame', n: '玫瑰金', how: { kind: 'daily', v: 7 },
      pal: ['rgba(255,255,255,A)', 'rgba(255,232,236,A)', 'rgba(255,178,190,A)', 'rgba(240,110,130,A)', 'rgba(150,40,60,0)'] },
    { id: 'flame.gold', slot: 'flame', n: '黃金聖火', how: { kind: 'season', v: 15 },
      pal: ['rgba(255,255,255,A)', 'rgba(255,250,224,A)', 'rgba(255,226,120,A)', 'rgba(240,180,30,A)', 'rgba(140,90,0,0)'] },
    { id: 'flame.void', slot: 'flame', n: '漆黑業火', how: { kind: 'boss', v: 5 },
      pal: ['rgba(240,240,255,A)', 'rgba(150,150,190,A)', 'rgba(86,86,130,A)', 'rgba(40,40,70,A)', 'rgba(8,8,16,0)'] },
    { id: 'flame.rainbow', slot: 'flame', n: '虹彩幻火', how: { kind: 'br', v: 3 },
      pal: ['rgba(255,255,255,A)', 'rgba(255,236,160,A)', 'rgba(120,255,220,A)', 'rgba(120,140,255,A)', 'rgba(90,20,160,0)'] },

    /* --- 光環 --- */
    { id: 'aura.none', slot: 'aura', n: '無', how: { kind: 'free' }, hex: '' },
    { id: 'aura.red', slot: 'aura', n: '赤紅', how: { kind: 'stage', v: 3 }, hex: '#ff5a5a' },
    { id: 'aura.cyan', slot: 'aura', n: '青霜', how: { kind: 'stage', v: 8 }, hex: '#5ce1ff' },
    { id: 'aura.rose', slot: 'aura', n: '桃粉', how: { kind: 'daily', v: 3 }, hex: '#ff8ec4' },
    { id: 'aura.lime', slot: 'aura', n: '翠光', how: { kind: 'ach', v: 30 }, hex: '#9dff6a' },
    { id: 'aura.gold', slot: 'aura', n: '流金', how: { kind: 'season', v: 8 }, hex: '#ffcc44' },

    /* --- 炸彈 --- */
    { id: 'bomb.dark', slot: 'bomb', n: '原色', how: { kind: 'free' }, hex: '' },
    { id: 'bomb.navy', slot: 'bomb', n: '深海藍', how: { kind: 'stage', v: 7 }, hex: '#33508c' },
    { id: 'bomb.emerald', slot: 'bomb', n: '翡翠綠', how: { kind: 'ach', v: 45 }, hex: '#2f8a5a' },
    { id: 'bomb.crimson', slot: 'bomb', n: '血櫻紅', how: { kind: 'boss', v: 2 }, hex: '#a02838' },
    { id: 'bomb.sun', slot: 'bomb', n: '烈日金', how: { kind: 'season', v: 20 }, hex: '#c9922a' }
  ];

  /* ---------------- 進度讀取 ---------------- */
  function clearedStages() {
    var n = parseInt(ls('bombhero-stage') || '1', 10);
    if (!isFinite(n) || n < 1) n = 1;
    return Math.max(0, n - 1);
  }
  function achPts() {
    try { var A = api('Ach'); return (A && A.points) ? (A.points() | 0) : 0; } catch (e) { return 0; }
  }
  function dailyDays() {
    try {
      var D = api('Daily');
      if (!D || !D.all) return 0;
      return Object.keys(D.all()).length;
    } catch (e) { return 0; }
  }
  function seasonTier() {
    try { var S = api('Season'); return (S && S.tiers) ? (S.tiers() | 0) : 0; } catch (e) { return 0; }
  }
  function statNum(k) {
    try {
      var A = api('Ach');
      if (!A || !A.stat) return 0;
      var v = A.stat(k);
      if (typeof v === 'number') return v | 0;
      if (v && typeof v === 'object') return (v.all | 0) || 0;
    } catch (e) {}
    return 0;
  }
  function progress(how) {
    switch (how.kind) {
      case 'free': return { cur: 1, need: 1, ok: true };
      case 'stage': { var c = clearedStages(); return { cur: c, need: how.v, ok: c >= how.v }; }
      case 'ach': { var a = achPts(); return { cur: a, need: how.v, ok: a >= how.v }; }
      case 'daily': { var d = dailyDays(); return { cur: d, need: how.v, ok: d >= how.v }; }
      case 'season': { var s = seasonTier(); return { cur: s, need: how.v, ok: s >= how.v }; }
      case 'br': { var b = statNum('brWin'); return { cur: b, need: how.v, ok: b >= how.v }; }
      case 'boss': { var o = statNum('soloBoss'); return { cur: o, need: how.v, ok: o >= how.v }; }
      default: return { cur: 0, need: 1, ok: false };
    }
  }
  function howText(how) {
    switch (how.kind) {
      case 'free': return T('sk.free', null, '一開始就有');
      case 'stage': return T('sk.how.stage', { n: how.v }, '通關第 {n} 關');
      case 'ach': return T('sk.how.ach', { n: how.v }, '成就分達 {n}');
      case 'daily': return T('sk.how.daily', { n: how.v }, '完成 {n} 天每日挑戰');
      case 'season': return T('sk.how.season', { n: how.v }, '賽季達到 {n} 級');
      case 'br': return T('sk.how.br', { n: how.v }, '大逃殺奪冠 {n} 次');
      case 'boss': return T('sk.how.boss', { n: how.v }, '戰勝 BOSS {n} 次');
      default: return '';
    }
  }
  function byId(id) {
    for (var i = 0; i < ITEMS.length; i++) if (ITEMS[i].id === id) return ITEMS[i];
    return null;
  }
  function defaultOf(slot) {
    for (var i = 0; i < ITEMS.length; i++) if (ITEMS[i].slot === slot && ITEMS[i].how.kind === 'free') return ITEMS[i].id;
    return '';
  }

  /* ---------------- 存檔 ----------------
     v5.60：多了「自訂顏色」—— 玩家自己挑的色碼。eq 存 'custom' 當作一項虛擬外觀，
     真的顏色在 custom[slot]，所以不用把色碼塞進 ITEMS（清單仍然是固定的收藏品）。 */
  var ST = { own: {}, eq: {}, custom: { flame: '', aura: '', bomb: '' } };

  function _hexOk(h) { return /^#[0-9a-f]{6}$/.test(String(h || '').toLowerCase()); }

  function load() {
    var o = null;
    try { o = JSON.parse(ls(KEY) || 'null'); } catch (e) { o = null; }
    ST = { own: {}, eq: {}, custom: { flame: '', aura: '', bomb: '' } };
    if (o && typeof o === 'object') {
      if (o.own && typeof o.own === 'object') {
        for (var k in o.own) if (Object.prototype.hasOwnProperty.call(o.own, k) && byId(k)) ST.own[k] = 1;
      }
      if (o.eq && typeof o.eq === 'object') {
        for (var s in o.eq) {
          if (!Object.prototype.hasOwnProperty.call(o.eq, s)) continue;
          if (String(o.eq[s]) === 'custom') { if (o.custom && _hexOk(o.custom[s])) ST.eq[s] = 'custom'; continue; }
          var it = byId(String(o.eq[s]));
          if (it && it.slot === s) ST.eq[s] = it.id;
        }
      }
      if (o.custom && typeof o.custom === 'object') {
        for (var c in ST.custom) {
          if (Object.prototype.hasOwnProperty.call(o.custom, c) && _hexOk(o.custom[c])) {
            ST.custom[c] = String(o.custom[c]).toLowerCase();
          }
        }
      }
    }
    /* free 的一律視為已擁有，且沒選過就給預設值 */
    for (var i = 0; i < ITEMS.length; i++) {
      if (ITEMS[i].how.kind === 'free') ST.own[ITEMS[i].id] = 1;
    }
    for (var j = 0; j < SLOTS.length; j++) {
      var sk = SLOTS[j].k;
      /* 'custom' 不是 ITEMS 裡的項目，不能拿 own 去擋；但色碼不見了就退回預設 */
      var eq = ST.eq[sk];
      if (eq === 'custom') { if (!ST.custom[sk]) ST.eq[sk] = defaultOf(sk); }
      else if (!eq || !ST.own[eq]) ST.eq[sk] = defaultOf(sk);
    }
  }
  function save() {
    try { ls(KEY, JSON.stringify({ own: ST.own, eq: ST.eq, custom: ST.custom })); } catch (e) {}
  }

  /* 條件達成的就自動記為「已解鎖」（不自動裝備，讓玩家自己選） */
  function syncOwn() {
    var changed = false;
    for (var i = 0; i < ITEMS.length; i++) {
      var it = ITEMS[i];
      if (ST.own[it.id]) continue;
      if (progress(it.how).ok) { ST.own[it.id] = 1; changed = true; }
    }
    if (changed) save();
    return changed;
  }

  /* ---------------- 主檔要讀的快取 ----------------
     熱路徑（每格火焰每幀）直接讀這個物件，不做任何函式呼叫／localStorage 存取。 */
  var CACHE = { flame: null, aura: '', bomb: '', bombStops: null };

  /* 炸彈原色（上亮下暗的黑曜質感）→ 染成玩家選的顏色。在這裡算好，
     主檔每幀只讀 4 個字串，不做混色。 */
  var BOMB_BASE = ['#5b6172', '#34384a', '#15171f', '#050609'];
  function _rgb(h) {
    var s = String(h || '').replace('#', '');
    if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
    return [parseInt(s.slice(0, 2), 16) || 0, parseInt(s.slice(2, 4), 16) || 0, parseInt(s.slice(4, 6), 16) || 0];
  }
  function _hex(r, g, b) {
    var p = function (n) { n = Math.max(0, Math.min(255, Math.round(n))); return (n < 16 ? '0' : '') + n.toString(16); };
    return '#' + p(r) + p(g) + p(b);
  }
  function mix(a, b, t) {
    var A = _rgb(a), B = _rgb(b);
    return _hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
  }
  function csv(h) { var c = _rgb(h); return c[0] + ',' + c[1] + ',' + c[2]; }

  /* 自己挑的顏色 → 5 段爆風色停（跟內建 pal 同一個格式：白熱核心 → 主色 → 暗邊透明）。
     主檔的 drawFlame 只認「長度 5、含 A 佔位符」的字串，所以在這裡算好，熱路徑零成本。 */
  function flamePal(hex) {
    return [
      'rgba(255,255,255,A)',
      'rgba(' + csv(mix(hex, '#ffffff', .74)) + ',A)',
      'rgba(' + csv(mix(hex, '#ffffff', .38)) + ',A)',
      'rgba(' + csv(hex) + ',A)',
      'rgba(' + csv(mix(hex, '#000000', .46)) + ',0)'
    ];
  }

  function rebuild() {
    var f = byId(ST.eq.flame) || null;
    if (ST.eq.flame === 'custom' && ST.custom.flame) CACHE.flame = flamePal(ST.custom.flame);
    else CACHE.flame = (f && f.pal) ? f.pal : null;
    if (ST.eq.aura === 'custom' && ST.custom.aura) CACHE.aura = ST.custom.aura;
    else { var a = byId(ST.eq.aura) || null; CACHE.aura = (a && a.hex) ? a.hex : ''; }
    if (ST.eq.bomb === 'custom' && ST.custom.bomb) CACHE.bomb = ST.custom.bomb;
    else { var b = byId(ST.eq.bomb) || null; CACHE.bomb = (b && b.hex) ? b.hex : ''; }
    CACHE.bombStops = CACHE.bomb
      ? [mix(BOMB_BASE[0], CACHE.bomb, .55), mix(BOMB_BASE[1], CACHE.bomb, .58),
         mix(BOMB_BASE[2], CACHE.bomb, .55), mix(BOMB_BASE[3], CACHE.bomb, .40)]
      : null;
    try {
      window.__BHSKIN = window.__BHSKIN || {};
      window.__BHSKIN.cache = CACHE;
      window.__BHSKIN.mod = Skins;
    } catch (e) {}
  }

  /* ---------------- 面板 ---------------- */
  var curSlot = 'flame';

  function swatch(it) {
    if (it.pal) {
      /* 爆風預覽：三層同心圓做出「外圈色 → 白心」的感覺 */
      var a = it.pal[3].replace('A', '.95'), b = it.pal[2].replace('A', '.95'), c = it.pal[1].replace('A', '1');
      return '<i class="sw flame" style="--c1:' + b + ';--c2:' + a + ';--c3:' + c + '"></i>';
    }
    if (it.hex) return '<i class="sw dot" style="--c1:' + it.hex + '"></i>';
    return '<i class="sw none"></i>';
  }

  /* ---------------- 自訂顏色（v5.60） ----------------
     預設外觀只有 6~8 個選項，玩家想要「自己的顏色」時沒地方去。
     這裡給一組色票（色相 × 明度）＋ 系統取色盤，選了就立刻換上。
     色票是算出來的，不是寫死 42 個色碼 —— 想調密度只改兩個陣列。 */
  function hsl2hex(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360; s /= 100; l /= 100;
    if (s === 0) return _hex(l * 255, l * 255, l * 255);
    var q = l < .5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    var hue = function (t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    return _hex(hue(h + 1 / 3) * 255, hue(h) * 255, hue(h - 1 / 3) * 255);
  }

  var HUES = [0, 22, 45, 70, 95, 125, 150, 170, 190, 210, 235, 260, 285, 310, 335];
  var LIGHTS = [72, 56, 42];
  var GREYS = ['#ffffff', '#d9d9d9', '#a6a6a6', '#737373', '#404040', '#111111'];

  function swatches() {
    var out = [], i, j;
    for (j = 0; j < LIGHTS.length; j++) {
      for (i = 0; i < HUES.length; i++) out.push(hsl2hex(HUES[i], j === 2 ? 92 : 82, LIGHTS[j]));
    }
    return out.concat(GREYS);
  }

  /* 目前這個槽的狀態：用自訂色 / 用預設外觀 */
  function customNow(slot) {
    return (ST.eq[slot] === 'custom' && ST.custom[slot]) ? ST.custom[slot] : '';
  }

  function customBlock() {
    var slot = curSlot;
    var now = customNow(slot);
    var list = swatches(), i;
    var h = '<div class="skcus">' +
      '<div class="skcush"><b>' + T('sk.custTitle', null, '🎨 自訂顏色') + '</b>' +
      '<small>' + T('sk.custSub', null, '不想用預設？自己挑一個，馬上換上。') + '</small></div>' +
      '<div class="skcusw">';
    for (i = 0; i < list.length; i++) {
      h += '<button type="button" class="skcud' + (now === list[i] ? ' on' : '') +
        '" data-cust="' + list[i] + '" title="' + list[i] + '" style="--c:' + list[i] + '"></button>';
    }
    h += '</div><div class="skcurow">' +
      '<label class="skculab"><input type="color" class="skcuin" value="' + (now || '#ff8844') + '">' +
      '<span>' + T('sk.custPick', null, '自由選色') + '</span></label>' +
      '<button type="button" class="skcubtn" data-custuse="1">' + T('sk.custUse', null, '套用') + '</button>' +
      (now ? '<button type="button" class="skcubtn ghost" data-custclear="1">' +
        T('sk.custClear', null, '取消') + '</button>' : '') +
      '</div>';
    h += '<div class="skcufoot">' + (now
      ? '<i class="skcudot" style="--c:' + now + '"></i>' +
        T('sk.custOn', null, '使用中') + ' · <code>' + now + '</code>'
      : '<span class="skcuhint">' + T('sk.custNone', null, '目前用預設外觀') + '</span>') + '</div></div>';
    return h;
  }

  function applyCustom(slot, hex) {
    hex = String(hex || '').toLowerCase();
    if (!_hexOk(hex)) return;
    ST.custom[slot] = hex;
    ST.eq[slot] = 'custom';
    save(); rebuild(); render();
    try { var A = api('AudioSys'); if (A && A.sfx) A.sfx('coin'); } catch (e) {}
  }

  function clearCustom(slot) {
    ST.eq[slot] = defaultOf(slot);
    save(); rebuild(); render();
    try { var A = api('AudioSys'); if (A && A.sfx) A.sfx('click'); } catch (e) {}
  }

  function render() {
    var root = document.getElementById(PANEL);
    if (!root) return;
    var box = root.querySelector('.skbody');
    if (!box) return;

    var tabs = '';
    for (var s = 0; s < SLOTS.length; s++) {
      var sk = SLOTS[s].k;
      tabs += '<button class="sktab' + (sk === curSlot ? ' on' : '') + '" data-slot="' + sk + '">' +
        '<b>' + T('sk.slot.' + sk, null, SLOTS[s].n) + '</b>' +
        '<small>' + T('sk.slotd.' + sk, null, SLOTS[s].d) + '</small></button>';
    }
    var head = root.querySelector('.sktabs');
    if (head) head.innerHTML = tabs;

    var list = [], i;
    for (i = 0; i < ITEMS.length; i++) if (ITEMS[i].slot === curSlot) list.push(ITEMS[i]);

    var h = '';
    for (i = 0; i < list.length; i++) {
      var it = list[i];
      var pr = progress(it.how);
      var own = !!ST.own[it.id];
      var on = ST.eq[curSlot] === it.id;
      var lock = !own;
      h += '<button class="skitem' + (on ? ' on' : '') + (lock ? ' lock' : '') + '" data-id="' + it.id + '">' +
        swatch(it) +
        '<b>' + T('sk.n.' + it.id, null, it.n) + '</b>' +
        '<small>' + (lock ? ('🔒 ' + howText(it.how)) : (on ? T('sk.on', null, '使用中') : T('sk.tapUse', null, '點一下換上'))) + '</small>' +
        (lock && pr.need > 1 ? '<em>' + Math.min(pr.cur, pr.need) + '/' + pr.need + '</em>' : '') +
        '</button>';
    }
    box.innerHTML = '<div class="skgrid">' + h + '</div>' + customBlock();

    var cnt = root.querySelector('.skcnt');
    if (cnt) {
      var got = 0, tot = 0;
      for (i = 0; i < ITEMS.length; i++) { tot++; if (ST.own[ITEMS[i].id]) got++; }
      cnt.textContent = T('sk.count', { a: got, b: tot }, '已收集 {a} / {b}');
    }

    /* 系統取色盤：只在「放開」時套用，不然拖動過程中會被 render 重建而中斷 */
    var inp = box.querySelector('.skcuin');
    if (inp) inp.onchange = function () { applyCustom(curSlot, inp.value); };

    box.onclick = function (e) {
      var el = e.target;
      /* 自訂配色區先處理：色票 / 套用 / 取消（都不該落到外觀清單那條路） */
      var c2 = el;
      while (c2 && c2 !== box && !(c2.getAttribute &&
             (c2.getAttribute('data-cust') || c2.getAttribute('data-custuse') != null ||
              c2.getAttribute('data-custclear') != null))) c2 = c2.parentNode;
      if (c2 && c2 !== box && c2.getAttribute) {
        var chex = c2.getAttribute('data-cust');
        if (chex) { applyCustom(curSlot, chex); return; }
        if (c2.getAttribute('data-custuse') != null) {
          var ip = box.querySelector('.skcuin');
          applyCustom(curSlot, ip ? ip.value : (ST.custom[curSlot] || ''));
          return;
        }
        if (c2.getAttribute('data-custclear') != null) { clearCustom(curSlot); return; }
      }
      var el2 = el;
      while (el2 && el2 !== box && !el2.getAttribute('data-id')) el2 = el2.parentNode;
      if (!el2 || el2 === box) return;
      var id = el2.getAttribute('data-id');
      pick(id);
    };
    var tabsEl = root.querySelector('.sktabs');
    if (tabsEl) tabsEl.onclick = function (e) {
      var el = e.target;
      while (el && el !== tabsEl && !el.getAttribute('data-slot')) el = el.parentNode;
      if (!el || el === tabsEl) return;
      curSlot = el.getAttribute('data-slot');
      render();
      try { api('AudioSys').sfx('click'); } catch (x) {}
    };
  }

  function pick(id) {
    var it = byId(id);
    if (!it) return;
    try { api('AudioSys').sfx('click'); } catch (e) {}
    if (!ST.own[id]) {
      var pr = progress(it.how);
      try {
        var b = BH();
        if (b && b.toast) b.toast('🔒 ' + howText(it.how) + (pr.need > 1 ? '（' + Math.min(pr.cur, pr.need) + '/' + pr.need + '）' : ''), 2.6);
      } catch (e2) {}
      return;
    }
    ST.eq[it.slot] = id;
    save();
    rebuild();
    render();
    try { api('AudioSys').sfx('coin'); } catch (e3) {}
  }

  function open(on) {
    var root = document.getElementById(PANEL);
    if (!root) return;
    if (on) {
      load();
      if (syncOwn()) {}
      rebuild();
      curSlot = curSlot || 'flame';
      render();
      root.classList.add('on');
      var h = root.querySelector('.skttl');
      if (h) h.textContent = T('sk.title', null, '外觀收藏');
      var c = root.querySelector('.skclose');
      if (c) c.textContent = T('sk.close', null, '關閉');
      var tip = root.querySelector('.sktip');
      if (tip) tip.textContent = T('sk.tip', null, '這些外觀不能用金幣買 —— 只能靠玩遊戲拿到。');
      var mo = root.querySelector('.skmine');
      if (mo) mo.textContent = T('sk.mineOnly', null, '只套用在你自己放的炸彈與爆風 —— AI 與怪物一律維持原本顏色。');
    } else root.classList.remove('on');
  }

  function style() {
    if (document.getElementById('skStyle')) return;
    var css = ''
      + '#skinPanel{position:fixed;inset:0;z-index:1330;display:none;align-items:center;justify-content:center;'
      + 'background:rgba(6,10,22,.62);padding:14px}'
      + '#skinPanel.on{display:flex}'
      + '#skinPanel .skbox{width:min(560px,100%);max-height:88vh;overflow:auto;border-radius:18px;'
      + 'background:linear-gradient(180deg,#fdfbf4,#f3ede0);border:1px solid rgba(120,96,60,.28);'
      + 'box-shadow:0 18px 48px rgba(10,14,26,.42);padding:16px 16px 14px}'
      + '#skinPanel .skhd{display:flex;align-items:center;gap:10px;margin-bottom:4px}'
      + '#skinPanel .skttl{font:700 17px/1.3 inherit;color:#3a2c18;flex:1}'
      + '#skinPanel .skcnt{font:600 12px/1 inherit;color:#8a7a5c}'
      + '#skinPanel .sktip{font-size:12px;color:#8a7a5c;margin:0 0 10px;line-height:1.5}'
      /* v5.69：外觀只影響自己 —— 講清楚，免得玩家以為 AI 的彈也會變色 */
      + '#skinPanel .skmine{font-size:11px;color:#9b8c70;margin:-4px 0 10px;line-height:1.5}'
      + '#skinPanel .sktabs{display:flex;gap:8px;margin-bottom:12px}'
      + '#skinPanel .sktab{flex:1;border:1px solid rgba(120,96,60,.24);background:#fff;border-radius:12px;'
      + 'padding:8px 6px;cursor:pointer;display:flex;flex-direction:column;gap:2px;align-items:center}'
      + '#skinPanel .sktab b{font-size:13px;color:#3a2c18}'
      + '#skinPanel .sktab small{font-size:10px;color:#9b8c70}'
      + '#skinPanel .sktab.on{background:#3a2c18;border-color:#3a2c18}'
      + '#skinPanel .sktab.on b{color:#ffe9b8}'
      + '#skinPanel .sktab.on small{color:#c8b48c}'
      + '#skinPanel .skgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:9px}'
      + '#skinPanel .skitem{position:relative;border:1px solid rgba(120,96,60,.2);background:#fff;'
      + 'border-radius:13px;padding:10px 8px 8px;cursor:pointer;display:flex;flex-direction:column;'
      + 'align-items:center;gap:5px;min-height:104px}'
      + '#skinPanel .skitem b{font-size:12px;color:#3a2c18;text-align:center;line-height:1.25}'
      + '#skinPanel .skitem small{font-size:10px;color:#9b8c70;text-align:center;line-height:1.3}'
      + '#skinPanel .skitem.on{border-color:#c9922a;background:#fffaf0;box-shadow:0 0 0 2px rgba(201,146,42,.22)}'
      + '#skinPanel .skitem.lock{opacity:.62;background:#f7f4ee}'
      /* 鎖在左上、進度在右上 —— 兩個放同一角會互相蓋住（實測鎖圖示整顆消失） */
      + '#skinPanel .skitem.lock::before{content:"🔒";position:absolute;top:5px;left:7px;'
      + 'font-size:11px;line-height:1;opacity:.8;pointer-events:none}'
      + '#skinPanel .skitem em{position:absolute;top:6px;right:7px;font:600 10px/1 inherit;'
      + 'color:#8a7a5c;font-style:normal}'
      + '#skinPanel .sw{width:34px;height:34px;border-radius:50%;display:block;flex:none}'
      + '#skinPanel .sw.flame{background:radial-gradient(circle at 50% 50%,var(--c3) 0%,var(--c1) 46%,var(--c2) 78%,transparent 100%);'
      + 'box-shadow:0 0 10px var(--c2)}'
      + '#skinPanel .sw.dot{background:radial-gradient(circle at 38% 34%,#fff 0%,var(--c1) 42%,var(--c1) 100%);'
      + 'box-shadow:0 0 10px var(--c1)}'
      + '#skinPanel .sw.none{background:#e8e3d8;box-shadow:inset 0 0 0 2px #d6cfc0}'
      /* v5.60：自訂顏色區（色票＋系統取色盤） */
      + '#skinPanel .skcus{margin-top:14px;padding-top:12px;border-top:1px dashed rgba(120,96,60,.28)}'
      + '#skinPanel .skcush{display:flex;flex-direction:column;gap:2px;margin-bottom:8px}'
      + '#skinPanel .skcush b{font-size:13px;color:#3a2c18}'
      + '#skinPanel .skcush small{font-size:11px;color:#9b8c70}'
      + '#skinPanel .skcusw{display:grid;grid-template-columns:repeat(auto-fill,minmax(26px,1fr));gap:6px}'
      + '#skinPanel .skcud{height:26px;border-radius:8px;border:1px solid rgba(60,44,24,.20);'
      + 'background:var(--c);cursor:pointer;padding:0;box-shadow:inset 0 -7px 10px rgba(0,0,0,.14)}'
      + '#skinPanel .skcud.on{box-shadow:0 0 0 2px #fff,0 0 0 4px #c9922a}'
      + '#skinPanel .skcurow{display:flex;gap:8px;align-items:center;margin-top:10px;flex-wrap:wrap}'
      + '#skinPanel .skculab{display:flex;align-items:center;gap:7px;border:1px solid rgba(120,96,60,.24);'
      + 'border-radius:11px;padding:6px 10px;background:#fff;cursor:pointer;font:600 12px/1 inherit;color:#3a2c18}'
      + '#skinPanel .skcuin{width:30px;height:24px;border:none;background:none;padding:0;cursor:pointer}'
      + '#skinPanel .skcubtn{border:1px solid rgba(120,96,60,.26);border-radius:11px;padding:9px 15px;'
      + 'font:700 12px/1 inherit;background:#fff;color:#3a2c18;cursor:pointer}'
      + '#skinPanel .skcubtn.ghost{background:#f3ede0;color:#8a7a5c}'
      + '#skinPanel .skcufoot{margin-top:9px;font-size:11px;color:#8a7a5c;display:flex;align-items:center;gap:6px;flex-wrap:wrap}'
      + '#skinPanel .skcudot{width:14px;height:14px;border-radius:50%;background:var(--c);'
      + 'box-shadow:inset 0 0 0 2px #fff,0 0 0 1px rgba(0,0,0,.18)}'
      + '#skinPanel .skcufoot code{font:600 11px/1 ui-monospace,monospace;color:#3a2c18}'
      + '#skinPanel .skfoot{display:flex;justify-content:center;margin-top:14px}'
      + '#skinPanel .skclose{border:none;border-radius:12px;padding:11px 30px;font:700 14px/1 inherit;'
      + 'background:linear-gradient(180deg,#5c4526,#3a2c18);color:#ffe9b8;cursor:pointer}'
      + '@media (max-width:420px){#skinPanel .skgrid{grid-template-columns:repeat(auto-fill,minmax(92px,1fr))}}';
    var el = document.createElement('style');
    el.id = 'skStyle';
    el.textContent = css;
    document.head.appendChild(el);
  }

  function mount() {
    if (document.getElementById(PANEL)) return;
    style();
    var d = document.createElement('div');
    d.id = PANEL;
    d.setAttribute('role', 'dialog');
    d.setAttribute('aria-modal', 'true');
    d.innerHTML = '<div class="skbox">' +
      '<div class="skhd"><span class="skttl">外觀收藏</span><span class="skcnt"></span></div>' +
      '<p class="sktip"></p>' +
      '<p class="skmine"></p>' +
      '<div class="sktabs"></div>' +
      '<div class="skbody"></div>' +
      '<div class="skfoot"><button class="skclose">關閉</button></div>' +
      '</div>';
    document.body.appendChild(d);
    d.addEventListener('click', function (e) { if (e.target === d) open(false); });
    var c = d.querySelector('.skclose');
    if (c) c.addEventListener('click', function () { open(false); });
  }

  /* ---------------- 對外 ---------------- */
  var Skins = {
    ITEMS: ITEMS, SLOTS: SLOTS,
    open: open,
    state: function () { return { own: ST.own, eq: ST.eq, custom: ST.custom }; },
    of: byId, progress: progress, howText: howText,
    color: function (slot) { return CACHE[slot] || (slot === 'flame' ? null : ''); },
    /* v5.60：自訂顏色（面板用，也給測試直接驗） */
    swatches: swatches, applyCustom: applyCustom, clearCustom: clearCustom,
    flamePal: flamePal, customNow: customNow,
    refresh: function () { load(); syncOwn(); rebuild(); }
  };

  /* ---------------- 啟動 ---------------- */
  function boot() {
    try {
      mount();
      load();
      var changed = syncOwn();
      rebuild();
      /* 首頁「更多」抽屜的入口（按鈕在 index.html，事件在這裡綁，主檔不用動） */
      var eb = document.getElementById('btnSkins');
      if (eb) {
        eb.addEventListener('click', function () {
          var dr = document.getElementById('mDrawer');
          if (dr) dr.classList.remove('on');
          var mb = document.getElementById('btnMoreMenu');
          if (mb) { mb.setAttribute('aria-expanded', 'false'); mb.classList.remove('drawon'); }
          try { var A = api('AudioSys'); if (A && A.ensure) A.ensure(); if (A && A.sfx) A.sfx('click'); } catch (x) {}
          open(true);
        });
      }
      /* 新解鎖的東西 → 首頁紅點亮一下（下次進面板就看得到） */
      if (changed) { try { var h = api('HomeDot'); if (h && h.refresh) h.refresh(); } catch (e) {} }
      /* 語言切換後面板若開著，重畫 */
      document.addEventListener('bh:lang', function () {
        if (document.getElementById(PANEL) && document.getElementById(PANEL).classList.contains('on')) render();
      });
      /* 每次回首頁都可能剛通關 → 重新同步一次解鎖狀態 */
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') { load(); if (syncOwn()) rebuild(); else rebuild(); }
      });
    } catch (e) {
      try { console.error('[skins] 初始化失敗（外觀停用，其他功能照常）:', e); } catch (e2) {}
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.__BHSkins = Skins;
  try { if (typeof module !== 'undefined' && module.exports) module.exports = Skins; } catch (e) {}
})();
