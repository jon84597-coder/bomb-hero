# -*- coding: utf-8 -*-
"""v1.7-c：被炸到大哭臉 / 炸到人大笑臉 / 最終獲勝一直跳起來"""
import io
P = 'index.html'
s = io.open(P, encoding='utf-8').read()
n = 0


def rep(old, new, tag):
    global s, n
    assert old in s, 'MISS: ' + tag
    assert s.count(old) == 1, 'DUP(%d): %s' % (s.count(old), tag)
    s = s.replace(old, new)
    n += 1
    print('OK', tag)


# ---------- 1) 玩家資料：新增哭／歡呼計時 ----------
rep("""    score: 0, respawnT: 0, slide: null, warpCool: 0, gloat: 0, warpLock: '', beltMul: 1,""",
    """    score: 0, respawnT: 0, slide: null, warpCool: 0, gloat: 0, warpLock: '', beltMul: 1,
    cry: 0, cheerT: 0,                     // v1.7：被炸到大哭 / 贏了開心跳""",
    'player cry + cheerT')

# ---------- 2) 被炸到 → 大哭 ----------
rep("""  p.alive = false; p.dead = true;
  p.lives -= 1;
  p.respawnT = 1.6;
  AudioSys.sfx('die');""",
    """  p.alive = false; p.dead = true;
  p.lives -= 1;
  p.respawnT = 1.6;
  p.cry = 2.8;                    // v1.7：被炸到要亮相大哭臉
  AudioSys.sfx('die');""",
    'solo death cry')

rep("""  p.alive = false; p.dead = true; p.respawnT = 1;
  AudioSys.sfx('die');""",
    """  p.alive = false; p.dead = true; p.respawnT = 1;
  p.cry = 2.8;                    // v1.7：被炸到要亮相大哭臉
  AudioSys.sfx('die');""",
    'battle death cry')

# ---------- 3) 計時遞減 ----------
rep("""    if (p.gloat > 0) p.gloat -= dt;""",
    """    if (p.gloat > 0) p.gloat -= dt;
    if (p.cry > 0) p.cry = Math.max(0, p.cry - dt);        // v1.7 大哭
    if (p.cheerT > 0) p.cheerT = Math.max(0, p.cheerT - dt); // v1.7 獲勝歡呼""",
    'decrement cry/cheer')

# ---------- 4) 死亡（大哭中）也要畫出來 ----------
rep("""  Game.players.forEach(function (p) { if (p.alive) drawPlayer(p, T); });""",
    """  // v1.7：大哭中的人即使已經倒下也要畫出來（才看得到哭臉）
  Game.players.forEach(function (p) { if (p.alive || p.cry > 0) drawPlayer(p, T); });""",
    'draw crying dead player')

# ---------- 5) 共用表情：大哭 / 大笑 ----------
rep("""function drawRigChar(g, key, x, footY, H, a) {""",
    """// v1.7：表情疊在頭部圖上面——大哭（被炸到）／大笑（炸到人、獲勝）
// hx,hy,hw,hh = 頭部框；base 有給就先把原本的眼睛嘴巴蓋掉再畫
function drawFaceExpr(g, expr, hx, hy, hw, hh, t, base) {
  if (!expr || !g) return;
  const cx = hx + hw * .5;
  const eOff = hw * .17, ey = hy + hh * .44, er = hw * .085;
  const LX = cx - eOff, RX = cx + eOff;
  g.save();
  g.lineCap = 'round'; g.lineJoin = 'round';
  if (base) {   // 蓋掉原本的眼睛與嘴巴，表情才會乾淨
    g.fillStyle = base;
    g.beginPath(); g.ellipse(cx, hy + hh * .45, hw * .42, hh * .21, 0, 0, 6.283); g.fill();
    g.beginPath(); g.ellipse(cx, hy + hh * .70, hw * .27, hh * .17, 0, 0, 6.283); g.fill();
  }
  if (expr === 'cry') {
    // 八字愁眉（眉頭高、眉尾垂）
    g.strokeStyle = '#1b2430';
    g.lineWidth = Math.max(1.5, hw * .045);
    g.beginPath();
    g.moveTo(LX - er * 1.5, ey - er * 1.0); g.lineTo(LX + er * 1.3, ey - er * 2.1);
    g.moveTo(RX + er * 1.5, ey - er * 1.0); g.lineTo(RX - er * 1.3, ey - er * 2.1);
    g.stroke();
    // 眼睛緊閉成 > <
    g.lineWidth = Math.max(1.7, hw * .05);
    g.beginPath();
    g.moveTo(LX - er, ey - er * .9); g.lineTo(LX + er * .95, ey);
    g.moveTo(LX - er, ey + er * .9); g.lineTo(LX + er * .95, ey);
    g.moveTo(RX + er, ey - er * .9); g.lineTo(RX - er * .95, ey);
    g.moveTo(RX + er, ey + er * .9); g.lineTo(RX - er * .95, ey);
    g.stroke();
    // 兩行眼淚（會抖）＋掉落的水珠
    const wob = Math.sin(t * 7) * .5 + .5;
    [[LX, 1], [RX, -1]].forEach(function (q) {
      const tx = q[0], dir = q[1];
      const drop = (t * 1.5 + (dir > 0 ? 0 : .5)) % 1;
      const top = ey + er * 1.15;
      const len = hh * (.15 + .10 * wob);
      g.fillStyle = 'rgba(120,190,255,.70)';
      g.beginPath();
      g.moveTo(tx - er * .55, top);
      g.quadraticCurveTo(tx - er * .8, top + len * .75, tx, top + len);
      g.quadraticCurveTo(tx + er * .8, top + len * .75, tx + er * .55, top);
      g.closePath(); g.fill();
      g.fillStyle = 'rgba(155,215,255,.92)';
      g.beginPath();
      g.ellipse(tx + dir * er * .25, top + len + drop * hh * .34, er * .40, er * .58, 0, 0, 6.283);
      g.fill();
    });
    // 哇—大哭的大嘴
    const mw = hw * .19, mh = hh * .15, my = hy + hh * .70;
    g.fillStyle = '#6d2130';
    g.beginPath(); g.ellipse(cx, my, mw, mh, 0, 0, 6.283); g.fill();
    g.fillStyle = '#ff8fa3';
    g.beginPath(); g.ellipse(cx, my + mh * .55, mw * .60, mh * .40, 0, 0, 6.283); g.fill();
  } else if (expr === 'laugh' || expr === 'gloat') {
    // 開心上揚的眉毛
    g.strokeStyle = '#1b2430';
    g.lineWidth = Math.max(1.5, hw * .042);
    g.beginPath();
    g.moveTo(LX - er * 1.5, ey - er * 1.45); g.lineTo(LX + er * 1.3, ey - er * 2.2);
    g.moveTo(RX + er * 1.5, ey - er * 1.45); g.lineTo(RX - er * 1.3, ey - er * 2.2);
    g.stroke();
    // 瞇眼笑 ^ ^
    g.lineWidth = Math.max(1.9, hw * .055);
    g.beginPath(); g.arc(LX, ey + er * .3, er * 1.15, Math.PI * 1.16, Math.PI * 1.84); g.stroke();
    g.beginPath(); g.arc(RX, ey + er * .3, er * 1.15, Math.PI * 1.16, Math.PI * 1.84); g.stroke();
    // 大笑張開的嘴（D 形）＋舌頭
    const mw = hw * .22, mh = hh * .17, my = hy + hh * .66;
    g.fillStyle = '#7c2f3e';
    g.beginPath();
    g.moveTo(cx - mw, my - mh * .35);
    g.quadraticCurveTo(cx, my - mh * .05, cx + mw, my - mh * .35);
    g.quadraticCurveTo(cx + mw * .82, my + mh * 1.18, cx, my + mh * 1.18);
    g.quadraticCurveTo(cx - mw * .82, my + mh * 1.18, cx - mw, my - mh * .35);
    g.closePath(); g.fill();
    g.fillStyle = '#ff8fa3';
    g.beginPath(); g.ellipse(cx, my + mh * .80, mw * .48, mh * .34, 0, 0, 6.283); g.fill();
    // 笑紋
    g.strokeStyle = 'rgba(27,36,48,.5)';
    g.lineWidth = Math.max(1, hw * .022);
    g.beginPath();
    g.moveTo(cx - mw * 1.3, my - mh * .5); g.lineTo(cx - mw * 1.05, my + mh * .4);
    g.moveTo(cx + mw * 1.3, my - mh * .5); g.lineTo(cx + mw * 1.05, my + mh * .4);
    g.stroke();
  }
  g.restore();
}

function drawRigChar(g, key, x, footY, H, a) {""",
    'drawFaceExpr helper')

# ---------- 6) 部位骨架：頭畫完後疊上表情 ----------
rep("""  // 頭：點一下 + 微微左右擺（最後畫，順便蓋住脖子接縫）
  const headBob = moving ? Math.abs(Math.sin(w)) * H * .014 * amp : Math.sin((a.idle || 0) * 1.7) * H * .008;
  put('head', step * .05 * amp + (a.headTilt || 0), 0, -headBob);

  try { g.filter = 'none'; } catch (e) {}""",
    """  // 頭：點一下 + 微微左右擺（最後畫，順便蓋住脖子接縫）
  const headBob = moving ? Math.abs(Math.sin(w)) * H * .014 * amp : Math.sin((a.idle || 0) * 1.7) * H * .008;
  put('head', step * .05 * amp + (a.headTilt || 0), 0, -headBob);
  // v1.7：大哭 / 大笑的表情疊在頭部圖上面
  if (a.expr === 'cry' || a.expr === 'laugh' || a.expr === 'gloat') {
    const hd = M.p.head;
    if (hd) drawFaceExpr(g, a.expr, ox + hd.x * W, oy + hd.y * H, hd.w * W, hd.h * H, a.idle || 0, a.skin);
  }

  try { g.filter = 'none'; } catch (e) {}""",
    'rig face overlay')

# ---------- 7) 程式繪圖版角色：哭臉 + 大笑臉 ----------
rep("""  // 奸笑表情（炸死人後 2 秒）：瞇眼＞＜＋張口嘿嘿笑
  if (a.expr === 'gloat') {
    g.strokeStyle = '#1b2430';
    g.lineWidth = 2.6; g.lineCap = 'round';
    // 瞇瞇眼（∩∩ 上彎）
    g.beginPath(); g.arc(x - R * .3 + ex, topY + R * .04 + ey, R * .17, Math.PI * 1.12, Math.PI * 1.88); g.stroke();
    g.beginPath(); g.arc(x + R * .3 + ex, topY + R * .04 + ey, R * .17, Math.PI * 1.12, Math.PI * 1.88); g.stroke();
    // 斜斜的賊眉
    g.beginPath(); g.moveTo(x - R * .44 + ex, topY - R * .3 + ey); g.lineTo(x - R * .16 + ex, topY - R * .22 + ey); g.stroke();
    g.beginPath(); g.moveTo(x + R * .44 + ex, topY - R * .3 + ey); g.lineTo(x + R * .16 + ex, topY - R * .22 + ey); g.stroke();
    // 張大嘴嘿嘿笑（半圓開口＋舌頭）
    g.fillStyle = '#7c2f3e';
    g.beginPath(); g.arc(x + ex, topY + R * .34 + ey, R * .3, 0, Math.PI); g.closePath(); g.fill();
    g.fillStyle = '#ff8fa3';
    g.beginPath(); g.ellipse(x + ex, topY + R * .58 + ey, R * .14, R * .07, 0, 0, 6.283); g.fill();
    g.lineWidth = 1; g.lineCap = 'butt';
  }
  return { topY: topY, ex: ex, ey: ey };""",
    """  // v1.7：大哭（被炸到）／大笑（炸到人、獲勝）都用同一組表情
  if (a.expr === 'cry' || a.expr === 'laugh' || a.expr === 'gloat') {
    drawFaceExpr(g, a.expr, x - R, topY - R, R * 2, R * 2, a.idle || 0, c.color);
  }
  return { topY: topY, ex: ex, ey: ey };""",
    'charBody face')

# ---------- 8) drawPlayer：表情優先序 + 獲勝跳躍 + 大哭半透明 ----------
rep("""  const x = p.x - (p.dino ? rideSide * T * .22 : 0);
  const y = p.y - (p.carry ? T * .2 : 0) - (p.dino ? T * .44 : 0);""",
    """  const x = p.x - (p.dino ? rideSide * T * .22 : 0);
  const y = p.y - (p.carry ? T * .2 : 0) - (p.dino ? T * .44 : 0);
  // v1.7：獲勝（或歡呼中）會開心地一直跳
  const jumpY = p.cheerT > 0 ? Math.abs(Math.sin(Game.gameT * 9)) * T * .30 : 0;""",
    'jumpY')

rep("""  const bob = p.moving ? Math.abs(Math.sin(p.walkT * 15)) * 1.6 : 0;
  // 影子（跳得越高 → 越小越淡，有立體感）
  softShadow(x, y + T * .37, Math.max(4, R * .80 - bob * .9), Math.max(2, R * .24 - bob * .18), .34 - bob * .05);""",
    """  const bob = p.moving ? Math.abs(Math.sin(p.walkT * 15)) * 1.6 : 0;
  const bob2 = bob + jumpY * .9;
  // 影子（跳得越高 → 越小越淡，有立體感）
  softShadow(x, y + T * .37, Math.max(4, R * .80 - bob2 * .9), Math.max(2, R * .24 - bob2 * .18), .34 - bob2 * .05);""",
    'shadow with jump')

rep("""  const charArgs = {
    walk: p.walkT * 15, moving: p.moving, facing: p.facing,
    bob: bob, blink: false, expr: p.gloat > 0 ? 'gloat' : (p.hurtFlash > 0 ? 'hurt' : ''),
    idle: Game.gameT
  };
  const bd = drawSpriteChar(ctx, c, x, y, R, charArgs) || drawCharBody(ctx, c, x, y, R, charArgs);""",
    """  const charArgs = {
    walk: p.walkT * 15, moving: p.moving, facing: p.facing,
    bob: bob + jumpY * .9, blink: false,
    // v1.7：大哭（被炸到）＞ 大笑（炸到人／獲勝）＞ 一般
    expr: p.cry > 0 ? 'cry' : ((p.gloat > 0 || p.cheerT > 0) ? 'laugh' : ''),
    idle: Game.gameT, skin: c.color, jump: jumpY
  };
  const crying = !p.alive && p.cry > 0;
  if (crying) ctx.globalAlpha = Math.min(1, p.cry / .5);   // 最後 0.5 秒淡出
  const bd = drawSpriteChar(ctx, c, x, y - jumpY, R, charArgs) || drawCharBody(ctx, c, x, y - jumpY, R, charArgs);
  if (crying) ctx.globalAlpha = 1;""",
    'player expr + cry alpha')

# ---------- 9) 凶手笑聲改成開心大笑 ----------
rep("""      case 'gloat': // 凶手奸笑「嘻−嘻−嘻嘻」（接在死亡叫聲後面）
        tone(920, .09, 'square', .26, null, .9);
        tone(740, .09, 'square', .26, null, 1.06);
        tone(920, .09, 'square', .26, null, 1.22);
        tone(600, .18, 'square', .26, 300, 1.38);
        break;""",
    """      case 'gloat': // v1.7：凶手開心大笑「哈−哈−哈哈哈」（接在死亡叫聲後面）
        tone(700, .10, 'square', .28, null, .90);
        tone(620, .10, 'square', .28, null, 1.04);
        tone(700, .10, 'square', .28, null, 1.18);
        tone(520, .26, 'square', .28, 300, 1.34);
        tone(392, .30, 'triangle', .16, 260, 1.36);
        break;""",
    'laugh sfx')

# ---------- 10) 對戰回合贏家：現場開心跳 ----------
rep("""      if (winner) { winner.wins += 1; winner.score += 500; }""",
    """      if (winner) { winner.wins += 1; winner.score += 500; winner.cheerT = 1.8; }""",
    'round winner cheer')

# ---------- 11) 結束畫面：贏家在畫面上一直跳 ----------
rep("""function hideOverlay() { Game.ovInfo = null; $id('ovIn').classList.add('hide'); }
function showEnd(title, sub, good) {
  Game.endShown = true;          // 標記「結束畫面已顯示」，重開時歸零
  const box = $id('ovBox');
  box.innerHTML = '<h3></h3><p></p><div class="row" style="justify-content:center;gap:10px;">' +
    '<button class="mbtn warm" id="btnAgain" style="width:auto;padding:11px 26px;">再來一場</button>' +
    '<button class="ghostbtn" id="btnHome">回主選單</button></div>';
  box.querySelector('h3').textContent = title;
  box.querySelector('p').textContent = sub;""",
    """function hideOverlay() { Game.ovInfo = null; stopWinJump(); $id('ovIn').classList.add('hide'); }

// v1.7：最終獲勝 → 贏家在結束畫面上開心地一直跳（彩帶 + ♪ + 大笑臉）
let winJumpRaf = 0;
function stopWinJump() {
  if (winJumpRaf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(winJumpRaf);
  winJumpRaf = 0;
}
function startWinJump(chIdx) {
  stopWinJump();
  const cv = $id('winJumpCv');
  if (!cv) return;
  const g = cv.getContext ? cv.getContext('2d') : null;
  if (chIdx == null || chIdx < 0 || !g) { cv.style.display = 'none'; return; }
  cv.style.display = 'block';
  const ch = CHARACTERS[chIdx % CHARACTERS.length];
  const W = cv.width || 170, H = cv.height || 168;
  const t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  const COLORS = ['#ffd166', '#7fd06a', '#ff8fa3', '#8ad4ff', '#c8a8ff'];
  function frame(now) {
    const t = (((now == null ? Date.now() : now) - t0) / 1000);
    g.clearRect(0, 0, W, H);
    // 繽紛紙屑
    for (let i = 0; i < 14; i++) {
      const px = (i * 37 % W) + Math.sin(t * 1.7 + i) * 8;
      const py = ((t * 46 + i * 29) % (H + 30)) - 15;
      g.fillStyle = COLORS[i % COLORS.length];
      g.save(); g.translate(px, py); g.rotate(t * 3 + i);
      g.fillRect(-3, -5, 6, 10); g.restore();
    }
    const R = 36;
    const jump = Math.abs(Math.sin(t * 3.6)) * 30;
    const footY = H - 22 - jump;
    // 影子（跳越高越小）
    const sc = 1 - jump / 90;
    g.fillStyle = 'rgba(0,0,0,.22)';
    g.beginPath(); g.ellipse(W / 2, H - 20, R * .70 * sc, R * .20 * sc, 0, 0, 6.283); g.fill();
    const args = { walk: t * 13, moving: true, facing: 'down', bob: jump, blink: false,
      expr: 'laugh', idle: t, jump: jump, amp: 1.1, skin: ch.color };
    drawSpriteChar(g, ch, W / 2, footY - R * .82, R, args) ||
      drawCharBody(g, ch, W / 2, footY - R * .82, R, args);
    // 頭上冒音符
    g.fillStyle = '#2b2036';
    g.font = '700 15px sans-serif';
    g.textAlign = 'center';
    for (let k = 0; k < 2; k++) {
      const ph = (t * 1.4 + k * .5) % 1;
      g.globalAlpha = Math.max(0, 1 - ph);
      g.fillText(k ? '♫' : '♪', W / 2 + (k ? -28 : 26), footY - R * 2.6 - ph * 22);
    }
    g.globalAlpha = 1;
    g.textAlign = 'start';
    winJumpRaf = (typeof requestAnimationFrame === 'function') ? requestAnimationFrame(frame) : 0;
  }
  winJumpRaf = (typeof requestAnimationFrame === 'function') ? requestAnimationFrame(frame) : 0;
}

function showEnd(title, sub, good, chIdx) {
  Game.endShown = true;          // 標記「結束畫面已顯示」，重開時歸零
  const box = $id('ovBox');
  box.innerHTML = '<h3></h3><p></p>' +
    '<canvas id="winJumpCv" width="170" height="168" style="display:none;margin:2px auto 4px;max-width:100%"></canvas>' +
    '<div class="row" style="justify-content:center;gap:10px;">' +
    '<button class="mbtn warm" id="btnAgain" style="width:auto;padding:11px 26px;">再來一場</button>' +
    '<button class="ghostbtn" id="btnHome">回主選單</button></div>';
  box.querySelector('h3').textContent = title;
  box.querySelector('p').textContent = sub;
  startWinJump(good ? chIdx : null);""",
    'showEnd win jump')

# ---------- 12) 兩個「獲勝」呼叫點把角色 index 傳進去 ----------
rep("""              '\\n難易度：' + soloDiffCfg().label, true);""",
    """              '\\n難易度：' + soloDiffCfg().label, true, p.chIdx);""",
    'solo clear chIdx')

rep("""      Game.players.map(function (p) { return pname(p) + ' ' + p.wins; }).join(' ／ '), true);""",
    """      Game.players.map(function (p) { return pname(p) + ' ' + p.wins; }).join(' ／ '), true, winner.chIdx);""",
    'battle champion chIdx')

# ---------- 13) 導出給測試用 ----------
rep("""  stageBGM: stageBGM, themeBGM: themeBGM, drawFlame: drawFlame,""",
    """  stageBGM: stageBGM, themeBGM: themeBGM, drawFlame: drawFlame,
  drawFaceExpr: drawFaceExpr, startWinJump: startWinJump, stopWinJump: stopWinJump,""",
    'export v1.7 helpers')

io.open(P, 'w', encoding='utf-8', newline='\n').write(s)
print('patched', n, 'bytes', len(s.encode('utf-8')))
