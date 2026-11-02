// v4.43：量執行時 JS heap（手機視窗）
const path = require('path');
const { launch, sleep } = require('./cdp');
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

(async () => {
  const b = await launch({ port: 9556, w: 900, h: 800 });
  try {
    const p = await b.newPage();
    await p.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await p.goto(URL, 3000);
    await sleep(2500);
    const read = async () => await p.eval('(function(){var m=performance.memory||{};' +
      'return {used:+((m.usedJSHeapSize||0)/1048576).toFixed(1),total:+((m.totalJSHeapSize||0)/1048576).toFixed(1),' +
      'limit:+((m.jsHeapSizeLimit||0)/1048576).toFixed(0)};})()');
    console.log('首頁待機 ', JSON.stringify(await read()));
    await p.eval('window.__BH.startSolo(1)');
    await sleep(3000);
    console.log('進第 1 關 ', JSON.stringify(await read()));
    await p.eval('window.__BH.startSolo(5)');
    await sleep(2500);
    console.log('切到第 5 關', JSON.stringify(await read()));
    await p.eval('window.__BH.startSolo(12)');
    await sleep(2500);
    console.log('切到第 12 關', JSON.stringify(await read()));
  } finally {
    await b.close();
  }
})();
