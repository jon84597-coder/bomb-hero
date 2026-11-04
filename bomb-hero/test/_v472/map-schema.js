// test/_v472/map-schema.js — 大逃殺地圖示意圖（整張縮圖：八區地形／軟硬牆／出生點／毒圈）
const { launch, sleep } = require('../cdp');
const path = require('path');
const fs = require('fs');
const URL = 'file:///' + path.join(__dirname, '../../index.html').replace(/\\/g, '/');
const OUT = path.join(__dirname, 'map-schema.png');

(async function () {
  const b = await launch({ port: 9620, w: 390, h: 844 });
  const p = await b.newPage();
  await p.goto(URL, 3200);
  for (let i = 0; i < 40; i++) {
    if (await p.eval('typeof __BH') === 'object') break;
    await sleep(300);
  }
  const res = await p.eval(`(function(){
    var G = __BH.Game, BR = __BH.BR;
    var info = __BH.buildBRMap();
    var C = 12, W = G.cols * C, H = G.rows * C;
    var cv = document.createElement('canvas');
    cv.width = W + 24; cv.height = H + 40;
    var g = cv.getContext('2d');
    g.fillStyle = '#08131f'; g.fillRect(0, 0, cv.width, cv.height);
    g.translate(12, 12);
    var regCol = ['#c9a86a', '#8fd4ea', '#e0895a', '#b48fe0', '#7fe0b0', '#e0d06a', '#e08fb0', '#7f9fe0'];
    for (var y = 0; y < G.rows; y++) for (var x = 0; x < G.cols; x++) {
      var i = G.brIsl[y][x], st = G.grid[y][x];
      var px = x * C, py = y * C;
      if (i < 0) { g.fillStyle = '#0d2133'; g.fillRect(px, py, C, C); continue; }
      if (st === 1) { g.fillStyle = '#2b3f5c'; g.fillRect(px, py, C, C); continue; }
      g.fillStyle = regCol[i % 8]; g.fillRect(px, py, C, C);
      if (st === 2) { g.fillStyle = 'rgba(0,0,0,.42)'; g.fillRect(px + 1, py + 1, C - 2, C - 2); }
    }
    var hideN = 0;
    for (var y2 = 0; y2 < G.rows; y2++) for (var x2 = 0; x2 < G.cols; x2++) {
      var hz = G.hazards[y2][x2];
      if (hz && hz.type === 'hide') {
        g.fillStyle = '#39d98a';
        g.fillRect(x2 * C + 2, y2 * C + 2, C - 4, C - 4); hideN++;
      }
    }
    info.spawns.forEach(function (s, k) {
      g.beginPath();
      g.arc((s.x + .5) * C, (s.y + .5) * C, C * .48, 0, 6.2832);
      g.fillStyle = k === 0 ? '#ffffff' : '#59e08a'; g.fill();
      g.strokeStyle = '#0b1420'; g.lineWidth = 1.2; g.stroke();
      if (k === 0) {
        g.fillStyle = '#0b1420'; g.font = 'bold 9px sans-serif';
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('我', (s.x + .5) * C, (s.y + .5) * C + .5);
      }
    });
    var z = G.brZone;
    if (z) {
      g.beginPath();
      g.arc((z.cx + .5) * C, (z.cy + .5) * C, z.r * C, 0, 6.2832);
      g.strokeStyle = 'rgba(206,112,238,.95)'; g.lineWidth = 2; g.setLineDash([6, 4]); g.stroke();
      g.setLineDash([]);
    }
    g.fillStyle = '#e8eef6'; g.font = '11px sans-serif'; g.textAlign = 'left';
    g.fillText('八色 = 八塊地形區　深藍 = 硬牆　暗格 = 軟磚(可炸)　綠方 = 躲人物件　白點 = 你　綠點 = AI　虛線 = 初始毒圈', 2, H + 8);
    return JSON.stringify({ png: cv.toDataURL('image/png'), hideN: hideN,
      spawns: info.spawns.length, land: info.landN, hard: info.hardN, soft: info.softN });
  })()`);
  const o = JSON.parse(res);
  fs.writeFileSync(OUT, Buffer.from(o.png.split(',')[1], 'base64'));
  console.log('saved', OUT, 'spawns', o.spawns, 'land', o.land, 'hard', o.hard, 'soft', o.soft, 'hide', o.hideN);
  b.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
