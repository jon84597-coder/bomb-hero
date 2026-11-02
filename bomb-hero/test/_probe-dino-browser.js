// test/_probe-dino-browser.js — 真瀏覽器探針：對戰模式龍吐火
const path = require('path');
const { launch, sleep } = require('./cdp');
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

(async () => {
  const b = await launch({ port: 9581, w: 900, h: 650 });
  try {
    const p = await b.newPage();
    await p.send('Emulation.setDeviceMetricsOverride', { width: 900, height: 650, deviceScaleFactor: 1, mobile: false });
    await p.goto(URL, 3000);
    for (let i = 0; i < 60; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game)')) break; await sleep(250); }
    await p.eval(`(function(){
      var P=window.__BH;
      P.settings.size='M'; P.settings.count=2; P.settings.ctrl='kb'; P.settings.hazards='off';
      P.settings.sd='off'; P.settings.revenge='off';
      P.Battle.resetSlots(); P.startBattle();
    })()`);
    await sleep(600);
    await p.eval("(function(){var ov=document.getElementById('ovBox');var b2=ov&&ov.querySelector('button');if(b2)b2.click();})()");
    for (let i=0;i<40;i++){ if (await p.eval("window.__BH.Game.state==='play'")) break; await sleep(200); }
    const info = await p.eval(`(function(){
      var G=window.__BH.Game, T=G.T;
      var p0=G.players[0], p1=G.players[1];
      p1.ai=false;
      // 找一條乾淨走廊
      var found=null;
      for(var y=2;y<G.rows-2&&!found;y++)for(var x=2;x<G.cols-4;x++){
        if(G.grid[y][x]===0&&G.grid[y][x+1]===0&&G.grid[y][x+2]===0){found=[x,y];break;}
      }
      var cx=found[0], cy=found[1];
      p0.x=cx*T+T/2; p0.y=cy*T+T/2; p0.alive=true; p0.invuln=0; p0.carry=null;
      p1.x=(cx+1)*T+T/2; p1.y=cy*T+T/2; p1.alive=true; p1.invuln=0; p1.carry=null;
      G.bombs.length=0; G.flames.length=0;
      p0.dino=true; p0.redDragon=false; p0.fireCd=0; p0.facing='right';
      return JSON.stringify({mode:G.mode,state:G.state,T:T,cx:cx,cy:cy,
        p0:[Math.round(p0.x),Math.round(p0.y)],p1:[Math.round(p1.x),Math.round(p1.y)]});
    })()`);
    console.log('setup', info);
    await p.eval('window.__BH.fireBreath(window.__BH.Game.players[0])');
    await sleep(120);
    console.log('flames', await p.eval('JSON.stringify(window.__BH.Game.flames.map(function(f){return [f.cx,f.cy,f.src];}))'));
    await sleep(500);
    console.log('after', await p.eval(`(function(){var G=window.__BH.Game,p1=G.players[1];
      return JSON.stringify({alive:p1.alive,dead:p1.dead,cart:p1.cart,dino:p1.dino,invuln:p1.invuln,
        wins:G.players.map(function(p){return p.wins;}),mode:G.mode,state:G.state});})()`));
  } finally { await b.close(); }
})().catch(e => { console.error('ERR', e && e.message); process.exit(1); });
