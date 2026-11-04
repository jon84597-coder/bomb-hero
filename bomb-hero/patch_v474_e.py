# -*- coding: utf-8 -*-
# v4.74e：連通修正的挖路徑改成 BFS（以前只試兩種 L 型，失敗就回填岩層）
#   → 失敗率高達 ~100 個口袋，回填的岩層把硬牆從 8% 撐到 14%
import io, sys
P = 'index.html'
s = io.open(P, encoding='utf-8').read()

def rep(old, new, tag, cnt=1):
    global s
    n = s.count(old)
    if n != cnt:
        print('!! %s count=%d (want %d)' % (tag, n, cnt)); sys.exit(1)
    s = s.replace(old, new)
    print('ok', tag)

old = """  function carveTo(x0, y0, seen) {
    const canPass = function (x, y) { return Game.grid[y][x] === 0 || Game.grid[y][x] === 2; };
    const tryPath = function (pts) {
      for (let i2 = 0; i2 < pts.length; i2++) if (!canPass(pts[i2][0], pts[i2][1])) return false;
      for (let i2 = 0; i2 < pts.length; i2++) {
        const x = pts[i2][0], y = pts[i2][1];
        if (Game.grid[y][x] === 2) Game.grid[y][x] = 0;
      }
      return true;
    };
    for (let r = 1; r <= 9; r++) {
      for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const tx = x0 + dx, ty = y0 + dy;
        if (tx < 1 || ty < 1 || tx >= cols - 1 || ty >= rows - 1) continue;
        if (!seen[ty * cols + tx]) continue;
        // 兩種 L 型：先橫再縱 / 先縱再橫
        const p1 = [], p2 = [];
        const sx = Math.sign(dx), sy = Math.sign(dy);
        let cx = x0, cy = y0;
        for (let k = 0; k < Math.abs(dx) && cx !== tx; k++) { cx += sx; p1.push([cx, cy]); }
        for (let k = 0; k < Math.abs(dy) && cy !== ty; k++) { cy += sy; p1.push([cx, cy]); }
        cx = x0; cy = y0;
        for (let k = 0; k < Math.abs(dy) && cy !== ty; k++) { cy += sy; p2.push([cx, cy]); }
        for (let k = 0; k < Math.abs(dx) && cx !== tx; k++) { cx += sx; p2.push([cx, cy]); }
        if (tryPath(p1) || tryPath(p2)) return true;
      }
    }
    return false;
  }"""

new = """  //   v4.74e：以前只試「兩種 L 型」，轉角剛好被岩層擋住就失敗 → 回填岩層當牆，
  //   一張圖有 ~100 個這種口袋，硬牆因此從 8% 被撐到 14%（使用者覺得石頭太多）。
  //   改成 BFS：從口袋往外擴，只走空地／軟磚，撞到已連通區就沿最短路挖回去。
  function carveTo(x0, y0, seen) {
    const W = cols, H = rows, NN = W * H;
    const prev = new Int32Array(NN), vis = new Uint8Array(NN), q = new Int32Array(NN);
    for (let i2 = 0; i2 < NN; i2++) prev[i2] = -1;
    const s0 = y0 * W + x0;
    let head = 0, tail = 0, hit = -1;
    q[tail++] = s0; vis[s0] = 1;
    while (head < tail) {
      const id = q[head++];
      if (id !== s0 && seen[id]) { hit = id; break; }
      const cx = id % W, cy = (id / W) | 0;
      for (let k = 0; k < 4; k++) {
        const nx = cx + (k === 0 ? 1 : k === 1 ? -1 : 0);
        const ny = cy + (k === 2 ? 1 : k === 3 ? -1 : 0);
        if (nx < 1 || ny < 1 || nx >= W - 1 || ny >= H - 1) continue;
        const nid = ny * W + nx;
        if (vis[nid]) continue;
        const g2 = Game.grid[ny][nx];
        if (g2 !== 0 && g2 !== 2) continue;          // 岩層／海不可穿
        vis[nid] = 1; prev[nid] = id; q[tail++] = nid;
      }
    }
    if (hit < 0) return false;
    for (let id = hit; id >= 0; id = prev[id]) {
      const cx = id % W, cy = (id / W) | 0;
      if (Game.grid[cy][cx] === 2) Game.grid[cy][cx] = 0;
      if (id === s0) break;
    }
    return true;
  }"""
rep(old, new, 'carveTo BFS')

# 硬牆團塊：撞到目標就停，不要讓最後一團多塞十幾格
rep("""      if (Math.sqrt(dx * dx + dy * dy) > rr || Math.random() < .3) continue;
      Game.grid[py][px] = 1; hardN++;""",
    """      if (hardN >= hardTarget) break;
      if (Math.sqrt(dx * dx + dy * dy) > rr || Math.random() < .3) continue;
      Game.grid[py][px] = 1; hardN++;""",
    'hard cap')

io.open(P, 'w', encoding='utf-8', newline='\n').write(s)
print('done')
