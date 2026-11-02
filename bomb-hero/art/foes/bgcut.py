# -*- coding: utf-8 -*-
"""
把生圖結果的背景摳掉 -> 真正的 RGBA PNG；也可以「補救」已經摳過但沒摳乾淨的圖。

背景有兩種情況（同一批圖可能混著）：
  1) 純白底         (253~255)
  2) 烘焙進圖裡的棋盤格（深灰兩階，約 58 / 74）

v4.34 修的三個病：
  A. 內部空洞：腳跟腳之間、手臂內側、翅膀跟脖子之間被輪廓包圍的白色區域，
     從邊界泛洪永遠走不到 → 留下一塊白。現在額外做「純白連通塊」偵測，
     只在「夾在角色內部、而且是完全平坦的純白」時才吃掉（熊貓/雪球的毛有明顯
     明暗與紋理，flatness 檢查會擋掉，不會被挖洞）。
  B. 殘渣碎塊：浮水印文字、地面碎屑、被切斷的小石塊 → 只留最大的一塊，
     面積不到最大塊 0.5% 的連通塊一律丟掉。
  C. 白邊：抗鋸齒像素是「角色色 × a + 白 × (1-a)」→ 貼著透明又夠白的像素往內剝 3 圈，
     再收邊 1px＋羽化，最後對半透明像素做「去白前乘（unpremultiply against white）」。

⚠ A2／A3 兩關預設「關閉」（BGCUT_GAPFILL / BGCUT_CREVICE），因為它們會把「發光核心、
  純白眼珠、白色毛髮」這種本來就該留著的純白一起吃掉。遇到坐騎那種「沒有發光、沒有純白眼珠」
  的手繪圖再打開，而且開完一定要目檢：
    BGCUT_GAPFILL=1 BGCUT_CREVICE=1 python bgcut.py --fix art/mounts/dragon-green.png ...
  A2 = 腳底縫隙（最底 22%、被地面暗線包住的整片白）
  A3 = 夾縫純白（翅膀／耳朵／脖子之間、手臂內側，被裁切到 255 的數位白）

用法：
  python bgcut.py raw1.png out1.png raw2.png out2.png ...
  python bgcut.py --fix  already_cut1.png already_cut2.png ...      # 就地補救
"""
import sys, os
from collections import deque
from PIL import Image, ImageFilter, ImageChops

TOL = float(os.environ.get('BGCUT_TOL', '34'))   # 顏色距離容差
FEATHER = 0.6                                    # 收邊後的羽化半徑
ERODE = 1                                        # 收邊像素（吃掉混到白的邊緣像素）
PEEL = 3                                         # 往內剝幾圈白邊
SHADOW = True                                    # 吃掉腳下那圈貼地陰影
MIN_KEEP = 0.005                                 # 連通塊面積 < 最大塊的 0.5% → 當碎屑丟掉
# 腳底縫隙：腳跟腳之間、腳跟尾巴之間常常「整片純白」，但生圖又在腳下畫了一條暗色地面線，
# 把這片白完全包住 → 從邊界泛洪走不到、也不夠大到算「洞」→ 會留一塊白。
# 特徵：完全碰不到透明區（5px 內都沒有）＋在角色最底 22% ＋平坦純白。
GAPFILL = os.environ.get('BGCUT_GAPFILL', '0') == '1'
GAP_YREL = float(os.environ.get('BGCUT_GAP_YREL', '0.78'))
GAP_AREA = float(os.environ.get('BGCUT_GAP_AREA', '0.0004'))   # 佔畫面面積比例
CREVICE = os.environ.get('BGCUT_CREVICE', '0') == '1'          # 夾縫純白（翅膀／脖子／手臂內側）


def bg_palette(px, w, h):
    """從邊框取樣，聚出最多 3 個背景色。"""
    samples = []
    step = max(1, w // 96)
    for x in range(0, w, step):
        samples.append(px[x, 0]); samples.append(px[x, h - 1])
    for y in range(0, h, step):
        samples.append(px[0, y]); samples.append(px[w - 1, y])

    clusters = []
    for c in samples:
        for cl in clusters:
            if sum(abs(c[i] - cl[0][i]) for i in range(3)) / 3 < 18:
                cl[1].append(c); break
        else:
            clusters.append([c, [c]])
    clusters.sort(key=lambda cl: -len(cl[1]))
    pal = []
    for c, group in clusters[:3]:
        n = len(group)
        pal.append(tuple(sum(g[i] for g in group) // n for i in range(3)))
    return pal


def dist(a, b):
    return max(abs(a[0] - b[0]), abs(a[1] - b[1]), abs(a[2] - b[2]))


def _neutral(c, sat=26):
    return max(c) - min(c) <= sat


def label(mask, w, h, conn8=True):
    """把 mask(bytearray 1/0) 連通編號；回傳 comps = [(面積, 碰邊界, [索引...])]"""
    lab = [0] * (w * h)
    comps = []
    n = 0
    nb = ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)) if conn8 \
        else ((1, 0), (-1, 0), (0, 1), (0, -1))
    for start in range(w * h):
        if not mask[start] or lab[start]:
            continue
        n += 1
        lab[start] = n
        q = deque([start])
        pix = [start]
        border = False
        while q:
            i = q.popleft()
            x, y = i % w, i // w
            if x == 0 or y == 0 or x == w - 1 or y == h - 1:
                border = True
            for dx, dy in nb:
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h:
                    j = ny * w + nx
                    if mask[j] and not lab[j]:
                        lab[j] = n; q.append(j); pix.append(j)
        comps.append((len(pix), border, pix))
    return lab, comps


def _finish(rgb, isbg, w, h, tag=''):
    """isbg: bytearray 1=背景。做「補洞 → 去碎屑 → 剝白邊 → 收邊羽化 → 去白前乘 → 裁切」。"""
    px = rgb.load()

    # ---- A. 內部空洞：被輪廓包圍、又完全平坦的純白 ----
    whites = bytearray(w * h)
    for i in range(w * h):
        if isbg[i]:
            continue
        c = px[i % w, i // w]
        if min(c) >= 248 and max(c) - min(c) <= 6:
            whites[i] = 1
    _, comps = label(whites, w, h, conn8=False)
    min_hole = max(300, int(0.0015 * w * h))     # 太小的洞不值得動（縮到 40px 根本看不見）
    hole_area = 0
    for area, border, pix in comps:
        if border or area < min_hole:
            continue
        # 平坦度：整塊亮度標準差；毛髮／冰晶／岩石都有紋理，會被這關擋掉
        vals = []
        step = max(1, len(pix) // 600)
        for i in pix[::step]:
            c = px[i % w, i // w]
            vals.append((c[0] + c[1] + c[2]) / 3.0)
        m = sum(vals) / len(vals)
        var = sum((v - m) ** 2 for v in vals) / len(vals)
        if var ** .5 > 3.0:
            continue
        # 邊界銳利度：真正的背景洞是被「角色輪廓」包住的，外面一圈一定要明顯更暗。
        #   高光（發光球體的白熱核心、頭頂反光）外面一圈是亮的 → 不能挖，挖了會破洞。
        ring = 0; dark = 0
        for i in pix[::max(1, len(pix) // 800)]:
            x, y = i % w, i // w
            for dx, dy in ((2, 0), (-2, 0), (0, 2), (0, -2)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h:
                    ring += 1
                    c = px[nx, ny]
                    if (c[0] + c[1] + c[2]) / 3.0 <= 200:
                        dark += 1
        if ring == 0 or dark < ring * .75:
            continue
        for i in pix:
            isbg[i] = 1
        hole_area += area

    # ---- A2. 腳底縫隙：被「畫上去的地面暗線」包住的整片純白 ----
    #   只看角色最底 22%（眼睛鞏膜、牙齒都在上面 → 不會被動到），
    #   而且要求「5px 內完全碰不到透明」——真正的白腳掌一定貼著下緣輪廓，會被這一關擋掉。
    gap_area = 0
    if GAPFILL:
        solid_idx = [i for i in range(w * h) if not isbg[i]]
        if solid_idx:
            ytop = min(i // w for i in solid_idx)
            ybot = max(i // w for i in solid_idx)
            ylim = ytop + int((ybot - ytop) * GAP_YREL)
            # 透明區往外擴 2px（5x5）→ 用來判斷「這塊白有沒有接到外面」
            tg = Image.frombytes('L', (w, h), bytes(255 if isbg[i] else 0 for i in range(w * h)))
            tgn = tg.filter(ImageFilter.MaxFilter(5))
            tp = tgn.load()
            whites2 = bytearray(w * h)
            for i in solid_idx:
                c = px[i % w, i // w]
                if min(c) >= 244 and max(c) - min(c) <= 10:
                    whites2[i] = 1
            _, comps1 = label(whites2, w, h, conn8=False)
            min_gap = max(60, int(GAP_AREA * w * h))
            for area, border, pix in comps1:
                if border or area < min_gap:
                    continue
                if max(i // w for i in pix) < ylim:      # 不在最底那一段 → 是眼睛／牙齒，不動
                    continue
                if any(tp[i % w, i // w] for i in pix):  # 碰到透明區 → 是輪廓外的抗鋸齒，交給剝白邊
                    continue
                vals = []
                step = max(1, len(pix) // 400)
                for i in pix[::step]:
                    c = px[i % w, i // w]
                    vals.append((c[0] + c[1] + c[2]) / 3.0)
                m = sum(vals) / len(vals)
                if (sum((v - m) ** 2 for v in vals) / len(vals)) ** .5 > 3.0:
                    continue
                for i in pix:
                    isbg[i] = 1
                gap_area += area


    # ---- A3. 夾縫純白：翅膀／耳朵／脖子之間、手臂內側這種「被兩個部件夾住」的背景白 ----
    #   跟 A 的差別：不限在畫面底部，但要求「真的是被裁切過的數位純白」（max 通道 ≥250，
    #   且整塊有 55% 以上是 252+）——眼白／高光通常不會被裁到 255，這關就是靠「有沒有被裁切」
    #   把它們分開；再加平坦度與「5px 內碰不到透明」兩道保險。
    crev_area = 0
    if CREVICE:
        solid_idx = [i for i in range(w * h) if not isbg[i]]
        if solid_idx:
            tg = Image.frombytes('L', (w, h), bytes(255 if isbg[i] else 0 for i in range(w * h)))
            tp = tg.filter(ImageFilter.MaxFilter(5)).load()
            whites3 = bytearray(w * h)
            for i in solid_idx:
                c = px[i % w, i // w]
                if min(c) >= 235 and max(c) - min(c) <= 20 and max(c) >= 250:
                    whites3[i] = 1
            _, comps3 = label(whites3, w, h, conn8=False)
            min_crev = max(160, int(0.00022 * w * h))
            for area, border, pix in comps3:
                if border or area < min_crev:
                    continue
                if any(tp[i % w, i // w] for i in pix):
                    continue
                vals = []
                clipped = 0
                step = max(1, len(pix) // 500)
                sample = pix[::step]
                for i in sample:
                    c = px[i % w, i // w]
                    if max(c) >= 252:
                        clipped += 1
                    vals.append((c[0] + c[1] + c[2]) / 3.0)
                if clipped < len(sample) * .55:
                    continue
                m = sum(vals) / len(vals)
                if (sum((v - m) ** 2 for v in vals) / len(vals)) ** .5 > 4.0:
                    continue
                for i in pix:
                    isbg[i] = 1
                crev_area += area

    # ---- B2. 貼地陰影：角色腳下那圈灰灰的橢圓（生圖常常自己畫上去）----
    #   特徵：中性灰、亮度 130~215、局部很平（3x3 極差很小），而且從最底邊連上來。
    #   只從「最底邊」泛洪，所以只會吃掉腳下那一片，不會往身上爬。
    shadow_area = 0
    if SHADOW:
        ys = [i // w for i in range(w * h) if not isbg[i]]
        xs = [i % w for i in range(w * h) if not isbg[i]]
        if ys:
            ybot, ytop = max(ys), min(ys)
            xlo, xhi = min(xs), max(xs)
            ylim = ybot - max(6, int((ybot - ytop) * .14))     # 只看最底 14%
            def is_shadow(x, y):
                i = y * w + x
                if isbg[i]:
                    return False
                c = px[x, y]
                if max(c) - min(c) > 15:
                    return False
                lum = (c[0] + c[1] + c[2]) / 3.0
                if lum < 130 or lum > 216:
                    return False
                mn, mx = 255, 0
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h:
                        d = px[nx, ny]
                        v = (d[0] + d[1] + d[2]) / 3.0
                        mn = min(mn, v); mx = max(mx, v)
                return (mx - mn) <= 26
            q2 = deque()
            for y in range(max(0, ybot - 2), min(h, ybot + 1)):
                for x in range(xlo, min(w, xhi + 1)):
                    if is_shadow(x, y):
                        isbg[y * w + x] = 1; q2.append((x, y))
            while q2:
                x, y = q2.popleft()
                shadow_area += 1
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
                    nx, ny = x + dx, y + dy
                    if xlo <= nx <= xhi and max(0, ylim) <= ny <= ybot:
                        if is_shadow(nx, ny):
                            isbg[ny * w + nx] = 1; q2.append((nx, ny))

    # ---- B. 碎屑：只留最大的一塊（浮水印字母、地面碎屑都會被清掉）----
    solid = bytearray(0 if m else 1 for m in isbg)
    _, comps2 = label(solid, w, h, conn8=True)
    dropped = 0
    if comps2:
        big = max(c[0] for c in comps2)
        for area, border, pix in comps2:
            if area < big * MIN_KEEP:
                for i in pix:
                    isbg[i] = 1
                dropped += area

    a = Image.frombytes('L', (w, h), bytes(255 if not m else 0 for m in isbg))

    # ---- C. 剝白邊：貼著透明區又接近純白的像素往內剝幾圈 ----
    #   細長的白邊（腳間縫隙、手臂內側）常常小到不夠成一個「洞」，只靠泛洪與洞偵測
    #   會殘留 1~3px 的白線；這裡只吃「貼著透明 + 夠白」的像素，白色毛髮的內部不會被動到。
    if PEEL:
        T = a.point(lambda v: 255 - v)                  # 255 = 透明
        wm = bytearray(w * h)
        for i in range(w * h):
            r, g, b = px[i % w, i // w]
            wm[i] = 255 if (min(r, g, b) >= 240 and max(r, g, b) - min(r, g, b) <= 12) else 0
        W = Image.frombytes('L', (w, h), bytes(wm))
        for _ in range(PEEL):
            near = T.filter(ImageFilter.MaxFilter(3))   # 自己或鄰居是透明
            add = ImageChops.multiply(W, near.point(lambda v: 255 if v == 255 else 0))
            if add.getbbox() is None:
                break
            T = ImageChops.lighter(T, add)
        a = T.point(lambda v: 255 - v)

    if ERODE:
        a = a.filter(ImageFilter.MinFilter(ERODE * 2 + 1))    # 收邊
    if FEATHER:
        a = a.filter(ImageFilter.GaussianBlur(FEATHER))

    out = rgb.convert('RGBA')
    out.putalpha(a)

    # ---- D. 去白前乘：半透明邊緣還原成角色真正的顏色，避免白邊 ----
    ap = out.load()
    for y in range(h):
        for x in range(w):
            al = ap[x, y][3]
            if 0 < al < 250:
                k = al / 255.0
                if k < .18:
                    continue
                r, g, b, _ = ap[x, y]
                ap[x, y] = (max(0, min(255, int((r - 255 * (1 - k)) / k))),
                            max(0, min(255, int((g - 255 * (1 - k)) / k))),
                            max(0, min(255, int((b - 255 * (1 - k)) / k))), al)

    bbox = out.split()[3].point(lambda v: 255 if v > 12 else 0).getbbox()
    if bbox:
        pad = 6
        bbox = (max(0, bbox[0] - pad), max(0, bbox[1] - pad),
                min(w, bbox[2] + pad), min(h, bbox[3] + pad))
        out = out.crop(bbox)
    return out, hole_area + gap_area + crev_area, dropped


def cut(src, dst=None, tol=TOL, verbose=True):
    """從生圖原檔（白底／棋盤格）摳出角色。"""
    rgb = Image.open(src).convert('RGB')
    w, h = rgb.size
    px = rgb.load()
    pal = bg_palette(px, w, h)
    bright = max(max(p) for p in pal) >= 200     # 這批圖是白底還是棋盤格

    def is_bg(c):
        # 背景一定是「中性色」（純白或灰棋盤格）。有彩度的像素（淡藍毛、粉頰、奶油白偏暖）
        # 一律不動 —— 否則 TOL=34 會把角色的淺色毛當背景挖出黑洞。
        if not _neutral(c):
            return False
        if min(dist(c, p) for p in pal) <= tol:
            return True
        # 白底圖：貼地陰影／柔邊會是 205~250 的中性灰，不一起吃掉就會留一圈灰
        if bright and min(c) >= 206:
            return True
        return False

    isbg = bytearray(w * h)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            i = y * w + x
            if is_bg(px[x, y]) and not isbg[i]:
                isbg[i] = 1; q.append(i)
    for y in range(h):
        for x in (0, w - 1):
            i = y * w + x
            if is_bg(px[x, y]) and not isbg[i]:
                isbg[i] = 1; q.append(i)
    while q:
        i = q.popleft()
        x, y = i % w, i // w
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h:
                j = ny * w + nx
                if not isbg[j] and is_bg(px[nx, ny]):
                    isbg[j] = 1; q.append(j)

    out, hole, junk = _finish(rgb, isbg, w, h)
    if dst:
        out.save(dst, 'PNG', optimize=True)
    if verbose:
        print('%-44s %s  hole %d  junk %d' % (os.path.basename(src), out.size, hole, junk))
    return out


def fix(path, dst=None, verbose=True):
    """補救已經摳過、但還留著白底／白邊的 RGBA 圖（就地覆寫）。"""
    im = Image.open(path).convert('RGBA')
    w, h = im.size
    al = im.split()[3].load()
    isbg = bytearray(1 if al[i % w, i // w] < 128 else 0 for i in range(w * h))
    rgb = im.convert('RGB')
    out, hole, junk = _finish(rgb, isbg, w, h)
    out.save(dst or path, 'PNG', optimize=True)
    if verbose:
        print('%-44s %s  hole %d  junk %d' % (os.path.basename(path), out.size, hole, junk))
    return out


if __name__ == '__main__':
    args = sys.argv[1:]
    if args and args[0] == '--fix':
        for p in args[1:]:
            fix(p)
    else:
        for i in range(0, len(args), 2):
            cut(args[i], args[i + 1])
