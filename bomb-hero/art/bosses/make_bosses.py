# -*- coding: utf-8 -*-
"""
把 8 隻 BOSS 的生圖 → 去背 → 打包成遊戲用的 base64 webp。

輸出：
  art/bosses/b1.png … b8.png     （去背後的透明圖，方便日檢）
  art/bosses/_bosses_game.js     （BOSS_ART 片段，供 patch 進 index.html）
  art/bosses/_boss_report.txt

用法：python make_bosses.py
"""
import os, io, sys, glob, base64
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'foes'))
import bgcut
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
HT = 280            # 遊戲內顯示高度（BOSS 很大，留足夠解析度給手機 DPR2）
QUALITY = 78

# 第幾大關 → 原圖（依生成時間排序）
NAMES = ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8']


def content_bbox(im):
    a = im.split()[3]
    bb = a.getbbox()
    return bb


def _clear_shadow_band(path):
    import numpy as np
    im = Image.open(path).convert('RGBA')
    a = np.array(im)
    h, w = a.shape[:2]
    sub = a[int(h * .9):, :, :]
    rgb = sub[:, :, :3].astype(int)
    mn = rgb.min(axis=2); mx = rgb.max(axis=2)
    kill = (sub[:, :, 3] > 0) & (mn >= 222) & ((mx - mn) < 16)
    sub[:, :, 3] = np.where(kill, 0, sub[:, :, 3])
    a[int(h * .9):, :, :] = sub
    Image.fromarray(a).save(path)


def enc(im):
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=QUALITY, method=6, lossless=False)
    return base64.b64encode(buf.getvalue()).decode('ascii')


def main():
    raws = sorted(glob.glob(os.path.join(ROOT, '_raw', '*.png')), key=os.path.getmtime)
    if len(raws) < 8:
        raise SystemExit('原圖不足 8 張（目前 %d）' % len(raws))
    # b3（雪怪王）：第一版是白毛 + 白底，去背會把臉吃掉 → 改用 _raw2 的冰藍色重繪版
    _b3 = sorted(glob.glob(os.path.join(ROOT, '_raw2', '*.png')), key=os.path.getmtime)
    if _b3:
        raws[2] = _b3[-1]
    out, report, total = [], [], 0
    for i, key in enumerate(NAMES):
        src = raws[i]
        dst = os.path.join(ROOT, key + '.png')
        bgcut.cut(src, dst, verbose=False)
        im = Image.open(dst).convert('RGBA')
        # 清掉腳下殘留的白色貼地陰影帶（只動最底 8% 的近白中性像素，毛色不受影響）
        _clear_shadow_band(dst)
        bb = content_bbox(im)
        if not bb:
            raise SystemExit('%s 去背後沒有內容' % key)
        im = im.crop(bb)
        W0, H0 = im.size
        asp = W0 / float(H0)
        Wt = max(1, int(round(HT * asp)))
        im2 = im.resize((Wt, HT), Image.LANCZOS)
        data = enc(im2)
        total += len(data)
        out.append('  %s: { asp: %.4f, u: "data:image/webp;base64,%s" },' % (key, asp, data))
        report.append('%s  bbox %dx%d  asp %.3f  out %dx%d  %5.1f KB' % (key, W0, H0, asp, Wt, HT, len(data) / 1024.0))

    js = ('// ---------- BOSS 美術（自動生成，勿手改；來源 art/bosses/make_bosses.py）----------\n'
          '// v4.36：八大關卡各一隻主角風格的魔王（毛絨玩具質感，不是寫實）\n'
          'const BOSS_ART = {\n' + '\n'.join(out) + '\n};\n')
    io.open(os.path.join(ROOT, '_bosses_game.js'), 'w', encoding='utf-8', newline='').write(js)
    io.open(os.path.join(ROOT, '_boss_report.txt'), 'w', encoding='utf-8', newline='').write('\n'.join(report))
    print('\n'.join(report))
    print('---- 合計 base64 %.0f KB ----' % (total / 1024.0))


if __name__ == '__main__':
    main()
