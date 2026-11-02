// v4.27 手機版：確定「🤾 觸控鈕 → 真的丟出去（thrown:true）」＋雙指捏合縮放
const path = require('path');
const { launch, sleep } = require('./cdp');
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

(async () => {
  const b = await launch({ port: 9479, w: 390, h: 844 });
  try {
    const p = await b.newPage();
    await p.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await p.goto(URL, 2600);
    for (let i = 0; i < 40; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game)')) break; await sleep(300); }
    await p.eval('window.__BH.startSolo(1)');
    await sleep(500);
    await p.eval("(function(){ var ov=document.getElementById('ovBox'); var b2=ov&&ov.querySelector('button'); if(b2) b2.click(); })()");
    await sleep(600);
    await p.eval("(function(){ var ok=document.getElementById('rhOk'); if(ok) ok.click(); })()");
    for (let i = 0; i < 40; i++) { if (await p.eval("window.__BH.Game.state==='play'")) break; await sleep(250); }

    // 站到「右邊連續 4 格空地」的位置
    const setup = await p.eval(`(function(){
      var P=window.__BH,G=P.Game,pl=G.players[0];
      for (var y=1;y<G.rows-1;y++){
        for (var x=1;x<G.cols-5;x++){
          var ok=true;
          for (var k=1;k<=4;k++) if (P.cellAt(x+k,y)!==0) ok=false;
          if (!ok) continue;
          pl.x=x*G.T+G.T/2; pl.y=y*G.T+G.T/2; pl.facing='right'; pl.throwCd=0; pl.invuln=0;
          G.bombs.length=0; G.camSnap=true; P.updateCamera(0.016);
          return JSON.stringify({cx:x,cy:y});
        }
      }
      return 'noSpot';
    })()`);
    console.log('SETUP', setup);
    await sleep(400);

    const pos = JSON.parse(await p.eval(`(function(){
      var el=document.querySelector('#touchUI .tthrow'); var r=el.getBoundingClientRect();
      return JSON.stringify({x:Math.round(r.left+r.width/2), y:Math.round(r.top+r.height/2)});
    })()`));
    await p.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pos.x, y: pos.y, id: 1 }] });
    await sleep(70);
    await p.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(450);
    const r2 = await p.eval('JSON.stringify({bombs:window.__BH.Game.bombs.map(function(b){return {x:b.cx,y:b.cy,thrown:!!b.thrown,fly:!!b.flying};}), cd:window.__BH.Game.players[0].throwCd})');
    console.log('THROW RESULT', r2);
    await p.shot(path.join(__dirname, '_v427', 'mobile-throw.png'));

    // ---- 雙指捏合 ----
    const z0 = await p.eval('window.__BH.Game.zoomTarget');
    const pinch = async (y1, y2, t1, t2) => {
      await p.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 120, y: y1, id: 11 }] });
      await p.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 120, y: y1, id: 11 }, { x: 260, y: y2, id: 12 }] });
      await sleep(60);
      await p.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 120, y: t1, id: 11 }, { x: 260, y: t2, id: 12 }] });
      await sleep(80);
      await p.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await sleep(350);
    };
    await pinch(300, 340, 220, 420);         // 張開 → 放大
    const zA = await p.eval('window.__BH.Game.zoomTarget');
    await pinch(240, 420, 340, 320);         // 收合 → 縮小
    const zB = await p.eval('window.__BH.Game.zoomTarget');
    console.log('PINCH', z0, '->', zA, '->', zB);
    await sleep(400);
    await p.shot(path.join(__dirname, '_v427', 'mobile-zoom.png'));
    await b.close();
  } catch (e) { console.log('ERR', e.stack); await b.close(); }
})();
