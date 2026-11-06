# v5.34：把算圖生成的核彈／火焰處理成遊戲用素材（去背、轉正、裁切、壓成 webp）
from PIL import Image
from collections import deque
import os

ROOT = r"C:/Users/jon84/WorkBuddy/2026-10-30-12-58-54"
SRC_MISSILE = ROOT + "/generated-images/Stylized_cartoon_video_game_mi_2026-11-06T16-43-46.png"
SRC_FLAME = ROOT + "/generated-images/A_single_stylized_cartoon_flam_2026-11-06T16-44-20.png"
OUT = ROOT + "/bomb-hero/spr"


def key_white(img, tol=236):
    """從四邊 flood fill 去掉白底（彈體有粗黑描邊，內部高光不會被吃掉）"""
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()
    seen = bytearray(w * h)
    q = deque()
    for x in range(w):
        q.append((x, 0)); q.append((x, h - 1))
    for y in range(h):
        q.append((0, y)); q.append((w - 1, y))
    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h:
            continue
        i = y * w + x
        if seen[i]:
            continue
        r, g, b, a = px[x, y]
        if r >= tol and g >= tol and b >= tol:
            seen[i] = 1
            px[x, y] = (r, g, b, 0)
            q.append((x + 1, y)); q.append((x - 1, y))
            q.append((x, y + 1)); q.append((x, y - 1))
    return img


def trim(img):
    bb = img.split()[-1].getbbox()
    return img.crop(bb) if bb else img


# ---- 核彈本體：白底 → 去背 → 轉成「彈頭朝下」→ 裁切 ----
m = Image.open(SRC_MISSILE)
m = key_white(m)
m = m.rotate(-90, expand=True)          # 原圖彈頭朝右 → 順時針 90° → 彈頭朝下
m = trim(m)
mh = 560
mw = int(round(m.width * mh / m.height))
m = m.resize((mw, mh), Image.LANCZOS)
os.makedirs(OUT, exist_ok=True)
m.save(OUT + "/nuke-missile.webp", "WEBP", quality=92, method=6)
print("nuke-missile.webp", m.size)

# ---- 火焰貼圖：黑底（用 lighter 疊加就等於去背）→ 切掉右下角浮水印 → 裁切 ----
f = Image.open(SRC_FLAME).convert("RGB")
w, h = f.size
f = f.crop((0, 0, w, h - 150))          # 切掉底部浮水印
bb = f.convert("L").point(lambda v: 255 if v > 26 else 0).getbbox()
f = f.crop(bb)
fh = 300
fw = int(round(f.width * fh / f.height))
f = f.resize((fw, fh), Image.LANCZOS)
f.save(OUT + "/flame-tongue.webp", "WEBP", quality=90, method=6)
print("flame-tongue.webp", f.size)
