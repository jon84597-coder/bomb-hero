// v4.49 新手教學：手機窄條 / 縮放 / 手套 的實機截圖＋量測
// 用法：node shot-v449-tut.js     （BH_URL 可換線上網址）
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');

const URL = process.env.BH_URL || ('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
const OUT = path.join(__dirname, '_v449');
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
    await p.eval("(function(){var B=window.__BH;B.settings.ctrl='touch';if(B.applyCtrl)B.applyCtrl();document.body.classList.add('touch');})()");
    await sleep(300);
  }
  return p;
}

const box = (p, sel) => p.eval(`(function(){var e=document.querySelector('${sel}');if(!e)return null;
  var r=e.getBoundingClientRect();return [Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)];})()`);

(async () => {
  const b = await launch({ port: 9595, w: 1280, h: 900 });

  // ---- 手機直放 ----
  let p = await boot(b, 390, 844, true);
  await p.shot(path.join(OUT, 'm-title.png'));
  await p.eval("document.getElementById('btnLearn').click()");
  await sleep(600);
  await p.eval("(function(){var d=document.querySelectorAll('#learnChapters details');if(d.length)d[d.length-1].open=true;})()");
  await sleep(300);
  console.log('教學主頁 章數', await p.eval("document.querySelectorAll('#learnChapters details').length"));
  await p.shot(path.join(OUT, 'm-learn.png'));

  await p.eval("window.__BH.Tut.startPlay()");
  await sleep(900);
  console.log('第1步 完整卡', await box(p, '#tutCard'), 'HUD底', await box(p, '#gameTop'));
  await p.shot(path.join(OUT, 'm-play1-full.png'));

  await p.eval("window.__BH.Tut._next()");
  await sleep(700);
  console.log('第2步 窄條', await box(p, '#tutCard'), 'mini=', await p.eval("document.getElementById('tutCard').classList.contains('mini')"));
  await p.shot(path.join(OUT, 'm-play2-mini.png'));

  // 縮放那一步（第 7 步）看目標格光圈還在不在
  await p.eval("(function(){var T=window.__BH.Tut;while(T.step<6)T._next();})()");
  await sleep(800);
  console.log('第7步 標題', await p.eval("document.getElementById('tutMiniT').textContent"),
    '窄條', await box(p, '#tutCard'));
  await p.shot(path.join(OUT, 'm-zoom-step.png'));

  await p.eval("document.getElementById('tutMini').click()");
  await sleep(600);
  console.log('展開後', await box(p, '#tutCard'));
  await p.shot(path.join(OUT, 'm-zoom-open.png'));
  p.close && p.close();

  // ---- 手機橫放 ----
  p = await boot(b, 844, 390, true);
  await p.eval("window.__BH.Tut.startPlay()");
  await sleep(800);
  await p.eval("window.__BH.Tut._next()");
  await sleep(700);
  console.log('橫放窄條', await box(p, '#tutCard'), 'HUD底', await box(p, '#gameTop'));
  await p.shot(path.join(OUT, 'l-play2-mini.png'));
  p.close && p.close();

  // ---- 桌機：確認窄條不會誤觸發（桌機要完整卡）----
  p = await boot(b, 1280, 900, false);
  await p.eval("window.__BH.Tut.startPlay()");
  await sleep(800);
  await p.eval("window.__BH.Tut._next()");
  await sleep(700);
  console.log('桌機第2步 mini=', await p.eval("document.getElementById('tutCard').classList.contains('mini')"),
    '卡片', await box(p, '#tutCard'));
  await p.shot(path.join(OUT, 'd-play2.png'));

  b.close();
})();
