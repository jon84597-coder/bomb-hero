// test/shot76-v414-gridscroll.js — 手機直放：把選關卡片捲到底，看 32 格 4 排＋開始鈕
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');

const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const OUT = path.join(__dirname, '_v414');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const br = await launch({ w: 900, h: 900, port: 9387 });
  const p = await br.newPage();
  await p.send('Emulation.setDeviceMetricsOverride', {
    width: 390, height: 844, deviceScaleFactor: 2, mobile: true
  });
  await p.send('Page.addScriptToEvaluateOnNewDocument', {
    source: 'window.requestAnimationFrame = function(){ return 0; };'
  });
  await p.goto(URL, 1800);
  await sleep(700);
  await p.eval(`document.body.classList.add('touch')`);
  await p.eval(`(function(){
    var P = window.__BH;
    P.Screen.show('solo');
    P.Solo.dev = true;
    P.Solo.sel = 4;
    P.Solo.renderGrid();
    return 1;
  })()`);
  await sleep(300);
  // 捲到 32 格區塊出現的位置
  const y = await p.eval(`(function(){
    var g = document.getElementById('stageGrid');
    var r = g.getBoundingClientRect();
    window.scrollTo(0, window.scrollY + r.top - 60);
    return Math.round(window.scrollY);
  })()`);
  await sleep(300);
  console.log('scrollY=' + y);
  await p.shot(path.join(OUT, 'v414-solo-phone-grid.png'));
  await br.close();
  console.log('ok');
})();
