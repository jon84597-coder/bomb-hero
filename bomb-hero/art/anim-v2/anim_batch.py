"""anim_batch.py — 把影片幀批次轉成「遊戲畫布尺寸」的動畫格

用法：
    python anim_batch.py <動作名> <幀目錄> <起始幀> <結束幀> [--loop] [--out N]

與 vid2frames.py 的差異（重要）：
  1. **整支影片只用一個腳底偏移、一個水平中心**（取中位數），不逐幀貼地。
     逐幀貼地會把「跳躍」壓回地面、把「呼吸起伏」壓平。
  2. 循環動作自動找「首尾剪影最像」的段落，再均勻抽 N 格。
  3. 一次性動作整段均勻抽 N 格。
  4. 放大後才 despill（LANCZOS/BICUBIC 會重新製造洋紅環）。
"""
import sys, os, glob, json
import numpy as np
from PIL import Image
from vid2frames import key_bg, despill, biggest, anchor, CANVAS_W, CANVAS_H, FOOT_Y, CENTER_X

REF_H = 640       # 站姿身高（五支影片第 1 幀實測一致）
TARGET_H = 1069   # 遊戲角色實測高度，五支動作與走路全部對齊到這個值


def find_loop(placed, lo=18, hi=60):
    def sig(im):
        a = np.array(im)[:, :, 3] > 40
        return np.array(Image.fromarray((a * 255).astype(np.uint8)).resize((90, 156), Image.BILINEAR)) > 100

    sigs = np.array([sig(im) for im in placed], dtype=np.float32)
    best = None
    for L in range(lo, min(hi, len(sigs) - 3) + 1):
        diff = np.abs(sigs[:-L] - sigs[L:]).mean(axis=(1, 2))
        sc = float(diff.mean())
        if best is None or sc < best[0]:
            best = (sc, L, int(np.argmin(diff)))
    return best


def run(name, srcdir, start, end, loop, nout=12, ref_h=None, outdir='frames_anim',
        canvas_w=None, center_x=None):
    files = sorted(glob.glob(os.path.join(srcdir, '*.png')))[start - 1:end]
    if not files:
        raise SystemExit('沒有幀：%s [%d,%d]' % (srcdir, start, end))
    arrs = [biggest(key_bg(Image.open(f)), 1) for f in files]
    A = [anchor(a) for a in arrs]
    hs = np.array([x[0] for x in A])
    # 縮放基準必須是「站姿身高」，不能用身高中位數：
    # 舉手／跳躍會把手臂算進 bbox，令 k 變小、角色本體被縮小 → 切動作會跳。
    # 值要「逐支量」而不是整隻角色共用一個：影片模型每次的鏡位不完全一樣，
    #   兔子四支剛好都 640，小熊五支是 641~644（差 0.5%，共用會讓某支動作整體大／小一點）。
    med = ref_h if ref_h else REF_H
    k = TARGET_H / float(med)
    foot = int(A[0][1])                                # 第一幀腳底為固定基線
    cx = float(A[0][2])                                # 第一幀頭部質心為固定水平中心

    placed = []
    for ar in arrs:
        im = Image.fromarray(ar, 'RGBA')
        s = np.array(im.resize((max(1, int(im.width * k)), max(1, int(im.height * k))), Image.BICUBIC))
        s = despill(s)
        cv = Image.new('RGBA', (canvas_w or CANVAS_W, CANVAS_H), (0, 0, 0, 0))
        cv.alpha_composite(Image.fromarray(s, 'RGBA'),
                           (int(round((center_x or CENTER_X) - cx * k)), int(round(FOOT_Y - foot * k))))
        placed.append(cv)

    info = {'action': name, 'k': round(k, 4), 'median_h': med, 'src_frames': len(files),
            'canvas_w': canvas_w or CANVAS_W, 'center_x': center_x or CENTER_X,
            'foot': foot, 'cx': round(cx, 1), 'height_var_pct': round(100.0 * (hs.max() - hs.min()) / med, 2)}

    if loop:
        sc, L, off = find_loop(placed)
        seg = placed[off:off + L]
        info.update({'loop': True, 'loop_len': L, 'loop_start': off, 'loop_score': round(sc, 4)})
        print('  %s 循環：%d 幀（%.2fs）起點 %d 剪影差 %.4f' % (name, L, L / 24.0, off, sc))
    else:
        seg = placed
        info.update({'loop': False})
        print('  %s 一次性：%d 幀' % (name, len(seg)))

    idx = np.linspace(0, len(seg) - 1, nout).round().astype(int)
    out = os.path.join(outdir, name)
    os.makedirs(out, exist_ok=True)
    for j, i in enumerate(idx):
        seg[i].save(os.path.join(out, '%02d.png' % j))

    # 量測
    def prof(im):
        a = np.array(im)[:, :, 3]
        ys = np.where((a > 8).any(axis=1))[0]
        if not len(ys):
            return 0, 0, 0
        y0, y1 = int(ys.min()), int(ys.max())
        h = y1 - y0 + 1
        ext = []
        for y in range(y0, y1 + 1):
            xs = np.where(a[y] > 60)[0]
            ext.append(int(xs.max() - xs.min() + 1) if len(xs) else 0)
        ext = np.array(ext)
        return h, int(ext[:int(h * .42)].max()), y1

    P = [prof(seg[i]) for i in idx]
    hh = np.array([p[0] for p in P]); hw = np.array([p[1] for p in P]); bt = np.array([p[2] for p in P])
    info.update({'out_frames': nout, 'h_min': int(hh.min()), 'h_max': int(hh.max()),
                 'headw_min': int(hw.min()), 'headw_max': int(hw.max()),
                 'baseline_min': int(bt.min()), 'baseline_max': int(bt.max())})
    print('  輸出 %d 格  高 %d~%d  頭寬 %d~%d  腳底 %d~%d'
          % (nout, hh.min(), hh.max(), hw.min(), hw.max(), bt.min(), bt.max()))
    json.dump(info, open(os.path.join(out, 'meta.json'), 'w'), ensure_ascii=False, indent=1)
    return info


# 每隻角色：輸出資料夾 + 工作清單 (動作, 幀目錄, 起, 迄, 循環?, 格數, 該支影片第1幀站立高度)
JOBS = {
    'rabbit': ('frames_anim', 900, 450, [
        ('idle',    'vid/idle2/fr',  1, 72, True,  12, 640),
        ('throw',   'vid/throw/fr',  22, 124, False, 12, 640),  # 前 21 幀是「抱胸皺眉」，不是投擲
        ('hurt',    'vid/hurt/fr',   1, 124, False, 12, 640),
        ('victory', 'vid/victory/fr', 28, 46, False, 12, 640),   # 一次完整跳躍（28 起跳前站地、46 落地）
        # v5.92：改回原始幀。舊版跑 fix_ball.py 想挖掉「模型畫的球」，
        #   但這支影片根本沒有球 —— 圓擬合抓到的是兩隻耳朵的上緣，
        #   挖掉的其實是耳朵 → 頭上多一個透明大洞（看起來像多一顆白球）。
        ('hold',    'vid/hold/fr',   1, 124, True, 12, 640),
    ]),
    # 小熊（v5.94）：走路也走這支管線，五套共用同一個縮放／錨點邏輯。
    #   畫布 1080 寬（兔子 900）：小熊胖，站著 0.71 寬高比，手臂一甩就到 ±531，
    #   塞進 900 會被切掉兩側手掌 —— 這是「同一高度下熊比兔寬」的必然結果。
    #   throw 從缺：三次生成都失敗（球變綠／洋紅底被換成綠／人趴到地上）。
    #   hurt 從缺：兩次生成都有異物（v2 臉上橫一根咖啡色棍子；v1 整個人往右滑出畫面 168px）。
    'bear':   ('frames_anim_bear', 1080, 540, [
        ('walk',    'vid/bear-walk/fr',    1, 124, True, 12, 644),
        ('idle',    'vid/bear-idle/fr',    1, 124, True, 12, 641),
        ('hold',    'vid/bear-hold/fr',    1, 124, True, 12, 643),
        # 36~104 才是「捶完胸→雙臂張開吼」那一段。整段 1~124 讓它自動找循環時，
        #   它會挑到「捶胸」那段（剪影差最小），雙臂怒吼整個被跳過。
        ('victory', 'vid/bear-victory/fr', 36, 104, True, 12, 642),
    ]),
}

if __name__ == '__main__':
    who = sys.argv[1] if len(sys.argv) > 1 else 'rabbit'
    only = sys.argv[2] if len(sys.argv) > 2 else None
    if who not in JOBS:
        raise SystemExit('沒有這隻角色：%s（可用：%s）' % (who, ', '.join(JOBS)))
    outdir, cw, cx0, jobs = JOBS[who]
    for name, d, a, b, lp, n, rh in jobs:
        if only and only != name:
            continue
        print('=== %s / %s ===' % (who, name))
        run(name, d, a, b, lp, n, ref_h=rh, outdir=outdir, canvas_w=cw, center_x=cx0)
