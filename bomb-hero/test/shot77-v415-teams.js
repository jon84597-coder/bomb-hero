// test/shot77-v415-teams.js — v4.15：對戰人數 2~8／精簡選角／組隊對戰
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');

const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const OUT = path.join(__dirname, '_v415');
fs.mkdirSync(OUT, { recursive: true });

const SETUP = function (n, teams) {
  return `(function(){
    var P = window.__BH;
    P.settings.count = ${n};
    P.settings.teams = ${teams};
    P.Battle.resetSlots();
    P.Screen.show('battle');
    P.updateCountHint();
    return 1;
  })()`;
};

(async () => {
  // ---------- 桌機 ----------
  const br = await launch({ w: 1280, h: 980, port: 9390 });
  const p = await br.newPage();
  await p.send('Page.addScriptToEvaluateOnNewDocument', {
    source: 'window.requestAnimationFrame = function(){ return 0; };'
  });
  await p.goto(URL, 1800);
  await sleep(700);

  await p.eval(SETUP(8, 4));
  await sleep(350);
  const info = await p.eval(`(function(){
    var w = document.getElementById('pSlots');
    var b = w.querySelector('.stg') || w.querySelector('.pbox');
    var r = w.getBoundingClientRect();
    var sb = w.querySelector('.pbox').getBoundingClientRect();
    return { n: w.querySelectorAll('.pbox').length, w: Math.round(r.width), h: Math.round(r.height),
      boxW: Math.round(sb.width), boxH: Math.round(sb.height),
      rows: new Set([].map.call(w.querySelectorAll('.pbox'), function(x){return Math.round(x.getBoundingClientRect().top);})).size,
      pageOverflow: document.documentElement.scrollWidth > window.innerWidth };
  })()`);
  console.log('desktop 8人4隊: ' + JSON.stringify(info));
  await p.shot(path.join(OUT, 'v415-battle-8p-4teams.png'));

  await p.eval(SETUP(2, 2));
  await sleep(300);
  await p.shot(path.join(OUT, 'v415-battle-2p-2teams.png'));

  // 開一場 4 隊 8 人（全 AI + 自己），看遊戲內隊色
  await p.eval(`(function(){
    var P = window.__BH;
    P.settings.count = 8; P.settings.teams = 4; P.settings.size = 'L';
    P.settings.hazards = 'off'; P.settings.sd = 'off'; P.settings.revenge = 'off';
    P.Battle.resetSlots();
    P.startBattle();
    P.Game.state = 'play';
    for (var i = 0; i < 90; i++) { P.updateWorld(1/60); P.updateBattle(1/60); }
    document.getElementById('ovIn').classList.add('hide');
    document.getElementById('banner').style.display = 'none';
    P.render();
    return 1;
  })()`);
  await sleep(500);
  await p.shot(path.join(OUT, 'v415-game-4teams.png'));

  await br.close();

  // ---------- 手機直放 ----------
  const br2 = await launch({ w: 900, h: 900, port: 9391 });
  const m = await br2.newPage();
  await m.send('Emulation.setDeviceMetricsOverride', {
    width: 390, height: 844, deviceScaleFactor: 2, mobile: true
  });
  await m.send('Page.addScriptToEvaluateOnNewDocument', {
    source: 'window.requestAnimationFrame = function(){ return 0; };'
  });
  await m.goto(URL, 1800);
  await sleep(700);
  await m.eval(`document.body.classList.add('touch')`);
  await m.eval(SETUP(8, 4));
  await sleep(350);
  const minfo = await m.eval(`(function(){
    var w = document.getElementById('pSlots');
    var r = w.getBoundingClientRect();
    var b = w.querySelector('.pbox').getBoundingClientRect();
    return { n: w.querySelectorAll('.pbox').length, w: Math.round(r.width),
      boxW: Math.round(b.width), boxH: Math.round(b.height),
      pageW: document.documentElement.scrollWidth, vw: window.innerWidth };
  })()`);
  console.log('phone 8人4隊: ' + JSON.stringify(minfo));
  await m.eval(`(function(){
    var w = document.getElementById('pSlots');
    window.scrollTo(0, window.scrollY + w.getBoundingClientRect().top - 70);
    return 1;
  })()`);
  await sleep(300);
  await m.shot(path.join(OUT, 'v415-battle-phone-8p.png'));
  await br2.close();
  console.log('shots -> ' + OUT);
})();
