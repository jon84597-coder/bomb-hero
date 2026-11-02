# -*- coding: utf-8 -*-
"""v4.45b：把「地面貼圖」換成新素材（暫不升版號，等使用者確認後再升）
  1. TILE_ART.floor 換成 4 張新的 128px 草地（tile-grass0..3）
  2. 新增 TILE_ART.floorSand：4 張 128px 沙漠沙地（tile-sand0..3）
  3. TileArt 支援 sand 主題的 floor（牆仍走原本的程序繪製）
"""
import base64
import io
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.join(HERE, 'index.html')
GROUND = os.path.join(HERE, 'art', 'ground')


def enc(png, q):
    buf = io.BytesIO()
    Image.open(png).convert('RGB').save(buf, 'WEBP', quality=q, method=6)
    b = buf.getvalue()
    return 'data:image/webp;base64,' + base64.b64encode(b).decode('ascii'), len(b)


def group(name, items):
    lines = ['  %s: [' % name]
    for u in items:
        lines.append('    { u: "%s" },' % u)
    lines.append('  ]')
    return '\n'.join(lines)


def main():
    s = io.open(GAME, encoding='utf-8', newline='').read()
    assert '\r\n' not in s, '整檔必須是 LF'

    grass = [enc(os.path.join(GROUND, 'tile-grass%d.png' % i), 72) for i in range(4)]
    sand = [enc(os.path.join(GROUND, 'tile-sand%d.png' % i), 70) for i in range(4)]
    print('草地 webp %.1fKB / 沙地 webp %.1fKB' % (
        sum(k for _, k in grass) / 1024.0, sum(k for _, k in sand) / 1024.0))

    # ---- 1) 換掉 floor 組 ----
    i = s.index('const TILE_ART = {')
    old = s.index('\n  floor: [\n', i)
    old_end = s.index('\n  ]', old + 1) + len('\n  ]')
    new = '\n' + group('floor', [u for u, _ in grass])
    assert s[old:old_end].count('u: "') == 3, '原本 floor 應該是 3 張'
    s = s[:old] + new + s[old_end:]

    # ---- 2) 在 TILE_ART 尾端加 floorSand ----
    i = s.index('const TILE_ART = {')
    j = s.index('\n};', i)
    s = s[:j] + ',\n' + group('floorSand', [u for u, _ in sand]) + s[j:]

    # ---- 3) TileArt 支援 sand 地板 ----
    old_k = "  const KINDS = ['hard', 'soft', 'floor', 'outer'];"
    assert s.count(old_k) == 1
    s = s.replace(old_k, "  // v4.45b：floorSand 只有沙漠關（第二大關）用，牆仍走程序繪製\n"
                          "  const KINDS = ['hard', 'soft', 'floor', 'outer', 'floorSand'];")

    old_draw = """    draw: function (k, seed, px, py, T) {
      if (!Game.theme || Game.theme.style !== 'forest') return false;   // 只換第一大關
      const im = pick(k, seed);"""
    assert s.count(old_draw) == 1, 'draw 樣式不符'
    new_draw = """    draw: function (k, seed, px, py, T) {
      // v4.45b：第一大關整組貼圖；第二大關目前只換地板（牆還是原本的砌石）
      const st = (Game.theme && Game.theme.style) || '';
      const sandFloor = (st === 'sand' && k === 'floor');
      if (st !== 'forest' && !sandFloor) return false;
      const im = pick(sandFloor ? 'floorSand' : k, seed);"""
    s = s.replace(old_draw, new_draw)

    io.open(GAME, 'w', encoding='utf-8', newline='').write(s)
    print('新檔長度 %d（額度 3,350,000，餘 %d）' % (len(s), 3350000 - len(s)))


if __name__ == '__main__':
    main()
