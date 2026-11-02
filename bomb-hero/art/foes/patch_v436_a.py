# -*- coding: utf-8 -*-
# v4.36 patch 1：龍吐火強化 / 對戰 AI 朝向 / 手套撿彈 / 豬蛙雞縮小 / 每關小怪上限 12
import io, sys, re

P = r'C:\Users\jon84\WorkBuddy\2026-10-30-12-58-54\bomb-hero\index.html'
s = io.open(P, encoding='utf-8', newline='').read()
orig = s

def rep(old, new, n=1, tag=''):
    global s
    old = old.replace('\r\n', '\n')
    new = new.replace('\r\n', '\n')
    # 檔案是 CRLF：先轉成 LF 比對，再換回
    lf = s.replace('\r\n', '\n')
    c = lf.count(old)
    if c != n:
        print('!! [%s] 命中 %d 次（預期 %d）\n---\n%s\n---' % (tag, c, n, old[:400]))
        sys.exit(1)
    lf = lf.replace(old, new)
    s = lf.replace('\n', '\r\n')
    print('ok  [%s]' % tag)

# ------------------------------------------------------------------
# 1. 龍吐火：範圍 3 格 ＋ 面前扇形，命中判定放寬（站在格子邊緣也燒得到）
# ------------------------------------------------------------------
rep("""const DINO_FIRE_CD = 2;
const DINO_FIRE_RANGE = 2;""",
"""// v4.36：吐火範圍 2 → 3 格，而且會往左右各溢一格（扇形），
//   舊版只有一條直線 2 格，對手站斜一點、或隔著一格軟磚就完全燒不到 → 才會有「燒不死」的感覺。
const DINO_FIRE_CD = 2;
const DINO_FIRE_RANGE = 3;""", 1, 'dino-range')

rep("""  const dirs = p.redDragon ? ['up', 'down', 'left', 'right'] : [p.facing];
  let cells = 0;
  for (let k = 0; k < dirs.length; k++) {
    const dn = dirs[k], d = DIRS[dn] || DIRS.down;
    for (let i = 1; i <= DINO_FIRE_RANGE; i++) {
      const x = cx + d.x * i, y = cy + d.y * i;
      if (cellAt(x, y) === 1) break;
      if (cellAt(x, y) === 2) { destroySoft(x, y); addFlame(x, y, 'end', dn, p, 'dino'); cells++; break; }
      const b = bombAt(x, y);
      if (b) { addFlame(x, y, 'end', dn, p, 'dino'); explodeBomb(b); cells++; break; }
      addFlame(x, y, i === DINO_FIRE_RANGE ? 'end' : 'mid', dn, p, 'dino');
      cells++;
    }
  }""",
"""  const dirs = p.redDragon ? ['up', 'down', 'left', 'right'] : [p.facing];
  let cells = 0;
  // 扇形：正的 3 格 ＋ 前 2 格左右各溢 1 格（紅龍四方向都扇形）
  const spread = p.redDragon ? 2 : 1;
  for (let k = 0; k < dirs.length; k++) {
    const dn = dirs[k], d = DIRS[dn] || DIRS.down;
    const px = -d.y, py = d.x;                       // 垂直方向（左右溢火用）
    for (let i = 1; i <= DINO_FIRE_RANGE; i++) {
      const x = cx + d.x * i, y = cy + d.y * i;
      if (cellAt(x, y) === 1) break;
      if (cellAt(x, y) === 2) { destroySoft(x, y); addFlame(x, y, 'end', dn, p, 'dino'); cells++; }
      else {
        const b = bombAt(x, y);
        if (b) { addFlame(x, y, 'end', dn, p, 'dino'); explodeBomb(b); cells++; break; }
        addFlame(x, y, i === DINO_FIRE_RANGE ? 'end' : 'mid', dn, p, 'dino');
        cells++;
      }
      // 前 2 格往左右各溢 1 格 → 对手站斜一格也燒得到
      if (i <= spread + 1) {
        [-1, 1].forEach(function (sd) {
          const sx = x + px * sd, sy = y + py * sd;
          if (cellAt(sx, sy) === 1) return;
          if (cellAt(sx, sy) === 2) { destroySoft(sx, sy); }
          if (bombAt(sx, sy)) return;
          addFlame(sx, sy, 'end', dn, p, 'dino');
          cells++;
        });
      }
      if (cellAt(x, y) === 2) break;
    }
  }""", 1, 'dino-fan')

# 命中判定：火焰格中心 0.62 格內都算被燒到（避免「人在格子邊界」時判定漏掉）
rep("""    const cx = Math.floor(p.x / T), cy = Math.floor(p.y / T);
    for (let i = 0; i < Game.flames.length; i++) {
      if (Game.flames[i] && Game.flames[i].cx === cx && Game.flames[i].cy === cy) {""",
"""    const cx = Math.floor(p.x / T), cy = Math.floor(p.y / T);
    for (let i = 0; i < Game.flames.length; i++) {
      if (Game.flames[i] && flameCovers(Game.flames[i], p.x, p.y, T)) {""", 1, 'flame-cover')

rep("""// ----- 恐龍蛋 / 騎乘恐龍 -----""",
"""// v4.36：火焰是否燒到某個座標（坐騎吐火判定放寬到 0.62 格，避免站在格子邊界時漏判）
function flameCovers(f, px, py, T) {
  if (!f) return false;
  if (f.cx === Math.floor(px / T) && f.cy === Math.floor(py / T)) return true;
  if (f.src !== 'dino') return false;
  const dx = px - (f.cx * T + T / 2), dy = py - (f.cy * T + T / 2);
  return dx * dx + dy * dy < (T * .62) * (T * .62);
}

// ----- 恐龍蛋 / 騎乘恐龍 -----""", 1, 'flameCovers-def')

# ------------------------------------------------------------------
# 2. 對戰 AI：走路要面向移動方向（原本 p.facing 從頭到尾沒更新）
# ------------------------------------------------------------------
rep("""  if (p.aiDir) {
    const d = DIRS[p.aiDir];
    const oldX = p.x, oldY = p.y;
    p.beltMul = beltMulFor(p, d.x, d.y);
    tryMove(p, d.x, d.y, dt * lv.spd);""",
"""  if (p.aiDir) {
    const d = DIRS[p.aiDir];
    p.facing = p.aiDir;          // v4.36：AI 走路要面向移動方向（舊版 facing 永遠停在出生時的方向）
    const oldX = p.x, oldY = p.y;
    p.beltMul = beltMulFor(p, d.x, d.y);
    tryMove(p, d.x, d.y, dt * lv.spd);""", 1, 'ai-facing')

# ------------------------------------------------------------------
# 3. 手套：面前那一格不論誰的炸彈都能撿（但有 0.35 秒的「剛放下」保護）
# ------------------------------------------------------------------
rep("""  let b = bombAt(cx, cy);
  if (!b) {
    // 例外：不是自己的炸彈（隨從丟的、別的玩家放的）站不上去，
    //   所以允許撿「面前那一格」；自己的炸彈一定要踩在上面撿。
    const fd = DIRS[p.facing] || DIRS.right;
    const fb = bombAt(cx + fd.x, cy + fd.y);
    if (fb && fb.owner !== p) b = fb;
  }
  if (!b || b.held || b.moving || b.flying) return false;
  // 自己剛放下、而且還沒離開過這一格 → 不准撿（站在自己的炸彈上連按不會一直撿起來）
  if (b.owner === p && !b.ownerLeft) return false;""",
"""  let b = bombAt(cx, cy);
  if (!b) {
    // v4.36：面前那一格「不管是誰的」都可以撿（自己的炸彈也一樣）。
    //   舊版只收別人的 → 站在自己的炸彈旁邊按動作鍵只會再放一顆，手套等於廢掉。
    const fd = DIRS[p.facing] || DIRS.right;
    b = bombAt(cx + fd.x, cy + fd.y);
  }
  if (!b || b.held || b.moving || b.flying) return false;
  // 剛放下不到 0.35 秒的炸彈不准撿 → 一路連放炸彈時不會把自己剛放的那顆撿起來
  if (b.owner === p && (b.age || 0) < .35) return false;
  // 站在自己的炸彈上（還沒離開過這一格）→ 也不撿
  if (b.owner === p && b.cx === cx && b.cy === cy && !b.ownerLeft) return false;""", 1, 'glove')

# 炸彈年齡
rep("""    if (!b.ownerLeft) {
      if (!b.owner || b.owner.alive === false) b.ownerLeft = true;""",
"""    b.age = (b.age || 0) + dt;         // v4.36：剛放下的炸彈有 0.35 秒保護期（手套不會馬上撿回去）
    if (!b.ownerLeft) {
      if (!b.owner || b.owner.alive === false) b.ownerLeft = true;""", 1, 'bomb-age')

# 建彈時給 age（9 處都靠預設 0 也行，這裡只在 placeBomb 明確補上）
rep("""    mineLife: 10, moving: null, flying: null, held: false, ownerLeft: false, seed: Math.random() * 6.28, armT: 40
  };
  Game.bombs.push(b);""",
"""    mineLife: 10, moving: null, flying: null, held: false, ownerLeft: false, seed: Math.random() * 6.28, armT: 40,
    age: 0
  };
  Game.bombs.push(b);""", 1, 'placeBomb-age')

# ------------------------------------------------------------------
# 4. 豬／青蛙／小雞 再縮 5%
# ------------------------------------------------------------------
rep("""const HERO_ART_SCALE = .81;
function drawSpriteChar(g, c, x, y, R, a) {
  // 先用「部位骨架」畫（頭／手／腳各自動）；沒有部位圖才退回整張圖
  const rigH = R * 3.75 * HERO_ART_SCALE;""",
"""const HERO_ART_SCALE = .81;
// v4.36：豬／青蛙／小雞看起來比別人胖一圈 → 這三隻再縮 5%（腳底位置不動，判定半徑也不動）
const HERO_SIZE_K = { pig: .95, frog: .95, chick: .95 };
function heroSizeK(animal) { return HERO_SIZE_K[animal] || 1; }
function drawSpriteChar(g, c, x, y, R, a) {
  // 先用「部位骨架」畫（頭／手／腳各自動）；沒有部位圖才退回整張圖
  const rigH = R * 3.75 * HERO_ART_SCALE * heroSizeK(c.animal);""", 1, 'hero-k-rig')

rep("""  const H = R * 3.75 * HERO_ART_SCALE;                // 角色高（含耳朵／尾巴；v4.33 再縮 10%）""",
"""  const H = R * 3.75 * HERO_ART_SCALE * heroSizeK(c.animal);   // 角色高（含耳朵／尾巴）""", 1, 'hero-k-img')

# ------------------------------------------------------------------
# 5. 每關小怪上限 12 隻（依難度成長）
# ------------------------------------------------------------------
rep("""const AGGRO_TILES = 2;         // 小怪：幾格內才會發現玩家（直線距離）""",
"""const FOE_MAX_LIVE = 12;       // v4.36：單場關卡的小怪上限（使用者要求「不超過 12 隻」）
const AGGRO_TILES = 2;         // 小怪：幾格內才會發現玩家（直線距離）""", 1, 'foe-max')

rep("""    const SOLO_WAVE = [8, 11, 12, 15, 16, 19, 20];
    const base0 = stage <= 7 ? SOLO_WAVE[stage - 1] : Math.min(26, 17 + Math.round((stage - 7) * .55));
    const base = soloIsBoss(stage) ? Math.round(base0 * .5) : base0;
    const n = Math.max(0, Math.round(base * diff.enemy * (cols * rows) / (15 * 13)));""",
"""    // v4.36：改成「隨關卡平滑成長、上限 12 隻」——
    //   第 1 關 4 隻、第 8 關 6 隻、第 16 關 8 隻、第 24 關 10 隻、第 32 關 12 隻；
    //   魔王關只留 6 成小怪，留力氣打王。難度設定（easy/normal/hard）仍會微調。
    const base0 = Math.round(4 + stage * .25);
    const base = soloIsBoss(stage) ? Math.round(base0 * .6) : base0;
    const n = Math.max(2, Math.min(FOE_MAX_LIVE, Math.round(base * diff.enemy * (cols * rows) / (15 * 13))));""", 1, 'wave')

rep("""  Game.bombs = []; Game.flames = []; Game.items = []; Game.particles = [];
  Game.pops = []; Game.edgeFx = 0;          // v4.5：換場清掉上次殘留的受傷反饋
  Game.sdIndex = 0; Game.sdList = [];""",
"""  Game.bombs = []; Game.flames = []; Game.items = []; Game.particles = [];
  Game.bolts = [];                          // v4.36：小怪的元素彈
  Game.pops = []; Game.edgeFx = 0;          // v4.5：換場清掉上次殘留的受傷反饋
  Game.sdIndex = 0; Game.sdList = [];""", 2, 'reset-solo-bolts')

rep("""  Game.enemies = [];
  Game.bombs = []; Game.flames = []; Game.items = []; Game.particles = [];
  Game.pops = []; Game.edgeFx = 0;          // v4.5：換場清掉上次殘留的受傷反饋
  Game.eggs = [];""",
"""  Game.enemies = [];
  Game.bombs = []; Game.flames = []; Game.items = []; Game.particles = [];
  Game.bolts = [];                          // v4.36：小怪的元素彈
  Game.pops = []; Game.edgeFx = 0;          // v4.5：換場清掉上次殘留的受傷反饋
  Game.eggs = [];""", 1, 'reset-battle-bolts')

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('\nDONE  chars %d -> %d' % (len(orig), len(s)))
