# -*- coding: utf-8 -*-
"""v5.39：大逃殺空投寶箱換成美術圖（spr/drop-art-chest.webp），
   圖沒載到就退回原本的程序繪製。"""
import io, os, re

P = 'bomb-hero/index.html'
s = io.open(P, encoding='utf-8').read()
steps = []

def rep(a, b, n=1, tag=''):
    global s
    c = s.count(a)
    assert c == n, ('COUNT %d != %d :: %s :: %r' % (c, n, tag, a[:60]))
    s = s.replace(a, b, n)
    steps.append(tag)

# ── ① 貼圖定義 ＋ 載入器（接在 ITEM_ART 後面） ─────────────────────────
rep("""const ITEM_ART = {
  fire: { u: "spr/item-art-fire.webp" },""",
    """/* v5.39：大逃殺空投寶箱的美術圖（本來是 canvas 硬畫的軍綠鐵箱）。
   走跟 ItemArt 一樣的模式：圖沒載到就退回程序繪製，不會開天窗。 */
const DROP_ART = { u: "spr/drop-art-chest.webp", w: 240, h: 228, asp: 240 / 228 };
const DropArt = (function () {
  try {
    return (function () {
      let img = null, ready = false;
      function load() {
        if (typeof Image === 'undefined') return;
        const im = new Image();
        im.onload = function () { ready = true; };
        im.onerror = function () {};
        try { im.src = DROP_ART.u; } catch (e) {}
        img = im;
      }
      function get() { return (ready && img && img.naturalWidth) ? img : null; }
      return { load: load, get: get };
    })();
  } catch (__e) {
    if (typeof __bootFail === 'function') __bootFail('DropArt', __e);
    return { load: function () {}, get: function () { return null; } };
  }
})();

const ITEM_ART = {
  fire: { u: "spr/item-art-fire.webp" },""", 1, 'dropArtDef')

rep("ItemArt.load();          // v4.38：道具圖示",
    "ItemArt.load();          // v4.38：道具圖示\nDropArt.load();          // v5.39：空投寶箱貼圖", 1, 'dropArtLoad')

# ── ② brDropBoxArt：有圖就畫圖 ─────────────────────────────────────────
old_head = """function brDropBoxArt(bx, by, T, k, glow) {
  const w = T * .74 * k, h = T * .62 * k;
  const x0 = bx - w / 2, y0 = by - h / 2;
"""
new_head = """function brDropBoxArt(bx, by, T, k, glow) {
  const w = T * .74 * k, h = T * .62 * k;
  const x0 = bx - w / 2, y0 = by - h / 2;
  /* v5.39：有貼圖就畫貼圖 —— 木箱＋金扣比純幾何的軍綠鐵箱更像這款遊戲的東西。
     貼圖還沒載到（或 off）就往下走原本的程序繪製，行為完全一樣。 */
  const _img = (typeof DropArt !== 'undefined') ? DropArt.get() : null;
  if (_img) {
    const t = Game.gameT || 0;
    const bob = Math.sin(t * 3.1) * T * .028;          // 微微上下浮，遠看就知道是「活的」
    const DW = T * 1.06 * k, DH = DW / (DROP_ART.asp || 1);
    const cy = by + bob + (DH - h) * .5 * 0;           // 圖比格子高，用中心對齊
    // 地面影子
    ctx.save();
    ctx.globalAlpha = .24;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(bx, by + h * .56, DW * .36, T * .105, 0, 0, 6.283);
    ctx.fill();
    ctx.restore();
    // 金色光暈：未開的箱子要一眼看到
    const pulse = .55 + .45 * Math.sin(t * 5.2);
    ctx.save();
    const gr = ctx.createRadialGradient
      ? ctx.createRadialGradient(bx, cy, 0, bx, cy, DW * .70) : null;
    if (gr && gr.addColorStop) {
      gr.addColorStop(0, 'rgba(255,226,145,' + (.40 + .30 * pulse) + ')');
      gr.addColorStop(.62, 'rgba(255,196,80,.18)');
      gr.addColorStop(1, 'rgba(255,180,60,0)');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(bx, cy, DW * .70, 0, 6.283); ctx.fill();
    }
    ctx.restore();
    // 箱體（貼圖本身已含透明去背）
    ctx.save();
    ctx.translate(bx, cy);
    ctx.drawImage(_img, -DW / 2, -DH / 2, DW, DH);
    ctx.restore();
    if (glow > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, glow) * .8;
      ctx.strokeStyle = '#ffe08a';
      ctx.lineWidth = Math.max(1.6, T * .055);
      ctx.beginPath();
      ctx.arc(bx, cy, DW * .56, 0, 6.283);
      ctx.stroke();
      ctx.restore();
    }
    return;
  }
"""
rep(old_head, new_head, 1, 'boxArtHead')

io.open(P + '.tmp', 'w', encoding='utf-8', newline='\n').write(s.replace('\r\n', '\n'))
os.replace(P + '.tmp', P)
print('OK ->', len(s), ' | '.join(steps))
