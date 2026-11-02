// v4.37：遊戲內實景（看放大後的小怪在畫面裡的密度與比例）
// 用法：node test/shot-v437-ingame.js [stage...]
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const OUT = path.join(__dirname, '_v437');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) { }
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const STAGES = (process.argv.slice(2).length ? process.argv.slice(2) : ['1', '16', '28']).map(Number);

(async () => {
  const b = await launch({ port: 9533, w: 1180, h: 760 });
  try {
    const p = await b.newPage();
    for (const st of STAGES) {
      await p.goto(URL, 2200);
      for (let i = 0; i < 60; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game)')) break; await sleep(250); }
      await p.eval('window.__BH.startSolo(' + st + ')');
      await sleep(500);
      await p.eval("(function(){ var ov=document.getElementById('ovBox'); var b2=ov&&ov.querySelector('button'); if(b2) b2.click(); })()");
      await sleep(300);
      await p.eval("(function(){ var ok=document.getElementById('rhOk'); if(ok) ok.click(); })()");
      for (let i = 0; i < 40; i++) { if (await p.eval("window.__BH.Game.state==='play'")) break; await sleep(200); }
      await sleep(700);

      const info = await p.eval(`(function(){
        var BH=window.__BH, G=BH.Game, p=G.players[0];
        // 找怪物最密的一格當相機中心
        var best=null, bestN=-1;
        G.enemies.forEach(function(e){
          var n=0; G.enemies.forEach(function(o){ if(Math.abs(o.x-e.x)<G.T*2.2 && Math.abs(o.y-e.y)<G.T*1.6) n++; });
          if(n>bestN){ bestN=n; best=e; }
        });
        if(!best) return { n:0 };
        p.x = best.x; p.y = best.y; p.invuln = 999; p.hitT = -9;
        G.zoom = 1; G.zoomTarget = 1; G.camSnap = true;
        G.enemies.forEach(function(e){ e.aggro = false; e.dashT = 0; e.windT = 0; });
        return { n: G.enemies.length, kinds: G.enemies.map(function(e){return e.type;}).join(',') };
      })()`);
      await sleep(500);
      await p.eval('window.__BH.Game.camSnap = true');
      await sleep(300);
      const f = path.join(OUT, 'ingame-s' + st + '.png');
      await p.shot(f);
      console.log('stage', st, '怪', info.n, '→', path.basename(f), info.kinds || '');
    }
  } finally {
    await b.close();
  }
})();
