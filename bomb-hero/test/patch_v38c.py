# -*- coding: utf-8 -*-
"""
v3.8 補丁 C：第二關「熔岩洞窟」辨識度改善

原本的問題：bg (#2a1510)、地板 (#4a3a3a)、硬牆 (#4a3f47)、軟磚暗面 (#5f3c28)
亮度全部擠在一起，玩起來分不出哪裡能走、哪裡是牆。

策略：用「色相 + 明度」雙重差異 ——
  背景維持暗紅褐（氛圍）→ 地板提亮成暖灰褐 → 硬牆改成冷調深紫黑曜石＋亮描邊
  → 軟磚改成明顯的亮橙磚。冷／暖對比一眼就能分。
"""
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = os.path.join(ROOT, 'index.html')

s = io.open(HTML, encoding='utf-8').read()
orig = s


def rep(old, new, tag):
    global s
    if s.count(old) != 1:
        sys.exit('[FAIL] 找不到唯一目標（%d 處）：%s' % (s.count(old), tag))
    s = s.replace(old, new, 1)
    print('  OK  ' + tag)


# ---- 1. THEMES[1] 配色 ----
rep("{ name: '熔岩洞窟', style: 'lava', bg1: '#2a1510', bg2: '#321a12', floor: '#4a3a3a', floor2: '#3f3232', hard: '#4a3f47', soft: '#8a5c3e', soft2: '#5f3c28', accent: '#ff6a1e', hazards: ['convey'] },",
    "{ name: '熔岩洞窟', style: 'lava', bg1: '#3b1d12', bg2: '#46251a', floor: '#6e564b', floor2: '#5f4a41', hard: '#37304a', soft: '#d18a42', soft2: '#9c5c26', accent: '#ff6a1e', hazards: ['convey'] },",
    'THEMES[1] 熔岩洞窟配色')

# ---- 2. drawWallLava：冷調紫黑曜石 + 亮描邊（硬牆輪廓一眼可辨）----
rep("""function drawWallLava(px, py, T, base, seed) {
  const x = px + T * .02, y = py + T * .02, w = T * .96, h = T * .96, r = T * .08;
  const h1 = dhash(seed, 5, 13), h2 = dhash(seed, 9, 29);
  ctx.fillStyle = 'rgba(120,30,6,.26)'; rect3d(x + T * .02, y + T * .05, w, h, r);
  const lg = ctx.createLinearGradient(x, y, x, y + h);
  lg.addColorStop(0, '#5a4b52'); lg.addColorStop(.5, '#413640'); lg.addColorStop(1, '#241d24');
  ctx.fillStyle = lg; rect3d(x, y, w, h, r);""",
    """function drawWallLava(px, py, T, base, seed) {
  const x = px + T * .02, y = py + T * .02, w = T * .96, h = T * .96, r = T * .08;
  const h1 = dhash(seed, 5, 13), h2 = dhash(seed, 9, 29);
  ctx.fillStyle = 'rgba(120,30,6,.26)'; rect3d(x + T * .02, y + T * .05, w, h, r);
  // v3.8：冷調深紫黑曜石（跟軟磚的亮橙做色相反差，不再跟地板糊在一起）
  const lg = ctx.createLinearGradient(x, y, x, y + h);
  lg.addColorStop(0, '#565080'); lg.addColorStop(.5, '#3c3658'); lg.addColorStop(1, '#241f3a');
  ctx.fillStyle = lg; rect3d(x, y, w, h, r);
  // v3.8：左上受光面 + 亮描邊（硬牆輪廓清楚）
  ctx.fillStyle = 'rgba(200,205,255,.20)';
  ctx.beginPath(); ctx.ellipse(x + w * .34, y + h * .20, w * .30, h * .13, -.3, 0, 6.283); ctx.fill();
  ctx.strokeStyle = 'rgba(185,190,240,.42)';
  ctx.lineWidth = Math.max(1.4, T * .032);
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x + w * .03, y + h * .03, w * .94, h * .94, r); ctx.stroke(); }
  ctx.lineWidth = 1;""",
    'drawWallLava 冷調紫黑曜石')

# ---- 3. drawCrateLava：亮橙磚 + 清晰磚縫（可破壞的那種一眼看得出來）----
rep("""  // 岩縫餘燼
  const g = .5 + .5 * Math.sin(Game.gameT * 3 + px * .1 + py * .13);
  ctx.fillStyle = 'rgba(255,110,30,' + (.30 + .35 * g).toFixed(2) + ')';
  ctx.fillRect(x + w * .1, y + h - 2, w * .8, Math.max(1.4, T * .03));
  ctx.strokeStyle = 'rgba(24,10,8,.55)';
  ctx.lineWidth = Math.max(1.2, T * .028);
  ctx.strokeRect(x + w * .02, y + h * .02, w * .96, h * .96);
  ctx.lineWidth = 1;
}""",
    """  // 岩縫餘燼
  const g = .5 + .5 * Math.sin(Game.gameT * 3 + px * .1 + py * .13);
  ctx.fillStyle = 'rgba(255,110,30,' + (.30 + .35 * g).toFixed(2) + ')';
  ctx.fillRect(x + w * .1, y + h - 2, w * .8, Math.max(1.4, T * .03));
  // v3.8：暖色亮描邊（軟磚的輪廓），跟硬牆的冷色描邊一看就分得出
  ctx.strokeStyle = 'rgba(255,214,150,.55)';
  ctx.lineWidth = Math.max(1.4, T * .032);
  ctx.strokeRect(x + w * .02, y + h * .02, w * .96, h * .96);
  ctx.lineWidth = 1;
}""",
    'drawCrateLava 亮橙描邊')

if s != orig:
    io.open(HTML, 'w', encoding='utf-8').write(s)
    print('[OK] index.html 已更新')
else:
    print('[SKIP] 沒有變動')
