# -*- coding: utf-8 -*-
"""依使用者標記圖修正去背瑕疵。

標記規則（使用者定義）：
  綠色塗料 = 該處還有「沒去掉的白色背景」→ 要把近白像素清成透明
  紅色塗料 = 去過頭，刪到本體 → 要從 AI 原圖（_raw）把本體補回來

用法：
  python fix_marked.py preview   # 只輸出對齊檢查圖到 _fixpreview/
  python fix_marked.py apply     # 實際寫回成品 PNG（先備份到 _bak/）
"""
import os, sys, glob, shutil
import numpy as np
from PIL import Image, ImageFilter

BASE = os.path.dirname(os.path.abspath(__file__))
DL = 'C:/Users/jon84/Downloads/'
OUT_PREV = os.path.join(BASE, '_fixpreview')

# 成品檔, 標記圖, 原圖（_raw 內第 n 張，1-based 依編號順序）
# 第 4 欄 = 這張標記圖「要處理哪一種顏色」：
#   使用者只在這 9 張裡塗了兩種顏色，但每張只有一種是「真的標記」——
#   另一色的零星像素是角色的本體色（章魚粉紫、飛艇暗紅…），照著處理會把本體挖壞。
PAIRS = [
    ('stage6/03-ghost.png',      '1793633056622', 3, 'red'),    # 頭頂被挖空 → 從原圖補回
    ('stage8/02-imp.png',        '1793633178444', 2, 'green'),
    ('stage5/03-robot.png',      '1793632954053', 3, 'green'),
    ('stage7/03-sapper.png',     '1793633149947', 3, 'green'),
    ('stage7/04-thunder.png',    '1793633131381', 4, 'green'),   # 金色雷球（原本誤配到 bomber）
    ('stage7/02-airship.png',    '1793633089884', 2, 'green'),
    ('stage6/01-octopus.png',    '1793633018436', 1, 'green'),
    ('stage5/04-pulser.png',     '1793632988684', 4, 'green'),
    ('stage8/06-deathknight.png','1793633209555', 6, 'green'),
]


def load_mark(fid):
    """回傳 (green_mask, red_mask, body_mask) —— 標記圖座標"""
    im = Image.open(DL + fid + '.jpg').convert('RGB')
    a = np.asarray(im).astype(np.int16)
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    green = (r < 70) & (g > 130) & (b < 90)
    red = (r > 150) & (g < 70) & (b < 70)
    # 背景色 = 左上角；本體 = 與背景差很多
    bg = a[2, 2]
    diff = np.abs(a - bg).max(axis=2)
    body = diff > 26
    return im, green, red, body


def bbox_of(mask):
    ys, xs = np.where(mask)
    if len(xs) == 0:
        return None
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def shrink(mask, k):
    h, w = mask.shape
    h2, w2 = h // k, w // k
    m = mask[:h2 * k, :w2 * k].reshape(h2, k, w2, k).any(axis=(1, 3))
    return m


def best_shift(fin_alpha, raw_body, guess, span=10):
    """找位移 (dx,dy)：使得 raw 座標 = 成品座標 + (dx,dy)。
       成品就是 raw 去背後的 bbox 裁切，所以先用 bbox 差當初值，再小範圍微調到 IoU 最好。"""
    k = 4
    fa = shrink(fin_alpha, k)
    rb = shrink(raw_body, k)
    H, W = fa.shape
    gx, gy = int(round(guess[0] / k)), int(round(guess[1] / k))
    best = (-1.0, guess[0], guess[1])
    for ddy in range(-span // k, span // k + 1):
        for ddx in range(-span // k, span // k + 1):
            dx, dy = gx + ddx, gy + ddy
            ys0 = max(0, -dy); ys1 = min(H, H - dy)
            xs0 = max(0, -dx); xs1 = min(W, W - dx)
            if ys1 <= ys0 or xs1 <= xs0:
                continue
            sub_r = rb[ys0 + dy:ys1 + dy, xs0 + dx:xs1 + dx]
            sub_f = fa[ys0:ys1, xs0:xs1]
            inter = np.logical_and(sub_r, sub_f).sum()
            union = np.logical_or(sub_r, sub_f).sum()
            if union == 0:
                continue
            iou = inter / union
            if iou > best[0]:
                best = (iou, dx * k, dy * k)
    return best[1], best[2], best[0]


def alpha_from_white(rgb, soft=14.0, floor=3.0):
    """白底 → alpha：離純白越遠越不透明（淡藍白高光 d≈15 也會被留下來）"""
    a = rgb.astype(np.float32)
    d = (255.0 - a).max(axis=-1)          # 支援 (H,W,3) 與 (N,3) 兩種
    al = np.clip((d - floor) / soft, 0.0, 1.0)
    return (al * 255).astype(np.uint8)


def run(mode):
    os.makedirs(OUT_PREV, exist_ok=True)
    report = []
    for rel, fid, rawn, cmode in PAIRS:
        path = os.path.join(BASE, rel)
        fin = Image.open(path).convert('RGBA')
        W, H = fin.size
        fa = np.asarray(fin)[:, :, 3]

        raw_files = sorted(glob.glob(os.path.join(BASE, os.path.dirname(rel), '_raw', '*.png')))
        raw = Image.open(raw_files[rawn - 1]).convert('RGB')

        ra = np.asarray(raw).astype(np.int16)
        raw_body = (255 - ra).max(axis=2) > 4           # 非純白

        fb0 = bbox_of(fa > 40)
        rb0 = bbox_of(raw_body)
        guess = (rb0[0] - fb0[0], rb0[1] - fb0[1])      # 成品是 raw 的 bbox 裁切
        dx, dy, iou = best_shift(fa > 40, raw_body, guess)

        mark, gmask, rmask, mbody = load_mark(fid)
        mw, mh = mark.size
        mb = bbox_of(mbody)
        fb = bbox_of(fa > 40)
        # 標記圖 → 成品座標的等比縮放
        if mb and fb:
            sx = (fb[2] - fb[0]) / max(1, (mb[2] - mb[0]))
            sy = (fb[3] - fb[1]) / max(1, (mb[3] - mb[1]))
            s = (sx + sy) / 2.0
            ox = fb[0] - mb[0] * s
            oy = fb[1] - mb[1] * s
        else:
            s, ox, oy = 1.0, 0.0, 0.0

        def warp(mask):
            img = Image.fromarray((mask * 255).astype(np.uint8), 'L')
            nw, nh = int(round(mw * s)), int(round(mh * s))
            img = img.resize((nw, nh), Image.NEAREST)
            canvas = Image.new('L', (W, H), 0)
            canvas.paste(img, (int(round(ox)), int(round(oy))))
            m = np.asarray(canvas) > 127
            return m

        gW = warp(gmask) if cmode == 'green' else np.zeros((H, W), bool)
        rW = warp(rmask) if cmode == 'red' else np.zeros((H, W), bool)

        report.append('%s  標記圖 %s  body=%s  scale=%.3f  shift=(%d,%d) IoU=%.3f  綠=%d 紅=%d'
                      % (rel, (mw, mh), mb, s, dx, dy, iou, gW.sum(), rW.sum()))

        if mode == 'preview':
            arr = np.asarray(fin).copy()
            # 棋盤底
            yy, xx = np.mgrid[0:H, 0:W]
            checker = (((yy // 16) + (xx // 16)) % 2 == 0)
            bg = np.where(checker[:, :, None], 210, 160).astype(np.uint8)
            a = arr[:, :, 3:4].astype(np.float32) / 255.0
            comp = (arr[:, :, :3].astype(np.float32) * a + bg * (1 - a)).astype(np.uint8)
            comp[gW] = (comp[gW] * 0.25 + np.array([0, 255, 60]) * 0.75).astype(np.uint8)
            comp[rW] = (comp[rW] * 0.25 + np.array([255, 40, 40]) * 0.75).astype(np.uint8)
            Image.fromarray(comp).save(os.path.join(OUT_PREV, rel.replace('/', '_')))
        else:
            # ── 實作修改 ──
            arr = np.asarray(fin).copy()
            rgb = arr[:, :, :3].astype(np.int16)

            # ① 綠色：清掉沒去乾淨的白底（只動「近白」的像素，不碰本體顏色）
            if gW.any():
                near_white = rgb.min(axis=2) > 196
                kill = gW & near_white
                arr[:, :, 3][kill] = 0
                # 稍微外擴 1px，順便把白邊的柔邊帶掉
                ki = Image.fromarray((kill * 255).astype(np.uint8), 'L').filter(ImageFilter.MaxFilter(3))
                k2 = (np.asarray(ki) > 127) & (rgb.min(axis=2) > 170)
                arr[:, :, 3][k2] = 0

            # ② 紅色：從原圖補回被挖掉的本體
            if rW.any():
                src = np.asarray(raw).astype(np.int16)
                ys, xs = np.where(rW)
                ys2, xs2 = ys + dy, xs + dx
                ok = (ys2 >= 0) & (ys2 < src.shape[0]) & (xs2 >= 0) & (xs2 < src.shape[1])
                ys, xs, ys2, xs2 = ys[ok], xs[ok], ys2[ok], xs2[ok]

                # 原圖是純白底（實測角落 255/255/255）→ d>0 就是本體；d 越小越淡（柔邊）
                d_all = (255 - src).max(axis=2)
                dmap = np.zeros((H, W), np.int16)
                dmap[ys, xs] = np.clip(d_all[ys2, xs2], 0, 255)

                # 先把整塊紅色區域清成透明（連原本殘留的半透明白邊一起清掉），
                # 再從原圖重建；只保留「跟現有不透明本體連得起來」的像素，避免留下白色碎點。
                seed = (arr[:, :, 3] > 30) & (~rW)
                arr[:, :, 3][rW] = 0
                cand = (dmap > 0) & rW
                grow = seed
                for _ in range(90):
                    n4 = np.zeros_like(grow)
                    n4[1:, :] |= grow[:-1, :]
                    n4[:-1, :] |= grow[1:, :]
                    n4[:, 1:] |= grow[:, :-1]
                    n4[:, :-1] |= grow[:, 1:]
                    nxt = grow | (n4 & cand)
                    if np.array_equal(nxt, grow):
                        break
                    grow = nxt
                keep = grow & cand & rW
                if keep.any():
                    ky, kx = np.where(keep)
                    a_new = np.clip((dmap[ky, kx] - 0.5) / 6.0, 0, 1) * 255
                    arr[ky, kx, 0:3] = src[ky + dy, kx + dx]
                    arr[ky, kx, 3] = np.maximum(arr[ky, kx, 3], a_new.astype(np.uint8))

            # ③ 本體內部的「半透明小洞」補滿
            #    （幽靈這種白色角色，去背會把淡白高光當成半透明，留下棋盤格狀的碎點。
            #      判準：alpha 低、又沒有連到圖片邊界的透明區 → 它在本體裡面，補成不透明。）
            if cmode == 'red':
                al = arr[:, :, 3]
                low = al < 175
                out = np.zeros_like(low)
                out[0, :] |= low[0, :]; out[-1, :] |= low[-1, :]
                out[:, 0] |= low[:, 0]; out[:, -1] |= low[:, -1]
                for _ in range(160):
                    n4 = np.zeros_like(out)
                    n4[1:, :] |= out[:-1, :]; n4[:-1, :] |= out[1:, :]
                    n4[:, 1:] |= out[:, :-1]; n4[:, :-1] |= out[:, 1:]
                    nxt = out | (n4 & low)
                    if np.array_equal(nxt, out):
                        break
                    out = nxt
                hole = low & (~out)
                arr[:, :, 3][hole] = 255

            # ④ 收尾：離本體較遠、又幾乎透明的「近白像素」→ 清成透明
            #    （去背留下的白霧／碎點，在深色地圖上看起來像髒點）
            solid = arr[:, :, 3] > 200
            near = np.asarray(Image.fromarray((solid * 255).astype(np.uint8), 'L')
                              .filter(ImageFilter.MaxFilter(9))) > 0
            mn = arr[:, :, 0:3].min(axis=2)
            fog = (~near) & (arr[:, :, 3] < 225) & (mn > 168)
            arr[:, :, 3][fog] = 0

            Image.fromarray(arr, 'RGBA').save(path)
            print('  wrote', rel)

    print('\n'.join(report))


if __name__ == '__main__':
    mode = sys.argv[1] if len(sys.argv) > 1 else 'preview'
    if mode == 'apply':
        bak = os.path.join(BASE, '_bak_v437')
        os.makedirs(bak, exist_ok=True)
        for rel, _, _, _ in PAIRS:
            src = os.path.join(BASE, rel)
            dst = os.path.join(bak, rel.replace('/', '_'))
            if not os.path.exists(dst):
                shutil.copyfile(src, dst)
        print('備份 →', bak)
        for rel, _, _, _ in PAIRS:                       # 每次重跑都先回到原始狀態，結果才會一致
            src = os.path.join(BASE, rel)
            b = os.path.join(bak, rel.replace('/', '_'))
            if os.path.exists(b):
                shutil.copyfile(b, src)
    run(mode)
