// test/_probe-fpad-game.js —— 進到真的關卡裡看浮動搖桿（不含在 _runall 裡）
const { launch, sleep } = require('./cdp');
const path = require('path');
const OUT = path.join(__dirname, '_v541');
const fs = require('fs');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const BASE = process.env.BH_URL || 'http://127.0.0.1:3111/';
const wait = ms => new Promise(r => setTimeout(r, ms));

(async function () {
  const b = await launch({ port: 9457, w: 430, h: 900 });
  const p = await b.newPage();
  await p.resize(430, 900, true);
  await p.goto(BASE, 2800);

  const has = await p.eval(`(function(){
    var B = window.__BH || {};
    return { startSolo: typeof B.startSolo, keys: Object.keys(B).filter(function(k){return /solo/i.test(k);}).slice(0,8) };
  })()`);
  console.log('BH =', JSON.stringify(has));

  if (has.startSolo === 'function') {
    await p.eval(`(function(){ window.__BH.startSolo(1); return true; })()`);
  } else {
    // 退回點按鈕：單人 → 第一關
    await p.eval(`(function(){
      var a = document.getElementById('btnAdventure');
      var e = a && (a._on && a._on.click);
      if (a && a.click) a.click();
      return !!a;
    })()`);
  }
  await wait(2200);

  const st = await p.eval(`(function(){
    var c = document.querySelector('canvas');
    return { body: document.body.className,
             touchUI: (function(){var t=document.getElementById('touchUI');return t?getComputedStyle(t).display:null;})(),
             canvas: c ? c.width + 'x' + c.height : null };
  })()`);
  console.log('進場後 =', JSON.stringify(st));

  // 點掉開場覆蓋層的「出發！」，進到真正的地圖
  const go = await p.eval(`(function(){
    var bs = Array.prototype.slice.call(document.querySelectorAll('button, .btn, [role=button]'));
    var hit = null;
    for (var i=0;i<bs.length;i++){ if (/出發/.test(bs[i].textContent||'')) { hit = bs[i]; break; } }
    if (hit) hit.click();
    return hit ? (hit.id || hit.className || 'clicked') : 'not-found';
  })()`);
  console.log('出發按鈕 =', go);
  await wait(1200);

  // 手指按在左半屏偏下（畫面的左下 1/4 一帶），往右上拖
  const info = await p.eval(`(function(){
    document.body.classList.add('touch','slidepad');
    document.body.classList.remove('ovopen');
    var t = document.getElementById('touchUI');
    if (t) { t.style.visibility = 'visible'; t.style.display = 'block'; }
    var z = document.getElementById('slideZone');
    var r = z.getBoundingClientRect();
    var px = r.left + r.width * 0.42, py = r.top + r.height * 0.80;
    function ev(t,x,y){ return z.dispatchEvent(new PointerEvent(t,{clientX:x,clientY:y,pointerId:1,pointerType:'touch',isPrimary:true,cancelable:true,bubbles:true})); }
    ev('pointerdown', px, py);
    ev('pointermove', px + 34, py - 26);
    var f = document.getElementById('fpad');
    var fr = f.getBoundingClientRect();
    return { on: f.dataset.on, left: f.style.left, top: f.style.top,
             w: Math.round(fr.width), knob: document.getElementById('fknob').style.transform,
             zoneRect: { w: Math.round(r.width), h: Math.round(r.height) } };
  })()`);
  console.log('搖桿 =', JSON.stringify(info));
  await wait(400);
  await p.shot(path.join(OUT, 'fpad-ingame.png'));

  // 真實觸控再試一次（若能觸發，就是最貼近玩家的路徑）
  try { await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }); } catch (e) {}
  await p.eval(`(function(){ var z=document.getElementById('slideZone');
    z.dispatchEvent(new PointerEvent('pointerup',{clientX:0,clientY:0,pointerId:1,pointerType:'touch',isPrimary:true,cancelable:true,bubbles:true})); return true; })()`);
  await wait(300);

  b.close();
  console.log('SHOT DIR', OUT);
})().catch(e => { console.error('ERR', e); process.exit(1); });
