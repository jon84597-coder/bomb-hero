# -*- coding: utf-8 -*-
"""v4.43 ④：把 9 張場景貼圖接進遊戲（第一大關專用，其他主題照舊）。"""
import io

HTML = 'index.html'
JS = 'art/tiles/_tiles_game.js'
s = io.open(HTML, encoding='utf-8', newline='').read()
s = s.replace('\r\n', '\n')
n0 = len(s)
tiles = io.open(JS, encoding='utf-8', newline='').read().replace('\r\n', '\n')

TILEART = tiles + """
// 場景貼圖載入器：只有第一大關（forest）用，其他主題照舊走程序化烘焙
const TileArt = (function () {
  const KINDS = ['hard', 'soft', 'floor', 'outer'];
  const sets = {};
  let readyN = 0, totalN = 0;
  KINDS.forEach(function (k) {
    const arr = (TILE_ART[k] || []).map(function (o) {
      const im = new Image();
      totalN++;
      im.onload = function () { readyN++; };
      im.onerror = function () { };
      im.src = o.u;
      return im;
    });
    sets[k] = arr;
  });
  function pick(k, seed) {
    const arr = sets[k];
    if (!arr || !arr.length) return null;
    const im = arr[((seed | 0) % arr.length + arr.length) % arr.length];
    return (im && im.complete && im.naturalWidth > 0) ? im : null;
  }
  return {
    total: function () { return totalN; },
    readyCount: function () { return readyN; },
    has: function (k) { return !!pick(k, 0); },
    draw: function (k, seed, px, py, T) {
      if (!Game.theme || Game.theme.style !== 'forest') return false;   // 只換第一大關
      const im = pick(k, seed);
      if (!im) return false;
      try { ctx.drawImage(im, px, py, T, T); return true; } catch (e) { return false; }
    }
  };
})();

"""

# ---------------------------------------------------------------- 1) 插入貼圖資料 + 載入器
ANCHOR = "const ART_RES = 128;                 // 烘焙解析度"
assert s.count(ANCHOR) == 1
s = s.replace(ANCHOR, TILEART + ANCHOR)

# ---------------------------------------------------------------- 2) 石牆（含外牆）
OLD = """function drawStone(px, py, T, base, seed) {
  const st = artStyle();
  if (artBlit(artSet(st).hard, seed, px, py, T)) return;"""
NEW = """function drawStone(px, py, T, base, seed, gx, gy) {
  const st = artStyle();
  // v4.43：第一大關換上手繪貼圖；最外圈用「外牆」那兩張
  const ring = (gx === 0 || gy === 0 || gx === Game.cols - 1 || gy === Game.rows - 1);
  if (TileArt.draw(ring ? 'outer' : 'hard', seed, px, py, T)) return;
  if (artBlit(artSet(st).hard, seed, px, py, T)) return;"""
assert s.count(OLD) == 1
s = s.replace(OLD, NEW)

# ---------------------------------------------------------------- 3) 軟磚
OLD2 = """function drawCrate(px, py, T, base, dark, big) {
  const st = artStyle();
  const set = artSet(st);"""
NEW2 = """function drawCrate(px, py, T, base, dark, big) {
  const st = artStyle();
  if (TileArt.draw('soft', (px * 13 + py * 7) | 0, px, py, T)) return;
  const set = artSet(st);"""
assert s.count(OLD2) == 1
s = s.replace(OLD2, NEW2)

# ---------------------------------------------------------------- 4) 地板
OLD3 = """function paintFloorStyle(x, y, px, py, T, th, st) {
  if (artBlit(artSet(st || 'forest').floor, x * 31 + y * 17, px, py, T)) return;"""
NEW3 = """function paintFloorStyle(x, y, px, py, T, th, st) {
  if (TileArt.draw('floor', x * 31 + y * 17, px, py, T)) return;
  if (artBlit(artSet(st || 'forest').floor, x * 31 + y * 17, px, py, T)) return;"""
assert s.count(OLD3) == 1
s = s.replace(OLD3, NEW3)

# ---------------------------------------------------------------- 5) 呼叫端補上格子座標
OLD4 = "        drawStone(px, py, T, th.hard, x * 37 + y * 7);"
NEW4 = "        drawStone(px, py, T, th.hard, x * 37 + y * 7, x, y);"
assert s.count(OLD4) == 1
s = s.replace(OLD4, NEW4)

# ---------------------------------------------------------------- 6) 匯出（測試用）
OLD5 = "  TICON_BASE: TICON_BASE,"
if s.count(OLD5) == 1:
    s = s.replace(OLD5, "  TICON_BASE: TICON_BASE, TileArt: TileArt, TILE_ART: TILE_ART,")
else:
    print('warn: TICON_BASE export not found')

io.open(HTML, 'w', encoding='utf-8', newline='').write(s)
print('OK  %d -> %d  (%+.1f KB)' % (n0, len(s), (len(s) - n0) / 1024.0))
