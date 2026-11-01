# -*- coding: utf-8 -*-
"""v4.19 patch A：怪物 2 格仇恨範圍 + 中高階怪怒氣 + BOSS 只在自家地盤踱步

用法：python patch_v419a.py
（沿用專案慣例：先轉 LF 比對、每條規則斷言 count==1、寫回時還原 CRLF）
"""
import io, sys

PATH = 'index.html'


def apply(path, rules):
    raw = io.open(path, 'rb').read().decode('utf-8')
    crlf = '\r\n' in raw
    s = raw.replace('\r\n', '\n')
    for i, (name, old, new) in enumerate(rules, 1):
        n = s.count(old)
        if n != 1:
            print('  ! [%02d] %s -> hits %d' % (i, name, n))
            sys.exit(1)
        s = s.replace(old, new)
        print('  ok [%02d] %s' % (i, name))
    if crlf:
        s = s.replace('\n', '\r\n')
    io.open(path, 'wb').write(s.encode('utf-8'))
    print('saved', path)


# ---------------------------------------------------------------- 1. 音效
R_SFX = (
    "anger 音效",
    "      case 'punch': tone(300, .12, 'sawtooth', .16, 80); break;\n",
    "      case 'punch': tone(300, .12, 'sawtooth', .16, 80); break;\n"
    "      // v4.19：中高階怪發現你時的低吼（兩顆低音，聽起來就不爽）\n"
    "      case 'anger': tone(150, .16, 'sawtooth', .15, 96); tone(112, .20, 'square', .09, 72, .08); break;\n",
)

# ---------------------------------------------------------------- 2. 仇恨 / 階級 helper
R_AGGRO = (
    "仇恨與階級 helper",
    """const FOE_HP = {
  // v4.17：RPG 的怪血量整批調回來（小怪變多 + 血變厚 → 後段比較有壓力）
  slime: 3, mush: 3, crab: 3, beetle: 4, skull: 4, lizard: 5,
  bat: 3, ghost: 3, bee: 3, eye: 4
};
""",
    """const FOE_HP = {
  // v4.17：RPG 的怪血量整批調回來（小怪變多 + 血變厚 → 後段比較有壓力）
  slime: 3, mush: 3, crab: 3, beetle: 4, skull: 4, lizard: 5,
  bat: 3, ghost: 3, bee: 3, eye: 4
};

// ================================================================
//   v4.19：怪物的「仇恨範圍」與中高階怪的怒氣
//   · 所有小怪（含會飛的）都一樣：玩家沒踏進 2 格內，牠就只是自己亂走，
//     不會主動靠過來、也不會主動攻擊
//   · 中階／高階小怪一被發現 → 頭上一直冒「😡 生氣」→ 原地蓄力 → 加速撲上來
//   · BOSS 也一樣：只有 2 格內才會追人／放炸彈，平常只在自己的地盤踱步
// ================================================================
const AGGRO_TILES = 2;         // 幾格內才會發現玩家（直線距離）
const ANGER_WINDUP = .55;      // 中高階怪發現你之後，先站在原地生氣一下
const ANGER_DASH_T = 1.15;     // 生氣完衝過來的時間
const ANGER_DASH_MUL = 1.7;    // 衝刺時的速度倍率
// 中／高階小怪（會冒出生氣效果的那一群）；沒列到的算低階
const FOE_TIER = {
  slime: 'low', mush: 'low', crab: 'low', panda: 'low', penguin: 'low', octopus: 'low',
  bat: 'low', ghost: 'low', bee: 'low',
  beetle: 'mid', skull: 'mid', eye: 'mid', scavenger: 'mid', sapper: 'mid', wisp: 'mid',
  lizard: 'high', robot: 'high', bomber: 'high', wizard: 'high', hornet: 'high'
};
function foeTier(id) { return FOE_TIER[id] || 'low'; }
function isAngryFoe(e) {
  if (!e) return false;
  if (e.boss) return true;                       // BOSS 生氣起來最有感
  const t = foeTier(e.spec || e.type);
  return t === 'mid' || t === 'high';
}
function foeInRange(e, p) {
  if (!e || !p || !p.alive) return false;
  const R = AGGRO_TILES * (Game.T || 40) * 1.02;  // ×1.02：剛好站在 2 格邊界也算
  return dist2(e.x, e.y, p.x, p.y) <= R * R;
}
// 回傳「被惹到」的那個玩家；沒人在 2 格內就回 null
function enemyAggro(e) {
  let best = null, bd = Infinity;
  const list = (Game && Game.players) || [];
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    if (!p || !p.alive) continue;
    if (playerHiding(p)) continue;                // 躲在樹叢／破屋裡看不到
    if (!foeInRange(e, p)) continue;
    const d = dist2(e.x, e.y, p.x, p.y);
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}
// 怒氣值 0～1（畫面上讓 😡 泡泡越冒越大）＋蓄力／衝刺狀態機
function enemyAngerTick(e, dt, aggro, windup) {
  e.aggro = !!aggro;
  e.angerT = clamp((e.angerT || 0) + dt * (aggro ? 3.4 : -2.6), 0, 1);
  if (aggro) {
    if (!e.aggroPrev) {                           // 剛發現你
      e.dashT = 0;
      e.windT = (windup && isAngryFoe(e)) ? ANGER_WINDUP : 0;
      if (isAngryFoe(e)) AudioSys.sfx('anger');
    }
  } else {
    e.windT = 0; e.dashT = 0;                     // 你跑掉了 → 牠就放棄
  }
  e.aggroPrev = !!aggro;
  if (e.dashT > 0) e.dashT -= dt;
}
""",
)

# ---------------------------------------------------------------- 3. updateEnemy：仇恨 + 蓄力
R_UE1 = (
    "updateEnemy 仇恨/蓄力",
    """  if (e.kind === 'fly') { updateFlyer(e, dt); return; }
  const T = Game.T;
  // v4.13：四種技能的 AI
  if (e.skill) enemySkillTick(e, dt);
""",
    """  if (e.kind === 'fly') { updateFlyer(e, dt); return; }
  const T = Game.T;
  // v4.19：只有玩家踏進 2 格內才有仇恨；否則牠只是自己亂走，不會主動靠過來
  enemyAngerTick(e, dt, !!enemyAggro(e), true);
  // 中階／高階怪被發現 → 先在原地「生氣蓄力」，看得出來牠準備撲上來
  if (e.windT > 0) {
    e.windT -= dt;
    // 腳下剛好有炸彈 → 不演了，先逃命（不然會站著被炸死）
    if (e.smart && dangerAt(Math.floor(e.x / T), Math.floor(e.y / T), null)) e.windT = 0;
    else { enemyFlameDamage(e, dt); return; }
  }
  // v4.13：四種技能的 AI
  if (e.skill) enemySkillTick(e, dt);
""",
)

R_UE2 = (
    "追人只看仇恨",
    "  if (e.kind === 'chase' && atCenter && Math.random() < .8 && !(e.smart && e.fleeT > 0)) {",
    "  if (e.kind === 'chase' && e.aggro && atCenter && Math.random() < .8 && !(e.smart && e.fleeT > 0)) {",
)

R_UE3 = (
    "衝刺加速",
    """  const d = DIRS[e.dirName];
  const sp = e.speed * dt;""",
    """  const d = DIRS[e.dirName];
  // v4.19：生氣完衝刺的那一小段會加速（撲一次就恢復正常速度）
  const sp = e.speed * (e.dashT > 0 ? ANGER_DASH_MUL : 1) * dt;""",
)

# ---------------------------------------------------------------- 4. 飛行怪
R_FLY1 = (
    "飛行怪仇恨",
    """function updateFlyer(e, dt) {
  const T = Game.T;
  e.turnT -= dt;
  if (e.hitT > 0) e.hitT -= dt;
""",
    """function updateFlyer(e, dt) {
  const T = Game.T;
  e.turnT -= dt;
  if (e.hitT > 0) e.hitT -= dt;
  // v4.19：飛行怪也一樣 —— 沒有 2 格內的玩家就只是自己亂飄，不會一直往你飛
  const foe = enemyAggro(e);
  enemyAngerTick(e, dt, !!foe, false);
  e.spdBoost = foe ? 1.22 : 1;      // 盯上你之後飛得快一點
""",
)

R_FLY2 = (
    "飛行怪追人改吃仇恨",
    """    // v4.7：直接朝玩家飛的機率從 60% 降到 35%，其餘時間維持原本的飄行路線
    let best = null, bestD = Infinity;
    Game.players.forEach(function (p) {
      if (!p.alive) return;
      if (playerHiding(p)) return;               // v4.16：躲在樹叢／破屋裡的人看不到
      const d = dist2(p.x, p.y, e.x, e.y);
      if (d < bestD) { bestD = d; best = p; }
    });
    let a;
    if (best && Math.random() < .48) {
      a = Math.atan2(best.y - e.y, best.x - e.x) + (Math.random() - .5) * .7;   // v4.17：追人機率 35% → 48%
    } else {
      a = Math.atan2(e.vy, e.vx) + (Math.random() - .5) * 1.7;
    }""",
    """    // v4.19：只有「2 格內被發現」才會朝你飛；中高階飛行怪（眼球怪／鬼火／大黃蜂）更纏人
    let a;
    if (foe && Math.random() < (isAngryFoe(e) ? .78 : .48)) {
      a = Math.atan2(foe.y - e.y, foe.x - e.x) + (Math.random() - .5) * .7;
    } else {
      a = Math.atan2(e.vy, e.vx) + (Math.random() - .5) * 1.7;
    }""",
)

R_FLY3 = (
    "飛行怪位移加速",
    "  e.x += e.vx * dt; e.y += e.vy * dt;",
    "  e.x += e.vx * e.spdBoost * dt; e.y += e.vy * e.spdBoost * dt;",
)

# ---------------------------------------------------------------- 5. BOSS：地盤踱步
R_BOSS_FN = (
    "bossPatrolStep",
    "const BOSS_POWER = 2;                             // v2.2：BOSS 火焰 2 格（v1.9 是 3 格）",
    """// v4.19：BOSS 沒被惹到時，只在自己的地盤裡走來走去（不會滿場追人）
function bossPatrolStep(e, cx, cy, T, dt) {
  const R = e.homeTiles || 4;
  if (e.patrolRest > 0) { e.patrolRest = Math.max(0, e.patrolRest - dt); return null; }
  if (!e.patrol) {
    // 在地盤範圍內挑一個站得住的空地（最多試 40 次）
    for (let i = 0; i < 40; i++) {
      const tx = e.homeCX + rand(R * 2 + 1) - R;
      const ty = e.homeCY + rand(R * 2 + 1) - R;
      if (tx < 1 || ty < 1 || tx > Game.cols - 2 || ty > Game.rows - 2) continue;
      if (cellAt(tx, ty) !== 0 || bombAt(tx, ty)) continue;
      if (tx === cx && ty === cy) continue;
      e.patrol = { x: tx, y: ty };
      break;
    }
    if (!e.patrol) return null;
  }
  const pt = e.patrol;
  const tx2 = pt.x * T + T / 2, ty2 = pt.y * T + T / 2;
  if (Math.abs(e.x - tx2) < 6 && Math.abs(e.y - ty2) < 6) {
    e.patrol = null;                                  // 到了 → 站著喘口氣再換下一個點
    e.patrolRest = .6 + Math.random() * 1.1;
    return null;
  }
  let best = null, bestD = Infinity;
  [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (v) {
    const nx = cx + v[0], ny = cy + v[1];
    if (cellAt(nx, ny) !== 0 || bombAt(nx, ny)) return;
    if (dangerAtBoss(nx, ny)) return;
    const d = Math.abs(pt.x - nx) + Math.abs(pt.y - ny);
    if (d < bestD) { bestD = d; best = { x: nx, y: ny }; }
  });
  return best;
}

const BOSS_POWER = 2;                             // v2.2：BOSS 火焰 2 格（v1.9 是 3 格）""",
)

R_BOSS1 = (
    "updateBoss 仇恨",
    """  if (e.dizzy > 0) { e.dizzy -= dt; return; }
  const p = Game.players[0];
  const cx = Math.floor(e.x / T), cy = Math.floor(e.y / T);
  // 血量剩 40% 以下就爆走：更快、火力更長、丟彈更兇""",
    """  if (e.dizzy > 0) { e.dizzy -= dt; return; }
  // v4.19：BOSS 也一樣 —— 玩家沒進到 2 格內，牠只在自己家附近踱步，不追人也不放炸彈
  enemyAngerTick(e, dt, !!enemyAggro(e), false);
  const p = Game.players[0];
  const cx = Math.floor(e.x / T), cy = Math.floor(e.y / T);
  // 血量剩 40% 以下就爆走：更快、火力更長、丟彈更兇""",
)

R_BOSS2 = (
    "BOSS 追人/踱步",
    """  // ---- 2. 追玩家（只走安全格，不會自己走進火裡） ----
  if (!target && p && p.alive) {""",
    """  // ---- 2. 有仇恨 → 追玩家；沒仇恨 → 只在自己的地盤踱步（只走安全格） ----
  if (!target && e.aggro && p && p.alive) {""",
)

R_BOSS3 = (
    "BOSS 踱步呼叫",
    """    target = best;
  }
  if (target) {
    const sp = speed * dt;""",
    """    target = best;
  }
  if (!target && !e.aggro) target = bossPatrolStep(e, cx, cy, T, dt);
  if (target) {
    const sp = speed * dt;""",
)

R_BOSS4 = (
    "BOSS 只在被惹到時放彈",
    "  if (e.bombT <= 0 && bossBombs < (rage ? 6 : 4)) {",
    "  if (e.aggro && e.bombT <= 0 && bossBombs < (rage ? 6 : 4)) {",
)

R_BOSS5 = (
    "BOSS 撞人判定",
    "  if (p && p.alive && p.invuln <= 0 && dist2(e.x, e.y, p.x, p.y) < (e.r + 10) * (e.r + 10)) killPlayer(p, false, e);",
    "  if (e.aggro && p && p.alive && p.invuln <= 0 && dist2(e.x, e.y, p.x, p.y) < (e.r + 10) * (e.r + 10)) killPlayer(p, false, e);",
)

R_BOSS6 = (
    "makeBoss 地盤欄位",
    """    hp: H, maxHp: H, hitT: 0, bombT: 3, dirT: 0, dirName: 'up', dead: false, walkT: 0, boss: true
  };""",
    """    hp: H, maxHp: H, hitT: 0, bombT: 3, dirT: 0, dirName: 'up', dead: false, walkT: 0, boss: true,
    // v4.19：出生點＝牠的地盤中心，平常只在這附近走來走去
    homeCX: x, homeCY: y, homeTiles: 4, patrol: null, patrolRest: 0,
    aggro: false, aggroPrev: false, angerT: 0, windT: 0, dashT: 0
  };""",
)

# ---------------------------------------------------------------- 6. 技能怪不亂攻擊
R_SKILL1 = (
    "撿彈怪只在被惹到時動手",
    """  // ---- A. 撿彈怪：撿起炸彈再丟回去 ----
  if (e.skill === 'scavenger') {
    e.grabT = (e.grabT || 0) - dt;""",
    """  // ---- A. 撿彈怪：撿起炸彈再丟回去 ----
  if (e.skill === 'scavenger') {
    if (!e.aggro) return;               // v4.19：玩家不在 2 格內就安分地亂走
    e.grabT = (e.grabT || 0) - dt;""",
)

R_SKILL2 = (
    "放彈怪只在被惹到時放彈",
    """  // ---- D. 放彈怪：自己放炸彈，火焰只有 1 格 ----
  if (e.skill === 'bomber') {
    e.bombT = (e.bombT || 0) - dt;""",
    """  // ---- D. 放彈怪：自己放炸彈，火焰只有 1 格 ----
  if (e.skill === 'bomber') {
    if (!e.aggro) return;               // v4.19：沒被惹到就不亂丟炸彈
    e.bombT = (e.bombT || 0) - dt;""",
)

# ---------------------------------------------------------------- 7. 怒氣畫法
R_DRAW_FN = (
    "drawAngerMark",
    """function solidOrBomb(cx, cy, p) {""",
    """// v4.19：中階／高階怪的「生氣」提示 —— 玩家踏進 2 格內就一直冒出來
function drawAngerMark(x, y, T, k) {
  if (!ctx || !ctx.save) return;
  k = clamp(k == null ? 1 : k, 0, 1);
  const t = Game.gameT || 0;
  const pop = .82 + .22 * Math.sin(t * 12);
  const bob = Math.sin(t * 8) * T * .04;
  const fs = Math.max(11, Math.round(T * .30 * (.72 + .34 * k)));
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  // 白底紅邊的泡泡 → 草地、雪地、暗處都看得清楚
  ctx.globalAlpha = .30 + .68 * k;
  ctx.beginPath();
  ctx.arc(x, y - T * .52 + bob, fs * .80 * pop, 0, 6.283);
  ctx.fillStyle = 'rgba(255,255,255,.88)';
  ctx.fill();
  ctx.lineWidth = Math.max(1.4, T * .05);
  ctx.strokeStyle = '#ff3d5a';
  ctx.stroke();
  ctx.font = '700 ' + Math.round(fs * pop) + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  ctx.fillText('😡', x, y - T * .50 + bob);
  // 怒氣：三顆往上飄的紅色小泡（一直冒 → 看得出來牠在生氣）
  for (let i = 0; i < 3; i++) {
    const ph = ((t * .85 + i * .34) % 1);
    const px = x + Math.sin((t * 2.2 + i * 2) * 2) * T * .18 * (.35 + ph);
    const py = y - T * .64 - ph * T * .58 + bob;
    ctx.globalAlpha = (1 - ph) * (.30 + .58 * k);
    ctx.fillStyle = i % 2 ? '#ff7a8a' : '#ff3d5a';
    ctx.beginPath();
    ctx.arc(px, py, Math.max(1.6, T * .055 * (1 - ph * .5)), 0, 6.283);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
  ctx.restore();
}
function solidOrBomb(cx, cy, p) {""",
)

R_DRAW_E1 = (
    "BOSS 怒氣泡泡",
    """    if (e.dizzy > 0) drawDizzyMark(x, barY - Game.T * .46, T);   // v1.9：BOSS 也會暈
    return;""",
    """    if (e.dizzy > 0) drawDizzyMark(x, barY - Game.T * .46, T);   // v1.9：BOSS 也會暈
    // v4.19：BOSS 被惹到也會冒出生氣泡泡（在血條右上方，不會壓到血條）
    if (e.aggro) drawAngerMark(x + bw * .62, barY - Game.T * .10, T, e.angerT);
    return;""",
)

R_DRAW_E2 = (
    "小怪怒氣泡泡",
    """  drawEnemyArt(e, x, y, flash, wob);
  if (e.dizzy > 0) drawDizzyMark(x, y - ar * 1.15, T);           // v1.9：頭暈（v2.4：跟著體型上移）""",
    """  drawEnemyArt(e, x, y, flash, wob);
  // v4.19：中階／高階小怪在 2 格內會一直冒「😡」＋怒氣泡泡（偏右上，不會蓋住頭暈）
  if (e.aggro && isAngryFoe(e)) drawAngerMark(x + ar * .70, y - ar * .95, T, e.angerT);
  if (e.dizzy > 0) drawDizzyMark(x, y - ar * 1.15, T);           // v1.9：頭暈（v2.4：跟著體型上移）""",
)

# ---------------------------------------------------------------- 8. 匯出
R_EXPORT = (
    "匯出 __BH",
    "  Shop: Shop, PET_KINDS: PET_KINDS, petKind: petKind,",
    """  Shop: Shop, PET_KINDS: PET_KINDS, petKind: petKind,
  // v4.19：2 格仇恨／中高階怪怒氣／BOSS 地盤
  AGGRO_TILES: AGGRO_TILES, ANGER_WINDUP: ANGER_WINDUP, ANGER_DASH_T: ANGER_DASH_T,
  ANGER_DASH_MUL: ANGER_DASH_MUL, FOE_TIER: FOE_TIER,
  foeTier: foeTier, isAngryFoe: isAngryFoe, foeInRange: foeInRange, enemyAggro: enemyAggro,
  enemyAngerTick: enemyAngerTick, drawAngerMark: drawAngerMark, bossPatrolStep: bossPatrolStep,""",
)

RULES = [R_SFX, R_AGGRO, R_UE1, R_UE2, R_UE3, R_FLY1, R_FLY2, R_FLY3,
         R_BOSS_FN, R_BOSS1, R_BOSS2, R_BOSS3, R_BOSS4, R_BOSS5, R_BOSS6,
         R_SKILL1, R_SKILL2, R_DRAW_FN, R_DRAW_E1, R_DRAW_E2, R_EXPORT]

if __name__ == '__main__':
    apply(PATH, RULES)
