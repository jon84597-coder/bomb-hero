# -*- coding: utf-8 -*-
# v4.76 A：大逃殺 —— 兩隻亂入 BOSS（20 血、仇恨 4 格、打死給恐龍坐騎）
import io, sys

p = 'index.html'
s = io.open(p, encoding='utf-8').read()


def rep(old, new, tag, cnt=1):
    global s
    if s.count(old) != cnt:
        print('!! %s count=%d' % (tag, s.count(old)))
        sys.exit(1)
    s = s.replace(old, new)
    print('ok', tag)


# ---------------- 1) BR 常數 ----------------
rep("""const BR = {
  W: 56, H: 44, N: 30, FOES: 14,
  FREE: true,          // v4.74：正式測試結束前不扣門票""",
    """const BR = {
  W: 56, H: 44, N: 30, FOES: 14,
  // v4.76：兩隻「亂入 BOSS」——從 32 關裡隨機抽兩關的 BOSS 丟進場，沒有地盤、全場亂走
  BOSS_N: 2, BOSS_HP: 20, BOSS_AGGRO: 4, BOSS_HIT: 2,
  HP: 10,              // 每人 10 點血（HUD／隊友血條都吃這個）
  FREE: true,          // v4.74：正式測試結束前不扣門票""",
    'BR const')

# ---------------- 2) 血量常數統一 ----------------
rep("    p.brOut = 0; p.brHp = 10;   // v4.74：30 人同場、10 分鐘一場 → 血量 4→10",
    "    p.brOut = 0; p.brHp = BR.HP;   // v4.74：30 人同場、10 分鐘一場 → 血量 4→10",
    'brHp init')

# ---------------- 3) updateEnemy 分派 ----------------
rep("""function updateEnemy(e, dt) {
  if (e.boss) { updateBoss(e, dt); return; }""",
    """function updateEnemy(e, dt) {
  // v4.76：大逃殺的亂入 BOSS 走自己的一套（沒有地盤、追 4 格內最近的活人）
  if (e.boss) { if (e.brBoss) updateBRBoss(e, dt); else updateBoss(e, dt); return; }""",
    'updateEnemy branch')

# ---------------- 4) 觸碰判定（BOSS 身體大，判定跟著放大） ----------------
rep("""function foeTouchR(e) {
  const T = (typeof Game !== 'undefined' && Game && Game.T) || ART_REF_TILE;""",
    """function foeTouchR(e) {
  const T = (typeof Game !== 'undefined' && Game && Game.T) || ART_REF_TILE;
  // v4.76：大逃殺的亂入 BOSS 身體是別人的兩倍寬，判定用小怪的公式會「明明貼上去還不算碰到」
  if (e && e.brBoss) return Math.max(T * .34, (e.r || 18) * 1.12);""",
    'foeTouchR boss')

# ---------------- 5) 兩隻 BOSS 的生成／行為／擊殺獎勵 ----------------
rep("""function startBR() {""",
    """// ====
//   v4.76：大逃殺「亂入 BOSS」
//     · 開局從 32 關裡隨機抽 2 關，把那兩關的 BOSS 丟進大陸（體型／速度依關卡微調）
//     · 沒有地盤限制 → 全場亂走；4 格內有人就開打（會丟彈、會放彈、撞到人扣 1 血）
//     · 20 點血，玩家的火焰一次 2 點；打倒牠的人直接獲得恐龍坐騎
// ====
function spawnBRBosses() {
  const T = Game.T, born = [];
  for (let i = 0; i < BR.BOSS_N; i++) {
    const st = 1 + rand(SOLO_STAGES);
    let x = -1, y = -1, guard = 0;
    while (guard++ < 900) {
      const tx = 2 + rand(Game.cols - 4), ty = 2 + rand(Game.rows - 4);
      if (Game.grid[ty][tx] !== 0 || Game.brIsl[ty][tx] < 0) continue;
      let bad = false;
      for (let k = 0; k < Game.players.length; k++) {           // 不要生在人的臉上（8 格內）
        const p = Game.players[k];
        if (Math.abs(p.x / T - tx) < 8 && Math.abs(p.y / T - ty) < 8) { bad = true; break; }
      }
      for (let k = 0; k < born.length && !bad; k++) {           // 兩隻王也不要黏在一起
        if (Math.abs(born[k].x - tx) < 14 && Math.abs(born[k].y - ty) < 14) bad = true;
      }
      if (bad) continue;
      x = tx; y = ty; break;
    }
    if (x < 0) continue;
    const e = makeBoss(x, y, BR.BOSS_HP);
    const k = st / SOLO_STAGES;                                // 0~1：越後面的關卡越壯
    e.brBoss = true;
    e.brStage = st;
    e.r = 16 + Math.round(k * 5);                              // 大圖格子小 → 半徑比單人小一點
    e.sizeMul = 1.1 + k * .3;
    e.speedMul = .9 + k * .34;
    e.hp = BR.BOSS_HP; e.maxHp = BR.BOSS_HP;
    e.bombT = 2.6 + Math.random() * 2;
    e.roamT = Math.random() * 1.5; e.roam = pick([[1, 0], [-1, 0], [0, 1], [0, -1]]);
    e.aggro = false; e.hitT = 0; e.dizzy = 0; e.brKill = false;
    born.push({ x: x, y: y });
    Game.enemies.push(e);
  }
  return born.length;
}

function updateBRBoss(e, dt) {
  if (e.dead) return;
  const T = Game.T;
  if (e.hitT > 0) e.hitT -= dt;
  if (e.bombT > 0) e.bombT -= dt;
  if (e.dizzy > 0) e.dizzy -= dt;
  const cx = Math.floor(e.x / T), cy = Math.floor(e.y / T);
  const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  function canGo(x2, y2) { return cellAt(x2, y2) === 0 && !bombAt(x2, y2); }

  // 1) 最近的活人（4 格內才算看到）
  let best = null, bd = Infinity;
  for (let i = 0; i < Game.players.length; i++) {
    const q = Game.players[i];
    if (!q.alive) continue;
    const d = Math.sqrt(dist2(q.x, q.y, e.x, e.y)) / T;
    if (d < bd) { bd = d; best = q; }
  }
  const wasAggro = e.aggro;
  e.aggro = !!(best && bd <= BR.BOSS_AGGRO);
  if (e.aggro && !wasAggro) e.bombT = Math.min(e.bombT, .7);   // 剛發現人 → 馬上開打

  // 2) 腳下有火 → 先跑（跑的同時還是會挑離人最遠的方向）
  let target = null;
  if (dangerAtBoss(cx, cy)) {
    let bs = null, bsD = -1;
    D4.forEach(function (v) {
      const nx = cx + v[0], ny = cy + v[1];
      if (!canGo(nx, ny) || dangerAtBoss(nx, ny)) return;
      const d = best ? dist2(best.x, best.y, nx * T + T / 2, ny * T + T / 2) : 0;
      if (999999 - d > bsD) { bsD = 999999 - d; bs = { x: nx, y: ny }; }
    });
    if (bs) target = bs;
  }

  // 3) 有仇恨 → 追人；沒仇恨 → 全場亂走（出圈會自己往中心走）
  if (!target && e.aggro && best) {
    let bs = null, bsD = Infinity;
    D4.forEach(function (v) {
      const nx = cx + v[0], ny = cy + v[1];
      if (!canGo(nx, ny) || dangerAtBoss(nx, ny)) return;
      const d = Math.abs(best.x - (nx * T + T / 2)) + Math.abs(best.y - (ny * T + T / 2));
      if (d < bsD) { bsD = d; bs = { x: nx, y: ny }; }
    });
    if (bs) target = bs;
  }
  if (!target && !e.aggro) {
    e.roamT -= dt;
    if (e.roamT <= 0) { e.roamT = 1.1 + Math.random() * 2.1; e.roam = pick(D4); }
    let dir = e.roam || D4[0];
    const z = Game.brZone;
    if (z) {
      const dx = e.x / T - (z.cx + .5), dy = e.y / T - (z.cy + .5);
      if (Math.sqrt(dx * dx + dy * dy) > z.r - 2) {
        dir = Math.abs(dx) > Math.abs(dy)
          ? [dx > 0 ? -1 : 1, 0] : [0, dy > 0 ? -1 : 1];
      }
    }
    const nx = cx + dir[0], ny = cy + dir[1];
    if (canGo(nx, ny) && !dangerAtBoss(nx, ny)) target = { x: nx, y: ny };
    else e.roamT = 0;
  }
  if (target) {
    const sp = 46 * (e.speedMul || 1) * (Game.spdK || 1) * dt;
    const tx = target.x * T + T / 2, ty = target.y * T + T / 2;
    const dx = tx - e.x, dy = ty - e.y;
    e.x += clamp(dx, -sp, sp); e.y += clamp(dy, -sp, sp);
    e.walkT += dt;
    if (Math.abs(dx) > Math.abs(dy)) e.dirName = dx > 0 ? 'right' : 'left';
    else e.dirName = dy > 0 ? 'down' : 'up';
  }

  // 4) 開打：近距離放彈、遠一點直接丟過去（跟單人 BOSS 一樣的手感）
  if (e.aggro && best && e.bombT <= 0) {
    const live = Game.bombs.filter(function (b) { return !b.owner; }).length;
    if (live < 6 && !bombAt(cx, cy)) {
      const pcx = Math.floor(best.x / T), pcy = Math.floor(best.y / T);
      const dist = Math.abs(pcx - cx) + Math.abs(pcy - cy);
      const b = {
        cx: cx, cy: cy, px: e.x, py: e.y, timer: 1.7, power: 2, owner: null,
        passers: [e], remoteArmed: false, mine: false, moving: null, flying: null,
        held: false, ownerLeft: false, seed: Math.random() * 6.28
      };
      if (dist >= 3 && dist <= 6 && Math.random() < .6) {
        const land = findLanding(cx, cy, Math.sign(pcx - cx), Math.sign(pcy - cy));
        if (land && land.dist > 0) {
          b.flying = { fx: cx, fy: cy, tx: land.x, ty: land.y, t: 0, dur: Math.min(.8, .22 + land.dist * .06) };
        }
      }
      Game.bombs.push(b);
      try { AudioSys.sfx(b.flying ? 'throw' : 'place'); } catch (err) {}
      e.bombT = 2.4 + Math.random() * 1.8;
    } else e.bombT = .5;
  }

  // 5) 被玩家的火焰燒（一次 2 點；自己的彈炸不到自己）
  for (let i = 0; i < Game.flames.length; i++) {
    const f = Game.flames[i];
    if (f.owner == null) continue;
    if (f.cx === Math.floor(e.x / T) && f.cy === Math.floor(e.y / T) && e.hitT <= 0) {
      e.hp -= BR.BOSS_HIT;
      e.hitT = .55;
      burst(e.x, e.y, '#fff', 14, 220);
      try { AudioSys.sfx('hurt'); } catch (err) {}
      if (e.hp <= 0) { brBossDown(e, f.owner); return; }
      break;
    }
  }
}

// 打倒 BOSS → 打的人（或最後一下的人）直接騎上恐龍；已經有龍就進化成紅龍
function brBossDown(e, killer) {
  e.dead = true; e.brKill = true;
  burst(e.x, e.y, '#c93aff', 46, 330);
  burst(e.x, e.y, '#fff', 18, 200);
  Game.shake = Math.min(1, Game.shake + .55);
  try { AudioSys.sfx('hurt'); } catch (err) {}
  const me = Game.players[0] || {};
  if (killer && killer.alive) {
    rideDino(killer, !!killer.dino);
    if (isMyPlayer(killer)) {
      brTip('🦖', '打倒第 ' + (e.brStage || 1) + ' 關 BOSS！獲得恐龍坐騎（多擋一次傷害）', 'good', 3.4);
    } else if ((Game.brTeam | 0) >= 2 && killer.team >= 0 && killer.team === me.team) {
      brTip('🦖', '隊友打倒 BOSS，拿到恐龍坐騎', 'good', 2.6);
    } else {
      brTip('☠️', '第 ' + (e.brStage || 1) + ' 關 BOSS 被其他人討伐了', '', 2.4);
    }
  } else {
    brTip('☠️', '第 ' + (e.brStage || 1) + ' 關 BOSS 倒下了', '', 2.4);
  }
}

function startBR() {""",
    'brboss funcs')

# ---------------- 6) startBR 呼叫生成 + 文案 ----------------
rep("""  showOverlay({
    title: '🏝️ 大逃殺 · 隨機大陸',""",
    """  const bossN = spawnBRBosses();
  showOverlay({
    title: '🏝️ 大逃殺 · 隨機大陸',""",
    'spawn call')

rep("""         Game.enemies.length + ' 隻小怪\\n' +""",
    """         Game.enemies.length + ' 隻小怪' + (bossN ? '＋' + bossN + ' 隻亂入 BOSS（打倒可騎恐龍）' : '') + '\\n' +""",
    'overlay boss count')

io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('done', len(s))
