// v4.48 新手教學：實機截圖＋流程驗證
// 用法：node shot-v448-tut.js [標記]
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');

const URL = process.env.BH_URL || ('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
const TAG = process.argv[2] || 'a';
const OUT = path.join(__dirname, '_v448');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) { }

async function boot(b, W, H, mobile) {
  const p = await b.newPage();
  await p.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: !!mobile });
  if (mobile) await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.goto(URL, 2500);
  await p.eval("try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}");
  for (let i = 0; i < 60; i++) {
    if (await p.eval('!!(window.__BH && window.__BH.Game && window.__BH.Tut)')) break;
    await sleep(250);
  }
  if (mobile) {
    await p.eval("(function(){var BH=window.__BH;BH.settings.ctrl='touch';if(BH.applyCtrl)BH.applyCtrl();document.body.classList.add('touch');})()");
    await sleep(300);
  }
  return p;
}

async function geo(p) {
  return p.eval(`(function(){
    function box(sel){var e=document.querySelector(sel);if(!e)return null;var r=e.getBoundingClientRect();
      return [Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)];}
    var T=window.__BH.Tut;
    return { step:T.step, part:T.part, on:T.on,
      card:box('#tutCard'), hole:box('#tutHole'), mask:box('#tutMask'),
      cardTop:(document.getElementById('tutCard')||{}).className,
      title:(document.getElementById('tutTitle')||{}).textContent,
      btn:(document.getElementById('tutNext')||{}).textContent,
      errs:(window.__BHB&&window.__BHB.errs||[]).length };
  })()`);
}

(async () => {
  const b = await launch({ port: 9572, w: 1280, h: 900 });
  const log = [];
  try {
    /* ---------- 桌機 ---------- */
    let p = await boot(b, 1280, 900, false);
    await p.shot(path.join(OUT, TAG + '-1-title.png'));
    log.push(['title', await geo(p)]);

    await p.eval("document.getElementById('btnLearn').click()");
    await sleep(500);
    await p.shot(path.join(OUT, TAG + '-2-learn.png'));
    log.push(['learn', await p.eval("(function(){var e=document.getElementById('scr-learn');var r=e.getBoundingClientRect();return {screen:r.height, chapters:document.querySelectorAll('#learnChapters details').length, scroll:document.documentElement.scrollHeight};})()")]);

    await p.eval("document.getElementById('btnTourAll').click()");
    await sleep(900);
    await p.shot(path.join(OUT, TAG + '-3-tour1.png'));
    log.push(['tour1', await geo(p)]);

    await p.eval("document.getElementById('tutNext').click()");
    await sleep(700);
    await p.shot(path.join(OUT, TAG + '-4-tour2.png'));
    log.push(['tour2', await geo(p)]);

    await p.eval("document.getElementById('tutNext').click()");
    await sleep(700);
    log.push(['tour3', await geo(p)]);

    // 跳到實戰
    await p.eval("window.__BH.Tut.startPlay()");
    await sleep(1200);
    await p.shot(path.join(OUT, TAG + '-5-play1.png'));
    log.push(['play1', await geo(p)]);
    log.push(['canvas', await p.eval("(function(){var c=document.getElementById('cv');var r=c.getBoundingClientRect();var G=window.__BH.Game;return {cv:[Math.round(r.width),Math.round(r.height)],T:G.T,map:[G.cols*G.T,G.rows*G.T],px:[Math.round(G.players[0].x),Math.round(G.players[0].y)]};})()")]);

    // 走完第 1 步（移動）
    await p.eval("(function(){var G=window.__BH.Game,T=G.T,p=G.players[0];p.x=2*T+T/2;p.y=1*T+T/2;})()");
    await sleep(1200);
    log.push(['afterMove', await geo(p)]);

    // 放炸彈
    await p.eval("(function(){var BH=window.__BH,G=BH.Game;BH.placeBomb(G.players[0]);})()");
    await sleep(1200);
    log.push(['afterBomb', await geo(p)]);
    await p.shot(path.join(OUT, TAG + '-6-play2.png'));

    // 用「跳過」走過幾個步驟，拍 HUD 提示與踢彈
    for (let k = 0; k < 2; k++) { await p.eval("document.getElementById('tutNext').click()"); await sleep(500); }
    log.push(['step4', await geo(p)]);
    await p.shot(path.join(OUT, TAG + '-7-play4.png'));

    // 直接觸發踢彈步驟的視覺（等高亮）
    await p.eval("(function(){var T=window.__BH.Tut;for(var k=0;k<4;k++){document.getElementById('tutNext').click();}})()");
    await sleep(700);
    log.push(['step8', await geo(p)]);
    await p.shot(path.join(OUT, TAG + '-8-play8.png'));

    // 剩餘步驟：全部跳過到結束卡
    await p.eval("(function(){for(var k=0;k<6;k++){var b=document.getElementById('tutNext');if(b&&b.textContent.indexOf('開始第 1 關')<0)b.click();}})()");
    await sleep(900);
    log.push(['end', await geo(p)]);
    await p.shot(path.join(OUT, TAG + '-9-end.png'));

    // 關掉回主選單
    await p.eval("document.getElementById('tutX').click()");
    await sleep(600);
    log.push(['closed', await geo(p), await p.eval('window.__BH.Screen.current')]);

    /* ---------- 手機直放 ---------- */
    const p2 = await boot(b, 390, 844, true);
    await p2.eval("document.getElementById('btnLearn').click()");
    await sleep(500);
    await p2.shot(path.join(OUT, TAG + '-m1-learn.png'));
    await p2.eval("document.getElementById('btnTourAll').click()");
    await sleep(900);
    await p2.shot(path.join(OUT, TAG + '-m2-tour.png'));
    log.push(['m-tour', await geo(p2)]);
    await p2.eval("window.__BH.Tut.startPlay()");
    await sleep(1200);
    await p2.shot(path.join(OUT, TAG + '-m3-play.png'));
    log.push(['m-play', await geo(p2)]);
    log.push(['m-hud', await p2.eval("(function(){function b(s){var e=document.querySelector(s);if(!e)return null;var r=e.getBoundingClientRect();return [Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)];}return {top:b('#gameTop'),card:b('#tutCard'),pad:b('#touchUI .tact'),stage:b('#stageWrap'),cv:b('#cv')};})()")]);

    console.log(JSON.stringify(log, null, 1));
  } catch (e) {
    console.error('ERR', e && e.message || e);
    process.exitCode = 1;
  } finally {
    b.close();
  }
})();
