# -*- coding: utf-8 -*-
"""v4.38-4/6：推車速度加快；對戰 AI 初始速度壓低 ＋ 速度上限"""
import io

PAGE = r'C:\Users\jon84\WorkBuddy\2026-10-30-12-58-54\bomb-hero\index.html'
s = io.open(PAGE, encoding='utf-8', newline='').read().replace('\r\n', '\n')


def sub1(old, new, tag):
    global s
    assert s.count(old) == 1, '%s: count=%d' % (tag, s.count(old))
    s = s.replace(old, new)
    print('ok [%s]' % tag)


# ---------- ④ 推車速度 150 → 250（玩家滑冰鞋 5 級 = 146+100） ----------
sub1('''      const rev = p.cartDir && d.x === -p.cartDir.x && d.y === -p.cartDir.y;
      const sp = (rev ? 150 * .42 : 150) * dt;      // 場外推車速度調快''',
     '''      const rev = p.cartDir && d.x === -p.cartDir.x && d.y === -p.cartDir.y;
      // v4.38：推車太慢 → 直接給到玩家「滑冰鞋 5 級」的速度（146 + 5×20 = 246）
      const CART_SPEED = 250;
      const sp = (rev ? CART_SPEED * .42 : CART_SPEED) * dt;''', 'cart-speed')

# ---------- ⑥ AI 難度表：spd 全面下調 ----------
sub1('''  weak:   { think: [.5, 1.0], chase: .35, bomb: .28, flee: .55, spd: .82, foeR: 2.6, soft: .5,  dinoFire: .10, dinoFireCd: 3.2, lob: .22, lobCd: 5.2 },
  normal: { think: [.2, .5],  chase: 1,   bomb: .85, flee: 1,   spd: 1,   foeR: 3.4, soft: 1,   dinoFire: .20, dinoFireCd: 2.5, lob: .52, lobCd: 3.4 },
  strong: { think: [.09, .2], chase: 1,   bomb: .97, flee: 1,   spd: 1.15, foeR: 4.8, soft: 1,  dinoFire: .34, dinoFireCd: 1.9, lob: .78, lobCd: 2.5 }
};''',
     '''  // v4.38：spd 全面下調 —— 舊版 normal 就等於玩家未吃鞋的速度、strong 還快 15%，
  //   一開局就像被追殺。現在 AI 起手一定比玩家慢，想變快只能自己去吃速度鞋，
  //   而且再往上也有硬上限（AI_SPEED_CAP，見 controlAI）。
  weak:   { think: [.5, 1.0], chase: .35, bomb: .28, flee: .55, spd: .70, foeR: 2.6, soft: .5,  dinoFire: .10, dinoFireCd: 3.2, lob: .22, lobCd: 5.2 },
  normal: { think: [.2, .5],  chase: 1,   bomb: .85, flee: 1,   spd: .84, foeR: 3.4, soft: 1,   dinoFire: .20, dinoFireCd: 2.5, lob: .52, lobCd: 3.4 },
  strong: { think: [.09, .2], chase: 1,   bomb: .97, flee: 1,   spd: 1.0,  foeR: 4.8, soft: 1,   dinoFire: .34, dinoFireCd: 1.9, lob: .78, lobCd: 2.5 }
};
// v4.38：AI 移動速度上限 = 玩家「滑冰鞋 2 級」的速度（146 + 2×20）。
//   AI 一樣要靠撿道具才會變快，但吃滿也不會變成飛車。
const AI_SPEED_CAP = 146 + 2 * 20;''', 'ai-levels')

# ---------- ⑥ controlAI 的移動加上限 ----------
sub1('''    const oldX = p.x, oldY = p.y;
    p.beltMul = beltMulFor(p, d.x, d.y);
    tryMove(p, d.x, d.y, dt * lv.spd);''',
     '''    const oldX = p.x, oldY = p.y;
    p.beltMul = beltMulFor(p, d.x, d.y);
    // v4.38：速度上限（滑冰鞋 2 級）——避免 AI 撿滿速度道具後比玩家快一大截
    const aiSpd = Math.min(moveSpeed(p), AI_SPEED_CAP);
    tryMove(p, d.x, d.y, dt * lv.spd, aiSpd);''', 'ai-move')

io.open(PAGE, 'w', encoding='utf-8', newline='').write(s.replace('\n', '\r\n'))
print('寫回 index.html')
