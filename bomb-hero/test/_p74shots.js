// test/_p74shots.js —— v5.74 視覺驗收：直放頂欄 / 深淵契約卡 / 角色專屬技 / 圖鑑獎勵 / 賽季紅點
// 用法：node test/_p74shots.js        （需要 Chrome；不進 _runall）
const { launch } = require('./cdp');
const path = require('path');
const fs = require('fs');
const URL0 = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const OUT = path.join(__dirname, '_v574');
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const br = await launch({ w: 430, h: 900, port: 9411 });
  const p = await br.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.resize(430, 900, true);
  await p.goto(URL0, 900);
  await p.eval("(function(){try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}return 1;})()");
  await p.goto(URL0, 4000);
  for (let i = 0; i < 30; i++) { if (await p.eval('!!window.__BH')) break; await wait(300); }
  const boot = await p.eval("(function(){ return { v: window.__BH.VERSION, rpg: typeof window.__BH.RpgUI, miss: window.__BHRPG_MISSING || null }; })()");
  console.log('boot', JSON.stringify(boot));

  // ── ① 首頁（430 直放）
  await p.eval("(function(){var P=window.__BH;P.Solo.unlocked=40;P.Starter.apply();P.homeFill&&P.homeFill();return 1;})()");
  await wait(700);
  await p.shot(path.join(OUT, '01-title-430.png'));

  // ── ② 全解鎖後的每日／商店（確認沒被 starter 藏起來）
  const home = await p.eval(`(function(){
    var ids=['btnAdventure','btnDaily','btnStore','btnMulti','btnBR','btnRpg'];
    var o={}; ids.forEach(function(i){var e=document.getElementById(i);var r=e?e.getBoundingClientRect():null;
      o[i]= r? [Math.round(r.width),Math.round(r.height),getComputedStyle(e).display] : null;});
    return o; })()`);
  console.log('home', JSON.stringify(home));

  // ── ③ 角色頁（專屬技卡）
  await p.eval("(function(){var P=window.__BH;P.setDevBuild(false);P.RpgUI.openChar();return 1;})()");
  await wait(900);
  await p.shot(path.join(OUT, '02-char-430.png'));

  // ── ④ 深淵契約三選一
  await p.eval("(function(){var P=window.__BH;P.Screen.show('title');return 1;})()");
  await wait(300);
  await p.eval("(function(){var P=window.__BH;try{P.AbyssPerk.open(11);}catch(e){return String(e.message);}return 1;})()");
  await wait(700);
  await p.shot(path.join(OUT, '03-perk-430.png'));
  const perk = await p.eval(`(function(){
    var w=document.getElementById('apRow');
    return { on: (document.getElementById('abyssPerk')||{}).className||'',
             cards: w? w.children.length : -1,
             txt: w? (w.textContent||'').replace(/\\s+/g,' ').slice(0,90) : '' }; })()`);
  console.log('perk', JSON.stringify(perk));

  // ── ⑤ 圖鑑（集滿獎勵列）
  await p.eval("(function(){var P=window.__BH;P.Screen.show('codex');return 1;})()");
  await wait(800);
  await p.shot(path.join(OUT, '04-codex-430.png'));
  const cdx = await p.eval("(function(){var e=document.getElementById('codexRew');return {len:(e&&e.innerHTML||'').length, txt:(e&&e.textContent||'').replace(/\\s+/g,' ').slice(0,80)};})()");
  console.log('codexRew', JSON.stringify(cdx));

  // ── ⑥ 遊戲中 HUD（深淵第三行＋頂欄）
  await p.eval("(function(){var P=window.__BH;P.Solo.unlocked=40;P.Abyss.start(3);return 1;})()");
  await wait(1200);
  await p.eval("(function(){var b=document.querySelector('#ovBox button');if(b)b.click();return 1;})()");
  await wait(3600);
  const hud = await p.eval(`(function(){
    var gt=document.getElementById('gameTop'), cv=document.getElementById('cv');
    var b=gt?gt.getBoundingClientRect():null, q=cv?cv.getBoundingClientRect():null;
    return { state:window.__BH.Game.state, vw:innerWidth, vh:innerHeight,
      bar:b?[Math.round(b.left),Math.round(b.top),Math.round(b.right),Math.round(b.bottom)]:null,
      scrollW:gt?gt.scrollWidth:0, clientW:gt?gt.clientWidth:0,
      cv:q?[Math.round(q.top),Math.round(q.height)]:null }; })()`);
  console.log('hud', JSON.stringify(hud));
  await p.shot(path.join(OUT, '05-game-430.png'));

  // ── ⑦ 360×640 直放（窄機）
  await p.resize(360, 640, true);
  await wait(600);
  await p.eval("(function(){var P=window.__BH;P.Screen.show('title');return 1;})()");
  await wait(700);
  await p.shot(path.join(OUT, '06-title-360.png'));
  const narrow = await p.eval(`(function(){
    var gt=document.getElementById('gameTop');
    return { scrollW:gt?gt.scrollWidth:0, clientW:gt?gt.clientWidth:0,
      docW:document.documentElement.scrollWidth, vw:innerWidth }; })()`);
  console.log('narrow', JSON.stringify(narrow));

  await br.close();
  console.log('shots →', OUT);
})();
