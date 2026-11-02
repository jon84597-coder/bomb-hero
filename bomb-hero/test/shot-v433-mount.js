// v4.33：龍坐騎新美術（原色／紅色）＋ 體積縮 15%／騎乘者放大 20%
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const OUT = path.join(__dirname, '_v433');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) { }
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const STAGE = parseInt(process.argv[2] || '1', 10);

(async () => {
  const b = await launch({ port: 9544, w: 1000, h: 700 });
  try {
    const p = await b.newPage();
    await p.send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 700, deviceScaleFactor: 1, mobile: false });
    await p.goto(URL, 3000);
    for (let i = 0; i < 80; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game)')) break; await sleep(300); }
    // 等坐騎圖載入
    for (let i = 0; i < 40; i++) {
      const n = await p.eval("(function(){try{return window.__BH.MountArt.readyCount();}catch(e){return -1;}})()");
      if (n >= 2) break;
      await sleep(250);
    }
    console.log('mountReady', await p.eval("window.__BH.MountArt.readyCount()"));
    await p.eval('window.__BH.startSolo(' + STAGE + ')');
    await sleep(700);
    await p.eval("(function(){ var ov=document.getElementById('ovBox'); var b2=ov&&ov.querySelector('button'); if(b2) b2.click(); })()");
    await sleep(400);
    await p.eval("(function(){ var ok=document.getElementById('rhOk'); if(ok) ok.click(); })()");
    for (let i = 0; i < 40; i++) { if (await p.eval("window.__BH.Game.state==='play'")) break; await sleep(250); }
    await sleep(600);

    async function shot(name, red) {
      const info = await p.eval(`(function(){
        var G=window.__BH.Game, h=G.players[0];
        G.enemies.length=0;
        h.hp=h.maxHp||3; h.invuln=0; h.dizzy=0; h.cry=0; h.hurtT=0; h.alive=true;
        h.dino=true; h.dinoT=0.35; h.redDragon=${red ? 'true' : 'false'}; h.fireCd=0;
        h.moving=false; h.walkT=0.2; h.facing='right';
        h.noLabel=false;
        G.zoom=2.2; G.zoomTarget=2.2; G.camSnap=true;
        var sp=(window.MOUNT_ART||{})[${red ? "'red'" : "'green'"}];
        return JSON.stringify({T:G.T, DH:Math.round(G.T*(${red ? '1.82' : '1.70'})), asp:sp&&sp.asp});
      })()`);
      console.log(name, info);
      await sleep(700);
      await p.shot(path.join(OUT, name + '.png'));
    }
    await shot('mount-green', false);
    await shot('mount-red', true);
    console.log('saved');
  } finally { await b.close(); }
})().catch(e => { console.error('ERR', e && e.message); process.exit(1); });
