// test/scroll-all.js — 手機直放時，每個「非遊戲」畫面都要能滑到最底部
const path = require('path');
const { launch, sleep } = require('./cdp');
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

const SCREENS = ['scr-title', 'scr-solo', 'scr-battle', 'scr-settings', 'scr-online', 'scr-rpg'];
const CASES = [{ w: 360, h: 780 }, { w: 390, h: 844 }];

(async () => {
  const br = await launch({ w: 1280, h: 900, port: 9338 });
  const page = await br.newPage();
  let bad = 0;
  for (const c of CASES) {
    await page.resize(c.w, c.h, true);
    await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await page.goto(URL + '?touch=1', 1400);
    console.log('=== ' + c.w + 'x' + c.h);
    for (const scr of SCREENS) {
      const has = await page.eval(`(function(){
        if (window.__BH && window.__BH.Rpg) window.__BH.Rpg.render();
        document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));
        var s=document.getElementById('${scr}'); if(!s) return false; s.classList.add('on');
        document.scrollingElement.scrollTop = 0; return true;
      })()`);
      if (!has) { console.log('  ' + scr + ' 不存在，跳過'); continue; }
      await sleep(200);
      // 往上滑到底
      for (let i = 0; i < 6; i++) {
        const y0 = Math.round(c.h * 0.78), y1 = Math.round(c.h * 0.2);
        await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: Math.round(c.w / 2), y: y0 }] });
        for (let k = 1; k <= 8; k++) {
          await page.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: Math.round(c.w / 2), y: y0 + (y1 - y0) * k / 8 }] });
          await sleep(14);
        }
        await page.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await sleep(90);
      }
      const r = await page.eval(`(function(){
        var s = document.getElementById('${scr}');
        var els = s.querySelectorAll('.field, .backrow, .mbtn, .ghostbtn');
        var last = els[els.length-1];
        var rr = last.getBoundingClientRect();
        return { txt: (last.textContent||'').trim().slice(0,10), bottom: Math.round(rr.bottom),
                 vh: window.innerHeight, over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
                 top: Math.round(document.scrollingElement.scrollTop) };
      })()`);
      const okReach = r.bottom <= r.vh + 2;
      if (!okReach || r.over > 0) bad++;
      console.log('  ' + (okReach && r.over <= 0 ? '✅' : '❌') + ' ' + scr +
        ' 捲到 ' + r.top + 'px，最後元素「' + r.txt + '」底=' + r.bottom + '/' + r.vh +
        ' 橫向溢出=' + r.over);
    }
  }
  await br.close();
  console.log(bad ? '\n有 ' + bad + ' 個問題' : '\n全部可捲到底、無橫向溢出');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(1); });
