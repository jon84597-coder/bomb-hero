# -*- coding: utf-8 -*-
"""
v4.88：鴕鳥神獸「跑動循環」三幀對齊。

問題：三張圖是分開生的，每張的 bbox 高度/寬度都不同（翅膀舉高那幀特別高）。
      如果每幀各自「縮到 256 高」，播放時身體會忽大忽小、腳底會上下跳。

做法：
  1) 自動判斷背景（四角平均亮度 → 白底去白 / 黑底去黑），只吃「連得到邊界」的
     背景色；底部殘留的灰色落地陰影另外清掉（低飽和 + 中高亮度 + 貼底）。
  2) 只保留最大前景連通塊（丟 AI 浮水印與碎屑）。
  3) 三幀共用同一個縮放比（以第 0 幀的高度 = 256 為基準），不重新 fit。
  4) 對齊錨點：**底邊**（腳底）＋**右邊緣**（喙，頭部三幀都不動，最穩）。
  5) 貼進同一塊畫布 → 三張輸出的尺寸完全一樣，播放時零位移。

用法：
  python art/mounts/make_ostrich_frames.py
"""
import os
from collections import deque
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ART = os.path.join(ROOT, 'art')
RAW = os.path.join(ART, 'mounts', '_raw')
FRAMES = os.path.join(ART, 'mounts', 'frames')
OUT = os.path.join(ROOT, 'spr')

BODY_H = 256            # 參考用：早期單幀版本的本體高度
SADDLE_H = 46           # 三幀共用的鞍布高度（身體大小以此為準，翅膀舉高不影響）
BLACK_TOL = 56
WHITE_TOL = 247
FEATHER = 0.8
PAD = 2
OUT_H = 320

SRC = [
    os.path.join(ART, 'mounts', 'ostrich-cut.png'),   # frame 0：翅膀中位（已去背）
    os.path.join(RAW, 'run-1.png'),                   # frame 1：翅膀下壓、左腿著地
    os.path.join(RAW, 'run-2.png'),                   # frame 2：翅膀高舉、右腿著地
]
NAME = ['mount-art-ostrich.webp',
        'mount-art-ostrich-run1.webp',
        'mount-art-ostrich-run2.webp']


def _flood_bg(w, h, hit):
    """從四邊泛洪，回傳 bytearray（1 = 背景）。hit(x, y) 判斷是否背景色。"""
    bg = bytearray(w * h)
    q = deque()

    def take(x, y):
        k = y * w + x
        if not bg[k] and hit(x, y):
            bg[k] = 1
            q.append((x, y))

    for x in range(w):
        take(x, 0)
        take(x, h - 1)
    for y in range(h):
        take(0, y)
        take(w - 1, y)
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h:
                take(nx, ny)
    return bg


def _keep_largest(mask, w, h):
    """mask = bytearray（1 = 前景）→ 只留最大連通塊，回傳新的 bytearray。"""
    seen = bytearray(w * h)
    best, best_size = [], 0
    for y in range(h):
        for x in range(w):
            k = y * w + x
            if not mask[k] or seen[k]:
                continue
            comp = []
            q = deque([(x, y)])
            seen[k] = 1
            while q:
                cx, cy = q.popleft()
                comp.append((cx, cy))
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = cx + dx, cy + dy
                    if 0 <= nx < w and 0 <= ny < h:
                        kk = ny * w + nx
                        if mask[kk] and not seen[kk]:
                            seen[kk] = 1
                            q.append((nx, ny))
            if len(comp) > best_size:
                best_size, best = len(comp), comp
    out = bytearray(w * h)
    for (x, y) in best:
        out[y * w + x] = 1
    return out


def _fill_holes(mask, w, h):
    """把被前景包住的背景（洞）補成前景：眼睛高光、白鞍布線不會被挖空。"""
    out = bytearray(1 if mask[i] else 0 for i in range(w * h))
    seen = bytearray(1 if not mask[i] else 0 for i in range(w * h))
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            k = y * w + x
            if seen[k]:
                seen[k] = 2
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            k = y * w + x
            if seen[k] == 1:
                seen[k] = 2
                q.append((x, y))
    while q:
        cx, cy = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = cx + dx, cy + dy
            if 0 <= nx < w and 0 <= ny < h:
                kk = ny * w + nx
                if seen[kk] == 1:
                    seen[kk] = 2
                    q.append((nx, ny))
    for i in range(w * h):
        if seen[i] == 1:      # 沒被外部泛洪走到 → 是洞
            out[i] = 1
    return out


def cut_bg(im):
    """白底 / 黑底 → RGBA（未裁切）。"""
    im = im.convert('RGB')
    w, h = im.size
    px = im.load()

    corners = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    lum = sum(sum(px[c]) / 3.0 for c in corners) / 4.0
    white = lum > 170

    if white:
        # 生圖的白底不是純白：四周有 210~250 的漸層與暗角，固定門檻的泛洪根本進不去。
        # 改成「亮 → 背景、低彩度的灰 → 陰影」，再取最大連通塊 + 填洞（羽毛高光不會被挖穿）。
        fg = bytearray(w * h)
        for y in range(h):
            for x in range(w):
                r, g, b = px[x, y]
                mx, mn = max(r, g, b), min(r, g, b)
                L = (r * 299 + g * 587 + b * 114) // 1000
                if L >= 238:
                    continue                      # 白底
                if L >= 150 and (mx - mn) <= 14:
                    continue                      # 落地灰影
                fg[y * w + x] = 1
        fg = _keep_largest(fg, w, h)
        # 不填洞：眼睛高光那種小洞會被 MaxFilter(3) 順手補掉，
        # 而翅膀與脖子之間的大空隙要留透明（那是真的看得到背景的縫）。
    else:
        def hit(x, y):
            r, g, b = px[x, y]
            return r <= BLACK_TOL and g <= BLACK_TOL and b <= BLACK_TOL
        bg = _flood_bg(w, h, hit)
        fg = _keep_largest(bytearray(1 if not bg[i] else 0 for i in range(w * h)), w, h)

    a = Image.new('L', (w, h), 0)
    ap = a.load()
    for i in range(w * h):
        if fg[i]:
            ap[i % w, i // w] = 255
    a = a.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(FEATHER))

    out = im.convert('RGBA')
    op = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b, al = op[x, y]
            if 0 < al < 255:
                k = 255.0 / al
                op[x, y] = (min(255, int(r * k)), min(255, int(g * k)), min(255, int(b * k)), al)
    out.putalpha(a)
    return out


def clean_rgba(im):
    """已經有 alpha 的圖（第 0 幀）：門檻化 → 只留最大塊 → 不重做羽化。"""
    im = im.convert('RGBA')
    w, h = im.size
    al = im.split()[3].point(lambda v: 255 if v >= 10 else 0)
    p = al.load()
    fg = bytearray(1 if p[x, y] else 0 for y in range(h) for x in range(w))
    fg = _keep_largest(fg, w, h)
    a = Image.new('L', (w, h), 0)
    ap = a.load()
    for i in range(w * h):
        if fg[i]:
            ap[i % w, i // w] = 255
    im.putalpha(a)
    return im


def teal_anchor(im):
    """用鞍布的藍綠格紋當身體錨點（三幀都有、跟著身體走，比 bbox 穩）。

    回傳 (cx, cy, h)：鞍布 bbox 的中心與高度。找不到回傳 None。
    """
    im = im.convert('RGB')
    w, h = im.size
    px = im.load()
    m = bytearray(w * h)
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            if g > 105 and b > 95 and (g - r) > 35 and (b - r) > 18 and abs(g - b) < 55:
                m[y * w + x] = 1
    m = _keep_largest(m, w, h)
    xs = [i % w for i in range(w * h) if m[i]]
    ys = [i // w for i in range(w * h) if m[i]]
    if len(xs) < 200:
        return None
    x0, x1 = min(xs), max(xs)
    y0, y1 = min(ys), max(ys)
    return ((x0 + x1) / 2.0, (y0 + y1) / 2.0, (y1 - y0))


def main():
    os.makedirs(FRAMES, exist_ok=True)
    cuts, anchors = [], []
    for i, p in enumerate(SRC):
        im = Image.open(p)
        cut = clean_rgba(im) if i == 0 else cut_bg(im)
        bb = cut.getbbox()
        cuts.append(cut.crop(bb))
        # 錨點要在「裁切後的圖」上算，座標才會對得上
        an = teal_anchor(cuts[-1])
        anchors.append(an)
        print('frame %d  raw=%s  cut=%s  saddle=%s' % (i, im.size, cuts[-1].size,
              None if not an else '(%.0f,%.0f) h=%.0f' % an))
    if any(a is None for a in anchors):
        raise SystemExit('鞍布偵測失敗，請檢查門檻')

    # 三幀共用「鞍布高度 = SADDLE_H」→ 身體大小一致（不吃 bbox，翅膀舉高不影響）
    scaled = []
    for i, c in enumerate(cuts):
        s = SADDLE_H / anchors[i][2]
        w = max(1, int(round(c.size[0] * s)))
        h = max(1, int(round(c.size[1] * s)))
        scaled.append(c.resize((w, h), Image.LANCZOS))
        print('  frame %d scale=%.5f -> %dx%d' % (i, s, w, h))

    # x 錨：鞍布中心（翅膀左右張開時身體不會左右漂）
    # y 錨：圖的底邊（落地那隻腳踩在同一條地面線上，跑起來不會上下跳）
    xs = [anchors[i][0] * (SADDLE_H / anchors[i][2]) for i in range(len(scaled))]
    AX = int(max(xs)) + PAD
    W = int(AX + max(im.size[0] - x for x, im in zip(xs, scaled))) + PAD
    Hh = int(max(im.size[1] for im in scaled)) + PAD * 2
    print('canvas %dx%d  asp=%.4f  anchorX=%d' % (W, Hh, W / float(Hh), AX))

    # 輸出前統一縮到 OUT_H：對齊比例不動（asp 不變），只是少一點超取樣 → 檔案小一半
    if Hh > OUT_H:
        s2 = OUT_H / float(Hh)
        W, Hh = int(round(W * s2)), OUT_H
        scaled = [im.resize((max(1, int(round(im.size[0] * s2))), max(1, int(round(im.size[1] * s2)))), Image.LANCZOS)
                  for im in scaled]
        xs = [v * s2 for v in xs]
        AX = int(round(AX * s2))
        print('output scaled to %dx%d (asp=%.4f)' % (W, Hh, W / float(Hh)))

    for i, im in enumerate(scaled):
        cv = Image.new('RGBA', (W, Hh), (0, 0, 0, 0))
        x = int(round(AX - xs[i]))
        y = Hh - PAD - im.size[1]
        cv.paste(im, (x, y), im)
        cv.save(os.path.join(FRAMES, 'ostrich-%d.png' % i))
        cv.save(os.path.join(OUT, NAME[i]), 'WEBP', quality=93, method=6)
        print('->', NAME[i], cv.size, 'paste', x, y)

    # 疊圖檢查（三幀輪廓要重疊在同一個身體位置上）
    sheet = Image.new('RGBA', (W, Hh), (0, 0, 0, 0))
    for i, im in enumerate(scaled):
        tmp = Image.new('RGBA', (W, Hh), (0, 0, 0, 0))
        tmp.paste(im, (int(round(AX - xs[i])), Hh - PAD - im.size[1]), im)
        tone = [(255, 80, 80, 90), (80, 200, 255, 90), (120, 255, 120, 90)][i % 3]
        solid = Image.new('RGBA', (W, Hh), tone)
        solid.putalpha(tmp.split()[3].point(lambda v: v // 3))
        sheet.alpha_composite(solid)
    sheet.save(os.path.join(ART, 'mounts', 'frames', '_overlay.png'))
    print('overlay -> art/mounts/frames/_overlay.png')


if __name__ == '__main__':
    main()
