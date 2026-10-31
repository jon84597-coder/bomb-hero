// test/probe-ls.js — 量測手機橫放（844x390）遊戲畫面版面，找出 .wrap.game 為何被撐高
const path = require('path');
const { launch, sleep } = require('./cdp.js');

const IDX = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

(async () => {
  const b = await launch({ w: 900, h: 500 });
  const p = await b.newPage();
  await p.resize(844, 390, true);
  await p.goto(IDX, 1400);
  await p.eval(`document.body.classList.add('touch')`);

  const out = await p.eval(`(function(){
    function box(el){ if(!el) return null; const r=el.getBoundingClientRect(); return [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]; }
    const body=document.body, wrap=document.querySelector('#scr-game').closest('.wrap');
    const cs=getComputedStyle(wrap), bs=getComputedStyle(body), hs=getComputedStyle(document.documentElement);
    return {
      iw:innerWidth, ih:innerHeight,
      htmlH: hs.height, bodyH: bs.height, bodyAlign: bs.alignItems, bodyDisplay: bs.display,
      wrapH: cs.height, wrapFlex: cs.flex, wrapOverflow: cs.overflow,
      wrapBox: box(wrap), scrollH: body.scrollHeight,
      scrGame: box(document.getElementById('scr-game')),
      gameTop: box(document.getElementById('gameTop')),
      stageWrap: box(document.getElementById('stageWrap')),
      cv: box(document.getElementById('cv')),
      cvClient: [document.getElementById('cv').clientWidth, document.getElementById('cv').clientHeight],
      cvAttr: [document.getElementById('cv').width, document.getElementById('cv').height],
      cvCss: [getComputedStyle(document.getElementById('cv')).width, getComputedStyle(document.getElementById('cv')).height],
      touchUI: box(document.getElementById('touchUI')),
      act: box(document.querySelector('#touchUI .tact')),
      pad: box(document.querySelector('#touchUI .tpad')),
      slide: box(document.getElementById('slideZone')),
      inGame: body.classList.contains('in-game')
    };
  })()`);
  console.log('--- 首頁狀態（還沒進遊戲）---');
  console.log(JSON.stringify(out, null, 1));

  // 進入遊戲
  await p.eval(`(function(){ const bs=[].slice.call(document.querySelectorAll('#scr-title .mbtn'));
    const b=bs.find(x=>/單人|Solo/i.test(x.textContent)); if(b) b.click(); })()`);
  await sleep(400);
  await p.eval(`(function(){ var s=document.getElementById('scr-solo'); if(s&&s.classList.contains('on')){ var g=document.getElementById('soloGo')||document.querySelector('#scr-solo .biggo'); if(g) g.click(); } })()`);
  await sleep(700);
  await p.eval(`(function(){ var o=document.querySelector('#ovBox button'); if(o) o.click(); })()`);
  await sleep(3600);

  const out2 = await p.eval(`(function(){
    function box(el){ if(!el) return null; const r=el.getBoundingClientRect(); return [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]; }
    return {
      state: (window.__BH&&__BH.Game)?__BH.Game.state:'?',
      iw:innerWidth, ih:innerHeight, scrollH: document.body.scrollHeight,
      wrap: box(document.querySelector('#scr-game').closest('.wrap')),
      stageWrap: box(document.getElementById('stageWrap')),
      cv: box(document.getElementById('cv')),
      cvClient: [document.getElementById('cv').clientWidth, document.getElementById('cv').clientHeight],
      touchUI: box(document.getElementById('touchUI')),
      act: box(document.querySelector('#touchUI .tact')),
      slide: box(document.getElementById('slideZone')),
      slideW: getComputedStyle(document.getElementById('slideZone')).width,
      cls: document.body.className
    };
  })()`);
  console.log('--- 遊戲中（橫放 844x390）---');
  console.log(JSON.stringify(out2, null, 1));

  await p.shot(path.resolve(__dirname, '_ls1.png'));

  // 切到虛擬搖桿模式再量一次（確認不是 v4.2 的 tslide 造成）
  await p.eval(`(function(){ if(window.__BH && __BH.Game){} var S=JSON.parse(localStorage.getItem('bh.settings.v1')||'{}'); })()`);
  const out3 = await p.eval(`(function(){
    document.body.classList.remove('slidepad'); document.body.classList.add('stickpad');
    function box(el){ if(!el) return null; const r=el.getBoundingClientRect(); return [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]; }
    return { wrap: box(document.querySelector('#scr-game').closest('.wrap')), stage: box(document.getElementById('stageWrap')), cv: box(document.getElementById('cv')), ih: innerHeight };
  })()`);
  console.log('--- 強制 stickpad（tslide 隱藏）---');
  console.log(JSON.stringify(out3, null, 1));

  b.close();
})().catch(e => { console.error('ERR', e); process.exit(1); });
