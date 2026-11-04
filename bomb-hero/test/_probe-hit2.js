// test/_probe-hit2.js — 前後對照 Admin 物件身分
const path = require('path');
const { launch, sleep } = require('./cdp.js');

(async () => {
  const b = await launch({ w: 1280, h: 900 });
  const url = 'file:///' + path.join(__dirname, '..', 'index.html').replace(/\\/g, '/') + '?cb=' + Date.now();
  const p = await b.newPage();
  await p.goto(url, 3000);
  for (let i = 0; i < 80; i++) { if (await p.eval('typeof window.__BH === "object" && !!window.__BH')) break; await sleep(300); }
  await sleep(1200);

  const snap = `(function(){ const A=window.__BH&&window.__BH.Admin; return JSON.stringify({
      hasBH: typeof window.__BH, hasAdmin: typeof A,
      keys: A?Object.keys(A):null, stub: A?String(A.__stub):null, err: A?String(A.__err):null,
      hasState: !!(A&&typeof A.state==='function'), hasOpen: !!(A&&typeof A.open==='function'),
      bootErrs: (window.__BHB&&window.__BHB.errs)?window.__BHB.errs.length:null,
      bootMsg: (function(){const m=document.getElementById('bootDiagMsg');return m?m.textContent:null})()
    }); })()`;

  console.log('BEFORE', await p.eval(snap));

  const o = JSON.parse(await p.eval(`(function(){const r=document.getElementById('verTxt').parentNode.getBoundingClientRect();return JSON.stringify({cx:Math.round(r.left+r.width/2),cy:Math.round(r.top+r.height/2)})})()`));
  for (let i = 0; i < 3; i++) {
    await p.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: o.cx, y: o.cy, button: 'left', clickCount: 1 });
    await p.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: o.cx, y: o.cy, button: 'left', clickCount: 1 });
    await sleep(150);
  }
  await sleep(1000);
  console.log('AFTER 3 REAL CLICKS', await p.eval(snap));
  console.log('MODAL', await p.eval(`JSON.stringify({cls:(document.getElementById('bhModal')||{}).className, hidden:!document.getElementById('bhModal')})`));
  await p.shot(path.join(__dirname, '_probe-hit2.png'));
  b.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
