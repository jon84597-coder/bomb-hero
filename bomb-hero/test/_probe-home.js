// test/_probe-home.js —— 量首頁各元素在 橫屏／豎屏／桌機 的實際尺寸
const { launch, sleep } = require('./cdp');
const path = require('path');
const F = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

const CASES = [
  { n: '橫屏 844x390', w: 844, h: 390, touch: true },
  { n: '橫屏 932x430', w: 932, h: 430, touch: true },
  { n: '豎屏 390x844', w: 390, h: 844, touch: true },
  { n: '桌機 1280x900', w: 1280, h: 900, touch: false }
];

function rectOf(sel) {
  return `(function(){var e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;var b=e.getBoundingClientRect();
  return {x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height)};})()`;
}

(async () => {
  for (const c of CASES) {
    const b = await launch({ w: c.w, h: c.h });
    const p = await b.newPage();
    await p.send('Runtime.enable');
    await p.goto(F, 2200);
    for (let i = 0; i < 40; i++) {
      if (await p.eval('typeof __BH') === 'object') break;
      await sleep(250);
    }
    if (c.touch) await p.eval("document.body.classList.add('touch');1");
    await sleep(500);
    const out = await p.eval(`(function(){
      var w=document.querySelector('.wrap');
      function r(sel){var e=document.querySelector(sel);if(!e)return null;var b=e.getBoundingClientRect();
        return {x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height)};}
      return {
        wrapScroll: w.scrollHeight, wrapClient: w.clientHeight,
        docScroll: document.documentElement.scrollHeight, vh: window.innerHeight,
        menuDisp: getComputedStyle(document.querySelector('#homeMenu')).display,
        menuCols: getComputedStyle(document.querySelector('#homeMenu')).gridTemplateColumns,
        logo: r('#titleLogo'), menu: r('#homeMenu'), learn: r('#btnLearn'),
        grid: r('#homeMenu .mgrid'), card1: r('#btnSolo'), nick: r('#playerName'),
        card: r('#scr-title .title-card'), ver: r('#verTxt')
      };
    })()`);
    console.log('\n=== ' + c.n + ' ===');
    console.log(JSON.stringify(out, null, 1));
    try { await b.close(); } catch (e) {}
  }
  console.log('\nOK');
})().catch(e => { console.error(e); process.exit(1); });
