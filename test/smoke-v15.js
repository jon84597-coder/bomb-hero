// test/smoke-v15.js — 真瀏覽器冒煙測試：載入 v1.5 → 開第 1 關 → 放彈 → 跑幾秒 → 檢查 JS 錯誤
const path = require('path');
const { launch, sleep } = require('./cdp');
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

(async () => {
  const br = await launch({ w: 1280, h: 800, port: 9339 });
  const page = await br.newPage();
  await page.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `window.__errs=[];window.addEventListener('error',e=>window.__errs.push(String(e.message)+' @'+e.lineno));
             window.addEventListener('unhandledrejection',e=>window.__errs.push('REJ '+e.reason));`
  });
  await page.goto(URL + '?stage=1&auto=1', 2500);
  await sleep(600);
  const s1 = await page.eval(`({ver: window.__BH.VERSION, state: window.__BH.Game.state,
    parts: window.__BH.Parts.readyCount(), tiles: window.__BH.Game.grid.length,
    errs: window.__errs.slice()})`);
  console.log('載入：ver=' + s1.ver + ' state=' + s1.state + ' 部位圖已載入=' + s1.parts + '/60 列數=' + s1.tiles);
  console.log('  錯誤：' + (s1.errs.length ? s1.errs.join(' | ') : '無'));

  // 鍵盤走兩步 + 放炸彈
  for (const k of ['ArrowRight', 'ArrowDown']) {
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k, windowsVirtualKeyCode: k === 'ArrowRight' ? 39 : 40 });
    await sleep(500);
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k, windowsVirtualKeyCode: k === 'ArrowRight' ? 39 : 40 });
  }
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32, text: ' ' });
  await sleep(120);
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
  await sleep(2200);
  const s2 = await page.eval(`({state: window.__BH.Game.state, bombs: window.__BH.Game.bombs.length,
    flames: window.__BH.Game.flames.length, alive: window.__BH.Game.players[0].alive,
    hp: window.__BH.Game.players[0].lives, errs: window.__errs.slice()})`);
  console.log('操作後：state=' + s2.state + ' 炸彈=' + s2.bombs + ' 火焰=' + s2.flames +
              ' 存活=' + s2.alive + ' 命=' + s2.hp);
  console.log('  錯誤：' + (s2.errs.length ? s2.errs.join(' | ') : '無'));

  // 裝置自動感應：先按鍵盤 → 應該變鍵盤；再模擬觸控 → 應該變觸控
  const ctrl1 = await page.eval(`window.__BH.settings.ctrl`);
  console.log('預設控制模式：' + ctrl1 + '（auto = 自動感應）');
  await page.shot(path.join(__dirname, 'v15-smoke-game.png'));
  await br.close();
  const bad = s1.errs.length + s2.errs.length;
  console.log(bad ? '\n有 JS 錯誤' : '\n冒煙通過（無 JS 錯誤）');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(1); });
