// test/shot24-phone.js — v1.5 手機/桌機截圖（用 CDP 精準模擬視口，避免舊 headless 的 584px 假象）
const path = require('path');
const { launch, sleep } = require('./cdp');

const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const OUT = p => path.join(__dirname, p);

(async () => {
  const br = await launch({ w: 1280, h: 900, port: 9336 });
  const page = await br.newPage();
  const touchOn = on => page.send('Emulation.setTouchEmulationEnabled', { enabled: on, maxTouchPoints: 5 });

  // ---- 1. 手機直放：首頁 ----
  await page.resize(390, 844, true); await touchOn(true);
  await page.goto(URL + '?touch=1', 1500);
  await page.shot(OUT('v15-phone-title.png'));
  console.log('v15-phone-title.png');

  // ---- 2. 手機直放：設定頁（頂部）----
  await page.eval(`document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));document.getElementById('scr-settings').classList.add('on');1`);
  await sleep(250);
  await page.shot(OUT('v15-phone-settings-top.png'));

  // ---- 3. 手機直放：設定頁（滑到底）----
  const swipe = async (x, y0, y1, steps = 10) => {
    await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] });
    for (let i = 1; i <= steps; i++) {
      await page.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y0 + (y1 - y0) * i / steps }] });
      await sleep(16);
    }
    await page.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(150);
  };
  for (let i = 0; i < 3; i++) await swipe(195, 640, 210);
  await page.shot(OUT('v15-phone-settings-bottom.png'));
  const info = await page.eval(`(function(){
    const f=document.querySelectorAll('#scr-settings .field'); const l=f[f.length-1];
    return { bottom: Math.round(l.getBoundingClientRect().bottom), vh: window.innerHeight,
             scrollTop: document.scrollingElement.scrollTop,
             docH: document.scrollingElement.scrollHeight };
  })()`);
  console.log('v15-phone-settings-bottom.png  scrollTop=' + info.scrollTop + ' docH=' + info.docH +
              ' lastBottom=' + info.bottom + '/' + info.vh);

  // ---- 4. 手機直放：遊戲畫面（旋轉 90 度橫向）----
  await page.goto(URL + '?touch=1&stage=1&auto=1', 2600);
  await sleep(700);
  await page.shot(OUT('v15-phone-game.png'));
  const g = await page.eval(`(function(){
    const w=document.querySelector('.wrap'); const r=w.getBoundingClientRect();
    return { cls: document.body.className, wrapCls: w.className,
             rect: [Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)],
             vw: window.innerWidth, vh: window.innerHeight,
             canvas: (function(){ const c=document.querySelector('#scr-game canvas'); if(!c) return null;
               const cr=c.getBoundingClientRect(); return [Math.round(cr.width),Math.round(cr.height)]; })() };
  })()`);
  console.log('v15-phone-game.png  wrap=' + g.wrapCls + ' rect=' + g.rect.join(',') +
              ' view=' + g.vw + 'x' + g.vh + ' canvas=' + (g.canvas || []).join('x'));

  // ---- 5. 手機橫放：設定頁 ----
  await page.resize(844, 390, true);
  await page.goto(URL + '?touch=1', 1500);
  await page.eval(`document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));document.getElementById('scr-settings').classList.add('on');1`);
  await sleep(250);
  await page.shot(OUT('v15-land-settings.png'));
  const l = await page.eval(`document.querySelector('.wrap').getBoundingClientRect().width + ' / docW=' + document.documentElement.scrollWidth`);
  console.log('v15-land-settings.png  wrapW/docW=' + l);

  // ---- 6. 桌機 ----
  await page.resize(1440, 900, false); await touchOn(false);
  await page.goto(URL, 1500);
  await page.eval(`document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));document.getElementById('scr-settings').classList.add('on');1`);
  await sleep(250);
  await page.shot(OUT('v15-desktop-settings.png'));
  console.log('v15-desktop-settings.png');

  await br.close();
})().catch(e => { console.error('ERR', e); process.exit(1); });
