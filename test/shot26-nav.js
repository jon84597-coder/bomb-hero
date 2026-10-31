// test/shot26-nav.js — v1.6 手機實機版面：工具列（上一頁 / 音樂 / 音效）、各頁滑動、線上暱稱
const path = require('path');
const { launch, sleep } = require('./cdp');

const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const OUT = p => path.join(__dirname, p);

(async () => {
  const br = await launch({ w: 390, h: 844, port: 9346 });
  const page = await br.newPage();
  await page.resize(390, 844, true);
  await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });

  await page.goto(URL, 1600);
  await page.eval(`
    (function () {
      var bar = document.getElementById('navBar');
      return 1;
    })()
  `);

  // 1) 標題頁：只有音樂／音效，沒有上一頁
  await page.shot(OUT('v16n-1-title.png'));
  let s = await page.eval(`(function(){
    var bar = document.getElementById('navBar');
    var b = document.getElementById('btnBack').getBoundingClientRect();
    var m = document.getElementById('btnMusic').getBoundingClientRect();
    var f = document.getElementById('btnSfx').getBoundingClientRect();
    return { cls: bar.className, backVis: getComputedStyle(document.getElementById('btnBack')).visibility,
      backW: Math.round(b.width), musicW: Math.round(m.width), musicTop: Math.round(m.top),
      sfxW: Math.round(f.width), innerW: innerWidth, dark: getComputedStyle(bar).display };
  })()`);
  console.log('標題頁工具列', JSON.stringify(s));

  // 2) 真的按「設定」進去（走正常流程，讓 updateNavUI 生效）
  await page.eval(`document.getElementById('btnSettings').click(); 1`);
  await sleep(500);
  await page.shot(OUT('v16n-2-settings.png'));
  s = await page.eval(`(function(){
    var b = document.getElementById('btnBack').getBoundingClientRect();
    var bar = document.getElementById('navBar');
    return { cls: bar.className, backVis: getComputedStyle(document.getElementById('btnBack')).visibility,
      backLeft: Math.round(b.left), backTop: Math.round(b.top), backW: Math.round(b.width), backH: Math.round(b.height),
      scroll: document.querySelector('.wrap').scrollTop, bodyH: document.body.scrollHeight, innerH: innerHeight };
  })()`);
  console.log('設定頁工具列', JSON.stringify(s));

  // 3) 設定頁往下滑（手機最常抱怨的地方）
  await page.eval(`window.scrollTo(0, 99999); 1`);
  await sleep(400);
  const scrollInfo = await page.eval(`(function(){
    var de = document.documentElement;
    return { y: window.scrollY, max: de.scrollHeight - innerHeight, over: de.scrollWidth - innerWidth };
  })()`);
  console.log('設定頁滑到底', JSON.stringify(scrollInfo));
  await page.shot(OUT('v16n-3-settings-bottom.png'));

  // 4) 按「← 上一頁」回標題（真的點按鈕）
  await page.eval(`window.scrollTo(0,0); document.getElementById('btnBack').click(); 1`);
  await sleep(500);
  s = await page.eval(`(function(){ return { cur: window.__BH.Screen.current, depth: window.__BH.Screen.depth }; })()`);
  console.log('按上一頁之後', JSON.stringify(s));
  await page.shot(OUT('v16n-4-back-title.png'));

  // 5) 線上配對頁：確認只有一個暱稱
  await page.eval(`document.getElementById('btnOnline').click(); 1`);
  await sleep(500);
  const netInfo = await page.eval(`(function(){
    var scr = document.getElementById('scr-online');
    var ins = scr.querySelectorAll('input');
    var out = [];
    for (var i = 0; i < ins.length; i++) out.push({ id: ins[i].id, ph: ins[i].placeholder, w: Math.round(ins[i].getBoundingClientRect().width) });
    return { n: ins.length, list: out, cur: window.__BH.Screen.current };
  })()`);
  console.log('線上配對輸入框', JSON.stringify(netInfo));
  await page.shot(OUT('v16n-5-online.png'));

  // 6) 關掉音樂 → 按鈕變灰；再打開
  await page.eval(`document.getElementById('btnMusic').click(); 1`);
  await sleep(200);
  const mOff = await page.eval(`(function(){ return { bgm: window.__BH.settings.bgm, cls: document.getElementById('btnMusic').className }; })()`);
  await page.shot(OUT('v16n-6-music-off.png'));
  await page.eval(`document.getElementById('btnMusic').click(); 1`);
  const mOn = await page.eval(`(function(){ return { bgm: window.__BH.settings.bgm, cls: document.getElementById('btnMusic').className }; })()`);
  console.log('音樂開關', JSON.stringify(mOff), '→', JSON.stringify(mOn));

  // 7) 進遊戲 → 遊戲中工具列收起；ESC 暫停後有「回主選單」
  await page.eval(`(function(){
    var BH = window.__BH;
    BH.Screen.show('title'); BH.startSolo(1, false); BH.Game.state = 'play';
    BH.Screen.show('game');
    return 1;
  })()`);
  await sleep(600);
  s = await page.eval(`(function(){
    var bar = document.getElementById('navBar');
    return { cls: bar.className, display: getComputedStyle(bar).display };
  })()`);
  console.log('遊戲中工具列', JSON.stringify(s));
  await page.shot(OUT('v16n-7-game.png'));

  await page.eval(`window.__BH.togglePause(); 1`);
  await sleep(400);
  const pauseInfo = await page.eval(`(function(){
    var ov = document.getElementById('ovBox');
    var btns = ov.querySelectorAll('button');
    var out = [];
    for (var i = 0; i < btns.length; i++) out.push(btns[i].textContent.trim().slice(0, 12));
    return { shown: !document.getElementById('ovIn').classList.contains('hide'), btns: out };
  })()`);
  console.log('暫停畫面', JSON.stringify(pauseInfo));
  await page.shot(OUT('v16n-8-pause.png'));

  const errs = await page.eval(`(window.__errs || []).length`);
  console.log('JS 錯誤數：' + errs);
  await br.close();
})();
