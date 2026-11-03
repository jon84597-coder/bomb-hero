# -*- coding: utf-8 -*-
# v4.51 ⑤：bigGrid 收斂 —— 房間數保證 >=2、可走格數回到 target ±5%
import io, sys

P = 'index.html'
s = io.open(P, encoding='utf-8', newline='').read()
orig = len(s)


def rep(old, new, optional=False, tag=''):
    global s
    if old not in s:
        if optional:
            print('  · skip ' + (tag or old[:36]))
            return
        sys.exit('MISS: ' + (tag or '') + ' -> ' + old[:120].replace('\n', '\\n'))
    s = s.replace(old, new, 1)
    print('  ✓ ' + (tag or old[:36].replace('\n', ' ')))


# ---- 1) 房間數保證：前 90 次嚴格，之後放寬；半徑縮小一點（小圖才塞得下 2 間）
rep('''  const want = 2 + (rnd() < .5 ? 1 : 0);          // 2~3 間
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
    const rad = 2.5 + rnd() * .8;''',
'''  const want = 2 + (rnd() < .5 ? 1 : 0);          // 2~3 間
  let rt = 0;
  // 前 90 次要求「離出生點遠、房與房之間留空」；之後放寬，保證至少生出 2 間
  //   （18×16 的小圖放 3 間本來就擠；寧可只放 2 間，也不能 0 間）
  while (rooms.length < want && rt++ < 200) {
    const loose = rt > 90;
    const cx = ri(4, Math.max(4, cols - 5)), cy = ri(4, Math.max(4, rows - 5));
    if (Math.abs(cx - sx) + Math.abs(cy - sy) < (loose ? 6 : 9)) continue;   // 不要貼著出生點
    let clash = false;
    for (let i = 0; i < rooms.length; i++) {
      const rm = rooms[i];
      if (Math.abs(rm.x - cx) + Math.abs(rm.y - cy) < Math.round(rm.r * 2) + (loose ? 1 : 3)) clash = true;
    }
    if (clash) continue;
    const rad = 2.2 + rnd() * .75;''', tag='房間數保證 + 半徑')

# ---- 2) 收尾校正 trimTo()
rep('''  // 畫環吃掉了不少空地 → 再長回來，讓可走格回到 target
  open.length = 0;
  for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) if (g[y][x] === 0) open.push([x, y]);
  grow(target);
  return { g: g, spawn: { x: sx, y: sy }, rooms: rooms };''',
'''  // 畫環吃掉了不少空地 → 再長回來，讓可走格回到 target
  open.length = 0;
  for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) if (g[y][x] === 0) open.push([x, y]);
  grow(target);

  // ---- 收尾校正 ----
  // 房內清空會把可走格拱上去（實測 2 間房多 30 格）。這裡從「貼著牆的邊緣疙瘩」填回硬牆，
  // 每填一格都跑一次 BFS：只要連通數掉下來就立刻還原 —— 絕不製造「走不到的角落」。
  const trimTo = function (limit) {
    let guard3 = 0;
    while (guard3++ < 600) {
      let total = 0;
      for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) if (g[y][x] !== 1) total++;
      if (total <= limit) break;
      let cand = null, cb = 99;
      for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) {
        if (g[y][x] !== 0) continue;
        if (x === sx && y === sy) continue;                  // 出生點不能填
        let inRoom = false;
        for (let i = 0; i < rooms.length; i++) {
          const rm = rooms[i], ddx = x - rm.x, ddy = y - rm.y;
          if (ddx * ddx + ddy * ddy < rm.r * rm.r) inRoom = true;
        }
        if (inRoom) continue;                                // 房間裡的地板不動
        let e = 0;
        if (g[y - 1][x] === 1) e++;
        if (g[y + 1][x] === 1) e++;
        if (g[y][x - 1] === 1) e++;
        if (g[y][x + 1] === 1) e++;
        if (e < 2) continue;                                 // 只收「兩面以上是牆」的疙瘩
        if (e > cb) continue;
        if (e === cb && rnd() > .30) continue;               // 同分隨機挑，不要一路削同一塊
        cb = e; cand = [x, y];
      }
      if (!cand) break;
      g[cand[1]][cand[0]] = 1;
      let cnt = 0;
      for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) if (g[y][x] !== 1) cnt++;
      const rc = bfsReach(g, cols, rows, sx, sy);
      if (rc.count < cnt) { g[cand[1]][cand[0]] = 0; guard3 += 5; }
    }
  };
  trimTo(Math.round(target * 1.05));
  return { g: g, spawn: { x: sx, y: sy }, rooms: rooms };''', tag='trimTo 收尾校正')

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('\n字元 %d → %d（%+d）' % (orig, len(s), len(s) - orig))
