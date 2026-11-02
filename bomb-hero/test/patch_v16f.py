# -*- coding: utf-8 -*-
# v1.6 修正：BOSS 只躲「玩家的」炸彈，且不會被自己的長程火力炸死
import io, sys
P = 'index.html'
s = io.open(P, encoding='utf-8').read()
def rep(old, new, tag):
    global s
    assert old in s, 'MISS: ' + tag
    assert s.count(old) == 1, 'DUP: ' + tag + ' x' + str(s.count(old))
    s = s.replace(old, new)
    print('OK', tag)

# 1) 新增 BOSS 專用危險判定（忽略自己的炸彈／火焰）
rep(
"""// AI 難度參數（弱／中／強要有明顯差別）""",
"""// BOSS 專用：自己的炸彈（owner 為 null）對自己無害，不列入危險
// 這樣牠才會真的去躲「玩家放的」炸彈，而不是被自己的長程火力嚇到不敢動
function dangerAtBoss(cx, cy) {
  for (let i = 0; i < Game.flames.length; i++) {
    const f = Game.flames[i];
    if (f.owner == null) continue;
    if (f.cx === cx && f.cy === cy) return true;
  }
  for (let i = 0; i < Game.bombs.length; i++) {
    const b = Game.bombs[i];
    if (b.owner != null) { /* 玩家／AI 的炸彈：要躲 */ }
    else continue;                     // 自己的炸彈：免疫，不必躲
    if (b.held || b.flying) continue;
    if (b.cx === cx && b.cy === cy) return true;
    if (b.cy === cy && Math.abs(b.cx - cx) <= b.power) {
      let blocked = false;
      const s = Math.sign(cx - b.cx);
      for (let k = 1; k < Math.abs(cx - b.cx); k++) if (cellAt(b.cx + s * k, cy) !== 0) { blocked = true; break; }
      if (!blocked) return true;
    }
    if (b.cx === cx && Math.abs(b.cy - cy) <= b.power) {
      let blocked = false;
      const s = Math.sign(cy - b.cy);
      for (let k = 1; k < Math.abs(cy - b.cy); k++) if (cellAt(cx, b.cy + s * k) !== 0) { blocked = true; break; }
      if (!blocked) return true;
    }
  }
  return false;
}

// AI 難度參數（弱／中／強要有明顯差別）""",
'add dangerAtBoss')

# 2) updateBoss 內全部改用 dangerAtBoss
i0 = s.index('function updateBoss(e, dt) {')
i1 = s.index('// ----- 火焰 / 傷害', i0) if '// ----- 火焰 / 傷害' in s[i0:i0+9000] else -1
# 取 updateBoss 到下一個 top-level function 起點
import re
m = re.search(r'\n(?=function |// -{3,})', s[i0+10:])
body_end = i0 + 10 + (m.start() if m else 6000)
body = s[i0:body_end]
n = body.count('dangerAt(')
assert n == 4, 'updateBoss dangerAt count=' + str(n)
body2 = body.replace('dangerAt(', 'dangerAtBoss(')
s = s[:i0] + body2 + s[body_end:]
print('OK updateBoss x' + str(n))

# 3) 火焰傷害：BOSS 只被玩家的火燒到（自己的炸彈炸不死自己）
rep(
"""    if (f.cx === Math.floor(e.x / T) && f.cy === Math.floor(e.y / T) && e.hitT <= 0) {
      e.hp -= 1; e.hitT = .8;""",
"""    if (f.owner == null) continue;      // 自己的炸彈炸不到自己（不然每顆都自爆）
    if (f.cx === Math.floor(e.x / T) && f.cy === Math.floor(e.y / T) && e.hitT <= 0) {
      e.hp -= 1; e.hitT = .8;""",
'boss self-damage guard')

io.open(P, 'w', encoding='utf-8', newline='\n').write(s)
print('done, bytes', len(s.encode('utf-8')))
