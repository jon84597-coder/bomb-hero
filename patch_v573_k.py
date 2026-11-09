# -*- coding: utf-8 -*-
"""v5.73 patch K: 新手單按鈕首頁 + 今日進度"""
import io, os

D = os.path.dirname(__file__)
PH = os.path.join(D, 'bomb-hero', 'index.html')
PM = os.path.join(D, 'bomb-hero', 'js', 'main.js')

h = io.open(PH, 'r', encoding='utf-8', newline='').read()
m = io.open(PM, 'r', encoding='utf-8', newline='').read()
ho, mo = len(h), len(m)

# ---- HTML：招呼語下面加今日進度 ----
A1 = """        <div class="greet" id="greetLine" aria-live="polite"></div>"""
B1 = """        <div class="greet" id="greetLine" aria-live="polite"></div>
        <!-- v5.73：今日進度（把長期目標切成看得見的短段） -->
        <div class="todayline" id="todayLine"></div>"""
assert h.count(A1) == 1, 'A1 %d' % h.count(A1)
h = h.replace(A1, B1)

# ---- CSS ----
A2 = """#abyssBadge.hide { display: none; }"""
B2 = """#abyssBadge.hide { display: none; }
/* ===== v5.73：新手漸進解鎖 + 今日進度 ===== */
#scr-title .nickwrap .todayline { display: none; margin-top: 5px; font-size: 11px;
  color: #6b5a3e; line-height: 1.5; letter-spacing: .2px; }
#scr-title .nickwrap.lock .todayline { display: block; }
#scr-title .nickwrap .todayline b { color: #b4500a; font-weight: 900; }
#scr-title .nickwrap .todayline i { font-style: normal; color: #b9a888; margin: 0 5px; }
#homeMenu.starter[data-tier="0"] .mgrid .mbtn:not(#btnAdventure),
#homeMenu.starter[data-tier="1"] .mgrid .mbtn:not(#btnAdventure):not(#btnDaily):not(#btnStore),
#homeMenu.starter[data-tier="2"] .mgrid .mbtn:not(#btnAdventure):not(#btnDaily):not(#btnStore):not(#btnMulti):not(#btnBR) { display: none; }
#homeMenu.starter[data-tier="0"] #quickRow,
#homeMenu.starter[data-tier="1"] #quickRow,
#homeMenu.starter[data-tier="2"] #quickRow { display: none; }
#homeMenu.starter[data-tier="0"] .mgrid { grid-template-columns: 1fr; }
#homeMenu.starter[data-tier="1"] .mgrid,
#homeMenu.starter[data-tier="2"] .mgrid { grid-template-columns: 1fr 1fr; }
.startertip { display: none; margin: 8px 0 2px; padding: 8px 11px; border-radius: 12px;
  font-size: 11.5px; line-height: 1.55; color: #4a3418; text-align: center;
  background: linear-gradient(180deg, rgba(255,240,206,.9), rgba(255,222,164,.7));
  border: 1px dashed rgba(196,140,60,.55); }
#homeMenu.starter .startertip { display: block; }"""
assert h.count(A2) == 1, 'A2 %d' % h.count(A2)
h = h.replace(A2, B2)

# 首頁選單加提示列
A3 = """          <button class="drawbtn" id="btnQuit" type="button" data-ico="🚪">離開遊戲</button>
        </div>"""
B3 = """          <button class="drawbtn" id="btnQuit" type="button" data-ico="🚪">離開遊戲</button>
        </div>
        <!-- v5.73：新手引導（漸進解鎖時顯示「下一顆按鈕怎麼開」） -->
        <div class="startertip" id="starterTip"></div>"""
assert h.count(A3) == 1, 'A3 %d' % h.count(A3)
h = h.replace(A3, B3)

# ---- JS：Starter 模組 ----
A4 = """const NICK_PRICE = 5000;"""
B4 = """/* ============================================================================
   v5.73：Starter —— 新帳號的漸進解鎖
   · 第一次打開的人同時看到 6 張卡＋3 個入口＝選擇過載，最常發生的結果是「先關掉」
   · 只影響「沒有任何存檔痕跡」的帳號：老玩家一個像素都不會變
   · 通關 2 / 4 / 6 關各解鎖一批，第 6 關之後完全恢復原本的首頁
   ========================================================================== */
const Starter = (function () {
  function fresh() {
    try {
      if (typeof localStorage === 'undefined') return false;
      const st = parseInt(localStorage.getItem('bombhero-stage'), 10) || 1;
      if (st > 1) return false;
      if (settings && settings.nameLock && settings.playerName) return false;
      let rpgCleared = 0;
      try { rpgCleared = RPG.cleared | 0; } catch (e) { rpgCleared = 0; }
      if (rpgCleared > 0) return false;
      return true;
    } catch (e) { return false; }
  }
  function tier() {
    let n = 1;
    try { n = Solo.unlocked | 0; } catch (e) { n = 1; }
    if (n >= 6) return 3;
    if (n >= 4) return 2;
    if (n >= 2) return 1;
    return 0;
  }
  function apply() {
    const menu = $id('homeMenu');
    if (!menu || !menu.classList) return;
    if (!fresh()) {
      menu.classList.remove('starter');
      menu.removeAttribute('data-tier');
      return;
    }
    const t0 = tier();
    menu.classList.add('starter');
    menu.setAttribute('data-tier', String(t0));
    const tip = $id('starterTip');
    if (tip) {
      const left = t0 === 0 ? 2 : t0 === 1 ? 4 : 6;
      tip.innerHTML = t0 >= 3 ? '' : t('starter.tip', { n: Math.max(0, left - (function () {
        try { return Solo.unlocked | 0; } catch (e) { return 1; }
      })()) });
    }
  }
  return { fresh: fresh, tier: tier, apply: apply };
})();

const NICK_PRICE = 5000;"""
assert m.count(A4) == 1, 'A4 %d' % m.count(A4)
m = m.replace(A4, B4)

# ---- JS：今日進度 ----
A5 = """  function render(refresh) {"""
B5 = """  /* v5.73：今日進度 —— 跟招呼語同一行位置，把長期目標切成「今天看得到的數字」 */
  function todayLine() {
    const el = $id('todayLine');
    if (!el) return;
    let stage = 1, ab = 0, stars = 0, total = 0;
    try { stage = Solo.unlocked | 0; } catch (e) {}
    try { ab = Abyss.bestOf() | 0; } catch (e) {}
    try { stars = Gift.totalStars() | 0; } catch (e) {}
    try { total = SOLO_STAGES | 0; } catch (e) { total = 40; }
    const bits = [];
    bits.push(t('today.stage', { n: stage, m: total }));
    if (stars > 0) bits.push(t('today.stars', { n: stars, m: total * 3 }));
    if (ab > 0) bits.push(t('today.abyss', { n: ab }));
    el.innerHTML = bits.map(function (s) { return '<b>' + esc(s) + '</b>'; }).join('<i>·</i>');
  }

  function render(refresh) {"""
assert m.count(A5) == 1, 'A5 %d' % m.count(A5)
m = m.replace(A5, B5)

# greet() 之後一起更新
A6 = """  function greet() {"""
B6 = """  function greet() {
    try { todayLine(); } catch (e) {}"""
assert m.count(A6) == 1, 'A6 %d' % m.count(A6)
m = m.replace(A6, B6)

# 匯出
A7 = """    rename: rename, wire: wire, goldTxt: goldTxt, PRICE: NICK_PRICE, MAX: NICK_MAX, GREETS: NICK_GREETS };"""
B7 = """    rename: rename, wire: wire, goldTxt: goldTxt, todayLine: todayLine, PRICE: NICK_PRICE, MAX: NICK_MAX, GREETS: NICK_GREETS };"""
assert m.count(A7) == 1, 'A7 %d' % m.count(A7)
m = m.replace(A7, B7)

# ---- JS：呼叫 Starter.apply（回首頁時）----
A8 = """    try { if (name === 'title') Nick.greet(); else Nick.commit(); } catch (e) {}"""
B8 = """    try { if (name === 'title') { try { Starter.apply(); } catch (e) {} Nick.greet(); } else Nick.commit(); } catch (e) {}"""
assert m.count(A8) == 1, 'A8 %d' % m.count(A8)
m = m.replace(A8, B8)

assert h.count('\r\n') == 0 and m.count('\r\n') == 0, 'CRLF!'
for path, data in ((PH, h), (PM, m)):
    tmp = path + '.tmp'
    io.open(tmp, 'w', encoding='utf-8', newline='\n').write(data)
    os.replace(tmp, path)
print('OK html', ho, '->', len(h), '| js', mo, '->', len(m))
