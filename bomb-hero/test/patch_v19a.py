# -*- coding: utf-8 -*-
# v1.9 核心玩法：
#   1) 轉向不再卡一半（對齊加速 + 轉彎自動補位）
#   3) 手機搖桿預設「小」＋更靈敏（死區變小、正四方判定加大）
#   6) 被丟出的炸彈砸到 → 頭暈 1 秒
#   7) 自己的坐騎火焰不會燒到自己
#   8) BOSS 火焰 3 格
import io

P = 'index.html'
s = io.open(P, encoding='utf-8').read()

def rep(old, new, tag):
    global s
    assert old in s, 'MISS ' + tag
    assert s.count(old) == 1, 'DUP(' + str(s.count(old)) + ') ' + tag
    s = s.replace(old, new)
    print('OK', tag)

# ---------- 版本 ----------
rep("const VERSION = '1.8';", "const VERSION = '1.9';", 'VERSION')
rep('<span id="verTxt">1.8</span>', '<span id="verTxt">1.9</span>', 'verTxt')

# ==================================================================
# 1) 轉向不再卡一半：tryMove 的「轉彎補位」
#    原本只有 |偏移| > 0.4px 才會往隔壁滑，而且滑到一半剛好正中間時
#    會直接判定「撞牆」停在原地 → 手機上最容易「轉到一半卡住」。
#    改成：只要不在格子正中間（> 10% 格寬），就自動滑到「走得通」的隔壁格。
# ==================================================================
rep("""  if (dx !== 0) {
    const dir = dx > 0 ? 1 : -1;
    if (!solidOrBomb(cx + dir, cy, p)) {
      p.x += clamp((cx + dir) * T + T / 2 - p.x, -sp, sp);
      p.y += clamp(cyT - p.y, -sp, sp);
      return;
    }
    // 前方被擋 → 不停住：先往「能通過的相鄰列」滑，對齊後就能順著原方向走過去
    const offY = p.y - cyT;
    if (Math.abs(offY) > .4) {
      const sgn = offY > 0 ? 1 : -1;
      let slide = 0;
      if (!solidOrBomb(cx, cy + sgn, p) && !solidOrBomb(cx + dir, cy + sgn, p)) slide = sgn;
      else if (!solidOrBomb(cx, cy - sgn, p) && !solidOrBomb(cx + dir, cy - sgn, p)) slide = -sgn;
      if (slide) { p.y += clamp((cy + slide) * T + T / 2 - p.y, -sp, sp); return; }
    }
    // 真的撞牆：精靈邊緣貼齊牆面（下一幀就能立刻離開，不會有「卡一下」）
    const lim = dir > 0 ? (cx + 1) * T - T * .40 : cx * T + T * .40;
    p.x += clamp(lim - p.x, -sp, sp);
    return;
  }""",
"""  if (dx !== 0) {
    const dir = dx > 0 ? 1 : -1;
    if (!solidOrBomb(cx + dir, cy, p)) {
      p.x += clamp((cx + dir) * T + T / 2 - p.x, -sp, sp);
      // v1.9：轉向立刻對齊列中心（1.9 倍速修正），手指一撥就轉過去
      p.y += clamp(cyT - p.y, -sp * 1.9, sp * 1.9);
      return;
    }
    // 前方被擋 → 自動滑到「那一格才走得到」的相鄰列（兩格中間也能轉，不再卡一半）
    const offY = p.y - cyT;
    if (Math.abs(offY) > T * .10) {
      const pref = offY > 0 ? 1 : -1;
      for (let k = 0; k < 2; k++) {
        const sgn = k === 0 ? pref : -pref;
        if (solidOrBomb(cx, cy + sgn, p)) continue;
        if (solidOrBomb(cx + dir, cy + sgn, p)) continue;
        p.y += clamp((cy + sgn) * T + T / 2 - p.y, -sp * 1.9, sp * 1.9);
        return;
      }
    }
    // 真的撞牆：精靈邊緣貼齊牆面（下一幀就能立刻離開，不會有「卡一下」）
    const lim = dir > 0 ? (cx + 1) * T - T * .40 : cx * T + T * .40;
    p.x += clamp(lim - p.x, -sp, sp);
    return;
  }""", 'tryMove dx 轉彎補位')

rep("""  if (dy !== 0) {
    const dir = dy > 0 ? 1 : -1;
    if (!solidOrBomb(cx, cy + dir, p)) {
      p.y += clamp((cy + dir) * T + T / 2 - p.y, -sp, sp);
      p.x += clamp(cxT - p.x, -sp, sp);
      return;
    }
    const offX = p.x - cxT;
    if (Math.abs(offX) > .4) {
      const sgn = offX > 0 ? 1 : -1;
      let slide = 0;
      if (!solidOrBomb(cx + sgn, cy, p) && !solidOrBomb(cx + sgn, cy + dir, p)) slide = sgn;
      else if (!solidOrBomb(cx - sgn, cy, p) && !solidOrBomb(cx - sgn, cy + dir, p)) slide = -sgn;
      if (slide) { p.x += clamp((cx + slide) * T + T / 2 - p.x, -sp, sp); return; }
    }
    // 貼牆：向上時頭頂（.62T）碰牆、向下時腳底（.40T）碰牆
    const lim = dir > 0 ? (cy + 1) * T - T * .40 : cy * T + T * .62;
    p.y += clamp(lim - p.y, -sp, sp);
    return;
  }
}""",
"""  if (dy !== 0) {
    const dir = dy > 0 ? 1 : -1;
    if (!solidOrBomb(cx, cy + dir, p)) {
      p.y += clamp((cy + dir) * T + T / 2 - p.y, -sp, sp);
      // v1.9：轉向立刻對齊行中心（1.9 倍速修正）
      p.x += clamp(cxT - p.x, -sp * 1.9, sp * 1.9);
      return;
    }
    const offX = p.x - cxT;
    if (Math.abs(offX) > T * .10) {
      const pref = offX > 0 ? 1 : -1;
      for (let k = 0; k < 2; k++) {
        const sgn = k === 0 ? pref : -pref;
        if (solidOrBomb(cx + sgn, cy, p)) continue;
        if (solidOrBomb(cx + sgn, cy + dir, p)) continue;
        p.x += clamp((cx + sgn) * T + T / 2 - p.x, -sp * 1.9, sp * 1.9);
        return;
      }
    }
    // 貼牆：向上時頭頂（.62T）碰牆、向下時腳底（.40T）碰牆
    const lim = dir > 0 ? (cy + 1) * T - T * .40 : cy * T + T * .62;
    p.y += clamp(lim - p.y, -sp, sp);
    return;
  }
}""", 'tryMove dy 轉彎補位')

# ==================================================================
# 3) 手機搖桿更靈敏 + 預設「小」
# ==================================================================
rep("""        const TH = .382;           // sin(22.5°) → 切成 8 個 45° 扇區，可走斜向""",
"""        // v1.9：正上/下/左/右 各佔 60°、斜向各佔 30°
        // （原本 45/45 太容易被手指的微小偏移帶成斜走 → 一直貼牆磨、轉不過去）
        const TH = .50;""", 'touch 方向門檻')

rep("""      const dead = rad * .30;                     // 中央死區""",
"""      const dead = rad * .14;                     // v1.9：死區縮小，輕輕一撥就有反應""",
'touch 死區')

rep("const DEF_TPAD = { side: 'left', act: 'right', size: 1 };",
    "const DEF_TPAD = { side: 'left', act: 'right', size: 0.8 };   // v1.9：預設「小」，一般手型最好按",
    'DEF_TPAD 預設小')

# 舊存檔（size=1 中）第一次升級到 1.9 時幫忙調成「小」
rep("""  settings.tpad.size = parseFloat(settings.tpad.size) || 1;""",
"""  settings.tpad.size = parseFloat(settings.tpad.size) || 1;
  // v1.9：首度升級就幫忙調成「小」（用過自己的設定就不再動）
  try {
    if (!localStorage.getItem('bombhero-tpad-def')) {
      if (Math.abs(settings.tpad.size - 1) < .001) settings.tpad.size = 0.8;
      localStorage.setItem('bombhero-tpad-def', '1');
    }
  } catch (e) {}""", '舊存檔遷移成小')

# ==================================================================
# 6) 被丟出的炸彈砸到 → 頭暈 1 秒
# ==================================================================
rep("""function solidOrBomb(cx, cy, p) {""",
"""// v1.9：頭暈 —— 被任何「丟出來的炸彈」砸到（場外推車投的、場內玩家擲的都算）
// 效果：整個人停住 1 秒不能動也不能放彈（頭上轉星星）
const DIZZY_TIME = 1;
function canDizzy(who) {
  if (!who) return false;
  if (who.cart) return false;                    // 已經坐在推車上的人不算
  if (who.dead) return false;
  if (who.alive === false) return false;
  return true;
}
function setDizzy(who, T) {
  if (!canDizzy(who) || (who.dizzy || 0) > 0) return false;
  who.dizzy = DIZZY_TIME;
  who.moving = false;
  burst(who.x, who.y - T * .55, '#ffe08a', 12, 120);
  AudioSys.sfx('hurt');
  if (who.ch) {                                   // 只有玩家才打字（避免洗版）
    toast(pname(who) + ' 被炸彈砸到了！😵 定住 ' + DIZZY_TIME + ' 秒', 1.2);
  }
  return true;
}
// 飛行中的炸彈每幀檢查有沒有砸到人
function flyingDizzyCheck(b, T) {
  if (!b || !Game.players) return;
  const rr = T * .48, hit = rr * rr;
  for (let i = 0; i < Game.players.length; i++) {
    const p = Game.players[i];
    if (!canDizzy(p)) continue;
    if (dist2(p.x, p.y, b.px, b.py) > hit) continue;
    setDizzy(p, T);
  }
  for (let i = 0; i < Game.enemies.length; i++) {
    const e = Game.enemies[i];
    if (!canDizzy(e)) continue;
    if (dist2(e.x, e.y, b.px, b.py) > hit) continue;
    setDizzy(e, T);
  }
}
// 頭暈特效：頭頂轉三顆星 + 😵
function drawDizzyMark(x, y, T) {
  if (!ctx || !ctx.save) return;
  const t = Game.gameT * 7;
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '700 ' + Math.max(9, Math.round(T * .30)) + 'px sans-serif';
  ctx.fillText('😵', x, y - T * .62);
  for (let i = 0; i < 3; i++) {
    const a = t + i * 2.094;
    ctx.globalAlpha = .55 + Math.sin(t * 2 + i) * .32;
    ctx.fillText('✦', x + Math.cos(a) * T * .40, y - T * .40 + Math.sin(a) * T * .13);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
  ctx.restore();
}
function solidOrBomb(cx, cy, p) {""", '暈眩函式')

# 飛行中的炸彈：每幀檢查有沒有砸到人
rep("""        b.cx = f.tx; b.cy = f.ty;
        b.passers = [];
      }
      continue;""",
"""        b.cx = f.tx; b.cy = f.ty;
        b.passers = [];
      }
      flyingDizzyCheck(b, T);        // v1.9：飛過去的路上砸到人 → 頭暈 1 秒
      continue;""", '飛行炸彈砸人')

# 人類：頭暈期間完全停手
rep("""function controlHuman(p, dt) {
  const T = Game.T;
  tickSkull(p, dt);
  let dirs = p.scheme.dirs();""",
"""function controlHuman(p, dt) {
  const T = Game.T;
  tickSkull(p, dt);
  // v1.9：頭暈中 —— 完全停手（不能走、不能放彈），時間到自動恢復
  if (p.dizzy > 0) { p.dizzy -= dt; p.moving = false; return; }
  let dirs = p.scheme.dirs();""", 'controlHuman 頭暈')

# AI：頭暈期間完全停手
rep("""function controlAI(p, dt) {
  const T = Game.T;
  const lv = aiLevelCfg();
  tickSkull(p, dt);
  p.moving = false;""",
"""function controlAI(p, dt) {
  const T = Game.T;
  const lv = aiLevelCfg();
  tickSkull(p, dt);
  // v1.9：頭暈中 —— AI 也一樣停手
  if (p.dizzy > 0) { p.dizzy -= dt; p.moving = false; return; }
  p.moving = false;""", 'controlAI 頭暈')

# 小怪：頭暈期間不動
rep("""function updateEnemy(e, dt) {
  if (e.boss) { updateBoss(e, dt); return; }
  if (e.hitT > 0) e.hitT -= dt;""",
"""function updateEnemy(e, dt) {
  if (e.boss) { updateBoss(e, dt); return; }
  if (e.dizzy > 0) { e.dizzy -= dt; return; }      // v1.9：被炸彈砸到 → 暈 1 秒不動
  if (e.hitT > 0) e.hitT -= dt;""", 'updateEnemy 頭暈')

# BOSS：頭暈期間不動（但血照扣）
rep("""  e.hitT -= dt;
  e.bombT -= dt;
  const p = Game.players[0];""",
"""  e.hitT -= dt;
  e.bombT -= dt;
  // v1.9：BOSS 被自己的同伴／玩家丟過來的炸彈砸到也會暈一下
  if (e.dizzy > 0) { e.dizzy -= dt; return; }
  const p = Game.players[0];""", 'updateBoss 頭暈')

# 玩家頭暈指標
rep("""  // 骷髏詛咒指示
  if (p.skull) {""",
"""  // v1.9：頭暈指示（轉星星 + 😵）
  if (p.dizzy > 0) drawDizzyMark(x, y - jumpY, T);
  // 骷髏詛咒指示
  if (p.skull) {""", 'drawPlayer 頭暈')

# 小怪 / BOSS 頭暈指標
rep("""    ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
    return;
  }
  // ---------- 10 種小怪的外型（有翅膀的飛、沒翅膀的走） ----------
  drawEnemyArt(e, x, y, flash, wob);
}""",
"""    ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
    if (e.dizzy > 0) drawDizzyMark(x, barY - Game.T * .46, T);   // v1.9：BOSS 也會暈
    return;
  }
  // ---------- 10 種小怪的外型（有翅膀的飛、沒翅膀的走） ----------
  drawEnemyArt(e, x, y, flash, wob);
  if (e.dizzy > 0) drawDizzyMark(x, y - e.r * 1.15, T);          // v1.9：頭暈
}""", 'drawEnemy 頭暈')

# ==================================================================
# 7) 自己的坐騎火焰不會燒到自己（只燒別人）
# ==================================================================
rep("""function addFlame(cx, cy, type, dir, owner) {
  Game.flames.push({ cx: cx, cy: cy, type: type, dir: dir, t: .46, owner: owner || null });
}""",
"""// v1.9：src 用來區分火是「炸彈炸的」還是「坐騎吐的」
//       自己的坐騎火焰（src==='dino'）不會傷到自己，只會燒到別人
function addFlame(cx, cy, type, dir, owner, src) {
  Game.flames.push({ cx: cx, cy: cy, type: type, dir: dir, t: .46, owner: owner || null, src: src || null });
}""", 'addFlame src')

rep("""      if (cellAt(x, y) === 2) { destroySoft(x, y); addFlame(x, y, 'end', dn, p); cells++; break; }
      const b = bombAt(x, y);
      if (b) { addFlame(x, y, 'end', dn, p); explodeBomb(b); cells++; break; }
      addFlame(x, y, i === DINO_FIRE_RANGE ? 'end' : 'mid', dn, p);""",
"""      if (cellAt(x, y) === 2) { destroySoft(x, y); addFlame(x, y, 'end', dn, p, 'dino'); cells++; break; }
      const b = bombAt(x, y);
      if (b) { addFlame(x, y, 'end', dn, p, 'dino'); explodeBomb(b); cells++; break; }
      addFlame(x, y, i === DINO_FIRE_RANGE ? 'end' : 'mid', dn, p, 'dino');""",
'fireBreath 火焰標記 dino')

rep("""      if (Game.flames[i].cx === cx && Game.flames[i].cy === cy) {
        const killer = Game.flames[i].owner;""",
"""      if (Game.flames[i] && Game.flames[i].cx === cx && Game.flames[i].cy === cy) {
        // v1.9：自己坐騎吐的火燒不到自己（走太快撞到自己的火不會受傷）
        if (Game.flames[i].src === 'dino' && Game.flames[i].owner === p) continue;
        const killer = Game.flames[i].owner;""", '玩家不受自己龍火傷害')

# AI 也要知道「自己的龍火」不會害到自己
rep("""function dangerAt(cx, cy) {
  for (let i = 0; i < Game.flames.length; i++) {
    if (Game.flames[i].cx === cx && Game.flames[i].cy === cy) return true;
  }""",
"""function dangerAt(cx, cy, me) {
  for (let i = 0; i < Game.flames.length; i++) {
    // v1.9：自己的坐騎火焰對自己無害，不必躲
    if (me && Game.flames[i].src === 'dino' && Game.flames[i].owner === me) continue;
    if (Game.flames[i].cx === cx && Game.flames[i].cy === cy) return true;
  }""", 'dangerAt 忽略自己龍火')

# ==================================================================
# 8) BOSS 火焰改成 3 格
# ==================================================================
rep("""  const power = rage ? 6 : 4;""",
"""  const power = BOSS_POWER;                       // v1.9：BOSS 火焰統一 3 格""", 'BOSS 火力來源')

rep("""function updateBoss(e, dt) {
  const T = Game.T;""",
"""const BOSS_POWER = 3;                             // v1.9：BOSS 火焰固定 3 格
function updateBoss(e, dt) {
  const T = Game.T;""", 'BOSS_POWER 常數')

# ==================================================================
# 匯出（測試用）
# ==================================================================
rep("""  VERSION: VERSION, tryMoveDiag: tryMoveDiag, tryMove: tryMove, playerSpeed: playerSpeed,""",
"""  VERSION: VERSION, tryMoveDiag: tryMoveDiag, tryMove: tryMove, playerSpeed: playerSpeed,
  // v1.9
  DIZZY_TIME: DIZZY_TIME, setDizzy: setDizzy, flyingDizzyCheck: flyingDizzyCheck,
  drawDizzyMark: drawDizzyMark, BOSS_POWER: BOSS_POWER, addFlame: addFlame, THEMES: THEMES,""",
'匯出 v1.9')

io.open(P, 'w', encoding='utf-8', newline='\n').write(s)
print('bytes', len(s.encode('utf-8')))
