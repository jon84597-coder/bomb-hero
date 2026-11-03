# -*- coding: utf-8 -*-
# v4.72 A：渲染層 —— 視口裁切、逐格主題（三島各自地形）、外牆/軟磚吃主題、毒圈與大逃殺 HUD 掛鉤
import io, sys

P = 'index.html'
s = io.open(P, encoding='utf-8').read()


def rep(old, new, tag):
    global s
    n = s.count(old)
    if n != 1:
        print('[FAIL]', tag, 'count=', n)
        sys.exit(1)
    s = s.replace(old, new)
    print('[ok]', tag)


# ---------- 1. 逐格主題 + 視口範圍 ----------
rep("""function render() {
  const T = Game.T;""",
    """// v4.72：大逃殺三島 —— 每一格可以有自己的主題（草地／沙地／冰原…），
//   沒有 themeAt 的模式（單人／RPG／對戰）一律回傳全場主題，行為完全不變。
function themeAtCell(x, y, th) {
  const a = Game.themeAt;
  if (!a || !a[y]) return th;
  return a[y][x] || th;
}
// v4.72：只畫鏡頭看得到的格子。
//   48×38＝1,824 格整張畫一次要 10ms 以上（手機再翻倍），且大部分根本在畫面外。
//   render 的變換是 translate(VIEW/2) scale(z) translate(-VIEW/2) translate(cam)，
//   反推回去就得到可見的世界矩形；前後各留 1 格避免邊緣撕裂。
function viewRange(T) {
  const z = Game.zoom || 1, W = VIEW_W, H = VIEW_H;
  const hw = W / (2 * z), hh = H / (2 * z);
  const x0 = (W / 2 - hw - Game.camX) / T, x1 = (W / 2 + hw - Game.camX) / T;
  const y0 = (H / 2 - hh - Game.camY) / T, y1 = (H / 2 + hh - Game.camY) / T;
  return {
    x0: Math.max(0, Math.floor(x0) - 1), x1: Math.min(Game.cols - 1, Math.ceil(x1) + 1),
    y0: Math.max(0, Math.floor(y0) - 1), y1: Math.min(Game.rows - 1, Math.ceil(y1) + 1)
  };
}
function render() {
  const T = Game.T;""",
    'viewrange')

# ---------- 2. 地板迴圈：裁切 + 逐格主題 ----------
rep("""  // 地板（SBR 風：深縫 + 棋盤瓷磚）
  for (let y = 0; y < Game.rows; y++) {
    for (let x = 0; x < Game.cols; x++) {
      const px = x * T, py = y * T;
      const hz = Game.hazards[y] && Game.hazards[y][x];
      if (Game.wallKind && Game.wallKind[y] && Game.wallKind[y][x] === 0 && Game.grid[y][x] === 1) continue;
      paintGrassTile(x, y, px, py, T, th);""",
    """  // 地板（SBR 風：深縫 + 棋盤瓷磚）
  //   v4.72：只跑鏡頭看得到的格子；大逃殺的島嶼各自一種地形（themeAt）。
  const vr = viewRange(T);
  for (let y = vr.y0; y <= vr.y1; y++) {
    for (let x = vr.x0; x <= vr.x1; x++) {
      const px = x * T, py = y * T;
      const hz = Game.hazards[y] && Game.hazards[y][x];
      if (Game.wallKind && Game.wallKind[y] && Game.wallKind[y][x] === 0 && Game.grid[y][x] === 1) continue;
      const thc = themeAtCell(x, y, th);
      paintFloorStyle(x, y, px, py, T, thc, (thc && thc.style) || 'forest');""",
    'floor-loop')

# ---------- 3. 牆迴圈：裁切 + 逐格主題 ----------
rep("""  // 軟磚 / 硬牆
  for (let y = 0; y < Game.rows; y++) {
    for (let x = 0; x < Game.cols; x++) {
      const v = Game.grid[y][x];
      if (v === 0) continue;
      const px = x * T, py = y * T;
      if (v === 1) {
        const wk = (Game.wallKind && Game.wallKind[y]) ? Game.wallKind[y][x] : 2;
        if (wk === 0) continue;
        if (wk === 1) drawOuterWall(px, py, T, th, x * 37 + y * 7, x, y);
        else drawStone(px, py, T, th.hard, x * 37 + y * 7, x, y);
      } else {
        // 木箱（可炸）：暖色木紋
        drawCrate(px, py, T, th.soft, th.soft2, false);
      }
    }
  }""",
    """  // 軟磚 / 硬牆
  for (let y = vr.y0; y <= vr.y1; y++) {
    for (let x = vr.x0; x <= vr.x1; x++) {
      const v = Game.grid[y][x];
      if (v === 0) continue;
      const px = x * T, py = y * T;
      const thc = themeAtCell(x, y, th);
      if (v === 1) {
        const wk = (Game.wallKind && Game.wallKind[y]) ? Game.wallKind[y][x] : 2;
        if (wk === 0) continue;
        if (wk === 1) drawOuterWall(px, py, T, thc, x * 37 + y * 7, x, y);
        else drawStone(px, py, T, thc.hard, x * 37 + y * 7, x, y, thc.style);
      } else {
        // 木箱／陶罐／水晶（可炸）：跟著那一格的主題
        drawCrate(px, py, T, thc.soft, thc.soft2, false, thc.style);
      }
    }
  }""",
    'wall-loop')

# ---------- 4. drawStone / drawCrate 吃主題 ----------
rep("""function drawStone(px, py, T, base, seed, gx, gy) {
  const st = artStyle();
  if (artBlit(artSet(st).hard, seed, px, py, T)) return;""",
    """function drawStone(px, py, T, base, seed, gx, gy, stIn) {
  const st = stIn || artStyle();
  if (artBlit(artSet(st).hard, seed, px, py, T)) return;""",
    'drawstone')

rep("""function drawCrate(px, py, T, base, dark, big) {
  const st = artStyle();
  const set = artSet(st);""",
    """function drawCrate(px, py, T, base, dark, big, stIn) {
  const st = stIn || artStyle();
  const set = artSet(st);""",
    'drawcrate')

# ---------- 5. buildMap 清掉逐格主題 ----------
rep("""  Game.wallKind = null;
  Game.wallSize = null;
  Game.sdRock = null;""",
    """  Game.wallKind = null;
  Game.wallSize = null;
  Game.themeAt = null;         // v4.72：換地圖清掉逐格主題（大逃殺三島才會設）
  Game.sdRock = null;""",
    'buildmap-themeat')

# ---------- 6. 毒圈繪製（世界座標，牆之後、角色之前） ----------
rep("""  // 場地光影：中央打光 + 四周暗角（讓平面地圖有層次）
  const fw = Game.cols * T, fh = Game.rows * T;""",
    """  // v4.72：大逃殺毒圈（畫在牆之上、角色之下 —— 圈外的地面變紫，角色仍然看得見）
  if (Game.mode === 'br' && Game.brZone) drawBRZone(T);
  // 場地光影：中央打光 + 四周暗角（讓平面地圖有層次）
  const fw = Game.cols * T, fh = Game.rows * T;""",
    'zone-hook')

# ---------- 7. HUD 掛鉤 ----------
rep("""  try { drawTeamHud(); } catch (e) {}""",
    """  try { drawTeamHud(); } catch (e) {}
  try { drawBRHud(); } catch (e) {}""",
    'hud-hook')

io.open(P, 'w', encoding='utf-8', newline='\n').write(s)
print('done')
