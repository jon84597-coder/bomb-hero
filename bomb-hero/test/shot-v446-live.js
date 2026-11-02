// v4.46：線上實機截圖（八個主題的地面）—— 驗證真的部署上去了
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const URL = process.env.BH_LIVE_URL || 'https://bomb-hero-game.onrender.com/';
const OUT = path.join(__dirname, '_v446live');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) { }

async function shoot(port, stage) {
  const b = await launch({ port: port, w: 1440, h: 980 });
  const p = await b.newPage();
  await p.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 980, deviceScaleFactor: 1, mobile: false });
  await p.goto(URL, 3500);
  for (let i = 0; i < 90; i++) {
    if (await p.eval('!!(window.__BH && window.__BH.Game)')) break;
    await sleep(400);
  }
  await p.eval('window.__BH.startSolo(' + stage + ')');
  for (let i = 0; i < 60; i++) {
    if (await p.eval('window.__BH.TileArt && window.__BH.TileArt.readyCount() >= window.__BH.TileArt.total()')) break;
    await sleep(300);
  }
  console.log('  [stage' + stage + '] tiles', await p.eval('window.__BH.TileArt.readyCount() + "/" + window.__BH.TileArt.total()'));
  await sleep(700);
  await p.eval("(function(){ var ov=document.getElementById('ovBox'); var b2=ov&&ov.querySelector('button'); if(b2) b2.click(); })()");
  for (let i = 0; i < 40; i++) { if (await p.eval("window.__BH.Game.state==='play'")) break; await sleep(200); }
  await p.eval(`(function(){
    var G=window.__BH.Game; G.players[0].invuln=0;
    ['doorHint','annBox','toast'].forEach(function(id){ var a=document.getElementById(id); if(a) a.style.display='none'; });
  })()`);
  await sleep(500);
  const full = await p.eval(`document.getElementById('cv').toDataURL('image/png')`);
  fs.writeFileSync(path.join(OUT, 'stage' + stage + '.png'), Buffer.from(full.split(',')[1], 'base64'));
  await b.close();
}

(async () => {
  const list = [[9611, 1], [9613, 13], [9615, 21], [9617, 29]];
  for (const [port, st] of list) await shoot(port, st);
  console.log('  saved ->', OUT);
})();
