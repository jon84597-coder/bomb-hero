// test/_smoke493.js — v4.93：看得見的 🛠 入口 ＋ 三條舊入口
const path = require('path');
const { launch, sleep } = require('./cdp.js');

(async () => {
  const b = await launch({ w: 1280, h: 900 });
  const url = 'file:///' + path.join(__dirname, '..', 'index.html').replace(/\\/g, '/') + '?cb=' + Date.now();

  async function boot(p) {
    await p.goto(url, 3000);
    for (let i = 0; i < 80; i++) { if (await p.eval('typeof window.__BH === "object" && !!window.__BH')) break; await sleep(300); }
    await sleep(1000);
  }
  const st = `JSON.stringify({ open: __BH.Admin.state.open, cls: document.getElementById('bhModal').className })`;

  // ---- 桌機：🛠 按鈕 ----
  const d = await b.newPage();
  await boot(d);
  const btn = await d.eval(`(function(){
    const b = document.getElementById('devBtn');
    if (!b) return 'no devBtn';
    const r = b.getBoundingClientRect(); const cs = getComputedStyle(b);
    return JSON.stringify({ cls:b.className, disp:cs.display, w:Math.round(r.width), h:Math.round(r.height),
      x:Math.round(r.left+r.width/2), y:Math.round(r.top+r.height/2),
      hit:(function(){const e=document.elementFromPoint(Math.round(r.left+r.width/2),Math.round(r.top+r.height/2));return e?e.id||e.className:null})() });
  })()`);
  console.log('DEVBTN', btn);
  const o = JSON.parse(btn);
  if (o.x) {
    await d.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: o.x, y: o.y, button: 'left', clickCount: 1 });
    await d.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: o.x, y: o.y, button: 'left', clickCount: 1 });
    await sleep(700);
  }
  console.log('AFTER CLICK', await d.eval(st));
  await d.shot(path.join(__dirname, '_smoke493-desktop-btn.png'));

  // 關掉，驗三條舊入口
  await d.eval('__BH.Admin.close()');
  await sleep(200);
  await d.eval(`(function(){const v=document.getElementById('verTxt').parentNode;for(let i=0;i<3;i++)v.dispatchEvent(new MouseEvent('click',{bubbles:true}));return 1})()`);
  await sleep(500);
  console.log('TRIPLE', await d.eval(st));
  await d.eval('__BH.Admin.close()'); await sleep(150);
  await d.eval(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'d',code:'KeyD',ctrlKey:true,altKey:true,bubbles:true}))`);
  await sleep(500);
  console.log('CTRL+ALT+D', await d.eval(st));

  // ---- 手機：🛠 按鈕 ----
  const m = await b.newPage();
  await m.resize(390, 844, true);
  await boot(m);
  const mb = JSON.parse(await m.eval(`(function(){
    const b=document.getElementById('devBtn'); if(!b) return JSON.stringify({err:'no devBtn'});
    const r=b.getBoundingClientRect();
    return JSON.stringify({disp:getComputedStyle(b).display,w:Math.round(r.width),h:Math.round(r.height),
      x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),
      sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth});
  })()`));
  console.log('MOBILE DEVBTN', JSON.stringify(mb));
  await m.shot(path.join(__dirname, '_smoke493-mobile.png'));
  if (mb.x) {
    await m.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: mb.x, y: mb.y, button: 'left', clickCount: 1 });
    await m.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: mb.x, y: mb.y, button: 'left', clickCount: 1 });
    await sleep(800);
  }
  console.log('MOBILE AFTER CLICK', await m.eval(st));
  await m.shot(path.join(__dirname, '_smoke493-mobile-admin.png'));

  b.close();
  console.log('done');
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
