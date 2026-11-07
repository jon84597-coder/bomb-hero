// test/_probe-homewide.js — v5.47：手機橫屏首頁 左 LOGO／右兩欄選單（實機尺寸截圖＋尺寸量測）
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, '_v547');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}

const SIZES = [
  { w: 844, h: 390, tag: 'land-844x390', touch: true },
  { w: 640, h: 360, tag: 'land-640x360', touch: true },
  { w: 932, h: 430, tag: 'land-932x430', touch: true },
  { w: 430, h: 932, tag: 'portrait-430x932', touch: true }
];

const MEASURE = `(function(){
  function r(sel){ var e = document.querySelector(sel); if(!e) return null;
    var b = e.getBoundingClientRect();
    return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; }
  var nb = r('#navBar'), navbtn = r('#navBar .navbtn');
  var cards = [].map.call(document.querySelectorAll('#homeMenu .mgrid .mbtn'), function(e){
    var b = e.getBoundingClientRect();
    return { k: e.id || e.className, x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
  });
  return {
    cls: document.body.className,
    vw: window.innerWidth, vh: window.innerHeight,
    navbar: nb, navbtn: navbtn,
    toprow: r('#topRow'), vlg: r('#verLogBtn'), ann: r('#annBox'), annmin: (document.getElementById('annBox')||{}).className,
    gift: r('#giftBtn'), codex: r('#codexBtn'), logo: r('#titleLogo'), ver: r('#scr-title .ver'),
    nick: r('#scr-title .nickwrap'), plat: r('#scr-title .platrow'),
    learn: r('#btnLearn'), menu: r('#homeMenu'), quick: r('#quickRow'),
    cards: cards,
    docH: Math.round(document.documentElement.scrollHeight),
    wrapH: Math.round((document.querySelector('.wrap') || document.body).getBoundingClientRect().height)
  };
})()`;

(async () => {
  const b = await launch({ w: 900, h: 500, port: 9367 });
  const p = await b.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });

  for (const s of SIZES) {
    await p.resize(s.w, s.h, true);
    await p.goto('http://127.0.0.1:3111/', 2000);
    await sleep(500);
    const m = await p.eval(MEASURE);
    console.log('\n--- ' + s.tag + ' ---');
    console.log('body   :', m.cls);
    console.log('navbar :', JSON.stringify(m.navbar), ' btn:', JSON.stringify(m.navbtn));
    console.log('toprow :', JSON.stringify(m.toprow), 'vlg', JSON.stringify(m.vlg), 'ann', JSON.stringify(m.ann), m.annmin);
    console.log('floats :', 'gift', JSON.stringify(m.gift), 'codex', JSON.stringify(m.codex), ' logo:', JSON.stringify(m.logo));
    console.log('ver    :', JSON.stringify(m.ver), ' nick:', JSON.stringify(m.nick));
    console.log('learn  :', JSON.stringify(m.learn), ' menu:', JSON.stringify(m.menu));
    console.log('quick  :', JSON.stringify(m.quick), ' docH:', m.docH, ' wrapH:', m.wrapH);
    console.log('cards  :', m.cards.map(c => c.k.replace('mbtn ', '') + ' ' + c.w + 'x' + c.h + '@' + c.x + ',' + c.y).join(' | '));
    await p.shot(path.join(OUT, s.tag + '.png'));

    // 展開作者公告：橫屏左欄只有 ~320px，要確認展開後不會撞到右欄
    if (s.tag === 'land-844x390') {
      const ann = await p.eval(`(function(){
        document.getElementById('annHead').click();
        var b = document.getElementById('annBox').getBoundingClientRect();
        return { w: Math.round(b.width), h: Math.round(b.height), top: Math.round(b.top),
                 docH: Math.round(document.documentElement.scrollHeight),
                 menuX: Math.round(document.getElementById('homeMenu').getBoundingClientRect().x) };
      })()`);
      console.log('ann-open:', JSON.stringify(ann));
      await sleep(400);
      await p.shot(path.join(OUT, s.tag + '-ann.png'));
      await p.eval("document.getElementById('annHead').click()");
    }
  }
  b.close();
})().catch(e => { console.error('PROBE FAIL', e && e.stack || e); process.exit(1); });
