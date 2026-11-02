# -*- coding: utf-8 -*-
"""
把 v3 拆件層圖打包成遊戲用的 IMG_PARTS 格式（base64 webp）。

座標換算：以「內容 bbox」為畫布（= 角色總高），
所以 drawRigChar 的 H（角色總高）直接等於 bbox 高 → 換圖後大小與舊角色一致。

輸出：_heroes_game_parts.js（片段，供 patch 用）+ _pack_report.txt
"""
import json
import io
import os
import base64
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
LAY = os.path.join(ROOT, 'heroes', 'layers')
META = json.load(io.open(os.path.join(LAY, '_layers.json'), encoding='utf-8'))

# 遊戲內角色畫布高度（層圖解析度）。實際顯示 H ≈ 78px，288 約 3.7 倍，放大也不糊。
HT = 288

# 預設朝向（+1 面右 / -1 面左）
DIRS = {
    '01-rabbit': +1, '02-bear': -1, '03-dog': +1, '04-cat': -1,
    '05-pig': -1, '06-panda': +1, '07-frog': -1, '08-chick': -1,
}
KEYS = {
    '01-rabbit': 'rabbit', '02-bear': 'bear', '03-dog': 'dog', '04-cat': 'cat',
    '05-pig': 'pig', '06-panda': 'panda', '07-frog': 'frog', '08-chick': 'chick',
}
# 繪製順序（tail 最後才補，這裡只決定資料輸出順序）
# (來源檔名, 輸出鍵名)：挖空版 torsoB 直接輸出成 torso —— 遊戲端 Parts.has() 就是檢查 head+torso
ORDER = [('tail', 'tail'), ('legL', 'legL'), ('legR', 'legR'),
         ('torsoB', 'torso'), ('armL', 'armL'), ('armR', 'armR'), ('head', 'head')]


def enc(im):
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=88, method=6, lossless=False)
    return base64.b64encode(buf.getvalue()).decode('ascii')


def main():
    out = []
    total = 0
    report = []
    for rid in META:
        m = META[rid]
        bx0, by0, bx1, by1 = m['bbox']
        Wc, Hc = float(bx1 - bx0), float(by1 - by0)
        asp = Wc / Hc
        Wt, Ht = max(1, round(HT * asp)), HT

        mid = m['mid']
        piv = {
            'head': (mid, m['neck']),
            'torsoB': (mid, m['hip']),
            'torso': (mid, m['hip']),
        }
        for n in ('armL', 'armR'):
            if n in m.get('pivots', {}):
                piv[n] = tuple(m['pivots'][n])

        parts = []
        for src_name, name in ORDER:
            ly = m['layers'].get(src_name)
            if not ly:
                continue
            x0 = (ly['x'] - bx0) / Wc
            y0 = (ly['y'] - by0) / Hc
            w0 = ly['w'] / Wc
            h0 = ly['h'] / Hc
            tw = max(1, int(round(w0 * Wt)))
            th = max(1, int(round(h0 * Ht)))

            src = os.path.join(LAY, rid, src_name + '.png')
            im = Image.open(src).convert('RGBA')
            if (tw, th) != im.size:
                im = im.resize((tw, th), Image.LANCZOS)

            # pivot
            if src_name in piv:
                pvx, pvy = piv[src_name]
            elif name.startswith('leg'):
                pvx = ly['x'] + ly['w'] / 2.0
                pvy = m['hip']
            else:  # tail
                pvx = ly['x'] + ly['w'] * .18
                pvy = ly['y'] + ly['h'] * .82
            px = (pvx - bx0) / Wc
            py = (pvy - by0) / Hc

            data = enc(im)
            total += len(data)
            parts.append(
                '    %s: { u: "data:image/webp;base64,%s", x: %.4f, y: %.4f, w: %.4f, h: %.4f, px: %.4f, py: %.4f }'
                % (name, data, x0, y0, w0, h0, px, py)
            )

        out.append('  %s: { asp: %.4f, dir: %d, p: {\n%s\n  } },'
                   % (KEYS[rid], asp, DIRS[rid], ',\n'.join(parts)))
        report.append('%-11s %-6s asp %.4f  canvas %dx%d  parts %d  %.0f KB'
                      % (rid, KEYS[rid], asp, Wt, Ht, len(parts), total / 1024.0))

    js = 'const HERO_PARTS = {\n' + '\n'.join(out) + '\n};\n'
    io.open(os.path.join(ROOT, '_heroes_game_parts.js'), 'w',
            encoding='utf-8', newline='').write(js)
    io.open(os.path.join(ROOT, '_pack_report.txt'), 'w',
            encoding='utf-8', newline='').write('\n'.join(report))

    print('\n'.join(report))
    print('---- 合計 base64 %.0f KB ----' % (total / 1024.0))


if __name__ == '__main__':
    main()
