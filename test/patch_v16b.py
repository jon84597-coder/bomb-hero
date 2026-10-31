# -*- coding: utf-8 -*-
"""v1.6：把 drawEnemy 的小怪畫法換成 10 種各自的外型（安全切片版）。"""
import io

P = 'index.html'
s = io.open(P, encoding='utf-8').read()

ART = r'''  // ---------- 10 種小怪的外型（有翅膀的飛、沒翅膀的走） ----------
  drawEnemyArt(e, x, y, flash, wob);
}

function drawEnemyArt(e, x, y, flash, wob) {
  const R = e.r, sp = e.spec || e.type || 'slime';
  const col = flash ? '#ffffff' : e.color;
  const dk = flash ? '#ffffff' : (e.color2 || e.color);
  const t = Game.gameT, w = e.walkT || 0;
  const step = Math.sin(w * 14) * R * .12;
  const fly = e.kind === 'fly';
  const air = fly ? Math.sin(t * 3 + (e.bobP || 0)) * R * .12 : 0;
  const yb = y + air;
  const flap = Math.sin(t * 15 + (e.bobP || 0));
  const look = e.vx ? (Math.sign(e.vx) || 1) : ((DIRS[e.dirName] || { x: 1 }).x || 1);

  function eyes(dx, dy, rx, ry) {
    ctx.fillStyle = '#141826';
    ctx.beginPath(); ctx.ellipse(x - rx * 1.3 + dx, yb + dy, rx, ry, 0, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + rx * 1.3 + dx, yb + dy, rx, ry, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x - rx * 1.55 + dx, yb + dy - ry * .35, rx * .34, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.arc(x + rx * 1.05 + dx, yb + dy - ry * .35, rx * .34, 0, 6.283); ctx.fill();
  }
  // 翅膀：四種飛怪共用，會拍動
  function wings(cy, spread, alpha) {
    ctx.fillStyle = flash ? '#fff' : 'rgba(255,255,255,' + (alpha || .62).toFixed(2) + ')';
    ctx.strokeStyle = flash ? '#fff' : 'rgba(120,140,200,.9)';
    ctx.lineWidth = 1.2;
    [-1, 1].forEach(function (sd) {
      ctx.beginPath();
      ctx.moveTo(x + sd * R * .45, cy);
      ctx.quadraticCurveTo(x + sd * R * spread, cy - R * (.55 + flap * .28), x + sd * R * (spread + .25), cy + R * (.28 + flap * .2));
      ctx.quadraticCurveTo(x + sd * R * spread * .8, cy + R * .28, x + sd * R * .5, cy + R * .3);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    });
    ctx.lineWidth = 1;
  }

  if (sp === 'slime') {
    // 史萊姆：果凍身體（上下彈）＋亮點
    const sq = 1 + Math.sin(t * 7 + w) * .07;
    ctx.fillStyle = dk;
    ctx.beginPath(); ctx.ellipse(x, yb + R * .74, R * .95 / sq, R * .22, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(x, yb + R * .24, R * .98 / sq, R * .82 * sq, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.34)';
    ctx.beginPath(); ctx.ellipse(x - R * .3, yb - R * .1, R * .26, R * .17, -.5, 0, 6.283); ctx.fill();
    eyes(0, -R * .02, R * .13, R * .19);
    ctx.fillStyle = '#141826';
    ctx.beginPath(); ctx.ellipse(x, yb + R * .34, R * .16, R * .1, 0, 0, 6.283); ctx.fill();
    return;
  }
  if (sp === 'beetle') {
    // 鐵甲蟲：圓頂甲殼＋中線＋六隻腳＋頭角
    ctx.strokeStyle = dk; ctx.lineWidth = Math.max(1.6, R * .12); ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
      const lx = x + i * R * .42;
      ctx.beginPath();
      ctx.moveTo(lx, yb + R * .42);
      ctx.quadraticCurveTo(lx + step * 1.6, yb + R * .8, lx + step * 2.6, yb + R * .95);
      ctx.stroke();
    }
    ctx.lineWidth = 1;
    ctx.fillStyle = dk;
    ctx.beginPath(); ctx.ellipse(x, yb + R * .12, R * 1.02, R * .9, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(x, yb + R * .04, R * .92, R * .78, 0, 0, 6.283); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = Math.max(1, R * .09);
    ctx.beginPath(); ctx.moveTo(x, yb - R * .7); ctx.lineTo(x, yb + R * .78); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(255,255,255,.3)';
    ctx.beginPath(); ctx.ellipse(x - R * .38, yb - R * .38, R * .26, R * .14, -.6, 0, 6.283); ctx.fill();
    ctx.fillStyle = dk;
    ctx.beginPath(); ctx.moveTo(x - R * .2, yb - R * .72); ctx.lineTo(x - look * R * .05, yb - R * 1.28); ctx.lineTo(x + R * .22, yb - R * .7); ctx.closePath(); ctx.fill();
    eyes(0, -R * .06, R * .12, R * .16);
    return;
  }
  if (sp === 'crab') {
    // 螃蟹：橫著走，兩隻大螯會開合
    const open = .5 + Math.abs(Math.sin(t * 5 + w)) * .5;
    ctx.strokeStyle = dk; ctx.lineWidth = Math.max(1.4, R * .1); ctx.lineCap = 'round';
    [-1, 1].forEach(function (sd) {
      for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        ctx.moveTo(x + sd * R * .6, yb + R * .2 + i * R * .22);
        ctx.lineTo(x + sd * R * 1.1, yb + R * .48 + i * R * .18 + step * sd * .5);
        ctx.stroke();
      }
    });
    ctx.lineWidth = 1;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(x, yb + R * .16, R * .96, R * .7, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.26)';
    ctx.beginPath(); ctx.ellipse(x - R * .3, yb - R * .1, R * .28, R * .13, -.4, 0, 6.283); ctx.fill();
    [-1, 1].forEach(function (sd) {
      ctx.fillStyle = dk;
      ctx.beginPath(); ctx.ellipse(x + sd * R * 1.02, yb - R * .28, R * .3, R * .24, sd * .3, 0, 6.283); ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(x + sd * R * 1.05, yb - R * .3);
      ctx.lineTo(x + sd * R * (1.35 + open * .2), yb - R * (.62 + open * .16));
      ctx.lineTo(x + sd * R * 1.0, yb - R * .5);
      ctx.closePath(); ctx.fill();
    });
    [-1, 1].forEach(function (sd) {
      ctx.strokeStyle = dk; ctx.lineWidth = Math.max(1.2, R * .09);
      ctx.beginPath(); ctx.moveTo(x + sd * R * .3, yb - R * .3); ctx.lineTo(x + sd * R * .3, yb - R * .78); ctx.stroke();
      ctx.lineWidth = 1;
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + sd * R * .3, yb - R * .84, R * .16, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#141826'; ctx.beginPath(); ctx.arc(x + sd * R * .3, yb - R * .84, R * .08, 0, 6.283); ctx.fill();
    });
    return;
  }
  if (sp === 'skull') {
    // 骷髏兵：頭骨＋下顎＋紅眼
    const bob = Math.abs(Math.sin(w * 14)) * R * .06;
    ctx.fillStyle = dk;
    ctx.fillRect(x - R * .5, yb + R * .42, R, R * .3);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(x, yb - R * .02 - bob, R * .84, R * .82, 0, 0, 6.283); ctx.fill();
    ctx.fillRect(x - R * .56, yb + R * .3 - bob, R * 1.12, R * .34);
    ctx.fillStyle = '#2a1220';
    ctx.beginPath(); ctx.ellipse(x - R * .32, yb - R * .12 - bob, R * .24, R * .26, 0, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + R * .32, yb - R * .12 - bob, R * .24, R * .26, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = 'rgba(255,70,90,' + (.65 + .35 * Math.sin(t * 8)).toFixed(2) + ')';
    ctx.beginPath(); ctx.arc(x - R * .32, yb - R * .12 - bob, R * .11, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.arc(x + R * .32, yb - R * .12 - bob, R * .11, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#2a1220';
    for (let i = -2; i <= 2; i++) ctx.fillRect(x + i * R * .19 - R * .05, yb + R * .32 - bob, R * .1, R * .22);
    return;
  }
  if (sp === 'mush') {
    // 毒菇怪：斑點傘蓋＋短腿
    ctx.strokeStyle = '#f4e6d2'; ctx.lineWidth = Math.max(1.6, R * .16); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - R * .18, yb + R * .2); ctx.lineTo(x - R * .2 + step, yb + R * .82); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + R * .18, yb + R * .2); ctx.lineTo(x + R * .2 - step, yb + R * .82); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = '#f4e6d2';
    ctx.beginPath(); ctx.ellipse(x, yb + R * .28, R * .46, R * .42, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(x, yb - R * .04, R * .96, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x, yb - R * .04, R * .96, R * .5, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = dk;
    [[-.5, -.3, .2], [.42, -.34, .16], [0, -.62, .14]].forEach(function (sp2) {
      ctx.beginPath(); ctx.ellipse(x + sp2[0] * R, yb + sp2[1] * R, sp2[2] * R, sp2[2] * R * .8, 0, 0, 6.283); ctx.fill();
    });
    ctx.fillStyle = '#fff';
    [-1, 1].forEach(function (sd) {
      ctx.beginPath(); ctx.arc(x + sd * R * .22, yb + R * .3, R * .13, 0, 6.283); ctx.fill();
    });
    ctx.fillStyle = '#141826';
    [-1, 1].forEach(function (sd) {
      ctx.beginPath(); ctx.arc(x + sd * R * .22, yb + R * .3, R * .06, 0, 6.283); ctx.fill();
    });
    return;
  }
  if (sp === 'lizard') {
    // 疾風蜥：細長身體＋甩尾＋四條腿，跑很快
    ctx.strokeStyle = dk; ctx.lineWidth = Math.max(1.6, R * .16); ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - look * R * .7, yb + R * .1);
    ctx.quadraticCurveTo(x - look * R * 1.5, yb + R * .05 + Math.sin(w * 12) * R * .24, x - look * R * 2.0, yb + R * .3);
    ctx.stroke();
    ctx.lineWidth = Math.max(1.4, R * .11);
    [-1, 1].forEach(function (sd) {
      ctx.beginPath(); ctx.moveTo(x + sd * R * .3, yb + R * .3); ctx.lineTo(x + sd * R * .5 + step * sd, yb + R * .8); ctx.stroke();
    });
    ctx.lineWidth = 1;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(x, yb + R * .16, R * .82, R * .46, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = dk;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * R * .34 - R * .1, yb - R * .1);
      ctx.lineTo(x + i * R * .34, yb - R * .48);
      ctx.lineTo(x + i * R * .34 + R * .1, yb - R * .1);
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(x + look * R * .78, yb - R * .1, R * .4, R * .32, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#141826';
    ctx.beginPath(); ctx.arc(x + look * R * .95, yb - R * .2, R * .1, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x + look * R * .98, yb - R * .24, R * .04, 0, 6.283); ctx.fill();
    return;
  }
  if (sp === 'bat') {
    // 蝙蝠：大翅膀＋尖耳＋小獠牙
    wings(yb - R * .2, 1.6, .8);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(x, yb, R * .5, R * .56, 0, 0, 6.283); ctx.fill();
    [-1, 1].forEach(function (sd) {
      ctx.beginPath();
      ctx.moveTo(x + sd * R * .16, yb - R * .42);
      ctx.lineTo(x + sd * R * .48, yb - R * .95);
      ctx.lineTo(x + sd * R * .5, yb - R * .3);
      ctx.closePath(); ctx.fill();
    });
    eyes(0, R * .02, R * .12, R * .15);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(x - R * .18, yb + R * .34); ctx.lineTo(x - R * .1, yb + R * .5); ctx.lineTo(x - R * .02, yb + R * .34); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + R * .18, yb + R * .34); ctx.lineTo(x + R * .1, yb + R * .5); ctx.lineTo(x + R * .02, yb + R * .34); ctx.closePath(); ctx.fill();
    return;
  }
  if (sp === 'ghost') {
    // 幽靈：飄浮身體＋波浪下擺＋半透明翅膀
    wings(yb - R * .1, 1.35, .42);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(x, yb - R * .05, R * .82, Math.PI, 0); ctx.fill();
    ctx.fillRect(x - R * .82, yb - R * .05, R * 1.64, R * .52);
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      ctx.arc(x - R * .55 + i * R * .55, yb + R * .47, R * .28, 0, Math.PI);
    }
    ctx.fill();
    ctx.fillStyle = 'rgba(160,200,255,.5)';
    ctx.beginPath(); ctx.ellipse(x - R * .3, yb - R * .45, R * .26, R * .14, -.4, 0, 6.283); ctx.fill();
    eyes(0, -R * .1, R * .14, R * .2);
    ctx.fillStyle = '#141826';
    ctx.beginPath(); ctx.ellipse(x, yb + R * .3, R * .2, R * .13, 0, 0, 6.283); ctx.fill();
    return;
  }
  if (sp === 'bee') {
    // 毒蜂：條紋身體＋翅膀＋尾針
    wings(yb - R * .34, 1.3, .66);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(x, yb + R * .06, R * .62, R * .52, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#2b2118';
    [-.18, .12, .4].forEach(function (o) {
      ctx.beginPath(); ctx.ellipse(x, yb + R * o, R * .62 * Math.sqrt(Math.max(.1, 1 - o * o * 1.3)), R * .1, 0, 0, 6.283); ctx.fill();
    });
    ctx.fillStyle = dk;
    ctx.beginPath(); ctx.moveTo(x, yb + R * .56); ctx.lineTo(x - R * .12, yb + R * .96); ctx.lineTo(x + R * .12, yb + R * .56); ctx.closePath(); ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(x, yb - R * .4, R * .34, 0, 6.283); ctx.fill();
    eyes(0, -R * .44, R * .1, R * .12);
    ctx.strokeStyle = '#2b2118'; ctx.lineWidth = 1.2;
    [-1, 1].forEach(function (sd) {
      ctx.beginPath(); ctx.moveTo(x + sd * R * .16, yb - R * .66); ctx.quadraticCurveTo(x + sd * R * .4, yb - R * .9, x + sd * R * .3, yb - R * 1.0); ctx.stroke();
    });
    ctx.lineWidth = 1;
    return;
  }
  // 眼球怪
  wings(yb - R * .1, 1.25, .5);
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.arc(x, yb, R * .86, 0, 6.283); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ctx.beginPath(); ctx.arc(x - R * .28, yb - R * .32, R * .2, 0, 6.283); ctx.fill();
  ctx.fillStyle = dk;
  ctx.beginPath(); ctx.arc(x + look * R * .1, yb, R * .46, 0, 6.283); ctx.fill();
  ctx.fillStyle = '#141826';
  ctx.beginPath(); ctx.arc(x + look * R * .1, yb, R * .24, 0, 6.283); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x + look * R * .18 - R * .06, yb - R * .12, R * .1, 0, 6.283); ctx.fill();
  ctx.strokeStyle = 'rgba(200,60,90,.45)'; ctx.lineWidth = 1.1;
  for (let i = 0; i < 4; i++) {
    const a = i * 1.57 + .4;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * R * .55, yb + Math.sin(a) * R * .55);
    ctx.lineTo(x + Math.cos(a) * R * .82, yb + Math.sin(a) * R * .82);
    ctx.stroke();
  }
  ctx.lineWidth = 1;
}
'''

key = "    // 飛行怪：幽靈身體＋拍動的翅膀"
k = s.find(key)
assert k > 0, 'anchor not found'
start = s.rfind("\n", 0, k - 1) + 1          # 該行開頭（if (e.kind === 'fly') {）
start = s.rfind("  if (e.kind === 'fly') {", 0, k)
assert start > 0, 'if-line not found'
endm = "// 柔和陰影（兩層橢圓疊出漸層，比每幀建 gradient 便宜）"
e = s.find(endm, k)
assert e > 0, 'end anchor not found'
slice_ = s[start:e]
assert '小外星人' in slice_, 'slice 不含小外星人，範圍不對'
assert len(slice_) < 9000, 'slice 太大（%d），可能吃錯範圍' % len(slice_)

s = s[:start] + ART + '\n' + s[e:]
io.open(P, 'w', encoding='utf-8').write(s)
print('art replaced, removed %d chars, file lines=%d' % (len(slice_), s.count('\n')))
