# -*- coding: utf-8 -*-
"""patch_v474_b.py — v4.74：30 人開局／毒圈圓心／怪物散佈／AI 逃命／死亡小卡／怪物比例／「我」圖示"""
import io, sys
P = 'index.html'
s = io.open(P, encoding='utf-8').read()

def rep(old, new, tag, cnt=1):
    global s
    n = s.count(old)
    if n != cnt:
        print('FAIL[%s] count=%d want=%d' % (tag, n, cnt)); sys.exit(1)
    s = s.replace(old, new)
    print('ok[%s]' % tag)

# ── 1) 免費開放：正式測試結束前不扣門票 ──
rep("""  // 門票：每場消耗一張（開發者帳號不扣）
  let dev = false;
  try { dev = Shop.dev(); } catch (e) {}
  if (!dev) {""",
"""  // 門票：每場消耗一張（開發者帳號不扣）
  //   v4.74：正式測試結束前免費（BR.FREE）—— 只要把 FREE 改回 false 就恢復收票
  let dev = false;
  try { dev = Shop.dev(); } catch (e) {}
  if (!BR.FREE && !dev) {""", 'free')

# ── 2) 毒圈圓心改成大陸中心（大陸是壓扁的橢圓，用長短邊各自一半比較準） ──
rep("  Game.brZone = { cx: BR.ISL[2].cx, cy: BR.ISL[2].cy, r: 40, tr: 40, phase: 0, t: BR.PH[0][0] };",
    "  Game.brZone = { cx: (Game.cols - 1) / 2, cy: (Game.rows - 1) / 2, r: 30, tr: 30, phase: 0, t: BR.PH[0][0] };",
    'zone-center')

# ── 3) 小怪：散在整張大陸（不再依三島分配） ──
rep("""  // ---- 小怪：依島嶼面積平均分配，離出生點 3 格內不生 ----
  const perIsl = [5, 5, 4];
  const used = {};
  for (let i = 0; i < 3; i++) {
    const th = info.picks[i] + 1;                 // 這一座島用的主題 → 對應的關卡生態
    const pool = stageTypes(th);
    let made = 0, guard = 0;
    while (made < perIsl[i] && guard++ < 900) {
      const x = rand(Game.cols), y = rand(Game.rows);
      if (Game.brIsl[y][x] !== i) continue;
      if (Game.grid[y][x] !== 0) continue;
      const key = y * Game.cols + x;
      if (used[key]) continue;
      let bad = false;
      for (let k = 0; k < Game.players.length; k++) {
        const p = Game.players[k];
        if (Math.abs(p.x / Game.T - x) < 3.2 && Math.abs(p.y / Game.T - y) < 3.2) { bad = true; break; }
      }
      if (bad) continue;
      used[key] = 1;
      const e = makeEnemy(x, y, pick(pool), 10, 1);
      e.homeIsl = i;
      Game.enemies.push(e);
      made++;
    }
  }""",
"""  // ---- 小怪：散在整張大陸上（數量照舊 14 隻），離任何人 3 格內不生 ----
  const used = {};
  let made = 0, guard = 0;
  while (made < BR.FOES && guard++ < 3000) {
    const x = rand(Game.cols), y = rand(Game.rows);
    if (Game.brIsl[y][x] < 0 || Game.grid[y][x] !== 0) continue;
    const key = y * Game.cols + x;
    if (used[key]) continue;
    let bad = false;
    for (let k = 0; k < Game.players.length; k++) {
      const p = Game.players[k];
      if (Math.abs(p.x / Game.T - x) < 3.2 && Math.abs(p.y / Game.T - y) < 3.2) { bad = true; break; }
    }
    if (bad) continue;
    used[key] = 1;
    // 這一格屬於哪個地形區 → 用那個關卡的生態池（八區各有各的怪）
    const ti = (info.themes[Game.brIsl[y][x]] | 0) + 1;
    const e = makeEnemy(x, y, pick(stageTypes(ti)), 10, 1);
    e.homeIsl = Game.brIsl[y][x];
    Game.enemies.push(e);
    made++;
  }""", 'foes')

# ── 4) 開場卡文案 ──
rep("""  showOverlay({
    title: '🏝️ 大逃殺 · 三島',
    sub: BR.W + '×' + BR.H + ' 的超大地圖 · ' + BR.N + ' 人同場 · ' + Game.enemies.length + ' 隻小怪\\n' +
         '縮圈從腳下最大的島開始收；撐到最後一個人就是冠軍。',
    btn: '出發（存活 ' + Game.brAlive + ' 人）',""",
"""  showOverlay({
    title: '🏝️ 大逃殺 · 隨機大陸',
    sub: BR.W + '×' + BR.H + ' 的隨機地圖（八種地形各佔一區） · ' + BR.N + ' 人同場 · ' +
         Game.enemies.length + ' 隻小怪\\n' +
         '毒圈 10 分鐘收 10 次；躲進草叢／破屋 AI 看不到你。撐到最後一個人就是冠軍。' +
         (BR.FREE ? '\\n🎟️ 正式測試期間免費入場' : ''),
    btn: '出發（存活 ' + Game.brAlive + ' 人）',""", 'overlay')

# ── 5) 大圖怪物比例：enemyArtR 乘上 Game.artK（判定 foeTouchR 跟著一起縮） ──
rep("""  return Math.max(T * (ENEMY_ART_BASE + (base - 12) * ENEMY_ART_SLOPE), base * 2.1) / ((M && M.hs) || 1.9);""",
"""  // v4.74：Game.artK —— 大逃殺（T≈30 的大圖）怪物畫出來偏大，整批縮一級（判定 foeTouchR 跟著縮）
  return Math.max(T * (ENEMY_ART_BASE + (base - 12) * ENEMY_ART_SLOPE), base * 2.1) /
    ((M && M.hs) || 1.9) * (Game.artK || 1);""", 'artK')

rep("""  Game.bigMap = false;
  Game.T = tileSize();
  recalcSpdK();
  const sz0 = { w: VIEW_W, h: VIEW_H };""",
"""  Game.bigMap = false;
  Game.artK = 1;               // v4.74：一般地圖怪物維持原比例（大圖才會縮）
  Game.T = tileSize();
  recalcSpdK();
  const sz0 = { w: VIEW_W, h: VIEW_H };""", 'artK-reset')

# ── 6) 躲人用的物件數量：placeHideTiles 加一個上限參數（舊呼叫不變） ──
rep("function placeHideTiles(cols, rows, rnd, spawns) {",
    "function placeHideTiles(cols, rows, rnd, spawns, maxN) {", 'hide-sig')
rep("  const want = Math.max(3, Math.min(9, Math.round(cols * rows / 26)));",
    "  const want = Math.max(3, Math.min(maxN || 9, Math.round(cols * rows / 26)));", 'hide-n')

# ── 7) 自己頭上「我」的牌子：大逃殺也顯示 ──
rep("  if (Game.mode === 'battle' && p.alive && isMyPlayer(p)) drawMeBadge(x, y - jumpY, R, T);",
    "  if ((Game.mode === 'battle' || Game.mode === 'br') && p.alive && isMyPlayer(p)) drawMeBadge(x, y - jumpY, R, T);",
    'me-badge')

io.open(P, 'w', encoding='utf-8', newline='\n').write(s)
print('done', len(s))
