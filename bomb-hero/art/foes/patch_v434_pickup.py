# -*- coding: utf-8 -*-
"""v4.34：撿彈／放彈的分派改成「不會互相搶」，一路連放炸彈不會變成一路撿炸彈。"""
import io, os

PAGE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__)))), 'index.html')
s = io.open(PAGE, encoding='utf-8', newline='').read().replace('\r\n', '\n')

# ---------- 1. tryGlovePickup：只認腳下那一格 ----------
old = """function tryGlovePickup(p) {
  if (!p || !p.alive || !p.glove || p.carry) return false;
  const T = Game.T;
  const cx = Math.floor(p.x / T), cy = Math.floor(p.y / T);
  // 腳下、面前、左右上下都找一遍 → 站在炸彈旁邊按動作鍵就撿得到
  let b = bombAt(cx, cy);
  if (!b) {
    const fd = DIRS[p.facing] || DIRS.right;
    b = bombAt(cx + fd.x, cy + fd.y);
  }
  if (!b) {
    const dirs4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let i = 0; i < dirs4.length; i++) {
      const cand = bombAt(cx + dirs4[i][0], cy + dirs4[i][1]);
      if (cand) { b = cand; break; }
    }
  }
  if (!b || b.held || b.moving || b.flying) return false;
  p.carry = b; b.held = true;"""

new = """function tryGlovePickup(p) {
  if (!p || !p.alive || !p.glove || p.carry) return false;
  const T = Game.T;
  const cx = Math.floor(p.x / T), cy = Math.floor(p.y / T);
  // v4.34：撿彈只認「腳下這一格」。
  //   舊版還會往面前與四個方向亂找 → 一路連放炸彈時，剛放的那顆（就在腳下）或
  //   斜後方那顆會被當成「想撿的」，動作鍵就變成一路撿、連放不出來。
  let b = bombAt(cx, cy);
  if (!b) {
    // 例外：不是自己的炸彈（隨從丟的、別的玩家放的）站不上去，
    //   所以允許撿「面前那一格」；自己的炸彈一定要踩在上面撿。
    const fd = DIRS[p.facing] || DIRS.right;
    const fb = bombAt(cx + fd.x, cy + fd.y);
    if (fb && fb.owner !== p) b = fb;
  }
  if (!b || b.held || b.moving || b.flying) return false;
  // 自己剛放下、而且還沒離開過這一格 → 不准撿（站在自己的炸彈上連按不會一直撿起來）
  if (b.owner === p && !b.ownerLeft) return false;
  p.carry = b; b.held = true;"""
assert s.count(old) == 1, 'tryGlovePickup 找不到'
s = s.replace(old, new, 1)

# ---------- 2. placeBomb 回傳布林值，不再自己去撿 ----------
old = """function placeBomb(p) {
  if (!p.alive) return;
  const T = Game.T;
  const cx = Math.floor(p.x / T), cy = Math.floor(p.y / T);
  if (tryGlovePickup(p)) return;          // 手套：先撿彈，撿不到才放彈
  // 遙控彈：現在「放」就只是放（可以連續放好幾發），要按 E 鍵／🧨 才會引爆
  const mine = false;                        // 地雷功能已取消
  if (bombAt(cx, cy)) return;
  const mineCount = Game.bombs.filter(function (b) { return b.owner === p; }).length;
  if (mineCount >= p.maxBombs) return;"""
new = """function placeBomb(p) {
  if (!p.alive) return false;
  const T = Game.T;
  const cx = Math.floor(p.x / T), cy = Math.floor(p.y / T);
  // v4.34：這裡不再順手撿彈（改由動作鍵分派決定先放還是先撿）
  // 遙控彈：現在「放」就只是放（可以連續放好幾發），要按 E 鍵／🧨 才會引爆
  const mine = false;                        // 地雷功能已取消
  if (bombAt(cx, cy)) return false;
  const mineCount = Game.bombs.filter(function (b) { return b.owner === p; }).length;
  if (mineCount >= p.maxBombs) return false;"""
assert s.count(old) == 1, 'placeBomb 開頭找不到'
s = s.replace(old, new, 1)

old = """  Game.bombs.push(b);
  AudioSys.sfx('place');
}"""
new = """  Game.bombs.push(b);
  AudioSys.sfx('place');
  return true;
}"""
assert s.count(old) == 1, 'placeBomb 結尾找不到'
s = s.replace(old, new, 1)

# ---------- 3. 動作鍵：腳下有可撿的才撿，否則放 ----------
old = """    if (p.carry) throwCarried(p);
    else if (tryGlovePickup(p)) { /* 已撿起 */ }
    else if (p.line) lineBomb(p);
    else placeBomb(p);"""
new = """    // v4.34：腳下有「可以撿」的炸彈才撿；否則照舊放彈（排線彈仍然優先於普通放彈）。
    //   這樣一路走一路按就是一路放，不會被剛放下的那顆搶走。
    if (p.carry) throwCarried(p);
    else if (tryGlovePickup(p)) { /* 已撿起 */ }
    else if (p.line) lineBomb(p);
    else placeBomb(p);"""
assert s.count(old) == 1, '動作鍵分派找不到'
s = s.replace(old, new, 1)

# ---------- 4. 炸彈多一個 ownerLeft 旗標 ----------
n = s.count('held: false,')
s = s.replace('held: false,', 'held: false, ownerLeft: false,')
print('ownerLeft 初始化:', n)

# ---------- 5. 更新迴圈：主人離開那一格 → ownerLeft = true ----------
old = """    if (Game.bombs.indexOf(b) < 0) continue;   // 已被連鎖引爆移除
    if (b.held) {"""
new = """    if (Game.bombs.indexOf(b) < 0) continue;   // 已被連鎖引爆移除
    // v4.34：主人離開過這一格之後，這顆才准被主人自己撿回來
    if (!b.ownerLeft) {
      if (!b.owner || b.owner.alive === false) b.ownerLeft = true;
      else if (Math.floor(b.owner.x / T) !== b.cx || Math.floor(b.owner.y / T) !== b.cy) b.ownerLeft = true;
    }
    if (b.held) {"""
assert s.count(old) == 1, '炸彈更新迴圈找不到'
s = s.replace(old, new, 1)

io.open(PAGE, 'w', encoding='utf-8', newline='').write(s.replace('\n', '\r\n'))
print('ok')
