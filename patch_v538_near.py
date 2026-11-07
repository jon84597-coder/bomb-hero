# -*- coding: utf-8 -*-
import io, os

P = 'bomb-hero/index.html'
s = io.open(P, encoding='utf-8').read()
n0 = len(s)
steps = []

def rep(a, b, tag):
    global s
    c = s.count(a)
    assert c == 1, '[%s] anchor count=%d' % (tag, c)
    s = s.replace(a, b, 1)
    steps.append(tag)

A_OLD = '''function showEnd(title, sub, good, chIdx) {'''
A_NEW = '''/* ============================================================================
 * v5.38\uff1a\u300c\u5dee\u4e00\u9ede\u300d\u7d50\u7b97\u6587\u6848
 *   \u73a9\u5bb6\u6700\u5728\u610f\u7684\u4e0d\u662f\u300c\u4f60\u8f38\u4e86\u300d\uff0c\u800c\u662f\u300c\u4f60\u5c31\u5dee\u9019\u4e00\u9ede\u300d\u3002
 *   \u6b7b\u4ea1\u7d50\u7b97\u591a\u4e00\u53e5\u5177\u9ad4\u7684\u5dee\u8ddd\uff08\u5dee\u5e7e\u79d2\uff0f\u738b\u5269\u5e7e\u683c\uff0f\u5834\u4e0a\u5269\u5e7e\u96bb\uff09\uff0c
 *   \u6bd4\u4e00\u53e5\u300c\u518d\u4f86\u4e00\u6b21\u300d\u5f37\u5f97\u591a \u2014\u2014 \u90a3\u53e5\u300c\u53ef\u60e1\uff0c\u518d\u4e00\u5834\u300d\u5c31\u662f\u56de\u982d\u7387\u3002
 * ========================================================================== */
function nearMissSuffix(p) {
  let msg = '';
  const fin = isFinite(Game.timer) && Game.timer > 0 && Game.timer < 25;
  if (fin) {
    msg = t('near.time', { n: Math.max(1, Math.ceil(Game.timer)) });
  } else if (Game.bossArena && Game.bossArena.boss && !Game.bossArena.boss.dead) {
    const B = Game.bossArena.boss;
    const pct = Math.max(1, Math.round((B.hp / Math.max(1, B.maxHp)) * 100));
    msg = t('near.boss', { n: Math.max(1, B.hp), p: pct });
  } else {
    let left = 0, boss = 0;
    for (let i = 0; i < Game.enemies.length; i++) {
      const e = Game.enemies[i];
      if (!e || e.dead) continue;
      left++;
      if (e.boss) boss++;
    }
    if (left > 0) msg = boss ? t('near.bossAlive', { n: left }) : t('near.foe', { n: left });
  }
  return msg ? ('\uff0e\uff0e\uff0e' + msg) : '';
}

function showEnd(title, sub, good, chIdx) {'''
rep(A_OLD, A_NEW, 'A-nearmiss')

B_OLD = '''        showEnd(t('solo.overTitle'), t('solo.overSub', { n: Game.stage, s: p.score }) + '\u3000\u00b7\u3000' + diffLabel(), false);'''
B_NEW = '''        showEnd(t('solo.overTitle'), t('solo.overSub', { n: Game.stage, s: p.score }) + '\u3000\u00b7\u3000' + diffLabel() + nearMissSuffix(p), false);'''
rep(B_OLD, B_NEW, 'B-append')

C_OLD = '''  Ghost: Ghost, drawDailyGhost: drawDailyGhost,'''
C_NEW = '''  Ghost: Ghost, drawDailyGhost: drawDailyGhost, nearMissSuffix: nearMissSuffix,'''
rep(C_OLD, C_NEW, 'C-export')

out = s.replace('\r\n', '\n')
tmp = P + '.tmp'
io.open(tmp, 'w', encoding='utf-8', newline='\n').write(out)
os.replace(tmp, P)
print('OK', n0, '->', len(out), 'delta', len(out) - n0)
print(' | '.join(steps))
