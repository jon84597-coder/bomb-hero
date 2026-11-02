# -*- coding: utf-8 -*-
# v4.39 補丁 2：推車投擲 —— 只有「飛越牆壁」那一格才彈跳，一般地面平順滑過去
import io, os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
P = os.path.join(ROOT, 'index.html')
s = io.open(P, encoding='utf-8', newline='').read()
CRLF = '\r\n' in s


def rep(old, new, tag):
    global s
    o, n = old, new
    if CRLF:
        o = o.replace('\n', '\r\n')
        n = n.replace('\n', '\r\n')
    assert s.count(o) == 1, '[%s] 對不上（找到 %d 次）' % (tag, s.count(o))
    s = s.replace(o, n)
    print('ok [%s]' % tag)


# ---------- 1) 落點路徑記下「這一格是不是牆」 ----------
rep("""  for (let k = 1; k <= reach + THROW_RANGE; k++) {
    const nx = x + dir.d.x, ny = y + dir.d.y;
    if (nx < 1 || nx > cols - 2 || ny < 1 || ny > rows - 2) break;
    path.push({ x: nx, y: ny });
    x = nx; y = ny;""",
    """  for (let k = 1; k <= reach + THROW_RANGE; k++) {
    const nx = x + dir.d.x, ny = y + dir.d.y;
    if (nx < 1 || nx > cols - 2 || ny < 1 || ny > rows - 2) break;
    // v4.39：w=1 表示「這一格是牆／軟磚」→ 只有飛過牆的那一段才做彈跳動畫
    path.push({ x: nx, y: ny, w: cellAt(nx, ny) !== 0 ? 1 : 0 });
    x = nx; y = ny;""", 'pathW')

# ---------- 2) 飛行繪製：整段一次拋物線 ＋ 只有牆段補一次彈跳 ----------
rep("""        } else {
          // v4.13：一格一格跳（每格都有一次拋物線）
          b.px = (a.x + (c.x - a.x) * k + .5) * T;
          b.py = (a.y + (c.y - a.y) * k + .5) * T - Math.sin(k * Math.PI) * T * .55;
        }""",
    """        } else {
          b.px = (a.x + (c.x - a.x) * k + .5) * T;
          // v4.39：整段飛行只走「一次」拋物線；額外彈跳只在飛越牆的那一格出現。
          //   舊版每一格都彈 → 沒碰到牆、在陸地上也一直上下跳，看起來像彈簧。
          const fprog = Math.min(1, f.t / f.dur);
          const farc = Math.sin(fprog * Math.PI) * T * .52;
          const fhop = c.w ? Math.sin(k * Math.PI) * T * .46 : 0;
          b.py = (a.y + (c.y - a.y) * k + .5) * T - farc - fhop;
        }""", 'flight')

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('bytes', len(s.encode('utf-8')))
