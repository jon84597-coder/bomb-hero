// test/portrait-probe.js — 查手機直放時遊戲畫面到底有沒有被旋轉、尺寸對不對
const path = require('path');
const { launch, sleep } = require('./cdp');
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

(async () => {
  const br = await launch({ w: 1280, h: 900, port: 9337 });
  const page = await br.newPage();
  await page.resize(390, 844, true);
  await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await page.goto(URL + '?touch=1&stage=1&auto=1', 2600);
  await sleep(600);
  const r = await page.eval(`(function(){
    const w = document.querySelector('.wrap'), cs = getComputedStyle(w);
    const c = document.querySelector('#scr-game canvas');
    const de = document.documentElement;
    const g = document.getElementById('scr-game');
    const box = el => el ? (function(){ const r = el.getBoundingClientRect(); return [Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)]; })() : null;
    return {
      portraitMQ: matchMedia('(orientation: portrait)').matches,
      wrapCls: w.className,
      transform: cs.transform, w: cs.width, h: cs.height, pos: cs.position,
      vvw: cs.getPropertyValue('--vvw') || getComputedStyle(de).getPropertyValue('--vvw'),
      vvh: getComputedStyle(de).getPropertyValue('--vvh'),
      bodyCls: document.body.className,
      wrapBox: box(w), gameBox: box(g), canvasBox: box(c),
      canvasAttr: c ? [c.width, c.height] : null,
      canvasStyle: c ? [c.style.width, c.style.height, getComputedStyle(c).width, getComputedStyle(c).height] : null,
      view: [window.innerWidth, window.innerHeight]
    };
  })()`);
  console.log(JSON.stringify(r, null, 2));
  await br.close();
})().catch(e => { console.error('ERR', e); process.exit(1); });
