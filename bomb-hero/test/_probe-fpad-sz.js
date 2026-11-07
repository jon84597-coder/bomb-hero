// test/_probe-fpad-sz.js —— v5.43：浮動圓盤縮小後的實機外觀（不含在 _runall）
// 用法：node test/_probe-fpad-sz.js [w] [h] [tag]
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');

const W = +(process.argv[2] || 640);
const H = +(process.argv[3] || 300);
const TAG = process.argv[4] || (W + 'x' + H);
const OUT = path.join(__dirname, '_v543');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.BH_URL || 'http://127.0.0.1:3111/';

(async () => {
  const b = await launch({ port: 9461, w: W + 40, h: H + 40 });
  const p = await b.newPage();
  await p.resize(W, H, true);
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.goto(BASE, 2000);

  await p.eval(`(function(){
    document.body.classList.add('touch','slidepad','in-game');
    var g = document.getElementById('scr-game'); if (g) g.classList.add('on');
    window.__BH.startSolo(6); return 1;
  })()`);
  await sleep(1200);
  // 按掉開場卡
  await p.eval(`(function(){
    var bs=[].slice.call(document.querySelectorAll('button,.btn,[role=button]'));
    for (var i=0;i<bs.length;i++) if (/出發|開始|知道了/.test(bs[i].textContent||'')) bs[i].click();
    return 1;
  })()`);
  await sleep(800);
  await p.eval(`(function(){ document.body.classList.remove('ovopen');
    document.body.classList.add('touch','slidepad','in-game');
    var g=document.getElementById('scr-game'); if(g) g.classList.add('on'); return 1; })()`);
  await sleep(500);

  const info = await p.eval(`(function(){
    var z = document.getElementById('slideZone');
    var r = z.getBoundingClientRect();
    var px = r.left + r.width * 0.40, py = r.top + r.height * 0.78;
    function ev(t,x,y){ return z.dispatchEvent(new PointerEvent(t,{clientX:x,clientY:y,pointerId:1,pointerType:'touch',isPrimary:true,cancelable:true,bubbles:true})); }
    ev('pointerdown', px, py);
    ev('pointermove', px + 34, py - 26);
    var f = document.getElementById('fpad');
    var fr = f.getBoundingClientRect();
    var k = document.getElementById('fknob');
    var kr = k.getBoundingClientRect();
    return { on: f.dataset.on, pad: Math.round(fr.width) + 'x' + Math.round(fr.height),
             cx: Math.round(fr.left + fr.width / 2), cy: Math.round(fr.top + fr.height / 2),
             knob: Math.round(kr.width) + 'x' + Math.round(kr.height),
             knobOff: k.style.transform, screen: innerWidth + 'x' + innerHeight };
  })()`);
  console.log('  fpad =', JSON.stringify(info));
  await sleep(350);
  const f = path.join(OUT, 'fpad-' + TAG + '.png');
  await p.shot(f);
  console.log('  shot →', f);
  b.close();
  process.exit(0);
})().catch(e => { console.error('ERR', e); process.exit(1); });
