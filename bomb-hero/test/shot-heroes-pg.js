/**
 * 主角群動作測試場截圖：Idle / Move / Attack / Hurt / Die + 三種表情
 * 用法：node test/shot-heroes-pg.js
 */
const path = require('path');
const { launch, sleep } = require('./cdp');

const OUT = path.join(__dirname, '_heroes');
const URL = 'file:///' + path.resolve(__dirname, '../art/foes/heroes-playground.html').replace(/\\/g, '/');

(async () => {
  const b = await launch({ port: 9470, w: 1500, h: 1560 });
  const p = await b.newPage();
  await p.send('Emulation.setDeviceMetricsOverride', {
    width: 1500, height: 1560, deviceScaleFactor: 1, mobile: false
  });
  await p.goto(URL, 3000);
  await sleep(900);

  console.log('heroes', await p.eval('JSON.stringify(window.__heroes())'));

  await p.shot(path.join(OUT, 'pg-1-idle.png'));
  console.log('ERR', await p.eval('JSON.stringify(window.__err)'));
  console.log('MISS', await p.eval('JSON.stringify(typeof missing!=="undefined"?missing:[])'));

  // 全部轉身：驗證鏡像（原圖朝左的也應該正確翻到右）
  await p.eval("document.getElementById('btnFlip').click()");
  await sleep(320);
  await p.shot(path.join(OUT, 'pg-1b-flip.png'));
  await p.eval("document.getElementById('btnFlip').click()");
  await sleep(200);

  await p.eval("document.getElementById('btnMove').click()");
  await sleep(700);
  await p.shot(path.join(OUT, 'pg-2-move.png'));

  // 全員往左走 → 全員往右走（驗證面向）
  await p.eval("window.__walk(-1)");
  await sleep(600);
  await p.shot(path.join(OUT, 'pg-2a-walkleft.png'));
  await p.eval("window.__walk(1)");
  await sleep(1100);
  await p.shot(path.join(OUT, 'pg-2b-walkright.png'));

  await p.eval("document.getElementById('btnAtk').click()");
  await sleep(420);
  await p.shot(path.join(OUT, 'pg-3-attack.png'));
  console.log('atk', await p.eval('JSON.stringify(window.__heroes())'));

  await sleep(900);
  await p.eval("document.getElementById('btnHurt').click()");
  await sleep(90);
  await p.shot(path.join(OUT, 'pg-4-hurt.png'));

  await sleep(900);
  await p.eval("document.getElementById('btnDie').click()");
  await sleep(700);
  await p.shot(path.join(OUT, 'pg-5-die.png'));

  // 三種表情（鎖定在 idle）
  await p.eval("document.getElementById('btnAll').click()");
  await sleep(700);
  for (const [k, ex] of [['happy', 'happy'], ['pain', 'pain'], ['cry', 'cry']]) {
    await p.eval(`window.__expr('${ex}')`);
    await sleep(420);
    await p.shot(path.join(OUT, `pg-6-face-${k}.png`));
  }
  await p.eval("window.__expr('auto')");

  console.log('ERR-final', await p.eval('JSON.stringify(window.__err)'));
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
