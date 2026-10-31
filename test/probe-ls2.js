// test/probe-ls2.js — 追 #gameTop 為何仍有 ~70px 高
const path = require('path');
const { launch, sleep } = require('./cdp.js');
const IDX = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

(async () => {
  const b = await launch({ w: 900, h: 500 });
  const p = await b.newPage();
  await p.resize(844, 390, true);
  await p.goto(IDX, 1400);
  await p.eval(`document.body.classList.add('touch')`);
  await p.eval(`(function(){ const bs=[].slice.call(document.querySelectorAll('#scr-title .mbtn'));
    const b=bs.find(x=>/單人|Solo/i.test(x.textContent)); if(b) b.click(); })()`);
  await sleep(400);
  await p.eval(`(function(){ var s=document.getElementById('scr-solo'); if(s&&s.classList.contains('on')){ var g=document.getElementById('soloGo')||document.querySelector('#scr-solo .biggo'); if(g) g.click(); } })()`);
  await sleep(700);
  await p.eval(`(function(){ var o=document.querySelector('#ovBox button'); if(o) o.click(); })()`);
  await sleep(3600);

  const o = await p.eval(`(function(){
    function box(el){ if(!el) return null; const r=el.getBoundingClientRect(); return [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]; }
    const gt=document.getElementById('gameTop'), cs=getComputedStyle(gt);
    const kids=[].slice.call(gt.children).map(function(c){ var r=c.getBoundingClientRect(); return {cls:c.className, y:Math.round(r.y), h:Math.round(r.height), w:Math.round(r.width)}; });
    const chips=[].slice.call(gt.querySelectorAll('.chip')).map(function(c){ var s=getComputedStyle(c); return {h:Math.round(c.getBoundingClientRect().height), mh:s.minHeight, fs:s.fontSize}; });
    return { gt: box(gt), gtH: cs.height, gtPad: cs.padding, gtGap: cs.gap, gtWrap: cs.flexWrap, gtMb: cs.marginBottom,
             kids: kids, chipCount: chips.length, chips: chips.slice(0,4) };
  })()`);
  console.log(JSON.stringify(o, null, 1));
  await p.shot(path.resolve(__dirname, '_ls2.png'));
  b.close();
})().catch(e => { console.error('ERR', e); process.exit(1); });
