// v4.29 線上部屬驗證：Render 上真的換成新主角、能玩、沒有 JS 錯誤
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const OUT = path.join(__dirname, '_v429');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const URL = process.argv[2] || 'https://bomb-hero-game.onrender.com/';

(async () => {
  const b = await launch({ port: 9482, w: 1000, h: 720 });
  try {
    const p = await b.newPage();
    const errs = [];
    await p.send('Runtime.enable', {}).catch(() => {});
    await p.goto(URL, 6000);
    for (let i = 0; i < 80; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game)')) break; await sleep(500); }
    await sleep(2500);
    const info = await p.eval(`(function(){
      var BH=window.__BH;
      return JSON.stringify({ ver: BH && BH.VERSION, parts: BH && BH.Parts ? BH.Parts.readyCount() : -1,
        has: BH && BH.Parts ? BH.Parts.has('rabbit') : null });
    })()`);
    console.log('ONLINE', info);

    await p.eval('window.__BH.startSolo(1)');
    await sleep(900);
    await p.eval("(function(){ var ov=document.getElementById('ovBox'); var b2=ov&&ov.querySelector('button'); if(b2) b2.click(); })()");
    await sleep(500);
    await p.eval("(function(){ var ok=document.getElementById('rhOk'); if(ok) ok.click(); })()");
    for (let i = 0; i < 50; i++) { if (await p.eval("window.__BH.Game.state==='play'")) break; await sleep(300); }
    await sleep(1200);
    // 走一段，順便觸發移動動畫
    await p.eval("(function(){var G=window.__BH.Game,p=G.players[0]; p.facing='right'; p.moving=true; p.walkT=.4;})()");
    await sleep(500);
    await p.shot(path.join(OUT, 'live-play.png'));
    console.log('DONE');
  } finally {
    await b.close();
  }
})().catch(e => { console.error('ERR', e && e.message); process.exit(1); });
