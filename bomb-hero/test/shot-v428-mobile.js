// v4.28 手機版：確認投擲鈕已消失、其他按鈕沒有跑位／重疊，縮放指示仍在
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const OUT = path.join(__dirname, '_v428');
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
    for (let i = 0; i < 40; i++) { if (await p.eval("window.__BH.Game.state==='play'")) break; await sleep(250); }
    await sleep(1200);

    const probe = await p.eval(`(function(){
      var out=[];
      var list=document.querySelectorAll('#touchUI .tbtn, #touchUI .tpad');
      for (var i=0;i<list.length;i++){
        var el=list[i], r=el.getBoundingClientRect(), cs=getComputedStyle(el);
        out.push({ t: el.getAttribute('data-t')||el.className, x: Math.round(r.left), y: Math.round(r.top),
          w: Math.round(r.width), h: Math.round(r.height), vis: cs.display!=='none' && cs.visibility!=='hidden' });
      }
      return JSON.stringify({ btns: out, tthrow: !!document.querySelector('#touchUI .tthrow'),
        zoomPill: !!document.getElementById('zoomPill'), ver: window.__BH.VERSION });
    })()`);
    console.log('PROBE', probe);
    await p.shot(path.join(OUT, 'mobile-ui.png'));

    // 雙指捏合縮放仍可用
    const z0 = await p.eval('window.__BH.Game.zoom');
    await p.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 150, y: 330, id: 1 }, { x: 240, y: 330, id: 2 }] });
    await sleep(40);
    for (let k = 1; k <= 8; k++) {
      await p.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 150 - k * 7, y: 330, id: 1 }, { x: 240 + k * 7, y: 330, id: 2 }] });
      await sleep(30);
    }
    await p.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(500);
    const z1 = await p.eval('window.__BH.Game.zoomTarget');
    console.log('PINCH', z0, '->', z1);
    await p.shot(path.join(OUT, 'mobile-zoom.png'));
    await b.close();
  } catch (e) { console.log('ERR', e.message); await b.close(); }
})();
