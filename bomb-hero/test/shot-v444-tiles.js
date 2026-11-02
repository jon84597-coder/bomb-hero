// v4.44：第一大關場景貼圖實機截圖
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const OUT = path.join(__dirname, '_v444');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) { }
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

(async () => {
  const b = await launch({ port: 9491, w: 1440, h: 980 });
  const p = await b.newPage();
  await p.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 980, deviceScaleFactor: 1, mobile: false });
  await p.goto(URL, 2600);
  for (let i = 0; i < 60; i++) {
    if (await p.eval('!!(window.__BH && window.__BH.Game)')) break;
    await sleep(200);
  }
  await p.eval('window.__BH.startSolo(1)');
  for (let i = 0; i < 40; i++) {
    if (await p.eval('window.__BH.TileArt && window.__BH.TileArt.readyCount() >= 12')) break;
    await sleep(200);
  }
  console.log('  tiles', await p.eval('window.__BH.TileArt.readyCount() + "/" + window.__BH.TileArt.total()'));
  await sleep(700);
  await p.eval("(function(){ var ov=document.getElementById('ovBox'); var b2=ov&&ov.querySelector('button'); if(b2) b2.click(); })()");
  await sleep(300);
  for (let i = 0; i < 40; i++) { if (await p.eval("window.__BH.Game.state==='play'")) break; await sleep(200); }
  await p.eval(`(function(){
    var G=window.__BH.Game;
    G.players[0].invuln=0;
    var a=document.getElementById('doorHint'); if(a) a.style.display='none';
    var b3=document.getElementById('annBox'); if(b3) b3.style.display='none';
    var c=document.getElementById('toast'); if(c) c.style.display='none';
  })()`);
  await sleep(500);
  const full = await p.eval(`document.getElementById('cv').toDataURL('image/png')`);
  fs.writeFileSync(path.join(OUT, 'stage1-full.png'), Buffer.from(full.split(',')[1], 'base64'));

  const crop = await p.eval(`(function(){
    var cv=document.getElementById('cv');
    var c2=document.createElement('canvas'); c2.width=560; c2.height=560;
    c2.getContext('2d').drawImage(cv, 30, 30, 560, 560, 0, 0, 560, 560);
    return c2.toDataURL('image/png');
  })()`);
  fs.writeFileSync(path.join(OUT, 'stage1-crop.png'), Buffer.from(crop.split(',')[1], 'base64'));
  console.log('  saved');
  await b.close();
})();
