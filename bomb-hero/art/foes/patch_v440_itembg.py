# -*- coding: utf-8 -*-
"""v4.40-1：道具徽章底色改成「淺色半透明」+ 圖示加深色柔和投影（保辨識度）"""
import io
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
P = os.path.join(ROOT, 'index.html')
s = io.open(P, encoding='utf-8', newline='').read()
CRLF = '\r\n' in s


def rep(old, new, tag):
    global s
    if CRLF:
        old = old.replace('\n', '\r\n')
        new = new.replace('\n', '\r\n')
    assert s.count(old) == 1, 'count=%d [%s]' % (s.count(old), tag)
    s = s.replace(old, new)
    print('ok [%s]' % tag)


rep("""  // 2) 圓形深底（只鋪在內圈，讓亮色圖示有對比；不含任何描邊）
  const rg = ctx.createRadialGradient(0, -R1 * .38, R1 * .12, 0, 0, R1);
  rg.addColorStop(0, 'rgba(46,60,92,.94)');
  rg.addColorStop(.70, 'rgba(18,26,44,.96)');
  rg.addColorStop(1, 'rgba(7,11,20,.98)');
  ctx.fillStyle = rg;
  ctx.beginPath(); ctx.arc(0, 0, R1, 0, 6.283); ctx.fill();""",
    """  // 2) 圓形底色 —— v4.40：改成「淺灰白半透明」的磨砂玻璃底。
  //    原本是近黑的深藍（rgba(7,11,20,.98)），暗底把圖示的暗部整個吃掉，
  //    圖形看起來糊成一團、認不出是什麼。淺色半透明底讓圖示自己跳出來。
  const rg = ctx.createRadialGradient(0, -R1 * .38, R1 * .12, 0, 0, R1);
  rg.addColorStop(0, 'rgba(255,255,255,.52)');
  rg.addColorStop(.62, 'rgba(237,243,251,.40)');
  rg.addColorStop(1, 'rgba(212,223,238,.30)');
  ctx.fillStyle = rg;
  ctx.beginPath(); ctx.arc(0, 0, R1, 0, 6.283); ctx.fill();
  // 2b) 頂端一道極淡的白光 → 玻璃感（不會蓋住圖示，圖示畫在它上面）
  const sg = ctx.createLinearGradient(0, -R1, 0, R1 * .1);
  sg.addColorStop(0, 'rgba(255,255,255,.34)');
  sg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sg;
  ctx.beginPath(); ctx.arc(0, 0, R1, 0, 6.283); ctx.fill();""",
    'badge-bg')

rep("""  // 5) 圖示本體：接近一格大（夾在內緣之內 → 金環壓不到圖）
  const isz = Math.min(T * .80, R1 * 2 - T * .04);
  ctx.drawImage(img, -isz / 2, -isz / 2, isz, isz);""",
    """  // 5) 圖示本體：接近一格大（夾在內緣之內 → 金環壓不到圖）
  //    v4.40：底色變淺後，淺色圖示（手套／骷髏）會跟底糊在一起 →
  //    給圖示加一層極柔和的深色投影，把輪廓托出來（不改圖、不加黑底）
  const isz = Math.min(T * .80, R1 * 2 - T * .04);
  ctx.save();
  try {
    ctx.shadowColor = 'rgba(14,22,38,.46)';
    ctx.shadowBlur = Math.max(2, T * .070);
    ctx.shadowOffsetY = Math.max(1, T * .014);
  } catch (e0) {}
  ctx.drawImage(img, -isz / 2, -isz / 2, isz, isz);
  ctx.restore();""",
    'badge-icon-shadow')

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('done')
