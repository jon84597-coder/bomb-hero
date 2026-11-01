# -*- coding: utf-8 -*-
# v4.11 第四輪：把爆炸火焰改成「參考圖那種」——翻滾的白熱火雲柱（沿著十字臂連成一條）
#   參考圖（超級炸彈人風格）的重點：
#     · 每一格火焰是一團「翻滾的濃煙火團」，不是一顆小圓球
#     · 顏色是「白熱／米白核心 → 奶油黃 → 橘 → 橘紅邊」，核心幾乎是白色
#     · 火焰沿著十字臂「連成一條粗管子」（中段/end 段會往臂的方向伸長）
#     · 外緣有暗紅色的「焦邊」，整體看起來是大量體積的煙火，不是燭火
import io

PATH = 'index.html'
src = io.open(PATH, encoding='utf-8', newline='').read()
text = src.replace('\r\n', '\n')

old = """function drawFlame(f, T) {
  const x = f.cx * T + T / 2, y = f.cy * T + T / 2;
  const k = clamp(f.t / .46, 0, 1);
  const flick = 1 + Math.sin(Game.gameT * 34 + f.cx * 3 + f.cy * 7) * .07;
  const s = T * .56 * (0.62 + 0.46 * Math.sin(k * Math.PI)) * flick;
  const d = f.dir ? DIRS[f.dir] : null;
  // BOSS 自己放的炸彈 → 紫色魔焰（owner 為 null 就是 BOSS）
  const bossFire = f.owner == null;
  // 火焰中心（往上偏移一點，火是往上燒的）
  const ox = d ? d.x * s * .22 : 0;
  const oy = d ? d.y * s * .22 : 0;
  const cx = x + ox, cy = y + oy - s * .10;
  const hw = s * .54, hh = s * 1.02;
  // --- 強烈暖光暈（更亮更廣）---
  const gg = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 1.35);
  if (bossFire) {
    gg.addColorStop(0, 'rgba(190,90,255,' + (.72 * k + .10).toFixed(3) + ')');
    gg.addColorStop(1, 'rgba(120,24,190,0)');
  } else {
    gg.addColorStop(0, 'rgba(255,150,60,' + (.80 * k + .10).toFixed(3) + ')');
    gg.addColorStop(.5, 'rgba(255,90,30,' + (.42 * k).toFixed(3) + ')');
    gg.addColorStop(1, 'rgba(255,60,20,0)');
  }
  ctx.fillStyle = gg;
  ctx.beginPath(); ctx.arc(cx, cy, s * 1.35, 0, 6.283); ctx.fill();
  // v4.11：爆炸火球雲（不再是燭火，像 SBR 那種翻滾的爆破火團）
  const cols = bossFire
    ? [ 'rgba(255,255,255,A)', 'rgba(244,200,255,A)', 'rgba(198,92,255,A)', 'rgba(150,40,230,A)', 'rgba(120,24,190,0)' ]
    : [ 'rgba(255,255,255,A)', 'rgba(255,236,160,A)', 'rgba(255,168,40,A)', 'rgba(255,80,20,A)', 'rgba(200,30,10,0)' ];
  drawFlameBlob(cx, cy, s * .92, cols, k);
  const N = 6;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * 6.283 + f.cx * 1.7 + f.cy * 0.9 + Game.gameT * 1.5;
    const rr = s * (0.40 + 0.14 * Math.sin(f.cy * 2 + i + Game.gameT * 3));
    const bx = cx + Math.cos(a) * s * 0.52;
    const by = cy + Math.sin(a) * s * 0.52;
    drawFlameBlob(bx, by, Math.max(s * 0.18, rr), cols, k * 0.92);
  }
  // 往 d 方向多噴一團（爆炸往外竄）
  if (d) {
    const tx = cx + d.x * s * .55, ty = cy + d.y * s * .55;
    drawFlameBlob(tx, ty, s * .6, cols, k * 0.85);
  }
  // --- 上升的小火星 ---
  const pc = bossFire ? [236, 176, 255] : [255, 206, 120];
  for (let i = 0; i < 5; i++) {
    const ph = Game.gameT * 3.4 + i * 1.5 + f.cx * .7 + f.cy * 1.3;
    const up = ph % 1;
    const mx = cx + Math.sin(ph * 2.3) * s * .30;
    const my = cy - s * (.35 + up * 1.25);
    const mr = Math.max(.9, s * .095 * (1 - up * .55));
    ctx.fillStyle = 'rgba(' + pc[0] + ',' + Math.round(pc[1] - up * 70) + ',' +
      Math.round(pc[2] - up * 70) + ',' + (.85 * (1 - up) * k).toFixed(3) + ')';
    ctx.beginPath(); ctx.arc(mx, my, mr, 0, 6.283); ctx.fill();
  }
}"""

new = """function drawFlame(f, T) {
  const x = f.cx * T + T / 2, y = f.cy * T + T / 2;
  const k = clamp(f.t / .46, 0, 1);
  const flick = 1 + Math.sin(Game.gameT * 34 + f.cx * 3 + f.cy * 7) * .06;
  // v4.11：火焰體積變大（整格都是火），且沿著十字臂「伸長」連成一條管子
  const grow = 0.72 + 0.28 * Math.sin(k * Math.PI);      // 冒出來 → 膨脹 → 收掉
  const s = T * .82 * grow * flick;
  const d = f.dir ? DIRS[f.dir] : null;
  // BOSS 自己放的炸彈 → 紫色魔焰（owner 為 null 就是 BOSS）
  const bossFire = f.owner == null;
  // v4.11：type = 'center'（爆心）／'mid'（臂中段）／'end'（臂末端）
  //   mid 段往「內側」伸、end 段往「內側」伸 → 上下左右四臂會連成一條粗管
  const isMid = f.type === 'mid', isEnd = f.type === 'end';
  // 火焰核心位置：往臂的方向稍微偏（讓整條臂連得起來）
  const ox = d ? d.x * s * (isMid ? .16 : isEnd ? .04 : 0) : 0;
  const oy = d ? d.y * s * (isMid ? .16 : isEnd ? .04 : 0) : 0;
  const cx = x + ox, cy = y + oy;
  // --- 強烈暖光暈（更亮更廣）---
  const gg = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 1.15);
  if (bossFire) {
    gg.addColorStop(0, 'rgba(190,90,255,' + (.72 * k + .10).toFixed(3) + ')');
    gg.addColorStop(1, 'rgba(120,24,190,0)');
  } else {
    gg.addColorStop(0, 'rgba(255,168,80,' + (.80 * k + .10).toFixed(3) + ')');
    gg.addColorStop(.5, 'rgba(255,90,30,' + (.42 * k).toFixed(3) + ')');
    gg.addColorStop(1, 'rgba(255,60,20,0)');
  }
  ctx.fillStyle = gg;
  ctx.beginPath(); ctx.arc(cx, cy, s * 1.15, 0, 6.283); ctx.fill();
  // v4.11：色階改成「白熱／米白核心 → 奶油黃 → 橘 → 橘紅邊 → 暗紅焦邊」
  //   （參考圖幾乎整團是白到奶油色，只有外緣一圈橘紅）
  const cols = bossFire
    ? [ 'rgba(255,255,255,A)', 'rgba(246,214,255,A)', 'rgba(210,120,255,A)', 'rgba(150,40,230,A)', 'rgba(110,20,170,0)' ]
    : [ 'rgba(255,255,255,A)', 'rgba(255,246,214,A)', 'rgba(255,214,130,A)', 'rgba(255,150,50,A)', 'rgba(214,60,16,0)' ];
  // 主體：一整團白熱火（不是小圓球，是塞滿整格）
  drawFlameBlob(cx, cy, s * .82, cols, k);
  // 翻滾的雲團：8 顆沿著「臂的垂直方向」左右鋪開 + 沿臂方向往前推
  //   → 上下左右四臂接起來就是參考圖那種連續的粗火管
  const N = 8;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * 6.283 + f.cx * 1.7 + f.cy * 0.9 + Game.gameT * 1.6;
    const wob = 0.36 + 0.12 * Math.sin(f.cy * 2.3 + i * 1.7 + Game.gameT * 3.4);
    const rr = s * wob;
    let bx = cx + Math.cos(a) * s * 0.44;
    let by = cy + Math.sin(a) * s * 0.44;
    // 往臂的方向多推一點 → 讓相鄰兩格的火黏在一起
    if (d) {
      const push = (isMid ? .30 : isEnd ? .40 : .22) * s;
      bx += d.x * push * (0.6 + 0.4 * Math.cos(a));
      by += d.y * push * (0.6 + 0.4 * Math.cos(a));
    }
    drawFlameBlob(bx, by, Math.max(s * .26, rr), cols, k * .95);
  }
  // 臂末端：再往前噴一大團（爆炸往外竄、尾巴收圓）
  if (d) {
    const tx = cx + d.x * s * .52, ty = cy + d.y * s * .52;
    drawFlameBlob(tx, ty, s * .58, cols, k * .88);
  }
  // 底部的白熱內芯（最亮的那一點 → 整團看起來像真的在燃燒）
  {
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * .46);
    core.addColorStop(0, 'rgba(255,255,255,' + (.92 * k).toFixed(3) + ')');
    core.addColorStop(.55, 'rgba(255,250,225,' + (.55 * k).toFixed(3) + ')');
    core.addColorStop(1, 'rgba(255,240,190,0)');
    ctx.fillStyle = core;
    ctx.beginPath(); ctx.arc(cx, cy, s * .46, 0, 6.283); ctx.fill();
  }
  // --- 上升的小火星 ---
  const pc = bossFire ? [236, 176, 255] : [255, 214, 140];
  for (let i = 0; i < 5; i++) {
    const ph = Game.gameT * 3.4 + i * 1.5 + f.cx * .7 + f.cy * 1.3;
    const up = ph % 1;
    const mx = cx + Math.sin(ph * 2.3) * s * .30;
    const my = cy - s * (.42 + up * 1.35);
    const mr = Math.max(.9, s * .085 * (1 - up * .55));
    ctx.fillStyle = 'rgba(' + pc[0] + ',' + Math.round(pc[1] - up * 70) + ',' +
      Math.round(pc[2] - up * 70) + ',' + (.85 * (1 - up) * k).toFixed(3) + ')';
    ctx.beginPath(); ctx.arc(mx, my, mr, 0, 6.283); ctx.fill();
  }
}"""

if text.count(old) != 1:
    print('FAILED: drawFlame block count=%d' % text.count(old))
    raise SystemExit(1)

text = text.replace(old, new)
io.open(PATH, 'w', encoding='utf-8', newline='').write(text.replace('\n', '\r\n'))
print('OK: drawFlame rewritten (SBR-style billowing white-hot cloud)')
