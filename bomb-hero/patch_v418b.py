# -*- coding: utf-8 -*-
"""v4.18 patch B：對戰 AI 丟炸彈改成「跟玩家一樣隔牆丟（需手套、不直接命中）」
"""
import io, sys

PATH = 'index.html'

def load():
    return io.open(PATH, 'rb').read().decode('utf-8').replace('\r\n', '\n')

def save(s):
    io.open(PATH, 'wb').write(s.replace('\n', '\r\n').encode('utf-8'))

s = load()
rules = []

def rule(name, old, new):
    rules.append((name, old, new))

# ① throwCarried 支援指定落點
rule('throwCarried 支援 opts.land',
     """function throwCarried(p) {
  const b = p.carry;
  if (!b) return;
  const d = DIRS[p.facing];
  const T = Game.T;
  const cx = Math.floor(p.x / T), cy = Math.floor(p.y / T);
  p.carry = null;
  b.held = false;
  // SBR 投擲：越過牆壁逐格跳躍，出地圖邊界從對側繞進來，落在第一格空地
  //   v4.13：① 逐格跳（帶 path）② 可以停在「有玩家」的格子 → 投到對方身體裡
  //          ③ 不會停在牆壁上（牆只會被跳過去）
  const land = findLanding(cx, cy, d.x, d.y, true, false, p);""",
     """function throwCarried(p, opts) {
  const b = p.carry;
  if (!b) return;
  const d = DIRS[p.facing];
  const T = Game.T;
  const cx = Math.floor(p.x / T), cy = Math.floor(p.y / T);
  p.carry = null;
  b.held = false;
  // SBR 投擲：越過牆壁逐格跳躍，出地圖邊界從對側繞進來，落在第一格空地
  //   v4.13：① 逐格跳（帶 path）② 可以停在「有玩家」的格子 → 投到對方身體裡
  //          ③ 不會停在牆壁上（牆只會被跳過去）
  //   v4.18：opts.land 可以直接指定落點（AI 用）→ 保證落點不含任何玩家
  const land = (opts && opts.land) ? opts.land : findLanding(cx, cy, d.x, d.y, true, false, p);""")

# ② aiLobBomb 整段換掉
OLD_LOB = """function aiLobBomb(p, foe) {
  if (!p || !p.alive || !foe || !foe.alive) return false;
  const T = Game.T;
  const cx = Math.floor(p.x / T), cy = Math.floor(p.y / T);
  let tx = Math.floor(foe.x / T), ty = Math.floor(foe.y / T);
  function ok(x, y) {
    return x > 0 && y > 0 && x < Game.cols - 1 && y < Game.rows - 1 &&
      cellAt(x, y) === 0 && !bombAt(x, y);
  }
  if (!ok(tx, ty)) {
    const cand = [[tx + 1, ty], [tx - 1, ty], [tx, ty + 1], [tx, ty - 1]].filter(function (c) {
      return ok(c[0], c[1]);
    });
    if (!cand.length) return false;
    tx = cand[0][0]; ty = cand[0][1];
  }
  if (tx === cx && ty === cy) return false;
  const dist = Math.abs(tx - cx) + Math.abs(ty - cy);
  Game.bombs.push({
    cx: tx, cy: ty, px: (cx + .5) * T, py: (cy + .5) * T,
    timer: 2.2, power: 1, owner: p, passers: [],
    remoteArmed: false, mine: false, moving: null, held: false, seed: Math.random() * 6.28,
    lobbed: true,
    flying: { fx: cx, fy: cy, tx: tx, ty: ty, t: 0, dur: Math.min(.9, .14 + dist * .055),
              path: [{ x: cx, y: cy }, { x: tx, y: ty }] }
  });
  AudioSys.sfx('throw');
  p.lobCd = Math.max(p.lobCd || 0, 3.4);     // 丟完自己進冷卻（難度會在 controlAI 再覆寫）
  return true;
}"""

NEW_LOB = """// ================================================================
//   v4.18：對戰 AI「隔牆丟炸彈」—— 完全照玩家的規則走
//     ★ 前提：AI 必須先撿到「搬彈手套」(p.glove)，沒手套一律不能丟
//     ★ 動作：把腳下／身旁自己的炸彈舉起來（p.carry），再往面朝方向丟出去（越牆）
//     ★ 落點：那個方向的第一格空地（findLanding 的標準行為），不鎖定任何人；
//             只要落點上有任何玩家 → 這個方向就不丟（絕不直接命中）
//     （v4.17 的「直接飛到對手格子」已移除 —— 那不是玩家做得到的事）
// ================================================================
function aiThrowLanding(p, dirName) {
  const T = Game.T;
  const cx = Math.floor(p.x / T), cy = Math.floor(p.y / T);
  const d = DIRS[dirName];
  if (!d) return null;
  const land = findLanding(cx, cy, d.x, d.y, false, false, p);
  if (!land) return null;
  // 不丟到最外圈牆上、不丟在原地、不砸到任何人、至少要隔一格
  if (land.x <= 0 || land.y <= 0 || land.x >= Game.cols - 1 || land.y >= Game.rows - 1) return null;
  if (land.x === cx && land.y === cy) return null;
  if (playerAtCell(land.x, land.y)) return null;
  if (Math.abs(land.x - cx) + Math.abs(land.y - cy) < 2) return null;
  return land;
}
function aiGrabOwnBomb(p) {
  if (!p || !p.alive || !p.glove || p.carry) return false;
  const T = Game.T;
  const cx = Math.floor(p.x / T), cy = Math.floor(p.y / T);
  const cells = [[cx, cy], [cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]];
  for (let i = 0; i < cells.length; i++) {
    const b = bombAt(cells[i][0], cells[i][1]);
    if (b && b.owner === p && !b.held && !b.moving && !b.flying) {
      p.carry = b; b.held = true;
      if (!(b.timer > 0)) b.timer = 1.4;
      AudioSys.sfx('pick');
      return true;
    }
  }
  return false;
}
function aiDropCarry(p) {
  const b = p.carry;
  if (!b) return false;
  const T = Game.T;
  p.carry = null; b.held = false;
  b.cx = Math.floor(p.x / T); b.cy = Math.floor(p.y / T);
  b.px = (b.cx + .5) * T; b.py = (b.cy + .5) * T;
  return true;
}
function aiLobBomb(p, lv) {
  if (!p || !p.alive) return false;
  const cfg = (lv && lv.lob != null) ? lv : aiLevelCfg();
  if (!p.glove) return false;                        // ★ 前提：要先撿到搬彈手套
  if ((p.lobCd || 0) > 0) return false;
  if (!p.carry && !aiGrabOwnBomb(p)) return false;
  const T = Game.T;
  const cx = Math.floor(p.x / T), cy = Math.floor(p.y / T);
  // 跟玩家一樣：站在格子中心才丟得出去
  if (Math.abs(p.x - (cx * T + T / 2)) > 4 || Math.abs(p.y - (cy * T + T / 2)) > 4) return false;
  const order = [p.aiDir, p.facing, 'up', 'down', 'left', 'right'];
  const seen = {};
  for (let i = 0; i < order.length; i++) {
    const dir = order[i];
    if (!dir || seen[dir] || !DIRS[dir]) continue;
    seen[dir] = 1;
    const land = aiThrowLanding(p, dir);
    if (!land) continue;
    p.facing = dir;
    throwCarried(p, { land: land });                 // 落點先算好 → 保證不砸人
    p.lobCd = (cfg.lobCd || 3.4) + Math.random() * 1.2;
    return true;
  }
  aiDropCarry(p);                                    // 四面都不能丟 → 放下，打正常炸彈戰
  return false;
}"""
rule('aiLobBomb 改成手套隔牆丟', OLD_LOB, NEW_LOB)

# ③ 目標選擇：沒手套時特別想去撿手套（bestScore 與實際距離分開）
rule('AI 優先撿手套',
     """      let tgt = null, bestD = Infinity;
      Game.players.forEach(function (q) {
        if (q !== p && q.alive && !playerHiding(q)) {   // v4.16：躲在樹叢裡的對手 AI 看不到
          const dd = dist2(q.x, q.y, p.x, p.y);
          if (dd < bestD) { bestD = dd; tgt = { x: q.x, y: q.y, foe: true, p: q }; }
        }
      });
      Game.items.forEach(function (it) {
        const dd = dist2(it.cx * T + T / 2, it.cy * T + T / 2, p.x, p.y);
        if (dd < bestD) { bestD = dd; tgt = { x: it.cx * T + T / 2, y: it.cy * T + T / 2 }; }
      });""",
     """      let tgt = null, bestD = Infinity, bestScore = Infinity;
      Game.players.forEach(function (q) {
        if (q !== p && q.alive && !playerHiding(q)) {   // v4.16：躲在樹叢裡的對手 AI 看不到
          const dd = dist2(q.x, q.y, p.x, p.y);
          if (dd < bestScore) { bestScore = dd; bestD = dd; tgt = { x: q.x, y: q.y, foe: true, p: q }; }
        }
      });
      Game.items.forEach(function (it) {
        const dd = dist2(it.cx * T + T / 2, it.cy * T + T / 2, p.x, p.y);
        // v4.18：還沒拿到搬彈手套 → 特別想去撿（隔牆丟炸彈的前提）
        const score = (it.type === 'glove' && !p.glove) ? dd * .45 : dd;
        if (score < bestScore) {
          bestScore = score; bestD = dd;
          tgt = { x: it.cx * T + T / 2, y: it.cy * T + T / 2 };
        }
      });""")

# ④ controlAI 的丟彈觸發：移出「!p.carry」條件、加手套前提
rule('AI 丟彈觸發條件',
     """        if ((nearFoe || (nearSoft && Math.random() < lv.soft)) && Math.random() < lv.bomb) placeBomb(p);
        // v4.17：對戰 AI 也會「丟」炸彈 —— 對手在 2~6 格內就隔牆拋一顆過去
        if (tgt && tgt.foe && tgt.p && (p.lobCd || 0) <= 0 && mineCount < p.maxBombs && !p.carry &&
            bestD > (T * 1.8) * (T * 1.8) && bestD < (T * 6) * (T * 6) &&
            Math.random() < (lv.lob == null ? .5 : lv.lob)) {
          if (aiLobBomb(p, tgt.p)) p.lobCd = (lv.lobCd || 3.4) + Math.random() * 1.2;
        }
      }""",
     """        if ((nearFoe || (nearSoft && Math.random() < lv.soft)) && Math.random() < lv.bomb) placeBomb(p);
      }
      // v4.18：對戰 AI 隔牆丟炸彈 —— 走「玩家那條路」：
      //   先撿到搬彈手套（p.glove）→ 把腳下的炸彈舉起來 → 往面朝方向丟出去（越牆）
      //   落點只會是那個方向的第一格空地，而且一定不會落在任何人身上
      if (tgt && tgt.foe && p.glove && (p.lobCd || 0) <= 0 &&
          bestD > (T * 1.8) * (T * 1.8) && bestD < (T * 7) * (T * 7) &&
          Math.random() < (lv.lob == null ? .5 : lv.lob)) {
        aiLobBomb(p, lv);
      }""")

# ⑤ 匯出
rule('匯出 AI 丟彈輔助',
     "  controlAI: controlAI, aiLobBomb: aiLobBomb, dangerAt: dangerAt,",
     "  controlAI: controlAI, aiLobBomb: aiLobBomb, aiThrowLanding: aiThrowLanding,\n  aiGrabOwnBomb: aiGrabOwnBomb, aiDropCarry: aiDropCarry, dangerAt: dangerAt,")

ok = True
for name, old, new in rules:
    n = s.count(old)
    if n != 1:
        print('❌ %s → hits %d（必須 1）' % (name, n))
        ok = False
        continue
    s = s.replace(old, new)
    print('✓ %s' % name)

if not ok:
    print('中止：有規則沒命中')
    sys.exit(1)

save(s)
print('寫回 %s 完成' % PATH)
