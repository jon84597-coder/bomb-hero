# -*- coding: utf-8 -*-
# v4.54 patch：16:28 第 2 點（外牆與不規則地圖）
#   ① 牆分三類：外牆（連到地圖外框、貼著場地 → 沙色粗磚）／硬牆島（被空地包圍 → 粉色石頭）／
#      遠端實心（離場地 3 格以上 → 不畫，讓輪廓凹凸、不再一整片浪費空間的牆海）
#   ② 外牆顏色由該關硬牆基底混沙金而來 → 每大關都不一樣
#   ③ 外牆畫得比硬牆大 4.5%（往外擴），看起來更粗
import io, sys

P = 'index.html'
s = io.open(P, encoding='utf-8', newline='').read()
before = len(s)

def must(c, m):
    if not c:
        print('FAIL ' + m); sys.exit(1)

def rep(old, new, tag):
    global s
    if old not in s:
        must(new in s, 'MISS ' + tag)
        print('  skip ' + tag); return
    must(s.count(old) == 1, 'DUP(%d) %s' % (s.count(old), tag))
    s = s.replace(old, new)
    print('  ok   ' + tag)

# ---------- ① 牆分類 + ② 外牆美術 ----------
ART = '''// v4.54：外牆 —— 沙色粗磚。顏色由「該關硬牆基底」混沙金而來，所以每大關都不一樣。
//   外牆比硬牆往外擴 4.5%，看起來更粗；磚縫兩道、上下錯開，不會跟硬牆的細磚撞臉。
function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t);
  const g2 = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
  const b2 = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
  return 'rgb(' + r + ',' + g2 + ',' + b2 + ')';
}
function drawOuterWall(px, py, T, th, seed) {
  const hard = (th && th.hard) || '#c9a0a8';
  const base = mixHex(hard, '#e8cf9c', .55);
  const dark = mixHex(hard, '#8a6b3e', .42);
  const e = T * .045;
  const x = px - e, y = py - e, w = T + e * 2, h = T + e * 2;
  const gr = ctx.createLinearGradient(x, y, x, y + h);
  gr.addColorStop(0, base); gr.addColorStop(1, dark);
  ctx.fillStyle = gr; ctx.fillRect(x, y, w, h);
  const mw = Math.max(1, T * .045);
  const half = h * .5;
  ctx.strokeStyle = 'rgba(84,58,30,.34)';
  ctx.lineWidth = mw;
  ctx.beginPath();
  ctx.moveTo(x, y + half); ctx.lineTo(x + w, y + half);
  const u = ((seed >> 1) & 1) ? .34 : .63;
  ctx.moveTo(x + w * u, y); ctx.lineTo(x + w * u, y + half);
  ctx.moveTo(x + w * (1.26 - u), y + half); ctx.lineTo(x + w * (1.26 - u), y + h);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,246,214,.40)';                    // 頂面亮邊
  ctx.fillRect(x, y, w, Math.max(1.5, T * .07));
  ctx.fillStyle = 'rgba(66,44,20,.26)';                       // 底部沉影
  ctx.fillRect(x, y + h - Math.max(2, T * .09), w, Math.max(2, T * .09));
}
// v4.54：牆的分類表（每張圖算一次，地圖重建或縮圈落石時重算）
//   1 = 外牆（連到地圖外框 + 離場地 2 格內）→ 沙色粗磚
//   2 = 硬牆島（被空地包圍，沒連到外框）→ 原本的硬牆
//   0 = 離場地 3 格以上的實心 → 地板跟牆都不畫，直接露出背景 → 輪廓才會凹凸
function markWallKinds() {
  const cols = Game.cols, rows = Game.rows, g = Game.grid;
  const wk = [];
  const dist = [];
  for (let y = 0; y < rows; y++) { wk.push(new Array(cols).fill(0)); dist.push(new Array(cols).fill(-1)); }
  const q = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (g[y][x] !== 1) { dist[y][x] = 0; q.push([x, y]); }      // 空地／軟磚 → 距離 0
  }
  for (let i = 0; i < q.length; i++) {
    const x = q[i][0], y = q[i][1];
    if (dist[y][x] >= 3) continue;                              // 超過 3 格就不用再擴
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      if (dist[ny][nx] >= 0) continue;
      dist[ny][nx] = dist[y][x] + 1; q.push([nx, ny]);
    }
  }
  // 從外框的實心格 BFS（四鄰）→ 連得到外面的算「外牆體系」
  const out = [];
  for (let y = 0; y < rows; y++) out.push(new Array(cols).fill(false));
  const q2 = [];
  for (let x = 0; x < cols; x++) { q2.push([x, 0]); q2.push([x, rows - 1]); }
  for (let y = 0; y < rows; y++) { q2.push([0, y]); q2.push([cols - 1, y]); }
  for (let i = 0; i < q2.length; i++) {
    const x = q2[i][0], y = q2[i][1];
    if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
    if (out[y][x] || g[y][x] !== 1) continue;
    out[y][x] = true;
    q2.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (g[y][x] !== 1) continue;
    if (!out[y][x]) { wk[y][x] = 2; continue; }                 // 孤島 → 硬牆
    wk[y][x] = dist[y][x] <= 2 ? 1 : 0;                         // 貼場地 → 外牆；太遠 → 不畫
  }
  Game.wallKind = wk;
}
'''
rep("function drawStone(px, py, T, base, seed, gx, gy) {", ART + "function drawStone(px, py, T, base, seed, gx, gy) {", 'wall art')

# ---------- ③ 渲染：地板與牆都看分類 ----------
rep("""      const px = x * T, py = y * T;
      const hz = Game.hazards[y] && Game.hazards[y][x];
      paintGrassTile(x, y, px, py, T, th);""",
    """      const px = x * T, py = y * T;
      const hz = Game.hazards[y] && Game.hazards[y][x];
      // v4.54：離場地太遠的實心格，連地板都不畫 → 露出背景，輪廓才會凹凸
      if (Game.wallKind && Game.wallKind[y] && Game.wallKind[y][x] === 0 && Game.grid[y][x] === 1) continue;
      paintGrassTile(x, y, px, py, T, th);""",
    'floor skip far')

rep("""      if (v === 1) {
        // 石頭（打不破）：灰冷色系
        drawStone(px, py, T, th.hard, x * 37 + y * 7, x, y);
      } else {""",
    """      if (v === 1) {
        // v4.54：外牆（沙色粗磚）／硬牆島（原本的石頭）／太遠的實心不畫
        const wk = (Game.wallKind && Game.wallKind[y]) ? Game.wallKind[y][x] : 2;
        if (wk === 0) continue;
        if (wk === 1) drawOuterWall(px, py, T, th, x * 37 + y * 7);
        else drawStone(px, py, T, th.hard, x * 37 + y * 7, x, y);
      } else {""",
    'wall render 3way')

# 懶計算（第一次進畫面才算）
rep("""function render() {
  const T = Game.T;
  const th = Game.theme || THEMES[0];""",
    """function render() {
  const T = Game.T;
  const th = Game.theme || THEMES[0];
  if (!Game.wallKind) markWallKinds();          // v4.54：牆分類（每張圖算一次）""",
    'lazy markWallKinds')

# 失效點：換地圖 / 縮圈落石改格子
rep("""  Game.grid = g;
  Game.spawnCell = { x: sp.x, y: sp.y };""",
    """  Game.grid = g;
  Game.wallKind = null;
  Game.spawnCell = { x: sp.x, y: sp.y };""",
    'invalidate organic')

rep("""        Game.grid = g;
        Game.hazards = [];""",
    """        Game.grid = g;
        Game.wallKind = null;
        Game.hazards = [];""",
    'invalidate tut')

rep("""          Game.grid[c[1]][c[0]] = 1;
          AudioSys.sfx('sd');""",
    """          Game.grid[c[1]][c[0]] = 1;
          Game.wallKind = null;                   // v4.54：落石也會改牆，重算分類
          AudioSys.sfx('sd');""",
    'invalidate sd')

# Game 初始欄位
rep("  spawnCell: null,            // v4.51：這一場的出生格（隨機）",
    "  spawnCell: null,            // v4.51：這一場的出生格（隨機）\n  wallKind: null,             // v4.54：牆分類（1 外牆／2 硬牆島／0 不畫）",
    'Game.wallKind field')

# 匯出
rep("  cellAt: cellAt, beginCountdown: beginCountdown, spawnItem: spawnItem,",
    "  cellAt: cellAt, beginCountdown: beginCountdown, spawnItem: spawnItem, markWallKinds: markWallKinds, drawOuterWall: drawOuterWall,",
    'export')

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('chars %d -> %d (%+d)' % (before, len(s), len(s) - before))
print('bytes %d -> %d' % (len(before.encode('utf-8') if isinstance(before, str) else b''), 0) if False else '')
print('bytes', len(s.encode('utf-8')))
