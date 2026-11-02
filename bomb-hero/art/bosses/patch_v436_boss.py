# -*- coding: utf-8 -*-
# v4.36 patch 4：八大關卡 BOSS 美術接進遊戲
import io, sys

BASE = r'C:\Users\jon84\WorkBuddy\2026-10-30-12-58-54\bomb-hero'
P = BASE + r'\index.html'
s = io.open(P, encoding='utf-8', newline='').read()
orig = s
boss_js = io.open(BASE + r'\art\bosses\_bosses_game.js', encoding='utf-8', newline='').read().strip()

def rep(old, new, n=1, tag=''):
    global s
    old = old.replace('\r\n', '\n'); new = new.replace('\r\n', '\n')
    lf = s.replace('\r\n', '\n')
    c = lf.count(old)
    if c != n:
        print('!! [%s] 命中 %d 次（預期 %d）' % (tag, c, n)); sys.exit(1)
    s = lf.replace(old, new).replace('\n', '\r\n')
    print('ok  [%s]' % tag)

# 1) 資料
rep("""const FoeArt = (function () {""", boss_js + """

const FoeArt = (function () {""", 1, 'BOSS_ART')

# 2) 載入器（照 FoeArt 的寫法，含白閃剪影）
rep("""// 面向：地面小怪是「格子式」移動（只用 dirName，沒有 vx），所以看 dirName 決定左右；""",
"""// v4.36：BOSS 貼圖載入（八大關卡各一張；跟 FoeArt 同一套寫法）
const BossArt = (function () {
  try {
    return (function () {
      const imgs = {}, whites = {}, ready = {};
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
        if (typeof Image === 'undefined' || typeof BOSS_ART === 'undefined') return;
        Object.keys(BOSS_ART).forEach(function (k) {
          const im = new Image();
          im.onload = function () { ready[k] = true; const w = makeWhite(im); if (w) whites[k] = w; };
          im.onerror = function () { ready[k] = false; };
          try { im.src = BOSS_ART[k].u; } catch (e) {}
          imgs[k] = im;
        });
      }
      function has(k) { return !!(BOSS_ART && BOSS_ART[k] && ready[k] && imgs[k] && imgs[k].naturalWidth); }
      function get(k) { return has(k) ? imgs[k] : null; }
      function whiteOf(k) { return has(k) ? whites[k] : null; }
      function readyCount() { return Object.keys(ready).filter(function (k) { return ready[k]; }).length; }
      return { load: load, has: has, get: get, whiteOf: whiteOf, readyCount: readyCount, imgs: imgs };
    })();
  } catch (__e) {
    if (typeof __bootFail === 'function') __bootFail('BossArt', __e);
    return { load: function () {}, has: function () { return false; }, get: function () { return null; },
             whiteOf: function () { return null; }, readyCount: function () { return 0; }, imgs: {} };
  }
})();

// 面向：地面小怪是「格子式」移動（只用 dirName，沒有 vx），所以看 dirName 決定左右；""", 1, 'BossArt')

# 3) 繪製
rep("""function drawEnemy(e, T) {""",
"""// v4.36：BOSS 用單張貼圖（呼吸 + 上下浮 + 走路傾斜 + 依方向鏡像）
//   沒有貼圖時回傳 false，呼叫端會退回原本的「拆件骨架」畫法 → 不會開天窗
function bossArtKey() {
  const ch = (typeof blockOf === 'function') ? blockOf(Game.stage || 1) : 1;
  return 'b' + ch;
}
function drawBossSprite(e, x, footY, H, flash) {
  const key = bossArtKey();
  if (typeof BossArt === 'undefined' || !BossArt.has(key)) return false;
  const M = BOSS_ART[key], im = BossArt.get(key);
  const img = flash ? (BossArt.whiteOf(key) || im) : im;
  if (!img) return false;
  const W = H * (M.asp || 1);
  const face = DIRS[e.dirName] || DIRS.down;
  const side = face.x < 0 ? -1 : 1;
  const t = Game.gameT;
  const resp = Math.sin(t * 2.1) * .018;                      // 呼吸
  const bob = Math.abs(Math.sin(t * 2.6)) * H * .012;          // 上下浮
  const lean = face.x ? side * Math.sin((e.walkT || 0) * 8) * .035 : 0;   // 走路左右傾
  ctx.save();
  ctx.translate(x, footY - bob);
  ctx.rotate(lean);
  ctx.scale(side * (1 + resp * .5), 1 - resp);
  ctx.drawImage(img, -W / 2, -H, W, H);
  ctx.restore();
  return true;
}

function drawEnemy(e, T) {""", 1, 'drawBossSprite')

# 4) 接到 BOSS 分支（貼圖優先，沒有才用骨架）
rep("""    const rig = drawRigChar(ctx, 'boss', x, bFoot, BH, {
      walk: (e.walkT || 0) * 9, moving: true, facing: dir,
      amp: .95, idle: Game.gameT, expr: flash ? 'hurt' : '',
      armSwing: .16, headTilt: Math.sin((e.walkT || 0) * 3) * .03
    });""",
"""    // v4.36：先試「八大關卡的專屬 BOSS 貼圖」；沒有才退回原本的拆件骨架
    const drewBoss = drawBossSprite(e, x, bFoot, BH, flash);
    const rig = drewBoss ? true : drawRigChar(ctx, 'boss', x, bFoot, BH, {
      walk: (e.walkT || 0) * 9, moving: true, facing: dir,
      amp: .95, idle: Game.gameT, expr: flash ? 'hurt' : '',
      armSwing: .16, headTilt: Math.sin((e.walkT || 0) * 3) * .03
    });""", 1, 'boss-branch')

# 5) 開機載入
rep("""FoeArt.load();
MountArt.load();""", """FoeArt.load();
MountArt.load();
BossArt.load();          // v4.36：八大關卡 BOSS 貼圖""", 1, 'boss-load')

# 6) 導出
rep("""  HERO_SIZE_K: HERO_SIZE_K, heroSizeK: heroSizeK, flameCovers: flameCovers, DINO_FIRE_RANGE: DINO_FIRE_RANGE,""",
"""  HERO_SIZE_K: HERO_SIZE_K, heroSizeK: heroSizeK, flameCovers: flameCovers, DINO_FIRE_RANGE: DINO_FIRE_RANGE,
  BOSS_ART: (typeof BOSS_ART !== 'undefined' ? BOSS_ART : null), BossArt: (typeof BossArt !== 'undefined' ? BossArt : null),
  drawBossSprite: drawBossSprite, bossArtKey: bossArtKey,""", 1, 'export')

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('\nDONE  chars %d -> %d' % (len(orig), len(s)))
