# -*- coding: utf-8 -*-
"""v2.6：
   1. 手機橫式：坐騎招式（🔥）改排在「遙控引爆」的左邊（原本疊在上方會被 ⛶ 擋住）
   2. 畫面不要整張地圖全塞（100%）→ 只裝 60%，接近 PC 的可視比例
   3. 小怪／BOSS 美術尺寸跟著格子縮放 → 維持 PC 看到的大小（不會因為格子變小而顯得過大）
"""
import io, sys

P = '../index.html' if False else 'index.html'
s = io.open(P, encoding='utf-8').read()

def rep(old, new, label):
    global s
    if old not in s:
        print('!! 找不到：' + label)
        sys.exit(1)
    if s.count(old) != 1:
        print('!! 出現 %d 次：%s' % (s.count(old), label))
        sys.exit(1)
    s = s.replace(old, new, 1)
    print('ok  ' + label)

# ---------- 2) 格子大小：手機只裝 60% ----------
rep("""function tileSize() {
  // v2.5：手機上「整張地圖」都要看得到（之前只看得到局部，整個局面看不到）。
  // 格子 = 畫面寬、高都能塞下全部行列的最小值；桌機維持原本依高度決定的手感。
  if (document.body && document.body.classList.contains('touch')) {
    const fit = Math.floor(Math.min(VIEW_W / Game.cols, VIEW_H / Game.rows));
    return clamp(fit, 20, 62);
  }
  return clamp(Math.round(VIEW_H / 9.2), 30, 62);
}""",
"""// v2.6：手機上「畫面要看到整張地圖的幾成」。1.0 = 整張塞進去（格子太小、怪看起來過大），
// 0.6 = 只裝六成，接近 PC 上看到的可視比例；其他地方交給相機跟著玩家捲。
const MOBILE_VIEW_FRAC = 0.6;
function tileSize() {
  // v2.5 → v2.6：先算「整張塞進去」的格子，再放大到只裝 MOBILE_VIEW_FRAC。
  // 桌機維持原本依高度決定的手感。
  if (document.body && document.body.classList.contains('touch')) {
    const fit = Math.floor(Math.min(VIEW_W / Game.cols, VIEW_H / Game.rows));
    return clamp(Math.round(fit / MOBILE_VIEW_FRAC), 24, 62);
  }
  return clamp(Math.round(VIEW_H / 9.2), 30, 62);
}""", 'tileSize 改 60% 視野')

# ---------- 3) 小怪美術尺寸跟著格子縮放 ----------
rep("""const ENEMY_ART_MUL = 1.42;
function enemyArtR(e) { return ((e && e.r) || 14) * ENEMY_ART_MUL; }""",
"""const ENEMY_ART_MUL = 1.42;
// v2.6：美術尺寸的基準格子（= PC 上的格子大小）。手機上格子會縮小，
// 小怪／BOSS 也等比縮回去 → 維持「PC 上看到的大小」，不會因為格子變小而顯得過大。
const ART_REF_TILE = 62;
function tileArtK() {
  const T = (typeof Game !== 'undefined' && Game && Game.T) || ART_REF_TILE;
  return clamp(T / ART_REF_TILE, .6, 1.2);
}
function enemyArtR(e) {
  const base = (e && e.r) || 14;
  // 永遠不小於判定半徑（免得「看起來還沒碰到就扣血」）
  return Math.max(base * ENEMY_ART_MUL * tileArtK(), base * 1.05);
}""", 'enemyArtR 跟著格子縮放')

# BOSS 也等比
rep("    const sr = e.boss ? e.r * (e.sizeMul || 1) : ar;",
    "    const sr = e.boss ? e.r * (e.sizeMul || 1) * tileArtK() : ar;   // v2.6：BOSS 影子跟著格子縮放",
    'BOSS 影子縮放')

rep("""    const BS = e.sizeMul || 1;
    const BH = e.r * 4.3 * BS;
    const bFoot = y + e.r * 1.45 * (BS > 1 ? 1.08 : 1);""",
"""    const BS = e.sizeMul || 1;
    const AK = tileArtK();                       // v2.6：BOSS 身軀跟著格子縮放
    const BH = e.r * 4.3 * BS * AK;
    const bFoot = y + e.r * 1.45 * (BS > 1 ? 1.08 : 1) * AK;""",
    'BOSS 身軀縮放')

rep("""      // 插畫還沒載入 → 先畫外星魔王（不會開天窗）
      const R = e.r * 1.05;""",
"""      // 插畫還沒載入 → 先畫外星魔王（不會開天窗）
      const R = e.r * 1.05 * tileArtK();""",
    'BOSS 替代外型縮放')

# ---------- 1) 坐騎招式按鈕改到「遙控引爆」左邊 ----------
rep("""  #touchUI .tfire {
    left: var(--act-left); right: var(--act-right); bottom: 194px;""",
"""  /* v2.6：坐騎招式（🔥）改排在「遙控引爆」的左邊 —— 原本疊在遙控引爆上方，
     橫式畫面比較矮時會跟右上角的 ⛶ 全視窗鈕撞在一起（按不到）。 */
  #touchUI .tfire {
    left: var(--act-left2); right: var(--act-right2); bottom: 126px;""",
    'tfire 改排遙控引爆左邊')

rep("""    '--act-left': actLeft ? '14px' : 'auto',
    '--act-right': actLeft ? 'auto' : '14px',
    '--act-origin': actLeft ? 'left bottom' : 'right bottom'
  };""",
"""    '--act-left': actLeft ? '14px' : 'auto',
    '--act-right': actLeft ? 'auto' : '14px',
    '--act-origin': actLeft ? 'left bottom' : 'right bottom',
    // v2.6：第二顆小鈕（🔥）往內側偏一格寬 —— 預設（放彈鍵在右）時就是「遙控引爆的左邊」
    '--act-left2': actLeft ? actOff2(t) + 'px' : 'auto',
    '--act-right2': actLeft ? 'auto' : actOff2(t) + 'px'
  };""",
    'touchLayoutVars 加第二顆小鈕偏移')

rep("""// ---------- 控制模式（鍵盤／手把／手機） ----------
function touchLayoutVars() {""",
"""// ---------- 控制模式（鍵盤／手把／手機） ----------
// v2.6：第二顆小鈕距離畫面邊緣的距離 = 邊距 + 鈕寬 + 間距（依目前大小縮放，不會互相壓到）
function actOff2(t) { return Math.round(14 + 62 * (t.size || 1) + 10); }
function touchLayoutVars() {""",
    'actOff2 計算函式')

# ---------- 版本 ----------
rep("const VERSION = '2.5';", "const VERSION = '2.6';", 'VERSION 2.6')
rep('<span id="verTxt">2.5</span>', '<span id="verTxt">2.6</span>', '徽章版本號 2.6')

# ---------- 匯出 ----------
rep("""  ENEMY_ART_MUL: ENEMY_ART_MUL, enemyArtR: enemyArtR, BOSS_HITS: BOSS_HITS, SOLO_DIFF: SOLO_DIFF,""",
"""  ENEMY_ART_MUL: ENEMY_ART_MUL, enemyArtR: enemyArtR, BOSS_HITS: BOSS_HITS, SOLO_DIFF: SOLO_DIFF,
  // v2.6 新增
  tileArtK: tileArtK, ART_REF_TILE: ART_REF_TILE, MOBILE_VIEW_FRAC: MOBILE_VIEW_FRAC,
  tileSize: tileSize, actOff2: actOff2,""",
    '匯出 v2.6 常數')

io.open(P, 'w', encoding='utf-8', newline='\n').write(s)
print('\nbytes:', len(s.encode('utf-8')))
