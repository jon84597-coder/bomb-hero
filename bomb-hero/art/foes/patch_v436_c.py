# -*- coding: utf-8 -*-
# v4.36 patch 3：元素特效繪製 + 元素彈繪製
import io, sys

P = r'C:\Users\jon84\WorkBuddy\2026-10-30-12-58-54\bomb-hero\index.html'
s = io.open(P, encoding='utf-8', newline='').read()
orig = s

def rep(old, new, n=1, tag=''):
    global s
    old = old.replace('\r\n', '\n'); new = new.replace('\r\n', '\n')
    lf = s.replace('\r\n', '\n')
    c = lf.count(old)
    if c != n:
        print('!! [%s] 命中 %d 次（預期 %d）' % (tag, c, n)); sys.exit(1)
    s = lf.replace(old, new).replace('\n', '\r\n')
    print('ok  [%s]' % tag)

CODE = """
// ================================================================
//   v4.36：小怪的元素特效（火／冰霧／雷／邪氣／水／風／霓虹／毒／砂塵／自然）
//   分兩層畫：back 在本體後面（光暈），front 在本體前面（火星、霧氣、電弧）。
//   全部用 Game.gameT 當動畫時鐘，不新增任何貼圖 → 不會增加檔案大小。
// ================================================================
function drawFoeElement(e, x, y, R, flash, layer) {
  if (flash || !e) return;
  const fx = e.fx || '';
  const st = FOE_FX_STYLE[fx];
  if (!st) return;
  const t = Game.gameT + (e.bobP || 0) * .6;
  const by = y - R * (e.kind === 'fly' ? .12 : .04);

  if (layer === 'back') {
    // 背上的一圈元素光暈（讀圖時最快分辨「這隻是什麼屬性」）
    if (ctx.createRadialGradient) {
      let g = null;
      try { g = ctx.createRadialGradient(x, by, R * .18, x, by, R * 1.6); } catch (err) { g = null; }
      if (g && g.addColorStop) {
        const pulse = .26 + Math.sin(t * 3.1) * .06;
        g.addColorStop(0, 'rgba(' + st.glow + ',' + pulse.toFixed(3) + ')');
        g.addColorStop(.55, 'rgba(' + st.glow + ',.10)');
        g.addColorStop(1, 'rgba(' + st.glow + ',0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, by, R * 1.6, 0, 6.283); ctx.fill();
      }
    }
    // 邪氣／毒霧：底部一圈會轉的黑紫煙
    if (fx === 'dark' || fx === 'poison') {
      ctx.save();
      for (let i = 0; i < 3; i++) {
        const a = t * 1.1 + i * 2.09;
        const rx = x + Math.cos(a) * R * .8, ry = by + R * .62 + Math.sin(a) * R * .18;
        ctx.fillStyle = 'rgba(' + st.glow + ',.13)';
        ctx.beginPath(); ctx.ellipse(rx, ry, R * .34, R * .14, 0, 0, 6.283); ctx.fill();
      }
      ctx.restore();
    }
    return;
  }

  // ---------- front：往上飄的元素粒子 ----------
  for (let i = 0; i < 3; i++) {
    const ph = (t * .85 + i * .34) % 1;
    const px = x + Math.sin(t * 2.2 + i * 2.1) * R * .92;
    const py = by + R * .55 - ph * R * 1.75;
    const a = (1 - ph) * .78;
    if (fx === 'thunder') {
      if (Math.sin(t * 11 + i * 2) < .1) continue;                  // 電弧只閃一下
      ctx.strokeStyle = 'rgba(' + st.glow + ',' + a.toFixed(3) + ')';
      ctx.lineWidth = Math.max(1, R * .06);
      const lx = x + (i - 1) * R * .55, ly = by - R * .95;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx + R * .16, ly + R * .28);
      ctx.lineTo(lx - R * .12, ly + R * .40);
      ctx.lineTo(lx + R * .20, ly + R * .84);
      ctx.stroke();
      ctx.lineWidth = 1;
      continue;
    }
    const rr = Math.max(.9, R * (fx === 'ice' ? .13 : .11) * (1 - ph * .45));
    ctx.fillStyle = 'rgba(' + st.glow + ',' + a.toFixed(3) + ')';
    if (fx === 'ice' || fx === 'neon' || fx === 'wind') {
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(t * 1.8 + i);
      ctx.beginPath();
      ctx.moveTo(0, -rr); ctx.lineTo(rr * .7, 0); ctx.lineTo(0, rr); ctx.lineTo(-rr * .7, 0);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    } else {
      ctx.beginPath(); ctx.arc(px, py, rr, 0, 6.283); ctx.fill();
    }
  }
  // 砂塵：腳邊一圈飛砂
  if (fx === 'earth') {
    for (let i = 0; i < 4; i++) {
      const a = t * 2 + i * 1.57;
      const rx = x + Math.cos(a) * R * .95;
      const ry = y + R * .55 + Math.sin(a * 1.3) * R * .07;
      ctx.fillStyle = 'rgba(' + st.glow + ',.22)';
      ctx.beginPath(); ctx.arc(rx, ry, Math.max(.8, R * .09), 0, 6.283); ctx.fill();
    }
  }
  // 水霧：一圈淡淡的水紋
  if (fx === 'water') {
    ctx.strokeStyle = 'rgba(' + st.glow + ',.18)';
    ctx.lineWidth = 1.2;
    const rr2 = R * (.85 + (t * .5 % 1) * .35);
    ctx.beginPath(); ctx.ellipse(x, by + R * .55, rr2, rr2 * .28, 0, 0, 6.283); ctx.stroke();
    ctx.lineWidth = 1;
  }
}

// v4.36：元素彈（小怪吐出來的），飛行中＋落點提示圈
function drawBolts(T) {
  const list = Game.bolts || [];
  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    const k = Math.min(1, b.t / b.dur);
    const col = BOLT_COLOR[b.kind] || '#ffb347';
    // 落點提示（越接近命中越亮、越縮）
    const rr = T * (.34 - k * .16);
    ctx.strokeStyle = col;
    try { ctx.globalAlpha = .35 + k * .45; } catch (err) {}
    ctx.lineWidth = Math.max(1.2, T * .055);
    ctx.beginPath(); ctx.arc(b.tx, b.ty + T * .12, rr, 0, 6.283); ctx.stroke();
    ctx.beginPath(); ctx.arc(b.tx, b.ty + T * .12, rr * .45, 0, 6.283); ctx.stroke();
    ctx.lineWidth = 1;
    // 飛行中的彈體（帶一條尾巴）
    const px = b.sx + (b.tx - b.sx) * k;
    const py = b.sy + (b.ty - b.sy) * k - Math.sin(Math.PI * k) * T * .3;
    const bx = b.sx + (b.tx - b.sx) * Math.max(0, k - .16);
    const byy = b.sy + (b.ty - b.sy) * Math.max(0, k - .16) - Math.sin(Math.PI * Math.max(0, k - .16)) * T * .3;
    ctx.strokeStyle = col;
    try { ctx.globalAlpha = .55; } catch (err) {}
    ctx.lineWidth = Math.max(1.4, T * .07);
    ctx.beginPath(); ctx.moveTo(bx, byy); ctx.lineTo(px, py); ctx.stroke();
    try { ctx.globalAlpha = 1; } catch (err) {}
    ctx.lineWidth = 1;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(px, py, T * .105, 0, 6.283); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.beginPath(); ctx.arc(px, py, T * .045, 0, 6.283); ctx.fill();
  }
}

"""
rep("""function drawEnemy(e, T) {""", CODE + """function drawEnemy(e, T) {""", 1, 'draw-foe-element')

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('\nDONE  chars %d -> %d' % (len(orig), len(s)))
