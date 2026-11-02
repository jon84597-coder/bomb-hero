# -*- coding: utf-8 -*-
"""v4.43 ①：推車丟到牆上 → 往同方向「彈跳」一格，落地就停。"""
import io

HTML = 'index.html'
s = io.open(HTML, encoding='utf-8', newline='').read()
s = s.replace('\r\n', '\n')
n0 = len(s)

OLD = """  if (!cells.length) return null;
  let pick = -1;
  // 集氣越滿丟越遠：先取 reach 那一格；那一格已經有炸彈才往回退一格
  for (let i = cells.length - 1; i >= 0; i--) {
    if (!cells[i].bomb) { pick = i; break; }
  }
  if (pick < 0) return null;
  const onWall = cells[pick].kind === 1;    // 落在石牆上 → 炸彈坐在牆頂
  const onSoft = cells[pick].kind === 2;    // 落在軟磚上 → 引爆時順便把磚砸碎
  const path = [{ x: cx, y: cy }];
  for (let j = 0; j <= pick; j++) path.push({ x: cells[j].x, y: cells[j].y, w: cells[j].kind === 1 ? 1 : 0 });
  return { x: cells[pick].x, y: cells[pick].y, path: path, dir: dir.dn, dist: pick + 1,
           onSoft: onSoft, onWall: onWall };
}"""

NEW = """  if (!cells.length) return null;
  let pick = -1;
  // 集氣越滿丟越遠：先取 reach 那一格；那一格已經有炸彈才往回退一格
  for (let i = cells.length - 1; i >= 0; i--) {
    if (!cells[i].bomb) { pick = i; break; }
  }
  if (pick < 0) return null;
  // v4.43：落在石牆上 → 往同方向「彈跳」過去，一落地（空地／軟磚）就停。
  //   連續好幾格石牆就一直彈（最多 CART_BOUNCE_MAX 格），撞到地圖外框才留在牆頂。
  let bounce = 0;
  while (cells[pick].kind === 1 && bounce < CART_BOUNCE_MAX) {
    const bx = cells[pick].x + dir.d.x, by = cells[pick].y + dir.d.y;
    if (bx < 1 || bx > cols - 2 || by < 1 || by > rows - 2) break;   // 已經貼外框 → 停在牆上
    if (bombAt(bx, by)) break;                                      // 下一格有炸彈 → 停在牆上
    const bk = cellAt(bx, by);
    cells.push({ x: bx, y: by, kind: bk, bomb: false });
    pick = cells.length - 1;
    bounce++;
  }
  const onWall = cells[pick].kind === 1;    // 還是牆（彈不出去）→ 炸彈坐在牆頂
  const onSoft = cells[pick].kind === 2;    // 落在軟磚上 → 引爆時順便把磚砸碎
  const path = [{ x: cx, y: cy }];
  for (let j = 0; j <= pick; j++) path.push({ x: cells[j].x, y: cells[j].y, w: cells[j].kind === 1 ? 1 : 0 });
  return { x: cells[pick].x, y: cells[pick].y, path: path, dir: dir.dn, dist: pick + 1,
           onSoft: onSoft, onWall: onWall, bounce: bounce };
}"""

assert s.count(OLD) == 1
s = s.replace(OLD, NEW)

# 常數
OLD2 = "const CART_LV = ["
NEW2 = """// v4.43：丟到牆上之後往同方向最多再彈幾格（落地就停）
const CART_BOUNCE_MAX = 3;
const CART_LV = ["""
assert s.count(OLD2) == 1
s = s.replace(OLD2, NEW2)

# 匯出
OLD3 = "  cartPickLanding: cartPickLanding,"
if s.count(OLD3) == 1:
    s = s.replace(OLD3, "  cartPickLanding: cartPickLanding, CART_BOUNCE_MAX: CART_BOUNCE_MAX,")
else:
    print('warn: cartPickLanding export not found')

# 飛行時間：彈跳多走幾格 → 動畫稍微久一點
OLD4 = "      dur: Math.min(1.15, .14 + land.dist * .095),"
NEW4 = "      dur: Math.min(1.35, .14 + land.dist * .095),"
assert s.count(OLD4) == 1
s = s.replace(OLD4, NEW4)

io.open(HTML, 'w', encoding='utf-8', newline='').write(s)
print('OK  %d -> %d  (%+.1f KB)' % (n0, len(s), (len(s) - n0) / 1024.0))
