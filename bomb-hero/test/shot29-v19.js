// v1.9 目檢截圖：標題深紅光芒 / 單人選關的大「開始遊戲」按鈕 /
//                 對戰 P2 預設 AI / 頭暈特效 / BOSS 3 格火焰 / 手機小搖桿
const path = require('path');
const { launch, sleep } = require('./cdp');
const URL = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const OUT = __dirname + '/';

(async () => {
  const br = await launch({ w: 1000, h: 700, port: 9395 });
  const page = await br.newPage();
  await page.goto(URL, 1800);

  // 1) 新版首頁：標題底下要有深紅色噴發光芒
  await page.eval(`(function(){
    window.__BH.Screen.show('title');
    var w = document.querySelector('.titlewrap');
    return { hasWrap: !!w, rays: !!(w && getComputedStyle(w, '::before').width) };
  })()`).then(r => console.log('標題光芒容器', JSON.stringify(r)));
  await sleep(400);
  await page.shot(OUT + 'v19-1-title.png');
  console.log('v19-1-title.png');

  // 2) 手機直放首頁
  await page.resize(390, 844, true);
  await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await page.goto(URL, 1500);
  await page.eval(`(function(){ window.__BH.Screen.show('title'); return 1; })()`);
  await sleep(300);
  await page.shot(OUT + 'v19-2-title-phone.png');
  console.log('v19-2-title-phone.png');

  // 3) 單人闖關：選關 + 明顯的「開始遊戲」大按鈕
  await page.eval(`(function(){
    var P = window.__BH;
    P.Screen.show('solo');
    try { localStorage.setItem('bombhero-stage', '5'); } catch (e) {}
    P.Solo.init();
    P.Solo.pick(3);
    var b = document.getElementById('btnSoloGo');
    var r = b.getBoundingClientRect();
    return { txt: document.getElementById('soloGoTxt').textContent,
             sub: document.getElementById('soloGoSub').textContent,
             h: Math.round(r.height), w: Math.round(r.width),
             locked: b.classList.contains('locked') };
  })()`).then(r => console.log('開始遊戲按鈕', JSON.stringify(r)));
  await page.eval(`(function(){
    var b = document.getElementById('btnSoloGo');
    if (b) b.scrollIntoView({ block: 'center' });
    return b ? Math.round(b.getBoundingClientRect().top) : -1;
  })()`).then(r => console.log('按鈕捲動到', r));
  await sleep(400);
  await page.shot(OUT + 'v19-3-solo-go.png');
  await page.fullShot(OUT + 'v19-3-solo-go-full.png');
  console.log('v19-3-solo-go.png (+full)');

  // 4) 對戰設定：P2 預設 AI
  await page.resize(1000, 700, false);
  await page.send('Emulation.setTouchEmulationEnabled', { enabled: false });
  await page.goto(URL, 1600);
  await page.eval(`(function(){
    var P = window.__BH;
    P.settings.count = 4;
    P.Battle.resetSlots();
    P.Screen.show('battle');
    return P.Battle.slots.map(function (s) {
      return s.label + (s.joined && !s.forceAi ? '=人類' : '=AI');
    }).join(' ');
  })()`).then(r => console.log('對戰槽位', r));
  await sleep(400);
  await page.shot(OUT + 'v19-4-battle-p2ai.png');
  console.log('v19-4-battle-p2ai.png');

  // 5) 頭暈特效：飛行中的炸彈砸到人 → 頭上轉星星
  await page.eval(`(function(){
    var P = window.__BH, G = P.Game;
    P.settings.hazards='off';
    P.startSolo(1, false);
    P.Screen.show('game');
    document.getElementById('ovIn').classList.add('hide');
    document.getElementById('touchUI').style.display='none';
    G.state='play';
    for (var y=1;y<G.rows-1;y++) for (var x=1;x<G.cols-1;x++) G.grid[y][x]=0;
    G.enemies.length=0; G.bombs.length=0; G.flames.length=0; G.items.length=0;
    if (G.eggs) G.eggs.length=0;
    var T=G.T, me=G.players[0];
    me.invuln=99; me.alive=true;
    me.x=5*T+T/2; me.y=5*T+T/2;
    var e=P.makeEnemy(3,5,'slime',1,1); G.enemies.push(e);
    var fb={cx:3,cy:5,px:me.x,py:me.y,timer:2,power:2,owner:me,passers:[],
            flying:{fx:3,fy:5,tx:5,ty:5,t:0.5,dur:0.6},held:false,moving:null};
    G.bombs.push(fb);
    P.flyingDizzyCheck(fb, T);
    P.setDizzy(e, T);
    G.gameT=2.2; P.updateCamera(); P.render();
    G.state='paused';
    return { meDizzy: me.dizzy, eDizzy: (e.dizzy||0) > 0 };
  })()`).then(r => console.log('頭暈', JSON.stringify(r)));
  await sleep(300);
  await page.shot(OUT + 'v19-5-dizzy.png');
  console.log('v19-5-dizzy.png');

  // 6) BOSS 火焰 3 格
  await page.eval(`(function(){
    var P = window.__BH, G = P.Game;
    P.startSolo(8, false);
    P.Screen.show('game');
    document.getElementById('ovIn').classList.add('hide');
    document.getElementById('touchUI').style.display='none';
    G.state='play';
    var T=G.T, boss=G.enemies.filter(function(e){return e.boss;})[0];
    if (!boss) return { err:'no boss' };
    var cx=Math.floor(boss.x/T), cy=Math.floor(boss.y/T);
    G.flames.length=0;
    P.addFlame(cx, cy, 'center', null, null, null);
    for (var d=1; d<=P.BOSS_POWER; d++) P.addFlame(cx+d, cy, d===P.BOSS_POWER?'end':'mid', 'right', null, null);
    var me=G.players[0]; me.invuln=99; me.x=boss.x-T; me.y=boss.y+T*1.5;
    G.gameT=1.6; P.updateCamera(); P.render();
    G.state='paused';
    return { power: P.BOSS_POWER, flames: G.flames.length };
  })()`).then(r => console.log('BOSS 火焰', JSON.stringify(r)));
  await sleep(300);
  await page.shot(OUT + 'v19-6-boss-fire.png');
  console.log('v19-6-boss-fire.png');

  // 7) 手機搖桿（預設小）
  await page.resize(390, 844, true);
  await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await page.goto(URL, 1500);
  await page.eval(`(function(){
    var P = window.__BH, G = P.Game;
    P.settings.hazards='off';
    P.startSolo(1, false);
    P.Screen.show('game');
    document.getElementById('ovIn').classList.add('hide');
    document.body.classList.add('touch');
    G.state='play';
    G.gameT=1.0; P.updateCamera(); P.render();
    G.state='paused';
    var pad=document.getElementById('tpad').getBoundingClientRect();
    var knob=document.getElementById('tpknob').getBoundingClientRect();
    return { tpadSize: P.settings.tpad.size, pad: Math.round(pad.width), knob: Math.round(knob.width) };
  })()`).then(r => console.log('手機搖桿', JSON.stringify(r)));
  await sleep(300);
  await page.shot(OUT + 'v19-7-touch-pad.png');
  console.log('v19-7-touch-pad.png');

  await br.close();
})().catch(e => { console.error(e); process.exit(1); });
