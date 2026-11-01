# -*- coding: utf-8 -*-
"""v4.18 patch A：前端 —— 開發者無限金幣 / 分享拿金幣 / 暱稱可留空

慣例：CRLF 原始檔 → 轉 LF 比對 → 每條規則必為 1 次命中 → 寫回時還原 CRLF
"""
import io, sys

PATH = 'index.html'

def load():
    return io.open(PATH, 'rb').read().decode('utf-8').replace('\r\n', '\n')

def save(s):
    io.open(PATH, 'wb').write(s.replace('\n', '\r\n').encode('utf-8'))

s = load()
rules = []

def rule(name, old, new):
    rules.append((name, old, new))

# ------------------------------------------------------------------ ① CSS
CSS_NEW = """  /* v4.18：分享拿金幣 */
  .sharesec { margin: 16px 0 4px; padding: 14px 14px 12px; border-radius: 14px;
              border: 1px dashed #d9c08a; background: rgba(255,248,232,.78); }
  .sharesec .shtop { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 900; color: #7d5a12; }
  .sharesec .shsdesc { font-size: 12px; line-height: 1.65; color: #6f6350; margin: 6px 0 10px; }
  .sharesec .shsdesc b { color: #b07400; }
  .sharegrid { display: grid; gap: 8px; grid-template-columns: repeat(auto-fit, minmax(126px, 1fr)); }
  .sharebtn { display: flex; align-items: center; justify-content: center; gap: 6px;
              border: 1px solid #e2cfa4; border-radius: 12px; padding: 9px 8px; cursor: pointer;
              font-family: inherit; font-size: 12.5px; font-weight: 900; color: #6b4a12;
              background: linear-gradient(180deg, #fffdf6, #ffeecd); }
  .sharebtn:hover { border-color: #f0b45a; }
  .sharebtn:disabled { cursor: default; opacity: .6; filter: grayscale(.25); }
  .sharebtn.done { color: #2e7d52; border-color: #a9dcbc; background: linear-gradient(180deg,#f2fff8,#dcf5e6); }
  .sharebtn .sbico { font-size: 16px; line-height: 1; }
  .sharebtn .sbamt { font-size: 10.5px; font-weight: 800; color: #b07400; }
  .sharebtn.done .sbamt { color: #2e7d52; }
  .shnote { min-height: 16px; margin-top: 8px; font-size: 11.5px; color: #8a6a2a; }
  @media (max-width: 560px) { .sharegrid { grid-template-columns: 1fr 1fr; } }
"""
rule('CSS 分享樣式',
     """  @media (max-width: 560px) {
    .shopgrid { grid-template-columns: 1fr; }
    .shopcard .shdesc { min-height: 0; }
  }
""",
     """  @media (max-width: 560px) {
    .shopgrid { grid-template-columns: 1fr; }
    .shopcard .shdesc { min-height: 0; }
  }
""" + CSS_NEW)

# ------------------------------------------------------------------ ② 商店頁 HTML：分享區塊
rule('商店分享 HTML',
     '      <div class="shopgrid" id="shopGrid"></div>\n',
     """      <div class="shopgrid" id="shopGrid"></div>
      <!-- v4.18：分享拿金幣（防作假：一次性 token ＋ 每平台一次 ＋ 每日上限） -->
      <div class="sharesec">
        <div class="shtop">📣 分享拿金幣</div>
        <div class="shsdesc" id="shareDesc">分享到下面任一平台，成功分享就送 <b>1000</b> 金幣。
          每個平台只能領一次、每天最多領 3 次；要登入正式帳號（遊客不行）才能領。</div>
        <div class="sharegrid" id="shareGrid"></div>
        <div class="shnote" id="shareNote"></div>
      </div>
""")

# ------------------------------------------------------------------ ③ 首頁商店按鈕副標
rule('首頁商店按鈕說明',
     '<button class="mbtn storebtn" id="btnStore">🛒 商店<small>隨從 1000 金幣 · 單人／RPG 幫打</small></button>',
     '<button class="mbtn storebtn" id="btnStore">🛒 商店<small>隨從 1000 金幣 · 分享送金幣</small></button>')

# ------------------------------------------------------------------ ④ 暱稱可留空（HTML 文案）
rule('暱稱標籤',
     '<label for="playerName" style="font-size:13px;opacity:.85;color:#ffe6c2">🦸 你的專屬暱稱（最多 8 字，設定後都用它玩遊戲）</label>',
     '<label for="playerName" style="font-size:13px;opacity:.85;color:#ffe6c2">🦸 暱稱（最多 8 字，<b>可以留空</b>）</label>')
rule('暱稱輸入框',
     '<input class="tinput" id="playerName" maxlength="8" placeholder="輸入暱稱…" style="width:100%;max-width:320px">',
     '<input class="tinput" id="playerName" maxlength="8" placeholder="可留空，系統自動取名字" style="width:100%;max-width:320px">')

# ------------------------------------------------------------------ ⑤ Shop：開發者無限金幣
rule('Shop dev 判斷',
     """  function has(kind) {
    return owned.some(function (o) { return o.kind === kind; });
  }
""",
     """  // v4.18：開發者帳號金幣無限（錢包顯示 ∞、買東西不扣錢）
  function isDevUser() {
    try { return !!(typeof Cloud !== 'undefined' && Cloud && Cloud.isDev && Cloud.isDev()); } catch (e) { return false; }
  }
  function dev() { return isDevUser(); }
  function has(kind) {
    return owned.some(function (o) { return o.kind === kind; });
  }
""")

rule('Shop 購買不扣錢（dev）',
     """    if (gold < k.price) return { ok: false, err: 'GOLD', need: k.price - gold };
    gold -= k.price;
""",
     """    if (!dev() && gold < k.price) return { ok: false, err: 'GOLD', need: k.price - gold };
    if (!dev()) gold -= k.price;
""")

rule('Shop 錢包顯示 ∞',
     "    if (w) w.textContent = String(gold | 0);",
     "    if (w) w.textContent = dev() ? '∞' : String(gold | 0);")

rule('Shop 卡片可買判斷（dev）',
     "      const can = gold >= k.price;",
     "      const can = dev() || gold >= k.price;")

rule('Shop 金幣來源提示',
     "    if (gh) gh.textContent = '過關獲得（單人與 RPG 都會給）';",
     "    if (gh) gh.textContent = dev() ? '開發者：金幣無限' : '過關或分享獲得';")

rule('Shop 匯出 dev',
     "    gold: function () { return gold; },",
     "    gold: function () { return gold; },\n    dev: dev,")

rule('Shop.render 同步分享區',
     """    });
  }
  function open() { syncGold(); render(); Screen.show('shop'); }
""",
     """    });
    try { if (typeof Share !== 'undefined') Share.render(); } catch (e) {}
  }
  function open() { syncGold(); render(); Screen.show('shop'); }
""")

# ------------------------------------------------------------------ ⑥ Share 模組
SHARE_JS = """// ================================================================
//   v4.18：分享拿金幣
//   防作假（前端先擋，真正的判定在伺服器）：
//     ① 一定要「真的分享出去」：優先用系統分享面板 navigator.share
//        （使用者按取消會拋 AbortError → 不給金幣）
//     ② 沒有系統面板時，要「頁面真的切出去過」（visibilitychange → hidden）才算，
//        光按一下按鈕不算
//     ③ 每次領取前先向伺服器要一次性 token（5 分鐘過期、用過即作廢）
//     ④ 伺服器記「每平台只能領一次、每天最多 3 次」→ 改 localStorage 也刷不出金幣
// ================================================================
const SHARE_PLATFORMS = [
  { k: 'line', ico: '💬', name: 'LINE',     url: 'https://social-plugins.line.me/lineit/share?url=' },
  { k: 'fb',   ico: '📘', name: 'Facebook', url: 'https://www.facebook.com/sharer/sharer.php?u=' },
  { k: 'x',    ico: '🐦', name: 'X',        url: 'https://twitter.com/intent/tweet?url=' },
  { k: 'wa',   ico: '🟢', name: 'WhatsApp', url: 'https://wa.me/?text=' },
  { k: 'copy', ico: '🔗', name: '複製連結', url: '' }
];
const Share = (function () {
  const REWARD = 1000, DAILY_MAX = 3;
  let claimed = {}, dayN = 0, busy = false, note = '';

  function api(path, body) {
    return fetch(apiPath(path), {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    }).then(function (r) {
      return r.json().then(function (j) { j.status = r.status; return j; },
        function () { return { ok: false, err: 'BAD_JSON', status: r.status }; });
    }).catch(function () { return { ok: false, err: 'NET' }; });
  }
  function member() {
    try { return !!(Cloud.acc() && Cloud.acc().kind === 'member'); } catch (e) { return false; }
  }
  function link() {
    try { return location.origin + location.pathname; } catch (e) { return 'https://bomb-hero-game.onrender.com/'; }
  }
  function byKind(k) {
    for (let i = 0; i < SHARE_PLATFORMS.length; i++) if (SHARE_PLATFORMS[i].k === k) return SHARE_PLATFORMS[i];
    return null;
  }
  // 等「頁面真的切出去」—— 使用者跳到 LINE／FB 才會 hidden，證明不是亂按
  function waitHidden(ms) {
    return new Promise(function (resolve) {
      let hid = false;
      function onVis() { if (document.visibilityState === 'hidden') hid = true; }
      document.addEventListener('visibilitychange', onVis);
      setTimeout(function () {
        document.removeEventListener('visibilitychange', onVis);
        resolve(hid);
      }, ms);
    });
  }
  function openWin(pl, url) {
    const txt = pl.k === 'wa' ? url + ' 爆爆英雄 BOMB HERO' : url;
    const target = pl.url + encodeURIComponent(txt);
    let w = null;
    try { w = window.open(target, '_blank', 'width=680,height=620,noopener'); } catch (e) {}
    if (!w) {           // 被瀏覽器攔下來 → 只能同頁跳（回來時已經算分享過）
      try { location.href = target; } catch (e) { return Promise.resolve(false); }
      return Promise.resolve(true);
    }
    return waitHidden(7000);
  }
  function doShare(pl) {
    const url = link();
    if (pl.k === 'copy') {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(url).then(function () { return true; }, function () { return false; });
      }
      return Promise.resolve(false);
    }
    const text = '爆爆英雄 BOMB HERO｜一起來炸彈人！ ' + url;
    if (navigator.share) {
      return navigator.share({ title: '爆爆英雄 BOMB HERO', text: text, url: url })
        .then(function () { return true; })
        .catch(function (err) {
          if (err && (err.name === 'AbortError' || err.name === 'NotAllowedError')) return false;
          return openWin(pl, url);
        });
    }
    return openWin(pl, url);
  }
  function errText(r) {
    if (r.err === 'ALREADY') return '這個平台已經領過了';
    if (r.err === 'DAILY_LIMIT') return '今天已經領滿 ' + DAILY_MAX + ' 次，明天再來';
    if (r.err === 'NEED_LOGIN') return '要登入正式帳號才能領（遊客不行）';
    if (r.err === 'EXPIRED' || r.err === 'BAD_TOKEN') return '分享驗證過期了，再按一次';
    if (r.err === 'NET') return '連不到伺服器，稍後再試';
    return '分享驗證沒通過';
  }
  function claim(kind) {
    const pl = byKind(kind);
    if (!pl) return Promise.resolve({ ok: false, err: 'BAD_PLATFORM' });
    if (busy) return Promise.resolve({ ok: false, err: 'BUSY' });
    if (claimed[pl.k]) { toast('這個平台已經領過 1000 金幣了', 2.2); return Promise.resolve({ ok: false, err: 'ALREADY' }); }
    if (!member()) {
      note = '🔐 分享金幣要先用右上角「帳號」登入（遊客不行）';
      render();
      toast('🔐 分享金幣要登入正式帳號才能領', 2.8);
      return Promise.resolve({ ok: false, err: 'NEED_LOGIN' });
    }
    busy = true; note = '正在開啟 ' + pl.name + '…'; render();
    return api('/api/share/prepare', { platform: pl.k }).then(function (prep) {
      if (!prep.ok) { busy = false; note = '⚠️ ' + errText(prep); render(); return prep; }
      return doShare(pl).then(function (ok) {
        if (!ok) {
          busy = false; note = '❌ 分享沒有完成（取消或沒跳出去），所以沒有金幣'; render();
          toast('❌ 分享沒完成，金幣不會入帳', 2.6);
          return { ok: false, err: 'CANCEL' };
        }
        return api('/api/share/claim', { platform: pl.k, token: prep.token }).then(function (r) {
          busy = false;
          if (r.ok) {
            claimed = (r.share && r.share.claimed) || claimed;
            dayN = (r.share && r.share.n) || (dayN + 1);
            Shop.addGold(r.reward || REWARD);
            try { if (r.account && r.account.rpg) RPG.gold = r.account.rpg.gold | 0; } catch (e) {}
            AudioSys.ensure(); AudioSys.sfx('item');
            toast('🎉 分享成功！+' + (r.reward || REWARD) + ' 金幣', 3);
            note = '';
            confetti();
          } else {
            note = '⚠️ ' + errText(r);
            toast('⚠️ ' + errText(r), 2.6);
          }
          render();
          try { Shop.render(); } catch (e) {}
          return r;
        });
      });
    });
  }
  function render() {
    const grid = $id('shareGrid');
    const nt = $id('shareNote');
    if (nt) nt.textContent = note;
    if (!grid) return;
    const dev = (function () { try { return !!(Cloud.isDev && Cloud.isDev()); } catch (e) { return false; } })();
    grid.innerHTML = SHARE_PLATFORMS.map(function (pl) {
      const done = !!claimed[pl.k] || dev;
      return '<button class="sharebtn' + (done ? ' done' : '') + '" data-share="' + pl.k + '"' +
        (done || busy ? ' disabled' : '') + '>' +
        '<span class="sbico">' + pl.ico + '</span>' + pl.name +
        '<span class="sbamt">' + (dev ? '∞' : (done ? '✔' : '+' + REWARD)) + '</span></button>';
    }).join('');
    grid.querySelectorAll('[data-share]').forEach(function (b) {
      b.addEventListener('click', function () {
        AudioSys.ensure(); AudioSys.sfx('click');
        claim(b.getAttribute('data-share'));
      });
    });
  }
  // 從雲端帳號帶回「哪些平台領過」（開商店時呼叫）
  function sync() {
    let acc = null;
    try { acc = Cloud.acc(); } catch (e) {}
    if (acc && acc.share) {
      claimed = acc.share.claimed || {};
      dayN = acc.share.n | 0;
    }
    render();
  }
  return {
    render: render, sync: sync, claim: claim,
    reward: REWARD, platforms: SHARE_PLATFORMS,
    claimed: function () { return claimed; },
    dayCount: function () { return dayN; },
    reset: function () { claimed = {}; dayN = 0; note = ''; render(); }   // 測試用
  };
})();

// ================================================================
//   v4.0：RPG 模式
// ================================================================"""
rule('Share 模組',
     """// ================================================================
//   v4.0：RPG 模式
// ================================================================""",
     SHARE_JS)

# ------------------------------------------------------------------ ⑦ 暱稱自動取名
rule('ensureNickname 可留空',
     """function ensureNickname() {
  if (settings.playerName) return true;
  const el = $id('playerName');
  if (el) { try { el.focus(); el.scrollIntoView({ block: 'center' }); } catch (e) {} }
  toast(t('nick.need'), 2.6, 'gear');
  return false;
}""",
     """// v4.18：暱稱可以留空 —— 沒填就自動取一個「玩家xxx」，之後仍可在首頁改
function autoNickname() {
  const n = '玩家' + (100 + Math.floor(Math.random() * 900));
  settings.playerName = n;
  saveSettings();
  const el = $id('playerName');
  if (el) el.value = n;
  const nm = $id('netName');
  if (nm && !nm.value) nm.value = n;
  return n;
}
function ensureNickname() {
  if (settings.playerName) return true;
  const n = autoNickname();
  toast(t('nick.auto', { n: n }), 3, 'gear');
  return true;
}""")

# ------------------------------------------------------------------ ⑧ i18n nick.auto（10 語言）
NICK = [
  ("'nick.need': '請先輸入你的暱稱（最多 8 字）',",
   "'nick.auto': '🦸 沒填暱稱，先用「{n}」開始（首頁可以再改）',"),
  ("'nick.need': '请先输入你的昵称（最多 8 字）',",
   "'nick.auto': '🦸 没填昵称，先用「{n}」开始（首页可以再改）',"),
  ("'nick.need': 'Please enter your nickname first (max 8 chars)',",
   "'nick.auto': '🦸 No nickname — starting as “{n}” (change it on the home screen)',"),
  ("'nick.need': 'ニックネームを入力してください（最大8文字）',",
   "'nick.auto': '🦸 ニックネーム未入力。「{n}」で開始します（ホームで変更できます）',"),
  ("'nick.need': '닉네임을 먼저 입력하세요 (최대 8자)',",
   "'nick.auto': '🦸 닉네임이 없어 「{n}」로 시작합니다 (홈에서 변경 가능)',"),
  ("'nick.need': 'กรุณาใส่ชื่อเล่นก่อน (สูงสุด 8 ตัวอักษร)',",
   "'nick.auto': '🦸 ยังไม่ได้ใส่ชื่อเล่น จะเริ่มด้วย “{n}” (เปลี่ยนได้ที่หน้าแรก)',"),
  ("'nick.need': 'Vui lòng nhập nickname trước (tối đa 8 ký tự)',",
   "'nick.auto': '🦸 Chưa có nickname — bắt đầu với “{n}” (đổi được ở trang chủ)',"),
  ("'nick.need': 'Сначала введите никнейм (макс. 8 символов)',",
   "'nick.auto': '🦸 Никнейм не задан — начнём как «{n}» (можно изменить на главной)',"),
  ("'nick.need': 'Bitte zuerst einen Nicknamen eingeben (max. 8 Zeichen)',",
   "'nick.auto': '🦸 Kein Nickname — starte als „{n}“ (auf der Startseite änderbar)',"),
  ("'nick.need': 'Inserisci prima un nickname (max 8 caratteri)',",
   "'nick.auto': '🦸 Nessun nickname — inizio come “{n}” (modificabile in home)',"),
]
for i, (a, b) in enumerate(NICK):
    rule('i18n nick.auto #%d' % (i + 1), a, a + '\n  ' + b)

# ------------------------------------------------------------------ 套用
ok = True
for name, old, new in rules:
    n = s.count(old)
    if n != 1:
        print('❌ %s → hits %d（必須 1）' % (name, n))
        ok = False
        continue
    s = s.replace(old, new)
    print('✓ %s' % name)

if not ok:
    print('中止：有規則沒命中')
    sys.exit(1)

save(s)
print('寫回 %s 完成（%d bytes）' % (PATH, len(s.replace('\n', '\r\n').encode('utf-8'))))
