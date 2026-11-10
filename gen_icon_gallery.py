# -*- coding: utf-8 -*-
"""從 main.js 抽出圖示表與繪製函式，產生一張 44 圖示總覽頁（只給人眼看，不進遊戲）"""
import io, os, re

ROOT = os.path.dirname(os.path.abspath(__file__))
src = io.open(os.path.join(ROOT, 'bomb-hero/js/main.js'), encoding='utf-8', newline='').read()


def brace_block(text, start_idx):
    """從 start_idx（'{' 的位置）取到配對的 '}'"""
    depth = 0
    for i in range(start_idx, len(text)):
        c = text[i]
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return text[start_idx:i + 1]
    raise SystemExit('no match')


i0 = src.index('const CAST_ICONS = {')
tbl = src[i0:i0 + len('const CAST_ICONS = ') + len(brace_block(src, i0 + len('const CAST_ICONS = ')))]

j0 = src.index('function castIconPath(op, a) {')
fn_path = src[j0:j0 + len('function castIconPath(op, a) ') + len(brace_block(src, j0 + len('function castIconPath(op, a) ')))]

hp = src.index('function castBadgePath(h, r) {')
fn_pathb = src[hp:hp + len('function castBadgePath(h, r) ') + len(brace_block(src, hp + len('function castBadgePath(h, r) ')))]

k0 = src.index('function drawCastBadge(x, y, size, key, col, prog, boss, side) {')
fn_badge = src[k0:k0 + len('function drawCastBadge(x, y, size, key, col, prog, boss, side) ') + len(brace_block(src, k0 + len('function drawCastBadge(x, y, size, key, col, prog, boss, side) ')))]

# 只把全域依賴換掉
fn_badge = fn_badge.replace("const gt = Game.gameT || 0;", "const gt = (window.__gt || 0);")
fn_path = fn_path.replace("ctx.", "ctx.")

COLS = {
    'fire': '#ff9a3c', 'ice': '#a8ecff', 'thunder': '#fff28a', 'dark': '#b06ef7',
    'water': '#7fd0ff', 'wind': '#d8fff4', 'neon': '#58f0d8', 'poison': '#b6f06a',
    'earth': '#dcb877', 'nature': '#9be15d'
}

html = """<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="utf-8">
<title>v5.83 招式圖示總覽</title>
<style>
 body{margin:0;background:#12161f;color:#dfe7f5;font-family:system-ui,"Microsoft JhengHei",sans-serif}
 h1{font-size:15px;padding:14px 18px 0;margin:0;font-weight:600;letter-spacing:.5px}
 p{margin:4px 18px 10px;font-size:12px;color:#8b9ab5}
 .grid{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;padding:0 18px 24px}
 .cell{background:#1b2130;border-radius:10px;padding:8px 4px 6px;text-align:center}
 .cell canvas{display:block;margin:0 auto}
 .nm{font-size:10px;color:#9fb0cc;margin-top:4px;word-break:break-all}
</style></head><body>
<h1>v5.83 招式起手圖示 — 44 張</h1>
<p>實際遊戲尺寸約 45px（王約 59px）；這裡放大 2 倍畫，方便逐張檢查形狀對不對。</p>
<div class="grid" id="g"></div>
<script>
var Game = { gameT: 0 };
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
var CTX = null;
var ctx = null;
""" + tbl + """
""" + fn_path + """
""" + fn_pathb + """
""" + fn_badge + """

var PAL = ['#ff9a3c','#a8ecff','#fff28a','#b06ef7','#7fd0ff','#d8fff4','#58f0d8','#b6f06a','#dcb877','#9be15d'];
var KEYS = Object.keys(CAST_ICONS);
var g = document.getElementById('g');
KEYS.forEach(function (k, i) {
  var cell = document.createElement('div'); cell.className = 'cell';
  var cv = document.createElement('canvas');
  cv.width = 288; cv.height = 288; cv.style.width = '144px'; cv.style.height = '144px';
  cell.appendChild(cv);
  var nm = document.createElement('div'); nm.className = 'nm'; nm.textContent = k;
  cell.appendChild(nm);
  g.appendChild(cell);
  var c2 = cv.getContext('2d');
  c2.scale(2, 2);
  var realCtx = ctx;
  ctx = c2; window.__gt = 1.2;
  var col = PAL[i % PAL.length];
  drawCastBadge(72, 74, 104, k, col, 0.55 + (i % 5) * 0.09, false);
  ctx = realCtx;
});
window.__ready = 1;
</script></body></html>"""

out = os.path.join(ROOT, 'public/_icons584.html')
io.open(out, 'w', encoding='utf-8', newline='\n').write(html)
print('written', out, len(html))
