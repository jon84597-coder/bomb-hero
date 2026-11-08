/* ================================================================
   爆爆英雄 — 今日提醒（v5.56）
   ---------------------------------------------------------------
   為什麼要有：
     每日挑戰、連簽、賽季倒數都做好了，但玩家不一定會「剛好看到紅點」。
     紅點是「被動的」，玩家得先回到首頁；而很多人根本不會回到首頁。

   克制原則（很重要）：
     · 每天最多 1 條站內橫幅，看過就記住，當天不再出現
     · 系統通知預設關閉，只在玩家自己打開開關時才請求權限
     · 系統通知每天最多 1 條，而且只在「切到別的視窗 5 分鐘後」才發
     · 不追蹤、不上報，全部資料都在本機

   為什麼不用 push：免費實例沒有常駐推播服務，而且推播要在玩家「沒開遊戲」
   時送達，需要後端定時任務 —— 這超出免費方案。所以這裡做的是
   「回來時提醒」＋「切走時提醒一次」，誠實但不誇大。
   ================================================================ */
(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  var KEY_DAY = 'bombhero-nudge-day';      // 今天已經提示過（站內）
  var KEY_SYS = 'bombhero-nudge-sys';      // 今天已經發過系統通知
  var KEY_ON = 'bombhero-nudge-on';        // 系統通知開關（預設關）

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

  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  /* ---------------- 條件 ---------------- */
  function dailyPending() {
    try {
      var h = api('HomeDot');
      if (h && typeof h.dailyDone === 'function') return !h.dailyDone();
    } catch (e) {}
    return false;
  }
  function seasonLeft() {
    try {
      var s = api('Season');
      if (s && typeof s.daysLeft === 'function') return s.daysLeft() | 0;
    } catch (e) {}
    return 99;
  }

  function items() {
    var out = [];
    if (dailyPending()) {
      out.push({ id: 'daily', ico: '📅', txt: T('nd.daily', null, '今天的每日挑戰還沒打 —— 全球同一張圖，打完就進榜。'), act: 'daily' });
    }
    var dl = seasonLeft();
    if (dl <= 3) {
      out.push({ id: 'season', ico: '⏳', txt: T('nd.season', { n: dl }, '本季只剩 {n} 天，通行證的獎勵記得領。'), act: 'gift' });
    }
    return out;
  }

  /* ---------------- 站內橫幅 ---------------- */
  function ensureBar() {
    var b = document.getElementById('ndBar');
    if (b) return b;
    var css = ''
      + '#ndBar{display:none;align-items:center;gap:9px;margin:0 0 10px;padding:9px 11px;'
      + 'border-radius:14px;background:linear-gradient(180deg,rgba(255,241,209,.96),rgba(255,228,174,.94));'
      + 'border:1px solid rgba(196,146,58,.42);box-shadow:0 4px 14px rgba(120,80,20,.16);'
      + 'cursor:pointer;position:relative;text-align:left}'
      + '#ndBar.on{display:flex}'
      + '#ndBar .ni{font-size:17px;line-height:1;flex:none}'
      + '#ndBar .nt{flex:1;font-size:12px;line-height:1.45;color:#4a3410;font-weight:600}'
      + '#ndBar .nx{flex:none;font-style:normal;font-size:13px;color:#a08650;padding:2px 4px}'
      + '#ndBar .nx:hover{color:#6b5424}';
    var st = document.createElement('style');
    st.id = 'ndStyle';
    st.textContent = css;
    document.head.appendChild(st);

    var d = document.createElement('div');
    d.id = 'ndBar';
    /* tabindex="-1"：主檔的手把／鍵盤焦點選擇器是
       '[tabindex]:not([tabindex="-1"])'（main.js:2832），
       用 0 會讓這條橫幅插進焦點鏈、把手把導航的順序整個推歪。
       滑鼠與觸控照樣可點，鍵盤使用者由下方「每日挑戰」按鈕進入。 */
    d.setAttribute('tabindex', '-1');
    d.setAttribute('aria-label', '今日提醒');
    d.innerHTML = '<span class="ni"></span><span class="nt"></span><i class="nx">✕</i>';
    return d;
  }

  var curAct = '';

  function showBar(list) {
    if (!list || !list.length) return;
    var bar = ensureBar();
    var menu = document.getElementById('homeMenu');
    if (!menu) return;
    if (!bar.parentNode) menu.insertBefore(bar, menu.firstChild);
    var it = list[0];
    curAct = it.act || '';
    bar.querySelector('.ni').textContent = it.ico;
    bar.querySelector('.nt').textContent = it.txt;
    bar.classList.add('on');
  }

  function hideBar() {
    var b = document.getElementById('ndBar');
    if (b) b.classList.remove('on');
  }

  function wireBar() {
    var bar = ensureBar();
    if (bar.dataset.wired) return;
    bar.dataset.wired = '1';
    bar.addEventListener('click', function (e) {
      if (e.target && e.target.classList && e.target.classList.contains('nx')) {
        e.stopPropagation();
        try { ls(KEY_DAY, todayKey()); } catch (x) {}
        return hideBar();
      }
      try { var A = api('AudioSys'); if (A && A.sfx) A.sfx('click'); } catch (x2) {}
      try { ls(KEY_DAY, todayKey()); } catch (x3) {}
      hideBar();
      if (curAct === 'daily') {
        var b = document.getElementById('btnDaily');
        if (b) b.click();
      } else if (curAct === 'gift') {
        var G = api('GiftUI');
        if (G && G.open) G.open();
      }
    });
  }

  /* ---------------- 系統通知（預設關） ---------------- */
  function sysOn() { return ls(KEY_ON) === '1'; }

  function canNotify() {
    return typeof Notification !== 'undefined' && Notification.permission === 'granted';
  }

  function notifySys(text) {
    if (!sysOn() || !canNotify()) return;
    if (ls(KEY_SYS) === todayKey()) return;
    try {
      var reg = null;
      if (navigator.serviceWorker) {
        navigator.serviceWorker.getRegistration().then(function (r) {
          if (r && r.showNotification) {
            r.showNotification('爆爆英雄 · 今日提醒', {
              body: text, tag: 'bh-daily', renotify: false
            });
          } else {
            new Notification('爆爆英雄 · 今日提醒', { body: text, tag: 'bh-daily' });
          }
          ls(KEY_SYS, todayKey());
        }, function () {
          try { new Notification('爆爆英雄 · 今日提醒', { body: text, tag: 'bh-daily' }); ls(KEY_SYS, todayKey()); } catch (e) {}
        });
        return;
      }
      new Notification('爆爆英雄 · 今日提醒', { body: text, tag: 'bh-daily' });
      ls(KEY_SYS, todayKey());
    } catch (e) {}
  }

  /* 切走 5 分鐘後提醒一次（頁面還開著才有效 —— 這是誠實的上限） */
  var hideAt = 0, hideTimer = 0;

  function onVis() {
    if (document.visibilityState === 'hidden') {
      hideAt = Date.now();
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(function () {
        if (document.visibilityState !== 'hidden') return;
        if (Date.now() - hideAt < 4.5 * 60000) return;
        var list = items();
        if (list.length) notifySys(list[0].txt);
      }, 5 * 60000);
    } else {
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = 0; }
      refresh(true);
    }
  }

  /* ---------------- 主流程 ---------------- */
  function refresh(silent) {
    try {
      if (ls(KEY_DAY) === todayKey()) { hideBar(); return; }
      /* 只在首頁提示 */
      var menu = document.getElementById('homeMenu');
      if (!menu) return;
      var list = items();
      if (!list.length) { hideBar(); return; }
      wireBar();
      showBar(list);
      if (!silent) ls(KEY_DAY, todayKey());
    } catch (e) {}
  }

  function boot() {
    try {
      refresh(true);
      document.addEventListener('visibilitychange', onVis);
      /* 回到首頁／換語言時重新評估 */
      document.addEventListener('bh:lang', function () { refresh(true); });
      /* 首頁可能是延後才出現的 → 前 30 秒每秒檢查一次，之後停掉 */
      var n = 0;
      var iv = setInterval(function () {
        n++;
        refresh(true);
        if (n > 30) clearInterval(iv);
      }, 1000);
    } catch (e) {
      try { console.error('[notify] 初始化失敗（提醒停用，其他功能照常）:', e); } catch (e2) {}
    }
  }

  var API = {
    items: items, refresh: function () { refresh(true); },
    sysOn: sysOn,
    setSys: function (on) {
      if (on) {
        ls(KEY_ON, '1');
        if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
          try { Notification.requestPermission(); } catch (e) {}
        }
      } else ls(KEY_ON, '0');
      return sysOn();
    },
    canNotify: canNotify
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.__BHNotify = API;
  try { if (typeof module !== 'undefined' && module.exports) module.exports = API; } catch (e) {}
})();
