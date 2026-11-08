/* ================================================================
   爆爆英雄 — 每日挑戰成績卡（v5.56）
   ---------------------------------------------------------------
   為什麼要做：
     每日挑戰的結構其實就是 Wordle —— 全球同一張圖、同一天、比分數。
     但 Wordle 會紅是因為最後那一步：把結果變成一張能貼出去的卡片。
     沒有這一步，成績再好也只有自己看得到。

   做法：
     · 純 canvas 生成（零依賴、不用伺服器截圖）
     · 手機優先呼叫 navigator.share（可以直接進 LINE／IG）
     · 不支援就退回「下載 PNG」，再不行退回「複製文字」

   入口由主檔在結算畫面放一顆 #btnDailyShare，事件在這裡綁。
   ================================================================ */
(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  function BH() { return window.__BH || null; }
  function api(n) { var b = BH(); return (b && b[n]) || null; }

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

  var SITE = 'bomb-hero-game.onrender.com';
  var W = 720, H = 960, DPR = 2;

  function rr(g, x, y, w, h, r) {
    var m = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + m, y);
    g.arcTo(x + w, y, x + w, y + h, m);
    g.arcTo(x + w, y + h, x, y + h, m);
    g.arcTo(x, y + h, x, y, m);
    g.arcTo(x, y, x + w, y, m);
    g.closePath();
  }

  function fmt(ms) {
    var v = Math.max(0, Math.round(ms || 0));
    var m = Math.floor(v / 60000), s = Math.floor((v % 60000) / 1000), d = Math.floor((v % 1000) / 100);
    return m + ':' + (s < 10 ? '0' : '') + s + '.' + d;
  }

  /* ---------------- 畫卡 ---------------- */
  function draw(cv, d) {
    var g = cv.getContext('2d');
    cv.width = W * DPR; cv.height = H * DPR;
    g.setTransform(DPR, 0, 0, DPR, 0, 0);

    /* 底色：深海藍 → 暮紫，加一顆橘色光暈（跟遊戲的火焰同色系） */
    var bg = g.createLinearGradient(0, 0, W * .4, H);
    bg.addColorStop(0, '#141c30');
    bg.addColorStop(.55, '#0d1322');
    bg.addColorStop(1, '#080b14');
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);

    var glow = g.createRadialGradient(W * .82, H * .06, 0, W * .82, H * .06, W * .85);
    glow.addColorStop(0, 'rgba(255,150,60,.34)');
    glow.addColorStop(.4, 'rgba(230,90,30,.12)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = glow;
    g.fillRect(0, 0, W, H);

    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';

    /* 頂部：遊戲名 */
    g.fillStyle = 'rgba(255,220,150,.92)';
    g.font = '700 26px system-ui,-apple-system,"Segoe UI",sans-serif';
    g.fillText('BOMB HERO', 56, 96);
    g.fillStyle = 'rgba(255,255,255,.62)';
    g.font = '700 22px system-ui,-apple-system,"Segoe UI",sans-serif';
    g.fillText('爆爆英雄 · 每日挑戰', 56, 132);

    /* 日期 / 題號 */
    g.fillStyle = 'rgba(255,255,255,.40)';
    g.font = '600 20px system-ui,-apple-system,sans-serif';
    g.textAlign = 'right';
    g.fillText(String(d.day || ''), W - 56, 96);
    if (d.stage) g.fillText(d.stage, W - 56, 132);
    g.textAlign = 'left';

    /* 主數字：成績 */
    var big = fmt(d.ms);
    g.textAlign = 'center';
    g.fillStyle = '#ffffff';
    g.font = '800 148px system-ui,-apple-system,"Segoe UI",sans-serif';
    g.fillText(big, W / 2, 400);
    g.fillStyle = 'rgba(255,190,110,.88)';
    g.font = '600 26px system-ui,-apple-system,sans-serif';
    g.fillText(T('sh.timeLab', null, '完成時間'), W / 2, 448);

    /* 名次徽章 */
    if (d.rank > 0 && d.total > 0) {
      var bw = 340, bh = 92, bx = (W - bw) / 2, by = 510;
      rr(g, bx, by, bw, bh, 26);
      g.fillStyle = 'rgba(255,255,255,.07)';
      g.fill();
      g.strokeStyle = 'rgba(255,200,120,.42)';
      g.lineWidth = 2;
      g.stroke();
      g.fillStyle = '#ffd166';
      g.font = '800 54px system-ui,-apple-system,sans-serif';
      g.fillText('#' + d.rank, W / 2, by + 62);
      g.fillStyle = 'rgba(255,255,255,.55)';
      g.font = '600 20px system-ui,-apple-system,sans-serif';
      g.fillText(T('sh.ofTotal', { n: d.total }, '共 {n} 人'), W / 2, by + 86);
    } else {
      g.fillStyle = 'rgba(255,255,255,.42)';
      g.font = '600 22px system-ui,-apple-system,sans-serif';
      g.fillText(T('sh.offline', null, '離線完成 · 未進榜'), W / 2, 566);
    }

    /* 玩家名 */
    if (d.name) {
      g.fillStyle = 'rgba(255,255,255,.82)';
      g.font = '700 30px system-ui,-apple-system,"Segoe UI",sans-serif';
      g.fillText(String(d.name).slice(0, 12), W / 2, 690);
    }

    /* 底部：一句話 + 網址 */
    g.fillStyle = 'rgba(255,255,255,.34)';
    g.font = '600 20px system-ui,-apple-system,sans-serif';
    g.fillText(T('sh.cta', null, '全球同一張圖 · 你敢來比嗎'), W / 2, 800);
    g.fillStyle = 'rgba(255,210,140,.72)';
    g.font = '700 22px ui-monospace,Menlo,monospace';
    g.fillText(SITE, W / 2, 856);

    g.textAlign = 'start';
    return cv;
  }

  /* ---------------- 預覽面板 ---------------- */
  function ensurePanel() {
    var p = document.getElementById('shPanel');
    if (p) return p;
    var css = ''
      + '#shPanel{position:fixed;inset:0;z-index:1345;display:none;align-items:center;justify-content:center;'
      + 'background:rgba(4,7,14,.74);padding:14px}'
      + '#shPanel.on{display:flex}'
      + '#shPanel .shbox{width:min(420px,100%);max-height:92vh;overflow:auto;border-radius:20px;'
      + 'background:#0f1524;border:1px solid rgba(255,255,255,.13);padding:14px;'
      + 'box-shadow:0 22px 60px rgba(0,0,0,.6)}'
      + '#shPanel img{width:100%;border-radius:14px;display:block}'
      + '#shPanel .shrow{display:flex;gap:8px;margin-top:12px}'
      + '#shPanel .shbtn{flex:1;border:none;border-radius:12px;padding:12px 8px;cursor:pointer;'
      + 'font:700 13px/1.2 system-ui,-apple-system,sans-serif;color:#2a1c08;'
      + 'background:linear-gradient(180deg,#ffd98a,#e8a93c)}'
      + '#shPanel .shbtn.g2{background:rgba(255,255,255,.10);color:#d9e3f5}'
      + '#shPanel .shbtn.g3{background:transparent;color:#8b9ab4;border:1px solid rgba(255,255,255,.14)}';
    var st = document.createElement('style');
    st.id = 'shStyle';
    st.textContent = css;
    document.head.appendChild(st);

    var d = document.createElement('div');
    d.id = 'shPanel';
    d.innerHTML = '<div class="shbox">' +
      '<img alt="成績卡">' +
      '<div class="shrow">' +
      '<button class="shbtn" data-act="share">分享</button>' +
      '<button class="shbtn g2" data-act="save">儲存圖片</button>' +
      '</div>' +
      '<div class="shrow">' +
      '<button class="shbtn g2" data-act="copy">複製文字</button>' +
      '<button class="shbtn g3" data-act="close">關閉</button>' +
      '</div></div>';
    document.body.appendChild(d);
    return d;
  }

  var lastData = null, lastCv = null, lastUrl = '';

  function textOf(d) {
    var lines = [];
    lines.push('🎮 爆爆英雄 · 每日挑戰 ' + (d.day || ''));
    lines.push('⏱ ' + fmt(d.ms));
    if (d.rank > 0) lines.push('🏅 第 ' + d.rank + ' 名 / 共 ' + d.total + ' 人');
    lines.push('👉 ' + SITE);
    return lines.join('\n');
  }

  function copyText(s) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(s).then(function () { return true; }, function () { return legacyCopy(s); });
      }
    } catch (e) {}
    return Promise.resolve(legacyCopy(s));
  }
  function legacyCopy(s) {
    try {
      var ta = document.createElement('textarea');
      ta.value = s;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return !!ok;
    } catch (e) { return false; }
  }

  function toast(msg) {
    try {
      var b = BH();
      if (b && b.toast) b.toast(msg, 2.4);
    } catch (e) {}
  }

  function open(d) {
    lastData = d;
    var panel = ensurePanel();
    var cv = document.createElement('canvas');
    try { draw(cv, d); } catch (e) { toast('⚠️ 生成失敗'); return; }
    lastCv = cv;
    var img = panel.querySelector('img');
    try {
      lastUrl = cv.toDataURL('image/png');
      img.src = lastUrl;
    } catch (e2) { toast('⚠️ 圖片產生失敗'); return; }

    var acts = panel.querySelectorAll('[data-act]');
    for (var i = 0; i < acts.length; i++) {
      acts[i].textContent = acts[i].getAttribute('data-act') === 'share'
        ? T('sh.share', null, '分享')
        : acts[i].getAttribute('data-act') === 'save' ? T('sh.save', null, '儲存圖片')
        : acts[i].getAttribute('data-act') === 'copy' ? T('sh.copy', null, '複製文字')
        : T('sh.close', null, '關閉');
    }
    /* 沒有 share API 就把分享鍵藏起來，免得點了沒反應 */
    var shBtn = panel.querySelector('[data-act="share"]');
    if (shBtn) shBtn.style.display = (navigator.share && navigator.canShare) ? '' : 'none';

    panel.classList.add('on');
  }

  function close() {
    var p = document.getElementById('shPanel');
    if (p) p.classList.remove('on');
  }

  function wire() {
    var p = ensurePanel();
    p.addEventListener('click', function (e) {
      if (e.target === p) return close();
      var b = e.target;
      while (b && b !== p && !b.getAttribute('data-act')) b = b.parentNode;
      if (!b || b === p) return;
      var act = b.getAttribute('data-act');
      try { var A = api('AudioSys'); if (A && A.sfx) A.sfx('click'); } catch (x) {}

      if (act === 'close') return close();
      if (act === 'copy') {
        copyText(textOf(lastData || {})).then(function (ok) {
          toast(ok ? '✅ ' + T('sh.copied', null, '已複製，去貼給朋友吧') : '⚠️ ' + T('sh.copyFail', null, '複製失敗，請長按選取'));
        });
        return;
      }
      if (act === 'save') {
        try {
          var a = document.createElement('a');
          a.download = 'bombhero-daily-' + ((lastData && lastData.day) || 'today') + '.png';
          a.href = lastUrl;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          toast('💾 ' + T('sh.saved', null, '已儲存'));
        } catch (x2) { toast('⚠️ ' + T('sh.saveFail', null, '這個瀏覽器不支援儲存')); }
        return;
      }
      if (act === 'share') {
        if (!lastCv || !navigator.share || !navigator.canShare) return;
        lastCv.toBlob(function (blob) {
          if (!blob) { toast('⚠️ 生成失敗'); return; }
          var file = null;
          try { file = new File([blob], 'bombhero.png', { type: 'image/png' }); } catch (x3) { file = null; }
          if (!file || !navigator.canShare({ files: [file] })) {
            copyText(textOf(lastData || {})).then(function () { toast('📋 ' + T('sh.copied', null, '已複製，去貼給朋友吧')); });
            return;
          }
          navigator.share({ files: [file], text: textOf(lastData || {}) }).catch(function () {});
        }, 'image/png');
      }
    });
  }

  /* ---------------- 對外 ---------------- */
  var Share = {
    make: open,
    close: close,
    text: textOf,
    canvas: function (d) { var cv = document.createElement('canvas'); draw(cv, d); return cv; }
  };

  function boot() {
    try { wire(); } catch (e) {
      try { console.error('[share] 初始化失敗（分享停用，其他功能照常）:', e); } catch (e2) {}
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.__BHShare = Share;
  try { if (typeof module !== 'undefined' && module.exports) module.exports = Share; } catch (e) {}
})();
