# -*- coding: utf-8 -*-
"""
v4.31 程式面三件事（可重複執行）：
  1. 所有小怪外型再放大 15%（ENEMY_ART_MUL 1.42 → 1.633）
  2. 隨從丟的炸彈不再砸暈玩家（原本只有「丟的人」免疫，主人會被砸暈）
  3. 隨從走路改「格子 BFS 尋路」＋彼此／與主人自動分開（不再貼牆發呆、不會疊在一起）
"""
import io
import os
import re

ROOT = r'C:\Users\jon84\WorkBuddy\2026-10-30-12-58-54\bomb-hero'
PAGE = os.path.join(ROOT, 'index.html')

s = io.open(PAGE, encoding='utf-8', newline='').read().replace('\r\n', '\n')
orig = len(s)

# ================= 1) 小怪 +15% =================
old = ("// v2.4：小怪太小看不清楚 → 畫面上放大 42%（只放大外型，判定半徑 e.r 不變，不會變難躲）\n"
       "const ENEMY_ART_MUL = 1.42;")
new = ("// v2.4：小怪太小看不清楚 → 畫面上放大 42%（只放大外型，判定半徑 e.r 不變，不會變難躲）\n"
       "// v4.31：再放大 15%（1.42 × 1.15 ≈ 1.633），一樣只放大外型、不動判定半徑\n"
       "const ENEMY_ART_MUL = 1.633;")
assert s.count(old) == 1, 'ENEMY_ART_MUL 找不到'
s = s.replace(old, new, 1)

# ================= 2) 隨從炸彈不砸暈人 =================
old = ("// v2.0：誰丟的炸彈砸到誰都不算 —— 只有「被丟到的那個人」才會頭暈\n"
       "function dizzyImmune(who, b) {\n"
       "  return !!(b && b.owner && who === b.owner);\n"
       "}")
new = ("// v2.0：誰丟的炸彈砸到誰都不算 —— 只有「被丟到的那個人」才會頭暈\n"
       "// v4.31：隨從丟的炸彈是「支援火力」→ 飛過主人頭上也不會把主人砸暈\n"
       "//   （原本只讓「丟的人 = 隨從」免疫，玩家不是 owner 所以照樣暈）\n"
       "function dizzyImmune(who, b) {\n"
       "  if (!b) return false;\n"
       "  if (b.petOwner && typeof Game !== 'undefined' && Game.players && Game.players.indexOf(who) >= 0) return true;\n"
       "  return !!(b.owner && who === b.owner);\n"
       "}")
assert s.count(old) == 1, 'dizzyImmune 找不到'
s = s.replace(old, new, 1)

# ================= 3) 隨從尋路 + 分離 =================
start = s.index('function petFreeCell(x, y)')
end = s.index('function petNearestEnemy(pt)')
old_block = s[start:end]
assert 'function petStepTo' in old_block and len(old_block) < 2000, 'petStepTo 區塊範圍不對'

NEW_BLOCK = r'''function petFreeCell(x, y) { return cellAt(x, y) === 0 && !bombAt(x, y); }
// v4.31：隨從走路改成「格子 BFS 尋路」——
//   舊做法是貪心：想往右就只看右邊一格，被擋住就隨便換一個方向 → 遇到 L 形牆會原地抖。
//   現在先把整張地圖的連通格找出來，走「真的到得了」的那條路，會繞過牆角與炸彈。
const PET_PATH_T = .38;              // 幾秒重算一次路徑（很便宜：15×13 格）
function petWalkable(cx, cy) {
  return cx > 0 && cy > 0 && cx < Game.cols - 1 && cy < Game.rows - 1 &&
    cellAt(cx, cy) === 0 && !bombAt(cx, cy);
}
// 廣度搜尋：回傳 [{x,y}...]（不含起點）。到不了目標就走到「最接近目標」的那一格。
function petFindPath(sx, sy, gx, gy) {
  const cols = Game.cols, rows = Game.rows;
  if (sx === gx && sy === gy) return [];
  const at = function (x, y) { return y * cols + x; };
  const prev = new Int32Array(cols * rows); prev.fill(-1);
  const seen = new Uint8Array(cols * rows);
  const q = [at(sx, sy)];
  seen[at(sx, sy)] = 1;
  let head = 0, goal = -1, best = -1, bestD = Infinity;
  const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const want = at(gx, gy);
  while (head < q.length) {
    const cur = q[head++];
    const cx = cur % cols, cy = (cur - cx) / cols;
    const d = Math.abs(cx - gx) + Math.abs(cy - gy);
    if (d < bestD) { bestD = d; best = cur; }
    if (cur === want) { goal = cur; break; }
    for (let i = 0; i < 4; i++) {
      const nx = cx + D4[i][0], ny = cy + D4[i][1];
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const n = at(nx, ny);
      if (seen[n] || !petWalkable(nx, ny)) continue;
      seen[n] = 1; prev[n] = cur; q.push(n);
    }
  }
  const stop = goal >= 0 ? goal : best;
  if (stop < 0 || stop === at(sx, sy)) return [];
  const out = [];
  let n = stop, guard = 0;
  while (n >= 0 && n !== at(sx, sy) && guard++ < cols * rows) {
    const cx = n % cols, cy = (n - cx) / cols;
    out.push({ x: cx, y: cy });
    n = prev[n];
  }
  out.reverse();
  return out;
}
// 同一格內直接朝點走（格子裡沒有障礙，可以走斜線）
function petWalkStraight(pt, tx, ty, sp) {
  const T = Game.T || 40;
  const dx = tx - pt.x, dy = ty - pt.y;
  const len = Math.hypot(dx, dy);
  if (len < 1.6) { pt.moving = false; return false; }
  const step = Math.min(sp, len);
  const nx = pt.x + dx / len * step, ny = pt.y + dy / len * step;
  if (!petFreeCell(Math.floor(nx / T), Math.floor(ny / T))) {
    // 走的這一步會跨進牆裡 → 只走還進得去的那一軸
    if (petFreeCell(Math.floor(pt.x / T), Math.floor(ny / T))) { pt.y = ny; }
    else if (petFreeCell(Math.floor(nx / T), Math.floor(pt.y / T))) { pt.x = nx; }
    else { pt.moving = false; return false; }
  } else { pt.x = nx; pt.y = ny; }
  pt.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  pt.moving = true; pt.walkT += Math.abs(step) / (T * 3.4);
  return true;
}
// 往目標走一步（BFS 尋路；目標在牆裡／炸彈上就自動找最近的可行格）
function petStepTo(pt, tx, ty, dt, speed) {
  const T = Game.T || 40;
  const sp = speed * dt;
  const cx = clamp(Math.floor(pt.x / T), 0, Game.cols - 1);
  const cy = clamp(Math.floor(pt.y / T), 0, Game.rows - 1);
  let gx = clamp(Math.floor(tx / T), 0, Game.cols - 1);
  let gy = clamp(Math.floor(ty / T), 0, Game.rows - 1);
  if (!petWalkable(gx, gy)) {
    let bd = Infinity, bx = gx, by = gy, found = false;
    for (let ry = -1; ry <= 1; ry++) {
      for (let rx = -1; rx <= 1; rx++) {
        const x = gx + rx, y = gy + ry;
        if (!petWalkable(x, y)) continue;
        const d = Math.abs(x - cx) + Math.abs(y - cy);
        if (d < bd) { bd = d; bx = x; by = y; found = true; }
      }
    }
    if (found) { gx = bx; gy = by; }
  }
  if (gx === cx && gy === cy) return petWalkStraight(pt, tx, ty, sp);

  pt._pathT = (pt._pathT || 0) - dt;
  const gk = gx + ',' + gy;
  if (pt._pathKey !== gk || !pt._path || !pt._path.length || pt._pathT <= 0) {
    pt._path = petFindPath(cx, cy, gx, gy);
    pt._pathKey = gk; pt._pathT = PET_PATH_T;
  }
  while (pt._path.length && !petWalkable(pt._path[0].x, pt._path[0].y)) pt._path.shift();
  if (!pt._path.length) return petWalkStraight(pt, tx, ty, sp);

  let node = pt._path[0];
  let ax = node.x * T + T / 2, ay = node.y * T + T / 2;
  if (Math.hypot(ax - pt.x, ay - pt.y) < Math.max(sp, T * .14)) {
    pt._path.shift();
    if (!pt._path.length) return petWalkStraight(pt, tx, ty, sp);
    node = pt._path[0];
    ax = node.x * T + T / 2; ay = node.y * T + T / 2;
  }
  const dx = ax - pt.x, dy = ay - pt.y;
  const len = Math.hypot(dx, dy) || 1;
  const step = Math.min(sp, len);
  pt.x += dx / len * step;
  pt.y += dy / len * step;
  pt.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  pt.moving = true;
  pt.walkT += Math.abs(step) / (T * 3.4);
  return true;
}
'''
s = s[:start] + NEW_BLOCK + s[end:]

# --- 3b) makePet 加上路徑欄位 ---
old = ("    atkCd: .6, restT: 0, slashT: 0, throwT: 0, hitT: 0,\n"
       "    down: false, rescueT: 0, downT: 0")
new = ("    atkCd: .6, restT: 0, slashT: 0, throwT: 0, hitT: 0,\n"
       "    down: false, rescueT: 0, downT: 0,\n"
       "    // v4.31：BFS 尋路狀態（_path 目前路徑、_pathKey 目標格、_pathT 重算倒數）\n"
       "    _path: null, _pathKey: '', _pathT: 0, _lostT: 0")
assert s.count(old) == 1, 'makePet 欄位找不到'
s = s.replace(old, new, 1)

# --- 3c) 跟隨位置：三個站位收緊一點，跟得更貼 ---
old = ("  const offs = [[-1, .35], [1, .35], [-.15, 1.05]];\n"
       "  const o = offs[pt.idx % offs.length];\n"
       "  const sx = hero.x + o[0] * T * .8, sy = hero.y + o[1] * T * .8;\n"
       "  if (Math.hypot(sx - pt.x, sy - pt.y) > T * .55) petStepTo(pt, sx, sy, dt, T * PET_FOLLOW_SPD);")
new = ("  // v4.31：三個站位（左後／右後／正後）跟著主人轉，不會全部擠在同一邊\n"
       "  const offs = [[-1, .42], [1, .42], [0, .95]];\n"
       "  const o = offs[pt.idx % offs.length];\n"
       "  const sx = hero.x + o[0] * T * .78, sy = hero.y + o[1] * T * .78;\n"
       "  if (Math.hypot(sx - pt.x, sy - pt.y) > T * .5) petStepTo(pt, sx, sy, dt, T * PET_FOLLOW_SPD);\n"
       "  else pt.moving = false;")
assert s.count(old) == 1, '跟隨站位找不到'
s = s.replace(old, new, 1)

# --- 3d) 分離 + 走失瞬移：插在 updatePets 收尾 ---
old = ("    petFollowWork(pt, hero, dt);\n"
       "    petTouchEnemies(pt);\n"
       "  }\n"
       "}\n"
       "// 繪製隨從（角色＋種類徽章＋刀光＋血量；倒地時是哭臉＋Help）")
new = ("    petFollowWork(pt, hero, dt);\n"
       "    petTouchEnemies(pt);\n"
       "  }\n"
       "  petSeparate();                    // v4.31：隨從之間、隨從與主人都不要疊在一起\n"
       "}\n"
       "// 主人附近最近的一格空地（走失瞬移、分離被牆擋住時用）\n"
       "function petSpotNear(hero) {\n"
       "  const T = Game.T || 40;\n"
       "  const hx = Math.floor(hero.x / T), hy = Math.floor(hero.y / T);\n"
       "  for (let rr = 1; rr <= 3; rr++) {\n"
       "    for (let dy = -rr; dy <= rr; dy++) {\n"
       "      for (let dx = -rr; dx <= rr; dx++) {\n"
       "        if (Math.abs(dx) !== rr && Math.abs(dy) !== rr) continue;\n"
       "        const x = hx + dx, y = hy + dy;\n"
       "        if (!petFreeCell(x, y)) continue;\n"
       "        return { x: x * T + T / 2, y: y * T + T / 2 };\n"
       "      }\n"
       "    }\n"
       "  }\n"
       "  return null;\n"
       "}\n"
       "// v4.31：隨從互相推開（含主人）—— 兩隻重疊時各退一半，主人不動（只有隨從讓開）\n"
       "function petSeparate() {\n"
       "  const T = Game.T || 40, ps = Game.pets || [];\n"
       "  if (!ps.length) return;\n"
       "  const hero = petHero();\n"
       "  const minP = T * .62, minH = T * .56;\n"
       "  for (let i = 0; i < ps.length; i++) { if (ps[i]) { ps[i]._sx = 0; ps[i]._sy = 0; } }\n"
       "  for (let i = 0; i < ps.length; i++) {\n"
       "    const a = ps[i];\n"
       "    if (!a || a.down) continue;\n"
       "    if (hero && hero.alive) {\n"
       "      let dx = a.x - hero.x, dy = a.y - hero.y, d = Math.hypot(dx, dy);\n"
       "      if (d < minH) {\n"
       "        if (d < .01) { dx = (a.idx % 2 ? 1 : -1); dy = 0; d = 1; }\n"
       "        const k = (minH - d) / d;\n"
       "        a._sx += dx * k; a._sy += dy * k;\n"
       "      }\n"
       "    }\n"
       "    for (let j = i + 1; j < ps.length; j++) {\n"
       "      const b = ps[j];\n"
       "      if (!b || b.down) continue;\n"
       "      let dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);\n"
       "      if (d >= minP) continue;\n"
       "      if (d < .01) { dx = (i % 2 ? 1 : -1); dy = .4; d = 1; }\n"
       "      const k = (minP - d) / d * .5;\n"
       "      a._sx += dx * k; a._sy += dy * k;\n"
       "      b._sx -= dx * k; b._sy -= dy * k;\n"
       "    }\n"
       "  }\n"
       "  for (let i = 0; i < ps.length; i++) {\n"
       "    const a = ps[i];\n"
       "    if (!a || a.down || (!a._sx && !a._sy)) continue;\n"
       "    const ox = a.x, oy = a.y;\n"
       "    const nx = ox + clamp(a._sx, -T * .34, T * .34);\n"
       "    const ny = oy + clamp(a._sy, -T * .34, T * .34);\n"
       "    if (petFreeCell(Math.floor(nx / T), Math.floor(ny / T))) { a.x = nx; a.y = ny; }\n"
       "    else if (petFreeCell(Math.floor(nx / T), Math.floor(oy / T))) a.x = nx;\n"
       "    else if (petFreeCell(Math.floor(ox / T), Math.floor(ny / T))) a.y = ny;\n"
       "    a._sx = 0; a._sy = 0;\n"
       "  }\n"
       "}\n"
       "// 繪製隨從（角色＋種類徽章＋刀光＋血量；倒地時是哭臉＋Help）")
assert s.count(old) == 1, 'updatePets 收尾找不到'
s = s.replace(old, new, 1)

# --- 3e) 走失瞬移（插在 pt.moving = false 之後）---
old = ("    if (pt.throwT > 0) pt.throwT -= dt;\n"
       "    pt.moving = false;\n")
new = ("    if (pt.throwT > 0) pt.throwT -= dt;\n"
       "    pt.moving = false;\n"
       "    // v4.31：被軟磚圍住／卡在牆的另一側 → 2.5 秒後瞬移到主人旁邊，不要讓玩家等\n"
       "    if (!pt.down) {\n"
       "      const far = Math.hypot(hero.x - pt.x, hero.y - pt.y) > T * 5.5;\n"
       "      pt._lostT = far ? (pt._lostT || 0) + dt : 0;\n"
       "      if (pt._lostT > 2.5) {\n"
       "        const spot = petSpotNear(hero);\n"
       "        if (spot) {\n"
       "          pt.x = spot.x; pt.y = spot.y; pt._path = null; pt._pathKey = '';\n"
       "          pt._lostT = 0; pt.moving = false;\n"
       "          burst(pt.x, pt.y, '#bfe8ff', 10, 120);\n"
       "        }\n"
       "      }\n"
       "    }\n")
assert s.count(old) == 1, 'updatePets 開頭找不到'
s = s.replace(old, new, 1)

# ================= 4) 版號 4.30 → 4.31 =================
if "const VERSION = '4.30';" in s:
    s = s.replace("const VERSION = '4.30';", "const VERSION = '4.31';")
    s = s.replace('<span id="verLogVer">4.30</span>', '<span id="verLogVer">4.31</span>')
    s = s.replace('<span id="verTxt">4.30</span>', '<span id="verTxt">4.31</span>')
    old_log = "  { v: '4.30', date: '2026-11-02', now: true, items: ["
    assert s.count(old_log) == 1
    s = s.replace(old_log, "  { v: '4.31', date: '2026-11-02', now: true, items: [\n"
                           "    '所有小怪外型再放大 15%（判定不變，只是看得更清楚）',\n"
                           "    '隨從丟的炸彈不會再砸暈主人（支援火力，飛過頭上也不會暈）',\n"
                           "    '隨從會繞路跟好主人，彼此與主人之間不再疊在一起'\n"
                           "  ] },\n"
                           "  { v: '4.30', date: '2026-11-02', now: false, items: [", 1)

io.open(PAGE, 'w', encoding='utf-8', newline='').write(s.replace('\n', '\r\n'))
print('index.html %d -> %d bytes (%+.1f KB)' % (orig, len(s), (len(s) - orig) / 1024.0))
