# -*- coding: utf-8 -*-
"""
第一關 6 隻小怪「撞型」量化檢查 v2 —— 貼近「縮到 53px 時玩家的實際辨識方式」。

三個指標：
  A. 剪影 IoU            ：整體形狀重疊率（會被 bounding box 影響，僅作參考）
  B. 徑向輪廓指紋        ：從質心往 32 個方向量到輪廓的距離（正規化）
                          → 抓的是「耳朵／角／傘蓋／分節」這些外輪廓突起
                          → 這才是小尺寸下分辨怪物的主要線索
  C. 主色 ΔE76（Lab）    ：k-means 取最大色叢當「讀到的顏色」，算 CIE76 色差
                          （ΔE < 12 人眼在小圖上幾乎分不出）

用法：python art/foes/analyze_stage1.py
"""
import io, os, math, json, random
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
FOES = [
    ('slime',  '史萊姆',   'stage1/01-slime.png'),
    ('bunny',  '蹦蹦兔',   'stage1/02-bunny.png'),
    ('frog',   '小青蛙',   'stage1/03-frog.png'),
    ('cater',  '毛毛蟲',   'stage1/04-cater.png'),
    ('mush',   '毒菇怪',   'stage1/05-mush.png'),
    ('beetle', '鐵甲蟲',   'stage1/06-beetle.png'),
]
N = 120        # 正規化網格
RAYS = 32      # 徑向取樣數
random.seed(7)


# ---------- 色彩 ----------
def srgb_to_lab(r, g, b):
    def f(u):
        u /= 255.0
        return u / 12.92 if u <= 0.04045 else ((u + 0.055) / 1.055) ** 2.4
    r, g, b = f(r), f(g), f(b)
    x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047
    y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000
    z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883

    def g2(t):
        return t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116
    x, y, z = g2(x), g2(y), g2(z)
    return (116 * y - 16, 500 * (x - y), 200 * (y - z))


def de76(c1, c2):
    l1, a1, b1 = srgb_to_lab(*c1)
    l2, a2, b2 = srgb_to_lab(*c2)
    return math.sqrt((l1 - l2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2)


def kmeans_dominant(pixels, k=3, iters=14):
    """回傳 [(權重, (r,g,b)), ...]，權重大的在前。"""
    if not pixels:
        return []
    cs = random.sample(pixels, min(k, len(pixels)))
    for _ in range(iters):
        buckets = [[] for _ in cs]
        for p in pixels:
            best, bd = 0, 1e18
            for i, c in enumerate(cs):
                d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2
                if d < bd:
                    bd, best = d, i
            buckets[best].append(p)
        cs = [tuple(round(sum(v[i] for v in bk) / len(bk)) for i in range(3)) if bk else cs[j]
              for j, bk in enumerate(buckets)]
    out = [(len(bk) / len(pixels), c) for bk, c in zip(buckets, cs) if bk]
    out.sort(key=lambda t: -t[0])
    return out


# ---------- 剪影 ----------
def prep(path):
    im = Image.open(path).convert('RGBA')
    bb = im.split()[3].point(lambda v: 255 if v > 24 else 0).getbbox()
    im = im.crop(bb)
    ow, oh = im.size
    s = min(N / ow, N / oh)
    nw, nh = max(1, round(ow * s)), max(1, round(oh * s))
    sm = im.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    canvas.paste(sm, ((N - nw) // 2, N - nh), sm)
    return canvas, (ow, oh), im


def radial_sig(canvas):
    px = canvas.load()
    on = [(x, y) for y in range(N) for x in range(N) if px[x, y][3] > 40]
    if not on:
        return [0.0] * RAYS, (0, 0), 0
    cx = sum(p[0] for p in on) / len(on)
    cy = sum(p[1] for p in on) / len(on)
    sig = []
    for k in range(RAYS):
        ang = 2 * math.pi * k / RAYS
        dx, dy = math.cos(ang), math.sin(ang)
        last = 0.0
        r = 1.0
        while r < N * 1.5:
            x, y = int(round(cx + dx * r)), int(round(cy + dy * r))
            if not (0 <= x < N and 0 <= y < N):
                break
            if px[x, y][3] > 40:
                last = r
            r += 0.5
        sig.append(last)
    mx = max(sig) or 1.0
    return [round(v / mx, 3) for v in sig], (round(cx, 1), round(cy, 1)), len(on)


def sig_dist(a, b):
    return sum(abs(x - y) for x, y in zip(a, b)) / len(a)


def iou(m1, m2):
    return sum(1 for x, y in zip(m1, m2) if x and y) / max(1, sum(1 for x, y in zip(m1, m2) if x or y))


def main():
    D = {}
    for key, name, rel in FOES:
        canvas, orig, tight = prep(os.path.join(HERE, rel))
        px = canvas.load()
        mask = [1 if px[x, y][3] > 40 else 0 for y in range(N) for x in range(N)]
        # 主色：對緊裁後的原圖抽樣（保留材質細節）
        small = tight.convert('RGB').resize((64, 64), Image.LANCZOS)
        spx = small.load()
        a2 = tight.split()[3].resize((64, 64), Image.LANCZOS).load()
        pix = [spx[x, y] for y in range(64) for x in range(64) if a2[x, y] > 120]
        dom = kmeans_dominant(pix, 3)
        sig, cen, area = radial_sig(canvas)
        D[key] = dict(name=name, ow=orig[0], oh=orig[1],
                      aspect=round(orig[0] / orig[1], 3),
                      fill=round(area / (N * N), 3),
                      sig=sig, mask=mask, dom=dom,
                      protrusion=round(math.sqrt(sum((v - 1 / RAYS * sum(sig)) ** 2 for v in sig) / RAYS), 3))

    keys = [k for k, _, _ in FOES]

    print('%-8s %-6s %-9s %-7s %-7s %-9s %s' % ('id', 'name', '原尺寸', '寬高比', '填充率', '輪廓突起', '主色 / 佔比'))
    for k in keys:
        d = D[k]
        w, c = d['dom'][0]          # kmeans_dominant 回傳 (權重, 色)
        print('%-8s %-6s %-9s %-7s %-7s %-9s #%02x%02x%02x %2d%%' % (
            k, d['name'], '%dx%d' % (d['ow'], d['oh']), d['aspect'], d['fill'],
            d['protrusion'], c[0], c[1], c[2], round(w * 100)))

    print('\n=== A. 剪影 IoU（>0.55 形狀偏像）')
    pa = []
    for i in range(len(keys)):
        for j in range(i + 1, len(keys)):
            v = iou(D[keys[i]]['mask'], D[keys[j]]['mask'])
            pa.append((v, keys[i], keys[j]))
    for v, a, b in sorted(pa, reverse=True):
        print('  %-7s × %-7s  %.3f%s' % (a, b, v, '  ← 偏高' if v > .55 else ''))

    print('\n=== B. 徑向輪廓指紋距離（<0.09 外輪廓幾乎一樣）')
    pb = []
    for i in range(len(keys)):
        for j in range(i + 1, len(keys)):
            v = sig_dist(D[keys[i]]['sig'], D[keys[j]]['sig'])
            pb.append((v, keys[i], keys[j]))
    for v, a, b in sorted(pb, reverse=True):
        print('  %-7s × %-7s  %.3f%s' % (a, b, v, '  ← 太像' if v < .09 else ''))

    print('\n=== C. 主色 ΔE76（<12 小圖上幾乎同色）')
    pc = []
    for i in range(len(keys)):
        for j in range(i + 1, len(keys)):
            v = de76(D[keys[i]]['dom'][0][1], D[keys[j]]['dom'][0][1])
            pc.append((v, keys[i], keys[j]))
    for v, a, b in sorted(pc):
        print('  %-7s × %-7s  %6.1f%s' % (a, b, v, '  ← 同色系' if v < 12 else ('  (偏近)' if v < 25 else '')))

    out = {k: {kk: vv for kk, vv in v.items() if kk != 'mask'} for k, v in D.items()}
    out['_iou'] = {'%s|%s' % (a, b): round(v, 3) for v, a, b in pa}
    out['_sigdist'] = {'%s|%s' % (a, b): round(v, 3) for v, a, b in pb}
    out['_de76'] = {'%s|%s' % (a, b): round(v, 1) for v, a, b in pc}
    io.open(os.path.join(HERE, 'stage1/_analysis.json'), 'w', encoding='utf-8').write(
        json.dumps(out, ensure_ascii=False, indent=1))
    print('\n寫出 stage1/_analysis.json')


if __name__ == '__main__':
    main()
