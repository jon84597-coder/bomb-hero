# -*- coding: utf-8 -*-
# v4.14 第一輪：修好「拿了遙控器（計時炸彈）之後撿不起炸彈、也踢不動炸彈」
#
# 真正的原因有三個（都在動作鍵／障礙判定，不在遙控器本身）：
#   ① solidOrBomb 讓「戴手套的人把炸彈當空氣」→ 玩家直接走過炸彈格，
#      於是 controlHuman 的「前方有炸彈就踢」永遠看不到炸彈（人已經站在炸彈上）。
#   ② controlHuman 的踢／打判定被 `!(p.glove && !p.carry)` 擋掉 →
#      只要身上有搬彈手套，踢彈鞋就永久失效。
#   ③ 動作鍵的分派順序是 `carry → line → placeBomb`，而撿彈寫在 placeBomb 裡 →
#      拿到「線圈炸彈」之後動作鍵會被 lineBomb 吃掉，手套就再也撿不起炸彈。
#   → 撿彈抽成獨立的 tryGlovePickup()，動作鍵改成「撿彈優先」；
#     炸彈恢復實體、踢／打不再看手套；遙控引爆不會炸到手上拿著的那一顆。
import io

PATH = 'index.html'
src = io.open(PATH, encoding='utf-8', newline='').read()
text = src.replace('\r\n', '\n')

rules = []
def R(old, new):
    rules.append((old, new))

# ================================================================
# ① 炸彈恢復實體（戴手套也一樣）
# ================================================================
R(
"""function solidOrBomb(cx, cy, p) {
  if (cellAt(cx, cy) !== 0) return true;
  const b = bombAt(cx, cy);
  // v4.11：戴手套時可以走進炸彈格 —— 否則永遠走不到炸彈旁邊撿不起來
  if (b && p && p.glove) return false;
  if (b && !(b.passers && b.passers.indexOf(p) >= 0)) return true;
  return false;
}""",
"""function solidOrBomb(cx, cy, p) {
  if (cellAt(cx, cy) !== 0) return true;
  const b = bombAt(cx, cy);
  // v4.14：炸彈對所有人都是實體（含戴手套）。
  //   v4.11 讓手套把炸彈當空氣 → 玩家直接走過炸彈格，
  //   「撞到炸彈就踢」的判定永遠看不到炸彈（人已經站在炸彈上面）→ 踢彈鞋變成廢物。
  //   撿彈改成「站在炸彈旁邊按動作鍵」（tryGlovePickup 會找腳下＋面前＋四個方向）。
  if (b && !(b.passers && b.passers.indexOf(p) >= 0)) return true;
  return false;
}"""
)

# ================================================================
# ② 踢／打不再被手套擋掉
# ================================================================
R(
"""      // v4.11：戴手套時優先「抓彈」，不會被踢／打搶走（走進炸彈即可用放彈鍵撿起）
      if (bombAt(nx, ny) && !(p.glove && !p.carry)) {
        if (p.kick) kickBomb(p, dn);
        else if (p.punch) punchBomb(p, dn);
      }""",
"""      // v4.14：踢／打不再被手套擋掉（舊版只要身上有手套，踢彈鞋就永遠踢不動）。
      //   有踢彈鞋 → 撞到炸彈就踢走；想撿起來 → 停下來按動作鍵（旁邊那一格就撿得到）。
      if (bombAt(nx, ny) && !p.carry) {
        if (p.kick) kickBomb(p, dn);
        else if (p.punch) punchBomb(p, dn);
      }"""
)

# ================================================================
# ③ 撿彈抽成 tryGlovePickup()，動作鍵「撿彈優先」
# ================================================================
R(
"""function placeBomb(p) {
  if (!p.alive) return;
  const T = Game.T;
  const cx = Math.floor(p.x / T), cy = Math.floor(p.y / T);
  // 撿炸彈（手套）：腳下或四個方向的炸彈都能撿（戴手套可以踩進炸彈格）
  if (p.glove && !p.carry) {
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
    if (b && !b.held && !b.moving && !b.flying) {
      p.carry = b; b.held = true;
      toast(t('toast.glove'), 2, 'g:glove');
      AudioSys.sfx('pick');
      return;
    }
  }""",
"""// v4.14：手套撿彈抽成獨立函式。
//   原本撿彈寫在 placeBomb 裡，而動作鍵是「carry → line → placeBomb」分派的 →
//   拿到「線圈炸彈」之後動作鍵會被 lineBomb 吃掉，手套就再也撿不起任何炸彈（含遙控彈）。
//   現在撿彈是最優先的動作，誰都搶不走。
function tryGlovePickup(p) {
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
  p.carry = b; b.held = true;
  toast(t('toast.glove'), 2, 'g:glove');
  AudioSys.sfx('pick');
  return true;
}
function placeBomb(p) {
  if (!p.alive) return;
  const T = Game.T;
  const cx = Math.floor(p.x / T), cy = Math.floor(p.y / T);
  if (tryGlovePickup(p)) return;          // 手套：先撿彈，撿不到才放彈"""
)

R(
"""  if (p.scheme.action()) {
    if (p.carry) throwCarried(p);
    else if (p.line) lineBomb(p);
    else placeBomb(p);
  }""",
"""  if (p.scheme.action()) {
    // v4.14：撿彈優先 —— 線圈炸彈（排線）與放彈都不能再把撿彈擠掉
    if (p.carry) throwCarried(p);
    else if (tryGlovePickup(p)) { /* 已撿起 */ }
    else if (p.line) lineBomb(p);
    else placeBomb(p);
  }"""
)

# ================================================================
# ④ 遙控引爆不要炸到「手上拿著的那一顆」
# ================================================================
R(
"""  Game.bombs.forEach(function (b) {
    if (b.owner === p && b.remoteArmed) { b.remoteArmed = false; b.timer = 0.02; n++; }
  });""",
"""  Game.bombs.forEach(function (b) {
    // v4.14：手上拿著（carry）的那一顆不引爆 —— 否則一按 E 就炸在自己懷裡
    if (b.owner === p && b.remoteArmed && !b.held) { b.remoteArmed = false; b.timer = 0.02; n++; }
  });"""
)

# ================================================================
# ⑤ 導出 tryGlovePickup 給測試用
# ================================================================
R(
"""  buildBattleRound: buildBattleRound, buildMap: buildMap, placeBomb: placeBomb,""",
"""  buildBattleRound: buildBattleRound, buildMap: buildMap, placeBomb: placeBomb,
  tryGlovePickup: tryGlovePickup,"""
)

# ---- 套用並斷言 ----
failed = []
for i, (old, new) in enumerate(rules, 1):
    c = text.count(old)
    if c != 1:
        failed.append((i, c, old[:100]))
        continue
    text = text.replace(old, new)

if failed:
    print("FAILED rules:")
    for i, c, ctx in failed:
        print("  #%d count=%d ctx=%r" % (i, c, ctx))
    print("No file written.")
else:
    out = text.replace('\n', '\r\n')
    io.open(PATH, 'w', encoding='utf-8', newline='').write(out)
    print("OK: all %d rules applied" % len(rules))
