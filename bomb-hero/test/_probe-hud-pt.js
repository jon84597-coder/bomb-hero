// test/_probe-hud-pt.js — 量直放頂部資訊列（RPG 模式，10 顆 chip）幾何
// 用法：node test/_probe-hud-pt.js [tag] [w] [h] [page]
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');

const TAG = process.argv[2] || 'before';
const W = +(process.argv[3] || 430);
const H = +(process.argv[4] || 932);
const PAGE = process.argv[5] || '/';
const OUT = path.join(__dirname, '_v544');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}

(async () => {
  const b = await launch({ w: W + 40, h: H + 60, port: 9346 });
  const p = await b.newPage();
  await p.resize(W, H, true);
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.goto('http://127.0.0.1:3111' + PAGE, 2200);

  // 觸控模式 → 直接開 RPG 第 6 關（跟使用者截圖同一個模式：會有 Lv 與護甲 chip）
  await p.eval(`(function(){
    document.body.classList.add('touch','slidepad','in-game');
    try { __BH.applyTouchLayout && __BH.applyTouchLayout(); } catch(e) {}
    try { __BH.startRpg(6); } catch(e) {}
    return 1;
  })()`);
  await sleep(1000);
  // 點掉任何「出發／開始／知道了」覆蓋層
  await p.eval(`(function(){
    var bs=[].slice.call(document.querySelectorAll('button,.btn,[role=button]'));
    for (var i=0;i<bs.length;i++) if (/出發|開始|知道了|關閉|繼續/.test(bs[i].textContent||'')) { bs[i].click(); }
    return 1;
  })()`);
  await sleep(800);
  await p.eval(`(function(){
    document.body.classList.add('touch','slidepad','in-game');
    var g=document.getElementById('scr-game'); if(g) g.classList.add('on');
    return 1;
  })()`);
  await sleep(500);

  const m = await p.eval(`(function(){
    function R(id){ var e=document.getElementById(id); if(!e) return null;
      var r=e.getBoundingClientRect(); return {x:+r.left.toFixed(1),y:+r.top.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),bot:+r.bottom.toFixed(1)}; }
    var top=document.getElementById('gameTop');
    var chips=[];
    if(top) [].forEach.call(top.children,function(c){
      var r=c.getBoundingClientRect();
      chips.push({k:c.getAttribute('data-k')||c.id||c.className, w:+r.width.toFixed(1), h:+r.height.toFixed(1),
                  sw:c.scrollWidth, ow:c.offsetWidth});
    });
    var gt=document.querySelector('#scr-game .game-top');
    var gcs=gt?getComputedStyle(gt):null;
    var nav=document.getElementById('navBar');
    var ncs=nav?getComputedStyle(nav):null;
    return {
      vw: innerWidth, vh: innerHeight,
      mode: (window.__BH&&__BH.Game)?__BH.Game.mode:'?',
      gameTop: R('gameTop'), sw: top?top.scrollWidth:0, cw: top?top.clientWidth:0,
      row: gt?{h:+gt.getBoundingClientRect().height.toFixed(1), top:+gt.getBoundingClientRect().top.toFixed(1), pt:gcs.paddingTop, pr:gcs.paddingRight, mb:gcs.marginBottom}:null,
      nav: nav?{disp:ncs.display, h:+nav.getBoundingClientRect().height.toFixed(1), w:+nav.getBoundingClientRect().width.toFixed(1),
        cls:nav.className,
        kids:[].map.call(nav.querySelectorAll('.navbtn'),function(b){var r=b.getBoundingClientRect();
          return (b.id||b.className)+'['+getComputedStyle(b).display+']'+Math.round(r.left)+','+Math.round(r.width)+'x'+Math.round(r.height);})}:null,
      stageWrap: R('stageWrap'), cv: R('cv'),
      total: chips.reduce(function(a,c){return a+c.w;},0),
      chips: chips
    };
  })()`);
  console.log('== ' + TAG + ' ' + W + 'x' + H + ' mode=' + m.mode + ' ==');
  console.log('  viewport   ', m.vw + 'x' + m.vh);
  console.log('  .game-top  ', JSON.stringify(m.row), 'nav=' + JSON.stringify(m.nav));
  console.log('  #gameTop   ', JSON.stringify(m.gameTop), 'sum=' + m.total.toFixed(1), 'overflow=' + (m.sw - m.cw));
  console.log('  #stageWrap ', JSON.stringify(m.stageWrap));
  console.log('  #cv        ', JSON.stringify(m.cv));
  console.log('  chips      ', m.chips.map(function (c) { return (c.k || '?') + ':' + c.w + 'x' + c.h + (c.sw>c.w?('(need '+c.sw+')'):''); }).join('  '));
  console.log('  natural    ', m.chips.reduce(function(a,c){return a+Math.max(c.w,c.sw);},0).toFixed(1));
  await p.shot(path.join(OUT, 'pt-' + TAG + '.png'));
  console.log('  shot →', path.join(OUT, 'pt-' + TAG + '.png'));
  b.close();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
