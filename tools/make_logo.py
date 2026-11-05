# -*- coding: utf-8 -*-
"""v5.7：把「爆爆英雄徽章」原圖換成遊戲用的 title-logo.webp。

跟 v5.6 的差別（玩家反映「去背把一些內容弄不見了」）：
  v5.6 做了「只留最大連通塊」，把四散的碎石／火花／飛沫當雜點刪掉了。
  v5.7 只做「從邊界泛洪去白底」，一個像素都不刪、不裁、不補，內容 100% 保留。

流程：
  1. 邊界泛洪（只吃「連到畫面外框」的近白像素）→ 內部白色（星星、字裡的白）不會被挖空
  2. 交界 1px 依白度給 alpha（羽化）→ 不會有階梯狀硬邊
  3. 先預乘 alpha 再縮圖（避免縮放把白色混進邊緣 → 深底一圈白毛）
  4. 存 WEBP（含 alpha）
"""
import sys
from collections import deque
from PIL import Image

SRC = sys.argv[1]
DST = sys.argv[2] if len(sys.argv) > 2 else 'spr/title-logo.webp'
OUT_W = int(sys.argv[3]) if len(sys.argv) > 3 else 900
QUAL = int(sys.argv[4]) if len(sys.argv) > 4 else 86

im = Image.open(SRC).convert('RGB')
W, H = im.size
px = im.load()

# 近白判定：三個通道都很亮才算背景（純白 JPEG 大約 250~255）
def is_bg(p):
    r, g, b = p
    return r >= 242 and g >= 242 and b >= 242

bg = bytearray(W * H)
q = deque()
for x in range(W):
    for y in (0, H - 1):
        if is_bg(px[x, y]) and not bg[y * W + x]:
            bg[y * W + x] = 1
            q.append((x, y))
for y in range(H):
    for x in (0, W - 1):
        if is_bg(px[x, y]) and not bg[y * W + x]:
            bg[y * W + x] = 1
            q.append((x, y))

while q:
    x, y = q.popleft()
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        nx, ny = x + dx, y + dy
        if nx < 0 or ny < 0 or nx >= W or ny >= H:
            continue
        i = ny * W + nx
        if bg[i]:
            continue
        if is_bg(px[nx, ny]):
            bg[i] = 1
            q.append((nx, ny))

out = Image.new('RGBA', (W, H))
op = out.load()
removed = 0
for y in range(H):
    row = y * W
    for x in range(W):
        r, g, b = px[x, y]
        if bg[row + x]:
            op[x, y] = (r, g, b, 0)          # 完全透明（RGB 留著，縮圖時已預乘所以不會漏白）
            removed += 1
            continue
        # 交界羽化：緊鄰透明區、而且本身也很白的像素給一點半透明（去階梯邊）
        near = False
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < W and 0 <= ny < H and bg[ny * W + nx]:
                near = True
                break
        a = 255
        if near:
            m = min(r, g, b)
            if m > 232:
                a = max(90, int(255 * (255 - m) / 23.0))
        op[x, y] = (r, g, b, a)

# 預乘 alpha 後再縮圖（RGBa = premultiplied），避免白邊
pre = out.convert('RGBa')
ratio = OUT_W / float(W)
out_w, out_h = OUT_W, max(1, int(round(H * ratio)))
pre = pre.resize((out_w, out_h), Image.LANCZOS)
res = pre.convert('RGBA')

res.save(DST, 'WEBP', quality=QUAL, method=6)
print('src %dx%d  removed %d px (%.1f%%)  -> %s %dx%d  %d bytes'
      % (W, H, removed, removed * 100.0 / (W * H), DST, out_w, out_h,
         __import__('os').path.getsize(DST)))
