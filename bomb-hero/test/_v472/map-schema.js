// test/_v472/map-schema.js — 大逃殺地圖示意圖（整張 48x38 縮圖，看三島＋兩座橋）
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
    var C = 14, W = G.cols * C, H = G.rows * C;
    var cv = document.createElement('canvas');
    cv.width = W + 24; cv.height = H + 44;
    var g = cv.getContext('2d');
    g.fillStyle = '#08131f'; g.fillRect(0, 0, cv.width, cv.height);
    g.translate(12, 12);
    // 島的色（用主題風格分色）
    var islCol = ['#c9a86a', '#8fd4ea', '#e0895a'];
    var softCol = ['#7a5a35', '#4a7d96', '#96502f'];
    for (var y = 0; y < G.rows; y++) for (var x = 0; x < G.cols; x++) {
      var i = G.brIsl[y][x], st = G.grid[y][x];
      var px = x * C, py = y * C;
      if (i < 0) { g.fillStyle = '#0d2133'; g.fillRect(px, py, C, C); continue; }
      if (st === 1) { g.fillStyle = '#2b3f5c'; g.fillRect(px, py, C, C); continue; }
      g.fillStyle = islCol[i]; g.fillRect(px, py, C, C);
      if (st === 2) { g.fillStyle = softCol[i]; g.fillRect(px + 1, py + 1, C - 2, C - 2); }
    }
    // 出生點
    info.spawns.forEach(function (s, k) {
      g.beginPath();
      g.arc((s.x + .5) * C, (s.y + .5) * C, C * .55, 0, 6.2832);
      g.fillStyle = k === 0 ? '#ffffff' : '#59e08a'; g.fill();
      g.strokeStyle = '#0b1420'; g.lineWidth = 1.5; g.stroke();
      g.fillStyle = '#0b1420'; g.font = 'bold 11px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(k + 1), (s.x + .5) * C, (s.y + .5) * C);
    });
    // 毒圈（最外圈初始半徑）
    var z = G.brZone;
    if (z) {
      g.beginPath();
      g.arc((z.cx + .5) * C, (z.cy + .5) * C, z.r * C, 0, 6.2832);
      g.strokeStyle = 'rgba(206,112,238,.95)'; g.lineWidth = 2; g.setLineDash([6, 4]); g.stroke();
      g.setLineDash([]);
    }
    // 島名標記
    g.font = 'bold 13px sans-serif'; g.textAlign = 'center'; g.fillStyle = 'rgba(8,19,31,.85)';
    var names = ['島 1（左）', '島 2（右上）', '島 3（下）'];
    for (var k2 = 0; k2 < 3; k2++) {
      var c = BR.ISL[k2];
      g.fillText(names[k2], (c.cx + .5) * C, (c.cy - c.r - .6) * C);
    }
    // 圖例
    g.fillStyle = '#e8eef6'; g.font = '11px sans-serif'; g.textAlign = 'left';
    g.fillText('島1', 2, H + 10); g.fillStyle = '#c9a86a'; g.fillRect(30, H + 1, 10, 10);
    g.fillStyle = '#e8eef6'; g.fillText('島2', 50, H + 10); g.fillStyle = '#8fd4ea'; g.fillRect(78, H + 1, 10, 10);
    g.fillStyle = '#e8eef6'; g.fillText('島3', 98, H + 10); g.fillStyle = '#e0895a'; g.fillRect(126, H + 1, 10, 10);
    g.fillStyle = '#e8eef6'; g.fillText('淺色=可走  深藍=岩層  實心方=軟磚  白點=你  綠點=AI  虛線=初始毒圈', 150, H + 10);
    return cv.toDataURL('image/png');
  })()`);
  fs.writeFileSync(OUT, Buffer.from(res.split(',')[1], 'base64'));
  console.log('saved', OUT, fs.statSync(OUT).size);
  b.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
