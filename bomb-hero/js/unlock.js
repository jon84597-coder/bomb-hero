/* ================================================================
   爆爆英雄 — 模式遞進解鎖（v5.56）
   ---------------------------------------------------------------
   要解決的問題：「新玩家一進來看到六張卡，不知道該點哪一張。」
   入口太多不是豐富，是決策成本 —— 第一次來的玩家會直接關掉。

   做法：
     · 一開始只開「單機闖關」（冒險模式裡只亮單人那顆）。
     · 通關第 3 關 → 解鎖 RPG。
     · 通關第 6 關 → 解鎖大逃殺。
     · 通關第 9 關 → 解鎖多人對戰。
     每次解鎖都給一次慶祝 —— 「有東西等著」本身就是回來的理由。

   v5.60：測試版把門檻從 5／10／15 壓到 3／6／9。理由很直接 ——
   現在要的是「大家快點把每個玩法都玩到、然後給意見」，而不是留存曲線。
   5／10／15 大約要打半小時才看得到大逃殺，多數測試者根本走不到，
   問卷就只剩「單機闖關」一種心得。壓到 3／6／9 後約十幾分鐘全開。
   上市後要調回去：只改 GATES 的三個 need，其餘（文案／慶祝／老玩家判定）自動跟上。

   誰不會被鎖：① 真的註冊／登入的會員 ② 本機已通關 ≥ 最後一階（9 關）。
   匿名遊客帳號不算 —— Cloud.init() 會替每位訪客自動建一個，把「online」當老玩家
   等於門檻對所有人都失效（v5.56 上線當天實測抓到的）。

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
     v5.60：測試期壓到 3／6／9（原 5／10／15）。其餘程式都吃這裡的 need，
     包含「老玩家 = 已走完最後一階」的判定，所以只改數字就整體生效。
     ------------------------------------------- */
  var GATES = [
    { id: 'rpg', sel: 'btnRpg', need: 3, ico: '🎲', n: 'RPG 養成', tk: 'rpg' },
    { id: 'br', sel: 'btnBR', need: 6, ico: '🏝️', n: '大逃殺', tk: 'br' },
    { id: 'multi', sel: 'btnMulti', need: 9, ico: '⚔️', n: '多人對戰', tk: 'battle' }
  ];

  /* ---------------- 進度 ---------------- */
  function cleared() {
    var n = parseInt(ls('bombhero-stage') || '1', 10);
    if (!isFinite(n) || n < 1) n = 1;
    return Math.max(0, n - 1);
  }

  /* 老玩家判定 —— 只有這兩種人不必再爬門檻：

     ① 真的註冊／登入的會員（或伺服器上已經有 RPG 進度的人）。
     ② 本機進度已經走完整條階梯（通關 ≥9 關，隨 GATES 最後一階浮動），鎖他沒有任何意義。

     2026-11 三次修正（全部是線上實測才抓到）：
     a. 原本寫成 Cloud.online() || Cloud.acc()。但 Cloud.init() 一開場就打
        /api/auth/guest，替每位訪客自動建遊客帳號 → online 恆為 true、acc 恆非 null
        → 所有人第一次進來就被判成老玩家，三個門檻形同不存在。
     b. 也不能只認「有 bombhero-stage 這個鍵」：開機就會寫成 1，
        於是階梯只剩 0 與 1 兩格。改成看「走了多遠」，不是「有沒有開始走」。
     c. 也不能用 acc.unlocked > 0 當「玩過 RPG」：全新遊客帳號的 unlocked
        本來就是 1（第 1 章預設解鎖）。要看真的打過（rpg.cleared／rpg.xp）。

     已經開過 v5.56 的玩家不受影響：那時 ST.all 早就被寫成 1，存在 bombhero-unlock-v1。 */
  function isVeteran() {
    try {
      var C = api('Cloud');
      if (C) {
        var guest = (typeof C.guest === 'function') ? !!C.guest() : true;
        var on = (C.online && typeof C.online === 'function') ? !!C.online() : false;
        var a = (typeof C.acc === 'function') ? C.acc() : null;
        if (on && !guest) return true;                              /* 會員 */
        if (a && a.kind && a.kind !== 'guest') return true;         /* 保險：kind 認得出是會員 */
        var rg = (a && a.rpg) || null;
        if (rg && ((rg.cleared | 0) > 0 || (rg.xp | 0) > 0)) return true;  /* 真的打過 RPG */
      }
    } catch (e2) {}
    var last = GATES[GATES.length - 1];
    if (cleared() >= (last ? last.need : 9)) return true;            /* 已走完整條階梯 */
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
      /* v5.80：徽章直接寫「🔒 通關 N 關解鎖」—— 以前只有一個鎖頭圖示，
         新手看不出「到底要幹嘛」，只覺得點不動。 */
      el.setAttribute('data-aigain', open ? '' : T('gate.badge', { n: g.need }, '🔒 通關 {n} 關解鎖'));
      el.setAttribute('data-needn', String(g.need));
      el.setAttribute('data-gk', g.tk || g.id);
      el.setAttribute('data-gn', g.n);
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

  /* ---------------- 說明卡（v5.80） ----------------
     以前點到鎖住的卡只有一句 2.8 秒的 toast，玩家常常整段漏看，回頭還是
     「點了沒反應，是不是壞了」。現在開一張卡：為什麼鎖、已通關幾關、還差幾關、
     一顆「去冒險模式通關」直接把玩家帶到該去的地方。
     ------------------------------------------- */
  var CARD_ID = 'gateOv';

  function closeCard() {
    var ov = document.getElementById(CARD_ID);
    if (ov) ov.classList.remove('on');
  }

  function ensureCard() {
    var ov = document.getElementById(CARD_ID);
    if (ov) return ov;
    ov = document.createElement('div');
    ov.id = CARD_ID;
    ov.className = 'bhgate';
    ov.innerHTML =
      '<div class="bhgbox" role="dialog" aria-modal="true" aria-labelledby="bhgT">' +
        '<div class="bhgico">🔒</div>' +
        '<h3 id="bhgT"></h3>' +
        '<p id="bhgB"></p>' +
        '<div class="bhgline"><span id="bhgL"></span><b id="bhgN"></b></div>' +
        '<div class="bhgtrack"><i id="bhgF"></i></div>' +
        '<p class="bhgnote" id="bhgNote"></p>' +
        '<button type="button" class="bhgbtn" id="bhgGo"></button>' +
        '<button type="button" class="bhgbtn ghost" id="bhgBack" data-close="1"></button>' +
      '</div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', function (e) { if (e.target === ov) closeCard(); });
    var bk = document.getElementById('bhgBack');
    if (bk) bk.addEventListener('click', function () {
      try { var A = api('AudioSys'); if (A && A.sfx) A.sfx('click'); } catch (e) {}
      closeCard();
    });
    var go = document.getElementById('bhgGo');
    if (go) go.addEventListener('click', function () {
      try { var A = api('AudioSys'); if (A && A.sfx) A.sfx('click'); } catch (e) {}
      closeCard();
      /* 直接按首頁那顆「冒險模式」—— 走原本的入口，不另外拼一套流程 */
      var adv = document.getElementById('btnAdventure');
      if (adv) { try { adv.click(); } catch (e2) {} }
    });
    return ov;
  }

  function openCard(tk, need, name) {
    try {
      var ov = ensureCard();
      var cur = Math.min(cleared(), need);
      var set = function (id, txt) {
        var e = document.getElementById(id);
        if (e) e.textContent = txt;
      };
      set('bhgT', T('gate.' + tk + 'Title', null, '🔒 ' + (name || '')));
      set('bhgB', T('gate.' + tk + 'Body', { n: need }, ''));
      set('bhgL', T('gate.why', null, '解鎖條件'));
      set('bhgN', T('gate.prog', { a: cur, b: need }, ''));
      set('bhgNote', T('gate.notBroken', null, ''));
      set('bhgGo', T('gate.go', null, '去冒險模式通關'));
      set('bhgBack', T('gate.back', null, '知道了'));
      var f = document.getElementById('bhgF');
      if (f && f.style) f.style.width = Math.max(4, Math.round(cur / Math.max(1, need) * 100)) + '%';
      ov.classList.add('on');
      try { var A = api('AudioSys'); if (A && A.sfx) A.sfx('hurt'); } catch (e) {}
      return true;
    } catch (e) { return false; }
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
    var need = parseInt(el.getAttribute('data-needn') || '0', 10) || 0;
    var tk = el.getAttribute('data-gk') || '';
    var gn = el.getAttribute('data-gn') || '';
    try {
      var A = api('AudioSys'); if (A && A.sfx) A.sfx('click');
    } catch (x) {}
    /* v5.80：不再只丟一句 2.8 秒的 toast（玩家常整段漏看，回頭還是「點了沒反應」），
       改成開一張說明卡：為什麼鎖、已通關幾關、還差幾關、一顆按鈕直接帶去冒險模式。 */
    if (tk && openCard(tk, need, gn)) return;
    try {
      var b = BH();
      if (b && b.toast) b.toast('🔒 ' + T('ul.need', { n: need }, '通關第 {n} 關解鎖') +
        '（' + T('ul.now', { n: cleared() }, '現在 {n} 關') + '）', 2.8);
    } catch (x2) {}
  }

  /* ---------------- 啟動 ---------------- */
  var timer = 0;
  var lastN = -1;

  /* 900ms 一次：讀「已通關關數」＋重鋪鎖定狀態。
     不去碰畫面可見性判斷：各版本的標題畫面用 class 或 display 控制都有，
     與其猜，不如讓這 900ms 的檢查變成純字串讀取＋三次 classList（成本可忽略）。 */
  function tick() {
    try {
      var n = cleared();
      var changed = (n !== lastN);
      lastN = n;
      /* 每輪都重鋪，不只是關數變了才鋪：主檔的 homeFill／面板開合會整段重畫首頁，
         locked 這個 class 會被洗掉（線上實測：開一次外觀面板再關，鎖就不見了）。
         paint 只是三次 getElementById ＋ classList 比對，900ms 一次的成本可忽略。
         關數有變才慶祝（silent=false），其餘只做靜默修補。 */
      paint(!changed);
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
        /* v5.80：鎖標從「一顆鎖頭」改成寫著「🔒 通關 N 關解鎖」的小膠囊 ——
           新手要的是「還要做什麼」，不是一個看得懂但沒資訊的圖示。 */
        var css = ''
          + '#homeMenu .mbtn.locked,#bhPick .qbtn.locked{opacity:.66;filter:grayscale(.38) brightness(.98)}'
          /* 素材區的卡片圖示是「流式」排在標題上方（.mgrid 那條規則），鎖標也照這個位置走，
             不要絕對定位 —— 絕對定位會壓到下面那行說明文字。選擇器刻意掛兩個 id，
             才壓得過 body.touch.home-wide 那條 (1,5,1) 的窄卡規則。 */
          + '#scr-title #homeMenu .mgrid .mbtn.locked::before{'
          + 'content:attr(data-aigain);position:static;left:auto;top:auto;right:auto;bottom:auto;'
          + 'transform:none;display:block;width:max-content;max-width:100%;height:auto;'
          + 'margin:0 auto 4px;padding:2px 9px;border-radius:999px;'
          + 'font-size:10px;font-weight:900;line-height:1.7;letter-spacing:0;white-space:nowrap;'
          + 'color:#4a3208;text-shadow:none;text-align:center;'
          + 'background:linear-gradient(180deg,#ffeab5,#ffc861);'
          + 'box-shadow:0 2px 6px -2px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.8);'
          + 'pointer-events:none}'
          + 'body.touch #scr-title #homeMenu .mgrid .mbtn.locked::before{'
          + 'font-size:8.5px;padding:1px 7px;margin:0 auto 3px;line-height:1.6}'
          /* 冒險模式面板裡的 RPG 按鈕是橫排小按鈕，鎖標疊在文字上居中 */
          + '#bhPick .qbtn.locked::before{content:attr(data-aigain);position:absolute;'
          + 'left:50%;top:50%;transform:translate(-50%,-50%);padding:2px 9px;border-radius:999px;'
          + 'font-size:10px;font-weight:900;line-height:1.7;letter-spacing:0;white-space:nowrap;'
          + 'color:#4a3208;text-shadow:none;background:linear-gradient(180deg,#ffeab5,#ffc861);'
          + 'box-shadow:0 2px 6px -2px rgba(0,0,0,.45);pointer-events:none;z-index:6}'
          /* 鎖住的卡不該還掛著「HOT 推薦」—— 一邊推薦一邊鎖住，玩家只會更困惑 */
          + '#scr-title #homeMenu .mbtn.locked .hotTag,'
          + '#scr-title #homeMenu .mbtn.locked .betaTag{display:none!important}'
          + '#homeMenu .mbtn.locked:active,#bhPick .qbtn.locked:active{transform:none}'
          + '#gateOv.bhgate{position:fixed;inset:0;z-index:96;display:none;align-items:center;'
          + 'justify-content:center;padding:18px;background:rgba(12,6,24,.62);'
          + '-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px)}'
          + '#gateOv.bhgate.on{display:flex;animation:bhgIn .2s ease-out both}'
          + '@keyframes bhgIn{from{opacity:0}to{opacity:1}}'
          + '#gateOv .bhgbox{width:100%;max-width:340px;padding:15px 15px 11px;border-radius:18px;'
          + 'text-align:center;border:2px solid #e5b978;'
          + 'background:linear-gradient(180deg,#fffdf6,#fff3d8);'
          + 'box-shadow:0 18px 40px -14px rgba(0,0,0,.72),inset 0 2px 0 #fff;'
          + 'animation:bhgPop .24s cubic-bezier(.2,.9,.3,1.05) both}'
          + '@keyframes bhgPop{from{transform:scale(.92) translateY(10px)}to{transform:none}}'
          + '#gateOv .bhgico{font-size:32px;line-height:1}'
          + '#gateOv h3{margin:5px 0 0;font-size:16.5px;font-weight:900;color:#7a3d00;letter-spacing:.02em}'
          + '#gateOv p{margin:8px 0 10px;font-size:12.5px;line-height:1.72;color:#4a3418;text-align:left}'
          + '#gateOv .bhgline{display:flex;justify-content:space-between;align-items:baseline;'
          + 'font-size:11.5px;font-weight:800;color:#8a6a2a}'
          + '#gateOv .bhgline b{font-size:12.5px;color:#b4500a}'
          + '#gateOv .bhgtrack{height:8px;margin-top:5px;border-radius:999px;overflow:hidden;'
          + 'background:rgba(120,90,40,.2);box-shadow:inset 0 1px 2px rgba(0,0,0,.18)}'
          + '#gateOv .bhgtrack i{display:block;height:100%;width:0;border-radius:999px;'
          + 'background:linear-gradient(90deg,#ffd166,#f0932b);transition:width .3s ease}'
          + '#gateOv .bhgnote{margin:8px 0 1px;font-size:10.5px;line-height:1.6;color:#8a7350}'
          + '#gateOv .bhgbtn{display:block;width:100%;margin-top:8px;padding:11px 14px;border:0;'
          + 'border-radius:12px;font-family:inherit;font-size:14px;font-weight:900;cursor:pointer;'
          + 'color:#fff;letter-spacing:.04em;background:linear-gradient(180deg,#ffa161,#e8622b);'
          + 'box-shadow:0 4px 0 #a8411a,0 10px 18px -10px rgba(200,80,20,.8),inset 0 2px 0 rgba(255,255,255,.35)}'
          + '#gateOv .bhgbtn:active{transform:translateY(2px);'
          + 'box-shadow:0 2px 0 #a8411a,inset 0 2px 0 rgba(255,255,255,.35)}'
          + '#gateOv .bhgbtn.ghost{background:linear-gradient(180deg,#f6f1e4,#e5dbc6);color:#6a5426;'
          + 'box-shadow:0 3px 0 #c3b795,inset 0 2px 0 rgba(255,255,255,.85)}';
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
