# -*- coding: utf-8 -*-
"""v4.16 第二段：快照要帶躲點（否則線上客人端會把樹叢畫成傳送門）＋ SW 版本"""
import io, sys

P = 'index.html'
src = io.open(P, encoding='utf-8', newline='').read()
s = src.replace('\r\n', '\n')
rules = []
def R(name, old, new, cnt=1):
    rules.append((name, old, new, cnt))

R('快照序列化躲點',
  """          hz.push([x, y, h.type === 'ice' ? 'i' : h.type === 'convey' ? 'c' : 'w', h.dir ? h.dir[0] : '',
            h.ci === undefined ? -1 : h.ci,
            (h.type === 'warp' && h.link) ? h.link.x : -1,
            (h.type === 'warp' && h.link) ? h.link.y : -1]);""",
  """          // v4.16：躲點也要同步（'h' = hide；第 7 碼放種子、第 8 碼放樹叢/破屋）
          hz.push([x, y, h.type === 'ice' ? 'i' : h.type === 'convey' ? 'c' : h.type === 'hide' ? 'h' : 'w',
            h.dir ? h.dir[0] : '',
            h.ci === undefined ? -1 : h.ci,
            (h.type === 'warp' && h.link) ? h.link.x : -1,
            (h.type === 'warp' && h.link) ? h.link.y : -1,
            h.type === 'hide' ? (h.seed | 0) : -1,
            h.type === 'hide' ? (h.kind === 'hut' ? 'u' : 'b') : '']);""")

R('快照還原躲點',
  """      const ci = (h[4] === undefined || h[4] < 0) ? undefined : h[4];
      const lx2 = h[5], ly2 = h[6];
      Game.hazards[y][x] = {
        type: h[2] === 'i' ? 'ice' : h[2] === 'c' ? 'convey' : 'warp',
        dir: h[3] === 'u' ? 'up' : h[3] === 'd' ? 'down' : h[3] === 'l' ? 'left' : 'right',
        ci: ci,
        color: ci === undefined ? undefined : WARP_COLORS[ci].hex,
        link: (lx2 >= 0 && ly2 >= 0) ? { x: lx2, y: ly2 } : undefined
      };""",
  """      const ci = (h[4] === undefined || h[4] < 0) ? undefined : h[4];
      const lx2 = h[5], ly2 = h[6];
      const isHide = h[2] === 'h';          // v4.16：樹叢／破屋
      Game.hazards[y][x] = {
        type: isHide ? 'hide' : (h[2] === 'i' ? 'ice' : h[2] === 'c' ? 'convey' : 'warp'),
        dir: h[3] === 'u' ? 'up' : h[3] === 'd' ? 'down' : h[3] === 'l' ? 'left' : 'right',
        ci: ci,
        color: (ci === undefined || !WARP_COLORS[ci]) ? undefined : WARP_COLORS[ci].hex,
        link: (lx2 >= 0 && ly2 >= 0) ? { x: lx2, y: ly2 } : undefined,
        kind: isHide ? (h[7] === 'u' ? 'hut' : 'bush') : undefined,
        seed: isHide ? ((h[6] | 0) < 0 ? 0 : (h[6] | 0)) : undefined
      };""")

R('版本紀錄補上躲點同步',
  """    '<b>RPG 小怪血量微調</b>：""",
  """    '<b>線上同步也帶躲點</b>：房主的樹叢／破屋會一起同步給所有玩家（誰躲在裡面只有自己知道）',
    '<b>RPG 小怪血量微調</b>：""")

fail = 0
for name, old, new, cnt in rules:
    n = s.count(old)
    if n != cnt:
        print('[FAIL] %s —— 命中 %d 次（預期 %d）' % (name, n, cnt)); fail += 1; continue
    s = s.replace(old, new)
    print('[ok] %s' % name)
if fail:
    print('失敗 %d 條' % fail); sys.exit(1)
io.open(P, 'w', encoding='utf-8', newline='').write(s.replace('\n', '\r\n'))
print('已寫入')
