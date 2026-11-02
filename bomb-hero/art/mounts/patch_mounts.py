# -*- coding: utf-8 -*-
"""v4.33：龍坐騎換手繪圖（原色／紅色各一張）＋ 體積縮 15%／騎乘者放大 20%／拿掉紅光暈。
可重複執行（第二次跑會偵測已套用就跳過）。"""
import io
import os
import re
import sys

ROOT = r'C:\Users\jon84\WorkBuddy\2026-10-30-12-58-54\bomb-hero'
PAGE = os.path.join(ROOT, 'index.html')
JS = os.path.join(ROOT, 'art', 'mounts', '_mounts_game.js')

s = io.open(PAGE, encoding='utf-8', newline='').read().replace('\r\n', '\n')
mount_js = io.open(JS, encoding='utf-8', newline='').read().replace('\r\n', '\n')


def once(old, new, tag):
    global s
    if new in s:
        print('skip:', tag)
        return
    n = s.count(old)
    if n != 1:
        sys.exit('錨點 %s 出現 %d 次，中止' % (tag, n))
    s = s.replace(old, new, 1)
    print('ok  :', tag)


# ---------- 1) 插入 MOUNT_ART 資料 ----------
if 'const MOUNT_ART = {' not in s:
    anchor = 'const IMG_PARTS = {'
    assert s.count(anchor) == 1
    s = s.replace(anchor, mount_js + '\n' + anchor, 1)
    print('ok  : MOUNT_ART 資料')

# ---------- 2) MountArt 載入模組（放在 FoeArt 之後） ----------
MOD = '''// ---------- 龍坐騎貼圖載入（v4.33）----------
const MountArt = (function () {
  try {
    return (function () {
      const imgs = {}, ready = {};
      function load() {
        if (typeof Image === 'undefined' || typeof MOUNT_ART === 'undefined') return;
        Object.keys(MOUNT_ART).forEach(function (k) {
          const im = new Image();
          im.onload = function () { ready[k] = true; };
          im.onerror = function () { ready[k] = false; };
          try { im.src = MOUNT_ART[k].u; } catch (e) {}
          imgs[k] = im;
        });
      }
      function has(k) { return !!(MOUNT_ART && MOUNT_ART[k] && ready[k] && imgs[k] && imgs[k].naturalWidth); }
      function get(k) { return has(k) ? imgs[k] : null; }
      function readyCount() { return Object.keys(ready).filter(function (k) { return ready[k]; }).length; }
      return { load: load, has: has, get: get, readyCount: readyCount, imgs: imgs };
    })();
  } catch (__e) {
    if (typeof __bootFail === 'function') __bootFail('MountArt', __e);
    return { load: function () {}, has: function () { return false; }, get: function () { return null; },
             readyCount: function () { return 0; }, imgs: {} };
  }
})();

'''
once('// 柔和陰影（兩層橢圓疊出漸層，比每幀建 gradient 便宜）', MOD + '// 柔和陰影（兩層橢圓疊出漸層，比每幀建 gradient 便宜）', 'MountArt 模組')

# ---------- 3) drawMountSprite ----------
SPR = '''// 龍坐騎：整張貼圖 ＋ 腳底 pivot 的變形動畫（沒有圖回傳 false，呼叫端退回舊畫法）
function drawMountSprite(g, key, x, footY, H, side, a) {
  const sp = (typeof MOUNT_ART !== 'undefined') ? MOUNT_ART[key] : null;
  if (!sp) return false;
  const im = (typeof MountArt !== 'undefined') ? MountArt.get(key) : null;
  if (!im) return false;
  a = a || {};
  const W = H * sp.asp;
  const w = a.walk || 0;
  const moving = !!a.moving;
  const amp = a.amp == null ? 1 : a.amp;
  const step = moving ? Math.sin(w) : 0;
  const sq = moving ? Math.sin(w * 2) * .032 * amp : Math.sin((a.idle || 0) * 1.9) * .010;
  const bob = moving ? Math.abs(Math.sin(w)) * H * .020 : Math.sin((a.idle || 0) * 2.3) * H * .010;
  g.save();
  g.translate(x, footY - bob);
  g.scale(side * (sp.dir || 1) * (1 + sq * .30), 1 - sq);
  g.rotate(step * .014 * amp);            // 走動時身體微微前後壓
  g.drawImage(im, -W / 2, -H, W, H);
  g.restore();
  return true;
}

'''
once('// 騎乘中的小龍：用使用者提供的小龍插畫（頭／翅膀／腿都會動）', SPR + '// 騎乘中的小龍：用使用者提供的小龍插畫（頭／翅膀／腿都會動）', 'drawMountSprite')

# ---------- 4) drawDino：體積、紅光暈、換圖 ----------
once("  const DH = T * (red ? 2.14 : 2.00);        // 小龍總高（紅龍再大一點）",
     "  // v4.33：體積縮 15%（原本 2.00／2.14）—— 坐騎小一號、騎上去的人放大 20%，比例更有魄力\n"
     "  const DH = T * (red ? 1.82 : 1.70);        // 小龍總高（紅龍再大一點）",
     'DH 縮 15%')

once("  softShadow(x, y + T * .58, T * .58, T * .16, .34);",
     "  softShadow(x, y + T * .54, T * .50, T * .14, .32);",
     '坐騎影子')

GLOW = """  // v2.0：紅龍紅光只沿著身體邊緣閃一下（不再往外擴成一整團）
  if (red) {
    const pulse = .55 + Math.sin(Game.gameT * 6.6) * .30 + Math.sin(Game.gameT * 3.1) * .15;
    const a = Math.max(0, Math.min(.95, pulse));
    const gr = ctx.createRadialGradient(x, y + T * .06, T * .20, x, y + T * .06, T * .92);
    gr.addColorStop(0, 'rgba(255,90,50,0)');
    gr.addColorStop(.45, 'rgba(255,80,45,' + (a * .34).toFixed(3) + ')');
    gr.addColorStop(.80, 'rgba(255,64,48,' + (a * .80).toFixed(3) + ')');
    gr.addColorStop(1, 'rgba(255,40,30,0)');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.ellipse(x, y + T * .06, T * .92, T * .78, 0, 0, 6.283); ctx.fill();
    // 邊緣那一圈細細的紅線在閃（更亮更明顯）
    ctx.strokeStyle = 'rgba(255,100,60,' + (a * .95).toFixed(3) + ')';
    ctx.lineWidth = Math.max(1.6, T * .060);
    ctx.beginPath(); ctx.ellipse(x, y + T * .06, T * .86, T * .72, 0, 0, 6.283); ctx.stroke();
    ctx.lineWidth = 1;
  }
"""
once(GLOW, "  // v4.33：紅色是獨立的手繪圖 → 原本那圈紅光暈整段移除（會把新圖的輪廓吃掉）\n",
     '移除紅光暈')

once("  if (red) ctx.filter = 'hue-rotate(-118deg) saturate(2.6) brightness(1.06)';\n",
     "", '移除 hue-rotate 換色')
once("  // v4.8：紅龍本體描邊發光（shadowBlur 讓整隻龍邊緣亮起來）\n"
     "  if (red) { ctx.shadowColor = 'rgba(255,80,50,.85)'; ctx.shadowBlur = Math.max(8, T * .20); }\n",
     "", '移除 shadowBlur 發光')

OLD_RIG = """  const rig = drawRigChar(ctx, 'dragon', x, footY - bob * 2, DH, {
    walk: (p.walkT || 0) * 13, moving: !!p.moving, facing: p.facing,
    amp: 1.15, idle: p.dinoT || 0, headTilt: Math.sin((p.dinoT || 0) * 2.2) * .02
  });
  if (red) { ctx.filter = 'none'; ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; }
"""
NEW_RIG = """  // v4.33：優先用新的手繪坐騎圖；沒有圖才退回原本的拆件骨架，再退回下面的程式繪圖
  const drewMount = drawMountSprite(ctx, red ? 'red' : 'green', x, footY - bob * 2, DH, side, {
    walk: (p.walkT || 0) * 13, moving: !!p.moving, amp: 1.15, idle: p.dinoT || 0
  });
  const rig = drewMount ? { topY: footY - bob * 2 - DH } : drawRigChar(ctx, 'dragon', x, footY - bob * 2, DH, {
    walk: (p.walkT || 0) * 13, moving: !!p.moving, facing: p.facing,
    amp: 1.15, idle: p.dinoT || 0, headTilt: Math.sin((p.dinoT || 0) * 2.2) * .02
  });
"""
once(OLD_RIG, NEW_RIG, 'drawDino 換圖')

# ---------- 5) 騎乘者放大 20%＋坐姿位置 ----------
once("  const y = p.y - (p.carry ? T * .2 : 0) - (p.dino ? T * .44 : 0);",
     "  const y = p.y - (p.carry ? T * .2 : 0) - (p.dino ? T * .50 : 0);",
     '騎乘者座位高度')
once("  const R = T * .40 * (p.dino ? .62 : 1);   // 騎乘時人縮小一點，才不會把坐騎整個蓋住",
     "  const R = T * .40 * (p.dino ? .82 : 1);   // v4.33：坐騎縮 15% → 騎乘者放大 20%（原本 .62）",
     '騎乘者放大 20%')

# ---------- 6) 載入呼叫 ----------
once('FoeArt.load();', 'FoeArt.load();\nMountArt.load();', 'MountArt.load()')

io.open(PAGE, 'w', encoding='utf-8', newline='').write(s.replace('\n', '\r\n'))
print('done')
