# -*- coding: utf-8 -*-
"""v4.40-3：小怪吐彈 → 先集氣（全身抖動＋聚氣光球＋落點大預告）再射，飛行速度砍半"""
import io
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
P = os.path.join(ROOT, 'index.html')
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


# ---------- 1) 常數 ----------
rep("""// ===== v4.36：小怪的元素彈（吐彈／落雷都用這個）=====
const BOLT_COLOR = {""",
    """// ===== v4.36：小怪的元素彈（吐彈／落雷都用這個）=====
// v4.40：新手在第一關被打得措手不及 —— 兩個地方放慢／加預告：
//   · BOLT_TRAVEL：彈體飛行時間 .55 → 1.1 秒（＝速度砍半），玩家有時間走開
//   · FOE_CAST_WINDUP：射出去之前先集氣 0.9 秒（全身抖動＋聚氣光球＋落點大預告）
const BOLT_TRAVEL = 1.1;
const FOE_CAST_WINDUP = .9;
const BOLT_COLOR = {""",
    'const')

# ---------- 2) 飛行時間 ----------
rep("""    cx: tcx, cy: tcy, t: 0, dur: .55, kind: kind, owner: e""",
    """    cx: tcx, cy: tcy, t: 0, dur: BOLT_TRAVEL, kind: kind, owner: e""",
    'travel')

# ---------- 3) spit 分支：先集氣 ----------
rep("""  if (e.skill === 'spit') {
    e.skCd = (e.skCd || 0) - dt;
    if (!e.aggro || e.skCd > 0) return;
    const tgt = nearestPlayerTo(e, T * 6.5);
    if (!tgt) return;
    e.skCd = 2.6 + Math.random() * 1.8;
    foeCastBolt(e, Math.floor(tgt.x / T), Math.floor(tgt.y / T));
    return;
  }""",
    """  if (e.skill === 'spit') {
    // ---- 集氣中：站在原地抖，落點預告跟著目標跑，時間到才真的射出去 ----
    if (e.castT > 0) {
      e.castT -= dt;
      const tgt2 = nearestPlayerTo(e, T * 8);
      if (tgt2) { e.castX = Math.floor(tgt2.x / T); e.castY = Math.floor(tgt2.y / T); }
      if (e.castT > 0) return;
      e.castT = 0;
      if (foeCastBolt(e, e.castX, e.castY)) {
        e.skCd = 2.6 + Math.random() * 1.8;
        burst(e.x, e.y - (e.r || 12) * .4, BOLT_COLOR[e.fx] || '#ffb347', 8, 150);
      } else {
        e.skCd = .8;                       // 落點是硬牆 → 很快再試一次
      }
      return;
    }
    e.skCd = (e.skCd || 0) - dt;
    if (!e.aggro || e.skCd > 0) return;
    const tgt = nearestPlayerTo(e, T * 6.5);
    if (!tgt) return;
    // 先集氣（不再「看到你就直接射」）
    e.castT = FOE_CAST_WINDUP;
    e.castX = Math.floor(tgt.x / T);
    e.castY = Math.floor(tgt.y / T);
    e.dirName = Math.abs(tgt.x - e.x) > Math.abs(tgt.y - e.y)
      ? (tgt.x > e.x ? 'right' : 'left') : (tgt.y > e.y ? 'down' : 'up');
    AudioSys.sfx('anger');
    return;
  }""",
    'spit-windup')

# ---------- 4) 集氣時不能走 ----------
rep("""  // v4.13：四種技能的 AI
  if (e.skill) enemySkillTick(e, dt);""",
    """  // v4.13：四種技能的 AI
  if (e.skill) enemySkillTick(e, dt);
  // v4.40：集氣射擊中 → 釘在原地抖（不能邊跑邊集氣，玩家才看得懂「牠要射了」）
  if (e.castT > 0) { enemyFlameDamage(e, dt); return; }""",
    'freeze')

# ---------- 5) 敵人建立時初始化 ----------
rep("""    dirT: 0, dirName: pick(['up', 'down', 'left', 'right']), dead: false, walkT: 0, hitT: 0,
    fleeT: 0""",
    """    dirT: 0, dirName: pick(['up', 'down', 'left', 'right']), dead: false, walkT: 0, hitT: 0,
    castT: 0, castX: 0, castY: 0,       // v4.40：吐彈集氣計時／落點格
    fleeT: 0""",
    'init')

# ---------- 6) 全身抖動 ----------
rep("""function drawEnemy(e, T) {
  const x = e.x, y = e.y;
  const flash = e.hitT > 0;""",
    """function drawEnemy(e, T) {
  // v4.40：集氣準備射擊時「全身抖動」—— 越接近發射抖越大（一眼看出牠在憋招）
  const castK = (e.castT > 0) ? (1 - e.castT / FOE_CAST_WINDUP) : 0;
  const shk = castK > 0
    ? Math.sin(Game.gameT * (54 + castK * 46) + e.x * .07) * T * (.020 + castK * .052)
    : 0;
  const shkY = castK > 0 ? Math.sin(Game.gameT * 41 + e.y * .05) * T * .016 * castK : 0;
  const x = e.x + shk, y = e.y + shkY;
  const flash = e.hitT > 0;""",
    'shake')

# ---------- 7) 集氣特效（地面預告 ＋ 敵人身上聚氣球） ----------
rep("""// v4.36：BOSS 用單張貼圖（呼吸 + 上下浮 + 走路傾斜 + 依方向鏡像）""",
    """// ===== v4.40：小怪吐彈集氣特效 =====
//   地面層：落點預告（大圈往內縮 ＋ 四角括號 ＋ 十字準心 ＋ 從怪物連過去的瞄準虛線）
function drawFoeCastGround(T) {
  const list = Game.enemies;
  if (!list || !list.length) return;
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    if (!(e.castT > 0)) continue;
    const k = 1 - e.castT / FOE_CAST_WINDUP;          // 0 → 1
    const col = BOLT_COLOR[e.fx] || '#ffb347';
    const tx = e.castX * T + T / 2, ty = e.castY * T + T / 2 + T * .10;
    const gt = Game.gameT;
    ctx.save();
    // 1) 命中格：淡色填底（越接近越濃）
    ctx.globalAlpha = .10 + k * .22;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(tx, ty, T * .46, 0, 6.283); ctx.fill();
    // 2) 外圈往內縮，最後貼住格子邊
    const r0 = T * (1.45 - k * 1.02);
    ctx.globalAlpha = .30 + k * .60;
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(2, T * (.055 + k * .075));
    ctx.beginPath(); ctx.arc(tx, ty, r0, 0, 6.283); ctx.stroke();
    // 3) 圈上跑動的短弧（內圈）
    ctx.globalAlpha = .55 + k * .40;
    ctx.lineWidth = Math.max(1.6, T * .045);
    for (let j = 0; j < 4; j++) {
      const a = gt * 2.4 + j * 1.5708;
      ctx.beginPath(); ctx.arc(tx, ty, r0 * .74, a, a + .58); ctx.stroke();
    }
    // 4) 四角括號（越近越往內夾 → 像狙擊鏡）
    const br = T * (.30 + k * .19);
    ctx.globalAlpha = .65 + k * .35;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1.8, T * .050);
    for (let sx = -1; sx <= 1; sx += 2) {
      for (let sy = -1; sy <= 1; sy += 2) {
        const bx = tx + sx * br, by = ty + sy * br, L = T * .15;
        ctx.beginPath();
        ctx.moveTo(bx, by - sy * L); ctx.lineTo(bx, by); ctx.lineTo(bx - sx * L, by);
        ctx.stroke();
      }
    }
    // 5) 十字準心
    ctx.globalAlpha = .50 + k * .45;
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(1.4, T * .035);
    ctx.beginPath();
    ctx.moveTo(tx - br * .62, ty); ctx.lineTo(tx + br * .62, ty);
    ctx.moveTo(tx, ty - br * .62); ctx.lineTo(tx, ty + br * .62);
    ctx.stroke();
    // 6) 怪物 → 落點的瞄準虛線（越近越實）
    ctx.globalAlpha = .22 + k * .45;
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(1.6, T * .045);
    try { ctx.setLineDash([T * .16, T * .12]); } catch (e1) {}
    ctx.beginPath(); ctx.moveTo(e.x, e.y - (e.r || 12) * .3); ctx.lineTo(tx, ty); ctx.stroke();
    try { ctx.setLineDash([]); } catch (e2) {}
    ctx.restore();
  }
}
//   上層：怪物身上聚起來的元素球（中心白熱 → 外圈元素色 ＋ 往內收的粒子 ＋ 星芒）
function drawFoeCastFx(T) {
  const list = Game.enemies;
  if (!list || !list.length) return;
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    if (!(e.castT > 0)) continue;
    const k = 1 - e.castT / FOE_CAST_WINDUP;
    const col = BOLT_COLOR[e.fx] || '#ffb347';
    const R = (e.r || T * .32) * (1.15 + k * .55);       // 光球半徑（越來越大）
    const ox = e.x + (e.dirName === 'left' ? -R * .55 : e.dirName === 'right' ? R * .55 : 0);
    const oy = e.y - R * .85 - Math.sin(Game.gameT * 18) * T * .02 * k;
    const gt = Game.gameT;
    ctx.save();
    // 外光暈
    const gg = ctx.createRadialGradient(ox, oy, R * .10, ox, oy, R * 2.0);
    gg.addColorStop(0, col);
    gg.addColorStop(.35, 'rgba(255,255,255,.0)');
    ctx.globalAlpha = .28 + k * .30;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(ox, oy, R * 2.0, 0, 6.283); ctx.fill();
    // 球體
    ctx.globalAlpha = .85 + k * .15;
    const cg = ctx.createRadialGradient(ox - R * .3, oy - R * .35, R * .05, ox, oy, R);
    cg.addColorStop(0, '#ffffff');
    cg.addColorStop(.42, col);
    cg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(ox, oy, R, 0, 6.283); ctx.fill();
    // 往中心收的粒子（4 顆，看得出來「在聚氣」）
    ctx.fillStyle = '#ffffff';
    for (let j = 0; j < 4; j++) {
      const ph = ((gt * 1.9 + j * .25) % 1);
      const rr = R * (2.3 - ph * 1.9);
      const a = j * 1.5708 + gt * 1.3;
      ctx.globalAlpha = .30 + ph * .65;
      ctx.beginPath();
      ctx.arc(ox + Math.cos(a) * rr, oy + Math.sin(a) * rr, Math.max(1, T * .035 * (1 - ph * .4)), 0, 6.283);
      ctx.fill();
    }
    // 星芒（十字拉長，越大越亮）
    ctx.globalAlpha = .40 + k * .55;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1.2, T * .028);
    const sl = R * (1.5 + Math.sin(gt * 9) * .25);
    ctx.beginPath();
    ctx.moveTo(ox - sl, oy); ctx.lineTo(ox + sl, oy);
    ctx.moveTo(ox, oy - sl); ctx.lineTo(ox, oy + sl);
    ctx.stroke();
    ctx.restore();
  }
}

// v4.36：BOSS 用單張貼圖（呼吸 + 上下浮 + 走路傾斜 + 依方向鏡像）""",
    'castfx')

# ---------- 8) render 呼叫 ----------
rep("""  // v4.36：小怪的元素彈（畫在敵人下面，才不會蓋住臉）
  if (Game.bolts && Game.bolts.length) drawBolts(T);
  // 敵人
  Game.enemies.forEach(function (e) { drawEnemy(e, T); });""",
    """  // v4.36：小怪的元素彈（畫在敵人下面，才不會蓋住臉）
  if (Game.bolts && Game.bolts.length) drawBolts(T);
  // v4.40：集氣中的落點預告畫在地面（敵人下面）
  drawFoeCastGround(T);
  // 敵人
  Game.enemies.forEach(function (e) { drawEnemy(e, T); });
  // v4.40：集氣的元素球畫在敵人「上面」（蓋在牠身上才看得到在聚氣）
  drawFoeCastFx(T);""",
    'render')

# ---------- 9) 導出 ----------
rep("""  ANGER_WINDUP: ANGER_WINDUP, ANGER_DASH_T: ANGER_DASH_T,""",
    """  ANGER_WINDUP: ANGER_WINDUP, ANGER_DASH_T: ANGER_DASH_T,
  BOLT_TRAVEL: BOLT_TRAVEL, FOE_CAST_WINDUP: FOE_CAST_WINDUP,
  foeCastBolt: foeCastBolt, drawFoeCastGround: drawFoeCastGround, drawFoeCastFx: drawFoeCastFx,""",
    'export')

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('done')
