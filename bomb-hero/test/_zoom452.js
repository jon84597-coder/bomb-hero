// 放大檢視單人闖關按鈕的三種狀態
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const OUT = path.join(__dirname, '_v452');
(async () => {
  const b = await launch({ port: 9641, w: 1280, h: 900 });
  try {
    const p = await b.newPage();
    await p.goto(URL, 3000);
    for (let i = 0; i < 40; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game)')) break; await sleep(300); }
    const r = await p.eval("(function(){var e=document.getElementById('btnSolo');var r=e.getBoundingClientRect();return {x:r.x-14,y:r.y-14,w:r.width+28,h:r.height+28,cx:r.x+r.width/2,cy:r.y+r.height/2};})()");
    const clip = { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.w), height: Math.round(r.h), scale: 2 };
    async function shot(name) {
      const s = await p.send('Page.captureScreenshot', { format: 'png', clip });
      fs.writeFileSync(path.join(OUT, 'zoom-' + name + '.png'), Buffer.from(s.data, 'base64'));
    }
    await p.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5, button: 'none' });
    await sleep(250); await shot('normal');
    await p.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r.cx, y: r.cy, button: 'none' });
    await sleep(320); await shot('hover');
    await p.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.cx, y: r.cy, button: 'left', clickCount: 1 });
    await sleep(200); await shot('active');
    await p.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.cx, y: r.cy, button: 'left', clickCount: 1 });
    console.log('OK', JSON.stringify(clip));
  } finally { b.close(); }
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
