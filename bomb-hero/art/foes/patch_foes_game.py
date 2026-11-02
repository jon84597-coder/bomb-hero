# -*- coding: utf-8 -*-
"""把第一大關 6 隻小怪接進 index.html（單張貼圖 + 鏡像轉向 + 程序化動作）。可重複執行。"""
import io
import os
import re
import sys

ROOT = r'C:\Users\jon84\WorkBuddy\2026-10-30-12-58-54\bomb-hero'
PAGE = os.path.join(ROOT, 'index.html')
DATA = os.path.join(ROOT, 'art', 'foes', '_foes_game_parts.js')

s = io.open(PAGE, encoding='utf-8', newline='').read().replace('\r\n', '\n')
orig = len(s)
foe_js = io.open(DATA, encoding='utf-8', newline='').read().replace('\r\n', '\n').strip()

# ---------- 1) FOE_ART 資料 ----------
if 'const FOE_ART = {' in s:
    s = re.sub(r'// -+ v4\.30：第一大關小怪美術.*?\n\};\n', foe_js + '\n', s, count=1, flags=re.S)
else:
    anchor = 'const IMG_PARTS = {'
    assert s.count(anchor) == 1
    s = s.replace(anchor, foe_js + '\n' + anchor, 1)

# ---------- 2) 載入器 + 繪製函式 ----------
BLOCK = r'''// <<FOE_SPRITE_BEGIN>>
// ================================================================
//   v4.30：第一大關 6 隻小怪換成美術圖（單張貼圖）
//   · 小怪沒有拆件 → 用「鏡像 ＋ 擠壓 ＋ 抬升 ＋ 傾斜」做動作，
//     角色空間的 +x 永遠 = 面朝方向，所以所有前傾／前挪都寫正數。
//   · M.dir = 原圖朝哪邊；side = 想去的方向 × dir → 往左走就整隻左右翻。
//   · 圖還沒載入（has 為 false）→ 呼叫端自動退回原本的手繪，不會開天窗。
// ================================================================
const FoeArt = (function () {
  try {
    return (function () {
      const imgs = {}, whites = {}, ready = {};
      // 受傷白閃用：預先做一張「純白剪影」，比每帧開 filter 便宜（手機才不掉帧）
      function makeWhite(im) {
        try {
          const cv = document.createElement('canvas');
          cv.width = im.naturalWidth; cv.height = im.naturalHeight;
          const c2 = cv.getContext('2d');
          c2.drawImage(im, 0, 0);
          c2.globalCompositeOperation = 'source-in';
          c2.fillStyle = '#ffffff';
          c2.fillRect(0, 0, cv.width, cv.height);
          return cv;
        } catch (e) { return null; }
      }
      function load() {
        if (typeof Image === 'undefined' || typeof FOE_ART === 'undefined') return;
        Object.keys(FOE_ART).forEach(function (k) {
          const im = new Image();
          im.onload = function () {
            ready[k] = true;
            const w = makeWhite(im);
            if (w) whites[k] = w;
          };
          im.onerror = function () { ready[k] = false; };
          try { im.src = FOE_ART[k].u; } catch (e) {}
          imgs[k] = im;
        });
      }
      function has(k) { return !!(FOE_ART && FOE_ART[k] && ready[k] && imgs[k] && imgs[k].naturalWidth); }
      function get(k) { return has(k) ? imgs[k] : null; }
      function whiteOf(k) { return has(k) ? whites[k] : null; }
      function readyCount() { return Object.keys(ready).filter(function (k) { return ready[k]; }).length; }
      return { load: load, has: has, get: get, whiteOf: whiteOf, readyCount: readyCount,
               imgs: imgs, keys: function () { return FOE_ART ? Object.keys(FOE_ART) : []; } };
    })();
  } catch (__e) {
    if (typeof __bootFail === 'function') __bootFail('FoeArt', __e);
    return { load: function () {}, has: function () { return false; }, get: function () { return null; },
             whiteOf: function () { return null; }, readyCount: function () { return 0; },
             imgs: {}, keys: function () { return []; } };
  }
})();

// 面向：地面小怪是「格子式」移動（只用 dirName，沒有 vx），所以看 dirName 決定左右；
//   上下移動時沿用上一次的左右朝向（不要上下抖就亂翻面）。回傳值一定非 0。
function foeLookSide(e) {
  const d = DIRS[e.dirName];
  if (d && d.x) { e._faceS = d.x < 0 ? -1 : 1; return e._faceS; }
  return e._faceS || 1;
}

function drawFoeSprite(g, sp, e, x, y, R, flash) {
  const M = (typeof FOE_ART !== 'undefined') ? FOE_ART[sp] : null;
  const img = FoeArt.get(sp);
  if (!M || !img) return false;
  const t = Game.gameT;
  const w = e.walkT || 0;
  const H = R * (M.hs || 1.9);          // 顯示高度（含耳朵／觸角，等於整張圖）
  const W = H * M.asp;
  // 「有沒有在走」＝跟上一帧比位置有沒有變（換格、撞牆、被暈住都會自然變成 0）
  const lx = e._fx, ly = e._fy;
  const moving = (lx == null) || (Math.abs(e.x - lx) + Math.abs(e.y - ly) > .01);
  e._fx = e.x; e._fy = e.y;
  const look = foeLookSide(e);
  const side = look * (M.dir || 1);
  const footY = y + R * .95;                    // 腳底＝地上（跟影子對齊）
  const anim = M.anim || 'jelly';
  let sx = 1, sy = 1, lift = 0, tilt = 0, fwd = 0;

  if (anim === 'jelly') {
    // 史萊姆：果凍上下彈，落地時壓扁
    const j = Math.sin(w * 7);
    const k = moving ? 1 : .45;
    const br = Math.sin(t * 2.3) * .03;                 // 站著也會呼吸
    sx = 1 + j * .075 * k + br;
    sy = 1 - j * .075 * k - br;
    lift = moving ? Math.max(0, j) * H * .11 : 0;
  } else if (anim === 'hop') {
    // 兔／青蛙：一蹬一跳（最高點拉長、落地壓扁）
    const ph = w * 8.5;
    const hop = moving ? Math.abs(Math.sin(ph)) : 0;
    const sq = moving ? ((1 - hop) * .075 - hop * .045) : Math.sin(t * 2.2) * .012;
    lift = moving ? hop * H * .17 : (Math.sin(t * 2.2) * .5 + .5) * H * .012;
    sy = 1 - sq;
    sx = 1 + sq * .55;
    tilt = moving ? Math.sin(ph * 2) * .035 : Math.sin(t * 1.7) * .012;
  } else if (anim === 'inch') {
    // 毛毛蟲：一節一節蠕動（橫向拉伸 → 縱向收縮）
    const j = Math.sin(w * 5.2);
    const k = moving ? 1 : .3;
    sx = 1 + j * .105 * k;
    sy = 1 - j * .075 * k;
    lift = moving ? Math.max(0, j) * H * .03 : Math.sin(t * 2) * H * .008;
    fwd = moving ? j * H * .035 : 0;
  } else if (anim === 'sway') {
    // 毒菇怪：左右搖 ＋ 小小跳
    const j = Math.sin(t * 2.7 + w * 2);
    tilt = (moving ? .105 : .045) * j;
    lift = moving ? Math.abs(Math.sin(w * 6)) * H * .075 : Math.sin(t * 2.1) * H * .012;
    sy = 1 + Math.sin(t * 3.1) * .015;
    sx = 1 - Math.sin(t * 3.1) * .01;
  } else {
    // 鐵甲蟲：六腳快速小碎步
    const j = Math.sin(w * 20);
    lift = Math.abs(j) * H * .05 * (moving ? 1 : .35);
    tilt = Math.sin(w * 10) * .030 * (moving ? 1 : .35);
    sy = 1 + j * .030 * (moving ? 1 : .35);
    sx = 1 - j * .020 * (moving ? 1 : .35);
  }

  g.save();
  g.translate(x + side * fwd, footY - lift);
  g.scale(side * sx, sy);
  if (tilt) g.rotate(tilt);
  if (flash) {
    const wt = FoeArt.whiteOf(sp);
    if (wt) g.drawImage(wt, -W / 2, -H, W, H);
    else { try { g.filter = 'brightness(3) saturate(0)'; } catch (err) {} g.drawImage(img, -W / 2, -H, W, H); }
  } else {
    g.drawImage(img, -W / 2, -H, W, H);
  }
  try { g.filter = 'none'; } catch (err) {}
  g.restore();
  return true;
}
// <<FOE_SPRITE_END>>'''

if '// <<FOE_SPRITE_BEGIN>>' in s:
    s = re.sub(r'// <<FOE_SPRITE_BEGIN>>.*?// <<FOE_SPRITE_END>>', lambda m: BLOCK, s, count=1, flags=re.S)
else:
    anchor = 'function drawEnemyArt(e, x, y, flash, wob) {'
    assert s.count(anchor) == 1
    s = s.replace(anchor, BLOCK + '\n\n' + anchor, 1)

# ---------- 3) drawEnemyArt 開頭掛鉤 ----------
old_head = ("function drawEnemyArt(e, x, y, flash, wob) {\n"
            "  const R = enemyArtR(e), sp = e.spec || e.type || 'slime';")
new_head = ("function drawEnemyArt(e, x, y, flash, wob) {\n"
            "  const R = enemyArtR(e), sp = e.spec || e.type || 'slime';\n"
            "  // v4.30：第一大關 6 隻小怪有美術圖 → 直接用圖（含左右翻面）；沒載入就往下走原本的手繪\n"
            "  if (FoeArt.has(sp) && drawFoeSprite(ctx, sp, e, x, y, R, flash)) return;")
if new_head not in s:
    assert s.count(old_head) == 1, 'drawEnemyArt 開頭找不到'
    s = s.replace(old_head, new_head, 1)

# ---------- 4) 載入呼叫 ----------
if 'FoeArt.load();' not in s:
    assert s.count('Parts.load();') == 1
    s = s.replace('Parts.load();', 'Parts.load();\nFoeArt.load();', 1)

# ---------- 4b) 除錯匯出（測試用）----------
if 'FoeArt: FoeArt' not in s:
    old_ex = '  ENEMY_SPECIES: ENEMY_SPECIES, speciesOf: speciesOf, drawEnemyArt: drawEnemyArt, drawDino: drawDino, THEMES: THEMES,'
    assert s.count(old_ex) == 1
    s = s.replace(old_ex, old_ex + '\n'
                  '  // v4.30：小怪美術（測試／除錯用）\n'
                  '  FoeArt: FoeArt, FOE_ART: FOE_ART, drawFoeSprite: drawFoeSprite, makeEnemy: makeEnemy,', 1)

# ---------- 5) 版號 ----------
if "const VERSION = '4.29';" in s:
    s = s.replace("const VERSION = '4.29';", "const VERSION = '4.30';")
    s = s.replace('<span id="verLogVer">4.29</span>', '<span id="verLogVer">4.30</span>')
    s = s.replace('<span id="verTxt">4.29</span>', '<span id="verTxt">4.30</span>')
    old_log = "  { v: '4.29', date: '2026-11-02', now: true, items: ["
    assert s.count(old_log) == 1
    s = s.replace(old_log, "  { v: '4.30', date: '2026-11-02', now: true, items: [\n"
                           "    '第一大關 6 隻小怪換成手繪美術圖（史萊姆／蹦蹦兔／小青蛙／毛毛蟲／毒菇怪／鐵甲蟲）',\n"
                           "    '小怪走路會面向左右，並依體型做跳躍、蠕動、搖擺、碎步動作',\n"
                           "    '沒載入成功時自動退回原本的程式繪圖，不會出現空白怪'\n"
                           "  ] },\n"
                           "  { v: '4.29', date: '2026-11-02', now: false, items: [")

io.open(PAGE, 'w', encoding='utf-8', newline='').write(s.replace('\n', '\r\n'))
print('index.html %d → %d bytes (+%.0f KB)' % (orig, len(s), (len(s) - orig) / 1024.0))
