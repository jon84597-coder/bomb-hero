# -*- coding: utf-8 -*-
# v4.51 ①：大型不規則地圖生成器 bigGrid + buildOrganicMap 大圖分支
#   使用者定調：
#     · 可走格（空地＋軟磚）驅動尺寸：100／150／200／250／300
#     · 真正不規則、只有一層外牆、比現在更大、每張隨機
#     · 出生點隨機；大門隨機藏在遠處軟磚下
#     · 五條保護：出生點半徑 3 無怪／旁邊不能全是牆／傳送門周圍留一格／
#       不能有硬牆圍出進不去的空地／至少 2 個「一圈硬牆＋2~3 塊軟磚」怪物房
import io, sys

P = 'index.html'
s = io.open(P, encoding='utf-8', newline='').read()
orig_len = len(s)


def rep(old, new, optional=False, cnt=1, tag=''):
    global s
    if old not in s:
        if optional:
            print('  · skip ' + (tag or old[:36]))
            return
        sys.exit('MISS: ' + (tag or '') + ' -> ' + old[:120].replace('\n', '\\n'))
    s = s.replace(old, new, cnt)
    print('  ✓ ' + (tag or old[:36].replace('\n', ' ')))


# ---------------------------------------------------------------- 1) bigGrid
BIGGRID = r'''// ---------- v4.51：大型不規則地圖生成器（可走格數驅動）----------
// 使用者定調（v4.51）：
//   · 可走格 = 空地(0) ＋ 軟磚(2)，總量由 target 決定（100／150／200／250／300）
//   · 真正不規則：從隨機出生點「長」出洞穴群，不是先填滿再挖洞的正方形
//   · 只有一層外牆（最外圈全部硬牆，沒有第二層框）
//   · 出生點隨機；旁邊不能全是牆（3×3 一定可走）
//   · 至少 2 個「一圈不規則硬牆 ＋ 入口 2~3 塊軟磚」的怪物聚集房
//   · 不會有「硬牆圍起來、炸不開也進不去」的空地 —— 環形房一定有缺口，
//     缺口若本來是硬牆會被挖開，畫完環還會用 BFS 驗一次連通，斷了整間回滾
// 回傳 { g, spawn, rooms }；rooms[i].seal = 聚集房缺口格（軟磚要種在那裡）
function bigGrid(cols, rows, target, rnd) {
  const g = [];
  for (let y = 0; y < rows; y++) g.push(new Array(cols).fill(1));
  const ri = function (a, b) { return a + Math.floor(rnd() * (b - a + 1)); };
  const inside = function (x, y) { return x > 0 && y > 0 && x < cols - 1 && y < rows - 1; };
  const open = [];
  const dig = function (x, y) {
    if (!inside(x, y) || g[y][x] !== 1) return false;
    g[y][x] = 0; open.push([x, y]); return true;
  };
  // 四鄰有幾格是空的 —— 生長時用來決定「長成團」還是「長成走廊」
  const nb = function (x, y) {
    let n = 0;
    if (inside(x, y - 1) && g[y - 1][x] === 0) n++;
    if (inside(x, y + 1) && g[y + 1][x] === 0) n++;
    if (inside(x - 1, y) && g[y][x - 1] === 0) n++;
    if (inside(x + 1, y) && g[y][x + 1] === 0) n++;
    return n;
  };
  // 出生點：離外牆至少 3 格（不會一開局就貼著牆角）
  const sx = ri(3, Math.max(3, cols - 4)), sy = ri(3, Math.max(3, rows - 4));
  dig(sx, sy);
  // 出生點保護：3×3 一定可走 → 旁邊不會全是牆
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) dig(sx + dx, sy + dy);

  // ---- 生長式洞穴 ----
  //   從「貼著空地的硬牆」裡抽 4 個候選，挑「鄰居空地最多」的挖開 → 長成團狀洞穴；
  //   22% 機率改挑最少的 → 長出細走廊。兩者混在一起才會像天然洞窟。
  const grow = function (limit) {
    let guard = 0;
    while (open.length < limit && guard++ < 8000) {
      const f = [];
      for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) {
        if (g[y][x] === 1 && nb(x, y) > 0) f.push([x, y]);
      }
      if (!f.length) break;
      let pick = f[Math.floor(rnd() * f.length)], best = nb(pick[0], pick[1]);
      for (let i = 0; i < 3; i++) {
        const c = f[Math.floor(rnd() * f.length)], n = nb(c[0], c[1]);
        if (n > best) { best = n; pick = c; }
      }
      if (rnd() < .22) {
        let w = null, wn = 99;
        for (let i = 0; i < 3; i++) {
          const c = f[Math.floor(rnd() * f.length)], n = nb(c[0], c[1]);
          if (n < wn) { wn = n; w = c; }
        }
        if (w) pick = w;
      }
      dig(pick[0], pick[1]);
    }
  };
  grow(target);

  // ---- 怪物聚集房：一圈不規則硬牆 ＋ 單一出口 ----
  const rooms = [];
  const want = 2 + (rnd() < .5 ? 1 : 0);          // 2~3 間
  let rt = 0;
  while (rooms.length < want && rt++ < 90) {
    const cx = ri(4, Math.max(4, cols - 5)), cy = ri(4, Math.max(4, rows - 5));
    if (Math.abs(cx - sx) + Math.abs(cy - sy) < 9) continue;      // 不要貼著出生點
    let clash = false;
    for (let i = 0; i < rooms.length; i++) {
      const rm = rooms[i];
      if (Math.abs(rm.x - cx) + Math.abs(rm.y - cy) < Math.round(rm.r * 2) + 4) clash = true;
    }
    if (clash) continue;
    const rad = 2.5 + rnd() * .8;
    const gapA = rnd() * 6.283;                   // 出口方向
    const gapW = .30 + rnd() * .16;               // 出口角寬
    const snap = g.map(function (row) { return row.slice(); });   // 畫壞了就整間回滾
    const seal = [];
    for (let a = 0; a < 6.283; a += .10) {
      let da = a - gapA;
      while (da > 3.1416) da -= 6.283;
      while (da < -3.1416) da += 6.283;
      const gap = Math.abs(da) < gapW;
      // 半徑擾動 → 邊緣不是正圓、也不是方框，是一圈歪斜的石牆
      const wob = 1 + .14 * Math.sin(a * 3 + cx * .7) + .10 * Math.sin(a * 6 + cy * .5);
      const Ro = (rad + 1.25) * wob, Ri = rad * wob;
      for (let r = Ri; r <= Ro; r += .30) {
        const x = Math.round(cx + Math.cos(a) * r), y = Math.round(cy + Math.sin(a) * r);
        if (!inside(x, y)) continue;
        if (gap) {
          // 缺口：本來是硬牆就挖開 → 保證房裡走得到（不能變成「進不去的空地」）
          if (g[y][x] === 1) g[y][x] = 0;
          seal.push([x, y]);
        } else if (!(x === sx && y === sy)) {
          g[y][x] = 1;
        }
      }
    }
    // 房內清空（留得下 2~4 隻怪）
    for (let y = Math.floor(cy - rad); y <= Math.ceil(cy + rad); y++) {
      for (let x = Math.floor(cx - rad); x <= Math.ceil(cx + rad); x++) {
        if (!inside(x, y)) continue;
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy < (rad * .80) * (rad * .80)) g[y][x] = 0;
      }
    }
    // 出口至少留 2 格可走，否則整間是死房 → 丟掉
    let gapOpen = 0;
    for (let i = 0; i < seal.length; i++) {
      const c = seal[i];
      if (inside(c[0], c[1]) && g[c[1]][c[0]] === 0) gapOpen++;
    }
    // 連通性：畫完環之後所有空地必須還是同一塊（否則主區被切成兩半）
    let total = 0;
    for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) if (g[y][x] !== 1) total++;
    const reach = bfsReach(g, cols, rows, sx, sy);
    if (gapOpen < 2 || reach.count < total) {
      g.length = 0; snap.forEach(function (r) { g.push(r.slice()); });
      continue;
    }
    rooms.push({ x: cx, y: cy, r: rad, seal: seal });
  }
  // 畫環吃掉了不少空地 → 再長回來，讓可走格回到 target
  open.length = 0;
  for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) if (g[y][x] === 0) open.push([x, y]);
  grow(target);
  return { g: g, spawn: { x: sx, y: sy }, rooms: rooms };
}

'''
ANCHOR_GRID = '''// ---------- 不規則有機地形生成 ----------
// shape：open 洞穴 / island 破碎島嶼 / maze 迷宮 / bend L 型 / pillars 樑柱陣'''
if 'function bigGrid(' in s:
    print('  · skip bigGrid 生成器（已存在）')
else:
    rep(ANCHOR_GRID, BIGGRID + ANCHOR_GRID, tag='bigGrid 生成器')

# ------------------------------------------------- 2) buildOrganicMap 開頭
rep('''function buildOrganicMap(cols, rows, theme, info, rnd, opts) {
  opts = opts || {};
  Game.cols = cols; Game.rows = rows;
  Game.T = tileSize();''',
'''function buildOrganicMap(cols, rows, theme, info, rnd, opts) {
  opts = opts || {};
  // v4.51：大地圖（測試關）→ 可走格數驅動、隨機出生點、環形怪物房。
  //   Game.bigMap 一定要在 tileSize() 之前設好 —— tileSize() 靠它決定「整張塞進畫面」
  Game.bigMap = !!opts.targetFloor;
  let sp = { x: 1, y: 1 };
  Game.cols = cols; Game.rows = rows;
  Game.T = tileSize();''', tag='buildOrganicMap 開頭')

# ------------------------------------------------- 3) 地形分支
rep('''  // 1) 長地形 → 連通檢核 → 孤島封成岩層（避免走不到的區域浪費空間）
  let g = null, tries = 0;
  const floorNeed = Math.floor((cols - 2) * (rows - 2) * .34);
  while (tries < 6) {
    const r2 = rngFrom((opts.seed || 12345) + tries * 7919);
    g = organicGrid(cols, rows, info.shape, r2);
    const reach = bfsReach(g, cols, rows, 1, 1);
    let ok = reach.count >= floorNeed;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (g[y][x] !== 1 && !reach[y][x]) { g[y][x] = 1; }      // 封掉走不到的孤島
    }
    if (ok) break;
    tries++;
  }
  // 保底：地形真的太破碎 → 回到經典棋盤（一定有路）
  if (!g) g = organicGrid(cols, rows, 'open', rndFrom(opts.seed || 12345));
  Game.grid = g;''',
'''  // 1) 長地形 → 連通檢核 → 孤島封成岩層（避免走不到的區域浪費空間）
  //   v4.51：大圖走 bigGrid（可走格數驅動 ＋ 隨機出生點 ＋ 環形怪物房）
  let g = null, tries = 0;
  if (Game.bigMap) {
    const big = bigGrid(cols, rows, opts.targetFloor, rnd);
    g = big.g;
    sp = big.spawn;
    Game.roomSeal = big.rooms || [];
  } else {
    Game.roomSeal = [];
    const floorNeed = Math.floor((cols - 2) * (rows - 2) * .34);
    while (tries < 6) {
      const r2 = rngFrom((opts.seed || 12345) + tries * 7919);
      g = organicGrid(cols, rows, info.shape, r2);
      const reach = bfsReach(g, cols, rows, 1, 1);
      let ok = reach.count >= floorNeed;
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        if (g[y][x] !== 1 && !reach[y][x]) { g[y][x] = 1; }      // 封掉走不到的孤島
      }
      if (ok) break;
      tries++;
    }
  }
  // 保底：地形真的太破碎 → 回到經典棋盤（一定有路）
  if (!g) g = organicGrid(cols, rows, 'open', rndFrom(opts.seed || 12345));
  Game.grid = g;
  Game.spawnCell = { x: sp.x, y: sp.y };''', tag='地形分支 bigGrid')

# ------------------------------------------------- 4) 軟磚
rep('''  // 2) 軟磚：空地隨機鋪（出生點 4x4 保持淨空）
  const softRate = opts.softRate == null ? .46 : opts.softRate;
  const softs = [];
  for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) {
    if (g[y][x] !== 0) continue;
    if (x <= 3 && y <= 3) continue;
    if (rnd() < softRate) { g[y][x] = 2; softs.push({ x: x, y: y }); }
  }''',
'''  // 2) 軟磚：空地隨機鋪（出生點周圍保持淨空）
  //   v4.51：大地圖軟磚率降到 .34 —— 46% 在 300 格的圖上會變回一格一格的棋盤
  const softRate = opts.softRate == null ? (Game.bigMap ? .34 : .46) : opts.softRate;
  const softs = [];
  // 2a) 怪物聚集房入口：2~3 塊軟磚封門（玩家得炸開才進得去）
  if (Game.bigMap && Game.roomSeal && Game.roomSeal.length) {
    Game.roomSeal.forEach(function (rm) {
      const k = 2 + (rnd() < .5 ? 1 : 0);
      const cand = (rm.seal || []).filter(function (c) { return g[c[1]][c[0]] === 0; });
      for (let i = 0; i < k && cand.length; i++) {
        const c = cand.splice(Math.floor(rnd() * cand.length), 1)[0];
        g[c[1]][c[0]] = 2; softs.push({ x: c[0], y: c[1] });
      }
    });
  }
  const clearR = Game.bigMap ? 2 : 3;
  for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) {
    if (g[y][x] !== 0) continue;
    if (Math.abs(x - sp.x) <= clearR && Math.abs(y - sp.y) <= clearR) continue;
    if (rnd() < softRate) { g[y][x] = 2; softs.push({ x: x, y: y }); }
  }''', tag='軟磚（含聚集房封門）')

# ------------------------------------------------- 5) 門
rep('''  const reach2 = bfsReach(Game.grid, cols, rows, 1, 1);
  let best = null, bd = -1;
  // v4.26：同時記住「最遠的可達軟磚」——門一定要藏在軟磚下（不然開場就看到出口）
  let bestSoft = null, bsd = -1;
  for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) {
    if (Game.grid[y][x] === 1 || !reach2[y][x]) continue;
    const d = Math.abs(x - 1) + Math.abs(y - 1);
    if (d > bd) { bd = d; best = { x: x, y: y }; }
    if (Game.grid[y][x] === 2 && d > bsd) { bsd = d; bestSoft = { x: x, y: y }; }
  }
  if (bestSoft) best = bestSoft;   // 有軟磚就優先藏
  if (best) {
    const isSoft = Game.grid[best.y][best.x] === 2;
    Game.door = { x: best.x, y: best.y, revealed: !isSoft, open: false };
    if (isSoft) Game.hidden[best.y + ',' + best.x] = 'door';
  } else {
    ensureDoor({ spawns: [{ x: 1, y: 1 }] });
  }''',
'''  const reach2 = bfsReach(Game.grid, cols, rows, sp.x, sp.y);
  let best = null, bd = -1;
  // v4.26：同時記住「最遠的可達軟磚」——門一定要藏在軟磚下（不然開場就看到出口）
  let bestSoft = null, bsd = -1;
  const farSoft = [];
  for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) {
    if (Game.grid[y][x] === 1 || !reach2[y][x]) continue;
    const d = Math.abs(x - sp.x) + Math.abs(y - sp.y);
    if (d > bd) { bd = d; best = { x: x, y: y }; }
    if (Game.grid[y][x] === 2) {
      farSoft.push({ x: x, y: y, d: d });
      if (d > bsd) { bsd = d; bestSoft = { x: x, y: y }; }
    }
  }
  if (bestSoft) best = bestSoft;   // 有軟磚就優先藏
  // v4.51：大圖的門改成「遠處隨機」—— 只在最遠 28% 距離外的軟磚裡抽，
  //   不然每張圖的出口都固定落在同一個角落，玩家一進場就知道往哪走。
  if (Game.bigMap && farSoft.length) {
    const need2 = Math.max(1, Math.floor(bd * .72));
    const okFar = farSoft.filter(function (c) { return c.d >= need2; });
    const arr = okFar.length ? okFar : farSoft;
    best = arr[Math.floor(rnd() * arr.length)];
  }
  if (best) {
    const isSoft = Game.grid[best.y][best.x] === 2;
    Game.door = { x: best.x, y: best.y, revealed: !isSoft, open: false };
    if (isSoft) Game.hidden[best.y + ',' + best.x] = 'door';
  } else {
    ensureDoor({ spawns: [{ x: sp.x, y: sp.y }] });
  }''', tag='出口門（遠處隨機）')

# ------------------------------------------------- 6) 傳送門周圍留一格
rep('''      const floors = [];
      for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) {
        if (Game.grid[y][x] === 0 && !Game.hazards[y][x]) floors.push({ x: x, y: y });
      }''',
'''      // v4.51：傳送門周圍至少留一格可走 —— 四面都被牆夾住的格子站不上去也看不到
      const warpOk = function (x, y) {
        let n = 0;
        const ds = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (let i = 0; i < 4; i++) {
          const nx = x + ds[i][0], ny = y + ds[i][1];
          if (nx > 0 && ny > 0 && nx < cols - 1 && ny < rows - 1 && Game.grid[ny][nx] !== 1) n++;
        }
        return n >= 1;
      };
      const floors = [];
      for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) {
        if (Game.grid[y][x] === 0 && !Game.hazards[y][x] && warpOk(x, y)) floors.push({ x: x, y: y });
      }''', tag='傳送門四周可走')

# ------------------------------------------------- 7) 藏人避開出生點
rep('''  placeHideTiles(cols, rows, rnd, [{ x: 1, y: 1 }]);
}''',
'''  placeHideTiles(cols, rows, rnd, [{ x: sp.x, y: sp.y }]);
}''', tag='placeHideTiles 出生點')

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('\n字元 %d → %d（%+d）' % (orig_len, len(s), len(s) - orig_len))
