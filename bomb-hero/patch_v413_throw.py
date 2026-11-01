# -*- coding: utf-8 -*-
# v4.13 第二輪：投炸彈機制（需求 ⑥ ⑦）
#   ⑥ 手套投出的炸彈可以「投到對方身體裡」（可以停在有玩家的格子），
#      但不可以停在牆壁上。
#   ⑦ 投炸彈要「一格一格跳」（不是一次跨好幾格直接飛到終點），
#      而且從西邊投到東邊盡頭時，會繼續往地圖外投出去，
#      再從西邊的盡頭牆壁投進來（邊界繞回，且是連續一格一格）。
import io, os

HERE = os.path.dirname(os.path.abspath(__file__))
PATH = os.path.join(HERE, 'index.html')
src = io.open(PATH, encoding='utf-8', newline='').read()
text = src.replace('\r\n', '\n')

rules = []
def R(old, new):
    rules.append((old, new))

# ================================================================
# ⑥⑦ 核心：findLanding 改成「回傳完整路徑」＋ 逐格跳的飛行
# ================================================================
# 原本 findLanding 只回傳終點（land.x/land.y），
#   飛行時用 t/dur 直接從起點插值到終點 → 視覺上是「一次跨好幾格」。
#   v4.13：改成回傳 path（每一步的格子），飛行時逐格跳。
R(
"""function findLanding(cx, cy, dx, dy) {
  const cols = Game.cols - 2, rows = Game.rows - 2;
  let x = cx, y = cy;
  const cap = cols * rows;
  for (let i = 0; i < cap; i++) {
    const nx = ((x - 1 + dx + cols) % cols) + 1;
    const ny = ((y - 1 + dy + rows) % rows) + 1;
    if (nx === cx && ny === cy) return null;   // 繞了一整圈回到原點
    // v4.11：前方有敵人 → 落在敵人前一格（不要把敵人穿過去）
    if (enemyAtCell(nx, ny)) return { x: x, y: y, dist: i + 1 };
    if (cellAt(nx, ny) === 0 && !bombAt(nx, ny)) return { x: nx, y: ny, dist: i + 1 };
    x = nx; y = ny;
  }
  return null;
}""",
"""// v4.13：投炸彈的落點搜尋 → 回傳「整條路徑」（每一步的格子）
//   path = [{x,y}, {x,y}, ...]，第一格是出發格，之後每一格跳一步。
//   canLandOnPlayer：true = 可以停在「有玩家」的格子（手套投彈要能投到人身上）
//   stopAtFoe：true = 遇到敵人就停在敵人前一格（踢／打炸彈）
function findLanding(cx, cy, dx, dy, canLandOnPlayer, stopAtFoe) {
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
}
// v4.13：某格是否有活著的玩家（手套投彈要能停在玩家身上）
function playerAtCell(cx, cy) {
  for (let i = 0; i < Game.players.length; i++) {
    const p = Game.players[i];
    if (!p.alive) continue;
    if (Math.floor(p.x / Game.T) === cx && Math.floor(p.y / Game.T) === cy) return true;
  }
  return false;
}"""
)

# ================================================================
# ⑦ 飛行改成「逐格跳」
# ================================================================
R(
"""    if (b.flying) {
      const f = b.flying;
      f.t += dt;
      const k = Math.min(1, f.t / f.dur);
      b.px = (f.fx * T + T / 2) + ((f.tx * T + T / 2) - (f.fx * T + T / 2)) * k;
      b.py = (f.fy * T + T / 2) + ((f.ty * T + T / 2) - (f.fy * T + T / 2)) * k - Math.sin(k * Math.PI) * T * .9;
      // v4.11：飛行途中前方有敵人 → 提前停在敵人前一格（不要穿過敵人）
      if (k < 1) {
        const stepX = (f.tx > f.fx) ? 1 : (f.tx < f.fx ? -1 : 0);
        const stepY = (f.ty > f.fy) ? 1 : (f.ty < f.fy ? -1 : 0);
        const ncx = Math.floor(b.px / T), ncy = Math.floor(b.py / T);
        if ((stepX || stepY) && enemyAtCell(ncx + stepX, ncy + stepY)) {
          b.flying = null;
          b.px = ncx * T + T / 2; b.py = ncy * T + T / 2;
          b.cx = ncx; b.cy = ncy;
          b.passers = [];
          continue;
        }
      }
      if (k >= 1) {
        b.flying = null;
        b.px = f.tx * T + T / 2; b.py = f.ty * T + T / 2;
        b.cx = f.tx; b.cy = f.ty;
        b.passers = [];
      }
      flyingDizzyCheck(b, T);        // v1.9：飛過去的路上砸到人 → 頭暈 1 秒
      continue;
    }""",
"""    if (b.flying) {
      const f = b.flying;
      f.t += dt;
      // v4.13：逐格跳 —— 不再從起點直接插值到終點，而是沿著 path 一格一格跳
      //   （每跳一格都有一次拋物線 → 視覺上是「一格一格跳過去」）
      if (f.path && f.path.length > 1) {
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
      } else {
        // 沒有 path 的舊資料 → 退回原本的插值
        const k = Math.min(1, f.t / f.dur);
        b.px = (f.fx * T + T / 2) + ((f.tx * T + T / 2) - (f.fx * T + T / 2)) * k;
        b.py = (f.fy * T + T / 2) + ((f.ty * T + T / 2) - (f.fy * T + T / 2)) * k - Math.sin(k * Math.PI) * T * .9;
        if (k >= 1) {
          b.flying = null;
          b.px = f.tx * T + T / 2; b.py = f.ty * T + T / 2;
          b.cx = f.tx; b.cy = f.ty;
          b.passers = [];
        }
      }
      flyingDizzyCheck(b, T);        // v1.9：飛過去的路上砸到人 → 頭暈 1 秒
      continue;
    }"""
)

# ================================================================
# ⑦ punchBomb：走新的 path，並記錄虛擬起點（繞回時用）
# ================================================================
R(
"""  // SBR 拳擊：飛越所有障礙直達地圖另一端（邊界迴繞），落在第一格空地
  const land = findLanding(bx, by, d.x, d.y);
  if (!land) return false;
  b.flying = { fx: bx, fy: by, tx: land.x, ty: land.y, t: 0, dur: Math.min(.62, .16 + land.dist * .05) };
  b.cx = land.x; b.cy = land.y;
  AudioSys.sfx('punch');
  return true;""",
"""  // SBR 拳擊：飛越所有障礙直達地圖另一端（邊界迴繞），落在第一格空地
  //   v4.13：帶 path → 逐格跳；碰到敵人停在敵人前一格
  const land = findLanding(bx, by, d.x, d.y, false, true);
  if (!land) return false;
  const path = land.path || [{ x: bx, y: by }, { x: land.x, y: land.y }];
  b.flying = { fx: bx, fy: by, tx: land.x, ty: land.y, t: 0,
    dur: Math.min(.62, .16 + land.dist * .05), path: path,
    ax: bx - (path.length > 1 ? path[1].x - path[0].x : 0) * 0,
    ay: by - (path.length > 1 ? path[1].y - path[0].y : 0) * 0 };
  // v4.13：虛擬起點 = 出發格往「反方向退一格」→ 繞回時的連續座標才對
  b.flying.ax = path[0].x - (path[1].x - path[0].x);
  b.flying.ay = path[0].y - (path[1].y - path[0].y);
  b.cx = land.x; b.cy = land.y;
  AudioSys.sfx('punch');
  return true;"""
)

# ================================================================
# ⑥⑦ throwCarried（手套投彈）：可以停在玩家身上 + 逐格跳
# ================================================================
R(
"""  // SBR 投擲：越過牆壁逐格跳躍，出地圖邊界從對側繞進來，落在第一格空地
  const land = findLanding(cx, cy, d.x, d.y);
  if (land) {
    b.flying = { fx: cx, fy: cy, tx: land.x, ty: land.y, t: 0, dur: Math.min(.72, .18 + land.dist * .055) };
    b.cx = land.x; b.cy = land.y;
  } else {
    b.cx = cx; b.cy = cy;   // 全場被堵 → 腳下
    b.passers = [p];
  }""",
"""  // SBR 投擲：越過牆壁逐格跳躍，出地圖邊界從對側繞進來，落在第一格空地
  //   v4.13：① 逐格跳（帶 path）② 可以停在「有玩家」的格子 → 投到對方身體裡
  //          ③ 不會停在牆壁上（牆只會被跳過去）
  const land = findLanding(cx, cy, d.x, d.y, true, false);
  if (land) {
    const path = land.path || [{ x: cx, y: cy }, { x: land.x, y: land.y }];
    b.flying = { fx: cx, fy: cy, tx: land.x, ty: land.y, t: 0,
      dur: Math.min(.72, .18 + land.dist * .055), path: path,
      ax: path[0].x - (path[1].x - path[0].x),
      ay: path[0].y - (path[1].y - path[0].y) };
    b.cx = land.x; b.cy = land.y;
  } else {
    b.cx = cx; b.cy = cy;   // 全場被堵 → 腳下
    b.passers = [p];
  }"""
)

# ================================================================
# 畫炸彈時用「繞回地圖」的視覺座標
# ================================================================
R(
"""function drawBomb(b, T) {
  const x = b.px, y = b.py;""",
"""function drawBomb(b, T) {
  // v4.13：投彈繞回地圖外時用 vpx/vpy（視覺座標）→ 會真的飛出畫面再從另一端進來
  const x = (b.vpx != null) ? b.vpx : b.px, y = (b.vpy != null) ? b.vpy : b.py;"""
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
