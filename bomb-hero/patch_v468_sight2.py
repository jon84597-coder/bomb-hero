# -*- coding: utf-8 -*-
# v4.68 第二段：遠程怪不再靠「2 格仇恨」當開火門檻；鑽地蟲的索敵距離也一起收
import io, sys
P = 'index.html'
s = io.open(P, encoding='utf-8').read()


def rep(old, new, tag):
    global s
    n = s.count(old)
    if n != 1:
        sys.stderr.write('[FAIL] %s count=%d\n' % (tag, n))
        sys.exit(1)
    s = s.replace(old, new)
    print('[ok] ' + tag)


# 吐彈起手：改成「3.2 格內就開始集氣」，不再等 2 格仇恨
rep("""    e.skCd = (e.skCd || 0) - dt;
    if (!e.aggro || e.skCd > 0) return;
    // v4.68：索敵從 6.5 格縮到 3.2 格（原本站在五格外都會被點名）
    const tgt = nearestPlayerTo(e, T * FOE_SIGHT_TILES);""",
    """    e.skCd = (e.skCd || 0) - dt;
    if (e.skCd > 0) return;
    // v4.68：以前開火要先「2 格仇恨」，但射程卻是 6.5 格、集氣中還追到 8 格
    //   → 玩家在五格外照樣被點名。現在察覺距離就是 3.2 格（=FOE_SIGHT_TILES），
    //   你退到 3.2 格以外牠就不會起手，集氣中退到 4.4 格以外牠直接收手。
    const tgt = nearestPlayerTo(e, T * FOE_SIGHT_TILES);""",
    'spit-gate')

# 鑽地／瞬移：索敵 8 格 → 4.2 格
rep("""  const tgt = nearestPlayerTo(e, T * 8);
  let tx = cx, ty = cy;""",
    """  // v4.68：以前 8 格內都算「看得到你」，蟲會從半張地圖外瞬移到你旁邊；
  //   現在只認 4.2 格（落點本身還要再離你 2 格以上）。
  const tgt = nearestPlayerTo(e, T * (FOE_SIGHT_TILES + 1.0));
  let tx = cx, ty = cy;""",
    'blink-sight')

io.open(P, 'w', encoding='utf-8', newline='\n').write(s)
print('chars:', len(s), 'bytes:', len(s.encode('utf-8')))
