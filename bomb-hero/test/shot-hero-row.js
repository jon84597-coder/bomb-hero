// 把 8 隻主角用「同一段程式」畫成一排並輸出 PNG —— 用來比對新舊美術的大小是否一致
// 用法：node test/shot-hero-row.js <html路徑> <輸出名>
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');

const FILE = process.argv[2] || path.resolve(__dirname, '../index.html');
const OUTNAME = process.argv[3] || 'row.png';
const OUT = path.join(__dirname, '_v429');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const URL = 'file:///' + path.resolve(FILE).replace(/\\/g, '/');

(async () => {
  const b = await launch({ port: 9480, w: 900, h: 420 });
  try {
    const p = await b.newPage();
    await p.goto(URL, 2400);
    for (let i = 0; i < 60; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Parts)')) break; await sleep(300); }
    await sleep(2200);   // 等 8 隻部件圖解碼完

    const data = await p.eval(`(function(){
      var BH = window.__BH;
      var ids = ['rabbit','bear','dog','cat','pig','panda','frog','chick'];
      var H = 150, W = 8 * 108 + 20;
      var c = document.createElement('canvas');
      c.width = W; c.height = 470;
      var g = c.getContext('2d');
      var bg = g.createLinearGradient(0,0,0,470);
      bg.addColorStop(0,'#2c4a2a'); bg.addColorStop(1,'#1d331c');
      g.fillStyle = bg; g.fillRect(0,0,W,470);
      g.strokeStyle = 'rgba(255,255,255,.10)'; g.lineWidth = 1;
      for (var yy = 60; yy <= 470; yy += 50) { g.beginPath(); g.moveTo(0,yy); g.lineTo(W,yy); g.stroke(); }
      var ready = [];
      ids.forEach(function(id, i){
        var box = 78 + i * 108;
        // 站姿
        var r1 = BH.drawRigChar(g, id, box, 205, H, { walk: 0, moving: false, facing: 'down', idle: 0 });
        // 走路中（抬腳＋擺手）
        BH.drawRigChar(g, id, box, 440, H, { walk: 1.2, moving: true, facing: 'right', idle: 0 });
        ready.push([id, !!r1, r1 ? Math.round(r1.W) + 'x' + Math.round(r1.H) : 'null']);
      });
      g.font = '11px sans-serif'; g.textAlign = 'center'; g.fillStyle = '#cfe8c8';
      ids.forEach(function(id, i){ g.fillText(id, 78 + i*108, 20); });
      return JSON.stringify({ png: c.toDataURL('image/png'), ready: ready });
    })()`);

    const o = JSON.parse(data);
    console.log('READY', JSON.stringify(o.ready));
    fs.writeFileSync(path.join(OUT, OUTNAME), Buffer.from(o.png.split(',')[1], 'base64'));
    console.log('saved', OUTNAME);
  } finally {
    await b.close();
  }
})().catch(e => { console.error('ERR', e && e.message); process.exit(1); });
