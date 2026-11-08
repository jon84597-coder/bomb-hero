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

  /* ---------------- 存檔 ---------------- */
  var ST = { own: {}, eq: {} };

  function load() {
    var o = null;
    try { o = JSON.parse(ls(KEY) || 'null'); } catch (e) { o = null; }
    ST = { own: {}, eq: {} };
    if (o && typeof o === 'object') {
      if (o.own && typeof o.own === 'object') {
        for (var k in o.own) if (Object.prototype.hasOwnProperty.call(o.own, k) && byId(k)) ST.own[k] = 1;
      }
      if (o.eq && typeof o.eq === 'object') {
        for (var s in o.eq) {
          if (!Object.prototype.hasOwnProperty.call(o.eq, s)) continue;
          var it = byId(String(o.eq[s]));
          if (it && it.slot === s) ST.eq[s] = it.id;
        }
      }
    }
    /* free 的一律視為已擁有，且沒選過就給預設值 */
    for (var i = 0; i < ITEMS.length; i++) {
      if (ITEMS[i].how.kind === 'free') ST.own[ITEMS[i].id] = 1;
    }
    for (var j = 0; j < SLOTS.length; j++) {
      var sk = SLOTS[j].k;
      if (!ST.eq[sk] || !ST.own[ST.eq[sk]]) ST.eq[sk] = defaultOf(sk);
    }
  }
  function save() {
    try { ls(KEY, JSON.stringify({ own: ST.own, eq: ST.eq })); } catch (e) {}
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

  function rebuild() {
    var f = byId(ST.eq.flame) || null;
    CACHE.flame = (f && f.pal) ? f.pal : null;
    var a = byId(ST.eq.aura) || null;
    CACHE.aura = (a && a.hex) ? a.hex : '';
    var b = byId(ST.eq.bomb) || null;
    CACHE.bomb = (b && b.hex) ? b.hex : '';
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
    box.innerHTML = '<div class="skgrid">' + h + '</div>';

    var cnt = root.querySelector('.skcnt');
    if (cnt) {
      var got = 0, tot = 0;
      for (i = 0; i < ITEMS.length; i++) { tot++; if (ST.own[ITEMS[i].id]) got++; }
      cnt.textContent = T('sk.count', { a: got, b: tot }, '已收集 {a} / {b}');
    }

    box.onclick = function (e) {
      var el = e.target;
      while (el && el !== box && !el.getAttribute('data-id')) el = el.parentNode;
      if (!el || el === box) return;
      var id = el.getAttribute('data-id');
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
    state: function () { return { own: ST.own, eq: ST.eq }; },
    of: byId, progress: progress, howText: howText,
    color: function (slot) { return CACHE[slot] || (slot === 'flame' ? null : ''); },
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
