# -*- coding: utf-8 -*-
"""v2.4：
1) 多人對戰 → 自己的角色頭上顯示醒目的「我」
2) BOSS 血條 → 打 5 下就贏
3) 小怪體積放大（判定半徑不變）
"""
import io, sys

P = 'index.html'
s = io.open(P, encoding='utf-8').read()
n = 0


def rep(old, new, label=''):
    global s, n
    if old not in s:
        print('  !! NOT FOUND:', label or old[:70].replace('\n', '\\n'))
        sys.exit(1)
    s = s.replace(old, new, 1)
    n += 1
    print('  ok:', label or old[:60].replace('\n', '\\n'))


# ---------- 2) BOSS 血條：統一 5 下 ----------
rep("""const SOLO_DIFF = {
  easy:   { enemy: .62, speed: .80, bossHp: 7,  eggs: 3, label: '😇 簡單' },
  normal: { enemy: 1,   speed: 1,   bossHp: 10, eggs: 2, label: '🙂 普通' },
  hard:   { enemy: 1.45, speed: 1.22, bossHp: 14, eggs: 1, label: '😈 困難' }
};""",
    """// v2.4：三種難度的 BOSS 統一 5 下（血條滿格 = 5，打五下就贏）
const BOSS_HITS = 5;
const SOLO_DIFF = {
  easy:   { enemy: .62, speed: .80, bossHp: BOSS_HITS, eggs: 3, label: '😇 簡單' },
  normal: { enemy: 1,   speed: 1,   bossHp: BOSS_HITS, eggs: 2, label: '🙂 普通' },
  hard:   { enemy: 1.45, speed: 1.22, bossHp: BOSS_HITS, eggs: 1, label: '😈 困難' }
};""",
    'SOLO_DIFF bossHp → 5')

# ---------- 3) 小怪放大常數 ----------
rep("""// v2.0：飛行怪再快也不能超過這個值（玩家基礎速度 146 → 飛行怪最高約 81%）
const FLY_SPEED_CAP = 118;""",
    """// v2.0：飛行怪再快也不能超過這個值（玩家基礎速度 146 → 飛行怪最高約 81%）
const FLY_SPEED_CAP = 118;
// v2.4：小怪太小看不清楚 → 畫面上放大 42%（只放大外型，判定半徑 e.r 不變，不會變難躲）
const ENEMY_ART_MUL = 1.42;
function enemyArtR(e) { return ((e && e.r) || 14) * ENEMY_ART_MUL; }""",
    'ENEMY_ART_MUL 常數')

# drawEnemy：影子／頭暈位置改用放大後的外型半徑
rep("""  // 飛行怪：影子在正下方地面、隨高度變淡
  if (e.kind === 'fly') {
    softShadow(x, y + e.r * 1.15, e.r * .62, e.r * .2, .22);
  } else {
    // v1.8：BOSS 放大 → 影子也等比放大，才有壓迫感
    const sr = e.boss ? e.r * (e.sizeMul || 1) : e.r;
    softShadow(x, y + sr * .9, sr * .78, sr * .28, .36);
  }""",
    """  // 飛行怪：影子在正下方地面、隨高度變淡
  // v2.4：小怪外型放大 → 影子跟著放大
  const ar = enemyArtR(e);
  if (e.kind === 'fly') {
    softShadow(x, y + ar * 1.15, ar * .62, ar * .2, .22);
  } else {
    // v1.8：BOSS 放大 → 影子也等比放大，才有壓迫感
    const sr = e.boss ? e.r * (e.sizeMul || 1) : ar;
    softShadow(x, y + sr * .9, sr * .78, sr * .28, .36);
  }""",
    'drawEnemy 影子放大')

rep("""  drawEnemyArt(e, x, y, flash, wob);
  if (e.dizzy > 0) drawDizzyMark(x, y - e.r * 1.15, T);          // v1.9：頭暈""",
    """  drawEnemyArt(e, x, y, flash, wob);
  if (e.dizzy > 0) drawDizzyMark(x, y - ar * 1.15, T);           // v1.9：頭暈（v2.4：跟著體型上移）""",
    '頭暈標記跟著體型')

rep("""function drawEnemyArt(e, x, y, flash, wob) {
  const R = e.r, sp = e.spec || e.type || 'slime';""",
    """function drawEnemyArt(e, x, y, flash, wob) {
  const R = enemyArtR(e), sp = e.spec || e.type || 'slime';      // v2.4：R 用放大後的外型半徑""",
    'drawEnemyArt 放大')

# ---------- 1) 「我」標記 ----------
rep("""function drawPlayer(p, T) {""",
    """// v2.4：多人對戰怕混淆敵我 → 自己的角色頭上頂一個醒目的「我」
const ME_BADGE_TXT = '我';
function isMyPlayer(p) {
  if (!p || p.ai) return false;                 // AI 電腦永遠不是「我」
  if (typeof Net !== 'undefined' && Net && Net.on && Net.pid) {
    // 線上對戰：只認自己的座位（別的玩家雖然也是人類，但不是我）
    const s = (Net.slotOf && Net.slotOf[Net.pid]);
    if (typeof s === 'number' && s >= 0) return p.slot === s;
    if (typeof Net.mySlot === 'number' && Net.mySlot >= 0) return p.slot === Net.mySlot;
  }
  return true;                                  // 本機對戰：不是 AI 的就是我
}
function drawMeBadge(x, y, R, T) {
  if (!ctx || !ctx.save) return;
  const t = Game.gameT;
  const w = Math.max(21, T * .56), h = Math.max(17, T * .44);
  const bob = Math.sin(t * 5.2) * Math.max(1.2, T * .035);
  // 對戰時頭上還有名字名牌（高 13），「我」再往上疊
  const top = y - R * 2.3 - 17 - h + bob;
  const L = x - w / 2, Rr = Math.min(h / 2, w / 3);
  ctx.save();
  // 底下的柔光（混戰裡也一眼看到自己）
  ctx.globalAlpha = .30 * (.62 + Math.sin(t * 6) * .28);
  ctx.fillStyle = '#ffd166';
  ctx.beginPath(); ctx.ellipse(x, top + h / 2, w * .74, h * .84, 0, 0, 6.283); ctx.fill();
  ctx.globalAlpha = 1;
  // 指向頭頂的小三角
  ctx.beginPath();
  ctx.moveTo(x - h * .24, top + h - 1);
  ctx.lineTo(x + h * .24, top + h - 1);
  ctx.lineTo(x, top + h + h * .38);
  ctx.closePath();
  ctx.fillStyle = '#ffd166'; ctx.fill();
  // 圓角牌子
  ctx.beginPath();
  ctx.moveTo(L + Rr, top);
  ctx.lineTo(L + w - Rr, top);
  ctx.quadraticCurveTo(L + w, top, L + w, top + Rr);
  ctx.lineTo(L + w, top + h - Rr);
  ctx.quadraticCurveTo(L + w, top + h, L + w - Rr, top + h);
  ctx.lineTo(L + Rr, top + h);
  ctx.quadraticCurveTo(L, top + h, L, top + h - Rr);
  ctx.lineTo(L, top + Rr);
  ctx.quadraticCurveTo(L, top, L + Rr, top);
  ctx.closePath();
  ctx.fillStyle = '#ffd166'; ctx.fill();
  ctx.strokeStyle = 'rgba(28,12,0,.9)';
  ctx.lineWidth = Math.max(1.4, T * .05); ctx.stroke();
  ctx.lineWidth = 1;
  // 「我」字（先畫陰影再畫本體，任何背景都清楚）
  ctx.font = '900 ' + Math.round(h * .72) + 'px system-ui, "Microsoft JhengHei", sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(40,14,0,.34)';
  ctx.fillText(ME_BADGE_TXT, x, top + h * .56);
  ctx.fillStyle = '#4a1c00';
  ctx.fillText(ME_BADGE_TXT, x, top + h * .5);
  ctx.restore();
}

function drawPlayer(p, T) {""",
    'isMyPlayer / drawMeBadge')

rep("""    ctx.fillStyle = c.color;
    ctx.fillText(label, x, y - R * 2.3 - 3);
    ctx.textAlign = 'start';
  }""",
    """    ctx.fillStyle = c.color;
    ctx.fillText(label, x, y - R * 2.3 - 3);
    ctx.textAlign = 'start';
  }
  // v2.4：多人對戰 → 自己的角色頭上頂一顆醒目的「我」牌子
  if (Game.mode === 'battle' && p.alive && isMyPlayer(p)) drawMeBadge(x, y - jumpY, R, T);""",
    'drawPlayer 呼叫 drawMeBadge')

# ---------- 匯出 ----------
rep("""  ENEMY_SPECIES: ENEMY_SPECIES, speciesOf: speciesOf, drawEnemyArt: drawEnemyArt, drawDino: drawDino, THEMES: THEMES,""",
    """  ENEMY_SPECIES: ENEMY_SPECIES, speciesOf: speciesOf, drawEnemyArt: drawEnemyArt, drawDino: drawDino, THEMES: THEMES,
  // v2.4 新增
  ENEMY_ART_MUL: ENEMY_ART_MUL, enemyArtR: enemyArtR, BOSS_HITS: BOSS_HITS, SOLO_DIFF: SOLO_DIFF,
  isMyPlayer: isMyPlayer, drawMeBadge: drawMeBadge, ME_BADGE_TXT: ME_BADGE_TXT,""",
    '匯出 v2.4 API')

# ---------- 版本 ----------
rep("const VERSION = '2.3';", "const VERSION = '2.4';", 'VERSION')
rep('<span id="verTxt">2.3</span>', '<span id="verTxt">2.4</span>', 'verTxt')

io.open(P, 'w', encoding='utf-8', newline='\n').write(s)
print('patched', n, 'bytes', len(s.encode('utf-8')))
