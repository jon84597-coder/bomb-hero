# -*- coding: utf-8 -*-
"""v4.40-2：五種「藏人用的場景物件」—— 新美術貼圖＋主題配對＋比一格大一點

  bush 灌木叢 / hut 破木屋 / rock 石堆 / jar 陶甕 / crate 木箱堆
  貼圖來源：art/hides/pack_hides.py → _hides_game.js（HIDE_ART）
"""
import io
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
P = os.path.join(ROOT, 'index.html')
DATA = os.path.join(ROOT, 'art', 'hides', '_hides_game.js')
s = io.open(P, encoding='utf-8', newline='').read()
CRLF = '\r\n' in s


def rep(old, new, tag):
    global s
    if CRLF:
        old = old.replace('\n', '\r\n')
        new = new.replace('\n', '\r\n')
    assert s.count(old) == 1, 'count=%d [%s]' % (s.count(old), tag)
    s = s.replace(old, new)
    print('ok [%s]' % tag)


art = io.open(DATA, encoding='utf-8').read().replace('\r\n', '\n').rstrip('\n')

# ---------- 1) 貼圖資料 ----------
rep("""// v4.39：恐龍蛋貼圖載入（跟 ItemArt 同一套寫法）""",
    art + """

// v4.40：藏人場景物件貼圖載入（跟 ItemArt／EggArt 同一套寫法）
const HideArt = (function () {
  try {
    return (function () {
      const imgs = {}, ready = {};
      function load() {
        if (typeof Image === 'undefined' || typeof HIDE_ART === 'undefined') return;
        Object.keys(HIDE_ART).forEach(function (k) {
          const im = new Image();
          im.onload = function () { ready[k] = true; };
          im.onerror = function () { ready[k] = false; };
          imgs[k] = im;
          try { im.src = HIDE_ART[k].u; } catch (e) {}
        });
      }
      function get(k) {
        const im = imgs[k];
        return (ready[k] && im && im.naturalWidth) ? im : null;
      }
      function readyCount() {
        return Object.keys(ready).filter(function (k) { return ready[k]; }).length;
      }
      function has(k) { return !!get(k); }
      return { load: load, get: get, has: has, readyCount: readyCount };
    })();
  } catch (__e) {
    if (typeof __bootFail === 'function') __bootFail('HideArt', __e);
    return {
      load: function () {}, get: function () { return null; }, has: function () { return false; },
      readyCount: function () { return 0; }
    };
  }
})();

// v4.39：恐龍蛋貼圖載入（跟 ItemArt 同一套寫法）""",
    'hide-art-data')

# ---------- 2) 主題配對 ----------
rep("""// 在地圖空地隨機放躲點（出生點、出口、已有機關的格子都避開）
function placeHideTiles(cols, rows, rnd, spawns) {""",
    """// v4.40：五種藏人場景物件。每一大關挑「合主題」的幾種（第一個最常見）
const HIDE_KINDS = ['bush', 'hut', 'rock', 'jar', 'crate'];
const HIDE_UI_ICON = { bush: '\\ud83c\\udf3f', hut: '\\ud83c\\udfda\\ud83c\\udfe0', rock: '\\ud83e\\udea8', jar: '\\ud83c\\udffa', crate: '\\ud83d\\udce6' };
const HIDE_THEME_POOL = [
  ['bush', 'bush', 'hut', 'crate'],       // 1 綠野草原：樹叢、破屋
  ['jar', 'jar', 'rock', 'crate'],        // 2 沙漠遺跡：大陶甕、石堆
  ['rock', 'crate', 'bush', 'hut'],       // 3 冰雪原：石堆、貨箱
  ['rock', 'rock', 'crate', 'jar'],       // 4 熔岩洞窟：石堆
  ['crate', 'crate', 'jar', 'rock'],      // 5 夜光彩城：貨箱堆
  ['jar', 'rock', 'bush', 'crate'],       // 6 深海遺跡：陶甕、石堆
  ['crate', 'rock', 'hut', 'jar'],        // 7 天空要塞：貨箱堆
  ['rock', 'hut', 'crate', 'jar']         // 8 暗黑魔王城：石堆、破屋
];
function hidePool() {
  let i = -1;
  try { i = THEMES.indexOf(Game.theme); } catch (e) {}
  return HIDE_THEME_POOL[i] || HIDE_THEME_POOL[0];
}
// 在地圖空地隨機放躲點（出生點、出口、已有機關的格子都避開）
function placeHideTiles(cols, rows, rnd, spawns) {""",
    'hide-pool')

rep("""    Game.hazards[sp.y][sp.x] = {
      type: 'hide',
      kind: R2() < .58 ? 'bush' : 'hut',
      seed: Math.floor(R2() * 997)
    };""",
    """    const pool = hidePool();
    Game.hazards[sp.y][sp.x] = {
      type: 'hide',
      kind: pool[Math.floor(R2() * pool.length)] || 'bush',
      seed: Math.floor(R2() * 997)
    };""",
    'hide-kind')

# ---------- 3) 繪製 ----------
rep("""      if (hz.kind === 'hut') drawHutTile(x * T, y * T, T, alpha, hz.seed);
      else drawBushTile(x * T, y * T, T, alpha, hz.seed);""",
    """      drawHideTile(x * T, y * T, T, alpha, hz.kind, hz.seed);""",
    'canopy-call')

rep("""        ctx.fillText(hz.kind === 'hut' ? '🏚️' : '🌿', x * T + T * .84, y * T + T * .26);""",
    """        ctx.fillText(HIDE_UI_ICON[hz.kind] || '🌿', x * T + T * .84, y * T + T * .26);""",
    'canopy-icon')

# ---------- 4) drawHideTile ----------
rep("""function drawBushTile(px, py, T, alpha, seed) {""",
    """// v4.40：畫一個藏人場景物件。
//   · 有美術圖就用圖（寬 1.26 格 → 比一格再大一點，高的物件往上長，不壓地板）
//   · 沒圖（離線／還在載入）才退回原本的向量樹叢／破屋 → 不會開天窗
function drawHideTile(px, py, T, alpha, kind, seed) {
  const img = (typeof HideArt !== 'undefined') ? HideArt.get(kind) : null;
  const M = (typeof HIDE_ART !== 'undefined') ? HIDE_ART[kind] : null;
  if (!img || !M) {
    if (kind === 'hut') return drawHutTile(px, py, T, alpha, seed);
    return drawBushTile(px, py, T, alpha, seed);
  }
  const s2 = (seed || 0) % 97;
  // 草叢會隨風輕輕晃（其他物件不動 → 一眼分得出哪個是植物）
  const sway = (kind === 'bush')
    ? Math.sin(Game.gameT * 1.7 + s2 * .31) * T * .020
    : 0;
  const w = T * HIDE_ART_SCALE;              // 比一格大一點
  const h = w / (M.asp || 1);
  const cx2 = px + T * .5 + sway;
  const base = py + T * .93;                 // 底部對齊格子下緣
  ctx.save();
  ctx.globalAlpha = alpha;
  // 地面影子（比物件窄 → 有站在地上的感覺）
  ctx.fillStyle = 'rgba(16,24,18,.24)';
  ctx.beginPath();
  ctx.ellipse(cx2, base - T * .04, w * .33, T * .10, 0, 0, 6.283);
  ctx.fill();
  ctx.drawImage(img, cx2 - w / 2, base - h, w, h);
  ctx.restore();
}

function drawBushTile(px, py, T, alpha, seed) {""",
    'draw-hide')

# ---------- 5) 尺寸常數 ----------
rep("""const HIDE_KINDS = ['bush', 'hut', 'rock', 'jar', 'crate'];""",
    """const HIDE_KINDS = ['bush', 'hut', 'rock', 'jar', 'crate'];
const HIDE_ART_SCALE = 1.26;     // 物件寬度 = 1.26 格（比格子大一點，但不至於吃掉隔壁）""",
    'scale')

# ---------- 6) 載入 ----------
rep("""EggArt.load();           // v4.39：恐龍蛋貼圖""",
    """EggArt.load();           // v4.39：恐龍蛋貼圖
HideArt.load();          // v4.40：藏人場景物件""",
    'load')

# ---------- 7) 導出 ----------
rep("""  EggArt: EggArt, EGG_ART: EGG_ART, revealEgg: revealEgg, EGG_HIDDEN: EGG_HIDDEN,""",
    """  EggArt: EggArt, EGG_ART: EGG_ART, revealEgg: revealEgg, EGG_HIDDEN: EGG_HIDDEN,
  HideArt: HideArt, HIDE_ART: HIDE_ART, HIDE_KINDS: HIDE_KINDS, HIDE_ART_SCALE: HIDE_ART_SCALE,
  HIDE_THEME_POOL: HIDE_THEME_POOL, hidePool: hidePool, drawHideTile: drawHideTile,""",
    'export')

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('done')
