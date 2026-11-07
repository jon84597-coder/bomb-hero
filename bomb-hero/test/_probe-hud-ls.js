// test/_probe-hud-ls.js — 量橫屏頂部資訊列幾何（改版前後對照用）
// 用法：node test/_probe-hud-ls.js [tag] [w] [h]
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');

const TAG = process.argv[2] || 'before';
const W = +(process.argv[3] || 780);
const H = +(process.argv[4] || 360);
const OUT = path.join(__dirname, '_v542');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}

(async () => {
  const b = await launch({ w: W + 40, h: H + 40, port: 9345 });
  const p = await b.newPage();
  await p.resize(W, H, true);
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  const PAGE = process.argv[5] || '/';
  await p.goto('http://127.0.0.1:3111' + PAGE, 1800);

  // 觸控模式 + 直接開第 6 關（天空要塞，跟使用者截圖同一章）
  await p.eval(`(function(){
    document.body.classList.add('touch','slidepad','in-game');
    try { __BH.applyTouchLayout && __BH.applyTouchLayout(); } catch(e) {}
    __BH.startSolo(6);
    return 1;
  })()`);
  await sleep(900);
  // 先把每日挑戰／開場卡按掉，再重新開一次真關卡（要在地圖上評斷頂欄）
  await p.eval(`(function(){
    var bs=[].slice.call(document.querySelectorAll('button,.btn,[role=button]'));
    for (var i=0;i<bs.length;i++) if (/出發|開始|知道了|關閉/.test(bs[i].textContent||'')) { bs[i].click(); }
    return 1;
  })()`);
  await sleep(700);
  await p.eval(`(function(){ document.body.classList.remove('ovopen');
    __BH.startSolo(6); return 1; })()`);
  await sleep(1000);
  // 點掉「出發！」
  await p.eval(`(function(){
    var bs = Array.prototype.slice.call(document.querySelectorAll('button,.btn,[role=button]'));
    for (var i=0;i<bs.length;i++) if (/出發|開始/.test(bs[i].textContent||'')) { bs[i].click(); return 1; }
    return 0;
  })()`);
  await sleep(900);
  // 讓畫面穩定（鏡頭對焦）+ 補上真實裝置一定有的 .on（探針沒走完整流程會缺）
  const cls = await p.eval(`(function(){
    document.body.classList.add('touch','slidepad','in-game');
    var g = document.getElementById('scr-game'); if (g) g.classList.add('on');
    var gt = document.querySelector('#scr-game .game-top');
    var cs = gt ? getComputedStyle(gt) : null;
    return { body: document.body.className, game: g ? g.className : '-',
             pt: cs ? cs.paddingTop : '-', pr: cs ? cs.paddingRight : '-' };
  })()`);
  console.log('  cls', JSON.stringify(cls));
  await sleep(400);

  const m = await p.eval(`(function(){
    function R(id){ var e=document.getElementById(id); if(!e) return null;
      var r=e.getBoundingClientRect(); return {x:+r.left.toFixed(1),y:+r.top.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),bot:+r.bottom.toFixed(1)}; }
    var top=document.getElementById('gameTop');
    var cs=top?getComputedStyle(top):null;
    var chips=[];
    if(top) [].forEach.call(top.children,function(c){
      var r=c.getBoundingClientRect();
      chips.push({k:c.getAttribute('data-k')||c.id||c.className, w:+r.width.toFixed(1), h:+r.height.toFixed(1)});
    });
    var gt=document.querySelector('#scr-game .game-top');
    var gcs=gt?getComputedStyle(gt):null;
    return {
      vw: innerWidth, vh: innerHeight, sw: top?top.scrollWidth:0, cw: top?top.clientWidth:0,
      gameTop: R('gameTop'), gameTopTop: gcs?gcs.paddingTop:null, gameTopGap: cs?cs.gap:null,
      row: gt?{h:+gt.getBoundingClientRect().height.toFixed(1), top:+gt.getBoundingClientRect().top.toFixed(1), pt:gcs.paddingTop, pb:gcs.paddingBottom, mb:gcs.marginBottom}:null,
      stageWrap: R('stageWrap'), cv: R('cv'),
      chipH: chips.map(function(c){return c.h}),
      chips: chips
    };
  })()`);
  console.log('== ' + TAG + ' ' + W + 'x' + H + ' ==');
  console.log('  viewport   ', m.vw + 'x' + m.vh);
  console.log('  .game-top  ', JSON.stringify(m.row));
  console.log('  #gameTop   ', JSON.stringify(m.gameTop), 'overflow=' + (m.sw - m.cw));
  console.log('  #stageWrap ', JSON.stringify(m.stageWrap));
  console.log('  #cv        ', JSON.stringify(m.cv));
  console.log('  chips      ', m.chips.map(function (c) { return (c.k || '?') + ':' + c.w + 'x' + c.h; }).join('  '));
  await p.shot(path.join(OUT, 'hud-' + TAG + '.png'));
  console.log('  shot →', path.join(OUT, 'hud-' + TAG + '.png'));
  b.close();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
