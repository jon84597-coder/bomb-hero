// test/shot-v470.js — v4.70 目檢：小地圖（手機／桌面／T5）＋ 組隊隊色 HUD ＋ RPG 章節魔王
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');
const URL = 'file:///' + path.join(__dirname, '../index.html').replace(/\\/g, '/');
const OUT = path.join(__dirname, '_v470');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const CLEAN = `(function(){
  ['rotHint','zoomHint'].forEach(function(id){var e=document.getElementById(id); if(e) e.remove();});
  ['zoomPill','banner','toast'].forEach(function(id){var e=document.getElementById(id); if(e) e.style.display='none';});
  var ov=document.getElementById('ovIn'); if(ov) ov.classList.add('hide');
  return 1;
})()`;

// 單人隨機地圖（stage 決定 T1~T5）
function soloScene(stage) {
  return `(function(){
    var G = __BH.Game;
    __BH.settings.mapMode = 'random';
    __BH.startSolo(${stage}, false);
    G.state = 'play';
    var me = G.players[0];
    me.invuln = 0;
    G.zoom = G.zoomTarget = 0.85; G.camSnap = true;
    try { __BH.updateCamera(1); __BH.render(); } catch (e) {}
    return JSON.stringify({ T: G.T, cols: G.cols, rows: G.rows, mini: __BH.miniMapOn(), seed: __BH.seedCode() });
  })()`;
}

// 組隊對戰 4 隊
const BATTLE = `(function(){
  var G = __BH.Game;
  __BH.settings.count = 8; __BH.settings.teams = 4; __BH.settings.size = 'M';
  __BH.startBattle();
  G.state = 'play';
  G.players.forEach(function(p){ p.alive = true; if (p.invuln) p.invuln = 0; });
  G.zoom = G.zoomTarget = 1; G.camSnap = true;
  try { __BH.updateCamera(1); __BH.render(); } catch (e) {}
  return JSON.stringify({ teams: G.teamsOn, n: G.players.length, mini: __BH.miniMapOn() });
})()`;

// RPG 第 4 關（章節魔王）＋ 隨機地圖
const RPG4 = `(function(){
  var G = __BH.Game;
  __BH.settings.mapMode = 'random';
  __BH.startRpg(4);
  G.state = 'play';
  var me = G.players[0]; me.invuln = 0;
  var boss = G.enemies.filter(function(e){ return e.boss; })[0];
  if (boss) { me.x = boss.x; me.y = boss.y + G.T * 3; }
  G.zoom = G.zoomTarget = 0.9; G.camSnap = true;
  try { __BH.updateCamera(1); __BH.render(); } catch (e) {}
  return JSON.stringify({ boss: !!boss, hp: boss && boss.hp, mini: __BH.miniMapOn() });
})()`;

(async function () {
  const br = await launch({ port: 9611, w: 390, h: 844 });
  async function page(w, h, touch) {
    const p = await br.newPage();
    if (touch) await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await p.resize(w, h, true);
    await p.goto(URL, 3200);
    for (let i = 0; i < 40; i++) {
      const a = await p.eval('typeof __BH').catch(() => 'x');
      if (a === 'object') break;
      await sleep(300);
    }
    if (touch) await p.eval("try{localStorage.setItem('bombhero-rotstip','1');localStorage.setItem('bombhero-rotskip','1')}catch(e){}; __BH.settings.ctrl='touch'; __BH.applyCtrl(); 1");
    await p.eval(CLEAN);
    return p;
  }

  // 1) 手機 390×844：T1（18×16）
  let p = await page(390, 844, true);
  console.log('T1', await p.eval(soloScene(1)));
  await p.eval(CLEAN); await p.eval('try{__BH.render()}catch(e){}');
  await sleep(250); await p.shot(path.join(OUT, 'mini-t1-phone.png'));

  // 2) 手機：T5（28×25）
  console.log('T5', await p.eval(soloScene(20)));
  await p.eval(CLEAN); await p.eval('try{__BH.render()}catch(e){}');
  await sleep(250); await p.shot(path.join(OUT, 'mini-t5-phone.png'));

  // 3) 手機：組隊對戰 4 隊（隊色 HUD）
  console.log('battle', await p.eval(BATTLE));
  await p.eval(CLEAN); await p.eval('try{__BH.render()}catch(e){}');
  await sleep(250); await p.shot(path.join(OUT, 'team-hud-phone.png'));

  // 4) 桌面 1280×800：T5
  let d = await page(1280, 800, false);
  console.log('desktop', await d.eval(soloScene(20)));
  await d.eval(CLEAN); await d.eval('try{__BH.render()}catch(e){}');
  await sleep(250); await d.shot(path.join(OUT, 'mini-t5-desktop.png'));

  // 5) RPG 第 4 關：章節魔王
  console.log('rpg4', await d.eval(RPG4));
  await d.eval(CLEAN); await d.eval('try{__BH.render()}catch(e){}');
  await sleep(250); await d.shot(path.join(OUT, 'rpg-boss-mini.png'));

  br.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
