// v4.32：單獨看主角（確認縮 10% 後沒有畫壞、表情/腳底位置正常）
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const OUT = path.join(__dirname, '_v432');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) { }
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const STAGE = parseInt(process.argv[2] || '9', 10);

(async () => {
  const b = await launch({ port: 9536, w: 1000, h: 700 });
  try {
    const p = await b.newPage();
    await p.send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 700, deviceScaleFactor: 1, mobile: false });
    await p.goto(URL, 2800);
    for (let i = 0; i < 80; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game)')) break; await sleep(300); }
    await p.eval('window.__BH.startSolo(' + STAGE + ')');
    await sleep(700);
    await p.eval("(function(){ var ov=document.getElementById('ovBox'); var b2=ov&&ov.querySelector('button'); if(b2) b2.click(); })()");
    await sleep(400);
    await p.eval("(function(){ var ok=document.getElementById('rhOk'); if(ok) ok.click(); })()");
    for (let i = 0; i < 40; i++) { if (await p.eval("window.__BH.Game.state==='play'")) break; await sleep(250); }
    await sleep(800);
    const info = await p.eval(`(function(){
      var G=window.__BH.Game, h=G.players[0];
      G.enemies.length=0;
      h.hp=h.maxHp||3; h.invuln=0; h.dizzy=0; h.expr=null; h.hurtT=0; h.alive=true;
      G.zoom=2.6; G.zoomTarget=2.6; G.camSnap=true;
      return JSON.stringify({ animal:h.animal, x:Math.round(h.x), y:Math.round(h.y), T:G.T,
        R: window.__BH.enemyArtR ? 'n/a' : 'n/a', invuln:h.invuln });
    })()`);
    console.log('HERO', info);
    await sleep(900);
    await p.shot(path.join(OUT, 'hero-alone.png'));
    console.log('saved');
  } finally { await b.close(); }
})().catch(e => { console.error('ERR', e && e.message); process.exit(1); });
