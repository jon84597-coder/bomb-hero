# -*- coding: utf-8 -*-
"""v1.6：小怪 2 段血 / 飛怪會靠過來 / BOSS 會躲炸彈＋猛丟彈。"""
import io

P = 'index.html'
s = io.open(P, encoding='utf-8').read()


def rep(old, new, tag, cnt=1):
    global s
    assert old in s, 'NOT FOUND: ' + tag
    s = s.replace(old, new, cnt)
    print('  ok:', tag)


# ------------------------------------------------ 1. 火焰傷害：2 段血的小怪要炸兩次
rep('''    const f = Game.flames[i];
    if (f.cx === Math.floor(e.x / T) && f.cy === Math.floor(e.y / T)) {
      e.dead = true;
      Game.players.forEach(function (p) { p.score += 100; });
      burst(e.x, e.y, e.color, 14, 180);
      if (e.boss) { /* boss 不會在這裡 */ }
      bubbleDeathPair(e, f.owner, e.r * 2 + 14, Game.T * 1.98);
      AudioSys.sfx('hurt');
      break;
    }''',
    '''    const f = Game.flames[i];
    if (f.cx === Math.floor(e.x / T) && f.cy === Math.floor(e.y / T)) {
      e.hp = (e.hp || 1) - 1;
      if (e.hp > 0) {                       // 鐵甲蟲 / 骷髏兵要炸兩次
        e.hitT = .55;
        burst(e.x, e.y, '#ffffff', 8, 150);
        AudioSys.sfx('hurt');
        break;
      }
      e.dead = true;
      Game.players.forEach(function (p) { p.score += 100; });
      burst(e.x, e.y, e.color, 14, 180);
      bubbleDeathPair(e, f.owner, e.r * 2 + 14, Game.T * 1.98);
      AudioSys.sfx('hurt');
      break;
    }''', 'enemy hp 2 hits (ground)')

rep('''    const f = Game.flames[i];
    if (f.cx === Math.floor(e.x / T) && f.cy === Math.floor(e.y / T)) {
      e.dead = true;
      Game.players.forEach(function (p) { p.score += 100; });
      burst(e.x, e.y, e.color, 14, 180);
      bubbleDeathPair(e, f.owner, e.r * 2 + 14, Game.T * 1.98);
      AudioSys.sfx('hurt');
      break;
    }''',
    '''    const f = Game.flames[i];
    if (f.cx === Math.floor(e.x / T) && f.cy === Math.floor(e.y / T)) {
      e.hp = (e.hp || 1) - 1;
      if (e.hp > 0) {
        e.hitT = .55;
        burst(e.x, e.y, '#ffffff', 8, 150);
        AudioSys.sfx('hurt');
        break;
      }
      e.dead = true;
      Game.players.forEach(function (p) { p.score += 100; });
      burst(e.x, e.y, e.color, 14, 180);
      bubbleDeathPair(e, f.owner, e.r * 2 + 14, Game.T * 1.98);
      AudioSys.sfx('hurt');
      break;
    }''', 'enemy hp 2 hits (flyer)')

# ------------------------------------------------ 2. 受擊閃白計時
rep('''function updateEnemy(e, dt) {
  if (e.boss) { updateBoss(e, dt); return; }
  if (e.kind === 'fly') { updateFlyer(e, dt); return; }
  const T = Game.T;
  e.dirT -= dt;''',
    '''function updateEnemy(e, dt) {
  if (e.boss) { updateBoss(e, dt); return; }
  if (e.hitT > 0) e.hitT -= dt;
  if (e.kind === 'fly') { updateFlyer(e, dt); return; }
  const T = Game.T;
  e.dirT -= dt;''', 'enemy hitT tick')

# ------------------------------------------------ 3. 飛行怪會往玩家靠
rep('''function updateFlyer(e, dt) {
  const T = Game.T;
  e.turnT -= dt;
  if (e.turnT <= 0) {
    e.turnT = 1.1 + Math.random() * 2.2;
    const a = Math.atan2(e.vy, e.vx) + (Math.random() - .5) * 1.7;
    const sp = Math.hypot(e.vx, e.vy) || e.speed;
    e.vx = Math.cos(a) * sp; e.vy = Math.sin(a) * sp;
  }''',
    '''function updateFlyer(e, dt) {
  const T = Game.T;
  e.turnT -= dt;
  if (e.hitT > 0) e.hitT -= dt;
  if (e.turnT <= 0) {
    e.turnT = .7 + Math.random() * 1.4;
    const sp = Math.hypot(e.vx, e.vy) || e.speed;
    // 一半的機率直接朝玩家飛（會追人，不再只是亂飄）
    let best = null, bestD = Infinity;
    Game.players.forEach(function (p) {
      if (!p.alive) return;
      const d = dist2(p.x, p.y, e.x, e.y);
      if (d < bestD) { bestD = d; best = p; }
    });
    let a;
    if (best && Math.random() < .6) {
      a = Math.atan2(best.y - e.y, best.x - e.x) + (Math.random() - .5) * .5;
    } else {
      a = Math.atan2(e.vy, e.vx) + (Math.random() - .5) * 1.7;
    }
    e.vx = Math.cos(a) * sp; e.vy = Math.sin(a) * sp;
  }''', 'flyer homing')

# ------------------------------------------------ 4. BOSS AI 重寫
start_key = 'function updateBoss(e, dt) {'
end_key = '''// ================================================================
//   本地對戰'''
i0 = s.find(start_key)
assert i0 > 0
i1 = s.find(end_key, i0)
assert i1 > i0
old_boss = s[i0:i1]
assert 'bombT' in old_boss and len(old_boss) < 4000, 'boss slice looks wrong (%d)' % len(old_boss)

NEW_BOSS = '''function updateBoss(e, dt) {
  const T = Game.T;
  e.hitT -= dt;
  e.bombT -= dt;
  const p = Game.players[0];
  const cx = Math.floor(e.x / T), cy = Math.floor(e.y / T);
  // 血量剩 40% 以下就爆走：更快、火力更長、丟彈更兇
  const rage = e.hp <= Math.max(3, Math.ceil((e.maxHp || 10) * .4));
  const speed = (rage ? 88 : 54) * (e.speedMul || 1);

  function canGo(x2, y2) { return cellAt(x2, y2) === 0 && !bombAt(x2, y2); }
  const DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  // ---- 1. 腳下危險就先跑（這是「會躲炸彈」的關鍵） ----
  let target = null;
  if (dangerAt(cx, cy)) {
    let best = null, bestD = -1;
    DIRS4.forEach(function (v) {
      const nx = cx + v[0], ny = cy + v[1];
      if (!canGo(nx, ny) || dangerAt(nx, ny)) return;
      const d = p && p.alive ? Math.hypot(p.x - (nx * T + T / 2), p.y - (ny * T + T / 2)) : 0;
      const sc = 999 - d;
      if (sc > bestD) { bestD = sc; best = { x: nx, y: ny }; }
    });
    target = best;
    if (!best) e.bombT = Math.max(e.bombT, .35);   // 沒路可逃 → 硬吃一下後再放
  }

  // ---- 2. 追玩家（只走安全格，不會自己走進火裡） ----
  if (!target && p && p.alive) {
    let best = null, bestD = Infinity;
    DIRS4.forEach(function (v) {
      const nx = cx + v[0], ny = cy + v[1];
      if (!canGo(nx, ny) || dangerAt(nx, ny)) return;
      const d = Math.abs(p.x - (nx * T + T / 2)) + Math.abs(p.y - (ny * T + T / 2));
      if (d < bestD) { bestD = d; best = { x: nx, y: ny }; }
    });
    target = best;
  }
  if (target) {
    const sp = speed * dt;
    const tx = target.x * T + T / 2, ty = target.y * T + T / 2;
    const dx = tx - e.x, dy = ty - e.y;
    e.x += clamp(dx, -sp, sp);
    e.y += clamp(dy, -sp, sp);
    e.walkT += dt;
    if (Math.abs(dx) > Math.abs(dy)) e.dirName = dx > 0 ? 'right' : 'left';
    else e.dirName = dy > 0 ? 'down' : 'up';
  }

  // ---- 3. 放炸彈＋丟炸彈（彈量多、火力長） ----
  const bossBombs = Game.bombs.filter(function (b) { return !b.owner; }).length;
  const power = rage ? 6 : 4;
  if (e.bombT <= 0 && bossBombs < (rage ? 6 : 4)) {
    e.bombT = rage ? .75 : 1.35;
    const pcx = p && p.alive ? Math.floor(p.x / T) : cx;
    const pcy = p && p.alive ? Math.floor(p.y / T) : cy;
    const dist = Math.abs(pcx - cx) + Math.abs(pcy - cy);
    if (!bombAt(cx, cy) && !dangerAt(cx, cy)) {
      if (dist >= 3 && Math.random() < .62) {
        // 玩家在遠處 → 直接把手上的炸彈丟過去（越過牆）
        const dx = Math.sign(pcx - cx), dy = Math.sign(pcy - cy);
        const land = findLanding(cx, cy, dx, dy);
        if (land && land.dist > 0) {
          Game.bombs.push({
            cx: cx, cy: cy, px: e.x, py: e.y, timer: 1.5, power: power, owner: null,
            passers: [e], remoteArmed: false, mine: false, moving: null, held: false,
            flying: { fx: cx, fy: cy, tx: land.x, ty: land.y, t: 0, dur: Math.min(.8, .22 + land.dist * .06) },
            seed: Math.random() * 6.28
          });
          AudioSys.sfx('throw');
        } else {
          Game.bombs.push({
            cx: cx, cy: cy, px: e.x, py: e.y, timer: 1.8, power: power, owner: null,
            passers: [e], remoteArmed: false, mine: false, moving: null, flying: null,
            held: false, seed: Math.random() * 6.28
          });
          AudioSys.sfx('place');
        }
      } else {
        Game.bombs.push({
          cx: cx, cy: cy, px: e.x, py: e.y, timer: 1.9, power: power, owner: null,
          passers: [e], remoteArmed: false, mine: false, moving: null, flying: null,
          held: false, seed: Math.random() * 6.28
        });
        AudioSys.sfx('place');
      }
    }
  }

  // ---- 4. 被火焰燒（一次扣 1 血，短暫無敵避免同一道火連扣） ----
  for (let i = 0; i < Game.flames.length; i++) {
    const f = Game.flames[i];
    if (f.cx === Math.floor(e.x / T) && f.cy === Math.floor(e.y / T) && e.hitT <= 0) {
      e.hp -= 1; e.hitT = .8;
      burst(e.x, e.y, '#fff', 12, 200);
      AudioSys.sfx('hurt');
      if (e.hp <= 0) {
        e.dead = true;
        Game.players.forEach(function (p2) { p2.score += 1000; });
        burst(e.x, e.y, '#c93aff', 40, 300);
        Game.shake = 1;
        bubbleDeathPair(e, f.owner, e.r * 2 + 14, Game.T * 1.98);
      }
      break;
    }
  }
  // ---- 5. 撞到玩家 ----
  if (p && p.alive && p.invuln <= 0 && dist2(e.x, e.y, p.x, p.y) < (e.r + 10) * (e.r + 10)) killPlayer(p, false, e);
}

'''

s = s[:i0] + NEW_BOSS + s[i1:]
print('  ok: boss AI rewritten (%d -> %d chars)' % (len(old_boss), len(NEW_BOSS)))

io.open(P, 'w', encoding='utf-8').write(s)
print('lines', s.count('\n'))
