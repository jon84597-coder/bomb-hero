# -*- coding: utf-8 -*-
"""v4.46：八個主題的地面全部換成手繪/生成貼圖，牆全部回歸程序化美術。

  1. TILE_ART：刪掉 hard / soft / outer 三組（用戶要求第一大關除了地面都回溯），
     新增 floorLava / floorNeon / floorSea / floorSky / floorDark
  2. KINDS 只留地板類
  3. TileArt.draw 只認 'floor'，主題對照表決定用哪一組
  4. drawStone / drawCrate 不再走 TileArt（回到原本的 aBlock 程序繪製）
"""
import base64
import io
import os
import re

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.join(HERE, 'index.html')
GROUND = os.path.join(HERE, 'art', 'ground')

FLOORS = [
    ('floorLava', 'lava'),
    ('floorNeon', 'neon'),
    ('floorSea', 'sea'),
    ('floorSky', 'sky'),
    ('floorDark', 'dark'),
]


def enc(png, q=66):
    buf = io.BytesIO()
    Image.open(png).convert('RGB').save(buf, 'WEBP', quality=q, method=6)
    b = buf.getvalue()
    return 'data:image/webp;base64,' + base64.b64encode(b).decode('ascii'), len(b)


def drop_group(s, key):
    """刪掉 TILE_ART 裡的整個 key: [...] 區塊（含後面的逗號）。"""
    m = re.search(r'\n  ' + key + r': \[\n.*?\n  \],?\n', s, re.S)
    if not m:
        return s          # 已刪過（腳本要能重複執行）
    return s[:m.start()] + '\n' + s[m.end():]


def main():
    s = io.open(GAME, encoding='utf-8', newline='').read()
    assert '\r\n' not in s, '整檔必須是 LF'

    # ---- 1) 刪掉牆的三組貼圖
    for k in ('hard', 'soft', 'outer'):
        s = drop_group(s, k)

    # ---- 2) 新增五個主題的地板
    total = 0
    for key, theme in FLOORS:
        items = [enc(os.path.join(GROUND, 'tile-%s%d.png' % (theme, i))) for i in range(4)]
        total += sum(k for _, k in items)
        body = ''.join('\n    { u: "%s" },' % u for u, _ in items).rstrip(',')
        if '\n  %s: [' % key in s:
            i = s.index('\n  %s: [' % key) + len('\n  %s: [' % key)
            j = s.index('\n  ]', i)
            s = s[:i] + body + s[j:]
        else:
            old = '" }\n  ]\n};\n// 場景貼'
            assert s.count(old) == 1, 'TILE_ART 結尾樣式不符'
            s = s.replace(old, '" },\n  ],\n  %s: [' % key + body + '\n  ]\n};\n// 場景貼')
    print('五個主題地板 webp 合計 %.1fKB' % (total / 1024.0))

    # ---- 3) KINDS
    s = re.sub(r"const KINDS = \[[^\]]*\];",
               "const KINDS = ['floor', 'floorSand', 'floorIce', 'floorLava', "
               "'floorNeon', 'floorSea', 'floorSky', 'floorDark'];", s)

    # ---- 4) draw()：只有地板走貼圖
    old_draw = re.search(r"    draw: function \(k, seed, px, py, T\) \{.*?\n    \}\n", s, re.S)
    assert old_draw, '找不到 TileArt.draw'
    new_draw = """    draw: function (k, seed, px, py, T) {
      // v4.46：只有地板走貼圖。牆（硬磚／軟磚／外框）全部回歸程序化美術。
      if (k !== 'floor') return false;
      const st = (Game.theme && Game.theme.style) || '';
      const ALT = {
        sand: 'floorSand', ice: 'floorIce', lava: 'floorLava',
        neon: 'floorNeon', sea: 'floorSea', sky: 'floorSky', dark: 'floorDark'
      };
      const im = pick(ALT[st] || 'floor', seed);
      if (!im) return false;
      try { ctx.drawImage(im, px, py, T, T); return true; } catch (e) { return false; }
    }
"""
    s = s[:old_draw.start()] + new_draw + s[old_draw.end():]

    # ---- 5) drawStone / drawCrate 回歸程序化
    old = """function drawStone(px, py, T, base, seed, gx, gy) {
  const st = artStyle();
  // v4.43：第一大關換上手繪貼圖；最外圈用「外牆」那兩張
  const ring = (gx === 0 || gy === 0 || gx === Game.cols - 1 || gy === Game.rows - 1);
  if (TileArt.draw(ring ? 'outer' : 'hard', seed, px, py, T)) return;
  if (artBlit(artSet(st).hard, seed, px, py, T)) return;"""
    new = """function drawStone(px, py, T, base, seed, gx, gy) {
  const st = artStyle();
  // v4.46：牆不再用貼圖（v4.43~v4.45 的 hard/outer 已移除）
  if (artBlit(artSet(st).hard, seed, px, py, T)) return;"""
    if s.count(old) == 1:
        s = s.replace(old, new)

    old = """function drawCrate(px, py, T, base, dark, big) {
  const st = artStyle();
  if (TileArt.draw('soft', (px * 13 + py * 7) | 0, px, py, T)) return;
  const set = artSet(st);"""
    new = """function drawCrate(px, py, T, base, dark, big) {
  const st = artStyle();
  // v4.46：軟磚也回歸程序化美術
  const set = artSet(st);"""
    if s.count(old) == 1:
        s = s.replace(old, new)

    io.open(GAME, 'w', encoding='utf-8', newline='').write(s)
    print('新檔長度 %d（額度 3,350,000，餘 %d）' % (len(s), 3350000 - len(s)))


if __name__ == '__main__':
    main()
