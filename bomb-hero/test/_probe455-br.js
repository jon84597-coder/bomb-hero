// v4.55 壓測：場上 50 隻 AI 的記憶體與每幀成本（大逃殺模式評估用）
const path = require('path');
const { launch, sleep } = require('./cdp');
const URL = process.env.BH_URL || ('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
(async () => {
  const b = await launch({ port: 9637, w: 1280, h: 900 });
  const p = await b.newPage();
  await p.goto(URL, 3200);
  for (let i = 0; i < 60; i++) { if (await p.eval('!!(window.__BH && window.__BH.Game)')) break; await sleep(250); }
  const out = await p.eval(`(function(){
    var BH=window.__BH, G=BH.Game;
    document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('on'); });
    BH.settings.size='L';
    BH.startSolo(1,true); G.state='play';
    try{ BH.beginCountdown('battle'); }catch(e){}
    G.state='play'; G.paused=false; G.countdown=0;
    for(var i=0;i<30;i++){ try{BH.updateWorld(1/60);}catch(e){} }
    G.particles.length=0; G.bubbles.length=0; G.flames.length=0;
    var mb=function(){ return performance.memory ? Math.round(performance.memory.usedJSHeapSize/1024) : -1; };
    var bench=function(n){
      G.state='play';
      var t0=performance.now();
      for(var i=0;i<n;i++){ try{BH.updateWorld(1/60);}catch(e){} }
      var t1=performance.now();
      for(var j=0;j<n;j++){ try{BH.render();}catch(e){} }
      var t2=performance.now();
      return {upd:+((t1-t0)/n).toFixed(2), draw:+((t2-t1)/n).toFixed(2)};
    };
    // 先讓場上只剩 1 隻，量基準
    var keep = G.enemies.slice(0,1);
    G.enemies.length=0; G.enemies.push(keep[0]||null); G.enemies=G.enemies.filter(Boolean);
    var baseMem=mb(), baseT=bench(30);
    var before=G.enemies.length;
    var types=['beetle','skull','lizard','bomber','robot','wizard','crystal','rockling'];
    for(var k=0;k<49;k++){
      var e=BH.makeEnemy(2+Math.floor(Math.random()*(G.cols-4)), 2+Math.floor(Math.random()*(G.rows-4)),
        types[k%types.length], 1, 1);
      G.enemies.push(e);
    }
    var after=G.enemies.length, bigMem=mb(), bigT=bench(20);
    return {cols:G.cols, rows:G.rows, enemiesBefore:before, enemiesAfter:after,
      heapBeforeKB:baseMem, heapAfterKB:bigMem, heapPerFoeB: Math.round((bigMem-baseMem)*1024/Math.max(1,after-before)),
      frame1:baseT, frame50:bigT};
  })()`);
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
