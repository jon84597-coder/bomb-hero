# -*- coding: utf-8 -*-
"""v5.73 patch L: 地板材質疊加 + 角色落地投影"""
import io, os, json

D = os.path.dirname(__file__)
PM = os.path.join(D, 'bomb-hero', 'js', 'main.js')
m = io.open(PM, 'r', encoding='utf-8', newline='').read()
mo = len(m)

# ---- 1. FloorTex 模組（放在 floorChunk 之前）----
A1 = """function floorChunk(cx, cy) {"""
B1 = """/* ============================================================================
   v5.73：地板材質層 —— 一張無縫母圖衍生 8 個主題（spr/flr-*.webp）
   · 只做「微質感」：alpha 0.34 + overlay，不動底色、不蓋光線與接縫 AO
   · 母圖是手繪石礫／泥土顆粒，四象限鏡像拼接 → 絕對無縫
   · 載入完成後丟一次地板快取，讓已經畫好的區塊換上材質
   ========================================================================== */
const FloorTex = (function () {
  const IMG = {};
  const STYLES = ['forest', 'sand', 'ice', 'lava', 'neon', 'sea', 'sky', 'dark'];
  function key(s) {
    const k = String(s || 'forest');
    return STYLES.indexOf(k) >= 0 ? k : 'forest';
  }
  function get(th) {
    const k = key(th && th.style);
    if (k in IMG) return IMG[k];
    IMG[k] = null;
    try {
      if (typeof Image === 'undefined') return null;
      const im = new Image();
      im.onload = function () {
        IMG[k] = im;
        try { floorChunkDirty(null); } catch (e) {}
      };
      im.onerror = function () { IMG[k] = null; };
      im.src = 'spr/flr-' + k + '.webp?v=73';
    } catch (e) { IMG[k] = null; }
    return null;
  }
  return { get: get, key: key, STYLES: STYLES };
})();
let _flrPat = {};
function paintFloorTex(wx, wy, w, h, th) {
  const im = FloorTex.get(th);
  if (!im) return;
  const k = FloorTex.key(th && th.style);
  let pat = _flrPat[k];
  if (!pat || pat.__src !== im) {
    try { pat = ctx.createPattern(im, 'repeat'); } catch (e) { pat = null; }
    if (!pat) return;
    try { pat.__src = im; } catch (e) {}
    _flrPat[k] = pat;
  }
  const T = Game.T || 40;
  const s = Math.max(.32, T / 56);
  try {
    if (pat.setTransform && typeof DOMMatrix !== 'undefined') {
      pat.setTransform(new DOMMatrix([s, 0, 0, s, (wx * .31) % 256, (wy * .31) % 256]));
    }
  } catch (e) {}
  ctx.save();
  ctx.globalAlpha = .34;
  try { ctx.globalCompositeOperation = 'overlay'; } catch (e) {}
  ctx.fillStyle = pat;
  ctx.fillRect(wx, wy, w, h);
  ctx.restore();
}

function floorChunk(cx, cy) {"""
assert m.count(A1) == 1, 'A1 %d' % m.count(A1)
m = m.replace(A1, B1)

# ---- 2. 在 ① 之後疊材質 ----
A2 = """          /* ② 牆面／軟磚（靜態：只有軟磚被炸掉才變 → floorChunkDirty 會丟掉那一塊） */"""
B2 = """          /* ①-b v5.73：地板材質疊加（整塊一次 fillRect，比逐格便宜） */
          try {
            paintFloorTex(cx * FLR_N * T, cy * FLR_N * T, w * T, h * T, th0);
          } catch (e) {}
          /* ② 牆面／軟磚（靜態：只有軟磚被炸掉才變 → floorChunkDirty 會丟掉那一塊） */"""
assert m.count(A2) == 1, 'A2 %d' % m.count(A2)
m = m.replace(A2, B2)

# ---- 3. 角色落地投影 ----
A3 = """function drawRigChar(g, key, x, footY, H, a) {
  if (!g || !g.drawImage || typeof IMG_PARTS === 'undefined') return null;"""
B3 = """function drawRigChar(g, key, x, footY, H, a) {
  if (!g || !g.drawImage || typeof IMG_PARTS === 'undefined') return null;
  /* v5.73：統一落地投影 —— 光源固定在左上，影子一律落在腳下偏右。
     以前每個分件自己帶陰影，方向不一致；現在底下一律墊一顆橢圓，角色才「站在地上」。 */
  try {
    if (g.ellipse) {
      g.save();
      g.globalAlpha = .22;
      g.fillStyle = '#0a0416';
      g.beginPath();
      g.ellipse(x + H * .05, footY - H * .02, H * .27, H * .085, 0, 0, 6.2832);
      g.fill();
      g.restore();
    }
  } catch (e) {}"""
assert m.count(A3) == 1, 'A3 %d' % m.count(A3)
m = m.replace(A3, B3)

A4 = """function drawCharBody(g, c, x, y, R, a) {
  a = a || {};"""
B4 = """function drawCharBody(g, c, x, y, R, a) {
  a = a || {};
  /* v5.73：同一套落地投影（見 drawRigChar） */
  try {
    if (g.ellipse) {
      g.save();
      g.globalAlpha = .20;
      g.fillStyle = '#0a0416';
      g.beginPath();
      g.ellipse(x + R * .06, y + R * .92, R * .60, R * .19, 0, 0, 6.2832);
      g.fill();
      g.restore();
    }
  } catch (e) {}"""
assert m.count(A4) == 1, 'A4 %d' % m.count(A4)
m = m.replace(A4, B4)

assert m.count('\r\n') == 0, 'CRLF!'
tmp = PM + '.tmp'
io.open(tmp, 'w', encoding='utf-8', newline='\n').write(m)
os.replace(tmp, PM)

# ---- 4. spr/_list.json ----
LP = os.path.join(D, 'bomb-hero', 'spr', '_list.json')
lst = json.loads(io.open(LP, 'r', encoding='utf-8').read())
add = ['flr-%s.webp' % s for s in ['forest', 'sand', 'ice', 'lava', 'neon', 'sea', 'sky', 'dark']]
for a in add:
    if a not in lst:
        lst.append(a)
io.open(LP, 'w', encoding='utf-8', newline='\n').write(json.dumps(lst, ensure_ascii=False, separators=(',', ':')))
print('OK js', mo, '->', len(m), '| spr', len(lst))
