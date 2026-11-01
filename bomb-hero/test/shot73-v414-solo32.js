// test/shot73-v414-solo32.js — v4.14：單人選關 32 格（桌機 / 手機）＋ 第 32 關地圖
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');

const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const OUT = path.join(__dirname, '_v414');
fs.mkdirSync(OUT, { recursive: true });

async function openSolo(page) {
  await page.eval(`(function(){
    var P = window.__BH;
    P.Screen.show('solo');
    P.Solo.dev = true;              // 全關卡解鎖，才看得到 32 格
    P.Solo.sel = 32;
    P.Solo.renderGrid();
    P.Solo.renderGo();
    return 1;
  })()`);
  await sleep(400);
}

(async () => {
  const br = await launch({ w: 1200, h: 900, port: 9386 });
  const page = await br.newPage();
  await page.send('Page.addScriptToEvaluateOnNewDocument', {
    source: 'window.requestAnimationFrame = function(){ return 0; };'
  });
  await page.goto(URL, 1800);
  await sleep(700);

  await openSolo(page);
  const info = await page.eval(`(function(){
    var g = document.getElementById('stageGrid');
    var btns = g.querySelectorAll('.stg');
    var r = g.getBoundingClientRect();
    return { n: btns.length, h: Math.round(r.height),
      scrollable: g.scrollHeight > g.clientHeight + 1,
      last: btns[btns.length-1].textContent,
      selText: document.getElementById('soloGoSub').textContent,
      goTxt: document.getElementById('soloGoTxt').textContent };
  })()`);
  console.log('solo grid: ' + JSON.stringify(info));
  await page.shot(path.join(OUT, 'v414-solo-desktop.png'));

  // 手機：390×844 直放
  const mob = await br.newPage();
  await mob.send('Emulation.setDeviceMetricsOverride', {
    width: 390, height: 844, deviceScaleFactor: 2, mobile: true
  });
  await mob.send('Page.addScriptToEvaluateOnNewDocument', {
    source: 'window.requestAnimationFrame = function(){ return 0; };'
  });
  await mob.goto(URL, 1800);
  await sleep(700);
  await mob.eval(`document.body.classList.add('touch')`);
  await openSolo(mob);
  const minfo = await mob.eval(`(function(){
    var g = document.getElementById('stageGrid');
    var r = g.getBoundingClientRect();
    var b = g.querySelector('.stg').getBoundingClientRect();
    return { cells: g.querySelectorAll('.stg').length,
      box: [Math.round(r.width), Math.round(r.height)],
      cell: [Math.round(b.width), Math.round(b.height)],
      pageW: document.documentElement.scrollWidth, vw: window.innerWidth };
  })()`);
  console.log('mobile grid: ' + JSON.stringify(minfo));
  await mob.shot(path.join(OUT, 'v414-solo-phone.png'));

  await br.close();
  console.log('shots -> ' + OUT);
})();
