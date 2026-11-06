# v5.34：火焰貼圖改成「帶 alpha」的版本
#   原本用黑底 + lighter 疊加，疊兩層就整片變白（橘紅色全被沖掉）。
#   這裡把亮度轉成 alpha（暗的地方透明、亮的地方實心），這樣用正常混合就能保住橘紅色，
#   再用一層低透明度的 lighter 補「火光溢出」。
from PIL import Image
import math

ROOT = r"C:/Users/jon84/WorkBuddy/2026-10-30-12-58-54"
SRC = ROOT + "/generated-images/A_single_stylized_cartoon_flam_2026-11-06T16-44-20.png"
OUT = ROOT + "/bomb-hero/spr/flame-tongue.webp"

f = Image.open(SRC).convert("RGB")
w, h = f.size
f = f.crop((0, 0, w, h - 150))                 # 切掉浮水印
bb = f.convert("L").point(lambda v: 255 if v > 26 else 0).getbbox()
f = f.crop(bb)

# 亮度 → alpha（gamma 0.72：讓暗紅邊緣也留一點不透明度，火才有外焰）
lum = f.convert("L")
alpha = lum.point(lambda v: int(255 * math.pow(v / 255.0, 0.72)))
rgba = f.convert("RGBA")
rgba.putalpha(alpha)

# 稍微提亮/提飽和，避免半透明邊緣看起來發灰
px = rgba.load()
for y in range(rgba.height):
    for x in range(rgba.width):
        r, g, b, a = px[x, y]
        if a == 0:
            continue
        mx = max(r, g, b) or 1
        # 往純色靠一點（saturation ×1.18），亮度 ×1.06
        r = min(255, int(r * 1.06 + (r - mx) * -0.0))
        g = min(255, int(g * 1.02))
        b = min(255, int(b * 0.96))
        px[x, y] = (r, g, b, a)

fh = 320
fw = int(round(rgba.width * fh / rgba.height))
rgba = rgba.resize((fw, fh), Image.LANCZOS)
rgba.save(OUT, "WEBP", quality=92, method=6)
print("flame-tongue.webp", rgba.size, "alpha extrema", rgba.split()[-1].getextrema())
