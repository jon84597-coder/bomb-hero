// v4.55 目檢：每一大關的外牆顏色（1/5/9/13/17/21/25/29 = 八個主題）
// 用法：node shot-v455-wall.js [tag] [stage...]
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const URL = process.env.BH_URL || ('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
const OUT = path.join(__dirname, '_v456');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) { }
const TAG = process.argv[2] || 'a';
const STAGES = (process.argv.slice(3).map(Number)).filter(Boolean);
const list = STAGES.length ? STAGES : [1, 5, 9, 13, 17, 21, 25, 29];

(async () => {
  const b = await launch({ port: 9661, w: 1280, h: 900 });
  try {
    for (const st of list) {
      const p = await b.newPage();
      await p.resize(390, 844, true);
      await p.goto(URL, 3200);
      for (let i = 0; i < 60; i++) {
        if (await p.eval('!!(window.__BH && window.__BH.Game)')) break;
        await sleep(250);
      }
      await p.eval(`(function(){
        try{ localStorage.setItem('bombhero-tut2','999'); }catch(e){}
        document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('on'); });
      })()`);
      await p.eval(`(function(){var BH=window.__BH;BH.startSolo(${st}, true);BH.Game.state='play';
        try{BH.beginCountdown('battle');}catch(e){}
        for(var i=0;i<60;i++){try{BH.updateWorld(1/60);}catch(e){}}
        try{BH.updateCamera();}catch(e){}
        try{BH.render();}catch(e){}
        BH.Game.camSnap=true;
      })()`);
      await sleep(700);
      const info = await p.eval(`(function(){
        var G=window.__BH.Game, k=G.wallKind||[], outer=0, inner=0, hidden=0, walk=0;
        for(var y=0;y<G.rows;y++)for(var x=0;x<G.cols;x++){
          var v=k[y]?k[y][x]:-1;
          if(v===1)outer++; else if(v===2)inner++; else if(v===0)hidden++;
          if(G.grid[y][x]!==1) walk++;
        }
        return {stage:G.stage,theme:(G.theme||{}).name,out:(G.theme||{}).out,hard:(G.theme||{}).hard,
          outer:outer,inner:inner,hidden:hidden,walk:walk};
      })()`);
      console.log(st, JSON.stringify(info));
      await p.shot(path.join(OUT, 'wall-s' + st + '-' + TAG + '.png'));
      try { await p.close(); } catch (e) { }
    }
    console.log('OK');
  } finally {
    try { await b.close(); } catch (e) { }
  }
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
