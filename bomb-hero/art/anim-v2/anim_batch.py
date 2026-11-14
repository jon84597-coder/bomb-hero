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


def find_loop(sigs, lo=18, hi=60):
    """sigs 是每格的剪影簽章（bool 陣列），已經含擺位資訊。"""
    sigs = np.array(sigs, dtype=np.float32)
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
    # v6.0：ref_h 傳 0／None 時，改用「這個範圍的第 1 幀身高」——
    #   新增角色不必再逐支人工量，而且第 1 幀一定剛好落在 TARGET_H、腳底 1360。
    med = ref_h if ref_h else float(hs[0])
    k = TARGET_H / float(med)
    foot = int(A[0][1])                                # 第一幀腳底為固定基線
    cx = float(A[0][2])                                # 第一幀頭部質心為固定水平中心
    CW = canvas_w or CANVAS_W
    CX0 = center_x or CENTER_X

    def place(ar):
        im = Image.fromarray(ar, 'RGBA')
        s = np.array(im.resize((max(1, int(im.width * k)), max(1, int(im.height * k))), Image.BICUBIC))
        s = despill(s)
        cv = Image.new('RGBA', (CW, CANVAS_H), (0, 0, 0, 0))
        cv.alpha_composite(Image.fromarray(s, 'RGBA'),
                           (int(round(CX0 - cx * k)), int(round(FOOT_Y - foot * k))))
        return cv

    def sig(im):
        a = np.array(im)[:, :, 3] > 40
        return np.array(Image.fromarray((a * 255).astype(np.uint8)).resize((90, 156), Image.BILINEAR)) > 100

    # 兩段式：先逐格算剪影簽章就丟掉畫布，選好段落後才重建那 12 格。
    #   （貓的畫布 1500x1560，124 張同時留在記憶體會吃到 1.1GB 直接被系統砍掉。）
    sigs = []
    for ar in arrs:
        cv = place(ar)
        sigs.append(sig(cv))
        del cv

    info = {'action': name, 'k': round(k, 4), 'median_h': med, 'src_frames': len(files),
            'canvas_w': CW, 'center_x': CX0,
            'foot': foot, 'cx': round(cx, 1), 'height_var_pct': round(100.0 * (hs.max() - hs.min()) / med, 2)}

    if loop:
        sc, L, off = find_loop(sigs)
        seg = list(range(off, off + L))
        info.update({'loop': True, 'loop_len': L, 'loop_start': off, 'loop_score': round(sc, 4)})
        print('  %s 循環：%d 幀（%.2fs）起點 %d 剪影差 %.4f' % (name, L, L / 24.0, off, sc))
    else:
        seg = list(range(len(arrs)))
        info.update({'loop': False})
        print('  %s 一次性：%d 幀' % (name, len(seg)))

    idx = np.linspace(0, len(seg) - 1, nout).round().astype(int)
    out = os.path.join(outdir, name)
    os.makedirs(out, exist_ok=True)
    placed = {}
    for j, i in enumerate(idx):
        cv = place(arrs[seg[i]])
        cv.save(os.path.join(out, '%02d.png' % j))
        placed[j] = cv

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

    P = [prof(placed[j]) for j in range(nout)]
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
        # v5.95：throw 改「上拋接住」。第一支（throw4）模型跟著球推近鏡頭 → 腳被切；
        #   throw5 加上「鏡頭鎖死、球可以飛出畫面上緣」後腳底穩定在 704，可用。
        ('throw',   'vid/bear-throw5/fr',  1, 124, False, 12, 640),
        # v5.95：hurt 改「後仰縮身、雙手護頭」（臉前不再有異物、也不位移）。一次性。
        ('hurt',    'vid/bear-hurt3/fr',   1, 124, False, 12, 640),
    ]),
    # v5.95：900 太窄 —— victory 雙手張開時 x 已經頂到 0（被左邊界切掉），改 1000／500。
    'dog':    ('frames_anim_dog', 1000, 500, [
        # 1~80 才有「不耐煩擺動 → 低頭」那段；整段 1~124 自動找循環會挑到 105 之後幾乎不動的尾巴。
        ('walk',    'vid/dog-walk2/fr',    1, 124, True, 12, 638),
        ('idle',    'vid/dog-idle/fr',     1, 80, True, 12, 639),
        ('victory', 'vid/dog-victory/fr',  1, 124, False, 12, 638),
        # hold：第一支洋紅底變彩虹（黃→綠→青）；hold2 加上「背景全程不得變色」後通過。
        ('hold',    'vid/dog-hold2/fr',    1, 124, True, 12, 638),
        # v5.97：hurt（後仰縮身護頭）。第一支就過：底色 124 幀全穩、臉上沒有異物。
        ('hurt',    'vid/dog-hurt4/fr',    1, 124, False, 12, 639),
    ]),
    # 貓咪（v5.97）：貓的尾巴又長又往外甩 —— 實測需要右側 0.70H、左側 0.51H 的空間，
    #   1500 寬畫布（左右各 750）才不會把尾巴切掉。格子 281 因此比其他角色寬。
    'cat':    ('frames_anim_cat', 1500, 750, [
        ('walk',    'vid/cat-walk/fr',     1, 124, True, 12, 634),
        # 1~56：第 60~62 幀尾巴甩到右邊界（會出現直切邊）。
        ('idle',    'vid/cat-idle/fr',     1, 56, True, 12, 635),
        # v6.0：改吃 hold2（key_flat 去背版）。舊的 cat-hold 第 64 幀起洋紅被換成綠幕；
        #   hold2 的第 30 幀之後球才穩定出現在腰側（球心離腳底 0.486H、往左 0.274H），
        #   所以從 30 開始截，整段都有球、可以無縫循環。
        # v6.0：hold 改吃 hold3（球抱在腰側、雙手托著、球跟頭一樣大）。
        #   hold2 的球在 0.58H 的胸口，遊戲炸彈半徑 0.213H → 上緣會蓋到眼睛，作廢。
        # 前 10 幀球還沒出現（模型先擺手勢才把球放下來）→ 從 20 開始截，整段都有球。
        ('hold',    'vid/cat-hold3/flat', 20, 124, True, 12, 0),
        ('victory', 'vid/cat-victory/fr',  1, 124, False, 12, 636),
        # hurt 改吃 hurt3（後仰縮身護頭；前兩支頭上會冒出青綠球體）。
        ('hurt',    'vid/cat-hurt3/flat',  1, 124, False, 12, 0),
        # throw：使用者指示「丟炸彈動作不再生成」（遊戲端本來就沒播這套）。
    ]),
    # 豬豬（v6.0）：圓滾滾又背小背包，站姿 0.72 寬高比；雙手一張（勝利）到 0.50H，
    #   畫布用 1120（左右各 560＝0.52H）才不會切到手掌。
    #   hold 從缺：第一支把球頂在頭上、腳下多了一條深灰地面陰影、眼睛還發粉光 → 重生成中。
    'pig':    ('frames_anim_pig', 1120, 560, [
        ('walk',    'vid/pig-walk/flat',    1, 124, True, 12, 644),
        # v6.0：改吃 idle2（站著彈腳跟、拍肚子）。原本的 idle 1~62 是「低頭聞地」，
        #   整隻縮成一顆球，剪影跟站姿差太多；80 之後雖然站定但幾乎不動。
        ('idle',    'vid/pig-idle2/flat',   1, 124, True, 12, 0),
        ('victory', 'vid/pig-victory/flat', 1, 124, False, 12, 644),
        ('hurt',    'vid/pig-hurt/flat',    1, 124, False, 12, 644),
        # v6.0：hold 重生成（第一支把球頂在頭上、腳下有深灰地面陰影、眼睛發粉光）。
        ('hold',    'vid/pig-hold2/flat',   1, 124, True, 12, 0),
    ]),
    # 熊貓（v6.0）：膽小貼身走，勝利張手到 0.54H、受傷甩手到 0.59H → 畫布 1288（左右各 644）。
    'panda':  ('frames_anim_panda', 1288, 644, [
        ('walk',    'vid/panda-walk/flat',    1, 124, True, 12, 0),
        ('idle',    'vid/panda-idle/flat',    1, 124, True, 12, 0),
        ('hold',    'vid/panda-hold/flat',    1, 124, True, 12, 0),
        ('victory', 'vid/panda-victory/flat', 1, 124, False, 12, 0),
        ('hurt',    'vid/panda-hurt/flat',    1, 124, False, 12, 0),
    ]),
    # 青蛙（v6.0）：勝利大字張開到 0.60H → 畫布 1308（左右各 654）。
    'frog':   ('frames_anim_frog', 1308, 654, [
        ('walk',    'vid/frog-walk/flat',    1, 124, True, 12, 0),
        ('idle',    'vid/frog-idle/flat',    1, 124, True, 12, 0),
        ('hold',    'vid/frog-hold/flat',    1, 124, True, 12, 0),
        ('victory', 'vid/frog-victory/flat', 1, 124, False, 12, 0),
        ('hurt',    'vid/frog-hurt/flat',    1, 124, False, 12, 0),
    ]),
    # 小雞（v6.0）：圓滾滾，翅膀一張到 0.62H → 畫布 1352（左右各 676）。
    # ---- v6.1：三隻隨從（武士狼／爆彈猴／盾犀）----
    #   動作名稱跟主角不同：idle 待機／move 移動／attack 攻擊／hurt 被打／victory 勝利。
    #   畫布一律 1340／中心 670 —— 這是「768 影片 × 1.72 倍」的全寬（1322），也就是
    #   完整保留影片裡所有內容。第一版給 1080／1180，結果狼的刀光弧、犀牛的盾、
    #   猴子的尾巴都被畫布邊界切掉（貼邊 200~900px），匯出後會出現一條直切口。
    #   空白留著沒關係：export_pet 會依「實際內容」重新緊裁，格子不會變大。
    #   高度一律 1560、腳底 1360，跟主角同一套對齊。
    #   第二版（*2 目錄）：第一版有 7~10% 的鏡頭推近，12 格精靈會忽大忽小 →
    #   提示詞前面加「STATIC LOCKED CAMERA, FIXED FRAMING」＋「body height in pixels stays
    #   EXACTLY the same」後重出，底線全部穩定在 705~707。
    'pet_wolf':   ('frames_pet_wolf', 1340, 670, [
        ('idle',    '../pet-video/wolf-idle/flat',    1, 124, True,  12, 0),
        ('move',    '../pet-video/wolf-move2/flat',    1, 124, True,  12, 0),
        ('attack',  '../pet-video/wolf-attack2/flat',  1, 124, False, 12, 0),
        ('hurt',    '../pet-video/wolf-hurt2/flat',    1, 124, False, 12, 0),
        ('victory', '../pet-video/wolf-victory2/flat', 1, 124, False, 12, 0),
    ]),
    'pet_monkey': ('frames_pet_monkey', 1340, 670, [
        ('idle',    '../pet-video/monkey-idle/flat',    1, 124, True,  12, 0),
        ('move',    '../pet-video/monkey-move/flat',    1, 124, True,  12, 0),
        ('attack',  '../pet-video/monkey-attack2/flat',  1, 124, False, 12, 0),
        ('hurt',    '../pet-video/monkey-hurt/flat',    1, 124, False, 12, 0),
        ('victory', '../pet-video/monkey-victory2/flat', 1, 124, False, 12, 0),
    ]),
    'pet_rhino':  ('frames_pet_rhino', 1340, 670, [
        ('idle',    '../pet-video/rhino-idle/flat',    1, 124, True,  12, 0),
        ('move',    '../pet-video/rhino-move2/flat',    1, 124, True,  12, 0),
        ('attack',  '../pet-video/rhino-attack2/flat',  1, 124, False, 12, 0),
        ('hurt',    '../pet-video/rhino-hurt2/flat',    1, 124, False, 12, 0),
        ('victory', '../pet-video/rhino-victory2/flat', 1, 124, False, 12, 0),
    ]),
    'chick':  ('frames_anim_chick', 1352, 676, [
        ('walk',    'vid/chick-walk/flat',    1, 124, True, 12, 0),
        ('idle',    'vid/chick-idle/flat',    1, 124, True, 12, 0),
        ('hold',    'vid/chick-hold/flat',    1, 124, True, 12, 0),
        ('victory', 'vid/chick-victory/flat', 1, 124, False, 12, 0),
        ('hurt',    'vid/chick-hurt/flat',    1, 124, False, 12, 0),
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
