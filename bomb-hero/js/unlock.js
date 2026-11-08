/* ================================================================
   爆爆英雄 — 模式遞進解鎖（v5.56）
   ---------------------------------------------------------------
   要解決的問題：「新玩家一進來看到六張卡，不知道該點哪一張。」
   入口太多不是豐富，是決策成本 —— 第一次來的玩家會直接關掉。

   做法：
     · 一開始只開「單機闖關」（冒險模式裡只亮單人那顆）。
     · 通關第 5 關（第一個 BOSS 決戰場）→ 解鎖 RPG。
     · 通關第 10 關 → 解鎖大逃殺。
     · 通關第 15 關 → 解鎖多人對戰。
     每次解鎖都給一次慶祝 —— 「有東西等著」本身就是回來的理由。

   老玩家不會被鎖：只要本地有 bombhero-stage（代表曾通關）或已登入帳號，
   一律視為老玩家、直接全開。新玩家第一次進來時這個鍵不存在。

   設計約束：不碰遊戲邏輯、不改按鈕的 innerHTML（會被主檔的 homeFill 重寫），
   只加／移 class；點擊用捕獲階段攔，抗重繪。
   ================================================================ */
(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  var KEY = 'bombhero-unlock-v1';

  function BH() { return window.__BH || null; }
  function api(n) { var b = BH(); return (b && b[n]) || null; }

  function ls(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      localStorage.setItem(k, v);
    } catch (e) { return null; }
    return v;
  }

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

  /* ---------------- 門檻定義 ----------------
     sel：要加 class 的元素。need：需要「已通關關數」。
     ------------------------------------------- */
  var GATES = [
    { id: 'rpg', sel: 'btnRpg', need: 5, ico: '🎲', n: 'RPG 養成' },
    { id: 'br', sel: 'btnBR', need: 10, ico: '🏝️', n: '大逃殺' },
    { id: 'multi', sel: 'btnMulti', need: 15, ico: '⚔️', n: '多人對戰' }
  ];

  /* ---------------- 進度 ---------------- */
  function cleared() {
    var n = parseInt(ls('bombhero-stage') || '1', 10);
    if (!isFinite(n) || n < 1) n = 1;
    return Math.max(0, n - 1);
  }

  /* 老玩家判定：本地有過關紀錄（新玩家從沒寫過這個鍵），或已登入帳號 */
  function isVeteran() {
    try { if (ls('bombhero-stage') !== null) return true; } catch (e) {}
    try {
      var C = api('Cloud');
      if (C && C.online && C.online()) return true;
      if (C && C.acc && C.acc()) return true;
    } catch (e2) {}
    return false;
  }

  /* ---------------- 存檔：記「已慶祝過什麼」，避免重複彈 ---------------- */
  var ST = { seen: {}, all: 0 };

  function load() {
    var o = null;
    try { o = JSON.parse(ls(KEY) || 'null'); } catch (e) { o = null; }
    ST = { seen: {}, all: 0 };
    if (o && typeof o === 'object') {
      if (o.seen && typeof o.seen === 'object') {
        for (var k in o.seen) if (Object.prototype.hasOwnProperty.call(o.seen, k)) ST.seen[k] = 1;
      }
      if (o.all) ST.all = 1;
    }
  }
  function save() {
    try { ls(KEY, JSON.stringify(ST)); } catch (e) {}
  }

  /* ---------------- 判定某一項現在開不開 ---------------- */
  function openOf(g) {
    if (ST.all) return true;
    return cleared() >= g.need;
  }

  /* ---------------- 套用到畫面上 ---------------- */
  var lastSig = '';

  function paint(silent) {
    var n = cleared();
    var veteran = isVeteran();
    if (veteran && !ST.all) {
      /* 老玩家一次性全開 —— 他們已經被舊版教會怎麼玩了，鎖起來只會讓人困惑 */
      ST.all = 1;
      for (var i = 0; i < GATES.length; i++) ST.seen[GATES[i].id] = 1;
      save();
    }

    var newly = [];
    for (var j = 0; j < GATES.length; j++) {
      var g = GATES[j];
      var el = document.getElementById(g.sel);
      if (!el) continue;
      var open = openOf(g);
      /* class 不會被 innerHTML 重寫沖掉，所以每輪都重新確認一次即可 */
      if (open) el.classList.remove('locked');
      else el.classList.add('locked');
      el.setAttribute('data-aigain', open ? '' : String(g.need));
      if (!open) {
        el.setAttribute('title', T('ul.need', { n: g.need }, '通關第 {n} 關解鎖'));
        /* 刻意「不」設 aria-disabled：主檔的手把／鍵盤導航會跳過
           aria-disabled="true" 的元素（main.js:2889），設了這個鍵在鎖住時就完全
           按不到，玩家也看不到「為什麼不能玩」的提示。改用 data-locked 標記。 */
        el.setAttribute('data-locked', '1');
      } else {
        el.removeAttribute('data-locked');
        var tt = el.getAttribute('title') || '';
        if (tt.indexOf(T('ul.word', null, '解鎖')) >= 0) el.removeAttribute('title');
        if (!ST.seen[g.id]) { ST.seen[g.id] = 1; newly.push(g); }
      }
    }
    if (newly.length) {
      save();
      if (!silent) {
        for (var k = 0; k < newly.length; k++) celebrate(newly[k]);
      }
    }
  }

  function celebrate(g) {
    try { var A = api('AudioSys'); if (A && A.sfx) A.sfx('victory'); } catch (e) {}
    try { var c = api('confetti'); if (typeof c === 'function') c(); } catch (e2) {}
    try {
      var b = BH();
      if (b && b.toast) {
        b.toast('🎉 ' + T('ul.unlocked', { n: g.n }, '解鎖「{n}」！') , 3.4);
      }
    } catch (e3) {}
  }

  /* ---------------- 點擊攔截 ----------------
     捕獲階段攔下來，主檔的監聽就不會跑 —— 不用改任何既有 handler。
     ------------------------------------------- */
  function onCap(e) {
    var el = e.target;
    while (el && el !== document && !(el.classList && el.classList.contains('locked'))) el = el.parentNode;
    if (!el || el === document) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    var need = el.getAttribute('data-aigain') || '';
    var msg = '';
    try {
      var A = api('AudioSys'); if (A && A.sfx) A.sfx('click');
    } catch (x) {}
    msg = T('ul.need', { n: need }, '通關第 {n} 關解鎖');
    try {
      var b = BH();
      if (b && b.toast) b.toast('🔒 ' + msg + '（' + T('ul.now', { n: cleared() }, '現在 {n} 關') + '）', 2.8);
    } catch (x2) {}
  }

  /* ---------------- 啟動 ---------------- */
  var timer = 0;
  var lastN = -1;

  /* 只盯「已通關關數」這個數字 —— 它一變就重畫。
     不去碰畫面可見性判斷：各版本的標題畫面用 class 或 display 控制都有，
     與其猜，不如讓這 900ms 的檢查變成純字串讀取（成本可忽略）。 */
  function tick() {
    try {
      var n = cleared();
      if (n !== lastN) { lastN = n; paint(false); }
    } catch (e) {}
  }

  function boot() {
    try {
      load();
      /* ?unlock=all 逃生口（開發／測試用） */
      try {
        var q = new URLSearchParams(location.search);
        if (q.get('unlock') === 'all') { ST.all = 1; save(); }
      } catch (e0) {}

      paint(true);

      /* 樣式：用 ::before 畫鎖角標（.mbtn 的 ::after 已經被果凍效果佔用） */
      if (!document.getElementById('ulStyle')) {
        var css = ''
          + '#homeMenu .mbtn.locked,#bhPick .qbtn.locked{opacity:.60;filter:grayscale(.42) brightness(.96)}'
          + '#homeMenu .mbtn.locked::before,#bhPick .qbtn.locked::before{'
          + 'content:"🔒";position:absolute;top:5px;right:7px;font-size:12px;line-height:1;'
          + 'opacity:.92;z-index:6;pointer-events:none}'
          + '#bhPick .qbtn.locked::before{top:50%;right:12px;transform:translateY(-50%)}'
          + '#homeMenu .mbtn.locked:active,#bhPick .qbtn.locked:active{transform:none}';
        var st = document.createElement('style');
        st.id = 'ulStyle';
        st.textContent = css;
        document.head.appendChild(st);
      }

      /* 攔截點擊（捕獲） */
      document.addEventListener('click', onCap, true);

      /* 換關／回首頁都會寫 bombhero-stage → 輕量輪詢比四處插回呼安全得多 */
      timer = setInterval(tick, 900);

      /* 語言切換後把提示重鋪一次 */
      document.addEventListener('bh:lang', function () { paint(true); });
    } catch (e) {
      try { console.error('[unlock] 初始化失敗（解鎖停用，全部模式照常可玩）:', e); } catch (e2) {}
    }
  }

  /* 任何錯誤都必須「全部解鎖」，寧可少一層引導，也不能把玩家鎖在門外 */
  try {
    boot();
  } catch (e) {
    try { document.getElementById('btnRpg').classList.remove('locked'); } catch (x) {}
    try { document.getElementById('btnBR').classList.remove('locked'); } catch (x) {}
    try { document.getElementById('btnMulti').classList.remove('locked'); } catch (x) {}
  }

  var API = {
    GATES: GATES, cleared: cleared, isVeteran: isVeteran,
    state: function () { return { all: ST.all, seen: ST.seen, cleared: cleared() }; },
    paint: function () { lastSig = ''; paint(true); },
    reset: function () { ST = { seen: {}, all: 0 }; save(); lastSig = ''; paint(true); }
  };
  window.__BHUnlock = API;
  try { if (typeof module !== 'undefined' && module.exports) module.exports = API; } catch (e) {}
})();
