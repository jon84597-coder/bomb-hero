const { launch, sleep } = require('./cdp');
const path = require('path'); const fs = require('fs');
const OUT = path.resolve(__dirname, '_v535');
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await launch({ port: 9901, w: 430, h: 932 });
  try {
    const p = await b.newPage();
    await p.goto('file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/') + '?auto=1', 9000);
    for (let i = 0; i < 100; i++) { if (await p.eval('!!(window.__BH && window.__BH.Game)')) break; await sleep(250); }
    await sleep(800);
    await p.eval(`(function(){
      var BH = window.__BH, G = BH.Game;
      BH.BR.opt = { n: 20, team: 1, dur: 10 };
      BH.settings.ctrl = 'kb'; BH.startBR(); G.state='play';
      setInterval(function(){ ['ovBox','tutMask','tutCard','tutMini','banner'].forEach(function(id){var el=document.getElementById(id);if(el)el.style.display='none';}); G.bannerT=0; },50);
      var T=G.T, bx=-1, by=-1;
      for (var y=10;y<G.rows-10&&bx<0;y++) for (var x=10;x<G.cols-10;x++){
        if(G.brIsl[y][x]<0) continue; var okk=true;
        for(var dy=-3;dy<=3&&okk;dy++)for(var dx=-3;dx<=3;dx++){if(G.grid[y+dy][x+dx]!==0){okk=false;break;}}
        if(okk){bx=x;by=y;break;}
      }
      var me=G.players[0]; me.invuln=99; me.alive=true; me.dead=false;
      me.x=(bx+.5)*T; me.y=(by+2.5)*T; G.camSnap=true; G.brNukeCd=1e9; G.brZone.done=true;
      G.enemies.length=0;
      G.items.length=0;
      G.items.push({cx:bx-1,cy:by+2,type:'coin',bob:0.0,amount:12});
      G.items.push({cx:bx+1,cy:by+2,type:'coin',bob:1.2,amount:12});
      G.items.push({cx:bx,cy:by+3,type:'fire',bob:2.4});
      G.time=FROZEN; G.state='roundover';
      G.zoom=2.2;
      return 1;
    })()`.replace('FROZEN','0'));
    await sleep(500);
    for (const nm of ['coin-zoom.png']) {
      const r = await p.eval(`JSON.stringify((function(){
        var BH=window.__BH,G=BH.Game;var rc=document.getElementById('cv').getBoundingClientRect();
        var sp=BH.playerScreenPos(G.players[0]);var T=G.T,z=G.zoom||1;
        return {cx:rc.x+sp.x,cy:rc.y+sp.y,T:T*z,w:rc.width,h:rc.height};})())`);
      const o = JSON.parse(r);
      const w = 3.2 * o.T, h = 2.6 * o.T;
      let x = Math.max(0, o.cx - w/2), y = Math.max(0, o.cy - h/2);
      const shot = await p.send('Page.captureScreenshot', { format:'png', clip:{ x:x, y:y, width:Math.min(w,o.w-x), height:Math.min(h,o.h-y), scale:4 } });
      fs.writeFileSync(path.join(OUT, nm), Buffer.from(shot.data,'base64'));
      console.log('截圖', nm);
    }
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
