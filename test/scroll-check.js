// test/scroll-check.js — 檢查手機上「設定頁能不能真的捲到最下面」（含真實滑動手勢模擬）
const path = require('path');
const { launch, sleep } = require('./cdp');

const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

const CASES = [
  { w: 320, h: 568, name: 'SE 320x568' },
  { w: 360, h: 780, name: 'Android 360x780' },
  { w: 390, h: 844, name: 'iPhone14 390x844' },
  { w: 430, h: 932, name: 'iPhone14PM' }
];

const PROBE = `(function(){
  const wrap = document.querySelector('.wrap');
  const sc = document.scrollingElement;
  const cs = getComputedStyle(wrap), bs = getComputedStyle(document.body);
  const f = document.querySelectorAll('#scr-settings .field');
  const last = f[f.length-1];
  const scrollers = [];
  document.querySelectorAll('body, body *').forEach(el=>{
    const s = getComputedStyle(el);
    if (/auto|scroll/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 4) {
      scrollers.push((el.id?'#'+el.id:'body.'+String(el.className).split(' ')[0]) +
        ' ' + el.scrollHeight + '/' + el.clientHeight);
    }
  });
  return {
    bodyTouch: bs.touchAction, wrapTouch: cs.touchAction,
    wrapOverflowY: cs.overflowY, wrapMaxH: cs.maxHeight,
    doc: sc.scrollHeight + '/' + sc.clientHeight,
    body: document.body.scrollHeight + '/' + document.body.clientHeight,
    wrap: wrap.scrollHeight + '/' + wrap.clientHeight,
    scrollTop: sc.scrollTop + '|' + document.body.scrollTop + '|' + wrap.scrollTop,
    lastBottom: last ? Math.round(last.getBoundingClientRect().bottom) : -1,
    vh: window.innerHeight, scrollers
  };
})()`;

async function swipe(page, x, y0, y1, steps = 10) {
  await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] });
  for (let i = 1; i <= steps; i++) {
    const y = y0 + (y1 - y0) * i / steps;
    await page.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
    await sleep(16);
  }
  await page.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(120);
}

(async () => {
  const br = await launch({ w: 1280, h: 900, port: 9334 });
  const page = await br.newPage();
  for (const c of CASES) {
    await page.resize(c.w, c.h, true);
    await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await page.goto(URL + '?touch=1', 1400);
    await page.eval(`document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));document.getElementById('scr-settings').classList.add('on');1`);
    await sleep(300);
    const before = await page.eval(PROBE);
    console.log('=== ' + c.name);
    console.log('  body.touch-action=' + before.bodyTouch + ' wrap.touch-action=' + before.wrapTouch +
                ' wrap.overflowY=' + before.wrapOverflowY + ' maxH=' + before.wrapMaxH);
    console.log('  doc ' + before.doc + '  body ' + before.body + '  wrap ' + before.wrap);
    console.log('  可捲動容器: ' + (before.scrollers.length ? before.scrollers.join(' | ') : 'NONE (!)'));
    // 真實滑動：從畫面中間往上滑 3 次
    const cx = Math.round(c.w / 2);
    for (let i = 0; i < 3; i++) await swipe(page, cx, Math.round(c.h * 0.75), Math.round(c.h * 0.25));
    const after = await page.eval(PROBE);
    console.log('  滑動前 scrollTop=' + before.scrollTop + '  滑動後=' + after.scrollTop);
    console.log('  最後欄位底部=' + after.lastBottom + ' / vh=' + after.vh +
                '  → ' + (after.lastBottom <= after.vh + 2 ? '✅ 捲到底了' : '❌ 還差 ' + (after.lastBottom - after.vh) + 'px'));
    await page.shot(path.join(__dirname, 'scrolled-' + c.w + '.png'));
  }
  await br.close();
})().catch(e => { console.error('ERR', e); process.exit(1); });
