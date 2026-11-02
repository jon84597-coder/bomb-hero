# -*- coding: utf-8 -*-
"""v4.38-7：道具圖示接進遊戲（ITEM_ART 資料 ＋ ItemArt 載入器 ＋ 場上圓角外框繪製）"""
import io
import os

ROOT = r'C:\Users\jon84\WorkBuddy\2026-10-30-12-58-54\bomb-hero'
PAGE = os.path.join(ROOT, 'index.html')
DATA = os.path.join(ROOT, 'art', 'items', '_items_game.js')

s = io.open(PAGE, encoding='utf-8', newline='').read().replace('\r\n', '\n')
arts = io.open(DATA, encoding='utf-8', newline='').read().replace('\r\n', '\n').strip()


def sub1(old, new, tag):
    global s
    assert s.count(old) == 1, '%s: count=%d' % (tag, s.count(old))
    s = s.replace(old, new)
    print('ok [%s]' % tag)


# ---------- ① 資料 ＋ 載入器（插在 FoeArt 之前） ----------
LOADER = '''

// ================================================================
//   v4.38：道具圖示載入器（跟 FoeArt 同一套寫法）
//   · 場上道具用「圓角外框 ＋ 彩色光暈」呈現，比原本的 emoji 大一圈也更醒目
//   · 圖還沒載入（get 回 null）→ 呼叫端自動退回 emoji，不會開天窗
// ================================================================
const ItemArt = (function () {
  try {
    return (function () {
      const imgs = {}, ready = {};
      function load() {
        if (typeof Image === 'undefined' || typeof ITEM_ART === 'undefined') return;
        Object.keys(ITEM_ART).forEach(function (k) {
          const im = new Image();
          im.onload = function () { ready[k] = true; };
          im.onerror = function () {};
          try { im.src = ITEM_ART[k].u; } catch (e) {}
          imgs[k] = im;
        });
      }
      function get(k) { return (ready[k] && imgs[k] && imgs[k].naturalWidth) ? imgs[k] : null; }
      function readyCount() { return Object.keys(ready).length; }
      return { load: load, get: get, readyCount: readyCount, imgs: imgs };
    })();
  } catch (__e) {
    if (typeof __bootFail === 'function') __bootFail('ItemArt', __e);
    return { load: function () {}, get: function () { return null; }, readyCount: function () { return 0; }, imgs: {} };
  }
})();
// 每個道具的代表色（外框／光暈用）
const ITEM_TINT = {
  fire: '#ff8a3d', bomb: '#6ee7ff', speed: '#7fd8ff', kick: '#e0ad72',
  glove: '#ffd166', punch: '#ff5e7e', remote: '#a08cff', pierce: '#ffb347',
  heart: '#ff6b8a', line: '#7ee0ff', skull: '#9fd97a'
};
// 圓角矩形路徑（老瀏覽器沒有 ctx.roundRect）
function rrPath(g, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + rr, y);
  g.lineTo(x + w - rr, y);
  g.quadraticCurveTo(x + w, y, x + w, y + rr);
  g.lineTo(x + w, y + h - rr);
  g.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  g.lineTo(x + rr, y + h);
  g.quadraticCurveTo(x, y + h, x, y + h - rr);
  g.lineTo(x, y + rr);
  g.quadraticCurveTo(x, y, x + rr, y);
  g.closePath();
}
// 場上道具：圓角底板 ＋ 彩色描邊 ＋ 外光暈 ＋ 圖示本體
function drawItemBadge(px, py, T, type, img, pulse) {
  const s2 = T * .50;                       // 外框邊長（原本 emoji 約 T*.42 → 放大約 1.5 倍視覺量）
  const tint = ITEM_TINT[type] || '#ffd166';
  ctx.save();
  ctx.translate(px, py);
  // 外光暈（會呼吸）
  ctx.globalAlpha = .30 + pulse * .26;
  const g2 = ctx.createRadialGradient(0, 0, s2 * .30, 0, 0, s2 * 1.02);
  g2.addColorStop(0, tint);
  g2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g2;
  ctx.beginPath(); ctx.arc(0, 0, s2 * 1.02, 0, 6.283); ctx.fill();
  ctx.globalAlpha = 1;
  // 底板（深色半透明，讓亮色圖示有對比）
  const rg = ctx.createLinearGradient(0, -s2 / 2, 0, s2 / 2);
  rg.addColorStop(0, 'rgba(26,36,58,.90)');
  rg.addColorStop(1, 'rgba(12,18,32,.94)');
  ctx.fillStyle = rg;
  rrPath(ctx, -s2 / 2, -s2 / 2, s2, s2, s2 * .30);
  ctx.fill();
  // 彩色描邊（外粗內細，做出金屬牌的感覺）
  ctx.strokeStyle = tint;
  ctx.lineWidth = Math.max(2, T * .062);
  rrPath(ctx, -s2 / 2, -s2 / 2, s2, s2, s2 * .30);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.35)';
  ctx.lineWidth = 1;
  rrPath(ctx, -s2 / 2 + T * .045, -s2 / 2 + T * .045, s2 - T * .09, s2 - T * .09, s2 * .26);
  ctx.stroke();
  // 圖示本體
  const isz = s2 * .80;
  ctx.drawImage(img, -isz / 2, -isz / 2, isz, isz);
  ctx.restore();
  }
'''


sub1('const FoeArt = (function () {', arts + LOADER + '\nconst FoeArt = (function () {', 'item-art')

# ---------- ② 載入呼叫 ----------
sub1('FoeArt.load();', 'FoeArt.load();\nItemArt.load();          // v4.38：道具圖示', 'item-load')

# ---------- ③ 場上繪製：有圖就用外框，沒有才退回 emoji ----------
sub1('''    ctx.fillStyle = 'rgba(255,240,180,' + (.10 + pulse * .10).toFixed(3) + ')';
    ctx.beginPath(); ctx.arc(px, py, T * .40 + pulse * 2, 0, 6.283); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.beginPath(); ctx.arc(px, py, T * .30, 0, 6.283); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,' + (.25 + pulse * .35).toFixed(2) + ')';
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(px, py, T * .30, 0, 6.283); ctx.stroke();
    if (it.glint > 0) {          // 剛被爆炸波及：亮一圈，但道具不會消失
      ctx.strokeStyle = 'rgba(255,232,150,' + (.75 * it.glint).toFixed(2) + ')';
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(px, py, T * .34 + (1 - it.glint) * T * .3, 0, 6.283); ctx.stroke();
      ctx.lineWidth = 1;
    }
    ctx.lineWidth = 1;
    ctx.fillStyle = '#fff';
    ctx.font = (T * .42) + 'px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const icon = ITEMS[it.type] ? ITEMS[it.type].icon : '?';
    if (it.type === 'speed') {
      drawSkateIcon(px, py + 1, T * .40);
    } else {
      ctx.fillText(icon, px, py + 1);
    }
    ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';''',
     '''    // v4.38：有美術圖 → 圓角外框 ＋ 彩色光暈（比 emoji 大一圈）；沒載入才退回舊畫法
    const itemImg = (typeof ItemArt !== 'undefined') ? ItemArt.get(it.type) : null;
    if (itemImg) {
      drawItemBadge(px, py, T, it.type, itemImg, pulse);
    } else {
      ctx.fillStyle = 'rgba(255,240,180,' + (.10 + pulse * .10).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(px, py, T * .40 + pulse * 2, 0, 6.283); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.18)';
      ctx.beginPath(); ctx.arc(px, py, T * .30, 0, 6.283); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,' + (.25 + pulse * .35).toFixed(2) + ')';
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(px, py, T * .30, 0, 6.283); ctx.stroke();
      ctx.lineWidth = 1;
      ctx.fillStyle = '#fff';
      ctx.font = (T * .42) + 'px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const icon = ITEMS[it.type] ? ITEMS[it.type].icon : '?';
      if (it.type === 'speed') {
        drawSkateIcon(px, py + 1, T * .40);
      } else {
        ctx.fillText(icon, px, py + 1);
      }
      ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
    }
    if (it.glint > 0) {          // 剛被爆炸波及：亮一圈，但道具不會消失
      ctx.strokeStyle = 'rgba(255,232,150,' + (.75 * it.glint).toFixed(2) + ')';
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(px, py, T * .38 + (1 - it.glint) * T * .3, 0, 6.283); ctx.stroke();
      ctx.lineWidth = 1;
    }''', 'item-draw')

# ---------- ④ 導出 ----------
sub1('  cartThrowDir: cartThrowDir, cartLandingDir: cartLandingDir,',
     '  cartThrowDir: cartThrowDir, cartLandingDir: cartLandingDir,\n'
     '  ItemArt: ItemArt, ITEM_ART: ITEM_ART, ITEM_TINT: ITEM_TINT,', 'item-export')

io.open(PAGE, 'w', encoding='utf-8', newline='').write(s.replace('\n', '\r\n'))
print('寫回 index.html')
