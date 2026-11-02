// 對照組：舊版（v4.30）隨從的炸彈飛過主人 → 主人會頭暈
const path = require('path');
const { launch, sleep } = require('./cdp');
const FILE = process.argv[2];
const URL = 'file:///' + path.resolve(FILE).replace(/\\/g, '/');
(async () => {
  const b = await launch({ port: 9512, w: 800, h: 600 });
  try {
    const p = await b.newPage();
    await p.goto(URL, 2600);
    for (let i = 0; i < 60; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game)')) break; await sleep(300); }
    await p.eval('window.__BH.startSolo(1)');
    await sleep(700);
    await p.eval("(function(){ var ov=document.getElementById('ovBox'); var b2=ov&&ov.querySelector('button'); if(b2) b2.click(); })()");
    await sleep(350);
    await p.eval("(function(){ var ok=document.getElementById('rhOk'); if(ok) ok.click(); })()");
    for (let i = 0; i < 40; i++) { if (await p.eval("window.__BH.Game.state==='play'")) break; await sleep(250); }
    await sleep(400);
    const r = await p.eval(`new Promise(function(done){
      var BH=window.__BH,G=BH.Game,T=G.T,h=G.players[0];
      G.enemies.length=0;
      var pet=BH.makePet('bomber',0,0); pet.x=h.x; pet.y=h.y; G.pets=[pet];
      var cx=Math.floor(h.x/T), cy=Math.floor(h.y/T);
      h.dizzy=0;
      G.bombs.push({ cx:cx+2, cy:cy, px:(cx-2+.5)*T, py:(cy+.5)*T, timer:2.2, power:1,
        owner:pet, petOwner:pet, passers:[], remoteArmed:false, mine:false, moving:null, held:false, seed:0,
        flying:{ fx:cx-2, fy:cy, tx:cx+2, ty:cy, t:0, dur:.7,
                 path:[{x:cx-2,y:cy},{x:cx-1,y:cy},{x:cx,y:cy},{x:cx+1,y:cy},{x:cx+2,y:cy}] } });
      setTimeout(function(){ done(JSON.stringify({ ver:BH.VERSION, dizzy:+(h.dizzy||0).toFixed(2) })); }, 1500);
    })`, true, 6000);
    console.log('OLD', r);
  } finally { await b.close(); }
})().catch(e => { console.error('ERR', e && e.message); process.exit(1); });
