// v4.30：實際進遊戲看第一關小怪（含左右面向）
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const OUT = path.join(__dirname, '_v430');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

async function dismiss(p) {
  await p.eval("(function(){ var ov=document.getElementById('ovBox'); var b2=ov&&ov.querySelector('button'); if(b2) b2.click(); })()");
  await sleep(350);
  await p.eval("(function(){ var ok=document.getElementById('rhOk'); if(ok) ok.click(); })()");
  for (let i = 0; i < 40; i++) { if (await p.eval("window.__BH.Game.state==='play'")) break; await sleep(250); }
  await sleep(900);
}

(async () => {
  const b = await launch({ port: 9484, w: 1000, h: 700 });
  try {
    const p = await b.newPage();
    await p.send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 700, deviceScaleFactor: 1, mobile: false });
    await p.goto(URL, 2600);
    for (let i = 0; i < 60; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game)')) break; await sleep(300); }

    const st = await p.eval(`JSON.stringify({ ver: window.__BH.VERSION, ready: window.__BH.FoeArt.readyCount(),
      keys: window.__BH.FoeArt.keys() })`);
    console.log('BOOT', st);

    // 第 4 小關：第 1 大關 6 種小怪全部登場
    await p.eval('window.__BH.startSolo(4)');
    await sleep(600);
    await dismiss(p);

    // 放大到 2 倍看細節（以畫面中心為基準）
    await p.eval("(function(){ var G=window.__BH.Game; G.zoom=2; G.zoomTarget=2; G.camSnap=true; })()");
    await sleep(700);
    await p.shot(path.join(OUT, 'a-live.png'));

    // 統計畫面上有幾隻、各是什麼、朝向
    const list = await p.eval(`(function(){
      var G=window.__BH.Game;
      return JSON.stringify(G.enemies.map(function(e){
        return { t:e.type, dir:e.dirName, face:e._faceS||0, x:Math.round(e.x), y:Math.round(e.y) };
      }));
    })()`);
    console.log('ENEMIES', list);

    // 強制全部往左走 → 全部應該面左
    await p.eval(`(function(){ window.__BH.Game.enemies.forEach(function(e){
      e.dirName='left'; e.dirT=99; e.aggro=false; e._faceS=null; }); })()`);
    await sleep(700);
    const leftOk = await p.eval(`(function(){
      var es=window.__BH.Game.enemies;
      var bad=es.filter(function(e){ return e._faceS!==-1; }).map(function(e){return e.type+':'+e._faceS;});
      return JSON.stringify({ n:es.length, bad:bad });
    })()`);
    console.log('LEFT', leftOk);
    await p.shot(path.join(OUT, 'b-left.png'));

    // 強制全部往右走 → 全部應該面右
    await p.eval(`(function(){ window.__BH.Game.enemies.forEach(function(e){
      e.dirName='right'; e.dirT=99; e.aggro=false; e._faceS=null; }); })()`);
    await sleep(700);
    const rightOk = await p.eval(`(function(){
      var es=window.__BH.Game.enemies;
      var bad=es.filter(function(e){ return e._faceS!==1; }).map(function(e){return e.type+':'+e._faceS;});
      return JSON.stringify({ n:es.length, bad:bad });
    })()`);
    console.log('RIGHT', rightOk);
    await p.shot(path.join(OUT, 'c-right.png'));

    // 上下移動時不應該亂翻面
    await p.eval(`(function(){ window.__BH.Game.enemies.forEach(function(e){
      e.dirName='up'; e.dirT=99; }); })()`);
    await sleep(600);
    const upOk = await p.eval(`(function(){
      var es=window.__BH.Game.enemies;
      var bad=es.filter(function(e){ return e._faceS!==1; }).map(function(e){return e.type+':'+e._faceS;});
      return JSON.stringify({ n:es.length, bad:bad });
    })()`);
    console.log('UP-KEEP', upOk);

    // 全部小怪縮到 1 倍，看整體畫面比例
    await p.eval("(function(){ var G=window.__BH.Game; G.zoom=1; G.zoomTarget=1; G.camSnap=true; })()");
    await sleep(600);
    await p.shot(path.join(OUT, 'd-zoom1.png'));

    console.log('DONE');
  } finally {
    await b.close();
  }
})().catch(e => { console.error('ERR', e && e.message); process.exit(1); });
