# -*- coding: utf-8 -*-
# v4.13 第二輪 b：投炸彈路徑改成「繞整圈」→ 動畫會真的飛出地圖外再從另一端進來
import io, os

HERE = os.path.dirname(os.path.abspath(__file__))
PATH = os.path.join(HERE, 'index.html')
src = io.open(PATH, encoding='utf-8', newline='').read()
text = src.replace('\r\n', '\n')

rules = []
def R(old, new):
    rules.append((old, new))

# ================================================================
# findLanding：繞「整圈」走 → 路徑含邊界格 + 出地圖外的節點
# ================================================================
R(
"""function findLanding(cx, cy, dx, dy, canLandOnPlayer, stopAtFoe) {
  const cols = Game.cols - 2, rows = Game.rows - 2;
  let x = cx, y = cy;
  const cap = cols * rows;
  const path = [{ x: cx, y: cy }];
  for (let i = 0; i < cap; i++) {
    // v4.13：邊界繞回時保留「繞了幾圈」的資訊 → 讓飛出地圖外的動畫看得出來
    const nx = ((x - 1 + dx + cols) % cols) + 1;
    const ny = ((y - 1 + dy + rows) % rows) + 1;
    if (nx === cx && ny === cy) return null;   // 繞了一整圈回到原點
    path.push({ x: nx, y: ny });
    // v4.11：前方有敵人 → 落在敵人前一格（不要把敵人穿過去）
    if (stopAtFoe !== false && enemyAtCell(nx, ny)) {
      path.pop();                              // 不要跳進敵人那一格
      return { x: x, y: y, dist: i + 1, path: path };
    }
    // v4.13：可以停在「有玩家」的格子（手套投彈 → 投到對方身體裡）
    if (canLandOnPlayer && playerAtCell(nx, ny)) {
      return { x: nx, y: ny, dist: i + 1, path: path };
    }
    // v4.13：牆壁不可落點 → 跳過去（但路徑要保留 → 動畫會一格一格跳過牆）
    if (cellAt(nx, ny) === 0 && !bombAt(nx, ny)) {
      return { x: nx, y: ny, dist: i + 1, path: path };
    }
    x = nx; y = ny;
  }
  return null;
}""",
"""function findLanding(cx, cy, dx, dy, canLandOnPlayer, stopAtFoe) {
  // v4.13：改成繞「整圈」走（連邊界格與地圖外都走過）
  //   → 路徑節點包含邊界牆 + 一個「地圖外」節點，
  //     動畫才看得到「從西邊投到東邊盡頭 → 飛出地圖外 → 再從西邊的盡頭牆壁投進來」。
  const cols = Game.cols, rows = Game.rows;
  let x = cx, y = cy;
  const cap = cols * rows + 8;
  const path = [{ x: cx, y: cy }];
  for (let i = 0; i < cap; i++) {
    let rx = x + dx, ry = y + dy;              // 未繞回的原始座標
    let outX = 0, outY = 0;
    if (rx >= cols) { outX = 1; rx -= cols; }   // 往東飛出地圖 → 從西邊進來
    else if (rx < 0) { outX = -1; rx += cols; } // 往西飛出地圖 → 從東邊進來
    if (ry >= rows) { outY = 1; ry -= rows; }
    else if (ry < 0) { outY = -1; ry += rows; }
    // 地圖外節點（out=1）→ 動畫會把炸彈畫到地圖外面
    if (outX) path.push({ x: outX > 0 ? cols : -1, y: y, out: 1 });
    if (outY) path.push({ x: x, y: outY > 0 ? rows : -1, out: 1 });
    const nx = rx, ny = ry;
    if (nx === cx && ny === cy && !outX && !outY) return null;   // 繞了一整圈回到原點
    path.push({ x: nx, y: ny });
    // 邊界格（0 / cols-1 / 0 / rows-1）是外牆 → 不能落點，只當路徑節點
    const edge = nx === 0 || nx === cols - 1 || ny === 0 || ny === rows - 1;
    if (edge) { x = nx; y = ny; continue; }
    // v4.11：前方有敵人 → 落在敵人前一格（不要把敵人穿過去）
    if (stopAtFoe !== false && enemyAtCell(nx, ny)) {
      path.pop();                              // 不要跳進敵人那一格
      return { x: x, y: y, dist: i + 1, path: path };
    }
    // v4.13：可以停在「有玩家」的格子（手套投彈 → 投到對方身體裡）
    if (canLandOnPlayer && playerAtCell(nx, ny)) {
      return { x: nx, y: ny, dist: i + 1, path: path };
    }
    // v4.13：牆壁不可落點 → 跳過去（路徑保留 → 動畫一格一格跳過牆）
    if (cellAt(nx, ny) === 0 && !bombAt(nx, ny)) {
      return { x: nx, y: ny, dist: i + 1, path: path };
    }
    x = nx; y = ny;
  }
  return null;
}"""
)

# ================================================================
# 飛行：逐格跳；遇到「地圖外」節點瞬間跳到另一端
# ================================================================
R(
"""      if (f.path && f.path.length > 1) {
        const per = f.dur / (f.path.length - 1);      // 每格花的時間
        const seg = Math.min(f.path.length - 2, Math.floor(f.t / per));
        const k = Math.min(1, (f.t - seg * per) / per);
        const a = f.path[seg], c = f.path[seg + 1];
        // v4.13：繞回地圖外時，用「虛擬座標」讓炸彈真的飛出畫面再從另一端進來
        const ax = f.ax != null ? f.ax : a.x, ay = f.ay != null ? f.ay : a.y;
        const vx = ax + (c.x - a.x) * (seg + k);
        const vy = ay + (c.y - a.y) * (seg + k);
        b.px = vx * T + T / 2;
        b.py = vy * T + T / 2 - Math.sin(k * Math.PI) * T * .55;
        // 視覺座標繞回地圖寬度 → 飛出右邊會從左邊出現
        const W = Game.cols, H = Game.rows;
        let wx = b.px, wy = b.py;
        while (wx >= W * T) wx -= W * T;
        while (wx < 0) wx += W * T;
        while (wy >= H * T) wy -= H * T;
        while (wy < 0) wy += H * T;
        b.vpx = wx; b.vpy = wy;
        if (f.t >= f.dur) {
          b.flying = null;
          b.px = c.x * T + T / 2; b.py = c.y * T + T / 2;
          b.cx = c.x; b.cy = c.y;
          b.passers = [];
        }
      } else {""",
"""      if (f.path && f.path.length > 1) {
        const per = f.dur / (f.path.length - 1);      // 每格花的時間
        const seg = Math.min(f.path.length - 2, Math.floor(f.t / per));
        const k = Math.min(1, (f.t - seg * per) / per);
        const a = f.path[seg], c = f.path[seg + 1];
        if (a.out) {
          // v4.13：從「地圖外」瞬間出現在另一端的邊界格
          //   → 視覺上就是「飛出東邊 → 從西邊的盡頭牆壁投進來」
          b.px = (c.x + .5) * T; b.py = (c.y + .5) * T;
        } else {
          // v4.13：一格一格跳（每格都有一次拋物線）
          b.px = (a.x + (c.x - a.x) * k + .5) * T;
          b.py = (a.y + (c.y - a.y) * k + .5) * T - Math.sin(k * Math.PI) * T * .55;
        }
        b.vpx = b.px; b.vpy = b.py;
        if (f.t >= f.dur) {
          b.flying = null;
          b.px = (c.x + .5) * T; b.py = (c.y + .5) * T;
          b.cx = c.x; b.cy = c.y;
          b.passers = [];
        }
      } else {"""
)

# ================================================================
# punch / throw 不再需要 ax/ay
# ================================================================
R(
"""  const path = land.path || [{ x: bx, y: by }, { x: land.x, y: land.y }];
  b.flying = { fx: bx, fy: by, tx: land.x, ty: land.y, t: 0,
    dur: Math.min(.62, .16 + land.dist * .05), path: path,
    ax: bx - (path.length > 1 ? path[1].x - path[0].x : 0) * 0,
    ay: by - (path.length > 1 ? path[1].y - path[0].y : 0) * 0 };
  // v4.13：虛擬起點 = 出發格往「反方向退一格」→ 繞回時的連續座標才對
  b.flying.ax = path[0].x - (path[1].x - path[0].x);
  b.flying.ay = path[0].y - (path[1].y - path[0].y);
  b.cx = land.x; b.cy = land.y;""",
"""  const path = land.path || [{ x: bx, y: by }, { x: land.x, y: land.y }];
  b.flying = { fx: bx, fy: by, tx: land.x, ty: land.y, t: 0,
    dur: Math.min(.62, .16 + land.dist * .05), path: path };
  b.cx = land.x; b.cy = land.y;"""
)
R(
"""    const path = land.path || [{ x: cx, y: cy }, { x: land.x, y: land.y }];
    b.flying = { fx: cx, fy: cy, tx: land.x, ty: land.y, t: 0,
      dur: Math.min(.72, .18 + land.dist * .055), path: path,
      ax: path[0].x - (path[1].x - path[0].x),
      ay: path[0].y - (path[1].y - path[0].y) };
    b.cx = land.x; b.cy = land.y;""",
"""    const path = land.path || [{ x: cx, y: cy }, { x: land.x, y: land.y }];
    b.flying = { fx: cx, fy: cy, tx: land.x, ty: land.y, t: 0,
      dur: Math.min(.72, .18 + land.dist * .055), path: path };
    b.cx = land.x; b.cy = land.y;"""
)

# ================================================================
# 匯出 playerAtCell（測試用）
# ================================================================
R(
"  controlAI: controlAI, dangerAt: dangerAt, findLanding: findLanding,",
"  controlAI: controlAI, dangerAt: dangerAt, findLanding: findLanding, playerAtCell: playerAtCell,"
)

# ---- 套用並斷言 ----
failed = []
for i, (old, new) in enumerate(rules, 1):
    c = text.count(old)
    if c != 1:
        failed.append((i, c, old[:110]))
        continue
    text = text.replace(old, new)

if failed:
    print("FAILED rules:")
    for i, c, ctx in failed:
        print("  #%d count=%d ctx=%r" % (i, c, ctx))
    print("No file written.")
else:
    out = text.replace('\n', '\r\n')
    io.open(PATH, 'w', encoding='utf-8', newline='').write(out)
    print("OK: all %d rules applied" % len(rules))
