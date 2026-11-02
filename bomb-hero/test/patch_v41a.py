# -*- coding: utf-8 -*-
"""
patch_v41a.py —— v4.1：帳號 / 第三方登入 / 雲端存檔（前端）
  1) CSS：右上角帳號膠囊、綁定彈窗、RPG 帳號列
  2) HTML：navBar 加常駐「👤 綁定帳號」、全域帳號彈窗、RPG 畫面的帳號列
  3) JS：Cloud 模組（config/me/guest/spend/alloc/clear/sync/logout/bind）
  4) JS：RPG 配點改走伺服器、過關回報、地圖依解鎖進度上鎖
"""
import io

P = 'index.html'
raw = io.open(P, 'rb').read().decode('utf-8')
EOL = '\r\n' if '\r\n' in raw else '\n'
src = raw.replace('\r\n', '\n')


def sub(old, new, tag):
    global src
    n = src.count(old)
    assert n == 1, '[%s] 預期 1 次，實際 %d 次' % (tag, n)
    src = src.replace(old, new)
    print('  ok ' + tag)


# ---------------------------------------------------------------- 1. CSS
CSS = r'''
  /* ================================================================
     v4.1：帳號 / 第三方登入 / 雲端存檔
     右上角常駐「👤」膠囊 → 點開綁定彈窗（遊客也能直接玩）
     ================================================================ */
  .navbtn.acct { pointer-events: auto; }
  .navbtn.acct .dot {
    width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 5px;
    background: #ffb066; box-shadow: 0 0 7px #ffb066; vertical-align: 1px;
  }
  .navbtn.acct.online .dot { background: #6ee08a; box-shadow: 0 0 7px #6ee08a; }
  .navbtn.acct.offline .dot { background: #ff7a7a; box-shadow: 0 0 7px #ff7a7a; }
  #acctModal {
    position: fixed; inset: 0; z-index: 2100; display: none;
    align-items: center; justify-content: center; padding: 14px;
    background: rgba(34,20,10,.64); -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px);
  }
  #acctModal.on { display: flex; }
  .acctcard {
    width: min(440px, 100%); max-height: min(88vh, 760px); overflow-y: auto;
    background: linear-gradient(180deg, #fffdf7, #f7ecda);
    border: 3px solid #7b4a1f; border-radius: 22px;
    box-shadow: 0 26px 60px -18px rgba(0,0,0,.7), inset 0 2px 0 #fff;
    padding: 15px 17px 13px; color: #4a2c14; font-family: inherit;
  }
  .accthead { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .accthead h3 { margin: 0; font-size: 20px; color: #7b4a1f; }
  .acctclose {
    border: 2px solid #e2bd93; background: #fffaf0; color: #8a5f35;
    width: 32px; height: 32px; border-radius: 50%; font-size: 15px; font-weight: 900;
    cursor: pointer; font-family: inherit;
  }
  .acctwho { display: flex; align-items: center; gap: 11px; margin: 12px 0 4px; }
  .acctav {
    width: 54px; height: 54px; border-radius: 50%; flex: 0 0 auto; overflow: hidden;
    background: #ffe6c4; border: 2px solid #e8c39a; display: flex; align-items: center;
    justify-content: center; font-size: 27px;
  }
  .acctav img { width: 100%; height: 100%; object-fit: cover; }
  .acctwho .an { font-size: 16px; font-weight: 900; color: #5a3418; }
  .acctwho .as { font-size: 12px; color: #8a6a4a; margin-top: 2px; }
  .acctrows { margin: 10px 0 4px; }
  .acctrow {
    display: flex; justify-content: space-between; align-items: center; gap: 10px;
    font-size: 13px; padding: 7px 2px; border-bottom: 1px dashed #e6caa6;
  }
  .acctrow:last-child { border-bottom: 0; }
  .acctrow span { color: #8a6a4a; }
  .acctrow b { color: #b3260a; font-size: 14px; }
  .acctprov { display: grid; gap: 8px; margin: 12px 0 6px; }
  .acctbtn {
    display: flex; align-items: center; justify-content: center; gap: 9px;
    width: 100%; padding: 11px 12px; border-radius: 13px; border: 2px solid #d9b78e;
    background: #fffdf6; color: #5a3418; font-family: inherit; font-size: 14.5px; font-weight: 900;
    cursor: pointer; transition: transform .12s, box-shadow .12s, border-color .12s;
    box-shadow: 0 3px 0 rgba(150,110,70,.28);
  }
  .acctbtn:hover:not(:disabled) { transform: translateY(-2px); border-color: #f4703c; }
  .acctbtn:active:not(:disabled) { transform: translateY(1px); box-shadow: none; }
  .acctbtn:disabled { opacity: .5; cursor: not-allowed; box-shadow: none; }
  .acctbtn.g { background: linear-gradient(180deg,#fff,#f1f5ff); border-color: #c9d8f5; color: #23406e; }
  .acctbtn.f { background: linear-gradient(180deg,#fff,#eef4ff); border-color: #c3d4ee; color: #17457f; }
  .acctbtn.l { background: linear-gradient(180deg,#fff,#effbf1); border-color: #bfe6c8; color: #14602c; }
  .acctbtn.ghost { background: #fff6e8; border-color: #e2bd93; color: #8a5f35; }
  .acctbtn .gi {
    width: 21px; height: 21px; border-radius: 50%; flex: 0 0 auto;
    display: inline-flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 900; color: #fff;
  }
  .acctbtn.g .gi { background: #4285f4; }
  .acctbtn.f .gi { background: #1877f2; }
  .acctbtn.l .gi { background: #06c755; }
  .acctnote {
    font-size: 12px; line-height: 1.7; color: #8a5f35; background: #fff4e2;
    border: 1.5px dashed #e2bd93; border-radius: 12px; padding: 9px 11px; margin-top: 10px;
  }
  .acctsecure { font-size: 11px; color: #a98a68; text-align: center; margin-top: 9px; line-height: 1.6; }
  .acctstatus { font-size: 12px; margin-top: 8px; color: #2f7d4a; text-align: center; font-weight: 800; }
  .acctstatus.bad { color: #c9502a; }
  .acctstrip {
    display: flex; align-items: center; gap: 7px; flex-wrap: wrap;
    font-size: 12.5px; color: #8a5f35; background: #fff6e6;
    border: 1.5px dashed #e6c9a4; border-radius: 12px; padding: 7px 10px; margin: 4px 0 9px;
  }
  .acctstrip b { color: #b5521f; }
  .acctdot { width: 8px; height: 8px; border-radius: 50%; background: #ffb066; flex: 0 0 auto; }
  .acctdot.on { background: #39b56a; }
  .acctdot.off { background: #d9534f; }
  .acctmini {
    margin-left: auto; border: 2px solid #f0c79b; background: #fffaf0; color: #b5521f;
    border-radius: 999px; padding: 4px 11px; font-family: inherit; font-size: 12px;
    font-weight: 900; cursor: pointer;
  }
  .acctmini:hover { border-color: #f4703c; }
  #segRpgMap button.lock { opacity: .42; }
  @media (max-width: 520px) {
    #acctChip b { display: none; }
    #acctChip { padding: 8px 11px; font-size: 15px; }
    .acctcard { padding: 13px 13px 11px; border-radius: 18px; }
    .accthead h3 { font-size: 18px; }
  }
'''

sub('</style>\n</head>\n<body>', CSS + '</style>\n</head>\n<body>', 'CSS 區塊')

# ---------------------------------------------------------------- 2. HTML
sub('''  <div class="navright">
    <button class="navbtn tg on" id="btnMusic" type="button" title="開關主音樂">''',
    '''  <div class="navright">
    <!-- v4.1：常駐帳號膠囊（遊客也能直接玩；點一下開綁定視窗） -->
    <button class="navbtn acct guest" id="acctChip" type="button" title="帳號 · 綁定">
      <span class="dot"></span>👤 <b id="acctName">綁定帳號</b>
    </button>
    <button class="navbtn tg on" id="btnMusic" type="button" title="開關主音樂">''',
    'navBar 帳號膠囊')

sub('''      <div class="backrow">
        <button class="ghostbtn" data-back="1">← 回主選單</button>
      </div>
    </div>
  </div>

  <!-- 遊戲說明（v3.5） -->''',
    '''      <div class="acctstrip" id="rpgAcctBar"></div>
      <div class="backrow">
        <button class="ghostbtn" data-back="1">← 回主選單</button>
      </div>
    </div>
  </div>

  <!-- 遊戲說明（v3.5） -->''',
    'RPG 帳號列')

sub('''</body>
</html>''',
    '''<!-- v4.1：帳號彈窗（內容依登入狀態由 Cloud 模組產生） -->
<div id="acctModal" role="dialog" aria-modal="true" aria-label="帳號">
  <div class="acctcard">
    <div class="accthead">
      <h3 id="acctHead">👤 帳號</h3>
      <button class="acctclose" id="acctClose" type="button" aria-label="關閉">✕</button>
    </div>
    <div id="acctBody"></div>
    <div class="acctsecure" id="acctSecure">🔒 全程 HTTPS 加密 · 伺服器端驗證 · 存檔 HMAC 簽章</div>
  </div>
</div>

</body>
</html>''',
    '帳號彈窗')

# ---------------------------------------------------------------- 3. JS：Cloud 模組
CLOUD_JS = r'''
/* ============================================================================
 * v4.1：帳號 / 第三方登入 / 雲端存檔（伺服器權威）
 * ----------------------------------------------------------------------------
 * 規格：前端只能送「操作意圖」，數值一律由後端算
 *   配點 → POST /api/rpg/spend      { attr, delta }
 *   配點表 → POST /api/rpg/alloc    { alloc }
 *   過關 → POST /api/rpg/stage-clear{ stage }
 *   存檔 → 伺服器簽發 HMAC 信封，前端只保存與帶回（/api/rpg/sync）
 * 連不到伺服器時仍可玩，只是進度暫存本機（右上角會亮紅燈）。
 * ========================================================================== */
const Cloud = (function () {
  const DEV_KEY = 'bombhero-device';
  const SAVE_KEY = 'bombhero-cloud-save';
  const S = { ready: false, online: false, guest: true, acc: null, providers: {}, ts: 0, busy: false };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function devId() {
    let id = '';
    try { id = localStorage.getItem(DEV_KEY) || ''; } catch (e) {}
    if (!id) {
      const r = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID()
        : (Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12));
      id = 'dev-' + r;
      try { localStorage.setItem(DEV_KEY, id); } catch (e) {}
    }
    return id;
  }
  function req(path, body, method) {
    const o = { method: method || (body ? 'POST' : 'GET'), credentials: 'same-origin', headers: {} };
    if (body) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(body); }
    return fetch(apiPath(path), o).then(function (r) {
      return r.json().then(function (j) { j.status = r.status; return j; }, function () {
        return { ok: false, err: 'BAD_JSON', status: r.status };
      });
    });
  }

  function online() { return S.online; }
  function unlocked() { return (S.acc && S.acc.unlocked) ? S.acc.unlocked : 1; }
  function acc() { return S.acc; }
  function isGuest() { return S.guest; }

  function cacheSave() {
    try {
      if (S.acc && S.acc.save) localStorage.setItem(SAVE_KEY, JSON.stringify(S.acc.save));
    } catch (e) {}
  }

  /* 伺服器回的狀態 → 前端（配點、金幣、解鎖） */
  function adopt(a) {
    if (!a) return;
    S.acc = a;
    S.guest = a.kind === 'guest';
    S.online = true;
    S.ts = Date.now();
    if (a.rpg) {
      if (!Game.rpg) {
        RPG.alloc = {
          hp: a.rpg.alloc.hp | 0, def: a.rpg.alloc.def | 0,
          spd: a.rpg.alloc.spd | 0, atk: a.rpg.alloc.atk | 0
        };
        RPG.char = a.rpg.char | 0;
      }
      RPG.cleared = a.rpg.cleared | 0;
      RPG.gold = a.rpg.gold | 0;
      RPG.unlocked = a.unlocked | 0;
      RPG_POINTS_TOTAL = a.points | 0;
    }
    cacheSave();
    paint();
    try { Rpg.renderStats(); Rpg.renderMaps(); } catch (e) {}
  }

  /* ---------------- 畫面 ---------------- */
  function stripHtml() {
    if (!S.online) {
      return '<span class="acctdot off"></span>' + t('acct.offline') +
        '<button class="acctmini" type="button" data-acct="retry">🔄 ' + t('acct.retry') + '</button>';
    }
    if (S.guest) {
      return '<span class="acctdot"></span>' + t('acct.guest') + ' · ' + t('acct.needBind') +
        '<button class="acctmini" type="button" data-acct="open">👤 ' + t('acct.bind') + '</button>';
    }
    return '<span class="acctdot on"></span><b>' + esc(S.acc.name) + '</b> · ' +
      t('acct.cleared', { n: RPG.cleared || 0 }) +
      '<button class="acctmini" type="button" data-acct="open">⚙️ ' + t('acct.manage') + '</button>';
  }

  function providerBtns() {
    const list = [['google', 'G'], ['facebook', 'f'], ['line', 'L']];
    return list.map(function (x) {
      const p = S.providers[x[0]] || { on: false };
      return '<button class="acctbtn ' + x[0] + '" type="button" data-acct="go" data-p="' + x[0] + '"' +
        (p.on ? '' : ' disabled title="' + esc(t('acct.off')) + '"') + '>' +
        '<span class="gi">' + x[1] + '</span>' + t('acct.' + x[0]) + '</button>';
    }).join('');
  }

  function progressRows() {
    const a = S.acc;
    return '<div class="acctrows">' +
      '<div class="acctrow"><span>' + t('acct.clearedLabel') + '</span><b>' + (a.rpg.cleared | 0) + ' / 32</b></div>' +
      '<div class="acctrow"><span>' + t('acct.gold') + '</span><b>💰 ' + (a.rpg.gold | 0) + '</b></div>' +
      '<div class="acctrow"><span>' + t('acct.points') + '</span><b>' + (a.left | 0) + ' / ' + (a.points | 0) + '</b></div>' +
      '</div>';
  }

  function bodyHtml() {
    if (!S.online) {
      return '<div class="acctwho"><div class="acctav">📡</div><div>' +
        '<div class="an">' + t('acct.offline') + '</div>' +
        '<div class="as">' + t('acct.needBind') + '</div></div></div>' +
        '<div class="acctprov"><button class="acctbtn ghost" type="button" data-acct="retry">🔄 ' +
        t('acct.retry') + '</button></div>';
    }
    const a = S.acc;
    const av = a.avatar
      ? '<div class="acctav"><img alt="" src="' + esc(a.avatar) + '" referrerpolicy="no-referrer"></div>'
      : '<div class="acctav">' + (S.guest ? '👤' : '🎮') + '</div>';
    const name = S.guest ? t('acct.guest') : esc(a.name);
    const sub = S.guest ? t('acct.needBind') : (a.email || (a.provider ? a.provider : ''));
    let html = '<div class="acctwho">' + av + '<div><div class="an">' + name + '</div>' +
      '<div class="as">' + esc(sub) + '</div></div></div>' + progressRows();
    if (S.guest) {
      html += '<div class="acctprov">' + providerBtns() + '</div>' +
        '<div class="acctnote">' + t('acct.bindNote') + '</div>';
    } else {
      html += '<div class="acctprov">' +
        '<button class="acctbtn ghost" type="button" data-acct="sync">☁️ ' + t('acct.synced') + '</button>' +
        '<button class="acctbtn ghost" type="button" data-acct="logout">🚪 ' + t('acct.logout') + '</button>' +
        '</div>';
    }
    return html;
  }

  function renderModal() {
    const b = $id('acctBody');
    if (!b) return;
    b.innerHTML = bodyHtml();
    const st = $id('acctStatus');
    if (st) st.textContent = '';
  }

  function open() {
    const m = $id('acctModal');
    if (!m) return;
    renderModal();
    m.classList.add('on');
    AudioSys.sfx('click');
  }
  function close() {
    const m = $id('acctModal');
    if (m) m.classList.remove('on');
  }

  function paint() {
    const chip = $id('acctChip');
    if (chip) {
      chip.classList.toggle('guest', S.guest && S.online);
      chip.classList.toggle('online', S.online && !S.guest);
      chip.classList.toggle('offline', !S.online);
      const nm = $id('acctName');
      if (nm) {
        nm.textContent = !S.online ? t('acct.offShort')
          : (S.guest ? t('acct.bind') : (S.acc.name || t('acct.player')));
      }
      chip.title = !S.online ? t('acct.offline')
        : (S.guest ? t('acct.needBind') : t('acct.memberTitle'));
    }
    const bar = $id('rpgAcctBar');
    if (bar) bar.innerHTML = stripHtml();
    const m = $id('acctModal');
    if (m && m.classList.contains('on')) renderModal();
  }

  /* ---------------- API ---------------- */
  function spend(attr, delta) {
    if (!S.online) return Promise.resolve(null);
    return req('/api/rpg/spend', { attr: attr, delta: delta }).then(function (r) {
      if (r && r.ok) { adopt(r.account); return r; }
      return null;
    }, function () { return null; });
  }
  function setAlloc(alloc) {
    if (!S.online) return Promise.resolve(null);
    return req('/api/rpg/alloc', { alloc: alloc }).then(function (r) {
      if (r && r.ok) { adopt(r.account); return r; }
      if (r && r.err === 'BAD_ALLOC') toast(t('acct.tampered'));
      return null;
    }, function () { return null; });
  }
  function clearStage(n) {
    if (!S.online) { toast(t('acct.offline')); return Promise.resolve(null); }
    return req('/api/rpg/stage-clear', { stage: n }).then(function (r) {
      if (r && r.ok) { adopt(r.account); toast(t('acct.saveDone', { n: n })); return r; }
      if (r && r.err === 'RATE_LIMIT') return null;      // 太頻繁就靜靜略過
      if (r && r.err === 'STAGE_LOCKED') return null;    // 重打舊關
      return null;
    }, function () { return null; });
  }
  function sync() {
    if (!S.online) return Promise.resolve(false);
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) {}
    if (!saved) return Promise.resolve(false);
    return req('/api/rpg/sync', saved).then(function (r) {
      if (r && r.ok) { adopt(r.account); return true; }
      if (r && r.err === 'SAVE_TAMPERED') toast(t('acct.tampered'));
      return false;
    }, function () { return false; });
  }
  function logout() {
    return req('/api/auth/logout', {}).then(function () {
      S.acc = null; S.guest = true;
      try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
      return req('/api/auth/guest', { deviceId: devId() });
    }).then(function (g) {
      if (g && g.ok) adopt(g.account); else paint();
      toast(t('acct.loggedOut'));
    }, function () { paint(); });
  }
  function go(provider, bind) {
    const back = (location.pathname + location.search).replace(/[?&]login=[^&]*/g, '');
    const url = apiPath('/api/auth/' + provider + '/start') +
      '?bind=' + (bind ? 1 : 0) + '&redirect=' + encodeURIComponent(back || '/');
    location.href = url;
  }

  /* ---------------- 登入結果提示 ---------------- */
  function takeLoginParam() {
    let st = '';
    try {
      const u = new URL(location.href);
      st = u.searchParams.get('login') || '';
      if (st) {
        u.searchParams.delete('login');
        history.replaceState({ bh: Screen.current || 'title' }, '', u.pathname + (u.search || '') + u.hash);
      }
    } catch (e) {}
    return st;
  }
  function loginToast(st) {
    if (st === 'ok') toast(t('acct.loginOk'), 2.4);
    else if (st === 'cancel') return;
    else toast(t('acct.loginErr', { r: st }), 3);
  }

  function init() {
    const loginSt = takeLoginParam();
    return req('/api/auth/config').then(function (c) {
      if (c && c.ok) S.providers = c.providers || {};
      return req('/api/auth/me');
    }).then(function (m) {
      if (m && m.ok && m.account) { S.ready = true; adopt(m.account); return; }
      return req('/api/auth/guest', { deviceId: devId() }).then(function (g) {
        S.ready = true;
        if (g && g.ok) adopt(g.account); else paint();
      });
    }).then(function () {
      if (loginSt) loginToast(loginSt);
    }).catch(function () {
      S.online = false; S.ready = true; paint();
    });
  }

  /* 事件：膠囊 / 彈窗 / RPG 帳號列 */
  function wireUi() {
    const chip = $id('acctChip');
    if (chip) chip.addEventListener('click', function () { AudioSys.sfx('click'); open(); });
    const cl = $id('acctClose');
    if (cl) cl.addEventListener('click', function () { close(); });
    const md = $id('acctModal');
    if (md) md.addEventListener('click', function (e) { if (e.target === md) close(); });
    const body = $id('acctBody');
    if (body) body.addEventListener('click', function (e) {
      const b = e.target && e.target.closest ? e.target.closest('[data-acct]') : null;
      if (!b || b.disabled) return;
      const act = b.getAttribute('data-acct');
      AudioSys.sfx('click');
      if (act === 'go') go(b.getAttribute('data-p'), S.guest);
      else if (act === 'logout') logout();
      else if (act === 'retry') location.reload();
      else if (act === 'sync') sync().then(function (ok2) {
        toast(ok2 ? t('acct.synced') : t('acct.loginErr', { r: 'sync' }));
      });
    });
    const bar = $id('rpgAcctBar');
    if (bar) bar.addEventListener('click', function (e) {
      const b = e.target && e.target.closest ? e.target.closest('[data-acct]') : null;
      if (!b) return;
      AudioSys.sfx('click');
      if (b.getAttribute('data-acct') === 'retry') location.reload();
      else open();
    });
  }

  return {
    init: init, wireUi: wireUi, paint: paint, open: open, close: close,
    online: online, guest: isGuest, acc: acc, unlocked: unlocked,
    spend: spend, setAlloc: setAlloc, clearStage: clearStage, sync: sync,
    logout: logout, bind: function (p) { go(p, true); }, login: function (p) { go(p, false); },
    state: S
  };
})();

/* 配點：先樂觀更新畫面，伺服器若拒絕就回滾（伺服器才是真相） */
function rpgAdjust(k, d) {
  const v = RPG.alloc[k] || 0;
  if (d > 0) {
    if (v >= RPG_CAP || rpgLeft() <= 0) return false;
  } else if (v <= 0) return false;
  const prev = Object.assign({}, RPG.alloc);
  RPG.alloc[k] = v + d;
  AudioSys.sfx('click');
  Rpg.renderStats();
  if (Cloud.online()) {
    Cloud.spend(k, d).then(function (r) {
      if (!r) { RPG.alloc = prev; Rpg.renderStats(); }
    });
  }
  return true;
}

/* 啟動：抓登入設定 → 取目前身分 → 沒有就發一組遊客身分（Device ID） */
(function () {
  try { Cloud.wireUi(); } catch (e) {}
  try { Cloud.init(); } catch (e) {}
})();
'''

sub('window.__BH = {', CLOUD_JS + '\nwindow.__BH = {', 'Cloud 模組')

# ---------------------------------------------------------------- 4. RPG 掛點
sub('''const RPG = {
  alloc: { hp: 3, def: 2, spd: 2, atk: 2 },
  char: 0,
  theme: 0,
  sub: 0
};''',
    '''const RPG = {
  alloc: { hp: 3, def: 2, spd: 2, atk: 2 },
  char: 0,
  theme: 0,
  sub: 0,
  cleared: 0,      // v4.1：雲端回來的冒險進度
  gold: 0,
  unlocked: 32     // 32 = 沒有雲端時全部開放
};
// v4.1：可用總點數（9 + 每 5 關 1 點，最多 40）由伺服器算，前端只跟著顯示
let RPG_POINTS_TOTAL = RPG_POINTS;''',
    'RPG 狀態擴充')

sub('''function rpgLeft() { return RPG_POINTS - rpgSum(RPG.alloc); }''',
    '''function rpgLeft() { return Math.max(0, RPG_POINTS_TOTAL - rpgSum(RPG.alloc)); }''',
    'rpgLeft 改用伺服器給的總點數')

sub('''function rpgRandomAlloc() {
  const keys = ['hp', 'def', 'spd', 'atk'];
  const a = { hp: 1, def: 1, spd: 1, atk: 1 };     // 先各給 1 點，避免全押同一項
  let left = RPG_POINTS - 4;''',
    '''function rpgRandomAlloc() {
  const keys = ['hp', 'def', 'spd', 'atk'];
  const a = { hp: 1, def: 1, spd: 1, atk: 1 };     // 先各給 1 點，避免全押同一項
  let left = Math.max(4, RPG_POINTS_TOTAL) - 4;''',
    '隨機配點用可用總點數')

# 配點按鈕 → 走 rpgAdjust（伺服器權威）
sub('''      const k = row.getAttribute('data-k');
      const d = parseInt(b.getAttribute('data-d'), 10);
      const v = RPG.alloc[k] || 0;
      if (d > 0) {
        if (rpgLeft() <= 0 || v >= RPG_CAP) return;
        RPG.alloc[k] = v + 1;
      } else {
        if (v <= 0) return;
        RPG.alloc[k] = v - 1;
      }
      AudioSys.sfx('click');
      renderStats();''',
    '''      const k = row.getAttribute('data-k');
      const d = parseInt(b.getAttribute('data-d'), 10);
      // v4.1：真正扣點在後端（/api/rpg/spend），前端只送「哪一項、加或減」
      rpgAdjust(k, d);''',
    '配點按鈕改走 rpgAdjust')

sub('''    const rndBtn = $id('btnRpgRandom');
    if (rndBtn) rndBtn.addEventListener('click', function () {
      AudioSys.ensure(); AudioSys.sfx('click');
      rpgRandomAlloc();
      renderStats();
    });''',
    '''    const rndBtn = $id('btnRpgRandom');
    if (rndBtn) rndBtn.addEventListener('click', function () {
      AudioSys.ensure(); AudioSys.sfx('click');
      rpgRandomAlloc();
      renderStats();
      if (Cloud.online()) Cloud.setAlloc(RPG.alloc);   // 由後端驗證點數上限
    });''',
    '隨機配點同步到後端')

sub('''    const go = $id('btnRpgStart');
    if (go) go.addEventListener('click', function () {
      AudioSys.ensure(); AudioSys.sfx('click');
      startRpg(RPG.theme * 4 + RPG.sub + 1);
    });''',
    '''    const go = $id('btnRpgStart');
    if (go) go.addEventListener('click', function () {
      AudioSys.ensure(); AudioSys.sfx('click');
      const st = RPG.theme * 4 + RPG.sub + 1;
      if (Cloud.online() && st > RPG.unlocked) { toast(t('acct.stageLocked')); return; }
      if (Cloud.online()) Cloud.setAlloc(RPG.alloc);
      startRpg(st);
    });''',
    '開始冒險前檢查解鎖並同步配點')

# 地圖分頁：未解鎖的上鎖
sub('''    sb.innerHTML = [0, 1, 2, 3].map(function (i) {
      const m = MAP32[RPG.theme * 4 + i];
      return '<button type="button" data-v="' + i + '" class="' + (i === RPG.sub ? 'sel' : '') + '">' +
        (RPG.theme + 1) + '-' + (i + 1) + '　' + m.n + '</button>';
    }).join('');''',
    '''    const gate = Cloud.online() ? RPG.unlocked : 32;
    sb.innerHTML = [0, 1, 2, 3].map(function (i) {
      const m = MAP32[RPG.theme * 4 + i];
      const st = RPG.theme * 4 + i + 1;
      const lock = st > gate;
      return '<button type="button" data-v="' + i + '" class="' +
        (i === RPG.sub ? 'sel' : '') + (lock ? ' lock' : '') + '"' + (lock ? ' disabled' : '') + '>' +
        (RPG.theme + 1) + '-' + (i + 1) + '　' + m.n + (lock ? ' 🔒' : '') + '</button>';
    }).join('');''',
    '地圖依解鎖進度上鎖')

# 過關 → 回報後端
sub('''        const cleared = Game.stage;
        const maxStage = (Game.mode === 'rpg') ? 32 : 8;''',
    '''        const cleared = Game.stage;
        // v4.1：RPG 過關回報後端（伺服器驗證「只能依序過關」，金幣也由後端算）
        if (Game.mode === 'rpg' && typeof Cloud !== 'undefined') Cloud.clearStage(cleared);
        const maxStage = (Game.mode === 'rpg') ? 32 : 8;''',
    '過關回報後端')

# startRpg：不可直接跳關
sub('''function startRpg(stage) {
  Game.mode = 'rpg';
  Game.rpg = true;
  Game.bossRush = false;
  Game.stage = stage || 1;''',
    '''function startRpg(stage) {
  Game.mode = 'rpg';
  Game.rpg = true;
  Game.bossRush = false;
  // v4.1：有雲端身分時只能玩到已解鎖的關卡（避免前端直接改 stage 跳關）
  let st = stage || 1;
  if (typeof Cloud !== 'undefined' && Cloud.online() && st > RPG.unlocked) st = RPG.unlocked;
  Game.stage = st;''',
    'startRpg 夾住關卡範圍')

out = src.replace('\n', EOL)
io.open(P, 'wb').write(out.encode('utf-8'))
print('\n[OK] 已寫回 ' + P)
