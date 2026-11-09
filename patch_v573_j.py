# -*- coding: utf-8 -*-
"""v5.73 patch J: 支線事件（商人 / 寶箱 / 賭局）"""
import io, os

D = os.path.dirname(__file__)
PH = os.path.join(D, 'bomb-hero', 'index.html')
PM = os.path.join(D, 'bomb-hero', 'js', 'main.js')

h = io.open(PH, 'r', encoding='utf-8', newline='').read()
m = io.open(PM, 'r', encoding='utf-8', newline='').read()
ho, mo = len(h), len(m)

# ---- CSS ----
A1 = """#abyssBadge.hide { display: none; }"""
B1 = """#abyssBadge.hide { display: none; }
/* v5.73：支線事件卡（沿用 .qcard 的奶油木框，只加遮罩與進場動畫） */
#sideEv { position: fixed; inset: 0; z-index: 78; display: flex; align-items: center;
  justify-content: center; padding: 18px; background: rgba(12,6,24,.58);
  -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px);
  animation: sevIn .22s ease-out both; }
@keyframes sevIn { from { opacity: 0 } to { opacity: 1 } }
#sideEv .qcard { max-width: 360px; width: 100%; animation: sevPop .26s cubic-bezier(.2,.9,.3,1.05) both; }
@keyframes sevPop { from { transform: scale(.9) translateY(10px) } to { transform: none } }
#sideEv .sevico { font-size: 42px; line-height: 1; filter: drop-shadow(0 4px 10px rgba(0,0,0,.35)); }
#sideEv .sevtag { display: inline-block; margin-top: 6px; padding: 2px 9px; border-radius: 999px;
  font-size: 10.5px; font-weight: 900; letter-spacing: .5px; color: #7a3d00;
  background: linear-gradient(180deg, #ffe6a8, #ffc35a); }
#sideEv .sevmsg { font-size: 12.5px; line-height: 1.6; color: #4a3418; margin: 8px 0 2px; }
#sideEv .sevmsg b { color: #b4500a; }
#sideEv .qbtn { width: 100%; margin-top: 8px; }"""
assert h.count(A1) == 1, 'A1 %d' % h.count(A1)
h = h.replace(A1, B1)

# ---- SideEvent 模組（放在 BuffPick 之後）----
A2 = """//   v4.17：隨從 —— 平常跟在主角旁邊，有怪物靠近（2 格）才會動作"""
B2 = """/* ============================================================================
   v5.73：支線事件 —— 過關後 12% 機率在下一關前遇到一件事
   · 路邊商人：半價買一件補給（金幣不足就不出現）
   · 寶箱：直接拿 120~260 金幣
   · 賭局：押 200，50% 得 500 / 50% 歸零
   刻意做成「一次按鈕就結束」的小卡：不打斷節奏，但每一次都有一點懸念。
   ========================================================================== */
const SideEvent = (function () {
  function roll() {
    if (Game.daily || Game.bossRush || Game.abyss || Game.wchal) return false;   // 公平模式不插事件
    if (Game.mode !== 'solo' && Game.mode !== 'rpg') return false;
    return Math.random() < .12;
  }
  function bagPick() {
    const all = ['hp1', 'arm1', 'fire1', 'rem1', 'xray', 'smoke', 'warp'];
    return all[Math.floor(Math.random() * all.length)];
  }
  function bagDef(id) {
    for (let i = 0; i < RPG_BAG.length; i++) if (RPG_BAG[i].id === id) return RPG_BAG[i];
    return null;
  }
  function close(next) {
    const el = document.getElementById('sideEv');
    if (el && el.parentNode) el.parentNode.removeChild(el);
    try { if (typeof next === 'function') next(); } catch (e) {}
  }
  function open(next) {
    if (typeof document === 'undefined' || !document.createElement) { try { next(); } catch (e) {} return; }
    const kind = Math.random();
    let gold = 0;
    try { gold = Shop.gold() | 0; } catch (e) { gold = 0; }
    const el = document.createElement('div');
    el.id = 'sideEv';
    if (kind < .34 && gold >= 300) {
      /* 商人 */
      const id = bagPick(), d = bagDef(id);
      const price = Math.max(120, Math.round((d ? d.price : 600) * .55));
      el.innerHTML = '<div class="qcard">' +
          '<div class="sevico">\\uD83E\\uDDF3\\uFE0F</div>' +
          '<span class="sevtag">SIDE EVENT</span>' +
          '<h3>路邊商人</h3>' +
          '<p class="sevmsg">「看你一身煙味，剛打完吧？」<br>他打開木箱，裡面只剩一件東西 —— <b>' +
            (d ? d.n : '補給') + '</b>，算你 <b>' + price + '</b> 金。</p>' +
          '<button class="qbtn" data-sev="buy">💰 ' + price + ' 買下</button>' +
          '<button class="qbtn ghost" data-sev="skip">先不用</button>' +
        '</div>';
      document.body.appendChild(el);
      el.addEventListener('click', function (e) {
        const b = e.target && e.target.closest ? e.target.closest('[data-sev]') : null;
        if (!b) { if (e.target === el) close(next); return; }
        const act = b.getAttribute('data-sev');
        if (act === 'buy') {
          const r = (function () { try { return Shop.spend(price); } catch (x) { return null; } })();
          if (r && r.ok) {
            try { RPG.bag[id] = (RPG.bag[id] | 0) + 1; RpgUI.saveCamp(); } catch (x) {}
            try { AudioSys.sfx('item'); toast('🎒 買到 ' + (d ? d.n : '補給'), 2.2); } catch (x) {}
          } else {
            try { AudioSys.sfx('hurt'); toast(t('shop.noGold'), 2); } catch (x) {}
          }
        }
        close(next);
      });
      try { AudioSys.sfx('coin'); } catch (e) {}
      return;
    }
    if (kind < .68) {
      /* 寶箱 */
      const got = 120 + Math.floor(Math.random() * 141);
      el.innerHTML = '<div class="qcard">' +
          '<div class="sevico">\\uD83D\\uDCE6</div>' +
          '<span class="sevtag">SIDE EVENT</span>' +
          '<h3>路邊寶箱</h3>' +
          '<p class="sevmsg">草叢裡有一只沒上鎖的箱子。<br>打開一看，裡面是 <b>' + got + '</b> 枚金幣。</p>' +
          '<button class="qbtn" data-sev="ok">💰 收下</button>' +
        '</div>';
      document.body.appendChild(el);
      try { Shop.addGold(got); } catch (e) {}
      el.addEventListener('click', function () { close(next); });
      try { AudioSys.sfx('coin'); } catch (e) {}
      return;
    }
    /* 賭局 */
    el.innerHTML = '<div class="qcard">' +
        '<div class="sevico">\\uD83C\\uDFB2</div>' +
        '<span class="sevtag">SIDE EVENT</span>' +
        '<h3>路邊賭局</h3>' +
        '<p class="sevmsg">戴眼罩的商人搖了搖骰盅：<br>「押 <b>200</b>，贏了給你 <b>500</b>。敢不敢？」</p>' +
        '<button class="qbtn" data-sev="bet">🎲 賭一把（200）</button>' +
        '<button class="qbtn ghost" data-sev="skip">算了</button>' +
      '</div>';
    document.body.appendChild(el);
    el.addEventListener('click', function (e) {
      const b = e.target && e.target.closest ? e.target.closest('[data-sev]') : null;
      if (!b) { if (e.target === el) close(next); return; }
      if (b.getAttribute('data-sev') === 'bet') {
        const r = (function () { try { return Shop.spend(200); } catch (x) { return null; } })();
        if (!r || !r.ok) { try { AudioSys.sfx('hurt'); toast(t('shop.noGold'), 2); } catch (x) {} close(next); return; }
        if (Math.random() < .5) {
          try { Shop.addGold(500); AudioSys.sfx('victory'); toast('🎉 贏了！+500 金幣', 2.4); } catch (x) {}
        } else {
          try { AudioSys.sfx('hurt'); toast('💸 輸了，200 金幣沒了', 2.4); } catch (x) {}
        }
      }
      close(next);
    });
    try { AudioSys.sfx('click'); } catch (e) {}
  }
  return { roll: roll, open: open };
})();

//   v4.17：隨從 —— 平常跟在主角旁邊，有怪物靠近（2 格）才會動作"""
assert m.count(A2) == 1, 'A2 %d' % m.count(A2)
m = m.replace(A2, B2)

# ---- 接到過關流程 ----
A3 = """                if (buffsOn()) BuffPick.open(goNext); else goNext();"""
B3 = """                /* v5.73：強化三選一之後，12% 機會插一張支線事件卡 */
                const afterBuff = function () {
                  let ev = false;
                  try { ev = SideEvent.roll(); } catch (e) { ev = false; }
                  if (ev) { try { SideEvent.open(goNext); return; } catch (e) {} }
                  goNext();
                };
                if (buffsOn()) BuffPick.open(afterBuff); else afterBuff();"""
assert m.count(A3) == 1, 'A3 %d' % m.count(A3)
m = m.replace(A3, B3)

assert h.count('\r\n') == 0 and m.count('\r\n') == 0, 'CRLF!'
for path, data in ((PH, h), (PM, m)):
    tmp = path + '.tmp'
    io.open(tmp, 'w', encoding='utf-8', newline='\n').write(data)
    os.replace(tmp, path)
print('OK html', ho, '->', len(h), '| js', mo, '->', len(m))
