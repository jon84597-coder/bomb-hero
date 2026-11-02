# 去背：把剪貼簿 LOGO 的白底轉透明（邊緣連通洪泛，保留圖內白色描邊）
from PIL import Image
import numpy as np

SRC = r"C:\Users\jon84\.workbuddy\clipboard-images\clipboard-2026-10-30T22-14-07-322Z-29dd24ee.jpg"
OUT = r"C:\Users\jon84\WorkBuddy\2026-10-30-12-58-54\bomb-hero\art\title-logo.png"
PRE = r"C:\Users\jon84\WorkBuddy\2026-10-30-12-58-54\bomb-hero\art\title-logo-preview.png"

img = Image.open(SRC).convert('RGB')
a = np.asarray(img).astype(np.int16)
h, w, _ = a.shape
print('src', img.size)

# 近白遮罩（JPEG 雜訊 → 門檻 236）
nearwhite = (a[..., 0] >= 236) & (a[..., 1] >= 236) & (a[..., 2] >= 236)

# 從四邊界洪泛：只吃掉「與外部相連」的近白區域，圖內白描邊不受影響
mask = np.zeros((h, w), bool)
mask[0, :] = nearwhite[0, :]
mask[-1, :] = nearwhite[-1, :]
mask[:, 0] = nearwhite[:, 0]
mask[:, -1] = nearwhite[:, -1]
while True:
    d = mask.copy()
    d[1:, :] |= mask[:-1, :]
    d[:-1, :] |= mask[1:, :]
    d[:, 1:] |= mask[:, :-1]
    d[:, :-1] |= mask[:, 1:]
    d &= nearwhite
    if (d == mask).all():
        break
    mask = d
print('flood bg px:', mask.sum(), '/', h * w)

# 外擴 2px 吃掉白邊光暈
grow = mask.copy()
for _ in range(2):
    d = grow.copy()
    d[1:, :] |= grow[:-1, :]
    d[:-1, :] |= grow[1:, :]
    d[:, 1:] |= grow[:, :-1]
    d[:, :-1] |= grow[:, 1:]
    grow = d
mask = grow

alpha = np.where(mask, 0, 255).astype(np.uint8)
rgba = np.dstack([np.asarray(img), alpha])

# 裁切到不透明內容 + 6px 余量
ys, xs = np.where(alpha > 0)
y0, y1 = max(0, ys.min() - 6), min(h, ys.max() + 7)
x0, x1 = max(0, xs.min() - 6), min(w, xs.max() + 7)
rgba = rgba[y0:y1, x0:x1]
im = Image.fromarray(rgba, 'RGBA')
print('cropped', im.size)

# 縮到寬 900 內
if im.width > 900:
    nh = round(im.height * 900 / im.width)
    im = im.resize((900, nh), Image.LANCZOS)
im.save(OUT, optimize=True)
import os
print('png bytes:', os.path.getsize(OUT))

# 預覽：深色底一張、淺色底一張，確認去背乾淨
for name, bg in (('dark', (34, 30, 52)), ('light', (255, 244, 226))):
    canvas = Image.new('RGB', im.size, bg)
    canvas.paste(im, (0, 0), im)
    canvas.save(PRE.replace('.png', f'-{name}.png'))
print('preview ok')
