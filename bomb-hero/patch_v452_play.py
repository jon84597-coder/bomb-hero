# -*- coding: utf-8 -*-
# v4.52 patch B：玩法修正
#   6. 拳擊打彈真的能越牆飛到對面（原本第一格空地就停）
#   7. 推車丟到軟磚也要繼續往下一格彈（原本只彈石牆）
#   8. 火焰／隨從都會破壞骷髏頭（其他道具炸到不破壞）
#   9. 推車炸彈落到輸送帶上馬上被帶走（原本要等 1 秒多才動一格）
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

# ---------- 6. 拳擊：專用落點演算法 ----------
NEW_FN = '''// v4.52：拳擊專用落點 —— 直線飛出去，牆（石牆／軟磚）與炸彈一律跳過，
//   停在那個方向上「最遠的空地」；撞到敵人就停在牠前面一格；撞到外框就停。
//   舊版直接借 findLanding，遇到第一格空地就停 → 只飛 1 格，看起來像沒越牆。
function punchLanding(bx, by, dx, dy) {
  const cols = Game.cols, rows = Game.rows;
  const path = [{ x: bx, y: by }];
  let best = null, x = bx, y = by;
  for (let k = 1; k <= cols + rows; k++) {
    const nx = x + dx, ny = y + dy;
    if (nx < 1 || nx > cols - 2 || ny < 1 || ny > rows - 2) break;     // 撞到最外框
    const solid = cellAt(nx, ny) !== 0;
    path.push({ x: nx, y: ny, w: solid ? 1 : 0 });
    if (enemyAtCell(nx, ny)) break;                                    // 有敵人 → 停在前面
    if (!solid && !bombAt(nx, ny)) best = { x: nx, y: ny, dist: k, path: path.slice() };
    x = nx; y = ny;
  }
  return best;
}
function punchBomb(p, dirName) {'''
rep('function punchBomb(p, dirName) {', NEW_FN, 'punchLanding fn')

rep('''  // SBR 拳擊：飛越所有障礙直達地圖另一端（邊界迴繞），落在第一格空地
  //   v4.13：帶 path → 逐格跳；碰到敵人停在敵人前一格
  const land = findLanding(bx, by, d.x, d.y, false, true);
  if (!land) return false;
  const path = land.path || [{ x: bx, y: by }, { x: land.x, y: land.y }];''',
    '''  // v4.52：飛越所有牆壁，落在這個方向最遠的空地（v4.13 之前只飛一格）
  const land = punchLanding(bx, by, d.x, d.y);
  if (!land) return false;
  const path = land.path;''', 'punchBomb body')

# ---------- 7. 推車：軟磚也彈 ----------
rep('''  let bounce = 0;
  while (cells[pick].kind === 1 && bounce < CART_BOUNCE_MAX) {''',
    '''  let bounce = 0;
  // v4.52：軟磚也當「彈跳點」—— 丟到軟磚上會繼續往下一格彈（原本只彈石牆，丟到軟磚就卡住）
  while (cells[pick].kind !== 0 && bounce < CART_BOUNCE_MAX) {''', 'cart soft bounce')

# ---------- 8a. 火焰燒掉骷髏頭 ----------
rep('''  if (hzF && hzF.type === 'hide') {
    Game.hazards[cy][cx] = null;
    const TF = Game.T || 1;
    burst(cx * TF + TF / 2, cy * TF + TF / 2, '#8fd06a', 6, 90);
  }''',
    '''  if (hzF && hzF.type === 'hide') {
    Game.hazards[cy][cx] = null;
    const TF = Game.T || 1;
    burst(cx * TF + TF / 2, cy * TF + TF / 2, '#8fd06a', 6, 90);
  }
  // v4.52：火焰會把「💀 骷髏頭」燒掉（其他道具炸到暫時不破壞）
  for (let ii = (Game.items || []).length - 1; ii >= 0; ii--) {
    const it = Game.items[ii];
    if (!it || it.type !== 'skull' || it.cx !== cx || it.cy !== cy) continue;
    Game.items.splice(ii, 1);
    const TS = Game.T || 1;
    burst(cx * TS + TS / 2, cy * TS + TS / 2, '#c9b8ff', 8, 130);
    break;
  }''', 'flame burns skull')

# ---------- 8b. 隨從踩碎骷髏頭 ----------
rep('''function petFollowWork(pt, hero, dt) {
  const T = Game.T || 40;
  let best = null, bd = Infinity;''',
    '''function petFollowWork(pt, hero, dt) {
  const T = Game.T || 40;
  // v4.52：隨從經過骷髏頭就把它踩碎 —— 主人不會再被那個詛咒拐到
  for (let si = (Game.items || []).length - 1; si >= 0; si--) {
    const sk = Game.items[si];
    if (!sk || sk.type !== 'skull') continue;
    const sx2 = sk.cx * T + T / 2, sy2 = sk.cy * T + T / 2;
    if (Math.abs(pt.x - sx2) < T * .5 && Math.abs(pt.y - sy2) < T * .5) {
      Game.items.splice(si, 1);
      burst(sx2, sy2, '#c9b8ff', 10, 150);
      toast('🐾 ' + petKind(pt.kind).name + ' 把 💀 骷髏頭踩碎了', 1.9);
      break;
    }
  }
  let best = null, bd = Infinity;''', 'pet crushes skull')

# ---------- 9. 輸送帶：落地馬上有推力 ----------
rep('''    // 輸送帶：放在帶子上的炸彈跟著被帶走（玩家的、BOSS 的都一樣）''',
    '''    // 輸送帶：放在帶子上的炸彈跟著被帶走（玩家的、BOSS 的都一樣）
    //   v4.52：剛從空中落下來的（推車／投擲／拳擊）也一樣 —— 落下那一刻 beltGrab 已經先灌了
    //   0.92 格的推力，所以一落地就會被帶走一格，不用先等 1 秒多把推力存滿。''', 'belt comment')

rep('''function updateWorld(dt) {''',
    '''// v4.52：炸彈落地時若踩在輸送帶上 → 先把推力灌到 0.92 格，下一格馬上被帶走
function beltGrab(b, T) {
  const hz = Game.hazards && Game.hazards[b.cy] ? Game.hazards[b.cy][b.cx] : null;
  b.beltAcc = (hz && hz.type === 'convey') ? T * .92 : 0;
}
function updateWorld(dt) {''', 'beltGrab fn')

rep('''        if (f.t >= f.dur) {
          b.flying = null;
          b.px = (c.x + .5) * T; b.py = (c.y + .5) * T;
          b.cx = c.x; b.cy = c.y;
          b.passers = [];
        }''',
    '''        if (f.t >= f.dur) {
          b.flying = null;
          b.px = (c.x + .5) * T; b.py = (c.y + .5) * T;
          b.cx = c.x; b.cy = c.y;
          b.passers = [];
          beltGrab(b, T);
        }''', 'belt on landing')

rep('''        if (k >= 1) {
          b.flying = null;
          b.px = f.tx * T + T / 2; b.py = f.ty * T + T / 2;
          b.cx = f.tx; b.cy = f.ty;
          b.passers = [];
        }''',
    '''        if (k >= 1) {
          b.flying = null;
          b.px = f.tx * T + T / 2; b.py = f.ty * T + T / 2;
          b.cx = f.tx; b.cy = f.ty;
          b.passers = [];
          beltGrab(b, T);
        }''', 'belt on landing (legacy)')

# ---------- 匯出 punchLanding（測試用）----------
rep('explodeBomb: explodeBomb, kickBomb: kickBomb, punchBomb: punchBomb,',
    'explodeBomb: explodeBomb, kickBomb: kickBomb, punchBomb: punchBomb, punchLanding: punchLanding, beltGrab: beltGrab,',
    'export')

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('chars %d -> %d (%+d)' % (before, len(s), len(s) - before))
