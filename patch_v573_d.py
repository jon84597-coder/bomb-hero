# -*- coding: utf-8 -*-
"""v5.73 patch D: 深淵入口 + 每日特惠樣式"""
import io, os

D = os.path.dirname(__file__)
PH = os.path.join(D, 'bomb-hero', 'index.html')
PM = os.path.join(D, 'bomb-hero', 'js', 'main.js')

h = io.open(PH, 'r', encoding='utf-8', newline='').read()
ho = len(h)
m = io.open(PM, 'r', encoding='utf-8', newline='').read()
mo = len(m)

# ---- HTML：冒險模式彈窗加深淵 ----
A1 = """        <button class="qbtn" id="btnRpg" type="button">🎲 RPG 養成模式</button>
      </div>"""
B1 = """        <button class="qbtn" id="btnRpg" type="button">🎲 RPG 養成模式</button>
        <!-- v5.73：深淵（無盡）—— 40 關全破後解鎖 -->
        <button class="qbtn qbtn-abyss" id="btnAbyss" type="button">🕳️ 深淵（無盡）<small id="abyssTip">40 關全破後解鎖</small></button>
      </div>"""
assert h.count(A1) == 1, 'A1 %d' % h.count(A1)
h = h.replace(A1, B1)

# ---- CSS ----
A2 = """#gameTop { gap: 6px; }"""
B2 = """#gameTop { gap: 6px; }
/* ===== v5.73：深淵 HUD 徽章 / 每日特惠 ===== */
#abyssBadge { position: fixed; left: 8px; top: 52px; z-index: 12; display: flex; flex-direction: column;
  gap: 1px; padding: 5px 10px 6px; border-radius: 13px; pointer-events: none;
  background: linear-gradient(180deg, rgba(34,12,52,.88), rgba(10,3,20,.92));
  border: 1px solid rgba(178,118,255,.55);
  box-shadow: 0 5px 16px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.16);
  font-size: 11px; line-height: 1.25; color: #efe4ff; }
#abyssBadge b { font-size: 12.5px; font-weight: 900; color: #cfadff;
  text-shadow: 0 0 9px rgba(158,96,255,.8); }
#abyssBadge i { font-style: normal; font-size: 10px; color: #9d8bb9; letter-spacing: .2px; }
#abyssBadge.hide { display: none; }
.qbtn.qbtn-abyss { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.qbtn.qbtn-abyss small { font-size: 10.5px; opacity: .78; font-weight: 700; }
#shopDeal { grid-column: 1 / -1; display: flex; flex-direction: column; gap: 7px; padding: 11px 12px;
  border-radius: 16px; background: linear-gradient(155deg, rgba(255,228,156,.26), rgba(255,172,72,.12));
  border: 1px solid rgba(255,200,90,.45); box-shadow: inset 0 1px 0 rgba(255,255,255,.3); }
.dealhd { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.dealhd b { font-size: 14px; color: #7a3d00; }
.dealhd i { font-style: normal; font-size: 11px; color: #9a6a20; }
.dealcard { display: flex; align-items: center; gap: 9px; padding: 7px 9px; border-radius: 12px;
  background: rgba(255,255,255,.62); border: 1px solid rgba(255,190,80,.38); }
.dealcard.off { opacity: .55; }
.dealico { font-size: 20px; width: 26px; text-align: center; filter: drop-shadow(0 1px 2px rgba(120,70,0,.25)); }
.dealmeta { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.dealmeta b { font-size: 12.5px; color: #3a2a12; white-space: nowrap; overflow: hidden;
  text-overflow: ellipsis; }
.dealmeta i { font-style: normal; font-size: 10.5px; color: #c2510c; font-weight: 900; }
.dealprice { display: flex; flex-direction: column; align-items: flex-end; font-size: 11px; color: #6b5a3a; }
.dealprice s { font-size: 10px; color: #a8906c; }
.dealprice b { font-size: 12.5px; color: #b4500a; }
.dealbtn { border: 0; border-radius: 10px; padding: 6px 11px; font-size: 11.5px; font-weight: 900;
  color: #fff; background: linear-gradient(180deg, #ffc65a, #ef8a1c);
  box-shadow: 0 2px 0 #b45c08, inset 0 1px 0 rgba(255,255,255,.5); cursor: pointer; }
.dealbtn[disabled] { opacity: .45; box-shadow: none; cursor: default; }"""
assert h.count(A2) == 1, 'A2 %d' % h.count(A2)
h = h.replace(A2, B2)

# ---- JS：入口事件 + 鎖定提示 ----
A3 = """(function () {
  const adv = $id('btnAdventure');"""
B3 = """/* v5.73：深淵入口。40 關全破才開 —— 沒破關的人點下去要知道「還差什麼」，
   不是按了沒反應。 */
(function () {
  const b = $id('btnAbyss');
  if (b && b.addEventListener) b.addEventListener('click', function () {
    AudioSys.ensure(); AudioSys.sfx('click');
    if (!ensureNickname()) return;
    if (!Abyss.unlocked()) { AudioSys.sfx('hurt'); toast(t('abyss.locked'), 3); return; }
    showAdvPick(false);
    try { Abyss.start(1); } catch (e) { try { toast('深淵載入失敗，請重新整理', 2.6); } catch (e2) {} }
  });
})();
(function () {
  const adv = $id('btnAdventure');"""
assert m.count(A3) == 1, 'A3 %d' % m.count(A3)
m = m.replace(A3, B3)

# showAdvPick 裡更新深淵按鈕狀態
A4 = """  const s1 = $id('btnSolo'), s2 = $id('btnRpg');
  if (s1) s1.textContent = t('adv.solo');
  if (s2) s2.textContent = t('adv.rpg');"""
B4 = """  const s1 = $id('btnSolo'), s2 = $id('btnRpg');
  if (s1) s1.textContent = t('adv.solo');
  if (s2) s2.textContent = t('adv.rpg');
  /* v5.73：深淵按鈕 —— 鎖住時直接寫「還差幾關」 */
  const ab = $id('btnAbyss'), at = $id('abyssTip');
  if (ab) {
    const ok = Abyss.unlocked();
    ab.classList.toggle('locked', !ok);
    const lv = ab.querySelector('b');
    if (at) {
      at.textContent = ok
        ? t('abyss.bestShort', { n: Abyss.bestOf() })
        : t('abyss.needMore', { n: Math.max(0, SOLO_STAGES - (Solo.unlocked | 0)) });
    }
  }"""
assert m.count(A4) == 1, 'A4 %d' % m.count(A4)
m = m.replace(A4, B4)

assert h.count('\r\n') == 0 and m.count('\r\n') == 0, 'CRLF!'
for path, data in ((PH, h), (PM, m)):
    tmp = path + '.tmp'
    io.open(tmp, 'w', encoding='utf-8', newline='\n').write(data)
    os.replace(tmp, path)
print('OK html', ho, '->', len(h), '| js', mo, '->', len(m))
