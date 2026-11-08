/* ================================================================
   爆爆英雄 — 玩家資訊卡（v5.59）
   ---------------------------------------------------------------
   要解決的問題：排行榜、十項排名、每週榜、對局玩家卡的**名字只是文字**。
   看到一個叫「阿爆」的人打進 1:23，想知道他是誰、玩到哪、戴什麼稱號 ——
   以前完全沒有入口。

   做法（刻意最小侵入）：
     · 不在主檔的每個渲染函式裡插監聽（那要改 6 個地方，而且每次重畫都會掉）。
     · 改成**全域捕獲階段委派**：點下去時才判斷「這是不是一個名字」，
       所以主檔重畫幾次都不影響，主檔一行都不用改。
     · 真正的資料由後端 /api/player/card 提供（只回公開欄位，見 cloud.js 的 pcCard）。
     · 要互動（加好友／私訊／封鎖）就跳到 Social 的完整資料頁 —— 那裡才是能動手的地方。

   刻意「不做」的三種名字：
     1. 畫在 canvas 上的：遊戲中頭頂名牌、大逃殺隊友名條、每日殘影頭上那個名字。
        canvas 沒有節點，要做到可點就得自己做命中測試（打在字上才算），
        而且遊戲進行中被點到反而礙事。
     2. 句子裡的名字：「小明 淘汰了 小華」這種，切開就讀不順。
     3. Social 名單列（.onrow）：那裡本來點了就開完整資料頁，再加一層只會變兩段式。
   ================================================================ */
(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  /* 哪些節點算「可以點的名字」。用最保守的選擇器：只挑確定是名字的那一個節點。 */
  var SEL = [
    '[data-pc]',                    // 手動標記（別的地方要加很容易）
    '.lbrow .nm',                   // 每日榜（結算迷你榜＋完整榜）
    '.rkname',                      // 十項排名
    '.gwrow > span:first-child',    // 每週榜：「1. 名字」——第二格是秒數，不是人
    '#pkRoster .plabel',            // 對局右上玩家卡
    '#onChatWho b',                 // 私訊標題「與 XXX 的對話」
    '#invList .invrow b'            // 一鍵邀好友的名單
  ];
  var HOT = SEL.join(',');

  /* 這些地方不攔：自己有自己的事要做，或根本不是在講玩家 */
  var SKIP = '.onrow,#onBody .onrow,#specBar,#bhModal,#pcModal,input,textarea,select,button';

  var CACHE = {};                   // key → { t: 時間, d: 資料 }
  var TTL = 60000;                  // 一分鐘內重複點同一個人不再打伺服器
  var WAIT = 8000;                  // 伺服器叫不醒時不要讓卡片一直轉
  var inflight = {};
  var cur = null;                   // 目前開著的 { n, pid, d }
  var box = null;                   // 卡片節點（第一次開才建）

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

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function toast(msg, sec) {
    try {
      var b = BH();
      if (b && typeof b.toast === 'function') b.toast(msg, sec || 2.4);
    } catch (e) {}
  }

  function sfx(n) {
    try { var A = api('AudioSys'); if (A && A.sfx) A.sfx(n || 'click'); } catch (e) {}
  }

  function fmtMs(ms) {
    try {
      var b = BH();
      if (b && typeof b.fmtMs === 'function') return b.fmtMs(ms);
    } catch (e) {}
    var s = Math.max(0, Math.round((ms | 0) / 1000));
    return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60);
  }

  /* 時長講「大概」就好 —— 卡片不需要精確到分鐘 */
  function fmtDur(sec) {
    var s = Math.max(0, sec | 0);
    if (s < 60) return T('pc.sec', { n: s }, '{n} 秒');
    if (s < 3600) return T('pc.min', { n: Math.round(s / 60) }, '{n} 分鐘');
    var h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
    return m ? T('pc.hm', { h: h, m: m }, '{h} 小時 {m} 分') : T('pc.hr', { n: h }, '{n} 小時');
  }

  /* v5.61：時間戳的合理範圍（2001 年 ~ 2100 年）。
     低於這個門檻多半是「秒」或被位運算截斷過的壞值，
     硬算會得到 1970 年或「0 天前」，不如直接不顯示。 */
  function okTs(ts) {
    var t = Number(ts) || 0;
    return (t > 1e12 && t < 4e12) ? t : 0;
  }
  /* 「加入」是一個日期概念，看固定日期比「N 天前」清楚，也不會每次看都變。 */
  function fmtDate(ts) {
    var t = okTs(ts);
    if (!t) return '';
    var d = new Date(t);
    var q = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '/' + q(d.getMonth() + 1) + '/' + q(d.getDate());
  }
  function fmtAgo(ts) {
    var t = okTs(ts);
    if (!t) return '';
    var d = Math.max(0, Math.floor((Date.now() - t) / 86400000));
    if (d <= 0) return T('pc.today', null, '今天');
    if (d === 1) return T('pc.d1', null, '昨天');
    if (d < 30) return T('pc.dn', { n: d }, '{n} 天前');
    if (d < 365) return T('pc.mn', { n: Math.floor(d / 30) }, '{n} 個月前');
    return T('pc.yn', { n: Math.floor(d / 365) }, '{n} 年前');
  }

  /* ---------------- 從點到的節點取出名字 ----------------
     週榜是「1. 名字」整串放在同一個 span；對局玩家卡前面有 🤖／👑／🛒 標記。
     這些都要剝掉，不然會拿「1. 阿爆」去查資料，永遠查不到。 */
  function pickName(el) {
    if (!el) return '';
    var n = '';
    try { if (el.hasAttribute && el.hasAttribute('data-pc')) n = el.getAttribute('data-pc') || ''; } catch (e) {}
    if (!n) n = el.textContent || '';
    n = String(n).replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim();
    n = n.replace(/^\d+\s*[.、]\s*/, '');
    n = n.replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu, '').trim();
    return n.slice(0, 24);
  }

  function findHot(el) {
    var node = el;
    while (node && node !== document && node.nodeType === 1) {
      try { if (SKIP && node.matches && node.matches(SKIP)) return null; } catch (e) {}
      try { if (node.matches && node.matches(HOT)) return node; } catch (e2) {}
      node = node.parentNode;
    }
    return null;
  }

  /* ---------------- 樣式（自己注入，主檔的 CSS 不必動） ---------------- */
  function css() {
    if (document.getElementById('pcStyle')) return;
    var st = document.createElement('style');
    st.id = 'pcStyle';
    st.textContent = ''
      + '#pcModal{position:fixed;inset:0;z-index:1360;display:none;align-items:center;justify-content:center;'
      + 'background:rgba(38,26,14,.42);padding:16px;-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px)}'
      + '#pcModal.on{display:flex}'
      + '#pcModal .pcbox{position:relative;width:min(340px,92vw);max-height:86vh;overflow:auto;'
      + 'border-radius:20px;padding:16px 15px 13px;color:#5b3a22;'
      + 'background:linear-gradient(#fffaf0,#fdf2dd);border:1.5px solid #e8cfa4;'
      + 'box-shadow:0 18px 44px rgba(60,38,12,.28),inset 0 1px 0 #fff}'
      + '#pcModal .pcx{position:absolute;top:8px;right:8px;width:30px;height:30px;border-radius:50%;'
      + 'border:none;background:rgba(255,255,255,.72);color:#8a6a45;font-size:15px;line-height:1;cursor:pointer}'
      + '#pcModal .pchead{display:flex;align-items:center;gap:11px;padding-right:26px}'
      + '#pcModal .pcav{width:52px;height:52px;flex:0 0 52px;border-radius:16px;display:grid;place-items:center;'
      + 'font-size:22px;font-weight:900;color:#fff;background:#c98b3a;overflow:hidden;'
      + 'box-shadow:inset 0 -3px 0 rgba(0,0,0,.12),0 3px 10px rgba(120,80,30,.22)}'
      + '#pcModal .pcav img{width:100%;height:100%;object-fit:cover;display:block}'
      + '#pcModal .pcname{font-size:18px;font-weight:900;line-height:1.25;word-break:break-all}'
      + '#pcModal .pcmeta{margin-top:3px;font-size:11.5px;opacity:.86;display:flex;flex-wrap:wrap;gap:5px;align-items:center}'
      + '#pcModal .pcbadge{display:inline-block;padding:1px 7px;border-radius:999px;font-style:normal;'
      + 'font-size:10.5px;font-weight:800;background:#efe1c8;color:#7c5a30}'
      + '#pcModal .pcbadge.m{background:#d8ecd9;color:#2c6b3d}'
      + '#pcModal .pcbadge.on{background:#d6ecff;color:#1d5c94}'
      + '#pcModal .pctt{display:inline-block;padding:1px 8px;border-radius:999px;font-size:11px;font-weight:800}'
      + '#pcModal .pceq{margin-top:9px;font-size:16px;letter-spacing:3px;min-height:0}'
      + '#pcModal .pcgrid{margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:6px}'
      + '#pcModal .pccell{background:rgba(255,255,255,.66);border:1px solid #eddcbf;border-radius:11px;'
      + 'padding:6px 8px;font-size:11px;line-height:1.25;color:#8a6a45}'
      + '#pcModal .pccell b{display:block;font-size:13px;color:#4a2f1a;margin-top:1px;word-break:break-all}'
      + '#pcModal .pcbio{margin-top:9px;font-size:12.5px;line-height:1.45;background:rgba(255,255,255,.6);'
      + 'border:1px dashed #e3cda6;border-radius:11px;padding:7px 9px}'
      + '#pcModal .pcact{margin-top:11px;display:flex;gap:8px;flex-wrap:wrap}'
      + '#pcModal .pcact button{flex:1 1 0;min-width:104px;border:none;border-radius:13px;padding:10px 12px;'
      + 'font-size:13px;font-weight:800;cursor:pointer;color:#fff;background:#c98b3a;'
      + 'box-shadow:inset 0 -3px 0 rgba(0,0,0,.16),0 3px 9px rgba(140,90,30,.2)}'
      + '#pcModal .pcact button.ghost{background:rgba(255,255,255,.86);color:#8a6a45;border:1.5px solid #e8cfa4;'
      + 'box-shadow:none}'
      + '#pcModal .pcact button:active{transform:translateY(1px)}'
      + '#pcModal .pcnote{margin-top:9px;font-size:11.5px;line-height:1.4;color:#a07a4c;text-align:center}'
      + '#pcModal .pcload{opacity:.72}'
      /* 滑過去的提示：只加 cursor 與虛線，不動版面 */
      + '.lbrow .nm,.rkname,.gwrow>span,#onChatWho b,#invList .invrow b,#pkRoster .plabel{cursor:pointer}'
      + '.lbrow .nm:hover,.rkname:hover,.gwrow>span:hover,#onChatWho b:hover,#invList .invrow b:hover'
      + '{text-decoration:underline dotted;text-underline-offset:3px}'
      + '@media (max-height:430px){#pcModal .pcbox{max-height:94vh;padding:12px 13px 10px}'
      + '#pcModal .pcav{width:42px;height:42px;flex:0 0 42px;font-size:18px}}';
    (document.head || document.documentElement).appendChild(st);
  }

  function build() {
    if (box) return box;
    css();
    var m = document.createElement('div');
    m.id = 'pcModal';
    m.innerHTML = '<div class="pcbox">' +
      '<button class="pcx" id="pcX" type="button" tabindex="-1" aria-label="關閉">✕</button>' +
      '<div class="pchead"><div class="pcav" id="pcAv"></div><div style="min-width:0">' +
      '<div class="pcname" id="pcName"></div><div class="pcmeta" id="pcMeta"></div></div></div>' +
      '<div class="pceq" id="pcEq"></div>' +
      '<div class="pcgrid" id="pcGrid"></div>' +
      '<div class="pcbio" id="pcBio" style="display:none"></div>' +
      '<div class="pcact" id="pcAct"></div>' +
      '<div class="pcnote" id="pcNote"></div>' +
      '</div>';
    (document.body || document.documentElement).appendChild(m);
    m.addEventListener('click', function (e) {
      if (e.target === m) { close(); return; }
      var t = e.target;
      if (!t || !t.closest) return;
      if (t.closest('#pcX')) { sfx('click'); close(); }
      else if (t.closest('#pcMore')) { more(); }
      else if (t.closest('#pcCopy')) { copyName(); }
    });
    document.addEventListener('keydown', function (e) {
      if (e && e.key === 'Escape' && m.classList.contains('on')) close();
    });
    box = m;
    return box;
  }

  function el(id) { return box ? box.querySelector('#' + id) : null; }

  function initial(n) { return String(n || '?').trim().slice(0, 1) || '?'; }

  function paintHead(n, d, loading) {
    var nm = el('pcName'), meta = el('pcMeta'), av = el('pcAv'), eEq = el('pcEq');
    if (!nm) return;
    nm.textContent = n || T('pc.anon', null, '無名玩家');
    var bits = [];
    if (d) {
      bits.push(d.k === 'member'
        ? '<i class="pcbadge m">' + esc(T('pc.member', null, '會員')) + '</i>'
        : '<i class="pcbadge">' + esc(T('pc.guest', null, '遊客')) + '</i>');
      if (d.online) bits.push('<i class="pcbadge on">' + esc(T('pc.online', null, '在線')) + '</i>');
      else if (fmtAgo(d.seen)) bits.push('<span>' + esc(T('pc.last', { t: fmtAgo(d.seen) }, '{t}上線')) + '</span>');
      var t = titleOf(d.tt);
      if (t) bits.push('<span class="pctt" style="color:' + esc(t.color) + ';background:' + esc(t.bg) + '">' +
        esc(t.ico) + ' ' + esc(t.name) + '</span>');
      if (d.mode) bits.push('<span>' + esc(d.mode) + '</span>');
    } else if (loading) {
      bits.push('<span class="pcload">' + esc(T('pc.loading', null, '讀取中…')) + '</span>');
    }
    meta.innerHTML = bits.join('');
    av.textContent = initial(n);
    av.style.background = colorOf(n);
    if (eEq) {
      var eq = '';
      if (d && Array.isArray(d.eq)) {
        for (var i = 0; i < d.eq.length && i < 3; i++) {
          var it = d.eq[i];
          eq += esc(typeof it === 'string' ? it : (it && it.i) || '');
        }
      }
      eEq.textContent = eq;
    }
    /* 有頭貼才去抓（沒有就維持色球，不要多打一次 API） */
    if (d && d.pid && d.avt) loadAvatar(d.pid, av, n);
  }

  function colorOf(n) {
    var h = 0, s = String(n || '');
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    var pal = ['#c98b3a', '#3f7cf0', '#2f9b6d', '#b4553f', '#7a5cc4', '#2f8fa8'];
    return pal[h % pal.length];
  }

  function loadAvatar(pid, node, n) {
    try {
      var L = api('Lb');
      if (!L || !L._get) { node.textContent = initial(n); return; }
      L._get(L.origin() + '/api/social/av?pids=' + encodeURIComponent(pid)).then(function (j) {
        var d = j && j.ok && j.av && j.av[pid] && j.av[pid].d;
        if (!d || !node) { return; }
        node.innerHTML = '<img alt="">';
        var im = node.querySelector('img');
        if (im) im.src = d;
      }, function () {});
    } catch (e) {}
  }

  function titleOf(no) {
    var i = parseInt(no, 10);
    if (!(i >= 0)) return null;
    var A = null;
    try { A = api('Ach'); } catch (e) {}
    if (!A) return null;
    if (i === 8) return A.DEV_TITLE || null;
    return (A.TITLES && A.TITLES[i]) || null;
  }

  function cell(label, val) {
    if (!val) return '';
    return '<div class="pccell">' + esc(label) + '<b>' + esc(val) + '</b></div>';
  }

  function paintBody(d, n) {
    var grid = el('pcGrid'), bio = el('pcBio'), note = el('pcNote'), act = el('pcAct');
    if (!grid) return;
    if (!d) {
      grid.innerHTML = '';
      if (bio) { bio.style.display = 'none'; bio.textContent = ''; }
      if (act) act.innerHTML = '';
      if (note) note.textContent = n
        ? T('pc.notFound', null, '查不到這位玩家的公開資料 —— 可能換過名字，或還沒上傳過任何紀錄。')
        : '';
      return;
    }
    var cells = '';
    if (d.lv > 0) cells += cell(T('pc.lv', null, '等級'), 'Lv.' + d.lv);
    if (d.cleared > 0) cells += cell(T('pc.cleared', null, 'RPG 通關'), d.cleared + ' ' + T('pc.stages', null, '關'));
    if (d.stage > 0) cells += cell(T('pc.stage', null, '最高關卡'), String(d.stage));
    if (d.stars > 0) cells += cell(T('pc.stars', null, '三星'), String(d.stars));
    if (d.best > 0) cells += cell(T('pc.best', null, '每日最佳'), fmtMs(d.best));
    if (d.sec > 0) cells += cell(T('pc.play', null, '累積遊玩'), fmtDur(d.sec));
    if (d.pts > 0) cells += cell(T('pc.pts', null, '成就分'), String(d.pts));
    if (d.wins > 0) cells += cell(T('pc.wins', null, '冠軍次數'), String(d.wins));
    var who = [];
    if (d.g) who.push(d.g);
    if (d.r) who.push(d.r);
    if (who.length) cells += cell(T('pc.from', null, '來自'), who.join(' · '));
    var jd = fmtDate(d.join);
    if (jd) cells += cell(T('pc.join', null, '加入'), jd);
    grid.innerHTML = cells;

    if (bio) {
      if (d.b) { bio.style.display = ''; bio.textContent = '💬 ' + d.b; }
      else { bio.style.display = 'none'; bio.textContent = ''; }
    }

    if (act) {
      var canMore = !!(d.pid && api('Social') && typeof api('Social').showPlayer === 'function');
      act.innerHTML = (canMore
        ? '<button id="pcMore" type="button" tabindex="-1">' + esc(T('pc.more', null, '看完整資料')) + '</button>' : '') +
        '<button id="pcCopy" class="ghost" type="button" tabindex="-1">' +
        esc(T('pc.copy', null, '複製名字')) + '</button>';
    }
    if (note) note.textContent = d.pid ? '' : T('pc.noPid', null, '這位玩家目前不在線上名單裡，只能看到公開紀錄。');
  }

  /* ---------------- 抓資料 ----------------
     快取 60 秒：榜單上同一個人常常被連點。
     8 秒上限：Render 免費實例冷啟動時會很慢，不能讓卡片一直轉圈。
     ------------------------------------------- */
  function fetchCard(pid, name) {
    var key = pid ? 'p:' + pid : 'n:' + name;
    var c = CACHE[key];
    if (c && Date.now() - c.t < TTL) return Promise.resolve(c.d);
    if (inflight[key]) return inflight[key];
    var base = '';
    try { var L = api('Lb'); if (L && typeof L.origin === 'function') base = L.origin(); } catch (e) {}
    var url = base + '/api/player/card?' +
      (pid ? 'pid=' + encodeURIComponent(pid) : 'n=' + encodeURIComponent(name));
    var p = new Promise(function (res) {
      var done = false;
      var tm = setTimeout(function () { if (!done) { done = true; res(null); } }, WAIT);
      function fin(v) { if (done) return; done = true; clearTimeout(tm); res(v); }
      try {
        if (typeof fetch !== 'function') return fin(null);
        fetch(url, { credentials: 'omit' }).then(function (r) {
          return r.json().then(function (j) { fin((j && j.ok && j.found) ? j : null); },
            function () { fin(null); });
        }, function () { fin(null); });
      } catch (e2) { fin(null); }
    }).then(function (d) {
      delete inflight[key];
      if (d) CACHE[key] = { t: Date.now(), d: d };
      return d;
    });
    inflight[key] = p;
    return p;
  }

  /* ---------------- 開／關 ---------------- */
  function open(name, opt) {
    var n = String(name == null ? '' : name).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 24);
    if (!n) return false;
    opt = opt || {};
    build();
    cur = { n: n, pid: opt.pid || '', d: null };
    box.classList.add('on');
    paintHead(n, null, true);
    paintBody(null, '');
    sfx('click');
    fetchCard(opt.pid || '', n).then(function (d) {
      if (!cur || cur.n !== n) return;          // 期間被點去別人了
      cur.d = d;
      if (d) cur.pid = d.pid || cur.pid;
      paintHead(n, d, false);
      paintBody(d, n);
    });
    return true;
  }

  function close() {
    if (box) box.classList.remove('on');
    cur = null;
  }

  function more() {
    if (!cur || !cur.d || !cur.d.pid) return;
    var S = api('Social');
    if (!S || typeof S.showPlayer !== 'function') return;
    var ok = false;
    try { ok = S.showPlayer(cur.d); } catch (e) { ok = false; }
    if (!ok) { toast(T('pc.noMore', null, '這位玩家目前不在線上名單裡'), 2.4); return; }
    close();
  }

  function copyName() {
    if (!cur) return;
    var n = cur.n;
    var done = function () {
      toast(T('pc.copied', { n: n }, '已複製「{n}」'), 2);
      var note = el('pcNote');
      if (note) note.textContent = T('pc.copied', { n: n }, '已複製「{n}」');
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(n).then(done, fallback);
        return;
      }
    } catch (e) {}
    fallback();
    function fallback() {
      try {
        var ta = document.createElement('textarea');
        ta.value = n;
        ta.setAttribute('readonly', 'readonly');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        done();
      } catch (e2) { toast(T('pc.copyFail', null, '複製失敗，請長按名字手動複製'), 2.4); }
    }
  }

  /* ---------------- 全域委派（捕獲階段） ---------------- */
  function onDocClick(e) {
    if (!e || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var hot = findHot(e.target);
    if (!hot) return;
    /* 每週榜整列只有第一格是名字，而且一定要是「1. 名字」；
       空榜時那一格是「本週還沒有人上榜」—— 別把它當人名去查。 */
    if (hot.closest && hot.closest('.gwrow') &&
        !/^\d+\s*[.、]/.test(String(hot.textContent || '').trim())) return;
    var n = pickName(hot);
    if (!n) return;
    if (/已離線|已离线/.test(n)) return;
    /* pid 可能寫在名字節點上，也可能寫在外層那一列（榜單就是寫在 .lbrow 上）。
       有 pid 就用 pid 查 —— 名字會改、也可能跟 brName 不一樣，比名字可靠得多。 */
    var pid = '';
    try {
      pid = hot.getAttribute('data-pid') || '';
      if (!pid && hot.closest) {
        var row = hot.closest('[data-pid]');
        if (row) pid = row.getAttribute('data-pid') || '';
      }
    } catch (e2) { pid = ''; }
    if (!/^p_[0-9a-f]{10}$/.test(pid)) pid = '';
    var btn = e.target && e.target.closest ? e.target.closest('button,a') : null;
    if (btn && !btn.closest('#pcModal')) return;   // 名字外層是顆按鈕（例如加入房間）→ 不搶
    open(n, { pid: pid });
  }

  function boot() {
    try {
      css();
      document.addEventListener('click', onDocClick, true);
    } catch (e) {
      try { console.error('[playercard] 初始化失敗（名字不可點，其他功能不受影響）:', e); } catch (e2) {}
    }
  }

  var API = {
    open: open, close: close, SEL: SEL, SKIP: SKIP, HOT: HOT,
    pickName: pickName, card: fetchCard, titleOf: titleOf,
    state: function () { return { open: !!(box && box.classList.contains('on')), cur: cur, cache: Object.keys(CACHE) }; },
    clear: function () { CACHE = {}; inflight = {}; }
  };
  window.__BHPlayerCard = API;
  try { if (typeof module !== 'undefined' && module.exports) module.exports = API; } catch (e) {}

  boot();
})();
