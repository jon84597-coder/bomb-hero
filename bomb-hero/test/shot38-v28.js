// v2.8 目檢＋實測：PC/手機尺寸各自獨立 + LOGO 放大 + 怪物量 + 道具量
//   A. PC（1280×620 矮視窗）：不再套手機緊湊排版 → LOGO 大、按鈕大；1600×900 再更大
//   B. 手機直式（390×844）：LOGO 94vw 快貼齊左右邊
//   C. 手機橫式（844×390）：LOGO 放大且不爆屏
//   D. 遊戲中：第 1 關小怪數量、磚下道具數量
const path = require('path');
const { launch, sleep } = require('./cdp');
const URL = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const OUT = __dirname + '/';

async function emulatePhone(page) {
  await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await page.send('Emulation.setEmulatedMedia', { features: [
    { name: 'pointer', value: 'coarse' }, { name: 'hover', value: 'none' }] });
}

(async () => {
  // ---------- A. PC 矮視窗 ----------
  const br = await launch({ w: 1280, h: 620, port: 9441 });
  const page = await br.newPage();
  await page.goto(URL, 1800);
  await sleep(400);
  const a = await page.eval(`(function(){
    function box(sel){ var e=document.querySelector(sel); if(!e) return null;
      var b=e.getBoundingClientRect(); return { w:Math.round(b.width), h:Math.round(b.height) }; }
    return { ver: window.__BH.VERSION, touch: document.body.classList.contains('touch'),
             isTouch: window.__BH.IS_TOUCH,
             logo: box('.title-logo'), btn: box('.menu .mbtn') };
  })()`);
  console.log('A. PC 1280×620:', JSON.stringify(a));
  console.log('   body.touch =', a.touch, '/ IS_TOUCH =', a.isTouch, '（都應為 false：PC 不走手機版）');
  await page.shot(OUT + 'v28-1-pc-short.png');

  await page.resize(1600, 900);
  await sleep(400);
  const a2 = await page.eval(`(function(){
    var b=document.querySelector('.title-logo').getBoundingClientRect();
    return { w: Math.round(b.width) };
  })()`);
  console.log('A2. PC 1600×900 LOGO 寬 =', a2.w, 'px（≥700 才算自然放大到位）');
  await page.shot(OUT + 'v28-1b-pc-big.png');

  // ---------- B. 手機直式 ----------
  const br2 = await launch({ w: 390, h: 844, port: 9442 });
  const p2 = await br2.newPage();
  await emulatePhone(p2);
  await p2.goto(URL, 1800);
  await sleep(500);
  const b = await p2.eval(`(function(){
    var P=window.__BH; P.settings.ctrl='touch'; P.applyCtrl();
    function box(sel){ var e=document.querySelector(sel); if(!e) return null;
      var b=e.getBoundingClientRect(); return { w:Math.round(b.width), l:Math.round(b.left), r:Math.round(b.right) }; }
    return { isTouch: P.IS_TOUCH, touch: document.body.classList.contains('touch'),
             logo: box('.title-logo'), vw: window.innerWidth };
  })()`);
  console.log('B. 手機直式 390×844:', JSON.stringify(b));
  if (b.logo) console.log('   LOGO 左邊距 =', b.logo.l, 'px、右邊距 =', b.vw - b.logo.r, 'px（要只剩一點點）');
  await sleep(250);
  await p2.shot(OUT + 'v28-2-phone-portrait.png');

  // ---------- C. 手機橫式 ----------
  const br3 = await launch({ w: 844, h: 390, port: 9443 });
  const p3 = await br3.newPage();
  await emulatePhone(p3);
  await p3.goto(URL, 1800);
  await sleep(500);
  const c = await p3.eval(`(function(){
    var P=window.__BH; P.settings.ctrl='touch'; P.applyCtrl();
    function box(sel){ var e=document.querySelector(sel); if(!e) return null;
      var b=e.getBoundingClientRect(); return { w:Math.round(b.width), h:Math.round(b.height) }; }
    var menu = document.querySelector('#scr-title .menu');
    var mb = menu ? menu.getBoundingClientRect() : null;
    return { isTouch: P.IS_TOUCH, touch: document.body.classList.contains('touch'),
             logo: box('.title-logo'), menuBottom: mb ? Math.round(mb.bottom) : null, vh: window.innerHeight };
  })()`);
  console.log('C. 手機橫式 844×390:', JSON.stringify(c));
  await sleep(250);
  await p3.shot(OUT + 'v28-3-phone-landscape.png');

  // ---------- D. 遊戲中：怪物量／道具量 ----------
  await p3.eval(`(function(){
    var P=window.__BH; P.settings.soloDiff='normal';
    P.startSolo(1,false); P.Game.state='play'; return 1; })()`);
  await sleep(1200);
  const d = await p3.eval(`(function(){
    var G=window.__BH.Game, n=0;
    for (var k in (G.hidden||{})) if (G.hidden[k] !== 'door') n++;
    return { enemies: G.enemies.length, hiddenItems: n, T: G.T };
  })()`);
  console.log('D. 第 1 關（普通）：小怪 =', d.enemies, '隻（v2.8 應為 6）、磚下道具 =', d.hiddenItems,
              '個（v2.8 應為 14-15）');
  await p3.shot(OUT + 'v28-4-game.png');

  await br.close(); await br2.close(); await br3.close();
  console.log('done');
})().catch(function (e) { console.error(e); process.exit(1); });
