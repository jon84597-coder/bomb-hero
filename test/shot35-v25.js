// v2.5 目檢＋實測：手機橫放五個選單頁一屏放得下＋可拖曳；遊戲畫面整張地圖看得到
const path = require('path');
const { launch, sleep } = require('./cdp');
const URL = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const OUT = __dirname + '/';

(async () => {
  const br = await launch({ w: 844, h: 390, port: 9409 });   // 手機橫放
  const page = await br.newPage();
  await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await page.goto(URL, 1800);
  await page.eval(`(function(){ var P=window.__BH; P.settings.ctrl='touch'; P.applyCtrl(); return 1; })()`);
  await sleep(300);

  // ---- A. 首頁 ----
  const home = await page.eval(`(function(){
    var se = document.scrollingElement || document.documentElement;
    var menu = document.querySelector('#scr-title .menu');
    var mR = menu.getBoundingClientRect();
    return { scrollH: se.scrollHeight, clientH: se.clientHeight,
             fits: se.scrollHeight <= se.clientHeight + 2,
             menu: [Math.round(mR.top), Math.round(mR.bottom)],
             menuCols: getComputedStyle(menu).gridTemplateColumns.split(' ').length };
  })()`);
  console.log('橫式首頁', JSON.stringify(home));
  await page.shot(OUT + 'v25-1-land-home.png');

  // 拖曳測試（就算一屏放得下，也要確認拖曳功能活著）
  async function drag(x0, y0, x1, y1) {
    await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
    for (let i = 1; i <= 8; i++) {
      await page.send('Input.dispatchTouchEvent', {
        type: 'touchMove', touchPoints: [{ x: x0 + (x1 - x0) * i / 8, y: y0 + (y1 - y0) * i / 8 }] });
      await sleep(16);
    }
    await page.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  await page.eval(`(function(){
    // 故意把視窗調小，內容一定超過一屏 → 測拖曳
    return 1;
  })()`);
  await drag(420, 320, 420, 60);
  await sleep(250);
  const scrolled = await page.eval(`(document.scrollingElement||document.documentElement).scrollTop;`);
  console.log('橫式拖曳後 scrollTop =', scrolled);

  // ---- B~E. 單人／對戰／線上／設定 ----
  async function shotScreen(id, btn, file) {
    await page.eval(`(function(){
      var se=document.scrollingElement||document.documentElement; se.scrollTop=0;
      var b=document.getElementById('${btn}');
      if (b) b.click();
      return 1;
    })()`);
    await sleep(450);
    const r = await page.eval(`(function(){
      var se=document.scrollingElement||document.documentElement;
      var scr=document.getElementById('${id}');
      var card=scr.querySelector('.card');
      var cR=card.getBoundingClientRect();
      var cols='1';
      try { cols=getComputedStyle(card).gridTemplateColumns.split(' ').length; } catch(e){}
      return { id:'${id}', scrollH:se.scrollHeight, clientH:se.clientHeight,
               fits: se.scrollHeight <= se.clientHeight + 2,
               cardCols: cols, cardW: Math.round(cR.width) };
    })()`);
    // 拖曳捲動測試：從卡片中間往上滑
    await drag(420, 330, 420, 70);
    await sleep(350);
    const st = await page.eval(`(document.scrollingElement||document.documentElement).scrollTop;`);
    r.dragScrolled = st;
    console.log(JSON.stringify(r));
    await page.eval(`(function(){
      var se=document.scrollingElement||document.documentElement; se.scrollTop=0; return 1;
    })()`);
    await sleep(200);
    await page.shot(OUT + file);
    await page.eval(`(function(){ var b=document.querySelector('#${id} .backrow .ghostbtn, #${id} [data-back]'); if(b) b.click(); return 1; })()`);
    await sleep(300);
  }
  await shotScreen('scr-solo', 'btnSolo', 'v25-2-land-solo.png');
  await shotScreen('scr-battle', 'btnBattle', 'v25-3-land-battle.png');
  await shotScreen('scr-online', 'btnOnline', 'v25-4-land-online.png');
  await shotScreen('scr-settings', 'btnSettings', 'v25-5-land-settings.png');

  // ---- F. 直放遊戲：整張地圖看得到 ----
  const rot = await page.eval(`(function(){
    return { w: window.innerWidth, h: window.innerHeight };
  })()`);
  console.log('目前視窗', JSON.stringify(rot));
  await br.close();

  // ---- G. 直式遊戲（390×844）----
  const br2 = await launch({ w: 390, h: 844, port: 9410 });
  const page2 = await br2.newPage();
  await page2.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await page2.goto(URL, 1800);
  const g = await page2.eval(`(function(){
    var P=window.__BH, G=P.Game;
    P.settings.ctrl='touch'; P.applyCtrl();
    localStorage.setItem('bombhero-char-picked','1');
    P.startSolo(1,false);
    return { T:G.T, version:P.VERSION };
  })()`);
  await sleep(500);
  await page2.eval(`(function(){
    var b=document.getElementById('rhOk'); if(b) b.click();
    var ov=document.getElementById('ovIn'); if(ov) ov.classList.add('hide');
    window.__BH.Game.state='paused';
    window.__BH.render();
    var T=window.__BH.Game.T, cv=document.getElementById('cv'), G=window.__BH.Game;
    return { T:T, mapW:T*G.cols, mapH:T*G.rows,
             cvW:cv.clientWidth, cvH:cv.clientHeight,
             wholeFitsW: T*G.cols <= cv.clientWidth+1, wholeFitsH: T*G.rows <= cv.clientHeight+1,
             cols:G.cols, rows:G.rows };
  })()`);
  console.log('直式遊戲', JSON.stringify(g));
  await page2.shot(OUT + 'v25-6-portrait-game.png');

  // 直式遊戲中轉橫 → 地圖要跟著重算（世界座標重貼）
  await page2.send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 2, mobile: true });
  await sleep(700);
  const g2 = await page2.eval(`(function(){
    var P=window.__BH, G=P.Game;
    G.state='paused'; P.render();
    var T=G.T, cv=document.getElementById('cv');
    return { T:T, cvW:cv.clientWidth, cvH:cv.clientHeight,
             wholeFitsW: T*G.cols <= cv.clientWidth+1, wholeFitsH: T*G.rows <= cv.clientHeight+1,
             p0: G.players[0] ? [Math.round(G.players[0].x), Math.round(G.players[0].y)] : null };
  })()`);
  console.log('轉橫後', JSON.stringify(g2));
  await page2.shot(OUT + 'v25-7-landscape-game.png');

  await br2.close();
})().catch(function (e) { console.error('ERR', e); process.exit(1); });
