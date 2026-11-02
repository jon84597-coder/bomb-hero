# -*- coding: utf-8 -*-
"""
從 torso.png 再切出「左臂 / 右臂」，並輸出挖掉手臂的 torsoB.png。
切口框用「軀幹層矩形的比例」定義（每隻手長在不同高度，見 ARMS）。

規則：
- arm 圖層 = 框內像素 ∩ alpha，且整個框向外擴 6px（SOCKET），
  這樣手臂疊回原位時與軀幹重疊 6px，小幅旋轉不會露出縫。
- torsoB = torso 原圖減去「未擴張」的框 → 手臂原本佔的洞。
- 手臂 pivot = 框上緣中心（肩關節）。

用法：python bomb-hero/art/foes/split_arms.py
輸出：heroes/layers/<id>/{armL,armR,torsoB}.png，並更新 _layers.json 的 layers 與 pivots。
"""
import io, json, os
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
LD = os.path.join(HERE, 'heroes', 'layers')
IDS = ['01-rabbit', '02-bear', '03-dog', '04-cat',
       '05-pig', '06-panda', '07-frog', '08-chick']
SOCKET = 6          # 手臂與軀幹的重疊像素

# 每隻的左右臂框：[x0, y0, x1, y1]，單位＝軀幹層寬高的比例
# None = 這隻沒有可切的手臂（熊貓兩手在胸前交握，切了會切到胸口）
ARMS = {
    '01-rabbit': {'L': [0.00, 0.42, 0.20, 0.96], 'R': [0.80, 0.42, 1.00, 0.96]},
    '02-bear':   {'L': [0.00, 0.18, 0.23, 0.80], 'R': [0.77, 0.18, 1.00, 0.80]},
    '03-dog':    {'L': [0.00, 0.40, 0.20, 0.94], 'R': [0.80, 0.40, 1.00, 0.94]},
    '04-cat':    {'L': [0.00, 0.30, 0.17, 0.78], 'R': None},
    '05-pig':    {'L': [0.00, 0.28, 0.20, 0.90], 'R': [0.80, 0.28, 1.00, 0.90]},
    '06-panda':  {'L': None, 'R': None},
    '07-frog':   {'L': [0.00, 0.24, 0.16, 0.82], 'R': [0.84, 0.30, 1.00, 0.88]},
    '08-chick':  {'L': [0.00, 0.33, 0.15, 0.88], 'R': [0.85, 0.33, 1.00, 0.88]},
}


def box_px(ly, f):
    # 注意：torso.png 本身已是裁切圖，座標系是「層內局部」(0..w, 0..h)
    return (int(f[0] * ly['w']), int(f[1] * ly['h']),
            int(f[2] * ly['w']), int(f[3] * ly['h']))


def cut(arr, bx, grow):
    """回傳 (圖層 cropped RGBA, 圖層 rect, 遮罩 bool[H,W])：框 ∩ alpha，框可外擴 grow"""
    x0, y0, x1, y1 = bx
    x0 -= grow; y0 -= grow; x1 += grow; y1 += grow
    m = np.zeros(arr.shape[:2], bool)
    m[max(0, y0):y1, max(0, x0):x1] = True
    m &= arr[:, :, 3] > 8
    if m.sum() < 200:
        return None, None, None
    ys, xs = np.where(m)
    rx0, ry0, rx1, ry1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    out = arr[ry0:ry1, rx0:rx1].copy()
    out[:, :, 3] = np.where(m[ry0:ry1, rx0:rx1], out[:, :, 3], 0)
    return out, [int(rx0), int(ry0), int(rx1 - rx0), int(ry1 - ry0)], m


def main():
    meta = json.load(io.open(os.path.join(LD, '_layers.json'), encoding='utf-8'))
    sheet = Image.new('RGB', (340 * 4, 280 * 2), (18, 22, 28))
    for i, rid in enumerate(IDS):
        d = os.path.join(LD, rid)
        t = np.array(Image.open(os.path.join(d, 'torso.png')).convert('RGBA'))
        ly = meta[rid]['layers']['torso']
        cfg = ARMS.get(rid, {'L': None, 'R': None})
        hole = np.zeros(t.shape[:2], bool)

        for key in ('L', 'R'):
            f = cfg.get(key)
            if not f:
                meta[rid]['layers'].pop('arm' + key, None)
                meta[rid].setdefault('pivots', {}).pop('arm' + key, None)
                continue
            bx = box_px(ly, f)
            img, rect, _ = cut(t, bx, SOCKET)          # 手臂（含 6px socket）
            if img is None:
                print('  %s arm%s 空框，跳過' % (rid, key)); continue
            Image.fromarray(img).save(os.path.join(d, 'arm%s.png' % key), 'PNG', optimize=True)
            meta[rid]['layers']['arm' + key] = {'x': rect[0] + ly['x'], 'y': rect[1] + ly['y'],
                                                'w': rect[2], 'h': rect[3]}
            # pivot＝肩：框上緣中心（用未外擴的框算）
            meta[rid].setdefault('pivots', {})['arm' + key] = [
                int((bx[0] + bx[2]) / 2) + ly['x'], int(bx[1] + 2) + ly['y']]
            _, _, m = cut(t, bx, 0)
            if m is not None:
                hole |= m

        # torsoB：挖掉未外擴的手臂框
        tb = t.copy()
        tb[:, :, 3] = np.where(hole, 0, tb[:, :, 3])
        Image.fromarray(tb).save(os.path.join(d, 'torsoB.png'), 'PNG', optimize=True)
        meta[rid]['layers']['torsoB'] = dict(ly)

        # 檢查圖：灰底＝torsoB、綠＝armL、紅＝armR
        bg = Image.new('RGBA', (t.shape[1], t.shape[0]), (0, 0, 0, 0))
        bg.alpha_composite(Image.fromarray(tb))
        for key, col in (('armL', (60, 255, 120, 150)), ('armR', (255, 90, 90, 150))):
            p = os.path.join(d, key.replace('arm', 'arm') + '.png')
            if not os.path.exists(p):
                continue
            im = Image.open(p).convert('RGBA')
            a = np.array(im); a[:, :, 0] = col[0]; a[:, :, 1] = col[1]; a[:, :, 2] = col[2]
            tinted = Image.fromarray(a)
            bg.alpha_composite(tinted, (meta[rid]['layers'][key]['x'] - ly['x'],
                                        meta[rid]['layers'][key]['y'] - ly['y']))
        s = min((340 - 30) / bg.width, (280 - 34) / bg.height)
        sm = bg.resize((int(bg.width * s), int(bg.height * s)), Image.LANCZOS)
        cell = Image.new('RGB', (340, 280), (18, 22, 28))
        cell.paste(sm, ((340 - sm.width) // 2, 22))
        ImageDraw.Draw(cell).text((8, 6), '%s  sock=%d' % (rid, SOCKET), fill=(190, 215, 255))
        sheet.paste(cell, ((i % 4) * 340, (i // 4) * 280))
        print('%-11s arms=%s' % (rid, [k for k in ('armL', 'armR') if k in meta[rid]['layers']]))

    io.open(os.path.join(LD, '_layers.json'), 'w', encoding='utf-8', newline='').write(
        json.dumps(meta, ensure_ascii=False, indent=1))
    sheet.save(os.path.join(HERE, '_armcheck.png'))
    print('→ _armcheck.png')


if __name__ == '__main__':
    main()
