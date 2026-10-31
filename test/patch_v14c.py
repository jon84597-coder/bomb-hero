# -*- coding: utf-8 -*-
import io
p = 'index.html'
s = io.open(p, encoding='utf-8').read()

# ---------- 1. 第一關配色改成插畫的木箱＋草地 ----------
old = "  { name: '綠野草原', bg1: '#20361f', bg2: '#28452a', floor: '#a3bd83', floor2: '#93ad74', hard: '#87909c', soft: '#c98d4b', soft2: '#a06a34', accent: '#8fe08f', hazards: [] },"
new = "  { name: '綠野草原', bg1: '#f3ead2', bg2: '#e4efd2', floor: '#bcd9a2', floor2: '#b1cf95', hard: '#d3a781', soft: '#e6c4a1', soft2: '#c79c74', accent: '#8fe08f', hazards: [] },"
assert old in s
s = s.replace(old, new, 1)

# ---------- 2. 繪本風背景工具（插在 render 之前） ----------
anchor = "function render() {"
assert anchor in s
tools = r"""// ---------- 繪本風背景：柔和漸層 + 光斑 + 葉影 / 木箱 / 草地 ----------
function dhash(x, y, sd) {
  let n = (x * 374761393 + y * 668265263 + sd * 1442695040) | 0;
  n = (n ^ (n >>> 13)) * 1274126177 | 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}
function shadeHex(hex, k) {
  if (!hex || hex.charAt(0) !== '#') return hex;
  let h = hex.slice(1);
  if (h.length === 3) h = h.replace(/(.)/g, '$1$1');
  const n = parseInt(h, 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.max(0, Math.min(255, Math.round(r * k)));
  g = Math.max(0, Math.min(255, Math.round(g * k)));
  b = Math.max(0, Math.min(255, Math.round(b * k)));
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}
// 畫布底色：天空漸層 + 暖光 + 光斑 + 四周葉蔭
function paintBackdrop(th) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, th.bg1);
  g.addColorStop(1, th.bg2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const r1 = ctx.createRadialGradient(VIEW_W * .16, -VIEW_H * .12, 0, VIEW_W * .16, -VIEW_H * .12, VIEW_W * .8);
  r1.addColorStop(0, 'rgba(255,247,214,.55)');
  r1.addColorStop(1, 'rgba(255,247,214,0)');
  ctx.fillStyle = r1;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  for (let i = 0; i < 10; i++) {
    const bx = (dhash(i, 3, 5) * 1.08 - .04) * VIEW_W;
    const by = dhash(i, 9, 7) * VIEW_H * .92;
    const br = VIEW_W * (.025 + dhash(i, 5, 11) * .05);
    ctx.fillStyle = 'rgba(255,255,255,' + (.05 + dhash(i, 7, 13) * .09).toFixed(2) + ')';
    ctx.beginPath(); ctx.arc(bx, by, br, 0, 6.283); ctx.fill();
  }
  const vg = ctx.createRadialGradient(VIEW_W * .5, VIEW_H * .45, Math.min(VIEW_W, VIEW_H) * .32,
                                      VIEW_W * .5, VIEW_H * .45, Math.max(VIEW_W, VIEW_H) * .8);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(46,28,10,.32)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}
// 木箱：圓角箱體 + 頂面亮邊 + 底部暗面 + 木紋 + 四角釘
function drawCrate(px, py, T, base, dark, big) {
  const inset = big ? T * .02 : T * .08;
  const x = px + inset, y = py + inset, w = T - inset * 2, h = T - inset * 2;
  const r = big ? T * .16 : T * .13;
  ctx.fillStyle = 'rgba(96,62,28,.26)';
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x + T * .03, y + T * .07, w, h, r); ctx.fill(); }
  else ctx.fillRect(x + T * .03, y + T * .07, w, h);
  const lg = ctx.createLinearGradient(x, y, x, y + h);
  lg.addColorStop(0, shadeHex(base, 1.16));
  lg.addColorStop(.55, base);
  lg.addColorStop(1, dark || shadeHex(base, .84));
  ctx.fillStyle = lg;
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); }
  else ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(255,255,255,.34)';
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x + w * .08, y + h * .07, w * .84, h * .19, r * .7); ctx.fill(); }
  ctx.fillStyle = 'rgba(96,54,20,.16)';
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x + w * .06, y + h * .71, w * .88, h * .22, r * .7); ctx.fill(); }
  ctx.strokeStyle = 'rgba(122,80,44,.22)';
  ctx.lineWidth = Math.max(1, T * .028);
  ctx.beginPath();
  ctx.moveTo(x + w * .17, y + h * .42); ctx.lineTo(x + w * .83, y + h * .42);
  ctx.moveTo(x + w * .25, y + h * .58); ctx.lineTo(x + w * .75, y + h * .58);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(122,80,44,.42)';
  ctx.lineWidth = Math.max(1.2, T * .042);
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x + w * .07, y + h * .07, w * .86, h * .86, r * .8); ctx.stroke(); }
  ctx.lineWidth = 1;
  ctx.fillStyle = 'rgba(255,242,216,.6)';
  [[.18, .18], [.82, .18], [.18, .82], [.82, .82]].forEach(function (o) {
    ctx.beginPath(); ctx.arc(px + T * o[0], py + T * o[1], Math.max(1.3, T * .042), 0, 6.283); ctx.fill();
  });
}
// 草地：兩色交錯 + 柔光斑 + 草叢 + 小花（固定種子 → 同一關每次長得一樣）
function paintGrassTile(x, y, px, py, T, th) {
  ctx.fillStyle = (x + y) % 2 === 0 ? th.floor : th.floor2;
  ctx.fillRect(px, py, T, T);
  const h1 = dhash(x, y, 11), h2 = dhash(x, y, 29), h3 = dhash(x, y, 47);
  if (h1 > .40) {
    ctx.fillStyle = h1 > .72 ? 'rgba(255,255,255,.17)' : 'rgba(255,255,255,.09)';
    ctx.beginPath();
    ctx.ellipse(px + T * (.25 + h2 * .5), py + T * (.25 + h3 * .5),
                T * (.30 + h1 * .18), T * (.20 + h2 * .14), h3 * 3.1, 0, 6.283);
    ctx.fill();
  }
  if (h2 > .60) {
    ctx.strokeStyle = shadeHex(th.floor, .74);
    ctx.lineWidth = Math.max(1, T * .032);
    ctx.lineCap = 'round';
    const gx = px + T * (.2 + h3 * .6), gy = py + T * (.74 + h1 * .16);
    ctx.beginPath();
    ctx.moveTo(gx, gy); ctx.lineTo(gx - T * .05, gy - T * .12);
    ctx.moveTo(gx, gy); ctx.lineTo(gx, gy - T * .17);
    ctx.moveTo(gx, gy); ctx.lineTo(gx + T * .05, gy - T * .11);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }
  if (h3 > .86) {
    const fx2 = px + T * (.26 + h1 * .48), fy2 = py + T * (.26 + h2 * .48);
    ctx.fillStyle = h1 > .58 ? '#fff7f9' : '#ffd3e0';
    for (let k = 0; k < 5; k++) {
      const an = k * 1.2566 + h2 * 2;
      ctx.beginPath();
      ctx.ellipse(fx2 + Math.cos(an) * T * .072, fy2 + Math.sin(an) * T * .072,
                  T * .060, T * .042, an, 0, 6.283);
      ctx.fill();
    }
    ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.arc(fx2, fy2, T * .042, 0, 6.283); ctx.fill();
  }
}

"""
s = s.replace(anchor, tools + anchor, 1)

# ---------- 3. render 開頭改用 paintBackdrop ----------
old = """  ctx.fillStyle = th.bg1;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);"""
new = """  paintBackdrop(th);"""
assert old in s
s = s.replace(old, new, 1)

# ---------- 4. 地板改成草地 ----------
old = """      ctx.fillStyle = th.floor2;
      ctx.fillRect(px, py, T, T);                       // 磚縫
      ctx.fillStyle = (x + y) % 2 ? th.floor : th.floor2;
      ctx.fillRect(px + 1.5, py + 1.5, T - 3, T - 3);
      ctx.fillStyle = 'rgba(255,255,255,.06)';
      ctx.fillRect(px + 2, py + 2, T - 4, 3);           // 上緣高光"""
new = """      paintGrassTile(x, y, px, py, T, th);"""
assert old in s
s = s.replace(old, new, 1)

# ---------- 5. 硬牆 / 軟磚 → 木箱 ----------
old_start = "      if (v === 1) {\n        // 硬牆：立體石磚"
i0 = s.index(old_start)
i1 = s.index("      }\n    }\n  }\n  // 場地光影", i0)
old_block = s[i0:i1]
new_block = """      if (v === 1) {
        drawCrate(px, py, T, th.hard, shadeHex(th.hard, .80), true);
      } else {
        drawCrate(px, py, T, th.soft, th.soft2, false);
      }
"""
s = s[:i0] + new_block + s[i1:]

io.open(p, 'w', encoding='utf-8').write(s)
print('ok')
