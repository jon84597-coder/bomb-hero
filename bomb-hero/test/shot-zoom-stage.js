// 指定 html 進遊戲、固定縮放、拍整體畫面（新舊美術比大小用）
// 用法：node test/shot-zoom-stage.js <html> <輸出png> [stage] [zoom]
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const OUT = path.join(__dirname, '_v430');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const FILE = process.argv[2] || path.resolve(__dirname, '../index.html');
const PNG = process.argv[3] || 'z.png';
const STAGE = parseInt(process.argv[4] || '4', 10);
const ZOOM = parseFloat(process.argv[5] || '2');
const URL = 'file:///' + path.resolve(FILE).replace(/\\/g, '/');

(async () => {
  const b = await launch({ port: 9488, w: 1000, h: 700 });
  try {
    const p = await b.newPage();
    await p.send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 700, deviceScaleFactor: 1, mobile: false });
    await p.goto(URL, 2600);
    for (let i = 0; i < 60; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game)')) break; await sleep(300); }
    await p.eval('window.__BH.startSolo(' + STAGE + ')');
    await sleep(600);
    await p.eval("(function(){ var ov=document.getElementById('ovBox'); var b2=ov&&ov.querySelector('button'); if(b2) b2.click(); })()");
    await sleep(350);
    await p.eval("(function(){ var ok=document.getElementById('rhOk'); if(ok) ok.click(); })()");
    for (let i = 0; i < 40; i++) { if (await p.eval("window.__BH.Game.state==='play'")) break; await sleep(250); }
    await sleep(800);
    // 把所有小怪集中到玩家附近（同一區），方便同框比較
    await p.eval(`(function(){
      var G=window.__BH.Game, T=G.T, p=G.players[0];
      G.zoom=${ZOOM}; G.zoomTarget=${ZOOM}; G.camSnap=true;
      var i=0;
      G.enemies.forEach(function(e){
        e.x = p.x + ((i%4)-1.5) * T * 1.4;
        e.y = p.y - T * (1.2 + Math.floor(i/4) * 1.4);
        e.dirName = (i%2) ? 'left' : 'right'; e.dirT=99; e.aggro=false;
        i++;
      });
    })()`);
    await sleep(700);
    await p.shot(path.join(OUT, PNG));
    console.log('saved', PNG);
  } finally { await b.close(); }
})().catch(e => { console.error('ERR', e && e.message); process.exit(1); });
