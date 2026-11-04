# -*- coding: utf-8 -*-
"""patch_v474_a.py — v4.74：大逃殺改成「隨機不規則大陸 + 八區地形」、30 人、毒圈 10 分鐘、免費開放"""
import io, sys
P = 'index.html'
s = io.open(P, encoding='utf-8').read()

START = "// ====\n//   v4.72：大逃殺（三島）"
END = "  return { picks: picks, spawns: sp, cut: cut };\n}\n"

i = s.find(START); j = s.find(END)
if i < 0 or j < 0:
    print('FAIL markers', i, j); sys.exit(1)
j += len(END)

NEW = r"""// ====
//   v4.74：大逃殺（隨機不規則大陸）
//   · 56×44＝2,464 格。整張圖是「一塊不規則大陸」＋外海，不是三座島
//   · 八種地形各佔一塊（Voronoi 分區、邊界帶雜訊 → 彎彎曲曲不是直線），走過去地板／軟牆／裝飾就換一套
//   · 硬牆只佔約 8%（零星岩層團塊），障礙幾乎都是可炸的軟磚 → 空地多、有路可以繞
//   · 30 人同場（你 + 29 個 AI）；14 隻小怪散在整張圖（數量照舊）
//   · 毒圈 10 段、每 60 秒縮一次 = 整場 10 分鐘
//   · 正式測試結束前免費入場（BR.FREE）
// ====
const BR = {
  W: 56, H: 44, N: 30, FOES: 14,
  FREE: true,          // v4.74：正式測試結束前不扣門票
  ART_K: .84,          // v4.74：大圖（T≈30）怪物畫得偏大 → 美術半徑與判定一起縮一級
  // [等待秒數, 目標半徑（格）]：10 段 × 60 秒 = 10 分鐘
  PH: [[60, 26], [60, 22], [60, 18.5], [60, 15], [60, 12], [60, 9.5], [60, 7.5], [60, 5.5], [60, 4], [60, 2.8]],
  // 名次獎勵（第 9 名以後一律拿最後一級 80）
  GOLD: [1200, 700, 450, 300, 200, 150, 100, 80],
  HIDE: 46,            // 可以躲人的物件（草叢／破屋／陶甕…）
  on: function () { return Game.mode === 'br'; }
};

function brIslAt(x, y) {
  const a = Game.brIsl;
  if (!a || !a[y]) return -1;
  return a[y][x] < 0 ? -1 : a[y][x];
}

function buildBRMap() {
  const cols = BR.W, rows = BR.H;
  Game.cols = cols; Game.rows = rows;
  Game.bigMap = true;
  Game.T = tileSize();
  recalcSpdK();
  Game.ox = Math.floor((canvasSize().w - Game.T * cols) / 2);
  Game.oy = Math.floor((canvasSize().h - Game.T * rows) / 2);
  Game.camSnap = true;
  Game.wallKind = null; Game.wallSize = null;
  Game.mapSeq = (Game.mapSeq | 0) + 1;
  Game.sdRock = null; Game.sdActive = false; Game.sdList = [];
  Game.artK = BR.ART_K;
  // 背景底圖固定用深海 → 大陸外圍那片空白看起來就是海（不是沙漠或草地）
  let seaI = 5;
  for (let i = 0; i < THEMES.length; i++) if (THEMES[i].style === 'sea') seaI = i;
  Game.theme = THEMES[seaI];
  Game.stage = 1;
  Game.grid = []; Game.themeAt = []; Game.brIsl = []; Game.hazards = [];
  for (let y = 0; y < rows; y++) {
    const row = [], tr = [], ir = [];
    for (let x = 0; x < cols; x++) { row.push(1); tr.push(null); ir.push(-1); }
    Game.grid.push(row); Game.themeAt.push(tr); Game.brIsl.push(ir);
    Game.hazards.push(new Array(cols).fill(null));
  }
  Game.warps = []; Game.bubbles = []; Game.hidden = {};
  Game.eggs = []; Game.eggsHidden = []; Game.door = null;

  // ---- 1) 八塊風格區：4×2 的種子點 ＋ 邊界雜訊 ----
  const order = [];
  for (let i = 0; i < THEMES.length; i++) order.push(i);
  for (let i = order.length - 1; i > 0; i--) {
    const k = rand(i + 1), t = order[i]; order[i] = order[k]; order[k] = t;
  }
  const seeds = [];
  for (let i = 0; i < 8; i++) {
    const gx = i % 4, gy = (i / 4) | 0;
    seeds.push({
      x: (gx + .5) * cols / 4 + (Math.random() - .5) * cols * .08,
      y: (gy + .5) * rows / 2 + (Math.random() - .5) * rows * .08,
      ti: order[i % THEMES.length]
    });
  }
  function regionAt(x, y) {
    let best = 0, bd = Infinity;
    for (let i = 0; i < seeds.length; i++) {
      const dx = x - seeds[i].x, dy = y - seeds[i].y;
      const a = Math.atan2(dy, dx);
      // 邊界加雜訊 → 分區邊界是彎的，不是直線
      const d = Math.sqrt(dx * dx + dy * dy) *
        (1 + .16 * Math.sin(a * 3 + i * 2.1) + .08 * Math.sin(a * 5 - i));
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }
  // ---- 2) 海岸線：一塊壓扁的不規則大陸 ----
  const cx0 = (cols - 1) / 2, cy0 = (rows - 1) / 2;
  const R0 = Math.min(cols, rows) * .485;
  function landAt(x, y) {
    const dx = (x - cx0) / 1.16, dy = y - cy0;
    const d = Math.sqrt(dx * dx + dy * dy), a = Math.atan2(dy, dx);
    const k = 1 + .14 * Math.sin(a * 3 + 1.1) + .075 * Math.sin(a * 5 - .7) + .05 * Math.sin(a * 7 + 2.3);
    return d < R0 * k;
  }
  // 內陸小湖 2~3 個（卡位、繞路都靠它）
  const lakes = [];
  for (let i = 0, n = 2 + rand(2); i < n; i++) {
    lakes.push({
      x: 10 + Math.random() * (cols - 20),
      y: 8 + Math.random() * (rows - 16),
      r: 1.8 + Math.random() * 2.2
    });
  }
  function inLake(x, y) {
    for (let i = 0; i < lakes.length; i++) {
      const dx = x - lakes[i].x, dy = y - lakes[i].y;
      if (dx * dx + dy * dy < lakes[i].r * lakes[i].r) return true;
    }
    return false;
  }
  let landN = 0;
  for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) {
    if (!landAt(x, y) || inLake(x, y)) continue;
    Game.grid[y][x] = 0;
    Game.brIsl[y][x] = regionAt(x, y);
    Game.themeAt[y][x] = THEMES[seeds[Game.brIsl[y][x]].ti];
    landN++;
  }
  // ---- 3) 硬牆：零星岩層團塊，只佔約 8%（v4.74：以前太多，繞不過去）----
  const hardTarget = Math.round(landN * .08);
  let hardN = 0, guard = 0;
  while (hardN < hardTarget && guard++ < 6000) {
    const x = 1 + rand(cols - 2), y = 1 + rand(rows - 2);
    if (Game.grid[y][x] !== 0) continue;
    const rr = 1 + Math.random() * 1.9;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const px = x + dx, py = y + dy;
      if (px < 1 || py < 1 || px >= cols - 1 || py >= rows - 1) continue;
      if (Game.grid[py][px] !== 0) continue;
      if (Math.sqrt(dx * dx + dy * dy) > rr || Math.random() < .3) continue;
      Game.grid[py][px] = 1; hardN++;
    }
  }
  // ---- 4) 出生點：30 人平均散在大陸上 ----
  const cells = [];
  for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) {
    if (Game.grid[y][x] === 0) cells.push({ x: x, y: y });
  }
  for (let i = cells.length - 1; i > 0; i--) {
    const k = rand(i + 1), t = cells[i]; cells[i] = cells[k]; cells[k] = t;
  }
  const sp = [];
  let minD = 6;
  for (let pass = 0; pass < 6 && sp.length < BR.N; pass++) {
    for (let i = 0; i < cells.length && sp.length < BR.N; i++) {
      const c = cells[i];
      let ok = true;
      for (let k = 0; k < sp.length; k++) {
        if (Math.abs(sp[k].x - c.x) + Math.abs(sp[k].y - c.y) < minD) { ok = false; break; }
      }
      if (!ok) continue;
      sp.push({ x: c.x, y: c.y });
      cells.splice(i, 1); i--;
    }
    minD = Math.max(2, minD - 1);
  }
  // 出生格周圍 1 格淨空（跟單人隨機圖同一個規則）
  const near = {};
  sp.forEach(function (s2) {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = s2.x + dx, y = s2.y + dy;
      if (x < 1 || y < 1 || x >= cols - 1 || y >= rows - 1) continue;
      if (Game.brIsl[y][x] < 0) continue;
      Game.grid[y][x] = 0; near[y + ',' + x] = 1;
    }
    near[s2.y + ',' + s2.x] = 1;
  });
  // ---- 5) 可炸軟磚（.45）＋ 底下藏道具 ----
  const softs = [];
  for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) {
    if (Game.brIsl[y][x] < 0 || Game.grid[y][x] !== 0) continue;
    if (near[y + ',' + x]) continue;
    if (Math.random() < .45) { Game.grid[y][x] = 2; softs.push({ x: x, y: y }); }
  }
  const softN = softs.length;
  const pool = ITEM_POOL.slice();
  for (let i = 0; i < Math.min(46, softs.length); i++) {
    const s3 = softs.splice(rand(softs.length), 1)[0];
    Game.hidden[s3.y + ',' + s3.x] = pick(pool);
  }
  // ---- 6) 空地上的補給（30 人分，比 8 人多）----
  const open = [];
  for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) {
    if (Game.grid[y][x] !== 0 || Game.brIsl[y][x] < 0 || near[y + ',' + x]) continue;
    open.push({ x: x, y: y });
  }
  for (let i = 0; i < 30 && open.length; i++) {
    const o = open.splice(rand(open.length), 1)[0];
    spawnItem(o.x, o.y, pick(ITEM_POOL));
  }
  // ---- 7) 可以躲人的物件（草叢／破屋／陶甕…；躲在裡面 AI 看不到）----
  const hideN = (function () {
    try { return placeHideTiles(cols, rows, Math.random, sp, BR.HIDE); } catch (e) { return 0; }
  })();
  Game.wallKind = null;
  markWallKinds();
  const themeIdx = [];
  for (let i = 0; i < 8; i++) themeIdx.push(seeds[i].ti);
  return { spawns: sp, landN: landN, hardN: hardN, softN: softN, hideN: hideN, themes: themeIdx };
}
"""
s = s[:i] + NEW + s[j+len(END)-len(END):]
# 上面那行切片有誤，改用明確寫法
s = io.open(P, encoding='utf-8').read()
i = s.find(START); j = s.find(END) + len(END)
s = s[:i] + NEW + s[j:]
io.open(P, 'w', encoding='utf-8', newline='\n').write(s)
print('ok buildBRMap rewrite', len(s))
