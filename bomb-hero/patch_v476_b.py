# -*- coding: utf-8 -*-
# v4.76 B：隊友辨識（頭上標記＋血條＋HUD 隊友列）／提示只講自己／首頁按鈕
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


# ---------------- 1) 提示只講自己 ----------------
rep("      if (Game.mode === 'br') brTip('💔', '受到傷害 · 剩 ' + p.brHp + ' 點血', 'bad', 1.6);",
    """      // v4.76：別人的血量不回報 —— 只有「自己的」受傷才提示（別人淘汰才另外講）
      if (isMyPlayer(p)) brTip('💔', '受到傷害 · 剩 ' + p.brHp + ' 點血', 'bad', 1.6);""",
    'damage tip self only')

# 隊友被淘汰 → 講得清楚一點（辨識度）
rep("  if (p.ai) brTip('☠️', (p.name || 'AI') + ' 出局 · 剩 ' + Game.brAlive + ' 人', '', 1.5);",
    """  if (p.ai) {
    // v4.76：隊友出局要看得出來（自己人被淘汰比路人重要）
    const meT = (Game.players[0] || {}).team;
    const mate = (Game.brTeam | 0) >= 2 && p.team >= 0 && p.team === meT;
    brTip(mate ? '💚' : '☠️',
      (mate ? '隊友 ' : '') + (p.name || 'AI') + ' 出局 · 剩 ' + Game.brAlive + ' 人',
      mate ? 'bad' : '', mate ? 2.2 : 1.5);
  }""",
    'mate death tip')

# ---------------- 2) 隊友頭上標記（取代原本的綠點） ----------------
rep("""  // v4.75：大逃殺組隊 —— 隊友頭上一個綠點（隊友不會被你的炸彈燒到，但要認得出來）
  if ((Game.brTeam | 0) >= 2 && Game.state !== 'title') {
    const me0 = Game.players[0];
    for (let i = 1; i < Game.players.length; i++) {
      const q = Game.players[i];
      if (!q.alive || !me0 || me0.dead || q.team !== me0.team) continue;
      const hy = q.y - (q.r || T) * 1.5;
      ctx.fillStyle = 'rgba(120,255,190,.95)';
      ctx.beginPath(); ctx.arc(q.x, hy, Math.max(2.2, T * .075), 0, 6.283); ctx.fill();
      ctx.strokeStyle = 'rgba(6,20,14,.55)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(q.x, hy, Math.max(2.2, T * .075), 0, 6.283); ctx.stroke();
      ctx.lineWidth = 1;
    }
  }""",
    """  // v4.76：大逃殺組隊 —— 隊友整套辨識（腳下綠環＋頭上綠三角＋名字＋血條）
  if ((Game.brTeam | 0) >= 2 && Game.state !== 'title' && Game.players[0]) {
    const me0 = Game.players[0];
    for (let i = 1; i < Game.players.length; i++) {
      const q = Game.players[i];
      if (!q.alive || q.team !== me0.team) continue;
      drawMateTag(q, T);
    }
  }""",
    'mate tag draw')

# drawMateTag 本體（放在 drawMeBadge 之前）
rep("function drawMeBadge(x, y, R, T) {",
    """// v4.76：隊友標記 —— 自己人是「金色我牌」，隊友是「綠色三角＋名字＋血條＋腳下綠環」
//   只用綠色會跟草地撞色，所以三層一起上：腳下環（地面）、三角（頭頂）、血條（狀態）
function drawMateTag(q, T) {
  const r = q.r || T * .5;
  const hp = Math.max(0, q.brHp == null ? BR.HP : q.brHp | 0);
  const top = q.y - r * 1.62;
  const s = Math.max(3.4, T * .135);
  ctx.save();
  // 腳下綠環
  ctx.globalAlpha = .30 + .10 * Math.sin(Game.gameT * 4 + q.x * .05);
  ctx.strokeStyle = '#5ef0a8';
  ctx.lineWidth = Math.max(1.6, T * .055);
  ctx.beginPath(); ctx.ellipse(q.x, q.y + r * .5, r * .68, r * .28, 0, 0, 6.283); ctx.stroke();
  ctx.globalAlpha = 1;
  // 頭上倒三角（最遠也看得到的那個點）
  ctx.beginPath();
  ctx.moveTo(q.x - s, top - s * 1.2);
  ctx.lineTo(q.x + s, top - s * 1.2);
  ctx.lineTo(q.x, top + s * .3);
  ctx.closePath();
  ctx.fillStyle = '#5ef0a8'; ctx.fill();
  ctx.strokeStyle = 'rgba(5,26,17,.85)'; ctx.lineWidth = 1; ctx.stroke();
  // 血條（10 格切齊，跟左上角自己的血量條同一套語言）
  const bw = Math.max(15, T * .5), bh = Math.max(2.6, T * .07);
  const bx = q.x - bw / 2, by = top - s * 1.2 - bh - 3;
  ctx.fillStyle = 'rgba(4,14,10,.82)';
  ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
  ctx.fillStyle = hp <= 3 ? '#ff6b6b' : '#5ef0a8';
  ctx.fillRect(bx, by, Math.max(1, bw * (hp / BR.HP)), bh);
  // 名字（小小的，貼在血條上面）
  const nm = String(q.name || '');
  if (nm && T >= 26) {
    ctx.font = '700 ' + Math.max(8, Math.round(T * .26)) + 'px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.lineWidth = 2.4; ctx.strokeStyle = 'rgba(4,14,10,.9)';
    ctx.strokeText(nm, q.x, by - 2);
    ctx.fillStyle = '#c8ffdf';
    ctx.fillText(nm, q.x, by - 2);
    ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic'; ctx.lineWidth = 1;
  }
  ctx.restore();
}

function drawMeBadge(x, y, R, T) {""",
    'drawMateTag')

# ---------------- 3) HUD 下方：隊友名單＋血條 ----------------
rep("""    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(px2, y + 52, pw, 6, 2); ctx.fill(); }
    else ctx.fillRect(px2, y + 52, pw, 6);
  }
  ctx.restore();
}""",
    """    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(px2, y + 52, pw, 6, 2); ctx.fill(); }
    else ctx.fillRect(px2, y + 52, pw, 6);
  }
  // v4.76：組隊時在 HUD 下方列出隊友（名字＋血條）—— 誰快死了、誰已經出局一眼就知道
  if (teamOn && me && me.team >= 0) {
    const mates = [];
    for (let i = 1; i < Game.players.length; i++) {
      if (Game.players[i].team === me.team) mates.push(Game.players[i]);
    }
    if (mates.length) {
      const rh = 16, ry = y + h + 6, hh = mates.length * rh + 8;
      if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, ry, w, hh, 10); }
      else { ctx.beginPath(); ctx.rect(x, ry, w, hh); }
      ctx.fillStyle = 'rgba(8,14,24,.88)'; ctx.fill();
      ctx.strokeStyle = 'rgba(94,240,168,.42)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      for (let i = 0; i < mates.length; i++) {
        const q = mates[i], ty = ry + 4 + rh * i + rh / 2;
        ctx.font = '700 ' + fs + 'px sans-serif';
        ctx.fillStyle = q.alive ? 'rgba(200,255,222,.96)' : 'rgba(150,162,182,.65)';
        ctx.fillText(q.alive ? String(q.name || '') : (String(q.name || '') + ' ✕'), x + pad, ty);
        const hp2 = Math.max(0, q.brHp == null ? BR.HP : q.brHp | 0);
        const bx2 = x + pad + Math.round(w * .38), bw2 = w - pad * 2 - Math.round(w * .38);
        ctx.fillStyle = 'rgba(255,255,255,.13)';
        ctx.fillRect(bx2, ty - 3, bw2, 6);
        ctx.fillStyle = !q.alive ? 'rgba(120,130,150,.5)' : (hp2 <= 3 ? '#ff6b6b' : '#5ef0a8');
        ctx.fillRect(bx2, ty - 3, Math.max(2, bw2 * (q.alive ? hp2 / BR.HP : 0)), 6);
      }
      ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
    }
  }
  ctx.restore();
}""",
    'hud mates')

io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('done', len(s))
