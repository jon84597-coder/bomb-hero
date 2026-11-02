// 截圖確認 v4.21：首頁（公告膠囊 + 離開遊戲）、離場卡、找門提示卡
const path = require('path'), fs = require('fs');
const { launch, sleep } = require('./cdp');
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const OUT = path.join(__dirname, '_v421');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const br = await launch({ w: 1280, h: 900, port: 9471 });

  // ---------- PC ----------
  let p = await br.newPage();
  await p.resize(1280, 900, false);
  await p.goto(URL, 2000);
  await sleep(700);
  await p.shot(path.join(OUT, 'pc-title.png'));

  // 展開作者公告
  await p.eval("(function(){document.getElementById('annHead').click();})()");
  await sleep(400);
  console.log('ANN open', await p.eval(`(function(){
    var b=document.getElementById('annBox').getBoundingClientRect();
    var s=document.getElementById('btnSolo').getBoundingClientRect();
    var hit=document.elementFromPoint(Math.round(s.left+s.width/2), Math.round(s.top+s.height/2));
    return JSON.stringify({box:[Math.round(b.top),Math.round(b.bottom)], soloTop:Math.round(s.top), hit:hit&&hit.id});
  })()`));
  await p.shot(path.join(OUT, 'pc-title-ann.png'));
  await p.eval("(function(){document.getElementById('annHead').click();})()");

  // 離開遊戲
  await p.eval("(function(){document.getElementById('btnQuit').click();})()");
  await sleep(500);
  console.log('QUIT', await p.eval(`(function(){
    var m=document.getElementById('quitModal');
    return JSON.stringify({on:m.classList.contains('on'), vis:getComputedStyle(m).display});
  })()`));
  await p.shot(path.join(OUT, 'pc-quit.png'));
  await p.eval("(function(){document.getElementById('quitBack').click();})()");

  // 找門提示卡（在遊戲中觸發）
  const r = await p.eval(`(function(){
    var P=window.__BH, G=P.Game, T=G.T;
    P.settings.size='M'; P.settings.soloDiff='normal'; P.settings.ctrl='kb';
    P.startSolo(3,false); G.state='play';
    document.getElementById('ovIn').classList.add('hide');
    P.render();
    P.doorHintCard('🚪', '敵人清光了！', '炸開剩下的軟磚，找出藏起來的傳送門 🚪', 2.6);
    return JSON.stringify({v:P.VERSION, screen:P.Screen.current});
  })()`);
  console.log('HINT', r);
  await sleep(600);
  await p.shot(path.join(OUT, 'pc-doorhint.png'));
  const geo = await p.eval(`(function(){
    var b=document.getElementById('doorHint').getBoundingClientRect();
    return JSON.stringify({rect:[Math.round(b.left),Math.round(b.top),Math.round(b.width),Math.round(b.height)]});
  })()`);
  console.log('HINT RECT', geo);
  await p.send('Page.captureScreenshot', { format: 'png' }).then(d => {
    // 局部放大提示卡
  }).catch(() => {});

  // ---------- 手機 ----------
  const p2 = await br.newPage();
  await p2.resize(390, 844, true);
  await p2.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p2.goto(URL, 2000);
  await sleep(700);
  await p2.shot(path.join(OUT, 'phone-title.png'));
  await p2.eval("(function(){document.getElementById('btnQuit').click();})()");
  await sleep(400);
  await p2.shot(path.join(OUT, 'phone-quit.png'));
  br.close();
})();
