// v4.45b：地面貼圖實機截圖（第一大關草地 / 第二大關沙地）
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const OUT = path.join(__dirname, '_v445b');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) { }
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

async function shoot(port, stage, tag) {
  const b = await launch({ port: port, w: 1440, h: 980 });
  const p = await b.newPage();
  await p.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 980, deviceScaleFactor: 1, mobile: false });
  await p.goto(URL, 2600);
  for (let i = 0; i < 60; i++) {
    if (await p.eval('!!(window.__BH && window.__BH.Game)')) break;
    await sleep(200);
  }
  await p.eval('window.__BH.startSolo(' + stage + ')');
  for (let i = 0; i < 40; i++) {
    if (await p.eval('window.__BH.TileArt && window.__BH.TileArt.readyCount() >= 17')) break;
    await sleep(200);
  }
  console.log('  [' + tag + '] tiles', await p.eval('window.__BH.TileArt.readyCount() + "/" + window.__BH.TileArt.total()'));
  await sleep(700);
  await p.eval("(function(){ var ov=document.getElementById('ovBox'); var b2=ov&&ov.querySelector('button'); if(b2) b2.click(); })()");
  await sleep(300);
  for (let i = 0; i < 40; i++) { if (await p.eval("window.__BH.Game.state==='play'")) break; await sleep(200); }
  await p.eval(`(function(){
    var G=window.__BH.Game;
    G.players[0].invuln=0;
    ['doorHint','annBox','toast'].forEach(function(id){ var a=document.getElementById(id); if(a) a.style.display='none'; });
  })()`);
  await sleep(500);
  const full = await p.eval(`document.getElementById('cv').toDataURL('image/png')`);
  fs.writeFileSync(path.join(OUT, tag + '-full.png'), Buffer.from(full.split(',')[1], 'base64'));

  const crop = await p.eval(`(function(){
    var cv=document.getElementById('cv');
    var c2=document.createElement('canvas'); c2.width=520; c2.height=520;
    c2.getContext('2d').drawImage(cv, 40, 40, 520, 520, 0, 0, 520, 520);
    return c2.toDataURL('image/png');
  })()`);
  fs.writeFileSync(path.join(OUT, tag + '-crop.png'), Buffer.from(crop.split(',')[1], 'base64'));
  await b.close();
}

(async () => {
  await shoot(9493, 1, 'stage1');
  await shoot(9495, 5, 'stage5');
  console.log('  saved ->', OUT);
})();
