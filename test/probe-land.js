// v2.5 診斷：手機橫放，首頁／各選單頁的版面與捲動
const path = require('path');
const { launch, sleep } = require('./cdp');
const URL = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const OUT = __dirname + '/';

(async () => {
  const br = await launch({ w: 844, h: 390, port: 9407 });   // 手機橫放 CSS 尺寸
  const page = await br.newPage();
  await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await page.goto(URL, 1800);

  const info = await page.eval(`(function(){
    var P = window.__BH;
    P.settings.ctrl='touch'; P.applyCtrl();
    var d = document, se = d.scrollingElement || d.documentElement;
    var scr = d.getElementById('scr-title');
    var menu = d.querySelector('#scr-title .menu');
    var card = scr.querySelector('.card') || scr.querySelector('.title-card');
    var mR = menu ? menu.getBoundingClientRect() : null;
    function cs(el){ return el ? getComputedStyle(el) : null; }
    return {
      inner: [window.innerWidth, window.innerHeight],
      scrollH: se.scrollHeight, clientH: se.clientHeight,
      bodyH: getComputedStyle(d.body).height,
      wrapH: (function(){ var w=d.querySelector('.wrap:not(.game)'); return w? [w.getBoundingClientRect().height, getComputedStyle(w).overflowY] : null; })(),
      menuRect: mR ? [Math.round(mR.top), Math.round(mR.bottom), Math.round(mR.width)] : null,
      screenH: scr.getBoundingClientRect().height,
      titleCardPad: cs(card) ? cs(card).padding : null,
      mbtnFont: (function(){ var b=d.querySelector('#scr-title .mbtn'); return b? getComputedStyle(b).fontSize+' '+getComputedStyle(b).padding : null; })()
    };
  })()`);
  console.log('橫式首頁', JSON.stringify(info, null, 1));
  await page.shot(OUT + 'v25-0-land-before.png');

  // 能不能真的往下捲？
  const scrollTest = await page.eval(`(function(){
    var se = document.scrollingElement || document.documentElement;
    var before = se.scrollTop;
    window.scrollTo(0, 400);
    var afterDoc = se.scrollTop;
    var w = document.querySelector('.wrap:not(.game)');
    var beforeW = w ? w.scrollTop : -1;
    if (w) w.scrollTop = 300;
    var afterW = w ? w.scrollTop : -1;
    return { docCan: afterDoc > 0, docAfter: afterDoc, wrapCan: afterW > 0, wrapAfter: afterW, wrapMaxH: w ? getComputedStyle(w).maxHeight : null };
  })()`);
  console.log('捲動測試', JSON.stringify(scrollTest));

  await br.close();
})().catch(function (e) { console.error('ERR', e); process.exit(1); });
