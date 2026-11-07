# -*- coding: utf-8 -*-
import io, os
P = 'bomb-hero/index.html'
s = io.open(P, encoding='utf-8').read()
n0 = len(s)
steps = []

def rep(a, b, n=1, tag=''):
    global s
    c = s.count(a)
    assert c == n, ('COUNT %d != %d :: %s' % (c, n, tag))
    s = s.replace(a, b, n)
    steps.append(tag)

# ① 把卡片按鈕的綁定抽成一支函式（每次重畫都要重綁）
old_head = """$id('btnBR').addEventListener('click', function () {
  AudioSys.sfx('click');
  let ov = $id('brOv');"""
new_head = """/* v5.40：卡片裡的按鈕（✕／出發）與名字輸入改成「每次重畫都重新綁」。
   以前只在第一次開卡時綁一次，但「切換地圖尺寸」會讓 ov.innerHTML = brCardHTML() 整張重畫，
   #brGo / #brOk 變成全新的節點 → 舊的事件監聽全部消失 → 按「出發」完全沒反應。
   這就是「選小地圖不能開、切了地圖也不能開」的真正原因（地圖尺寸是唯一會重畫的選項）。 */
function brCardWire(ov) {
  try { CharPreview.mount(ov); } catch (e) {}
  const nmIn = $id('brName');
  if (nmIn) {
    nmIn.addEventListener('input', function () {
      settings.brName = String(nmIn.value || '').slice(0, 8);
      saveSettings();
    });
    // 打字時不要把按鍵送進遊戲（WASD 會被當成移動）
    nmIn.addEventListener('keydown', function (ev) { ev.stopPropagation(); });
  }
  const okB = $id('brOk');
  if (okB) okB.addEventListener('click', function () {
    AudioSys.sfx('click'); ov.classList.add('hide');
  });
  const goB = $id('brGo');
  if (goB) goB.addEventListener('click', function () {
    AudioSys.sfx('click');
    let tkN = 0;
    try { tkN = Shop.tickets ? Shop.tickets() : 0; } catch (e) {}
    if (!BR.FREE && tkN <= 0) {
      ov.classList.add('hide');
      try { Shop.open(); } catch (e) {}
      return;
    }
    ov.classList.add('hide');
    try { startBR(); } catch (e) { try { __bootFail('startBR', e); } catch (e2) {} }
  });
}

$id('btnBR').addEventListener('click', function () {
  AudioSys.sfx('click');
  let ov = $id('brOv');"""
rep(old_head, new_head, 1, 'brCardWire')

# ② 開卡時改呼叫 brCardWire
old_open = """  // v5.11：角色預覽（走動畫）＋ 命名輸入
  (function () {
    try { CharPreview.mount(ov); } catch (e) {}
    const nmIn = $id('brName');
    if (nmIn) {
      nmIn.addEventListener('input', function () {
        settings.brName = String(nmIn.value || '').slice(0, 8);
        saveSettings();
      });
      // 打字時不要把按鍵送進遊戲（WASD 會被當成移動）
      nmIn.addEventListener('keydown', function (ev) { ev.stopPropagation(); });
    }
  })();"""
new_open = """  // v5.11：角色預覽（走動畫）＋ 命名輸入；v5.40 統一走 brCardWire（重畫後也要重綁）
  brCardWire(ov);"""
rep(old_open, new_open, 1, 'openWire')

# ③ 切換地圖後重畫完 → 重新綁（順便補回名字輸入的 input 監聽）
old_map = """        saveSettings();
        ov.innerHTML = brCardHTML();
        try { CharPreview.mount(ov); } catch (e) {}
        const nm3 = $id('brName');
        if (nm3) nm3.addEventListener('keydown', function (ev) { ev.stopPropagation(); });
        return;"""
new_map = """        saveSettings();
        ov.innerHTML = brCardHTML();
        brCardWire(ov);                         // v5.40：重畫後一定要重綁，否則「出發」按不動
        return;"""
rep(old_map, new_map, 1, 'rewire')

# ④ 移除舊的 brOk / brGo 綁定（已搬進 brCardWire）
old_tail = """  $id('brOk').addEventListener('click', function () {
    AudioSys.sfx('click'); ov.classList.add('hide');
  });
  $id('brGo').addEventListener('click', function () {
    AudioSys.sfx('click');
    let tkN = 0;
    try { tkN = Shop.tickets ? Shop.tickets() : 0; } catch (e) {}
    if (!BR.FREE && tkN <= 0) {
      ov.classList.add('hide');
      try { Shop.open(); } catch (e) {}
      return;
    }
    ov.classList.add('hide');
    try { startBR(); } catch (e) { try { __bootFail('startBR', e); } catch (e2) {} }
  });
});"""
new_tail = """});"""
rep(old_tail, new_tail, 1, 'dropOldBind')

out = s.replace('\r\n', '\n')
io.open(P + '.tmp', 'w', encoding='utf-8', newline='\n').write(out)
os.replace(P + '.tmp', P)
print('OK', n0, '->', len(out), 'delta', len(out) - n0)
print(' | '.join(steps))
