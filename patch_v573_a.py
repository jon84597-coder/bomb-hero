# -*- coding: utf-8 -*-
"""v5.73 patch A: 失敗埋點（死亡位置 + 死因）"""
import io, os, sys

P = os.path.join(os.path.dirname(__file__), 'bomb-hero', 'js', 'main.js')
s = io.open(P, 'r', encoding='utf-8', newline='').read()
orig = len(s)

A = """    info = { who: who, left: left, stage: Game.stage | 0, n: trail.length >> 1, tip: tip };
  }"""
B = """    info = { who: who, left: left, stage: Game.stage | 0, n: trail.length >> 1, tip: tip };
    /* v5.73：失敗埋點 —— 只記「哪一關、被什麼弄死」。
       以前只有 clear/solo 兩種事件，後台看得到「過了幾關」，看不到「卡在哪一關、
       死在誰手上」→ 所有難度調整都只能憑感覺。這一行讓後台能出一張卡關表。 */
    try {
      if (typeof Cloud !== 'undefined' && Cloud.track) {
        const st = Game.stage | 0;
        Cloud.track('dead', st, (who || '') + '｜第 ' + st + ' 關・' + stageName(st));
      }
    } catch (e) {}
  }"""

assert s.count(A) == 1, 'finish() 插入點不唯一: %d' % s.count(A)
s = s.replace(A, B)

assert len(s) != orig
assert s.count('\r\n') == 0, 'CRLF!'
tmp = P + '.tmp'
io.open(tmp, 'w', encoding='utf-8', newline='\n').write(s)
os.replace(tmp, P)
print('OK', orig, '->', len(s))
