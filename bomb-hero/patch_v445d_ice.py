# -*- coding: utf-8 -*-
"""v4.45d：接入第三大關（冰雪原）雪地貼圖。可重複執行（改參數重跑很常見）。
  1. TILE_ART 新增／更新 floorIce 4 張（128px webp）
  2. TileArt.KINDS 加 floorIce
  3. TileArt.draw 的「非草原關只換地板」判斷改成對照表（sand/ice 共用同一段）
"""
import base64
import io
import os

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.join(HERE, 'index.html')
GROUND = os.path.join(HERE, 'art', 'ground')


def enc(png, q=72):
    buf = io.BytesIO()
    Image.open(png).convert('RGB').save(buf, 'WEBP', quality=q, method=6)
    b = buf.getvalue()
    return 'data:image/webp;base64,' + base64.b64encode(b).decode('ascii'), len(b)


def main():
    s = io.open(GAME, encoding='utf-8', newline='').read()
    assert '\r\n' not in s, '整檔必須是 LF'

    items = [enc(os.path.join(GROUND, 'tile-ice%d.png' % i)) for i in range(4)]
    print('雪地 webp 合計 %.1fKB' % (sum(k for _, k in items) / 1024.0))

    # 1) TILE_ART：已有 floorIce 就換內容，沒有才新增
    body = ''.join('\n    { u: "%s" },' % u for u, _ in items).rstrip(',')
    if '\n  floorIce: [' in s:
        i = s.index('\n  floorIce: [') + len('\n  floorIce: [')
        j = s.index('\n  ]', i)
        s = s[:i] + body + s[j:]
        print('floorIce 已存在 -> 換掉內容')
    else:
        old = '" },\n  ]\n};\n// 場景貼'
        assert s.count(old) == 1, 'TILE_ART 結尾樣式不符'
        s = s.replace(old, '" },\n  ],\n  floorIce: [' + body + '\n  ]\n};\n// 場景貼')

    # 2) KINDS
    new_kinds = "const KINDS = ['hard', 'soft', 'floor', 'outer', 'floorSand', 'floorIce'];"
    if new_kinds not in s:
        old = "const KINDS = ['hard', 'soft', 'floor', 'outer', 'floorSand'];"
        assert s.count(old) == 1, 'KINDS 樣式不符'
        s = s.replace(old, new_kinds)

    # 3) draw() 的分支（改成對照表，之後加主題只要多一個 key）
    if "const ALT = { sand: 'floorSand', ice: 'floorIce' };" not in s:
        old = """      // v4.45b：第一大關整組貼圖；第二大關目前只換地板（牆還是原本的砌石）
      const st = (Game.theme && Game.theme.style) || '';
      const sandFloor = (st === 'sand' && k === 'floor');
      if (st !== 'forest' && !sandFloor) return false;
      const im = pick(sandFloor ? 'floorSand' : k, seed);"""
        new = """      // v4.45b：第一大關整組貼圖；第二、三大關目前只換地板（牆還是原本的砌石）
      const st = (Game.theme && Game.theme.style) || '';
      const ALT = { sand: 'floorSand', ice: 'floorIce' };
      const alt = (k === 'floor' && ALT[st]) || null;
      if (st !== 'forest' && !alt) return false;
      const im = pick(alt || k, seed);"""
        assert s.count(old) == 1, 'draw() 樣式不符'
        s = s.replace(old, new)

    io.open(GAME, 'w', encoding='utf-8', newline='').write(s)
    print('新檔長度 %d（額度 3,350,000，餘 %d）' % (len(s), 3350000 - len(s)))


if __name__ == '__main__':
    main()
