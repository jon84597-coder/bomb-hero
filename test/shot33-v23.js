// v2.3 目檢＋實測：直式提示畫面 / 直式可玩 / 遊戲內返回鍵 / 真實斜推轉向 / 選單可捲
const path = require('path');
const { launch, sleep } = require('./cdp');
const URL = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const OUT = __dirname + '/';

(async () => {
  const br = await launch({ w: 390, h: 844, port: 9404 });
  const page = await br.newPage();
  await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await page.goto(URL, 1800);

  // ---- A. 直式進遊戲 → 應該出現「建議橫式」提示 ----
  const hint = await page.eval(`(function(){
    var P = window.__BH;
    P.settings.ctrl = 'touch';
    P.applyCtrl();
    localStorage.setItem('bombhero-char-picked','1');
    P.startSolo(1, false);
    return { portrait: P.phonePortrait(), shown: P.hasRotateHint(), paused: P.isPaused() };
  })()`);
  console.log('直式提示', JSON.stringify(hint));
  await sleep(500);
  await page.shot(OUT + 'v23-1-rot-hint.png');

  // ---- B. 按「直式繼續玩」→ 提示消失、遊戲可玩、搖桿在地圖下方 ----
  await page.eval(`(function(){
    var b = document.getElementById('rhOk');
    if (b) b.click();
    return { shown: window.__BH.hasRotateHint(), paused: window.__BH.isPaused() };
  })()`);
  await sleep(600);
  const layout = await page.eval(`(function(){
    var P = window.__BH, G = P.Game;
    var cvR = document.getElementById('cv').getBoundingClientRect();
    var padR = document.getElementById('tpad').getBoundingClientRect();
    var actR = document.querySelector('#touchUI .tact').getBoundingClientRect();
    var back = document.getElementById('btnBack');
    var bR = back ? back.getBoundingClientRect() : null;
    return {
      cv: [Math.round(cvR.top), Math.round(cvR.bottom), Math.round(cvR.width)],
      pad: [Math.round(padR.top), Math.round(padR.bottom)],
      act: [Math.round(actR.left), Math.round(actR.top)],
      padCoversBoard: padR.top < cvR.bottom - 2,
      backVisible: bR ? (bR.width > 0 && getComputedStyle(back).display !== 'none') : false,
      backRect: bR ? [Math.round(bR.left), Math.round(bR.top), Math.round(bR.width)] : null,
      state: G.state, T: G.T
    };
  })()`);
  console.log('直式版面', JSON.stringify(layout));
  await page.shot(OUT + 'v23-2-portrait-game.png');

  // ---- C. 真實觸控：斜推轉向（手指推得歪一點也要轉得過去） ----
  const turn = await page.eval(`(function(){
    var P = window.__BH, G = P.Game, T = G.T;
    // 造一條走廊：第 3 列可走，上方第 2 列只在 x=5 有開口
    for (var y=1;y<G.rows-1;y++) for (var x=1;x<G.cols-1;x++) G.grid[y][x]=0;
    for (var x=1;x<G.cols-1;x++){ G.grid[2][x]=1; G.grid[4][x]=1; }
    G.grid[2][5]=0;
    G.enemies.length=0; G.bombs.length=0; G.flames.length=0; G.items.length=0;
    var p=G.players[0]; p.invuln=999; p.dizzy=0;
    p.x=2*T+T/2; p.y=3*T+T/2;
    G.state='play';
    var log=[];
    function push(axx,ayy,frames){
      P.Input.setTouchAxis(axx,ayy);
      for (var i=0;i<frames;i++) P.updateSolo(1/60);
      log.push({ax:axx,ay:ayy,cx:+(p.x/T).toFixed(2),cy:+(p.y/T).toFixed(2)});
    }
    push(0.96,-0.28, 90);        // 往右（手指稍微偏上）
    var xAfterRight = p.x/T;
    p.x=5*T+T/2; p.y=3*T+T/2;    // 對準開口
    push(0.30,-0.95, 90);        // 主力往上 → 應該轉上去
    var yAfterUp = p.y/T;
    P.Input.setTouchAxis(0,0);
    return { xAfterRight:+xAfterRight.toFixed(2), yAfterUp:+yAfterUp.toFixed(2),
             turnedUp: yAfterUp < 2.6, movedRight: xAfterRight > 4.5, log: log };
  })()`);
  console.log('斜推轉向', JSON.stringify(turn));

  // ---- D. 轉成橫式 → 提示自動消失 ----
  await page.resize(844, 390, true);
  await sleep(600);
  const land = await page.eval(`(function(){
    var P = window.__BH;
    P.showRotateHint();
    return { portrait: P.phonePortrait(), hintShown: P.hasRotateHint() };
  })()`);
  console.log('橫式', JSON.stringify(land));

  // ---- E. 選單能不能捲（直式設定頁） ----
  await page.resize(390, 844, true);
  await page.goto(URL, 1500);
  const scroll = await page.eval(`(function(){
    var P = window.__BH;
    P.settings.ctrl='touch'; P.applyCtrl();
    P.Screen.show('settings');
    var wrap = document.querySelector('.wrap');
    var before = wrap.scrollTop;
    wrap.scrollTop = 400;
    var after = wrap.scrollTop;
    var bodyBefore = document.scrollingElement.scrollTop;
    document.scrollingElement.scrollTop = 400;
    var bodyAfter = document.scrollingElement.scrollTop;
    return { wrapScroll: [before, after], docScroll: [bodyBefore, bodyAfter],
             canScroll: (after > before) || (bodyAfter > bodyBefore),
             align: getComputedStyle(document.body).alignItems };
  })()`);
  console.log('選單捲動', JSON.stringify(scroll));
  await sleep(300);
  await page.shot(OUT + 'v23-3-settings-scroll.png');

  await br.close();
})().catch(e => { console.error(e); process.exit(1); });
