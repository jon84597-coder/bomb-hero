# -*- coding: utf-8 -*-
# v1.8 補丁 B：
#   1. BOSS 從畫面「下方」登場（不再從玩家上方）
#   2. BOSS 體型放大（sizeMul）
#   3. 電腦騎龍也會吐火（頻率低很多）
#   4. 騎龍再吃第二顆蛋 → 紅龍，吐火一次燒上下左右各 2 格
import io

p = 'index.html'
s = io.open(p, encoding='utf-8').read()


def rep(old, new, tag):
    global s
    assert old in s and s.count(old) == 1, 'MISS/DUP ' + tag + ' (count=%d)' % s.count(old)
    s = s.replace(old, new)
    print('OK', tag)


# ================================================================
# 1 & 2. BOSS：下方登場 ＋ 體型放大
# ================================================================
rep("""  if (stage === 8) {
    Game.enemies.push(makeBoss(Math.floor(cols / 2), 1, diff.bossHp));
  }""",
    """  if (stage === 8) {
    // v1.8：BOSS 從「畫面下方」登場（舊版在最上排出來，一開局就壓在玩家頭上）
    const by = Math.max(1, rows - 2);
    let bx = clamp(Math.floor(cols / 2), 1, cols - 2);
    // 別剛好坐在傳送門上；下方空間不足就往上一排退
    if (Game.door && Game.door.x === bx && Game.door.y === by) bx = (bx > 1 ? bx - 1 : bx + 1);
    Game.grid[by][bx] = 0;                       // 登場那一格先清空，保證站得住
    const boss = makeBoss(bx, by, diff.bossHp);
    boss.dirName = 'up';                         // 從下方上來 → 面朝上方
    Game.enemies.push(boss);
  }""", 'BOSS 從下方登場')

rep("""    hp: H, maxHp: H, hitT: 0, bombT: 3, dirT: 0, dirName: 'down', dead: false, walkT: 0, boss: true""",
    """    sizeMul: 1.34,            // v1.8：體型放大 34%（比玩家更有魄力，判定半徑不變）
    hp: H, maxHp: H, hitT: 0, bombT: 3, dirT: 0, dirName: 'up', dead: false, walkT: 0, boss: true""",
    'BOSS sizeMul')

rep("""  } else {
    softShadow(x, y + e.r * .9, e.r * .8, e.r * .28, .33);
  }""",
    """  } else {
    // v1.8：BOSS 放大 → 影子也等比放大，才有壓迫感
    const sr = e.boss ? e.r * (e.sizeMul || 1) : e.r;
    softShadow(x, y + sr * .9, sr * .78, sr * .28, .36);
  }""", 'BOSS 影子放大')

rep("""    // 老虎國王 BOSS：用使用者提供的插畫（拆成頭／手／腳，走路會擺、會點頭）
    const BH = e.r * 4.3;
    const bFoot = y + e.r * 1.45;""",
    """    // 老虎國王 BOSS：用使用者提供的插畫（拆成頭／手／腳，走路會擺、會點頭）
    // v1.8：整個身軀放大（腳的位置不變 → 往上長高，看起來比玩家大一號）
    const BS = e.sizeMul || 1;
    const BH = e.r * 4.3 * BS;
    const bFoot = y + e.r * 1.45 * (BS > 1 ? 1.08 : 1);""", 'BOSS 身高放大')

rep("""    const barY = y - BH * .92 - 10;
    ctx.fillStyle = 'rgba(0,0,0,.5)';
    ctx.fillRect(x - 26, barY, 52, 7);
    ctx.fillStyle = '#ff5e6e';
    ctx.fillRect(x - 25, barY + 1, 50 * (e.hp / e.maxHp), 5);""",
    """    const barY = y - BH * .92 - 10;
    const bw = Math.max(52, Game.T * 1.15);      // v1.8：BOSS 變大 → 血條也加寬
    ctx.fillStyle = 'rgba(0,0,0,.5)';
    ctx.fillRect(x - bw / 2, barY, bw, 7);
    ctx.fillStyle = '#ff5e6e';
    ctx.fillRect(x - bw / 2 + 1, barY + 1, (bw - 2) * (e.hp / e.maxHp), 5);""", 'BOSS 血條加寬')

# ================================================================
# 3. AI 等級：新增恐龍吐火參數（頻率明顯低於玩家）
# ================================================================
rep("""const AI_LEVELS = {
  weak:   { think: [.5, 1.0], chase: .35, bomb: .28, flee: .55, spd: .82, foeR: 2.6, soft: .5 },
  normal: { think: [.2, .5],  chase: 1,   bomb: .85, flee: 1,   spd: 1,   foeR: 3.4, soft: 1 },
  strong: { think: [.09, .2], chase: 1,   bomb: .97, flee: 1,   spd: 1.15, foeR: 4.8, soft: 1 }
};""",
    """const AI_LEVELS = {
  // dinoFire：每次重新思考時「要不要吐火」的機率；dinoFireCd：吐完的冷卻倍率（玩家是 1）
  weak:   { think: [.5, 1.0], chase: .35, bomb: .28, flee: .55, spd: .82, foeR: 2.6, soft: .5,  dinoFire: .10, dinoFireCd: 3.2 },
  normal: { think: [.2, .5],  chase: 1,   bomb: .85, flee: 1,   spd: 1,   foeR: 3.4, soft: 1,   dinoFire: .20, dinoFireCd: 2.5 },
  strong: { think: [.09, .2], chase: 1,   bomb: .97, flee: 1,   spd: 1.15, foeR: 4.8, soft: 1,  dinoFire: .34, dinoFireCd: 1.9 }
};""", 'AI_LEVELS 加吐火參數')

rep("""        if ((nearFoe || (nearSoft && Math.random() < lv.soft)) && Math.random() < lv.bomb) placeBomb(p);
      }
    }
  }
  if (p.aiDir) {""",
    """        if ((nearFoe || (nearSoft && Math.random() < lv.soft)) && Math.random() < lv.bomb) placeBomb(p);
      }
    }
    // v1.8：電腦騎到龍也會吐火（頻率明顯低於玩家：機率低 ＋ 冷卻是玩家的 2～3 倍）
    if (p.dino && (p.fireCd || 0) <= 0 && Math.random() < (lv.dinoFire || 0)) {
      let foe = null, fd = Infinity;
      Game.players.forEach(function (q) {
        if (q !== p && q.alive && !q.cart) {
          const dd = Math.abs(q.x - p.x) + Math.abs(q.y - p.y);
          if (dd < fd) { fd = dd; foe = q; }
        }
      });
      if (foe && fd < T * 3.6) {
        const dx = foe.x - p.x, dy = foe.y - p.y;
        p.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        fireBreath(p);
        p.fireCd = DINO_FIRE_CD * (lv.dinoFireCd || 2.5);
      }
    }
  }
  if (p.aiDir) {""", 'AI 騎龍吐火')

# ================================================================
# 4. 紅龍（騎龍再吃第二顆蛋）＋ 吐火上下左右各 2 格
# ================================================================
rep("""function rideDino(p) {
  p.dino = true; p.dinoT = 0; p.fireCd = 0;
  AudioSys.sfx('item');
  toast('🦖 孵出恐龍並騎上！多擋一次傷害 · 按 F／🔥 吐火 2 格（冷卻 3 秒）', 2.6);
  burst(p.x, p.y, '#7ee08a', 20, 190);
  bubbleSay(p, '衝啊！', 'kill', Game.T * 1.9);
}""",
    """function rideDino(p, red) {
  p.dino = true; p.dinoT = 0; p.fireCd = 0;
  AudioSys.sfx('item');
  if (red) {
    // v1.8：已經騎著小龍再吃到第二顆蛋 → 進化成「紅龍」
    p.redDragon = true;
    toast('🔥 進化成紅龍！吐火一次燒上下左右各 2 格（被炸一下龍還是會不見）', 3);
    burst(p.x, p.y, '#ff5e7e', 32, 250);
    Game.shake = Math.min(1, Game.shake + .3);
    bubbleSay(p, '紅龍來啦！', 'kill', Game.T * 1.9);
  } else {
    toast('🦖 孵出恐龍並騎上！多擋一次傷害 · 按 F／🔥 吐火 2 格（冷卻 3 秒）', 2.6);
    burst(p.x, p.y, '#7ee08a', 20, 190);
    bubbleSay(p, '衝啊！', 'kill', Game.T * 1.9);
  }
}
// 吃到恐龍蛋（人類與 AI 共用）：第一次騎上小龍，已騎著 → 升級成紅龍
function takeEgg(p) {
  const T = Game.T;
  const eg = eggAt(Math.floor(p.x / T), Math.floor(p.y / T));
  if (!eg) return false;
  Game.eggs.splice(Game.eggs.indexOf(eg), 1);
  rideDino(p, !!p.dino);
  return true;
}""", 'rideDino 紅龍 ＋ takeEgg')

rep("""function breakDino(p) {
  p.dino = false; p.fireCd = 0;""",
    """function breakDino(p) {
  p.dino = false; p.redDragon = false; p.fireCd = 0;""", 'breakDino 清紅龍')

rep("""  p.dino = false; p.fireCd = 0;
  p.carry = null;""",
    """  p.dino = false; p.redDragon = false; p.fireCd = 0;
  p.carry = null;""", 'resetSkills 清紅龍')

rep("""    dino: false, fireCd: 0, dinoT: 0,               // 騎乘恐龍（多擋一次傷害＋吐火）""",
    """    dino: false, fireCd: 0, dinoT: 0,               // 騎乘恐龍（多擋一次傷害＋吐火）
    redDragon: false,                               // v1.8：吃到第二顆蛋 → 紅龍（四方向吐火）""",
    'makePlayer 加 redDragon')

# 人類撿蛋改用 takeEgg
rep("""  // 走到恐龍蛋 → 孵出恐龍並騎上去
  const eg = eggAt(Math.floor(p.x / T), Math.floor(p.y / T));
  if (eg) {
    Game.eggs.splice(Game.eggs.indexOf(eg), 1);
    rideDino(p);
  }""",
    """  // 走到恐龍蛋 → 孵出恐龍並騎上去（已經騎著 → 升級紅龍）
  takeEgg(p);""", '人類撿蛋')

# AI 撿蛋改用 takeEgg
rep("""  const aeg = eggAt(Math.floor(p.x / T), Math.floor(p.y / T));
  if (aeg) { Game.eggs.splice(Game.eggs.indexOf(aeg), 1); p.dino = true; p.fireCd = 0; }""",
    """  takeEgg(p);""", 'AI 撿蛋')

# 吐火：紅龍 → 上下左右各 2 格
rep("""function fireBreath(p) {
  if (!p || !p.alive || !p.dino || p.fireCd > 0) return false;
  const T = Game.T;
  const d = DIRS[p.facing];
  const cx = Math.floor(p.x / T), cy = Math.floor(p.y / T);
  for (let i = 1; i <= DINO_FIRE_RANGE; i++) {
    const x = cx + d.x * i, y = cy + d.y * i;
    if (cellAt(x, y) === 1) break;
    if (cellAt(x, y) === 2) { destroySoft(x, y); addFlame(x, y, 'end', p.facing, p); break; }
    const b = bombAt(x, y);
    if (b) { addFlame(x, y, 'end', p.facing, p); explodeBomb(b); break; }
    addFlame(x, y, i === DINO_FIRE_RANGE ? 'end' : 'mid', p.facing, p);
  }
  p.fireCd = DINO_FIRE_CD;
  AudioSys.sfx('explode');
  burst(p.x + d.x * T * .62, p.y + d.y * T * .62, '#ffb347', 12, 150);
  return true;
}""",
    """function fireBreath(p) {
  if (!p || !p.alive || !p.dino || p.fireCd > 0) return false;
  const T = Game.T;
  const cx = Math.floor(p.x / T), cy = Math.floor(p.y / T);
  // v1.8：紅龍一次燒「上下左右」四個方向，一般小龍只燒面前
  const dirs = p.redDragon ? ['up', 'down', 'left', 'right'] : [p.facing];
  let cells = 0;
  for (let k = 0; k < dirs.length; k++) {
    const dn = dirs[k], d = DIRS[dn] || DIRS.down;
    for (let i = 1; i <= DINO_FIRE_RANGE; i++) {
      const x = cx + d.x * i, y = cy + d.y * i;
      if (cellAt(x, y) === 1) break;
      if (cellAt(x, y) === 2) { destroySoft(x, y); addFlame(x, y, 'end', dn, p); cells++; break; }
      const b = bombAt(x, y);
      if (b) { addFlame(x, y, 'end', dn, p); explodeBomb(b); cells++; break; }
      addFlame(x, y, i === DINO_FIRE_RANGE ? 'end' : 'mid', dn, p);
      cells++;
    }
  }
  p.fireCd = DINO_FIRE_CD;
  AudioSys.sfx('explode');
  for (let k = 0; k < dirs.length; k++) {
    const d = DIRS[dirs[k]];
    if (p.redDragon) burst(p.x + d.x * T * .62, p.y + d.y * T * .62, '#ff5e5e', 9, 165);
    else burst(p.x + d.x * T * .62, p.y + d.y * T * .62, '#ffb347', 12, 150);
  }
  return cells > 0;
}""", '吐火（紅龍四方向）')

# ================================================================
# 5. 小龍外觀：紅龍染紅 ＋ 火紅氣場 ＋ 提示文字
# ================================================================
rep("""function drawDino(p, T) {
  const x = p.x, y = p.y;
  const fx = DIRS[p.facing];
  const side = fx.x !== 0 ? fx.x : 1;
  const DH = T * 2.00;                       // 小龍總高
  const footY = y + T * .52;
  const bob = p.moving ? Math.abs(Math.sin(p.walkT * 12)) * .5 : Math.sin(p.dinoT * 3) * .4;
  softShadow(x, y + T * .58, T * .58, T * .16, .34);
  const rig = drawRigChar(ctx, 'dragon', x, footY - bob * 2, DH, {""",
    """function drawDino(p, T) {
  const x = p.x, y = p.y;
  const fx = DIRS[p.facing];
  const side = fx.x !== 0 ? fx.x : 1;
  const red = !!p.redDragon;                 // v1.8：紅龍（吃到第二顆蛋）
  const DH = T * (red ? 2.14 : 2.00);        // 小龍總高（紅龍再大一點）
  const footY = y + T * .52;
  const bob = p.moving ? Math.abs(Math.sin(p.walkT * 12)) * .5 : Math.sin(p.dinoT * 3) * .4;
  softShadow(x, y + T * .58, T * .58, T * .16, .34);
  // 紅龍：身上一圈火紅氣場（一眼就能分辨）
  if (red) {
    const pulse = .5 + Math.sin(Game.gameT * 5) * .16;
    const gr = ctx.createRadialGradient(x, y + T * .08, T * .1, x, y + T * .08, T * 1.0);
    gr.addColorStop(0, 'rgba(255,120,60,' + (pulse * .6).toFixed(3) + ')');
    gr.addColorStop(1, 'rgba(255,60,60,0)');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.ellipse(x, y + T * .08, T * 1.0, T * .84, 0, 0, 6.283); ctx.fill();
  }
  if (red) ctx.filter = 'hue-rotate(-118deg) saturate(2.6) brightness(1.06)';
  const rig = drawRigChar(ctx, 'dragon', x, footY - bob * 2, DH, {""", '紅龍氣場＋染色')

rep("""    amp: 1.15, idle: p.dinoT || 0, headTilt: Math.sin((p.dinoT || 0) * 2.2) * .02
  });
  if (!rig) {
    // 插畫還沒載入 → 退回原本的綠色小恐龍（不會開天窗）
    const body = '#63c07a', body2 = '#3f9c5c', dark = '#2f7a45';""",
    """    amp: 1.15, idle: p.dinoT || 0, headTilt: Math.sin((p.dinoT || 0) * 2.2) * .02
  });
  if (red) ctx.filter = 'none';
  if (!rig) {
    // 插畫還沒載入 → 退回原本的小恐龍（紅龍版用紅色系，不會開天窗）
    const body = red ? '#e8463c' : '#63c07a', body2 = red ? '#b3231f' : '#3f9c5c', dark = red ? '#7d1410' : '#2f7a45';""",
    '紅龍備援配色')

rep("""  const label = cd > 0 ? '吐火 ' + cd.toFixed(1) + 's' : '吐火 OK';""",
    """  const label = red
    ? (cd > 0 ? '紅龍吐火 ' + cd.toFixed(1) + 's' : '紅龍吐火 OK（四方向）')
    : (cd > 0 ? '吐火 ' + cd.toFixed(1) + 's' : '吐火 OK');""", '紅龍提示文字')

io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('bytes', len(s.encode('utf-8')))
