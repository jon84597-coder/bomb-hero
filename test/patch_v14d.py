# -*- coding: utf-8 -*-
import io
p = 'index.html'
s = io.open(p, encoding='utf-8').read()

# ---------- 1. 開門音效 ----------
old = "      case 'door': tone(520, .12, 'square', .15); tone(660, .12, 'square', .15, null, .1); tone(880, .2, 'square', .16, null, .2); break;"
new = """      case 'door': tone(520, .12, 'square', .15); tone(660, .12, 'square', .15, null, .1); tone(880, .2, 'square', .16, null, .2); break;
      // 出口開啟（清場）：上行琶音 + 亮片叮咚 + 低頻推力，跟一般過場音明顯不同
      case 'doorOpen':
        tone(523, .10, 'square', .22);
        tone(659, .10, 'square', .22, null, .09);
        tone(784, .10, 'square', .22, null, .18);
        tone(1047, .16, 'square', .24, null, .27);
        tone(1319, .30, 'triangle', .18, null, .36);
        tone(1568, .45, 'sine', .15, 2093, .30);
        tone(2093, .35, 'sine', .10, 2637, .52);
        boom(.28, .26);
        break;"""
assert old in s
s = s.replace(old, new, 1)

# ---------- 2. 開門特效 ----------
anchor = "// 敵人清光後：門一定看得到、一定進得去（就算還壓在軟磚下面也強制露出來）"
assert anchor in s
fx = r"""// 清場開門：金色亮片爆發 + 星芒 + 畫面輕震 + 專屬音效
function doorOpenFx(d) {
  const T = Game.T;
  const cx = d.x * T + T / 2, cy = d.y * T + T / 2;
  Game.doorFxT = 1.8;
  Game.doorFxX = cx; Game.doorFxY = cy;
  Game.shake = Math.max(Game.shake || 0, .35);
  AudioSys.sfx('doorOpen');
  const cols = ['#ffd166', '#fff3c4', '#ffe9a8', '#ffb347'];
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * 6.283 + Math.random() * .35;
    const sp = 55 + Math.random() * 150;
    Game.particles.push({
      x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
      t: .75 + Math.random() * .75,
      color: cols[i % cols.length],
      r: 2 + Math.random() * 3, g: 150, damp: .955,
      spin: Math.random() * 6.28, vs: (Math.random() - .5) * 10, shape: 'rect'
    });
  }
  for (let i = 0; i < 10; i++) {
    const a = Math.random() * 6.283, sp = 20 + Math.random() * 60;
    Game.particles.push({
      x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20,
      t: 1.1 + Math.random(), color: '#fffbe8', r: 1.6 + Math.random() * 2.2, g: -10, damp: .99
    });
  }
  toast('✦ 出口出現了！走進傳送門前往下一關', 2.6);
  banner('出口開啟', .9);
}
"""
s = s.replace(anchor, fx + anchor, 1)

# ---------- 3. 清場時觸發（只在第一次開啟時） ----------
old = """    if (Game.enemies.length === 0 && p.alive) {
      openDoorForce();
      if (Game.door) Game.door.open = true;
    }"""
new = """    if (Game.enemies.length === 0 && p.alive) {
      openDoorForce();
      if (Game.door && !Game.door.open) {
        Game.door.open = true;
        doorOpenFx(Game.door);
      }
    }"""
assert old in s
s = s.replace(old, new, 1)

# ---------- 4. 門的繪製：開啟後發光、光柱、箭頭 ----------
old = """  if (Game.door && Game.door.revealed) {
    const px = Game.door.x * T, py = Game.door.y * T;
    ctx.fillStyle = Game.door.open ? '#ffd166' : '#5e6d94';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(px + 5, py + 3, T - 10, T - 5, [8, 8, 0, 0]) : ctx.rect(px + 5, py + 3, T - 10, T - 5);
    ctx.fill();
    ctx.fillStyle = Game.door.open ? '#7a5a10' : '#2a3550';
    ctx.fillRect(px + T / 2 - 3, py + T * .45, 6, T * .3);
    if (Game.door.open) {
      ctx.fillStyle = 'rgba(255,209,102,.25)';
      ctx.beginPath(); ctx.arc(px + T / 2, py + T / 2, T * .55 + Math.sin(Game.gameT * 5) * 3, 0, 6.283); ctx.fill();
    }
  }"""
new = """  if (Game.door && Game.door.revealed) {
    const px = Game.door.x * T, py = Game.door.y * T;
    const dcx = px + T / 2, dcy = py + T / 2;
    const open = Game.door.open;
    if (open) {
      // 光柱 + 旋轉光芒 + 呼吸光暈
      const pulse = .5 + .5 * Math.sin(Game.gameT * 4);
      const rg = ctx.createRadialGradient(dcx, dcy, T * .05, dcx, dcy, T * .95);
      rg.addColorStop(0, 'rgba(255,236,160,' + (.55 + pulse * .25).toFixed(2) + ')');
      rg.addColorStop(.45, 'rgba(255,209,102,' + (.28 + pulse * .12).toFixed(2) + ')');
      rg.addColorStop(1, 'rgba(255,209,102,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(px - T * .5, py - T * .5, T * 2, T * 2);
      ctx.save();
      ctx.translate(dcx, dcy);
      ctx.rotate(Game.gameT * 1.1);
      ctx.fillStyle = 'rgba(255,246,200,.30)';
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(T * .62, -T * .07);
        ctx.lineTo(T * .62, T * .07);
        ctx.closePath(); ctx.fill();
        ctx.rotate(Math.PI / 2);
      }
      ctx.restore();
    }
    // 門框（木拱門）
    ctx.fillStyle = open ? '#ffd166' : '#7c8aa5';
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(px + T * .13, py + T * .08, T * .74, T * .84, [T * .34, T * .34, T * .06, T * .06]); ctx.fill(); }
    else ctx.fillRect(px + T * .13, py + T * .08, T * .74, T * .84);
    ctx.fillStyle = open ? '#fff6d2' : '#3b4a66';
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(px + T * .21, py + T * .16, T * .58, T * .72, [T * .28, T * .28, T * .04, T * .04]); ctx.fill(); }
    else ctx.fillRect(px + T * .21, py + T * .16, T * .58, T * .72);
    // 門上的星紋
    ctx.fillStyle = open ? '#d99a1a' : '#22304a';
    ctx.beginPath(); ctx.arc(dcx, py + T * .52, T * .09, 0, 6.283); ctx.fill();
    ctx.fillStyle = open ? '#fff2b0' : '#0f1828';
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const an = -Math.PI / 2 + k * Math.PI / 5;
      const rr = k % 2 ? T * .045 : T * .105;
      const sx2 = dcx + Math.cos(an) * rr, sy2 = py + T * .52 + Math.sin(an) * rr;
      if (k === 0) ctx.moveTo(sx2, sy2); else ctx.lineTo(sx2, sy2);
    }
    ctx.closePath(); ctx.fill();
    if (open) {
      // 門口浮起的箭頭，提示「走進來」
      const ay = py - T * .18 + Math.sin(Game.gameT * 3) * T * .05;
      ctx.fillStyle = 'rgba(255,246,200,.92)';
      ctx.beginPath();
      ctx.moveTo(dcx, ay + T * .12); ctx.lineTo(dcx - T * .13, ay); ctx.lineTo(dcx + T * .13, ay);
      ctx.closePath(); ctx.fill();
    }
  }"""
assert old in s
s = s.replace(old, new, 1)

io.open(p, 'w', encoding='utf-8').write(s)
print('ok')
