# -*- coding: utf-8 -*-
# v4.75a：八大關卡氛圍底圖（bg/<style>.webp）＋ 對戰／大逃殺改用首頁封面底圖
import io, sys
P = 'index.html'
s = io.open(P, encoding='utf-8').read()

def rep(old, new, tag, cnt=1):
    global s
    n = s.count(old)
    if n != cnt:
        print('!! %s count=%d (want %d)' % (tag, n, cnt)); sys.exit(1)
    s = s.replace(old, new)
    print('ok', tag)

# ---- 1) 底圖載入器 + 照片式背景 ----
rep("""function _backdropCanvas(st, th) {""",
"""// v4.75：八大關卡的氛圍底圖 —— bg/<style>.webp（512×512，一張約 40KB）。
//   沒載到（離線／單檔拿走）就整個跳過，沿用原本的程序繪製，不會破圖。
//   對戰與大逃殺改用首頁封面底圖（跟八大關卡的競技場無關）。
const BG_IMG = {};
function bgPhoto(st) {
  if (Game.mode === 'battle' || Game.mode === 'br') {
    if (BG_IMG.__title !== undefined) return BG_IMG.__title;
    BG_IMG.__title = null;
    try {
      const im = new Image();
      im.onload = function () { BG_IMG.__title = im; };
      im.src = IMG_TITLEBG;
    } catch (e) {}
    return null;
  }
  if (BG_IMG[st] !== undefined) return BG_IMG[st];
  BG_IMG[st] = null;
  try {
    const im = new Image();
    im.onload = function () { BG_IMG[st] = im; };
    im.src = 'bg/' + st + '.webp';       // 相對路徑：index.html 旁邊的 bg/
  } catch (e) {}
  return null;
}
// 照片式背景：cover 裁切（多留 18% 給視差）＋ 暗化 ＋ 暗角
function paintPhotoBG(im) {
  const iw = im.naturalWidth || im.width || 1, ih = im.naturalHeight || im.height || 1;
  const sc = Math.max(VIEW_W / iw, VIEW_H / ih) * 1.18;
  const w = iw * sc, h = ih * sc;
  const kx = clamp((Game.camX || 0) * .07, -w * .08, w * .08);
  const ky = clamp((Game.camY || 0) * .07, -h * .08, h * .08);
  try { ctx.drawImage(im, (VIEW_W - w) / 2 - kx, (VIEW_H - h) / 2 - ky, w, h); } catch (e) { return; }
  ctx.fillStyle = 'rgba(6,10,20,.48)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  let vg = null;
  try {
    vg = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, Math.min(VIEW_W, VIEW_H) * .30,
      VIEW_W / 2, VIEW_H / 2, Math.max(VIEW_W, VIEW_H) * .74);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)');
  } catch (e) {}
  if (vg) { ctx.fillStyle = vg; ctx.fillRect(0, 0, VIEW_W, VIEW_H); }
  // 只有關卡地圖會把同一張照片「疊」在地板上（對戰／大逃殺維持乾淨）
  Game.bgPhoto = (Game.mode === 'battle' || Game.mode === 'br') ? null : im;
}

function _backdropCanvas(st, th) {""",
 'bg loader')

# ---- 2) paintBackdrop 先試照片 ----
rep("""function paintBackdrop(th) {
  const st = (th && th.style) || 'forest';
  const img = _backdropCanvas(st, th);
  if (img) { try { ctx.drawImage(img, 0, 0, VIEW_W, VIEW_H); } catch (e) {} }
  else {
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, th.bg1); g.addColorStop(1, th.bg2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }""",
"""function paintBackdrop(th) {
  const st = (th && th.style) || 'forest';
  const ph = bgPhoto(st);
  if (ph) paintPhotoBG(ph);
  else {
    Game.bgPhoto = null;
    const img = _backdropCanvas(st, th);
    if (img) { try { ctx.drawImage(img, 0, 0, VIEW_W, VIEW_H); } catch (e) {} }
    else {
      const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
      g.addColorStop(0, th.bg1); g.addColorStop(1, th.bg2);
      ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }""",
 'paintBackdrop')

# ---- 3) 地板畫完後，把氛圍照片混上去（只調地板，牆與角色不受影響）----
rep("""  // 出口門
  if (Game.door && Game.door.revealed) {""",
"""  // v4.75：把大關卡的氛圍照片「混」到地板上（overlay）—— 材質與光線透上來，
  //   牆／道具／角色是之後才畫的，所以完全不受影響。
  if (Game.bgPhoto) {
    try {
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = .26;
      ctx.drawImage(Game.bgPhoto, 0, 0, Game.cols * T, Game.rows * T);
      ctx.restore();
    } catch (e) { try { ctx.restore(); } catch (e2) {} }
  }
  // 出口門
  if (Game.door && Game.door.revealed) {""",
 'floor tint')

io.open(P, 'w', encoding='utf-8', newline='\n').write(s)
print('done')
