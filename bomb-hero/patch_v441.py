# -*- coding: utf-8 -*-
"""v4.41 patch 1：藏人物件淺色矮化 + 推車投擲硬上限 3 格"""
import io
import os
import re

ROOT = os.path.dirname(os.path.abspath(__file__))
HTML = os.path.join(ROOT, 'index.html')
s = io.open(HTML, encoding='utf-8', newline='').read()
orig_len = len(s)
s = s.replace('\r\n', '\n')          # 本檔目前是 LF，統一一下
n0 = s.count('\n')


def one(old, new, tag):
    global s
    assert s.count(old) == 1, '%s 出現 %d 次' % (tag, s.count(old))
    s = s.replace(old, new)


# ---------- 1. 藏人物件貼圖換成淺色矮胖版 ----------
js = io.open(os.path.join(ROOT, 'art/hides/_hides_game.js'), encoding='utf-8').read()
i0 = js.index('// ---------- 藏人場景物件貼圖')
js = js[i0:].strip()
js = js.replace('//   · 淺色低飽和、矮胖（寬 > 高）→ 場上寬約 1.14 格、高不超過 1.10 格',
                '//   · 淺色低飽和、矮胖（寬 > 高）→ 場上寬 1.14 格、高不超過 1.10 格（只比一格多一點）')
m = re.search(r'// ---------- 藏人場景物件貼圖[\s\S]*?const HIDE_ART = \{[\s\S]*?\n\};', s)
assert m, '找不到舊 HIDE_ART 區塊'
old_block = m.group(0)
assert len(old_block) > 40000, '舊區塊太短，可能抓錯'
s = s[:m.start()] + js + s[m.end():]

# ---------- 2. 場上尺寸：寬 1.14 格、高 ≤1.10 格 ----------
one("const HIDE_ART_SCALE = 1.26;     // 物件寬度 = 1.26 格（比格子大一點，但不至於吃掉隔壁）",
    "const HIDE_ART_SCALE = 1.14;     // v4.41：物件寬度 = 1.14 格（只比一格多一點點）\n"
    "const HIDE_ART_MAXH = 1.10;      // v4.41：高度硬上限 1.10 格 —— 疊箱也不會蓋掉上面一整格",
    'HIDE_ART_SCALE')

one("""  let w = T * HIDE_ART_SCALE;                // 比一格大一點
  let h = w / (M.asp || 1);
  // 又瘦又高的物件（木箱堆 1.83 格）會蓋掉上面一整格 → 高度上限 1.55 格，寬度跟著縮
  if (h > T * 1.55) { h = T * 1.55; w = h * (M.asp || 1); }""",
    """  let w = T * HIDE_ART_SCALE;                // 比一格大一點（1.14 格）
  let h = w / (M.asp || 1);
  // v4.41：高度上限 1.10 格。以前的木箱堆長到 1.83 格，直接把上面那一格遮掉 → 看不到敵人。
  if (h > T * HIDE_ART_MAXH) { h = T * HIDE_ART_MAXH; w = h * (M.asp || 1); }
  // 太扁的（石堆 asp 1.7 那種）也不縮到看不出體積 → 至少 0.62 格高
  if (h < T * .62) { h = T * .62; w = Math.min(T * HIDE_ART_SCALE, h * (M.asp || 1)); }""",
    'hide size')

# ---------- 3. 影子淡一點 ----------
one("""  // 地面影子（比物件窄 → 有站在地上的感覺）
  ctx.fillStyle = 'rgba(16,24,18,.24)';
  ctx.beginPath();
  ctx.ellipse(cx2, base - T * .04, w * .33, T * .10, 0, 0, 6.283);
  ctx.fill();""",
    """  // 地面影子（比物件窄 → 有站在地上的感覺）
  // v4.41：影子再淡一階（.24 → .115），淺色物件才不會被自己的黑影拖暗
  ctx.fillStyle = 'rgba(18,28,20,.115)';
  ctx.beginPath();
  ctx.ellipse(cx2, base - T * .03, w * .30, T * .075, 0, 0, 6.283);
  ctx.fill();""",
    'hide shadow')

# ---------- 4. 推車三段集氣 = 1／2／3 格 ----------
one("""const CART_LV = [
  { edge: 1, reach: 3,  color: '#7ee08a', name: '近 3 格' },
  { edge: 2, reach: 6,  color: '#ffd166', name: '中 6 格' },
  { edge: 3, reach: 10, color: '#ff5e7e', name: '遠 10 格' }
];""",
    """// v4.41：距離硬上限 —— 三段集氣就是 1／2／3 格，丟再滿也不會超過 3 格。
const CART_LV = [
  { edge: 1, reach: 1, color: '#7ee08a', name: '近 1 格' },
  { edge: 2, reach: 2, color: '#ffd166', name: '中 2 格' },
  { edge: 3, reach: 3, color: '#ff5e7e', name: '遠 3 格' }
];""",
    'CART_LV')

# ---------- 5. 落點演算法重寫 ----------
old_pick = """function cartPickLanding(p, lv) {
  const T = Game.T;
  const level = (lv == null ? 1 : lv);
  const cx = clamp(Math.round(p.x / T - .5), 0, Game.cols - 1);
  const cy = clamp(Math.round(p.y / T - .5), 0, Game.rows - 1);
  const dir = cartThrowDir(p);
  const reach = (CART_LV[level] || CART_LV[1]).reach;
  // 集氣＝力量：先「飛滿」reach 格（牆不擋、直接飛過去），
  //   落點不是空地就繼續往前找第一格空地 —— 所以看起來就是「丟到牆上再彈到下一格，落地才停」。
  const cols = Game.cols, rows = Game.rows;
  const path = [{ x: cx, y: cy }];
  let x = cx, y = cy;
  for (let k = 1; k <= reach + THROW_RANGE; k++) {
    const nx = x + dir.d.x, ny = y + dir.d.y;
    if (nx < 1 || nx > cols - 2 || ny < 1 || ny > rows - 2) break;
    // v4.39：w=1 表示「這一格是牆／軟磚」→ 只有飛過牆的那一段才做彈跳動畫
    path.push({ x: nx, y: ny, w: cellAt(nx, ny) !== 0 ? 1 : 0 });
    x = nx; y = ny;
    if (k < reach) continue;                                  // 還在空中 → 牆也照飛
    if (cellAt(nx, ny) === 0 && !bombAt(nx, ny)) {
      return { x: nx, y: ny, path: path, dir: dir.dn, dist: k };
    }
  }
  return null;
}"""
new_pick = """function cartPickLanding(p, lv) {
  const T = Game.T;
  const level = (lv == null ? 1 : lv);
  const cx = clamp(Math.round(p.x / T - .5), 0, Game.cols - 1);
  const cy = clamp(Math.round(p.y / T - .5), 0, Game.rows - 1);
  const dir = cartThrowDir(p);
  const reach = (CART_LV[level] || CART_LV[1]).reach;         // v4.41：1／2／3 格，硬上限
  const cols = Game.cols, rows = Game.rows;
  // v4.41 改寫：以前是「reach + 16 格」，撞到牆還一格一格彈過去 → 實際飛了 5～16 格。
  //   現在只在 reach 以內找落點，撞到「硬牆」就當場停住（炸彈翻不過石牆，也不再彈跳）。
  const cells = [];
  let x = cx, y = cy;
  for (let k = 1; k <= reach; k++) {
    const nx = x + dir.d.x, ny = y + dir.d.y;
    if (nx < 1 || nx > cols - 2 || ny < 1 || ny > rows - 2) break;   // 最外圈 → 停
    x = nx; y = ny;
    const c = cellAt(nx, ny);
    cells.push({ x: nx, y: ny, kind: c, bomb: !!bombAt(nx, ny), hard: c === 1 });
    if (c === 1) break;                                            // 石牆擋住 → 後面的格子不算
  }
  if (!cells.length) return null;
  let pick = -1, onSoft = false;
  // 首選：reach 以內「最遠的一格空地」（從遠處往回找 → 集氣越滿丟越遠）
  for (let i = cells.length - 1; i >= 0; i--) {
    if (!cells[i].hard && !cells[i].bomb && cells[i].kind === 0) { pick = i; break; }
  }
  if (pick < 0) {          // 只有軟磚 → 砸在磚上（炸彈引爆時順便把那一塊磚炸掉）
    for (let i = cells.length - 1; i >= 0; i--) {
      if (!cells[i].hard && !cells[i].bomb && cells[i].kind === 2) { pick = i; onSoft = true; break; }
    }
  }
  if (pick < 0) return null;
  const path = [{ x: cx, y: cy }];
  for (let j = 0; j <= pick; j++) path.push({ x: cells[j].x, y: cells[j].y, w: cells[j].kind === 1 ? 1 : 0 });
  return { x: cells[pick].x, y: cells[pick].y, path: path, dir: dir.dn, dist: pick + 1, onSoft: onSoft };
}"""
one(old_pick, new_pick, 'cartPickLanding')

# ---------- 6. 丟在軟磚上 → 引爆時把磚炸掉 ----------
one("""  const cx = b.cx, cy = b.cy;
  const pierce = b.owner ? b.owner.pierce : false;
  addFlame(cx, cy, 'center', pierce, b.owner);""",
    """  const cx = b.cx, cy = b.cy;
  const pierce = b.owner ? b.owner.pierce : false;
  // v4.41：推車把炸彈「砸在軟磚上」（onSoft）→ 引爆時那塊磚一起碎掉，不然會卡一顆炸彈在磚裡
  if (b.onSoft && cellAt(cx, cy) === 2) destroySoft(cx, cy);
  addFlame(cx, cy, 'center', pierce, b.owner);""",
    'explodeBomb onSoft')

# ---------- 7. cartThrowBomb 記錄 onSoft ----------
one("""    timer: 2.4, power: 1, owner: p, passers: [], remoteArmed: false, mine: false,
    moving: null, held: false, ownerLeft: false, seed: Math.random() * 6.28,""",
    """    timer: 2.4, power: 1, owner: p, passers: [], remoteArmed: false, mine: false,
    moving: null, held: false, ownerLeft: false, onSoft: !!land.onSoft,
    seed: Math.random() * 6.28,""",
    'cartThrowBomb onSoft')

# ---------- 8. 丟不出去時給一次提示（人類玩家、3 秒一次） ----------
one("""  const land = cartPickLanding(p, lv);
  if (!land) return false;                       // 這條射線上沒有任何空地 → 丟不出去""",
    """  const land = cartPickLanding(p, lv);
  if (!land) {
    // v4.41：3 格以內全是石牆／已經有炸彈 → 真的丟不出去。
    //   不靜默失敗（玩家會以為按鍵壞了）：3 秒給一次提示。
    if (!p.ai && (!p.cartNoLandAt || Game.gameT - p.cartNoLandAt > 3)) {
      p.cartNoLandAt = Game.gameT;
      toast('🚫 前面 3 格內沒有落點，沿著外圈換個位置', 1.6, 'cartNoLand');
    }
    return false;
  }""",
    'cartThrowBomb noLand')

io.open(HTML, 'w', encoding='utf-8', newline='').write(s)
print('OK  %d → %d 字元（%+.0f KB）  行數 %d → %d'
      % (orig_len, len(s), (len(s) - orig_len) / 1024.0, n0, s.count('\n')))
