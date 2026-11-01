# -*- coding: utf-8 -*-
"""v4.17 patch B：隨從（實體／行為／繪製／整合）"""
import io

P = 'index.html'
src = io.open(P, encoding='utf-8', newline='').read()
s = src.replace('\r\n', '\n')
rules = []

def R(name, old, new, cnt=1):
    rules.append((name, old, new, cnt))

# ---------- 1. Game 增加 pets ----------
R('Game 增加 pets 陣列',
  '''  players: [], enemies: [], bombs: [], flames: [], items: [], eggs: [], particles: [], bubbles: [],''',
  '''  players: [], enemies: [], bombs: [], flames: [], items: [], eggs: [], particles: [], bubbles: [],
  pets: [],            // v4.17：隨從（商店雇用，只在單人／RPG 出場）''')

# ---------- 2. startSolo 清掉 rpg 旗標（修舊 bug）＋清空隨從 ----------
R('startSolo 重置 rpg 旗標',
  '''  Game.mode = 'solo';
  Game.bossRush = !!bossRush;''',
  '''  Game.mode = 'solo';
  // v4.17：修舊 bug —— 玩過 RPG 之後 Game.rpg 一直是 true，
  //   回到單人闖關會走 RPG 的扣血邏輯（hpCur 是 undefined → 永遠不會死）。
  Game.rpg = false;
  Game.pets = [];
  Game.bossRush = !!bossRush;''')

# ---------- 3. 對戰清空隨從 ----------
R('startBattle 清空隨從',
  '''function startBattle() {
  Game.mode = 'battle';''',
  '''function startBattle() {
  Game.mode = 'battle';
  Game.pets = [];                    // v4.17：隨從只在單人／RPG 出場''')

# ---------- 4. 隨從主體 ----------
PETS_JS = '''// ================================================================
//   v4.17：隨從 —— 平常跟在主角旁邊，有怪物靠近（2 格）才會動作
//     · 刀客：1 格揮刀（冷卻 2 秒，刀光＋音效）
//     · 投彈：幫你丟炸彈（冷卻 3 秒，一次一顆，火焰不燒主人）
//     · 格檔：不攻擊，主動擋怪（擋一次原地休息 3 秒）
//     · 被打倒 → 坐著哭＋頭上冒 Help，主角靠近 5 秒救回
//     · 沒有怪時會幫你撿道具（撿到直接交給主角用）
//   只有「單人闖關」與「RPG 模式」會出場。
// ================================================================
const PET_SENSE_T = 2;        // 幾格內有怪才動手
const PET_HELP_SEC = 5;       // 主角要靠近幾秒才救得回來
const PET_FOLLOW_SPD = 3.6;   // 跟隨速度（× 格子大小）
function petHero() { return (Game.players && Game.players[0]) ? Game.players[0] : null; }
function petHpMax(kind) {
  if (Game.mode === 'solo') return kind === 'guard' ? 3 : 1;   // 單人：一擊倒（格檔可以擋三下）
  // RPG：有 HP（隨著關卡成長，格檔再硬一點）
  return 6 + Math.floor(((Game.stage || 1) - 1) / 6) * 2 + (kind === 'guard' ? 4 : 0);
}
function makePet(kind, chIdx, idx) {
  const hero = petHero();
  const T = Game.T || 40;
  const hp = petHpMax(kind);
  const a = .7 + idx * 2.1;
  return {
    __pet: true, kind: kind, chIdx: Math.abs(chIdx | 0) % CHARACTERS.length, idx: idx,
    x: hero.x + Math.cos(a) * T * .85, y: hero.y + Math.sin(a) * T * .85,
    facing: 'down', walkT: 0, moving: false,
    hp: hp, maxHp: hp,
    atkCd: .6, restT: 0, slashT: 0, throwT: 0, hitT: 0,
    down: false, rescueT: 0, downT: 0
  };
}
function spawnPets() {
  Game.pets = [];
  if (Game.mode !== 'solo' && Game.mode !== 'rpg') return 0;
  if (typeof Shop === 'undefined') return 0;
  const hero = petHero();
  if (!hero) return 0;
  const list = Shop.active();
  for (let i = 0; i < list.length; i++) Game.pets.push(makePet(list[i].kind, list[i].ch, i));
  return Game.pets.length;
}
function petFreeCell(x, y) { return cellAt(x, y) === 0 && !bombAt(x, y); }
// 往目標走一步（走格子中心線，撞牆會自動換軸）
function petStepTo(pt, tx, ty, dt, speed) {
  const T = Game.T || 40;
  const sp = speed * dt;
  if (Math.hypot(tx - pt.x, ty - pt.y) < 4) { pt.moving = false; return false; }
  const cx = Math.floor(pt.x / T), cy = Math.floor(pt.y / T);
  const dx = tx - pt.x, dy = ty - pt.y;
  const order = [];
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx) order.push([dx > 0 ? 1 : -1, 0]);
    if (dy) order.push([0, dy > 0 ? 1 : -1]);
  } else {
    if (dy) order.push([0, dy > 0 ? 1 : -1]);
    if (dx) order.push([dx > 0 ? 1 : -1, 0]);
  }
  order.push([0, 1], [0, -1], [1, 0], [-1, 0]);
  let mv = null;
  for (let i = 0; i < order.length; i++) {
    if (!order[i][0] && !order[i][1]) continue;
    if (petFreeCell(cx + order[i][0], cy + order[i][1])) { mv = order[i]; break; }
  }
  if (!mv) { pt.moving = false; return false; }
  pt.facing = mv[0] ? (mv[0] > 0 ? 'right' : 'left') : (mv[1] > 0 ? 'down' : 'up');
  const px = (cx + mv[0]) * T + T / 2, py = (cy + mv[1]) * T + T / 2;
  const ox = pt.x, oy = pt.y;
  pt.x += clamp(px - pt.x, -sp, sp);
  pt.y += clamp(py - pt.y, -sp, sp);
  pt.moving = (pt.x !== ox || pt.y !== oy);
  if (pt.moving) pt.walkT += dt;
  return pt.moving;
}
function petNearestEnemy(pt) {
  const T = Game.T || 40;
  let best = null, bd = Infinity;
  const lim = T * PET_SENSE_T;
  const list = Game.enemies || [];
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    if (!e || e.dead) continue;
    const d = Math.hypot(e.x - pt.x, e.y - pt.y);
    if (d <= lim && d < bd) { bd = d; best = e; }
  }
  return best;
}
// 隨從打怪（單人怪 1 下就死；RPG 扣 1 點血）
function petHitEnemy(e, dmg) {
  if (!e || e.dead) return false;
  e.hp = (e.hp || 1) - (dmg || 1);
  e.hitT = Math.max(e.hitT || 0, .18);
  burst(e.x, e.y, '#ffffff', 8, 170);
  if (e.hp <= 0) {
    e.dead = true;
    Game.players.forEach(function (p) { p.score += 200; });
    burst(e.x, e.y, e.color || '#fff', 18, 210);
    AudioSys.sfx('hurt');
    return true;
  }
  AudioSys.sfx('punch');
  return false;
}
function petHurt(pt, dmg) {
  if (!pt || pt.down || pt.hitT > 0) return;
  pt.hp -= (dmg || 1);
  pt.hitT = .9;
  burst(pt.x, pt.y, '#ffd166', 10, 170);
  AudioSys.sfx('hurt');
  if (pt.hp <= 0) {
    pt.hp = 0; pt.down = true; pt.downT = 0; pt.rescueT = 0; pt.moving = false;
    pt.atkCd = 0; pt.restT = 0; pt.slashT = 0; pt.throwT = 0;
    AudioSys.sfx('die');
    toast('😢 ' + petKind(pt.kind).name + ' 被打倒了！靠近她 ' + PET_HELP_SEC + ' 秒就能救回來', 3);
  }
}
// 隨從丟炸彈（落在怪物那一格；主人不會被這顆炸到）
function petThrowBomb(pt, foe) {
  const T = Game.T || 40;
  const cx = Math.floor(pt.x / T), cy = Math.floor(pt.y / T);
  let tx = Math.floor(foe.x / T), ty = Math.floor(foe.y / T);
  function ok(x, y) {
    return x > 0 && y > 0 && x < Game.cols - 1 && y < Game.rows - 1 &&
      cellAt(x, y) === 0 && !bombAt(x, y);
  }
  if (!ok(tx, ty)) {
    const cand = [[tx + 1, ty], [tx - 1, ty], [tx, ty + 1], [tx, ty - 1]].filter(function (c) {
      return ok(c[0], c[1]);
    });
    if (!cand.length) return false;
    tx = cand[0][0]; ty = cand[0][1];
  }
  if (tx === cx && ty === cy) return false;
  const dist = Math.abs(tx - cx) + Math.abs(ty - cy);
  Game.bombs.push({
    cx: tx, cy: ty, px: (cx + .5) * T, py: (cy + .5) * T,
    timer: 2.0, power: 1, owner: pt, passers: [],
    remoteArmed: false, mine: false, moving: null, held: false, seed: Math.random() * 6.28,
    petOwner: pt,
    flying: { fx: cx, fy: cy, tx: tx, ty: ty, t: 0, dur: Math.min(.9, .16 + dist * .06),
              path: [{ x: cx, y: cy }, { x: tx, y: ty }] }
  });
  AudioSys.sfx('throw');
  return true;
}
// 沒有怪時：跟著主角 ＋ 幫忙撿道具
function petFollowWork(pt, hero, dt) {
  const T = Game.T || 40;
  let best = null, bd = Infinity;
  for (let i = 0; i < Game.items.length; i++) {
    const it = Game.items[i];
    if (!it || it.type === 'skull') continue;
    const ix = it.cx * T + T / 2, iy = it.cy * T + T / 2;
    const d = Math.hypot(ix - pt.x, iy - pt.y);
    if (d <= T * 3.2 && d < bd) { bd = d; best = it; }
  }
  if (best) {
    const ix = best.cx * T + T / 2, iy = best.cy * T + T / 2;
    if (Math.abs(pt.x - ix) < T * .45 && Math.abs(pt.y - iy) < T * .45) {
      const idx = Game.items.indexOf(best);
      if (idx >= 0) Game.items.splice(idx, 1);
      applyItem(hero, best.type);          // 撿到直接交給主角用
      toast('🐾 ' + petKind(pt.kind).name + ' 幫你撿到 ' +
        (ITEMS[best.type] ? ITEMS[best.type].icon : '') + ' ' + itemName(best.type), 2.2);
      return;
    }
    petStepTo(pt, ix, iy, dt, T * 3.0);
    return;
  }
  const offs = [[-1, .35], [1, .35], [-.15, 1.05]];
  const o = offs[pt.idx % offs.length];
  const sx = hero.x + o[0] * T * .8, sy = hero.y + o[1] * T * .8;
  if (Math.hypot(sx - pt.x, sy - pt.y) > T * .55) petStepTo(pt, sx, sy, dt, T * PET_FOLLOW_SPD);
}
// 怪物碰到隨從：格檔會硬碰（震退＋休息 3 秒），其他隨從直接受傷
function petTouchEnemies(pt) {
  if (pt.down || pt.hitT > 0) return;
  const T = Game.T || 40;
  const list = Game.enemies || [];
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    if (!e || e.dead) continue;
    if (e.boss) continue;                                  // BOSS 不會被隨從擋住（避免卡王）
    if (Math.hypot(e.x - pt.x, e.y - pt.y) > (e.r || T * .38) + T * .26) continue;
    if (pt.kind === 'guard') {
      e.dizzy = Math.max(e.dizzy || 0, 1.1);
      const dx = e.x - pt.x, dy = e.y - pt.y;
      const nx = Math.floor(e.x / T) + (dx > 0 ? 1 : dx < 0 ? -1 : 0);
      const ny = Math.floor(e.y / T) + (dy > 0 ? 1 : dy < 0 ? -1 : 0);
      if (petFreeCell(nx, ny)) { e.x = nx * T + T / 2; e.y = ny * T + T / 2; }
      petHurt(pt, 1);
      pt.restT = 3;                                        // 擋完原地休息 3 秒
      AudioSys.sfx('kick');
      burst(pt.x, pt.y, '#9ad2ff', 14, 210);
      toast('🛡️ 格檔隨從擋下攻擊，原地休息 3 秒', 1.9);
    } else {
      petHurt(pt, 1);
    }
    break;
  }
}
function updatePets(dt) {
  if (!Game.pets || !Game.pets.length) return;
  if (Game.mode !== 'solo' && Game.mode !== 'rpg') return;
  const T = Game.T || 40;
  const hero = petHero();
  if (!hero) return;
  for (let i = 0; i < Game.pets.length; i++) {
    const pt = Game.pets[i];
    if (pt.hitT > 0) pt.hitT -= dt;
    if (pt.atkCd > 0) pt.atkCd -= dt;
    if (pt.slashT > 0) pt.slashT -= dt;
    if (pt.throwT > 0) pt.throwT -= dt;
    pt.moving = false;

    // ---- 倒地：哭臉＋Help，主角靠近累積 5 秒救回 ----
    if (pt.down) {
      pt.downT += dt;
      const near = hero.alive && Math.hypot(hero.x - pt.x, hero.y - pt.y) < T * 1.15;
      if (near) pt.rescueT += dt;
      else pt.rescueT = Math.max(0, pt.rescueT - dt * 1.5);
      if (pt.rescueT >= PET_HELP_SEC) {
        pt.down = false; pt.rescueT = 0; pt.hitT = 1.4;
        pt.hp = Math.max(1, Math.round(pt.maxHp * .6));
        AudioSys.sfx('item');
        burst(pt.x, pt.y, '#7ef0b4', 20, 210);
        toast('💚 ' + petKind(pt.kind).name + ' 救回來了！', 2.2);
      }
      continue;
    }
    // ---- 格檔休息中：站著不動 ----
    if (pt.restT > 0) { pt.restT -= dt; continue; }

    const foe = petNearestEnemy(pt);

    if (pt.kind === 'blade') {
      if (foe) {
        const d = Math.hypot(foe.x - pt.x, foe.y - pt.y);
        if (d <= T * 1.12) {
          if (pt.atkCd <= 0) {
            pt.atkCd = 2;                                  // 冷卻 2 秒
            pt.slashT = .28;                               // 刀光
            const dx = foe.x - pt.x, dy = foe.y - pt.y;
            pt.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
            petHitEnemy(foe, 1);
            burst(foe.x, foe.y, '#8ff0ff', 7, 160);
          }
        } else petStepTo(pt, foe.x, foe.y, dt, T * 3.4);
      } else petFollowWork(pt, hero, dt);
      petTouchEnemies(pt);
      continue;
    }

    if (pt.kind === 'bomber') {
      const mine = Game.bombs.filter(function (b) { return b.petOwner === pt; }).length;
      if (foe && pt.atkCd <= 0 && mine < 1) {
        const d = Math.hypot(foe.x - pt.x, foe.y - pt.y);
        const heroSafe = Math.hypot(foe.x - hero.x, foe.y - hero.y) > T * 1.6;
        if (d > T * .6 && heroSafe) {
          pt.atkCd = 3;                                    // 冷卻 3 秒
          if (petThrowBomb(pt, foe)) pt.throwT = .3;
        }
      }
      if (foe) {
        if (Math.hypot(foe.x - pt.x, foe.y - pt.y) < T * 1.3) {
          petStepTo(pt, pt.x * 2 - foe.x, pt.y * 2 - foe.y, dt, T * 2.6);   // 太近就往後退
        }
      } else petFollowWork(pt, hero, dt);
      petTouchEnemies(pt);
      continue;
    }

    if (pt.kind === 'guard') {
      if (foe) {
        // 站到主角與怪物中間
        petStepTo(pt, (hero.x + foe.x) / 2, (hero.y + foe.y) / 2, dt, T * 3.2);
      } else petFollowWork(pt, hero, dt);
      petTouchEnemies(pt);
      continue;
    }

    petFollowWork(pt, hero, dt);
    petTouchEnemies(pt);
  }
}
// 繪製隨從（角色＋種類徽章＋刀光＋血量；倒地時是哭臉＋Help）
function drawPet(pt, T) {
  const x = pt.x, y = pt.y;
  const R = T * .30;
  const c = CHARACTERS[pt.chIdx] || CHARACTERS[0];
  const bob = pt.moving ? Math.abs(Math.sin(pt.walkT * 14)) * 1.2 : 0;
  softShadow(x, y + T * .30, R * .82, R * .26, .30);
  if (pt.down) {
    // 坐在地上一直哭
    const args = { walk: 0, moving: false, facing: pt.facing, bob: 0, blink: false,
                   expr: 'cry', idle: Game.gameT, skin: c.color };
    drawSpriteChar(ctx, c, x, y + T * .05, R * .92, args) || drawCharBody(ctx, c, x, y + T * .05, R * .92, args);
    // 頭上的 Help 泡泡（紅色、一直閃）
    const pulse = .72 + .28 * Math.sin(Game.gameT * 8);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.font = '900 ' + Math.round(T * .28) + 'px "Microsoft JhengHei", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tw = Math.max(T * .86, ctx.measureText('Help').width + T * .26);
    const bx = x - tw / 2, by = y - T * .93, bh = T * .38;
    ctx.fillStyle = 'rgba(206,32,48,.95)';
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(bx, by, tw, bh, bh / 2); ctx.fill(); }
    else ctx.fillRect(bx, by, tw, bh);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(bx, by, tw, bh, bh / 2); ctx.stroke(); }
    ctx.fillStyle = '#fff';
    ctx.fillText('Help', x, by + bh / 2 + 1);
    ctx.restore();
    // 救援進度圈
    const prog = Math.min(1, (pt.rescueT || 0) / PET_HELP_SEC);
    ctx.strokeStyle = 'rgba(255,255,255,.28)';
    ctx.lineWidth = Math.max(2, T * .055);
    ctx.beginPath(); ctx.arc(x, y + T * .05, T * .52, 0, 6.283); ctx.stroke();
    if (prog > 0) {
      ctx.strokeStyle = '#7ef0b4';
      ctx.beginPath(); ctx.arc(x, y + T * .05, T * .52, -1.5708, -1.5708 + 6.283 * prog); ctx.stroke();
    }
    ctx.lineWidth = 1;
    ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
    return;
  }
  const args = { walk: pt.walkT * 14, moving: pt.moving, facing: pt.facing, bob: bob,
                 blink: false, expr: pt.hitT > 0 ? 'cry' : '', idle: Game.gameT, skin: c.color };
  if (pt.hitT > 0 && Math.floor(Game.gameT * 14) % 2 === 0) ctx.globalAlpha = .45;
  drawSpriteChar(ctx, c, x, y - bob, R, args) || drawCharBody(ctx, c, x, y - bob, R, args);
  ctx.globalAlpha = 1;
  // 種類徽章
  const k = petKind(pt.kind);
  if (k) {
    ctx.font = '700 ' + Math.round(T * .24) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(k.ico, x, y - R * 2.15);
  }
  // 刀光（白色＋青色新月）
  if (pt.slashT > 0) {
    const k2 = Math.min(1, pt.slashT / .28);
    const d = DIRS[pt.facing] || DIRS.down;
    const ang = Math.atan2(d.y, d.x);
    ctx.save();
    ctx.globalAlpha = .25 + .75 * k2;
    ctx.strokeStyle = '#eafcff';
    ctx.lineWidth = Math.max(2, T * .10);
    ctx.beginPath();
    ctx.arc(x + d.x * T * .18, y + d.y * T * .18, T * .46, ang - 1.05, ang + 1.05);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(120,240,255,.85)';
    ctx.lineWidth = Math.max(1, T * .045);
    ctx.beginPath();
    ctx.arc(x + d.x * T * .18, y + d.y * T * .18, T * .46 - T * .07, ang - .85, ang + .85);
    ctx.stroke();
    ctx.restore();
    ctx.lineWidth = 1;
  }
  // 丟彈動作：手上閃一下
  if (pt.throwT > 0) {
    ctx.globalAlpha = .8;
    ctx.font = '700 ' + Math.round(T * .30) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('💣', x + (DIRS[pt.facing] || DIRS.down).x * T * .34,
      y - T * .10 + (DIRS[pt.facing] || DIRS.down).y * T * .30);
    ctx.globalAlpha = 1;
  }
  // 血量（超過 1 點才畫）
  if (pt.maxHp > 1) {
    const n = Math.max(0, pt.hp), mx = pt.maxHp;
    const bw = T * .10, gap = T * .03;
    const total = mx * bw + (mx - 1) * gap;
    let px0 = x - total / 2;
    for (let i = 0; i < mx; i++) {
      ctx.fillStyle = i < n ? '#7ef0b4' : 'rgba(255,255,255,.22)';
      ctx.fillRect(px0, y - R * 1.75, bw, Math.max(2, T * .055));
      px0 += bw + gap;
    }
  }
  ctx.textAlign = 'start';
}

'''
R('插入隨從模組',
  '''function updateSolo(dt) {
  const p = Game.players[0];''',
  PETS_JS + '''function updateSolo(dt) {
  const p = Game.players[0];''')

# ---------- 5. updateSolo 呼叫 updatePets ----------
R('updateSolo 更新隨從',
  '''    // 玩家控制
    if (p.alive) controlHuman(p, dt);
    // 敵人
    Game.enemies.forEach(function (e) { updateEnemy(e, dt); });''',
  '''    // 玩家控制
    if (p.alive) controlHuman(p, dt);
    // 敵人
    Game.enemies.forEach(function (e) { updateEnemy(e, dt); });
    // v4.17：隨從（跟隨／攻擊／擋怪／撿道具／倒地救援）
    updatePets(dt);''')

# ---------- 6. 建關時生成隨從 ----------
R('buildSoloStage 生成隨從',
  '''  hideOverlay();
  buildSdList();
}

// ---------- 10 種小怪 ----------''',
  '''  hideOverlay();
  buildSdList();
  spawnPets();                       // v4.17：把商店雇用的隨從帶進關卡
}

// ---------- 10 種小怪 ----------''')

R('buildRpgStage 生成隨從',
  '''  Game.bombs = []; Game.flames = []; Game.items = []; Game.particles = [];
  Game.pops = []; Game.edgeFx = 0;          // v4.5：換場清掉上次殘留的受傷反饋
  Game.sdIndex = 0; Game.sdList = [];
  hideOverlay();
  buildSdList();
}

function startRpg(stage) {''',
  '''  Game.bombs = []; Game.flames = []; Game.items = []; Game.particles = [];
  Game.pops = []; Game.edgeFx = 0;          // v4.5：換場清掉上次殘留的受傷反饋
  Game.sdIndex = 0; Game.sdList = [];
  hideOverlay();
  buildSdList();
  spawnPets();                       // v4.17：把商店雇用的隨從帶進關卡
}

function startRpg(stage) {''')

# ---------- 7. 隨從的炸彈不燒主人 ----------
R('隨從炸彈不傷主人',
  '''        // v1.9：自己坐騎吐的火燒不到自己（走太快撞到自己的火不會受傷）
        if (Game.flames[i].src === 'dino' && Game.flames[i].owner === p) continue;''',
  '''        // v1.9：自己坐騎吐的火燒不到自己（走太快撞到自己的火不會受傷）
        if (Game.flames[i].src === 'dino' && Game.flames[i].owner === p) continue;
        // v4.17：隨從丟的炸彈不會炸到主人（支援用的火力，不會反咬自己人）
        if (Game.flames[i].owner && Game.flames[i].owner.__pet) continue;''')

# ---------- 8. 繪製隨從 ----------
R('drawGame 畫隨從',
  '''  // 敵人
  Game.enemies.forEach(function (e) { drawEnemy(e, T); });''',
  '''  // 敵人
  Game.enemies.forEach(function (e) { drawEnemy(e, T); });
  // v4.17：隨從（畫在敵人之後、玩家之前 → 不會蓋住主角）
  if (Game.pets && Game.pets.length) Game.pets.forEach(function (pt) { drawPet(pt, T); });''')

# ---------- 9. 匯出 ----------
R('匯出隨從 API',
  '''  Shop: Shop, PET_KINDS: PET_KINDS, petKind: petKind,''',
  '''  Shop: Shop, PET_KINDS: PET_KINDS, petKind: petKind,
  spawnPets: spawnPets, updatePets: updatePets, drawPet: drawPet,
  petHero: petHero, petNearestEnemy: petNearestEnemy, petHpMax: petHpMax,
  petThrowBomb: petThrowBomb, petHurt: petHurt, petHitEnemy: petHitEnemy,
  makePet: makePet, PET_HELP_SEC: PET_HELP_SEC, PET_SENSE_T: PET_SENSE_T,''')

for name, old, new, cnt in rules:
    n = s.count(old)
    assert n == cnt, '規則「%s」命中 %d 次（預期 %d）' % (name, n, cnt)
    s = s.replace(old, new)
    print('  ok  ' + name)

io.open(P, 'w', encoding='utf-8', newline='').write(s.replace('\n', '\r\n'))
print('patch B done')
