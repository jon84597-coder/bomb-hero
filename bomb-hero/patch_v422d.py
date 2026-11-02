# -*- coding: utf-8 -*-
"""v4.22 patch D：第一次觸控時不要馬上改版面（會讓正在進行的 click 消失）＋上一頁補 44px"""
import io

P = 'index.html'
s = io.open(P, encoding='utf-8').read().replace('\r\n', '\n')

def rep(old, new, tag):
    global s
    n = s.count(old)
    assert n == 1, '[%s] 找到 %d 次' % (tag, n)
    s = s.replace(old, new)
    print('ok  ' + tag)

# ---------------------------------------------------------------- 1) 延後套用控制模式
rep("""// ---------- 裝置自動切換：一動就切，切完馬上重綁按鍵 ----------
InputSense.onSwitch(function (m) {
  try { applyCtrl(); } catch (e) {}
  try { applyCtrlToPlayers(); } catch (e) {}
  try { updateHud(); } catch (e) {}
  try { toast(t('ctrl.switch', { m: InputSense.label(m) }), 2); } catch (e) {}
});""",
"""// ---------- 裝置自動切換：一動就切，切完馬上重綁按鍵 ----------
InputSense.onSwitch(function (m) {
  function apply() {
    try { applyCtrl(); } catch (e) {}
    try { applyCtrlToPlayers(); } catch (e) {}
    try { updateHud(); } catch (e) {}
    try { toast(t('ctrl.switch', { m: InputSense.label(m) }), 2); } catch (e) {}
  }
  /* v4.22：第一次碰到螢幕就切換模式時，applyCtrl() 會把 .wrap 從「整頁捲動」改成
     「容器內捲動」，那一瞬間版面會重排 → 手指底下的按鈕失效、click 合成不出來
     （「第一次點商店／帳號沒反應」的真兇之二）。
     延到 280ms 後才套用：click 早就派發完了，玩家完全感覺不到。 */
  if (m === 'touch') { try { setTimeout(apply, 280); } catch (e) { apply(); } }
  else apply();
});""", 'R1 延後 applyCtrl')

# ---------------------------------------------------------------- 2) 上一頁也 44px
rep("""    #acctChip { min-height: 44px; padding: 0 14px; font-size: 15px; gap: 5px; }""",
"""    #acctChip { min-height: 44px; padding: 0 14px; font-size: 15px; gap: 5px; }
    #navBar #btnBack { min-height: 44px; padding: 0 14px 0 11px; font-size: 14px; }""",
    'R2 上一頁 44px')

io.open(P, 'w', encoding='utf-8', newline='').write(s.replace('\n', '\r\n'))
print('寫回 index.html')
