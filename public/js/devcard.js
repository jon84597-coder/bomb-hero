/* ================================================================
   爆爆英雄 — 開發者：玩家後台資料卡（v5.89）
   ----------------------------------------------------------------
   需求：開發者在遊戲裡看到某個玩家（排行榜、好友名單、線上名單、
   對局玩家卡），除了公開名片之外，要能直接點進「這個人的後台詳細資料」。
   一般玩家完全看不到這個入口。

   四條硬規則：
     1. 只有開發者看得到 —— 入口（按鈕）由呼叫端以 isDev() 決定要不要渲染，
        這裡 open() 再擋一次。兩邊都不看 DEV_BUILD 以外的猜測。
     2. 後端才是防線 —— 打的是 /api/admin/player?pid=…（session + isDev + 限流）。
        前端藏按鈕只是體貼，不是安全機制。
     3. 唯讀 —— 這一版只「看」，不改任何人的存檔。要動手請按「完整後台」。
     4. 不改主檔 —— 獨立檔案、自己注入 CSS、自己開一個彈窗，
        主檔只多一行 <script>（比塞進 main.js 更省預算，也更好維護）。

   為什麼要另外做一個面板，而不是直接開 #bhModal：
     完整後台是「先找帳號、再看資料」的流程，它需要帳號 id（u_xxxx）。
     而遊戲內拿到的是社交編號（p_xxxx），兩套 id 沒有共同欄位。
     這個面板吃 pid，自己跟後端要對應結果，開發者少做一步「回後台搜名字」。
   ================================================================ */
(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  var Z = 1450;            // 比玩家名片（1360）與帳號中心（1250）都高
  var WAIT = 9000;         // Render 免費實例冷啟動很慢，但不能讓面板一直轉
  var box = null;          // 面板節點（第一次開才建）
  var cur = null;          // { pid, name, uid, d }
  var reqN = 0;            // 請求序號：連點兩個人時只認最後一次的結果

  function BH() { return window.__BH || null; }
  function api(n) { var b = BH(); return (b && b[n]) || null; }

  /* 開發者判定：Cloud.isDev() 內部就是 DEV_BUILD || 帳號的 dev 旗標，
     跟後台入口、Admin.open() 用的是同一個來源。 */
  function isDev() {
    try {
      var C = api('Cloud');
      if (C && typeof C.isDev === 'function' && C.isDev()) return true;
    } catch (e) {}
    return false;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function toast(msg, sec) {
    try {
      var b = BH();
      if (b && typeof b.toast === 'function') { b.toast(msg, sec || 2.6); return; }
    } catch (e) {}
    try { console.log('[devcard]', msg); } catch (e2) {}
  }

  function sfx(n) {
    try { var A = api('AudioSys'); if (A && A.sfx) A.sfx(n || 'click'); } catch (e) {}
  }

  function origin() {
    try { var L = api('Lb'); if (L && typeof L.origin === 'function') return L.origin(); } catch (e) {}
    return '';
  }

  /* ---------------- 格式化 ---------------- */
  function fmtDur(sec) {
    var s = Math.max(0, sec | 0);
    if (s < 60) return s + ' 秒';
    var h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
    if (h <= 0) return m + ' 分';
    return h + ' 小時 ' + (m ? m + ' 分' : '');
  }
  function fmtMs(ms) {
    try {
      var b = BH();
      if (b && typeof b.fmtMs === 'function') return b.fmtMs(ms);
    } catch (e) {}
    var t = Math.max(0, Math.round((ms | 0) / 1000));
    return Math.floor(t / 60) + ':' + (t % 60 < 10 ? '0' : '') + (t % 60);
  }
  /* 後端已經給了台灣時間字串（createdStr／lastSeenStr）就直接用，
     沒有才自己算 —— 不要在裝置時區上再算一次，那樣會差 8 小時。 */
  var TW = 8 * 3600 * 1000;
  function dt(ms) {
    var t = Number(ms) || 0;
    if (!t) return '';
    try {
      var d = new Date(t + TW), q = function (n) { return (n < 10 ? '0' : '') + n; };
      return d.getUTCFullYear() + '-' + q(d.getUTCMonth() + 1) + '-' + q(d.getUTCDate()) +
        ' ' + q(d.getUTCHours()) + ':' + q(d.getUTCMinutes());
    } catch (e) { return ''; }
  }
  function ago(ms) {
    var t = Number(ms) || 0;
    if (!t) return '';
    var s = Math.max(0, Math.floor((Date.now() - t) / 1000));
    if (s < 60) return s + ' 秒前';
    if (s < 3600) return Math.floor(s / 60) + ' 分前';
    if (s < 86400) return Math.floor(s / 3600) + ' 小時前';
    return Math.floor(s / 86400) + ' 天前';
  }

  /* ---------------- 樣式 ---------------- */
  function css() {
    if (document.getElementById('dvcStyle')) return;
    var st = document.createElement('style');
    st.id = 'dvcStyle';
    st.textContent = ''
      + '#dvcModal{position:fixed;inset:0;z-index:' + Z + ';display:none;align-items:center;justify-content:center;'
      + 'padding:14px;background:rgba(4,7,12,.78);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px)}'
      + '#dvcModal.on{display:flex}'
      + '#dvcModal .dvbox{position:relative;width:min(520px,96vw);max-height:90vh;display:flex;flex-direction:column;'
      + 'border-radius:16px;overflow:hidden;color:#dfe7f3;background:#0e131b;'
      + 'border:1px solid #263346;box-shadow:0 24px 60px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.05)}'
      /* 標題列 */
      + '#dvcModal .dvhead{display:flex;align-items:center;gap:11px;padding:13px 14px 12px;'
      + 'background:linear-gradient(#182231,#111926);border-bottom:1px solid #263346;flex:0 0 auto}'
      + '#dvcModal .dvav{width:42px;height:42px;flex:0 0 42px;border-radius:12px;display:grid;place-items:center;'
      + 'font-size:18px;font-weight:900;color:#0e131b;background:#f0b24a;overflow:hidden}'
      + '#dvcModal .dvav img{width:100%;height:100%;object-fit:cover;display:block}'
      + '#dvcModal .dvttl{min-width:0;flex:1 1 auto}'
      + '#dvcModal .dvname{font-size:15.5px;font-weight:900;line-height:1.2;white-space:nowrap;'
      + 'overflow:hidden;text-overflow:ellipsis}'
      + '#dvcModal .dvsub{margin-top:3px;font-size:11px;color:#8ea3c6;line-height:1.35;'
      + 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
      + '#dvcModal .dvtag{display:inline-block;margin-left:5px;padding:0 6px;border-radius:6px;'
      + 'font-size:10px;font-weight:800;vertical-align:1px;background:#2b3a55;color:#a9c2e8}'
      + '#dvcModal .dvtag.dev{background:#5a3d0f;color:#ffcf7a}'
      + '#dvcModal .dvtag.ban{background:#5c1f24;color:#ff9aa5}'
      + '#dvcModal .dvtag.on{background:#123a2a;color:#6ee7a8}'
      + '#dvcModal .dvx{flex:0 0 auto;width:30px;height:30px;border-radius:9px;border:1px solid #2b3a55;'
      + 'background:#16202e;color:#8ea3c6;font-size:14px;line-height:1;cursor:pointer}'
      + '#dvcModal .dvx:active{transform:translateY(1px)}'
      /* 內容 */
      + '#dvcModal .dvbody{flex:1 1 auto;overflow:auto;padding:12px 14px 4px;-webkit-overflow-scrolling:touch}'
      + '#dvcModal .dvsec{margin-bottom:13px}'
      + '#dvcModal .dvsh{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:900;'
      + 'letter-spacing:.09em;color:#7f95b8;text-transform:uppercase;margin-bottom:6px}'
      + '#dvcModal .dvsh:after{content:"";flex:1 1 auto;height:1px;background:#1e293a}'
      + '#dvcModal .dvsh em{font-style:normal;font-size:10px;letter-spacing:0;color:#5e7a9e;text-transform:none}'
      + '#dvcModal .dvgrid{display:grid;grid-template-columns:1fr 1fr;gap:5px}'
      + '#dvcModal .dvcell{background:#151d29;border:1px solid #202c3e;border-radius:9px;'
      + 'padding:6px 8px;min-width:0}'
      + '#dvcModal .dvcell.w{grid-column:1 / -1}'
      + '#dvcModal .dvcell i{display:block;font-style:normal;font-size:10px;color:#7f95b8;line-height:1.3}'
      + '#dvcModal .dvcell b{display:block;margin-top:2px;font-size:12.5px;font-weight:800;'
      + 'color:#e8eefb;line-height:1.35;word-break:break-all}'
      + '#dvcModal .dvcell b.mono{font-family:ui-monospace,Consolas,monospace;font-size:11.5px}'
      + '#dvcModal .dvcell b.ok{color:#6ee7a8}'
      + '#dvcModal .dvcell b.warn{color:#ffcf7a}'
      + '#dvcModal .dvcell b.bad{color:#ff9aa5}'
      + '#dvcModal .dvchips{display:flex;flex-wrap:wrap;gap:4px;margin-top:2px}'
      + '#dvcModal .dvchip{font-size:11px;font-weight:800;padding:2px 7px;border-radius:7px;'
      + 'background:#1d2a3d;color:#a9c2e8;border:1px solid #27364c}'
      + '#dvcModal .dvnote{margin:2px 0 10px;font-size:11.5px;line-height:1.5;color:#8ea3c6;'
      + 'background:#131b26;border:1px dashed #27364c;border-radius:9px;padding:8px 10px}'
      + '#dvcModal .dvnote b{color:#ffcf7a}'
      + '#dvcModal .dvlog{font-size:11px;line-height:1.6;color:#9fb3d1;'
      + 'font-family:ui-monospace,Consolas,monospace}'
      + '#dvcModal .dvlog div{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
      + '#dvcModal .dvlog time{color:#5e7a9e}'
      + '#dvcModal .dvload{padding:26px 0;text-align:center;font-size:12.5px;color:#8ea3c6}'
      + '#dvcModal .dvload .sp{display:inline-block;width:14px;height:14px;margin-right:7px;'
      + 'border:2px solid #2b3a55;border-top-color:#f0b24a;border-radius:50%;'
      + 'vertical-align:-2px;animation:dvcspin .7s linear infinite}'
      + '@keyframes dvcspin{to{transform:rotate(360deg)}}'
      /* 底部操作 */
      + '#dvcModal .dvbar{flex:0 0 auto;display:flex;gap:7px;padding:10px 14px 12px;'
      + 'background:#111926;border-top:1px solid #263346}'
      + '#dvcModal .dvbar button{flex:1 1 0;min-width:0;border:1px solid #2b3a55;border-radius:10px;'
      + 'padding:9px 8px;font-size:12px;font-weight:800;cursor:pointer;color:#cfdcef;background:#182231}'
      + '#dvcModal .dvbar button.main{background:#f0b24a;color:#1a1206;border-color:#f0b24a}'
      + '#dvcModal .dvbar button:active{transform:translateY(1px)}'
      + '#dvcModal .dvbar button[disabled]{opacity:.42;cursor:default;transform:none}'
      + '@media (max-width:420px){#dvcModal .dvgrid{grid-template-columns:1fr}'
      + '#dvcModal .dvbar button{font-size:11.5px;padding:9px 4px}}';
    (document.head || document.documentElement).appendChild(st);
  }

  /* ---------------- 建面板 ---------------- */
  function build() {
    if (box) return box;
    css();
    var m = document.createElement('div');
    m.id = 'dvcModal';
    m.innerHTML = '<div class="dvbox">' +
      '<div class="dvhead"><div class="dvav" id="dvAv">?</div>' +
      '<div class="dvttl"><div class="dvname" id="dvName">—</div>' +
      '<div class="dvsub" id="dvSub"></div></div>' +
      '<button class="dvx" id="dvX" type="button" aria-label="關閉">✕</button></div>' +
      '<div class="dvbody" id="dvBody"></div>' +
      '<div class="dvbar" id="dvBar"></div>' +
      '</div>';
    (document.body || document.documentElement).appendChild(m);

    m.addEventListener('click', function (e) {
      if (e.target === m) { close(); return; }
      var t = e.target;
      if (!t || !t.closest) return;
      if (t.closest('#dvX')) { sfx('click'); close(); }
      else if (t.closest('#dvCopy')) { copyUid(); }
      else if (t.closest('#dvFull')) { fullAdmin(); }
      else if (t.closest('#dvAgain')) { reload(); }
    });
    document.addEventListener('keydown', function (e) {
      if (e && e.key === 'Escape' && m.classList.contains('on')) close();
    });
    box = m;
    return box;
  }

  function el(id) { return box ? box.querySelector('#' + id) : null; }

  function initial(n) { return String(n || '?').trim().slice(0, 1) || '?'; }

  function colorOf(n) {
    var h = 0, s = String(n || '');
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    var pal = ['#f0b24a', '#5b9bf5', '#4fd1a5', '#f0836a', '#a98bf0', '#54c3d6'];
    return pal[h % pal.length];
  }

  /* ---------------- 小積木 ---------------- */
  function cell(label, val, cls) {
    if (val == null || val === '') return '';
    return '<div class="dvcell"><i>' + esc(label) + '</i><b' +
      (cls ? ' class="' + cls + '"' : '') + '>' + esc(val) + '</b></div>';
  }
  function cellW(label, val, cls) {
    if (val == null || val === '') return '';
    return '<div class="dvcell w"><i>' + esc(label) + '</i><b' +
      (cls ? ' class="' + cls + '"' : '') + '>' + esc(val) + '</b></div>';
  }
  function chips(label, arr) {
    if (!arr || !arr.length) return '';
    var h = '';
    for (var i = 0; i < arr.length; i++) h += '<span class="dvchip">' + esc(arr[i]) + '</span>';
    return '<div class="dvcell w"><i>' + esc(label) + '</i><div class="dvchips">' + h + '</div></div>';
  }
  function sec(title, inner, right) {
    if (!inner) return '';
    return '<div class="dvsec"><div class="dvsh">' + esc(title) +
      (right ? '<em>' + esc(right) + '</em>' : '') + '</div><div class="dvgrid">' + inner + '</div></div>';
  }

  /* ---------------- 畫 ---------------- */
  function paintHead(d) {
    var nm = el('dvName'), sub = el('dvSub'), av = el('dvAv');
    if (!nm) return;
    var a = d && d.account, s = d && d.soc;
    var name = (a && a.name) || (s && s.name) || (cur && cur.name) || '（無名）';
    nm.textContent = name;
    av.textContent = initial(name);
    av.style.background = colorOf(name);

    var bits = [];
    if (a) {
      bits.push(a.kind === 'member' ? '會員' : '遊客');
      if (a.dev) bits.push('<span class="dvtag dev">開發者</span>');
      if (a.banned) bits.push('<span class="dvtag ban">已停權</span>');
      if (a.online) bits.push('<span class="dvtag on">在線</span>');
      bits.push(esc(String(a.id || '')));
    } else if (s && s.found) {
      bits.push('只有社交身分');
      if (s.online) bits.push('<span class="dvtag on">在線</span>');
      bits.push(esc(s.pid));
    } else {
      bits.push('查無資料');
    }
    sub.innerHTML = bits.join(' · ');

    /* 有頭貼才去抓（省一次請求） */
    if (s && s.found && s.avt) loadAvatar(s.pid, av, name);
  }

  function loadAvatar(pid, node, name) {
    try {
      var L = api('Lb');
      if (!L || !L._get) return;
      L._get(L.origin() + '/api/social/av?pids=' + encodeURIComponent(pid)).then(function (j) {
        var d = j && j.ok && j.av && j.av[pid] && j.av[pid].d;
        if (!d || !node) return;
        node.innerHTML = '<img alt="">';
        var im = node.querySelector('img');
        if (im) im.src = d;
      }, function () {});
    } catch (e) {}
  }

  var ST_NAME = { auto: '自動', busy: '忙碌', idle: '閒置', away: '不在位子上', custom: '自訂' };

  function bodyHTML(d) {
    var a = d && d.account, s = d && d.soc, sv = d && d.save;
    var out = '';

    if (!a && !(s && s.found)) {
      return '<div class="dvnote">查不到這個人的任何紀錄 —— 可能剛換名字、還沒上傳過存檔，' +
        '或是資料已被清掉。</div>';
    }

    /* ---- 社交身分 ---- */
    if (s && s.found) {
      var stTxt = (ST_NAME[s.st] || s.st || '') + (s.stx ? '（' + s.stx + '）' : '');
      out += sec('社交身分',
        cell('社交編號', s.pid, 'mono') +
        cell('狀態', stTxt) +
        cell('遊樂區域', s.mode || '大廳') +
        cell('性別', s.gender || '不公開') +
        cell('地區', s.region || '—') +
        cell('最後心跳', ago(s.seen) + (s.seen ? '（' + dt(s.seen) + '）' : '')) +
        cell('好友 / 邀請 / 封鎖', (s.nFriends | 0) + ' / ' + (s.nReqs | 0) + ' / ' + (s.nBlocks | 0)) +
        cell('私訊訊息數', String(s.dm | 0)) +
        cell('累積遊玩', fmtDur(s.sec)) +
        cell('成就分 / 冠軍', (s.pts | 0) + ' / ' + (s.wins | 0)) +
        (s.bio ? cellW('自介', '💬 ' + s.bio) : ''),
        'p_ 開頭');
    }

    /* ---- 帳號 ---- */
    if (a) {
      var provMap = { guest: '裝置（遊客）', web: '帳密', google: 'Google', facebook: 'Facebook', line: 'LINE' };
      out += sec('帳號',
        cell('UID', a.id, 'mono') +
        cell('類型', a.kind === 'member' ? '註冊會員' : '遊客') +
        cell('註冊方式', provMap[a.provider] || a.provider || '—') +
        cell('使用者名稱', a.username || '—') +
        cell('Email', a.email || '—') +
        cell('密碼', a.hasPass ? '已設定' : '未設定', a.hasPass ? 'ok' : '') +
        cell('第三方 ID', a.sub || '—', 'mono') +
        cell('目前 IP', a.ip || '—', 'mono') +
        cell('首次 IP', a.firstIp || '—', 'mono') +
        (a.ips && a.ips.length > 1 ? cellW('近期 IP', a.ips.join('、'), 'mono') : '') +
        cell('加入時間', a.createdStr || dt(a.created)) +
        cell('最後上線', (a.lastSeenStr || dt(a.lastSeen)) +
          (a.lastSeen ? '（' + ago(a.lastSeen) + '）' : '')) +
        cell('登入次數', String(a.logins | 0)) +
        cell('累計遊玩', fmtDur(a.playSec)) +
        cell('今日場次', String(a.playsToday | 0)) +
        (a.lastPlay ? cellW('最後一場',
          (a.lastPlay.mode || a.lastPlay.type || '—') +
          (a.lastPlay.stage ? ' · 第 ' + a.lastPlay.stage + ' 關' : '') +
          (a.lastPlay.t ? ' · ' + dt(a.lastPlay.t) : '')) : '') +
        (a.banned ? cellW('停權原因', (a.banned.reason || '（未填寫）') + ' · ' + dt(a.banned.at), 'bad') : '')
      );
    }

    /* ---- 遊戲進度 ---- */
    if (a) {
      var pts = (a.points | 0), used = (a.spent | 0);
      out += sec('遊戲進度',
        cell('最高關卡', String(a.cleared | 0)) +
        cell('RPG 等級', 'Lv.' + (a.lv | 0)) +
        cell('經驗值', String(a.xp | 0)) +
        cell('金幣', String(a.gold | 0)) +
        (sv ? cell('星數', String(sv.stars | 0)) : '') +
        cell('配點 已用 / 總', used + ' / ' + pts) +
        (sv && sv.stage ? cell('存檔關卡', String(sv.stage)) : '') +
        (sv && sv.tickets ? cell('票券', String(sv.tickets)) : '')
      );
    }

    /* ---- 存檔細節 ---- */
    if (sv) {
      var petTxt = [];
      (sv.pets || []).forEach(function (p) {
        petTxt.push((p.kind || '?') + ' Lv.' + (p.lv | 0) + (p.ch ? ' #' + p.ch : ''));
      });
      var bestKey = '', bestMs = 0;
      if (sv.daily) {
        for (var k in sv.daily) {
          var ms = sv.daily[k] | 0;
          if (ms > 0 && (!bestMs || ms < bestMs)) { bestMs = ms; bestKey = k; }
        }
      }
      out += sec('存檔',
        (bestMs ? cell('每日最佳', fmtMs(bestMs) + (bestKey ? '（' + bestKey + '）' : '')) : '') +
        (sv.achN ? cell('成就解鎖', String(sv.achN)) : '') +
        (sv.skins ? cell('外觀擁有', String(sv.skins)) : '') +
        (sv.tut ? cell('教學', (sv.tut.home ? '大廳✓ ' : '大廳✗ ') + (sv.tut.play ? '對局✓' : '對局✗')) : '') +
        chips('隨從', petTxt)
      );
    } else if (a) {
      out += '<div class="dvnote">這個帳號<b>還沒有雲端存檔</b> —— 只有帳號層級的 RPG 進度，' +
        '沒有 stage／金幣／隨從／外觀。</div>';
    }

    /* ---- 最近事件 ---- */
    if (a && a.events && a.events.length) {
      var lg = '';
      for (var i = 0; i < a.events.length && i < 6; i++) {
        var e = a.events[i];
        lg += '<div><time>' + esc(e.str || dt(e.t)) + '</time> ' +
          esc(e.mode || e.type || '') + (e.stage ? ' · 第 ' + esc(e.stage) + ' 關' : '') + '</div>';
      }
      out += '<div class="dvsec"><div class="dvsh">最近活動</div><div class="dvlog">' + lg + '</div></div>';
    }

    /* ---- 同名歧義提示 ---- */
    if (d && (d.sameName | 0) > 1) {
      out += '<div class="dvnote">⚠️ 有 <b>' + (d.sameName | 0) + '</b> 個帳號叫「' +
        esc((a && a.name) || (s && s.name) || '') + '」。名字是社交身分與帳號之間唯一的對應依據，' +
        '這裡顯示的是<b>最近活躍</b>的那一個。</div>';
    }

    return out;
  }

  function paintBar(d) {
    var bar = el('dvBar');
    if (!bar) return;
    var hasA = !!(d && d.account && d.account.id);
    bar.innerHTML = '<button id="dvCopy" type="button"' + (hasA ? '' : ' disabled') + '>複製 UID</button>' +
      '<button id="dvFull" type="button" class="main"' + (hasA ? '' : ' disabled') + '>完整後台</button>' +
      '<button id="dvAgain" type="button">↻ 重新整理</button>';
  }

  function paintLoad() {
    var b = el('dvBody');
    if (b) b.innerHTML = '<div class="dvload"><span class="sp"></span>讀取後台資料…</div>';
    paintBar(null);
  }

  function paintErr(d) {
    var b = el('dvBody');
    if (!b) return;
    var msg;
    if (d && d.err === 'NO_SESSION') {
      msg = '這個瀏覽器沒有登入 session —— 開發者後台需要先登入開發者帳號。' +
        '（玩家名片是免登入的公開資料，所以名片能開，不代表後台也開得了。）';
    } else if (d && d.err === 'NOT_DEV') {
      msg = '這個帳號不是開發者，後台已拒絕。這是後端的判斷，不是前端藏按鈕。';
    } else if (d && d.err === 'NOT_FOUND') {
      msg = '查不到這個人的帳號與社交紀錄。';
    } else {
      msg = '讀不到後台資料（' + ((d && d.err) || 'NET') + '）—— 後端可能還是舊版，' +
        '或 Render 正在冷啟動。稍後按「重新整理」再試一次。';
    }
    b.innerHTML = '<div class="dvnote">' + esc(msg) + '</div>';
    paintBar(null);
  }

  /* ---------------- 抓資料 ----------------
     走 /api/admin/player：這條路由本身要求 session + isDev + 限流，
     所以 credentials 一定要帶（玩家名片那條反而是 omit）。
     ------------------------------------------- */
  function fetchDev(opt) {
    var url = origin() + '/api/admin/player?';
    if (opt.pid) url += 'pid=' + encodeURIComponent(opt.pid);
    else url += 'q=' + encodeURIComponent(opt.name || opt.uid || '');
    if (opt.name && opt.pid) url += '&q=' + encodeURIComponent(opt.name);

    var my = ++reqN;
    return new Promise(function (res) {
      var done = false;
      var tm = setTimeout(function () { if (!done) { done = true; res({ ok: false, err: 'TIMEOUT' }); } }, WAIT);
      function fin(v) { if (done) return; done = true; clearTimeout(tm); res(v); }
      try {
        if (typeof fetch !== 'function') return fin({ ok: false, err: 'NO_FETCH' });
        fetch(url, { credentials: 'same-origin' }).then(function (r) {
          return r.json().then(function (j) {
            j = j || {};
            if (my !== reqN) return fin({ ok: false, err: 'STALE' });
            if (!j.ok) fin({ ok: false, err: j.err || ('HTTP_' + r.status), status: r.status });
            else fin(j);
          }, function () { fin({ ok: false, err: 'BAD_JSON', status: r.status }); });
        }, function () { fin({ ok: false, err: 'NET' }); });
      } catch (e) { fin({ ok: false, err: 'EXC' }); }
    });
  }

  function load(opt) {
    cur = { pid: opt.pid || '', name: opt.name || '', uid: opt.uid || '', d: null, _k: opt._k };
    paintHead(null);
    paintLoad();
    fetchDev(opt).then(function (d) {
      if (!cur || cur._k !== opt._k) return;
      if (!d || !d.ok) { paintErr(d); return; }
      cur.d = d;
      if (d.account && d.account.id) cur.uid = d.account.id;
      paintHead(d);
      var b = el('dvBody');
      if (b) b.innerHTML = bodyHTML(d);
      paintBar(d);
    });
  }

  function reload() {
    if (!cur) return;
    sfx('click');
    var k = (cur.pid || '') + '|' + (cur.name || '') + '|' + (cur.uid || '');
    var o = { pid: cur.pid, name: cur.name, uid: cur.uid, _k: k };
    /* 已經有 UID 就直接用 UID 查，比名字精準 */
    if (cur.uid) { o.pid = ''; o.name = ''; }
    load(o);
  }

  function copyUid() {
    if (!cur || !cur.uid) return;
    var v = cur.uid, done = function () { toast('已複製 UID：' + v, 2.2); };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(v).then(done, fallback);
        return;
      }
    } catch (e) {}
    fallback();
    function fallback() {
      try {
        var ta = document.createElement('textarea');
        ta.value = v; ta.setAttribute('readonly', 'readonly');
        ta.style.position = 'fixed'; ta.style.left = '-9999px';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta); done();
      } catch (e2) { toast('複製失敗，請長按選取', 2.4); }
    }
  }

  /* 完整後台：關掉這張卡、開 #bhModal、直接定位到這個人。
     Admin.player 要先 open（renderDetail 需要節點已經在畫面上）。 */
  function fullAdmin() {
    if (!cur || !cur.uid) return;
    var A = api('Admin');
    if (!A || typeof A.open !== 'function') { toast('後台模組沒有載入', 2.6); return; }
    var uid = cur.uid;
    close();
    var ok = false;
    try { ok = A.open(); } catch (e) { ok = false; }
    if (!ok) return;
    /* 後台預設停在「總覽」，玩家詳情在「會員」分頁裡 —— 沒先切過去就只會看到首頁。
       切完等一拍再定位，因為 setTab 會重畫那一頁的 DOM。 */
    try {
      if (typeof A.setTab === 'function') A.setTab('members');
    } catch (e1) {}
    try {
      setTimeout(function () {
        try { if (typeof A.player === 'function') A.player(uid); } catch (e) {}
      }, 80);
    } catch (e2) {}
  }

  /* ---------------- 開／關 ---------------- */
  function open(opt) {
    opt = opt || {};
    if (!isDev()) {
      toast('只有開發者可以使用後台資料', 2.6);
      return false;
    }
    var pid = String(opt.pid || '').trim();
    if (!/^p_[0-9a-f]{10}$/.test(pid)) pid = '';
    var name = String(opt.name || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 24);
    var uid = String(opt.uid || '').trim();
    if (!pid && !name && !uid) return false;

    build();
    box.classList.add('on');
    sfx('click');
    var k = pid + '|' + name + '|' + uid;
    load({ pid: pid, name: name, uid: uid, _k: k });
    return true;
  }

  function close() {
    if (box) box.classList.remove('on');
    cur = null;
    reqN++;              // 讓還在飛的請求結果直接作廢
  }

  /* ---------------- 對外 ---------------- */
  var API = {
    open: open, close: close, isDev: isDev,
    state: function () { return { open: !!(box && box.classList.contains('on')), cur: cur }; }
  };
  window.__BHDevCard = API;
  try { if (typeof module !== 'undefined' && module.exports) module.exports = API; } catch (e) {}

  try { css(); } catch (e) {}
})();
