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

A_OLD = '''      // \u4e94\u500b\u968e\u7d1a\uff08\u5206\u6578\u9580\u6abb \u2192 \u91d1\u5e63\uff09
      const TIERS = [{ p: 120, g: 300 }, { p: 300, g: 600 }, { p: 600, g: 1000 },
                     { p: 1000, g: 1800 }, { p: 1600, g: 3000 }];'''
A_NEW = '''      /* v5.38\uff1a5 \u968e \u2192 30 \u7d1a\u901a\u884c\u8b49\u3002
         28 \u5929\u4e00\u5b63\u300130 \u7d1a\uff0c\u9580\u6abb\u8d70\u5e73\u6ed1\u66f2\u7dda\uff08\u524d\u671f\u5bc6\u3001\u5f8c\u671f\u9b06\uff09\uff0c
         \u91d1\u5e63\u7e3d\u91cf\u523b\u610f\u8ddf\u820a\u7248 5 \u968e\u7684 6,700 \u91d1\u5dee\u4e0d\u591a\uff08\u4e0d\u8b93\u901a\u81a8\uff09\u3002
         \u820a\u5b58\u6a94\u7684 S.tiers \u6703\u88ab clamp \u5230\u65b0\u9577\u5ea6\uff0c\u4e0d\u6703\u58de\u6389\u3002 */
      const TIERS = (function () {
        const out = [];
        for (let i = 1; i <= 30; i++) {
          const k = i - 1;
          out.push({ p: Math.round(50 + 55 * k + .9 * k * k), g: 40 + 12 * i });
        }
        return out;
      })();'''
rep(A_OLD, A_NEW, 'A-tiers30')

A2_OLD = '''      '<b>' + t2('se.tier', { n: i + 1 }) + '</b><small>' + T.p + 'p</small>' +'''
A2_NEW = '''      '<b>' + t2('se.tier', { n: i + 1 }) + '</b><small>' + T.p + '</small>' +'''
rep(A2_OLD, A2_NEW, 'A2-tier-label')

out = s.replace('\r\n', '\n')
tmp = P + '.tmp'
io.open(tmp, 'w', encoding='utf-8', newline='\n').write(out)
os.replace(tmp, P)
print('OK', n0, '->', len(out), 'delta', len(out) - n0)
print(' | '.join(steps))
