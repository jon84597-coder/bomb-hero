# -*- coding: utf-8 -*-
"""
v3.8 補丁 A：炸彈／遙控彈／火焰外型精緻化

1. drawBomb  → 黑亮圓球（左上打光的立體漸層）＋金屬頂蓋＋彎曲引線＋跳動的點燃火花
              ＋濺散火星；快要爆炸時球體會透出紅光（保留原本的警示感）
2. 遙控彈    → 球體上加一塊會閃爍的青色 LED 面板（訊號條會跑）＋脈衝光環
3. drawFlame → 水滴形火焰（有尖端，不像三顆圓）＋底部暖光暈＋上升的小火星，
              BOSS 的紫色魔焰同步精緻化
"""
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = os.path.join(ROOT, 'index.html')

s = io.open(HTML, encoding='utf-8').read()
orig = s


def rep(old, new, tag):
    global s
    if s.count(old) != 1:
        sys.exit('[FAIL] 找不到唯一目標（%d 處）：%s' % (s.count(old), tag))
    s = s.replace(old, new, 1)
    print('  OK  ' + tag)


OLD_BOMB = """function drawBomb(b, T) {
  const x = b.px, y = b.py;
  if (b.mine) {
    ctx.fillStyle = '#39435c';
    ctx.beginPath(); ctx.arc(x, y + 6, T * .16, 0, 6.283); ctx.fill();
    const blink = Math.sin(Game.gameT * 8) > 0;
    if (blink) { ctx.fillStyle = '#ff5e6e'; ctx.beginPath(); ctx.arc(x, y + 6, 2.4, 0, 6.283); ctx.fill(); }
    return;
  }
  const r = T * .32;
  const scale = b.flying ? 1 + Math.sin(Math.min(1, b.flying.t / b.flying.dur) * Math.PI) * .12 : 1;
  // 影子（飛在空中時變小變淡）
  softShadow(x, y + r * .9, r * (b.flying ? .62 : .88), r * (b.flying ? .2 : .3), b.flying ? .2 : .32);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  const blinkRate = b.timer < .7 ? 12 : 5;
  const hot = !b.remoteArmed && Math.sin(Game.gameT * blinkRate + b.seed) > 0;
  ctx.fillStyle = hot ? '#ff6b5e' : '#232c42';
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.22)';
  ctx.beginPath(); ctx.arc(-r * .3, -r * .35, r * .3, 0, 6.283); ctx.fill();
  // 引信
  ctx.strokeStyle = '#8a6a3d';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.quadraticCurveTo(r * .4, -r - 7, r * .15, -r - 11);
  ctx.stroke();
  ctx.lineWidth = 1;
  if (!b.remoteArmed && !b.mine) {
    ctx.fillStyle = Math.sin(Game.gameT * 14 + b.seed) > -.3 ? '#ffd166' : '#ff8a3d';
    ctx.beginPath(); ctx.arc(r * .15, -r - 12, 2.6 + Math.random() * 1.4, 0, 6.283); ctx.fill();
  }
  if (b.remoteArmed) {
    ctx.fillStyle = '#5ee0ff';
    ctx.fillRect(-2.4, -r - 9, 4.8, 8);
    // 遙控彈脈衝圈提示
    ctx.strokeStyle = 'rgba(94,224,255,' + (.45 + .45 * Math.sin(Game.gameT * 6)) + ')';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r + 4, 0, 6.283); ctx.stroke();
    ctx.lineWidth = 1;
  }
  ctx.restore();
}"""

NEW_BOMB = """// v3.8：引線頂端的火花。armed=正在燃燒（亮橙火焰＋濺散火星）；
//        沒 armed（遙控彈還沒引爆）只畫一顆暗紅的餘燼，看得出「還沒點著」
function drawFuseSpark(x, y, r, seed, armed) {
  const t = Game.gameT;
  const flick = .74 + .26 * Math.sin(t * 26 + seed * 3.1);
  if (!armed) {
    ctx.fillStyle = 'rgba(120,60,30,.55)';
    ctx.beginPath(); ctx.arc(x, y, r * .8, 0, 6.283); ctx.fill();
    ctx.fillStyle = 'rgba(255,120,50,' + (.25 + .2 * Math.sin(t * 3 + seed)).toFixed(2) + ')';
    ctx.beginPath(); ctx.arc(x, y, r * .5, 0, 6.283); ctx.fill();
    return;
  }
  // 暖光暈
  const gl = ctx.createRadialGradient(x, y, 0, x, y, r * 3.6);
  gl.addColorStop(0, 'rgba(255,196,88,' + (.55 * flick).toFixed(3) + ')');
  gl.addColorStop(.42, 'rgba(255,132,40,' + (.24 * flick).toFixed(3) + ')');
  gl.addColorStop(1, 'rgba(255,90,30,0)');
  ctx.fillStyle = gl;
  ctx.beginPath(); ctx.arc(x, y, r * 3.6, 0, 6.283); ctx.fill();
  // 三層火苗（上尖下圓，比單純一顆圓更像真的在燒）
  ctx.fillStyle = 'rgba(255,98,26,' + (.90 * flick).toFixed(3) + ')';
  ctx.beginPath(); ctx.ellipse(x, y - r * .20, r * .80, r * 1.06, 0, 0, 6.283); ctx.fill();
  ctx.fillStyle = 'rgba(255,178,46,' + (.95 * flick).toFixed(3) + ')';
  ctx.beginPath(); ctx.ellipse(x, y, r * .54, r * .76, 0, 0, 6.283); ctx.fill();
  ctx.fillStyle = 'rgba(255,247,216,' + (.92 * flick).toFixed(3) + ')';
  ctx.beginPath(); ctx.ellipse(x, y + r * .07, r * .27, r * .40, 0, 0, 6.283); ctx.fill();
  // 濺散火星（往上飛、越飛越小越淡）
  for (let i = 0; i < 3; i++) {
    const ph = t * 4.4 + i * 2.1 + seed;
    const sp = .5 + .5 * Math.sin(ph);
    const mx = x + Math.cos(ph * 1.7) * r * (1.4 + sp * 1.5);
    const my = y - r * (.5 + sp * 2.5);
    const mr = Math.max(.7, r * .17 * (1 - sp * .5));
    ctx.fillStyle = 'rgba(255,' + Math.round(206 - sp * 96) + ',' + Math.round(96 - sp * 62) + ',' +
      (.85 * (1 - sp * .5) * flick).toFixed(3) + ')';
    ctx.beginPath(); ctx.arc(mx, my, mr, 0, 6.283); ctx.fill();
  }
}
// v3.8：遙控彈專屬的青色 LED 面板 ＋ 脈衝光環（取代原本單調的小方塊）
function drawRemoteChip(r) {
  const w = r * .56, h = r * .42, x = -w / 2, y = -h / 2 + r * .20;
  const bl = .55 + .45 * Math.sin(Game.gameT * 7);
  const rr = Math.max(1, h * .30);
  ctx.fillStyle = 'rgba(8,22,30,.88)';
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, rr); ctx.fill(); }
  else ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(94,224,255,' + (.55 + .35 * bl).toFixed(2) + ')';
  ctx.lineWidth = Math.max(1, r * .05);
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, rr); ctx.stroke(); }
  ctx.lineWidth = 1;
  // 面板裡跑動的訊號條
  ctx.fillStyle = 'rgba(130,242,255,' + (.45 + .5 * bl).toFixed(2) + ')';
  for (let i = 0; i < 3; i++) {
    const lv = (Game.gameT * 1.9 + i * .34) % 1;
    const bh = Math.max(1, h * (.18 + .52 * lv));
    ctx.fillRect(x + w * (.17 + i * .27), y + h - bh - h * .15, Math.max(1, w * .13), bh);
  }
  // 脈衝光環（會呼吸，遠遠就認得出這是遙控彈）
  ctx.strokeStyle = 'rgba(94,224,255,' + (.32 + .46 * bl).toFixed(2) + ')';
  ctx.lineWidth = Math.max(1.4, r * .08);
  ctx.beginPath();
  ctx.arc(0, 0, r + Math.max(2, r * .13) + bl * Math.max(1.5, r * .11), 0, 6.283);
  ctx.stroke();
  ctx.lineWidth = 1;
}
// v3.8：黑亮圓球炸彈本體（畫在 translate 之後的原點，半徑 r）
function drawBombArt(r, seed, hot, armed, remote) {
  // ---- 球體：左上打光的黑曜球 ----
  const g = ctx.createRadialGradient(-r * .40, -r * .44, r * .10, 0, 0, r * 1.18);
  g.addColorStop(0, '#6d7488');
  g.addColorStop(.22, '#3e4357');
  g.addColorStop(.62, '#1f2231');
  g.addColorStop(1, '#0a0b12');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.fill();
  // 快引爆 → 球體由內透出紅光（保留原本的警示感，但不再是整顆變色）
  if (hot) {
    const hg = ctx.createRadialGradient(0, r * .25, 0, 0, 0, r);
    hg.addColorStop(0, 'rgba(255,92,60,.58)');
    hg.addColorStop(1, 'rgba(255,60,40,0)');
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.fill();
  }
  // 底部環境反光（避免整顆死黑）
  ctx.fillStyle = 'rgba(150,172,224,.15)';
  ctx.beginPath(); ctx.ellipse(0, r * .60, r * .62, r * .22, 0, 0, 6.283); ctx.fill();
  // 主高光 ＋ 小副光（玻璃珠的圓潤感）
  ctx.fillStyle = 'rgba(255,255,255,.52)';
  ctx.beginPath(); ctx.ellipse(-r * .36, -r * .40, r * .26, r * .17, -.5, 0, 6.283); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.22)';
  ctx.beginPath(); ctx.ellipse(-r * .12, -r * .64, r * .12, r * .07, -.2, 0, 6.283); ctx.fill();
  // 外框（厚重感）
  ctx.strokeStyle = 'rgba(0,0,0,.52)';
  ctx.lineWidth = Math.max(1, r * .06);
  ctx.beginPath(); ctx.arc(0, 0, r * .97, 0, 6.283); ctx.stroke();
  ctx.lineWidth = 1;
  // ---- 頂部金屬蓋 ----
  const cw = r * .60, ch = r * .30, cy = -r * .86, cr = Math.max(1, ch * .34);
  const mg = ctx.createLinearGradient(-cw / 2, cy - ch / 2, cw / 2, cy + ch / 2);
  mg.addColorStop(0, '#c2cbdd'); mg.addColorStop(.45, '#7c869e'); mg.addColorStop(1, '#4a5266');
  ctx.fillStyle = mg;
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(-cw / 2, cy - ch / 2, cw, ch, cr); ctx.fill(); }
  else ctx.fillRect(-cw / 2, cy - ch / 2, cw, ch);
  ctx.strokeStyle = 'rgba(18,20,28,.55)';
  ctx.lineWidth = Math.max(1, r * .045);
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(-cw / 2, cy - ch / 2, cw, ch, cr); ctx.stroke(); }
  ctx.lineWidth = 1;
  ctx.fillStyle = 'rgba(255,255,255,.45)';
  ctx.fillRect(-cw * .36, cy - ch * .28, cw * .72, Math.max(1, ch * .15));
  // ---- 引線：從蓋子往上彎 ----
  const tipX = r * .34, tipY = -r * 1.50;
  ctx.strokeStyle = '#6a5232';
  ctx.lineWidth = Math.max(1.4, r * .13);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, cy - ch * .40);
  ctx.quadraticCurveTo(r * .18, -r * 1.06, tipX, tipY);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(168,134,84,.62)';       // 上緣細高光，做出麻繩的亮面
  ctx.lineWidth = Math.max(.8, r * .05);
  ctx.beginPath();
  ctx.moveTo(0, cy - ch * .40);
  ctx.quadraticCurveTo(r * .18, -r * 1.06, tipX, tipY);
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.lineWidth = 1;
  // ---- 遙控彈：LED 面板 ----
  if (remote) drawRemoteChip(r);
  // ---- 引線頂端：點燃的火花 / 未點燃的餘燼 ----
  drawFuseSpark(tipX, tipY, Math.max(1.6, r * .22), seed, armed);
}
function drawBomb(b, T) {
  const x = b.px, y = b.py;
  if (b.mine) {
    ctx.fillStyle = '#39435c';
    ctx.beginPath(); ctx.arc(x, y + 6, T * .16, 0, 6.283); ctx.fill();
    const blink = Math.sin(Game.gameT * 8) > 0;
    if (blink) { ctx.fillStyle = '#ff5e6e'; ctx.beginPath(); ctx.arc(x, y + 6, 2.4, 0, 6.283); ctx.fill(); }
    return;
  }
  const r = T * .32;
  const scale = b.flying ? 1 + Math.sin(Math.min(1, b.flying.t / b.flying.dur) * Math.PI) * .12 : 1;
  // 影子（飛在空中時變小變淡）
  softShadow(x, y + r * .9, r * (b.flying ? .62 : .88), r * (b.flying ? .2 : .3), b.flying ? .2 : .32);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  const blinkRate = b.timer < .7 ? 12 : 5;
  // v3.8：只有「正在倒數燃燒」的炸彈會閃紅光；遙控彈（等著按 E）不會
  const armed = !b.remoteArmed && !b.mine;
  const hot = armed && Math.sin(Game.gameT * blinkRate + b.seed) > 0;
  drawBombArt(r, b.seed, hot, armed, !!b.remoteArmed);
  ctx.restore();
}"""

OLD_FLAME = """function drawFlame(f, T) {
  const x = f.cx * T + T / 2, y = f.cy * T + T / 2;
  const k = clamp(f.t / .46, 0, 1);
  const flick = 1 + Math.sin(Game.gameT * 34 + f.cx * 3 + f.cy * 7) * .07;
  const s = T * .5 * (0.6 + 0.4 * Math.sin(k * Math.PI)) * flick;
  const d = f.dir ? DIRS[f.dir] : null;
  // BOSS 自己放的炸彈 → 紫色魔焰（owner 為 null 就是 BOSS）
  const bossFire = f.owner == null;
  function blob(r, dx, dy, color) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, 6.283); ctx.fill();
    if (d) { ctx.beginPath(); ctx.arc(x + dx + d.x * s * .55, y + dy + d.y * s * .55, r * .82, 0, 6.283); ctx.fill(); }
  }
  if (bossFire) {
    blob(s * 1.06, 0, 0, 'rgba(118,24,190,' + (.42 * k + .10) + ')');          // 紫色魔光暈
    blob(s * .92, 0, 0, 'rgba(158,48,236,' + (.92 * k + .08) + ')');           // 紫外焰
    blob(s * .60, 0, -s * .06, 'rgba(206,118,255,' + (.95 * k + .05) + ')');   // 亮紫中焰
    blob(s * .30, 0, -s * .10, 'rgba(246,224,255,' + (.9 * k + .1) + ')');     // 白心
  } else {
    blob(s * .92, 0, 0, 'rgba(255,80,30,' + (.92 * k + .08) + ')');            // 外焰
    blob(s * .62, 0, -s * .06, 'rgba(255,170,40,' + (.95 * k + .05) + ')');    // 中焰
    blob(s * .30, 0, -s * .10, 'rgba(255,250,210,' + (.9 * k + .1) + ')');     // 白心
  }
}"""

NEW_FLAME = """// v3.8：水滴形火焰（下面圓、上面尖，比三顆圓更像真的火）
function flameDrop(cx, cy, w, h, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - h);
  ctx.bezierCurveTo(cx + w, cy - h * .34, cx + w, cy + h * .46, cx, cy + h * .64);
  ctx.bezierCurveTo(cx - w, cy + h * .46, cx - w, cy - h * .34, cx, cy - h);
  ctx.closePath();
  ctx.fill();
}
function drawFlame(f, T) {
  const x = f.cx * T + T / 2, y = f.cy * T + T / 2;
  const k = clamp(f.t / .46, 0, 1);
  const flick = 1 + Math.sin(Game.gameT * 34 + f.cx * 3 + f.cy * 7) * .07;
  const s = T * .5 * (0.6 + 0.4 * Math.sin(k * Math.PI)) * flick;
  const d = f.dir ? DIRS[f.dir] : null;
  // BOSS 自己放的炸彈 → 紫色魔焰（owner 為 null 就是 BOSS）
  const bossFire = f.owner == null;
  // 火焰中心（往上偏移一點，火是往上燒的）
  const ox = d ? d.x * s * .22 : 0;
  const oy = d ? d.y * s * .22 : 0;
  const cx = x + ox, cy = y + oy - s * .10;
  const hw = s * .50, hh = s * .92;
  // --- 底部暖光暈 ---
  const gg = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 1.05);
  if (bossFire) {
    gg.addColorStop(0, 'rgba(150,50,230,' + (.46 * k + .06).toFixed(3) + ')');
    gg.addColorStop(1, 'rgba(120,24,190,0)');
  } else {
    gg.addColorStop(0, 'rgba(255,126,40,' + (.48 * k + .06).toFixed(3) + ')');
    gg.addColorStop(1, 'rgba(255,60,20,0)');
  }
  ctx.fillStyle = gg;
  ctx.beginPath(); ctx.arc(cx, cy, s * 1.05, 0, 6.283); ctx.fill();
  // --- 四層火苗 ---
  if (bossFire) {
    flameDrop(cx, cy + s * .04, hw, hh, 'rgba(158,48,236,' + (.9 * k + .08).toFixed(3) + ')');
    flameDrop(cx, cy + s * .10, hw * .70, hh * .74, 'rgba(196,104,255,' + (.93 * k + .06).toFixed(3) + ')');
    flameDrop(cx, cy + s * .16, hw * .40, hh * .46, 'rgba(232,190,255,' + (.92 * k + .08).toFixed(3) + ')');
    flameDrop(cx, cy + s * .20, hw * .19, hh * .24, 'rgba(252,244,255,' + (.88 * k + .12).toFixed(3) + ')');
  } else {
    flameDrop(cx, cy + s * .04, hw, hh, 'rgba(255,88,24,' + (.9 * k + .08).toFixed(3) + ')');
    flameDrop(cx, cy + s * .10, hw * .70, hh * .74, 'rgba(255,166,38,' + (.93 * k + .06).toFixed(3) + ')');
    flameDrop(cx, cy + s * .16, hw * .40, hh * .46, 'rgba(255,236,168,' + (.92 * k + .08).toFixed(3) + ')');
    flameDrop(cx, cy + s * .20, hw * .19, hh * .24, 'rgba(255,255,248,' + (.88 * k + .12).toFixed(3) + ')');
  }
  // --- 往 d 方向多補一段拖尾（爆炸往外噴的感覺）---
  if (d) {
    const tx = cx + d.x * s * .52, ty = cy + d.y * s * .52;
    flameDrop(tx, ty, hw * .62, hh * .60, bossFire
      ? 'rgba(180,80,250,' + (.62 * k).toFixed(3) + ')'
      : 'rgba(255,120,30,' + (.62 * k).toFixed(3) + ')');
  }
  // --- 上升的小火星 ---
  const pc = bossFire ? [236, 176, 255] : [255, 206, 120];
  for (let i = 0; i < 4; i++) {
    const ph = Game.gameT * 3.1 + i * 1.7 + f.cx * .7 + f.cy * 1.3;
    const up = ph % 1;
    const mx = cx + Math.sin(ph * 2.3) * s * .30;
    const my = cy - s * (.35 + up * 1.25);
    const mr = Math.max(.8, s * .085 * (1 - up * .55));
    ctx.fillStyle = 'rgba(' + pc[0] + ',' + Math.round(pc[1] - up * 70) + ',' +
      Math.round(pc[2] - up * 70) + ',' + (.85 * (1 - up) * k).toFixed(3) + ')';
    ctx.beginPath(); ctx.arc(mx, my, mr, 0, 6.283); ctx.fill();
  }
}"""

rep(OLD_BOMB, NEW_BOMB, 'drawBomb → drawBombArt＋drawFuseSpark＋drawRemoteChip')
rep(OLD_FLAME, NEW_FLAME, 'drawFlame → 水滴形火焰＋火星')

if s != orig:
    io.open(HTML, 'w', encoding='utf-8').write(s)
    print('[OK] index.html 已更新')
else:
    print('[SKIP] 沒有變動')
