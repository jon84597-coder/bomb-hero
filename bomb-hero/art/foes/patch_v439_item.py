# -*- coding: utf-8 -*-
# v4.39 補丁 3：道具徽章重畫 —— 圓形亮金外框（不壓圖示）＋ 圖示放大到接近一格
import io, os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
P = os.path.join(ROOT, 'index.html')
s = io.open(P, encoding='utf-8', newline='').read()
CRLF = '\r\n' in s

NEW = """// v4.39：道具徽章重畫
//   · 外框改成「圓形亮金環」（像按鍵的金屬外圈），環只圈在圖示外面 → 絕對不壓到圖案
//   · 圖示本體放大到 0.80 格（原本 0.465 格），一眼看得出是什麼道具
//   · 金環有金屬漸層 ＋ 沿環跑動的星芒 ＋ 呼吸光暈
function drawItemBadge(px, py, T, type, img, pulse) {
  const R0 = T * .487;                       // 金環外緣半徑（直徑 ≈ 0.97 格）
  const lw = Math.max(2.2, T * .060);        // 金環粗細
  const R1 = R0 - lw * .62;                  // 金環內緣 = 圖示能畫到的最大半徑
  const tint = ITEM_TINT[type] || '#ffd166';
  const gt = Game.gameT || 0;
  ctx.save();
  ctx.translate(px, py);
  // 1) 外光暈（呼吸，顏色跟道具走）
  ctx.globalAlpha = .22 + pulse * .20;
  const g2 = ctx.createRadialGradient(0, 0, R1 * .55, 0, 0, R0 * 1.34);
  g2.addColorStop(0, tint);
  g2.addColorStop(.58, tint);
  g2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g2;
  ctx.beginPath(); ctx.arc(0, 0, R0 * 1.34, 0, 6.283); ctx.fill();
  ctx.globalAlpha = 1;
  // 2) 圓形深底（只鋪在內圈，讓亮色圖示有對比；不含任何描邊）
  const rg = ctx.createRadialGradient(0, -R1 * .38, R1 * .12, 0, 0, R1);
  rg.addColorStop(0, 'rgba(46,60,92,.94)');
  rg.addColorStop(.70, 'rgba(18,26,44,.96)');
  rg.addColorStop(1, 'rgba(7,11,20,.98)');
  ctx.fillStyle = rg;
  ctx.beginPath(); ctx.arc(0, 0, R1, 0, 6.283); ctx.fill();
  // 3) 亮金外環（左上亮、右下暗 → 打磨過的金屬感）
  const mg = ctx.createLinearGradient(-R0, -R0, R0, R0);
  mg.addColorStop(0, '#fff6cf');
  mg.addColorStop(.26, '#ffd766');
  mg.addColorStop(.52, '#c8962d');
  mg.addColorStop(.74, '#ffe79c');
  mg.addColorStop(1, '#8d6216');
  ctx.strokeStyle = mg;
  ctx.lineWidth = lw;
  ctx.beginPath(); ctx.arc(0, 0, R0 - lw / 2, 0, 6.283); ctx.stroke();
  // 4) 環的內側亮線 ＋ 外側暗線 → 圓環才有厚度（都在圖示外）
  ctx.strokeStyle = 'rgba(255,252,226,.55)';
  ctx.lineWidth = Math.max(.9, lw * .17);
  ctx.beginPath(); ctx.arc(0, 0, R1 + lw * .10, 0, 6.283); ctx.stroke();
  ctx.strokeStyle = 'rgba(58,36,4,.55)';
  ctx.lineWidth = Math.max(.8, lw * .15);
  ctx.beginPath(); ctx.arc(0, 0, R0 - lw * .08, 0, 6.283); ctx.stroke();
  // 5) 圖示本體：接近一格大（夾在內緣之內 → 金環壓不到圖）
  const isz = Math.min(T * .80, R1 * 2 - T * .04);
  ctx.drawImage(img, -isz / 2, -isz / 2, isz, isz);
  // 6) 沿著金環跑的星芒（一閃一閃 ↘ 精緻感）
  const a0 = gt * 1.35;
  ctx.strokeStyle = 'rgba(255,255,255,.82)';
  ctx.lineWidth = Math.max(1.4, lw * .36);
  ctx.beginPath(); ctx.arc(0, 0, R0 - lw * .5, a0, a0 + .85); ctx.stroke();
  const sa = a0 + .42;
  const sx = Math.cos(sa) * (R0 - lw * .5), sy = Math.sin(sa) * (R0 - lw * .5);
  ctx.globalAlpha = .45 + .45 * Math.sin(gt * 5.2);
  ctx.fillStyle = '#fffbe8';
  ctx.beginPath(); ctx.arc(sx, sy, Math.max(1.2, T * .032), 0, 6.283); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}"""

i = s.index('function drawItemBadge(')
j = s.index('ctx.restore();', i)
end = s.index('}', j) + 1
old = s[i:end]
if CRLF:
    NEW = NEW.replace('\n', '\r\n')
s = s[:i] + NEW + s[end:]
print('ok [itemBadge] 取代 %d 字元 → %d 字元' % (len(old), len(NEW)))

# 圖鑑：把道具圖示一起吃金環（跟場上同一套視覺）
old2 = """    const img = (typeof ItemArt !== 'undefined') ? ItemArt.get(type) : null;
    if (img) {
      const s2 = Math.min(w, h) * .94;
      g.drawImage(img, cx - s2 / 2, cy - s2 / 2, s2, s2);
      return;
    }"""
new2 = """    const img = (typeof ItemArt !== 'undefined') ? ItemArt.get(type) : null;
    if (img) {
      // v4.39：圖鑑也吃同一套圓形金框（金框半徑 ≈ 0.487 格 → 這裡用卡片尺寸換算）
      const s2 = Math.min(w, h) * .90;
      const icx = cx, icy = cy;
      const R0 = s2 * .50, lw = Math.max(2, s2 * .060), R1 = R0 - lw * .62;
      const rg2 = g.createRadialGradient(0, -R1 * .38, R1 * .12, 0, 0, R1);
      rg2.addColorStop(0, 'rgba(46,60,92,.94)');
      rg2.addColorStop(.70, 'rgba(18,26,44,.96)');
      rg2.addColorStop(1, 'rgba(7,11,20,.98)');
      g.fillStyle = rg2;
      g.beginPath(); g.arc(icx, icy, R1, 0, 6.283); g.fill();
      const mg2 = g.createLinearGradient(icx - R0, icy - R0, icx + R0, icy + R0);
      mg2.addColorStop(0, '#fff6cf');
      mg2.addColorStop(.26, '#ffd766');
      mg2.addColorStop(.52, '#c8962d');
      mg2.addColorStop(.74, '#ffe79c');
      mg2.addColorStop(1, '#8d6216');
      g.strokeStyle = mg2;
      g.lineWidth = lw;
      g.beginPath(); g.arc(icx, icy, R0 - lw / 2, 0, 6.283); g.stroke();
      const isz = Math.min(s2 * .82, R1 * 2 - s2 * .04);
      g.drawImage(img, icx - isz / 2, icy - isz / 2, isz, isz);
      return;
    }"""
o2, n2 = old2, new2
if CRLF:
    o2 = o2.replace('\n', '\r\n')
    n2 = n2.replace('\n', '\r\n')
assert s.count(o2) == 1
s = s.replace(o2, n2)
print('ok [helpItem]')

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('bytes', len(s.encode('utf-8')))
