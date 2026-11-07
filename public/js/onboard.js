/* ================================================================
   爆爆英雄 — 新手任務（v5.53）
   ---------------------------------------------------------------
   要解決的問題：「新玩家一進來看到十幾個入口，不知道今天該做什麼。」

   做法刻意保守 —— 完全不碰遊戲邏輯，只做兩件事：
     1. 從 localStorage 讀進度（bombhero-stage / 每日挑戰），
        換算成 7 個里程碑，首頁顯示「還差幾步」。
     2. 領取時呼叫主檔匯出的 __BH.Shop.addGold() 發金幣。

   為什麼不改主檔加事件鉤子：
     里程碑全部可以由「最遠解鎖關卡」推導（通關 N 關 ⇔ unlocked = N+1），
     不需要在炸磚／擊殺／受傷那些熱路徑插回呼，維護成本最低、也不會拖效能。

   依賴：__BH（Shop / HomeDot / toast / AudioSys / Screen），沒有就整支安靜停用。
   ================================================================ */
(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  var KEY = 'bombhero-onb-v1';        // 已領取紀錄
  var SHUT = 'bombhero-onb-hide';     // 玩家按過「先不要」→ 這次開機不再擋

  function BH() { return window.__BH || null; }
  function ls(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      localStorage.setItem(k, v);
    } catch (e) { return null; }
    return v;
  }

  /* ---------------- 進度來源 ---------------- */
  function clearedCount() {
    // bombhero-stage = 最遠解鎖關（1 起算）→ 已通關數 = unlocked - 1
    var n = parseInt(ls('bombhero-stage') || '1', 10);
    if (!isFinite(n) || n < 1) n = 1;
    return Math.max(0, n - 1);
  }

  function dailyDone() {
    try {
      var b = BH();
      if (b && b.HomeDot && typeof b.HomeDot.dailyDone === 'function') return !!b.HomeDot.dailyDone();
    } catch (e) {}
    return false;
  }

  /* 7 個里程碑：通關 1／3／5(BOSS)／10／15／20 ＋ 一次每日挑戰。
     need 是目標值，unit 只影響文案。 */
  var TASKS = [
    { id: 'c1', ico: '1', name: '通過第 1 關', need: 1, unit: '關', gold: 300,
      tip: '先熟悉移動、放炸彈、炸軟磚的節奏' },
    { id: 'c3', ico: '3', name: '通過第 3 關', need: 3, unit: '關', gold: 500,
      tip: '試著用衝刺搶位，別被自己的火燒到' },
    { id: 'b1', ico: '👹', name: '打贏第 1 章 BOSS', need: 5, unit: '關', gold: 1200,
      tip: '護盾會先擋傷害 —— 打光護盾才是破防時機' },
    { id: 'c10', ico: '10', name: '通過第 10 關', need: 10, unit: '關', gold: 1500,
      tip: '地圖會越開越大，注意小地圖上的縮圈' },
    { id: 'd1', ico: '📅', name: '完成一次每日挑戰', need: 1, unit: '次', gold: 800,
      tip: '每天一場，還能跟昨天的自己比快' },
    { id: 'c15', ico: '⚔️', name: '通過第 15 關', need: 15, unit: '關', gold: 1800,
      tip: '怪物開始有招式了，別站在直線上' },
    { id: 'c20', ico: '🏁', name: '通過第 20 關', need: 20, unit: '關', gold: 3000,
      tip: '一半的旅程 —— 接下來的王會愈來愈難纏' }
  ];
  var FINAL_GOLD = 5000;

  function valueOf(t) {
    if (t.id === 'd1') return dailyDone() ? 1 : 0;
    return clearedCount();
  }
  function stateOf(t) {
    var got = readClaim();
    var v = valueOf(t);
    if (got[t.id]) return 'got';
    return v >= t.need ? 'ready' : 'todo';
  }
  function readClaim() {
    try {
      var o = JSON.parse(ls(KEY) || '{}');
      return (o && typeof o === 'object') ? o : {};
    } catch (e) { return {}; }
  }
  function writeClaim(o) { try { ls(KEY, JSON.stringify(o)); } catch (e) {} }

  function doneCount() {
    var n = 0;
    TASKS.forEach(function (t) { if (stateOf(t) !== 'todo') n++; });
    return n;
  }
  function readyCount() {
    var n = 0;
    TASKS.forEach(function (t) { if (stateOf(t) === 'ready') n++; });
    return n;
  }
  function allGot() {
    var got = readClaim();
    for (var i = 0; i < TASKS.length; i++) if (!got[TASKS[i].id]) return false;
    return true;
  }

  /* ---------------- 樣式 ---------------- */
  var CSS = [
    /* 首頁橫卡：放在快捷列上方，未完成時才出現 */
    '#bhoCard{display:flex;align-items:center;gap:10px;margin:2px 0 9px;padding:11px 13px;',
    'border-radius:14px;background:linear-gradient(135deg,rgba(255,255,255,.62),rgba(255,255,255,.42));',
    'border:1px solid rgba(120,180,255,.55);box-shadow:0 3px 10px rgba(40,90,160,.13);cursor:pointer;',
    'backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}',
    '#bhoCard.hide{display:none}',
    '#bhoCard .bhoIco{font-size:20px;line-height:1;flex:0 0 auto}',
    '#bhoCard .bhoTx{flex:1 1 auto;min-width:0}',
    '#bhoCard .bhoTx b{display:block;font-size:13.5px;color:#123a63;letter-spacing:.2px}',
    '#bhoCard .bhoTx small{display:block;font-size:11.5px;color:#4a6d92;margin-top:2px;',
    'white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '#bhoCard .bhoNum{flex:0 0 auto;font-size:12px;font-weight:700;color:#fff;padding:3px 9px;',
    'border-radius:999px;background:linear-gradient(180deg,#5aa9f0,#2f7fd0)}',
    /* 面板 */
    '#bhOnb{position:fixed;inset:0;z-index:1320;display:flex;align-items:center;justify-content:center;',
    'padding:16px;background:rgba(8,20,38,.55);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}',
    '#bhOnb.hide{display:none}',
    '#bhOnb .bhowrap{width:100%;max-width:430px;max-height:88vh;display:flex;flex-direction:column;',
    'border-radius:20px;overflow:hidden;background:linear-gradient(180deg,#fbfdff,#eef6ff);',
    'border:1px solid rgba(255,255,255,.9);box-shadow:0 18px 50px rgba(10,30,60,.42)}',
    '#bhOnb .bhohead{position:relative;padding:16px 18px 12px;',
    'background:linear-gradient(160deg,#3f8fd8,#2a6bb5 60%,#1f5596);color:#fff}',
    '#bhOnb .bhohead h3{margin:0;font-size:16.5px;font-weight:800;letter-spacing:.5px}',
    '#bhOnb .bhohead p{margin:4px 0 0;font-size:11.5px;opacity:.85}',
    '#bhOnb .bhoClose{position:absolute;top:12px;right:12px;width:28px;height:28px;border-radius:50%;',
    'border:0;background:rgba(255,255,255,.22);color:#fff;font-size:15px;line-height:28px;cursor:pointer}',
    '#bhOnb .bhoBar{margin:10px 18px 2px;height:7px;border-radius:999px;background:rgba(40,90,150,.15);overflow:hidden}',
    '#bhOnb .bhoBar i{display:block;height:100%;border-radius:999px;',
    'background:linear-gradient(90deg,#7fc4ff,#3f8fd8);transition:width .35s ease}',
    '#bhOnb .bhoBarTx{padding:0 18px 10px;font-size:11px;color:#4a6d92}',
    '#bhOnb .bholist{flex:1 1 auto;overflow-y:auto;padding:4px 14px 14px;-webkit-overflow-scrolling:touch}',
    '#bhOnb .bhorow{display:flex;align-items:center;gap:10px;padding:10px 11px;margin-bottom:7px;',
    'border-radius:13px;background:#fff;border:1px solid #dfeaf6}',
    '#bhOnb .bhorow.isReady{border-color:#8fd0a5;background:linear-gradient(180deg,#f3fff7,#e8fbee)}',
    '#bhOnb .bhorow.isGot{opacity:.62}',
    '#bhOnb .bhoIco2{flex:0 0 30px;width:30px;height:30px;border-radius:9px;display:flex;',
    'align-items:center;justify-content:center;font-size:14px;font-weight:800;',
    'background:#eaf3fd;color:#2a6bb5}',
    '#bhOnb .bhorow.isReady .bhoIco2{background:#d9f5e2;color:#1c7f43}',
    '#bhOnb .bhoInfo{flex:1 1 auto;min-width:0}',
    '#bhOnb .bhoInfo b{display:block;font-size:13px;color:#123a63}',
    '#bhOnb .bhoInfo small{display:block;font-size:11px;color:#6a86a3;margin-top:2px;',
    'white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '#bhOnb .bhoGo{flex:0 0 auto;border:0;border-radius:999px;padding:7px 13px;font-size:12px;',
    'font-weight:700;color:#fff;cursor:pointer;background:linear-gradient(180deg,#63b8f5,#2f86d4);',
    'box-shadow:0 2px 6px rgba(30,90,160,.28)}',
    '#bhOnb .bhoGo.isGot{background:#cfdbe8;color:#6a86a3;box-shadow:none;cursor:default}',
    '#bhOnb .bhoGo.isTodo{background:#e6eef7;color:#8ea6bf;box-shadow:none;cursor:default}',
    '#bhOnb .bhoFoot{padding:10px 18px 16px;font-size:11px;color:#6a86a3;text-align:center}',
    /* 手機：面板貼底，按鈕加大好按 */
    '@media (max-width:430px){#bhOnb .bhowrap{max-height:92vh}',
    '#bhOnb .bhoGo{padding:8px 12px;font-size:12px}}'
  ].join('');

  function injectCSS() {
    if (document.getElementById('bhoCSS')) return;
    var st = document.createElement('style');
    st.id = 'bhoCSS';
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  /* ---------------- 首頁橫卡 ----------------
     v5.53：節點用模組變數快取，不要每次 getElementById。
     一來省 DOM 查詢，二來「有回傳值」不等於「真的在頁面上」——
     一定要檢查 parentNode，否則重複呼叫會拿到游離節點、插不進版面。 */
  var cardEl = null, panelEl = null;

  /* 掛在 .mgrid（六張主卡片）「之前」—— 也就是首頁那條「新手教學」綠條的正下方，
     兩個新手入口相鄰，玩家一進首頁就看得到；擺在 quickRow 之前會落到畫面外。
     沙盒沒有真的 .mgrid 時退回 quickRow，測試照樣跑得動。 */
  function cardHost() {
    var h = null;
    try { h = document.querySelector('.mgrid'); } catch (e) {}
    if (h && h.parentNode) return h;
    var q = document.getElementById('quickRow');
    return (q && q.parentNode) ? q : null;
  }

  function ensureCard() {
    if (cardEl && cardEl.parentNode) return cardEl;
    var host = cardHost();
    if (!host) return null;
    var c = document.getElementById('bhoCard');
    if (c && c.parentNode) { cardEl = c; return c; }
    c = document.createElement('div');
    c.id = 'bhoCard';
    c.setAttribute('role', 'button');
    c.setAttribute('tabindex', '0');
    c.innerHTML = '<span class="bhoIco">🎯</span>' +
      '<span class="bhoTx"><b>新手任務</b><small></small></span>' +
      '<span class="bhoNum">0/7</span>';
    c.addEventListener('click', open);
    c.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
    host.parentNode.insertBefore(c, host);
    cardEl = c;
    return c;
  }

  function nextTask() {
    for (var i = 0; i < TASKS.length; i++) {
      if (stateOf(TASKS[i]) === 'todo') return TASKS[i];
    }
    return null;
  }

  function refreshCard() {
    var c = ensureCard();
    if (!c) return;
    // 全部領完 → 這張卡就退休，不再佔首頁版面
    if (allGot()) { c.classList.add('hide'); return; }
    if (ls(SHUT) === '1') { c.classList.add('hide'); return; }
    c.classList.remove('hide');

    var n = doneCount(), r = readyCount(), t = nextTask();
    var sub, num, ico;
    if (r > 0) {
      sub = '有 ' + r + ' 個獎勵可以領了，點進來拿';
      num = '領取';
      ico = '🎁';
    } else if (t) {
      sub = '下一個：' + t.name + '（' + Math.min(valueOf(t), t.need) + '/' + t.need + ' ' + t.unit + '）';
      num = n + '/' + TASKS.length;
      ico = '🎯';
    } else {
      sub = '全部完成，最後的大獎等你拿';
      num = n + '/' + TASKS.length;
      ico = '🏆';
    }
    c.querySelector('.bhoIco').textContent = ico;
    var tEl = c.querySelector('.bhoTx b');
    if (tEl) tEl.textContent = r > 0 ? '新手任務 · 可以領獎' : '新手任務';
    c.querySelector('.bhoTx small').textContent = sub;
    c.querySelector('.bhoNum').textContent = num;
  }

  /* ---------------- 面板 ---------------- */
  function ensurePanel() {
    if (panelEl && panelEl.parentNode) return panelEl;
    var p = document.getElementById('bhOnb');
    if (p && p.parentNode) { panelEl = p; return p; }
    p = document.createElement('div');
    p.id = 'bhOnb';
    p.className = 'hide';
    p.innerHTML =
      '<div class="bhowrap" role="dialog" aria-modal="true" aria-labelledby="bhoTitle">' +
        '<div class="bhohead">' +
          '<h3 id="bhoTitle">新手任務</h3>' +
          '<p>跟著這 7 步走一遍，基礎玩法就都摸熟了</p>' +
          '<button class="bhoClose" id="bhoClose" type="button" aria-label="關閉">✕</button>' +
        '</div>' +
        '<div class="bhoBar"><i id="bhoBarFill" style="width:0%"></i></div>' +
        '<div class="bhoBarTx" id="bhoBarTx"></div>' +
        '<div class="bholist" id="bhoList"></div>' +
        '<div class="bhoFoot" id="bhoFoot"></div>' +
      '</div>';
    (document.body || document.documentElement).appendChild(p);
    panelEl = p;

    p.addEventListener('click', function (e) {
      if (e.target === p) close();           // 點遮罩關閉
    });
    var cb = p.querySelector('#bhoClose');
    if (cb) cb.addEventListener('click', close);
    var list = p.querySelector('#bhoList');
    if (list) list.addEventListener('click', onListClick);
    return p;
  }

  function rowHTML(t) {
    var st = stateOf(t);
    var v = Math.min(valueOf(t), t.need);
    var cls = st === 'ready' ? ' isReady' : (st === 'got' ? ' isGot' : '');
    var btn;
    if (st === 'ready') btn = '<button class="bhoGo" data-id="' + t.id + '" type="button">領 ' + t.gold + '</button>';
    else if (st === 'got') btn = '<button class="bhoGo isGot" type="button" disabled>已領</button>';
    else btn = '<button class="bhoGo isTodo" type="button" disabled>' + v + '/' + t.need + '</button>';
    var sub = st === 'todo' ? t.tip : (st === 'ready' ? '完成！可以領 ' + t.gold + ' 金幣' : '已領取 ' + t.gold + ' 金幣');
    return '<div class="bhorow' + cls + '">' +
      '<span class="bhoIco2">' + (st === 'got' ? '✓' : t.ico) + '</span>' +
      '<span class="bhoInfo"><b>' + t.name + '</b><small>' + sub + '</small></span>' +
      btn + '</div>';
  }

  function paint() {
    var p = ensurePanel();
    var list = p.querySelector('#bhoList');
    if (list) {
      var h = '';
      for (var i = 0; i < TASKS.length; i++) h += rowHTML(TASKS[i]);
      list.innerHTML = h;
    }
    var n = doneCount();
    var fill = p.querySelector('#bhoBarFill');
    if (fill) fill.style.width = Math.round(n / TASKS.length * 100) + '%';
    var tx = p.querySelector('#bhoBarTx');
    if (tx) tx.textContent = '已完成 ' + n + ' / ' + TASKS.length + '　·　完成全部再送 ' + FINAL_GOLD + ' 金幣';
    var ft = p.querySelector('#bhoFoot');
    if (ft) {
      var got = readClaim();
      var all = TASKS.every(function (t) { return got[t.id]; });
      ft.textContent = all ? '全部完成！這條引導就到這裡，接下來隨你玩。'
        : '進度會自動記錄，不用一次做完 —— 隨時回來看還差幾步。';
    }
  }

  function onListClick(e) {
    var b = e.target;
    if (!b || !b.getAttribute) return;
    var id = b.getAttribute('data-id');
    if (!id || !b.classList.contains('bhoGo')) return;
    claim(id);
  }

  function claim(id) {
    var t = null;
    for (var i = 0; i < TASKS.length; i++) if (TASKS[i].id === id) t = TASKS[i];
    if (!t || stateOf(t) !== 'ready') return;

    var gold = t.gold;
    var got = readClaim();
    got[id] = 1;

    // 最後一個任務領完 → 加碼總獎
    var allNow = TASKS.every(function (x) { return got[x.id]; });
    writeClaim(got);
    if (allNow) gold += FINAL_GOLD;

    var paid = false;
    try {
      var b = BH();
      if (b && b.Shop && typeof b.Shop.addGold === 'function') { b.Shop.addGold(gold); paid = true; }
    } catch (e) {}

    try {
      var b2 = BH();
      if (b2 && typeof b2.toast === 'function') {
        b2.toast((paid ? '💰 +' + gold + ' 金幣' : '✅ 任務完成') + '　' + t.name, 2.6);
      }
    } catch (e2) {}
    try {
      var b3 = BH();
      if (b3 && b3.AudioSys && typeof b3.AudioSys.sfx === 'function') b3.AudioSys.sfx('victory');
    } catch (e3) {}

    paint();
    refreshCard();
  }

  function open() {
    injectCSS();
    paint();
    var p = ensurePanel();
    p.classList.remove('hide');
    try {
      var b = BH();
      if (b && b.AudioSys && typeof b.AudioSys.sfx === 'function') b.AudioSys.sfx('click');
    } catch (e) {}
  }
  function close() {
    if (panelEl) panelEl.classList.add('hide');
  }
  function isOpen() {
    return !!(panelEl && !panelEl.classList.contains('hide'));
  }

  /* ---------------- 啟動 ---------------- */
  function boot() {
    injectCSS();
    refreshCard();
    // ESC 關閉
    document.addEventListener('keydown', function (e) {
      if (isOpen() && e.key === 'Escape') { e.preventDefault(); close(); }
    }, true);
    // 回到首頁時刷新（分數／金幣可能變了）
    var n = 0;
    var t = setInterval(function () {
      n++;
      try { refreshCard(); } catch (e) {}
      if (n > 60) clearInterval(t);        // 只盯前 3 分鐘（開機那段），之後靠事件
    }, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* 測試／除錯用 */
  var API = {
    TASKS: TASKS, FINAL_GOLD: FINAL_GOLD,
    clearedCount: clearedCount, dailyDone: dailyDone,
    stateOf: stateOf, doneCount: doneCount, readyCount: readyCount, allGot: allGot,
    claim: claim, open: open, close: close, isOpen: isOpen,
    refreshCard: refreshCard, paint: paint,
    KEY: KEY, SHUT: SHUT,
    reset: function () { try { localStorage.removeItem(KEY); localStorage.removeItem(SHUT); } catch (e) {} }
  };
  window.BHOnboard = API;
  if (typeof module === 'object' && module.exports) module.exports = API;
})();
