# -*- coding: utf-8 -*-
"""v1.6：每一關的關卡美術（冰原／熔岩／沙漠／暗黑）做成附圖那種立體石磚風格。"""
import io

P = 'index.html'
s = io.open(P, encoding='utf-8').read()


def rep(old, new, tag, cnt=1):
    global s
    assert old in s, 'NOT FOUND: ' + tag
    s = s.replace(old, new, cnt)
    print('  ok:', tag)


# ------------------------------------------------ 1. 主題加上 style
rep('''  { name: '綠野草原', bg1: '#f3ead2', bg2: '#e4efd2', floor: '#bcd9a2', floor2: '#b1cf95', hard: '#9fa8ad', soft: '#e2a76b', soft2: '#c0844c', accent: '#8fe08f', hazards: [] },
  { name: '熔岩洞窟', bg1: '#331a12', bg2: '#3d2016', floor: '#9a7260', floor2: '#8a6453', hard: '#6d6470', soft: '#d4713c', soft2: '#a8502a', accent: '#ff8a4d', hazards: ['convey'] },
  { name: '冰雪原', bg1: '#16324a', bg2: '#1b3c58', floor: '#c2dcee', floor2: '#b2cee2', hard: '#7c8b9c', soft: '#7fc3ef', soft2: '#5aa3d6', accent: '#bde8ff', hazards: ['ice'] },
  { name: '沙漠遺跡', bg1: '#3d3115', bg2: '#473a1a', floor: '#d0bc8b', floor2: '#c1ad7c', hard: '#9b9384', soft: '#e0b45c', soft2: '#b98b34', accent: '#ffe08a', hazards: ['warp'] },
  { name: '夜光彩城', bg1: '#1a1440', bg2: '#201a4d', floor: '#7a70b2', floor2: '#6c629f', hard: '#4b4670', soft: '#b487f5', soft2: '#8959d8', accent: '#c8a8ff', hazards: ['ice', 'convey'] },
  { name: '深海遺跡', bg1: '#0d2b33', bg2: '#11343d', floor: '#6ba3ad', floor2: '#5d939d', hard: '#33616d', soft: '#54c4d0', soft2: '#38a0ad', accent: '#7de8e0', hazards: ['warp', 'ice'] },
  { name: '天空要塞', bg1: '#2b3548', bg2: '#323e54', floor: '#9cadca', floor2: '#8e9fbc', hard: '#5f6d86', soft: '#b8d0f2', soft2: '#8fb0dd', accent: '#cfe0ff', hazards: ['convey', 'warp'] },
  { name: '暗黑魔王城', bg1: '#2a1020', bg2: '#331427', floor: '#a86e8a', floor2: '#995f7a', hard: '#57303f', soft: '#d4699a', soft2: '#a94a75', accent: '#ff7da8', hazards: ['ice', 'warp', 'convey'] }''',
    '''  { name: '綠野草原', style: 'forest', bg1: '#f3ead2', bg2: '#e4efd2', floor: '#bcd9a2', floor2: '#b1cf95', hard: '#9fa8ad', soft: '#e2a76b', soft2: '#c0844c', accent: '#8fe08f', hazards: [] },
  { name: '熔岩洞窟', style: 'lava', bg1: '#2a1510', bg2: '#321a12', floor: '#4a3a3a', floor2: '#3f3232', hard: '#4a3f47', soft: '#8a5c3e', soft2: '#5f3c28', accent: '#ff6a1e', hazards: ['convey'] },
  { name: '冰雪原', style: 'ice', bg1: '#16324a', bg2: '#1b3c58', floor: '#cfe7f6', floor2: '#bcdcef', hard: '#8ab4cf', soft: '#a8dcf5', soft2: '#6aa8d2', accent: '#e8f8ff', hazards: ['ice'] },
  { name: '沙漠遺跡', style: 'sand', bg1: '#5a4420', bg2: '#64501f', floor: '#e0c795', floor2: '#d3b884', hard: '#b49a72', soft: '#d9b071', soft2: '#a8804a', accent: '#ffe08a', hazards: ['warp'] },
  { name: '夜光彩城', style: 'neon', bg1: '#1a1440', bg2: '#201a4d', floor: '#6a60a2', floor2: '#5d5490', hard: '#4b4670', soft: '#b487f5', soft2: '#8959d8', accent: '#c8a8ff', hazards: ['ice', 'convey'] },
  { name: '深海遺跡', style: 'sea', bg1: '#0d2b33', bg2: '#11343d', floor: '#5f97a1', floor2: '#528a94', hard: '#33616d', soft: '#54c4d0', soft2: '#38a0ad', accent: '#7de8e0', hazards: ['warp', 'ice'] },
  { name: '天空要塞', style: 'sky', bg1: '#2b3548', bg2: '#323e54', floor: '#93a4c2', floor2: '#8697b4', hard: '#5f6d86', soft: '#b8d0f2', soft2: '#8fb0dd', accent: '#cfe0ff', hazards: ['convey', 'warp'] },
  { name: '暗黑魔王城', style: 'dark', bg1: '#1c0a16', bg2: '#24101c', floor: '#6d4759', floor2: '#603d4d', hard: '#3e2430', soft: '#a8517c', soft2: '#7b3757', accent: '#ff5e9a', hazards: ['ice', 'warp', 'convey'] }''',
    'theme styles')

# ------------------------------------------------ 2. drawStone / drawCrate 依 style 分派
rep('''function drawStone(px, py, T, base, seed) {
  const inset = T * .015;''',
    '''// 牆（打不破）：依關卡風格換材質。冰晶／熔岩／砂岩／黑曜石，都是「立體磚」的畫法。
function drawStone(px, py, T, base, seed) {
  const st = (Game.theme && Game.theme.style) || 'forest';
  if (st === 'ice') return drawWallIce(px, py, T, base, seed);
  if (st === 'lava') return drawWallLava(px, py, T, base, seed);
  if (st === 'sand') return drawWallSand(px, py, T, base, seed);
  if (st === 'dark') return drawWallDark(px, py, T, base, seed);
  if (st === 'neon') return drawWallNeon(px, py, T, base, seed);
  const inset = T * .015;''', 'drawStone dispatch')

rep('''function drawCrate(px, py, T, base, dark, big) {
  const inset = big ? T * .02 : T * .08;''',
    '''function drawCrate(px, py, T, base, dark, big) {
  const st = (Game.theme && Game.theme.style) || 'forest';
  if (st === 'ice') return drawCrateIce(px, py, T, base, dark, big);
  if (st === 'lava') return drawCrateLava(px, py, T, base, dark, big);
  if (st === 'sand') return drawCrateSand(px, py, T, base, dark, big);
  if (st === 'dark') return drawCrateDark(px, py, T, base, dark, big);
  if (st === 'sea' || st === 'sky' || st === 'neon') return drawCrateStone(px, py, T, base, dark, big);
  const inset = big ? T * .02 : T * .08;''', 'drawCrate dispatch')

# ------------------------------------------------ 3. 地板依 style 分派
rep('''function paintGrassTile(x, y, px, py, T, th) {
  ctx.fillStyle = (x + y) % 2 === 0 ? th.floor : th.floor2;''',
    '''function paintGrassTile(x, y, px, py, T, th) {
  const st = th.style || 'forest';
  if (st !== 'forest' && typeof paintFloorStyle === 'function') { paintFloorStyle(x, y, px, py, T, th, st); return; }
  ctx.fillStyle = (x + y) % 2 === 0 ? th.floor : th.floor2;''', 'floor dispatch')

# ------------------------------------------------ 4. 新的材質繪製函式
NEW = r'''
// ================================================================
//   v1.6 關卡材質：立體磚風（冰晶 / 玄武岩 / 砂岩 / 黑曜石 / 霓虹 / 深海 / 天空）
// ================================================================
function rect3d(x, y, w, h, r) {
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); }
  else ctx.fillRect(x, y, w, h);
}
// 牆：冰晶柱
function drawWallIce(px, py, T, base, seed) {
  const x = px + T * .02, y = py + T * .02, w = T * .96, h = T * .96, r = T * .12;
  ctx.fillStyle = 'rgba(16,46,66,.34)'; rect3d(x + T * .02, y + T * .05, w, h, r);
  const lg = ctx.createLinearGradient(x, y, x + w * .45, y + h);
  lg.addColorStop(0, '#f2fbff'); lg.addColorStop(.42, '#a9dcf6'); lg.addColorStop(1, '#5b9fce');
  ctx.fillStyle = lg; rect3d(x, y, w, h, r);
  // 斜切冰面
  ctx.fillStyle = 'rgba(255,255,255,.40)';
  ctx.beginPath();
  ctx.moveTo(x + w * .08, y + h * .06); ctx.lineTo(x + w * .52, y + h * .06);
  ctx.lineTo(x + w * .30, y + h * .94); ctx.lineTo(x + w * .07, y + h * .62);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(58,120,170,.26)';
  ctx.beginPath();
  ctx.moveTo(x + w * .58, y + h * .10); ctx.lineTo(x + w * .94, y + h * .18);
  ctx.lineTo(x + w * .94, y + h * .88); ctx.lineTo(x + w * .66, y + h * .78);
  ctx.closePath(); ctx.fill();
  // 冰裂
  const h1 = dhash(seed, 3, 19), h2 = dhash(seed, 7, 23);
  ctx.strokeStyle = 'rgba(255,255,255,.62)';
  ctx.lineWidth = Math.max(1, T * .022); ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + w * .30, y + h * .16);
  ctx.lineTo(x + w * (.42 + h1 * .08), y + h * .46);
  ctx.lineTo(x + w * (.36 + h2 * .08), y + h * .78);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + w * .62, y + h * .22); ctx.lineTo(x + w * .72, y + h * .56);
  ctx.stroke();
  ctx.lineCap = 'butt';
  // 積雪
  ctx.fillStyle = 'rgba(255,255,255,.88)';
  ctx.beginPath();
  ctx.ellipse(x + w * (.28 + h2 * .40), y + h * .06, w * .26, h * .07, 0, 0, 6.283); ctx.fill();
  ctx.strokeStyle = 'rgba(120,170,200,.55)';
  ctx.lineWidth = Math.max(1.2, T * .028);
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x + w * .03, y + h * .03, w * .94, h * .94, r * .9); ctx.stroke(); }
  ctx.lineWidth = 1;
}
// 牆：玄武岩＋岩縫裡的岩漿光
function drawWallLava(px, py, T, base, seed) {
  const x = px + T * .02, y = py + T * .02, w = T * .96, h = T * .96, r = T * .08;
  const h1 = dhash(seed, 5, 13), h2 = dhash(seed, 9, 29);
  ctx.fillStyle = 'rgba(120,30,6,.26)'; rect3d(x + T * .02, y + T * .05, w, h, r);
  const lg = ctx.createLinearGradient(x, y, x, y + h);
  lg.addColorStop(0, '#5a4b52'); lg.addColorStop(.5, '#413640'); lg.addColorStop(1, '#241d24');
  ctx.fillStyle = lg; rect3d(x, y, w, h, r);
  // 岩塊分塊
  ctx.strokeStyle = 'rgba(20,14,18,.55)';
  ctx.lineWidth = Math.max(1, T * .03);
  ctx.beginPath();
  ctx.moveTo(x + w * .06, y + h * (.42 + h1 * .10));
  ctx.lineTo(x + w * .94, y + h * (.44 + h2 * .08));
  ctx.moveTo(x + w * (.38 + h1 * .18), y + h * .06);
  ctx.lineTo(x + w * (.40 + h2 * .16), y + h * .42);
  ctx.stroke();
  // 發光的岩縫
  const glow = .55 + .45 * Math.sin(Game.gameT * 2.2 + seed);
  ctx.strokeStyle = 'rgba(255,' + Math.round(90 + 60 * glow) + ',30,' + (.55 + .35 * glow).toFixed(2) + ')';
  ctx.lineWidth = Math.max(1.4, T * .04);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + w * .10, y + h * .88);
  ctx.lineTo(x + w * (.34 + h1 * .12), y + h * .62);
  ctx.lineTo(x + w * (.52 + h2 * .14), y + h * .74);
  ctx.lineTo(x + w * .90, y + h * .50);
  ctx.stroke();
  ctx.lineCap = 'butt';
  // 高光
  ctx.fillStyle = 'rgba(255,200,150,.16)';
  ctx.beginPath(); ctx.ellipse(x + w * .34, y + h * .22, w * .28, h * .14, -.3, 0, 6.283); ctx.fill();
  ctx.strokeStyle = 'rgba(16,10,14,.6)';
  ctx.lineWidth = Math.max(1.2, T * .03);
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x + w * .04, y + h * .04, w * .92, h * .92, r); ctx.stroke(); }
  ctx.lineWidth = 1;
}
// 牆：砂岩巨石（一層一層的方塊）
function drawWallSand(px, py, T, base, seed) {
  const x = px + T * .02, y = py + T * .02, w = T * .96, h = T * .96, r = T * .07;
  const h1 = dhash(seed, 4, 17), h2 = dhash(seed, 8, 27);
  ctx.fillStyle = 'rgba(110,80,34,.30)'; rect3d(x + T * .02, y + T * .05, w, h, r);
  const lg = ctx.createLinearGradient(x, y, x, y + h);
  lg.addColorStop(0, '#e8cf9f'); lg.addColorStop(.45, '#cdae78'); lg.addColorStop(1, '#9c7c4c');
  ctx.fillStyle = lg; rect3d(x, y, w, h, r);
  // 砌石縫
  ctx.strokeStyle = 'rgba(112,84,44,.42)';
  ctx.lineWidth = Math.max(1, T * .026);
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x + w * .04, y + h * (i / 3 + .02));
    ctx.lineTo(x + w * .96, y + h * (i / 3 - .01));
    ctx.stroke();
  }
  for (let i = 0; i < 2; i++) {
    const bx = x + w * (.30 + i * .36 + (h1 - .5) * .10);
    ctx.beginPath(); ctx.moveTo(bx, y + h * (i ? .34 : .04)); ctx.lineTo(bx, y + h * (i ? .66 : .33)); ctx.stroke();
  }
  // 風化小洞
  for (let i = 0; i < 3; i++) {
    const sx2 = x + w * (.16 + dhash(seed + i, i + 3, 33) * .66);
    const sy2 = y + h * (.18 + dhash(seed + i, i + 6, 39) * .64);
    ctx.fillStyle = 'rgba(120,92,50,.30)';
    ctx.beginPath(); ctx.arc(sx2, sy2, Math.max(1, T * .02), 0, 6.283); ctx.fill();
  }
  // 上緣受光
  ctx.fillStyle = 'rgba(255,244,214,.42)';
  ctx.beginPath(); ctx.ellipse(x + w * (.34 + h2 * .26), y + h * .08, w * .30, h * .06, 0, 0, 6.283); ctx.fill();
  ctx.strokeStyle = 'rgba(120,90,48,.44)';
  ctx.lineWidth = Math.max(1.2, T * .03);
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x + w * .035, y + h * .035, w * .93, h * .93, r); ctx.stroke(); }
  ctx.lineWidth = 1;
}
// 牆：黑曜石＋紫色魔紋
function drawWallDark(px, py, T, base, seed) {
  const x = px + T * .02, y = py + T * .02, w = T * .96, h = T * .96, r = T * .10;
  const h1 = dhash(seed, 6, 21), h2 = dhash(seed, 10, 31);
  ctx.fillStyle = 'rgba(10,4,10,.42)'; rect3d(x + T * .02, y + T * .05, w, h, r);
  const lg = ctx.createLinearGradient(x, y, x + w * .3, y + h);
  lg.addColorStop(0, '#4c2b3c'); lg.addColorStop(.5, '#361d2a'); lg.addColorStop(1, '#1d0f18');
  ctx.fillStyle = lg; rect3d(x, y, w, h, r);
  // 魔紋（發光曲線）
  const pulse = .5 + .5 * Math.sin(Game.gameT * 1.7 + seed);
  ctx.strokeStyle = 'rgba(255,90,150,' + (.35 + .35 * pulse).toFixed(2) + ')';
  ctx.lineWidth = Math.max(1.2, T * .03);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + w * .18, y + h * .82);
  ctx.quadraticCurveTo(x + w * (.30 + h1 * .1), y + h * .50, x + w * .50, y + h * .54);
  ctx.quadraticCurveTo(x + w * (.70 + h2 * .1), y + h * .58, x + w * .84, y + h * .22);
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.fillStyle = 'rgba(255,150,190,.20)';
  ctx.beginPath(); ctx.ellipse(x + w * .30, y + h * .24, w * .22, h * .12, -.4, 0, 6.283); ctx.fill();
  ctx.strokeStyle = 'rgba(255,120,170,.30)';
  ctx.lineWidth = Math.max(1.2, T * .026);
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x + w * .04, y + h * .04, w * .92, h * .92, r); ctx.stroke(); }
  ctx.lineWidth = 1;
}
// 牆：霓虹磚
function drawWallNeon(px, py, T, base, seed) {
  const x = px + T * .02, y = py + T * .02, w = T * .96, h = T * .96, r = T * .12;
  const lg = ctx.createLinearGradient(x, y, x, y + h);
  lg.addColorStop(0, '#5c5488'); lg.addColorStop(1, '#2a2547');
  ctx.fillStyle = lg; rect3d(x, y, w, h, r);
  const pulse = .5 + .5 * Math.sin(Game.gameT * 3 + seed);
  ctx.strokeStyle = 'rgba(160,120,255,' + (.45 + .4 * pulse).toFixed(2) + ')';
  ctx.lineWidth = Math.max(1.4, T * .034);
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x + w * .08, y + h * .08, w * .84, h * .84, r * .8); ctx.stroke(); }
  ctx.lineWidth = 1;
  ctx.fillStyle = 'rgba(200,170,255,.22)';
  ctx.beginPath(); ctx.ellipse(x + w * .34, y + h * .24, w * .26, h * .12, -.4, 0, 6.283); ctx.fill();
}
// 木箱類：冰塊
function drawCrateIce(px, py, T, base, dark, big) {
  const inset = big ? T * .02 : T * .06;
  const x = px + inset, y = py + inset, w = T - inset * 2, h = T - inset * 2, r = T * .14;
  ctx.fillStyle = 'rgba(20,60,90,.28)'; rect3d(x + T * .02, y + T * .05, w, h, r);
  const lg = ctx.createLinearGradient(x, y, x + w * .4, y + h);
  lg.addColorStop(0, '#ffffff'); lg.addColorStop(.45, '#cdeefe'); lg.addColorStop(1, '#8fc9e8');
  ctx.fillStyle = lg; rect3d(x, y, w, h, r);
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x + w * .10, y + h * .08, w * .40, h * .22, r * .7); ctx.fill(); }
  const h1 = dhash(px + py, 5, 17);
  ctx.strokeStyle = 'rgba(255,255,255,.7)';
  ctx.lineWidth = Math.max(1, T * .024);
  ctx.beginPath();
  ctx.moveTo(x + w * (.24 + h1 * .2), y + h * .30); ctx.lineTo(x + w * .52, y + h * .58);
  ctx.lineTo(x + w * (.44 + h1 * .3), y + h * .86);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(96,150,190,.6)';
  ctx.lineWidth = Math.max(1.2, T * .03);
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x + w * .05, y + h * .05, w * .90, h * .90, r * .85); ctx.stroke(); }
  ctx.lineWidth = 1;
}
// 木箱類：磚堆（熔岩關）
function drawCrateLava(px, py, T, base, dark, big) {
  const inset = big ? T * .02 : T * .07;
  const x = px + inset, y = py + inset, w = T - inset * 2, h = T - inset * 2;
  ctx.fillStyle = 'rgba(30,12,8,.35)'; ctx.fillRect(x + T * .02, y + T * .05, w, h);
  // 三層磚
  const rows = 3, rh = h / rows;
  for (let ry = 0; ry < rows; ry++) {
    const off = (ry % 2) * .5;
    const cols = 2;
    for (let c = 0; c < cols; c++) {
      const bw = w / cols;
      const bx = x + c * bw + off * bw * .5 - (off ? bw * .25 : 0);
      const by = y + ry * rh;
      const lg = ctx.createLinearGradient(bx, by, bx, by + rh);
      lg.addColorStop(0, shadeHex(base, 1.18 + c * .04));
      lg.addColorStop(1, dark || shadeHex(base, .82));
      ctx.fillStyle = lg;
      ctx.fillRect(Math.max(x, bx) + 1, by + 1, Math.min(bw, x + w - bx) - 2, rh - 2);
      ctx.fillStyle = 'rgba(255,220,180,.18)';
      ctx.fillRect(Math.max(x, bx) + 1, by + 1, Math.min(bw, x + w - bx) - 2, Math.max(1.4, rh * .16));
    }
  }
  // 岩縫餘燼
  const g = .5 + .5 * Math.sin(Game.gameT * 3 + px * .1 + py * .13);
  ctx.fillStyle = 'rgba(255,110,30,' + (.30 + .35 * g).toFixed(2) + ')';
  ctx.fillRect(x + w * .1, y + h - 2, w * .8, Math.max(1.4, T * .03));
  ctx.strokeStyle = 'rgba(24,10,8,.55)';
  ctx.lineWidth = Math.max(1.2, T * .028);
  ctx.strokeRect(x + w * .02, y + h * .02, w * .96, h * .96);
  ctx.lineWidth = 1;
}
// 木箱類：砂岩碎石堆
function drawCrateSand(px, py, T, base, dark, big) {
  const inset = big ? T * .02 : T * .07;
  const x = px + inset, y = py + inset, w = T - inset * 2, h = T - inset * 2;
  ctx.fillStyle = 'rgba(110,80,36,.30)';
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x + T * .02, y + T * .05, w, h, T * .08); ctx.fill(); }
  const blocks = [[.0, .30, .58, .68], [.46, .16, .54, .52], [.30, .60, .52, .36]];
  blocks.forEach(function (b, i) {
    const bx = x + w * b[0], by = y + h * b[1], bw = w * b[2], bh = h * b[3];
    const lg = ctx.createLinearGradient(bx, by, bx, by + bh);
    lg.addColorStop(0, shadeHex(base, 1.14 + i * .03));
    lg.addColorStop(1, dark || shadeHex(base, .84));
    ctx.fillStyle = lg;
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, T * .07); ctx.fill(); }
    else ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = 'rgba(255,240,200,.22)';
    ctx.fillRect(bx + bw * .1, by + bh * .08, bw * .8, Math.max(1.2, bh * .14));
  });
  ctx.strokeStyle = 'rgba(120,92,50,.5)';
  ctx.lineWidth = Math.max(1, T * .022);
  ctx.beginPath();
  ctx.moveTo(x + w * .22, y + h * .30); ctx.lineTo(x + w * .34, y + h * .58);
  ctx.stroke();
  ctx.lineWidth = 1;
}
// 木箱類：黑曜石晶柱
function drawCrateDark(px, py, T, base, dark, big) {
  const inset = big ? T * .02 : T * .07;
  const x = px + inset, y = py + inset, w = T - inset * 2, h = T - inset * 2;
  ctx.fillStyle = 'rgba(8,2,8,.4)';
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x + T * .02, y + T * .05, w, h, T * .1); ctx.fill(); }
  const lg = ctx.createLinearGradient(x, y, x + w, y + h);
  lg.addColorStop(0, shadeHex(base, 1.2)); lg.addColorStop(.5, base); lg.addColorStop(1, dark || shadeHex(base, .8));
  ctx.fillStyle = lg;
  ctx.beginPath();
  ctx.moveTo(x + w * .5, y + h * .04);
  ctx.lineTo(x + w * .94, y + h * .34);
  ctx.lineTo(x + w * .80, y + h * .92);
  ctx.lineTo(x + w * .24, y + h * .94);
  ctx.lineTo(x + w * .06, y + h * .38);
  ctx.closePath(); ctx.fill();
  const pulse = .5 + .5 * Math.sin(Game.gameT * 2.4 + px * .07);
  ctx.strokeStyle = 'rgba(255,120,170,' + (.35 + .35 * pulse).toFixed(2) + ')';
  ctx.lineWidth = Math.max(1.2, T * .03);
  ctx.beginPath();
  ctx.moveTo(x + w * .5, y + h * .12); ctx.lineTo(x + w * .42, y + h * .52); ctx.lineTo(x + w * .58, y + h * .86);
  ctx.stroke();
  ctx.lineWidth = 1;
}
// 通用石材（深海／天空／霓虹共用）
function drawCrateStone(px, py, T, base, dark, big) {
  const inset = big ? T * .02 : T * .07;
  const x = px + inset, y = py + inset, w = T - inset * 2, h = T - inset * 2, r = T * .10;
  ctx.fillStyle = 'rgba(10,24,32,.28)'; rect3d(x + T * .02, y + T * .05, w, h, r);
  const lg = ctx.createLinearGradient(x, y, x, y + h);
  lg.addColorStop(0, shadeHex(base, 1.2)); lg.addColorStop(1, dark || shadeHex(base, .8));
  ctx.fillStyle = lg; rect3d(x, y, w, h, r);
  ctx.fillStyle = 'rgba(255,255,255,.24)';
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x + w * .1, y + h * .08, w * .8, h * .18, r * .7); ctx.fill(); }
  ctx.strokeStyle = 'rgba(255,255,255,.22)';
  ctx.lineWidth = Math.max(1, T * .024);
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x + w * .06, y + h * .06, w * .88, h * .88, r * .8); ctx.stroke(); }
  ctx.lineWidth = 1;
}
// 地板：依 style 換材質（冰面／岩漿地／沙地／黑曜石／霓虹…）
function paintFloorStyle(x, y, px, py, T, th, st) {
  const h1 = dhash(x, y, 11), h2 = dhash(x, y, 29), h3 = dhash(x, y, 47);
  const even = (x + y) % 2 === 0;
  ctx.fillStyle = even ? th.floor : th.floor2;
  ctx.fillRect(px, py, T, T);
  if (st === 'ice') {
    // 冰面：亮面反光 + 冰裂 + 雪花點
    ctx.fillStyle = 'rgba(255,255,255,.34)';
    ctx.fillRect(px + T * .04, py + T * .04, T * .92, T * .10);
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.beginPath(); ctx.ellipse(px + T * (.3 + h1 * .4), py + T * (.3 + h2 * .4), T * (.26 + h1 * .1), T * .14, h3 * 3, 0, 6.283); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = Math.max(1, T * .022);
    ctx.beginPath();
    ctx.moveTo(px + T * .12, py + T * (.30 + h1 * .2));
    ctx.lineTo(px + T * (.45 + h2 * .15), py + T * .55);
    ctx.lineTo(px + T * .78, py + T * (.62 + h1 * .2));
    ctx.stroke();
    if (h3 > .55) {
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      const sx2 = px + T * (.2 + h2 * .6), sy2 = py + T * (.2 + h1 * .6);
      for (let k = 0; k < 4; k++) {
        const a = k * 1.57;
        ctx.fillRect(sx2 + Math.cos(a) * T * .05 - T * .012, sy2 + Math.sin(a) * T * .05 - T * .012, T * .024, T * .024);
      }
    }
    ctx.strokeStyle = 'rgba(120,170,200,.30)';
    ctx.lineWidth = Math.max(1, T * .02);
    ctx.strokeRect(px + T * .02, py + T * .02, T * .96, T * .96);
    ctx.lineWidth = 1;
    return;
  }
  if (st === 'lava') {
    // 玄武岩地磚 + 發光岩縫
    ctx.fillStyle = 'rgba(10,6,8,.34)';
    ctx.fillRect(px + T * .02, py + T * .02, T * .96, T * .96);
    const g = .45 + .55 * Math.sin(Game.gameT * 1.8 + x * .7 + y * 1.3);
    ctx.strokeStyle = 'rgba(255,' + Math.round(90 + 50 * g) + ',20,' + (.28 + .3 * g).toFixed(2) + ')';
    ctx.lineWidth = Math.max(1.4, T * .036);
    if (h1 > .45) {
      ctx.beginPath();
      ctx.moveTo(px + T * .06, py + T * (.3 + h2 * .4));
      ctx.lineTo(px + T * (.4 + h3 * .2), py + T * .62);
      ctx.lineTo(px + T * .94, py + T * (.4 + h1 * .3));
      ctx.stroke();
    }
    if (h2 > .7) {
      ctx.fillStyle = 'rgba(255,140,40,' + (.25 + .3 * g).toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(px + T * (.2 + h3 * .6), py + T * (.2 + h1 * .6), T * .05, 0, 6.283); ctx.fill();
    }
    ctx.lineWidth = 1;
    return;
  }
  if (st === 'sand') {
    // 沙地：風紋 + 小石
    ctx.fillStyle = 'rgba(255,245,210,.26)';
    ctx.beginPath();
    ctx.ellipse(px + T * (.3 + h2 * .4), py + T * (.3 + h3 * .4), T * (.34 + h1 * .1), T * .10, h1 * 2, 0, 6.283);
    ctx.fill();
    ctx.strokeStyle = 'rgba(190,160,110,.42)';
    ctx.lineWidth = Math.max(1, T * .02);
    ctx.beginPath();
    ctx.moveTo(px + T * .08, py + T * (.2 + h1 * .2));
    ctx.quadraticCurveTo(px + T * .5, py + T * (.3 + h2 * .3), px + T * .92, py + T * (.22 + h3 * .2));
    ctx.stroke();
    if (h3 > .62) {
      ctx.fillStyle = 'rgba(150,124,78,.5)';
      ctx.beginPath(); ctx.ellipse(px + T * (.24 + h1 * .5), py + T * (.66 + h2 * .2), T * .07, T * .05, 0, 0, 6.283); ctx.fill();
    }
    ctx.lineWidth = 1;
    return;
  }
  if (st === 'dark') {
    // 黑曜石地磚 + 紫光
    ctx.fillStyle = 'rgba(0,0,0,.36)';
    ctx.fillRect(px + T * .02, py + T * .02, T * .96, T * .96);
    const p2 = .5 + .5 * Math.sin(Game.gameT * 1.6 + x + y);
    ctx.strokeStyle = 'rgba(255,110,170,' + (.10 + .16 * p2).toFixed(2) + ')';
    ctx.lineWidth = Math.max(1, T * .026);
    ctx.beginPath();
    ctx.moveTo(px + T * .1, py + T * .86); ctx.lineTo(px + T * .5, py + T * .18); ctx.lineTo(px + T * .9, py + T * .78);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,150,190,.10)';
    ctx.beginPath(); ctx.ellipse(px + T * .5, py + T * .5, T * .38, T * .28, 0, 0, 6.283); ctx.fill();
    ctx.lineWidth = 1;
    return;
  }
  if (st === 'neon') {
    ctx.fillStyle = 'rgba(255,255,255,.06)';
    ctx.fillRect(px + T * .03, py + T * .03, T * .94, T * .12);
    ctx.strokeStyle = 'rgba(180,150,255,.22)';
    ctx.lineWidth = Math.max(1, T * .022);
    ctx.strokeRect(px + T * .06, py + T * .06, T * .88, T * .88);
    ctx.lineWidth = 1;
    return;
  }
  if (st === 'sea') {
    // 水波紋
    ctx.strokeStyle = 'rgba(180,240,255,.22)';
    ctx.lineWidth = Math.max(1, T * .024);
    ctx.beginPath();
    ctx.moveTo(px + T * .05, py + T * (.3 + h1 * .2));
    ctx.quadraticCurveTo(px + T * .3, py + T * (.14 + h2 * .2), px + T * .55, py + T * .32);
    ctx.quadraticCurveTo(px + T * .8, py + T * (.5 + h3 * .2), px + T * .95, py + T * .3);
    ctx.stroke();
    ctx.lineWidth = 1;
    return;
  }
  if (st === 'sky') {
    // 雲磚
    ctx.fillStyle = 'rgba(255,255,255,.20)';
    ctx.beginPath();
    ctx.ellipse(px + T * (.34 + h1 * .3), py + T * (.36 + h2 * .3), T * .22, T * .12, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    ctx.beginPath();
    ctx.ellipse(px + T * (.58 + h3 * .2), py + T * (.5 + h1 * .2), T * .16, T * .09, 0, 0, 6.283); ctx.fill();
    return;
  }
}
'''

# 插在 paintGrassTile 之前
anchor = '// 草地：兩色交錯 + 柔光斑 + 草叢 + 小花（固定種子 → 同一關每次長得一樣）'
i = s.find(anchor)
assert i > 0
s = s[:i] + NEW + '\n' + s[i:]
print('  ok: new material functions')

io.open(P, 'w', encoding='utf-8').write(s)
print('lines', s.count('\n'))
