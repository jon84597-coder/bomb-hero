// v4.27 手機版：投擲鈕（🤾）與縮放指示（%）的位置 / 是否擋到其他按鈕 / 雙指捏合是否真的縮放
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const OUT = path.join(__dirname, '_v427');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

(async () => {
  const b = await launch({ port: 9478, w: 390, h: 844 });
  try {
    const p = await b.newPage();
    await p.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await p.goto(URL, 2600);
    for (let i = 0; i < 40; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game)')) break; await sleep(300); }
    await p.eval('window.__BH.startSolo(1)');
    await sleep(500);
    await p.eval("(function(){ var ov=document.getElementById('ovBox'); var b2=ov&&ov.querySelector('button'); if(b2) b2.click(); })()");
    await sleep(700);
    await p.eval("(function(){ var ok=document.getElementById('rhOk'); if(ok) ok.click(); })()");
    await sleep(800);
    // 等倒數結束（throwBomb 只在 state==='play' 才生效）
    for (let i = 0; i < 40; i++) { if (await p.eval("window.__BH.Game.state==='play'")) break; await sleep(250); }
    console.log('state', await p.eval('window.__BH.Game.state'));

    // 按鈕清單：位置 / 是否 44px / 有沒有被別的浮層蓋住
    const probe = await p.eval(`(function(){
      var out=[];
      var list=document.querySelectorAll('#touchUI .tbtn, #touchUI .tpad');
      for (var i=0;i<list.length;i++){
        var el=list[i], r=el.getBoundingClientRect(), cs=getComputedStyle(el);
        var top=document.elementFromPoint(Math.round(r.left+r.width/2), Math.round(r.top+r.height/2));
        out.push({ t: el.getAttribute('data-t')||el.className, x: Math.round(r.left), y: Math.round(r.top),
          w: Math.round(r.width), h: Math.round(r.height), vis: cs.display!=='none' && cs.visibility!=='hidden',
          covered: !!(top && top!==el && !el.contains(top) && !top.contains(el)) });
      }
      var zp=document.getElementById('zoomPill'), zr=zp?zp.getBoundingClientRect():null;
      return JSON.stringify({ btns: out, zoomPill: zr?{x:Math.round(zr.left),y:Math.round(zr.top),w:Math.round(zr.width),pe:getComputedStyle(zp).pointerEvents,op:getComputedStyle(zp).opacity}:null,
        zoom: window.__BH.Game.zoom, vw: window.innerWidth, vh: window.innerHeight });
    })()`);
    console.log('PROBE', probe);
    await p.shot(path.join(OUT, 'mobile-ui.png'));

    // 點一下 🤾 看有沒有丟出去
    const r1 = await p.eval(`(function(){
      var el=document.querySelector('#touchUI .tthrow');
      if(!el) return 'noBtn';
      var r=el.getBoundingClientRect();
      return JSON.stringify({x:Math.round(r.left+r.width/2), y:Math.round(r.top+r.height/2), vis:getComputedStyle(el).display});
    })()`);
    console.log('THROW BTN', r1);
    const pos = JSON.parse(r1);
    if (pos.x) {
      await p.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pos.x, y: pos.y, id: 1 }] });
      await sleep(60);
      await p.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await sleep(500);
      const r2 = await p.eval('JSON.stringify({bombs:window.__BH.Game.bombs.length, threw:(window.__BH.Game.bombs[0]||{}).thrown||false, cd:Math.round(window.__BH.Game.players[0].throwCd*100)/100})');
      console.log('AFTER TAP', r2);
      await sleep(200);
      await p.shot(path.join(OUT, 'mobile-throw.png'));
    }
    await b.close();
  } catch (e) { console.log('ERR', e.message); await b.close(); }
})();
