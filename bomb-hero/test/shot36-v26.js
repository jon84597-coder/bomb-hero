// v2.6 目檢＋實測：
//   1. 手機橫式：坐騎招式（🔥）在遙控引爆（🧨）左邊、不被 ⛶ 擋到
//   2. 畫面只裝 60%＋小怪維持 PC 看到的大小
const path = require('path');
const { launch, sleep } = require('./cdp');
const URL = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const OUT = __dirname + '/';

const BOOT = `(function(){
  var P=window.__BH, G=P.Game;
  P.settings.ctrl='touch'; P.applyCtrl();
  localStorage.setItem('bombhero-char-picked','1');
  P.startSolo(1,false);
  var b=document.getElementById('rhOk'); if(b) b.click();
  var ov=document.getElementById('ovIn'); if(ov) ov.classList.add('hide');
  // 騎上坐騎 → 🔥 按鈕出現
  var p=G.players[0]; p.dino=true; p.dinoT=0; p.redDragon=true; p.fireCd=0;
  G.state='play'; P.updateHud(); P.render(); G.state='paused';
  return { version:P.VERSION };
})()`;

(async () => {
  // ---------- A. 手機橫式（844×390）----------
  const br = await launch({ w: 844, h: 390, port: 9411 });
  const page = await br.newPage();
  await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await page.goto(URL, 1800);
  await page.eval(BOOT);
  await sleep(500);

  const r = await page.eval(`(function(){
    var P=window.__BH, G=P.Game;
    G.state='play'; P.updateHud(); P.render(); G.state='paused';
    function box(sel){ var e=document.querySelector(sel); if(!e) return null;
      var b=e.getBoundingClientRect();
      return { l:Math.round(b.left), r:Math.round(b.right), t:Math.round(b.top), b:Math.round(b.bottom),
               w:Math.round(b.width), h:Math.round(b.height),
               vis: getComputedStyle(e).display !== 'none' }; }
    var det=box('#touchUI .tdet'), fire=box('#touchUI .tfire'),
        fs=box('#touchUI .tfs'), act=box('#touchUI .tact'), pad=box('#touchUI .tpad');
    var overlap=function(a,b){ return !!(a&&b) && a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b; };
    // 🔥 中心點上最上面的元素是不是 🔥 本人（真的可以按到）
    var hit=null;
    if (fire) { var el=document.elementFromPoint((fire.l+fire.r)/2,(fire.t+fire.b)/2);
      hit = el ? (el.className||el.tagName) : null; }
    var cv=document.getElementById('cv');
    return { det:det, fire:fire, fs:fs, act:act, pad:pad,
             fireLeftOfDet: !!(det&&fire) && fire.r <= det.l + 1,
             sameRow: !!(det&&fire) && Math.abs(det.t-fire.t) <= 2,
             overlapFs: overlap(fire,fs), overlapPad: overlap(fire,pad), overlapAct: overlap(fire,act),
             hitTest: hit,
             T:G.T, cvW:cv.clientWidth, cvH:cv.clientHeight,
             mapW:G.T*G.cols, mapH:G.T*G.rows,
             visFrac: Math.min(cv.clientWidth/(G.T*G.cols), cv.clientHeight/(G.T*G.rows)),
             enemyArt: P.enemyArtR({r:14}), tileArtK: P.tileArtK() };
  })()`);
  console.log('橫式按鈕＋畫面', JSON.stringify(r, null, 1));
  await page.shot(OUT + 'v26-1-land-buttons.png');

  // 真的用手指點一下 🔥（CDP 真觸控事件）→ 確認按得到、會吐火
  const fc = await page.eval(`(function(){
    var P=window.__BH, G=P.Game;
    var e=document.querySelector('#touchUI .tfire');
    var b=e.getBoundingClientRect();
    G.state='play'; G.flames.length=0; G.players[0].fireCd=0;
    return { x:(b.left+b.right)/2, y:(b.top+b.bottom)/2 };
  })()`);
  await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: fc.x, y: fc.y }] });
  await sleep(60);
  await page.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(120);
  const fired = await page.eval(`(function(){
    var P=window.__BH, G=P.Game;
    for (var i=0;i<8 && G.flames.length===0;i++) P.updateWorld(1/60);
    return { flames:G.flames.length, src: G.flames[0] ? G.flames[0].src : null };
  })()`);
  console.log('手指點 🔥（' + Math.round(fc.x) + ',' + Math.round(fc.y) + '）', JSON.stringify(fired));
  await page.eval(`(function(){ window.__BH.Game.state='paused'; window.__BH.render(); return 1; })()`);
  await page.shot(OUT + 'v26-2-land-fire.png');
  await br.close();

  // ---------- B. 手機直式（390×844）----------
  const br2 = await launch({ w: 390, h: 844, port: 9412 });
  const page2 = await br2.newPage();
  await page2.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await page2.goto(URL, 1800);
  await page2.eval(BOOT);
  await sleep(500);
  const r2 = await page2.eval(`(function(){
    var P=window.__BH, G=P.Game;
    G.state='play'; P.updateHud(); P.render(); G.state='paused';
    var cv=document.getElementById('cv');
    function box(sel){ var e=document.querySelector(sel); if(!e) return null;
      var b=e.getBoundingClientRect();
      return { l:Math.round(b.left), r:Math.round(b.right), t:Math.round(b.top), b:Math.round(b.bottom) }; }
    return { T:G.T, cvW:cv.clientWidth, cvH:cv.clientHeight,
             mapW:G.T*G.cols, mapH:G.T*G.rows,
             visFrac: +(Math.min(cv.clientWidth/(G.T*G.cols), cv.clientHeight/(G.T*G.rows))).toFixed(3),
             enemyArt:+P.enemyArtR({r:14}).toFixed(1), tileArtK:+P.tileArtK().toFixed(2),
             det:box('#touchUI .tdet'), fire:box('#touchUI .tfire'),
             fireLeftOfDet: (function(){ var d=box('#touchUI .tdet'), f=box('#touchUI .tfire');
                              return !!(d&&f) && f.r <= d.l+1; })(),
             enemies: G.enemies.length };
  })()`);
  console.log('直式', JSON.stringify(r2, null, 1));
  // 提示卡可能晚一步出現 → 拍照前再收一次
  await page2.eval(`(function(){
    var b=document.getElementById('rhOk'); if(b) b.click();
    var ov=document.getElementById('ovIn'); if(ov) ov.classList.add('hide');
    window.__BH.Game.state='paused'; window.__BH.render(); return 1;
  })()`);
  await sleep(200);
  await page2.shot(OUT + 'v26-3-portrait.png');

  // 小怪尺寸實測：同一隻怪在 PC 尺寸 vs 手機尺寸下的「外型／格子」比
  const sz = await page2.eval(`(function(){
    var P=window.__BH, G=P.Game, old=G.T;
    function ratio(T){ G.T=T; return +(P.enemyArtR({r:14})/T).toFixed(3); }
    var pc=ratio(62), mob=ratio(G.T);
    G.T=old;
    return { pcRatio:pc, mobileRatio:mob, mobileT:old };
  })()`);
  console.log('小怪比例', JSON.stringify(sz));
  await br2.close();
})().catch(function (e) { console.error('ERR', e); process.exit(1); });
