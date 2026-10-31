// v2.0 目檢截圖：工具列全視窗／信箱 / 標題紅底外凸 / 紅龍邊緣紅光 / 飛行怪降速
const path = require('path');
const { launch, sleep } = require('./cdp');
const URL = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const OUT = __dirname + '/';

(async () => {
  const br = await launch({ w: 1000, h: 700, port: 9401 });
  const page = await br.newPage();
  await page.goto(URL, 1800);

  // 1) 首頁：標題字型外凸的紅底形狀（大光暈已拿掉）＋ 右上角工具列（⛶ / ✉️）
  const info = await page.eval(`(function(){
    var P = window.__BH;
    P.Screen.show('title');
    var en = document.querySelector('.title-en');
    var cs = getComputedStyle(en, '::before');
    var nav = ['btnBack','btnMusic','btnSfx','btnFull','btnMail'].map(function(id){
      var e = document.getElementById(id); if (!e) return id + '=缺';
      var r = e.getBoundingClientRect();
      return id + '(' + Math.round(r.left) + '~' + Math.round(r.right) + ')';
    });
    return { stroke: cs.webkitTextStrokeWidth + ' ' + cs.color, content: cs.content,
             nav: nav.join(' '), barW: Math.round(document.getElementById('navBar').getBoundingClientRect().width) };
  })()`);
  console.log('標題外凸層', JSON.stringify(info));
  await sleep(400);
  await page.shot(OUT + 'v20-1-title.png');
  console.log('v20-1-title.png');

  // 2) 手機直放：工具列四顆按鈕不能爆版
  await page.resize(390, 844, true);
  await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await page.goto(URL, 1500);
  const narrow = await page.eval(`(function(){
    var P = window.__BH; P.Screen.show('title');
    var out = {};
    ['btnBack','btnMusic','btnSfx','btnFull','btnMail'].forEach(function(id){
      var e = document.getElementById(id); if (!e) { out[id]='缺'; return; }
      var r = e.getBoundingClientRect();
      out[id] = Math.round(r.left) + '~' + Math.round(r.right);
    });
    var bar = document.getElementById('navBar').getBoundingClientRect();
    var last = document.getElementById('btnMail').getBoundingClientRect();
    return { btns: out, overflow: Math.round(last.right - bar.right), vw: innerWidth };
  })()`);
  console.log('手機工具列', JSON.stringify(narrow));
  await sleep(300);
  await page.shot(OUT + 'v20-2-title-phone.png');
  console.log('v20-2-title-phone.png');

  // 3) 紅龍：身體邊緣紅光閃爍（不再一大團）
  await page.resize(1000, 700, false);
  await page.send('Emulation.setTouchEmulationEnabled', { enabled: false });
  await page.goto(URL, 1600);
  const dragon = await page.eval(`(function(){
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
    var T=G.T, cx=Math.floor(G.cols/2), cy=Math.floor(G.rows/2);
    var me=G.players[0]; me.invuln=99; me.x=cx*T+T/2; me.y=cy*T+T/2;
    me.dino=true; me.redDragon=false; me.fireCd=0;
    G.eggs.push({x:cx,y:cy,bob:0,wob:0});
    P.takeEgg(me);            // 第二顆蛋 → 紅龍
    G.gameT=2.05; P.updateCamera(); P.render();
    G.state='paused';
    return { red: !!me.redDragon };
  })()`);
  console.log('紅龍', JSON.stringify(dragon));
  await sleep(300);
  await page.shot(OUT + 'v20-3-reddragon.png');
  console.log('v20-3-reddragon.png');

  // 4) 飛行怪速度：印出四種飛行怪與玩家的數值
  const spd = await page.eval(`(function(){
    var P = window.__BH;
    var out = { playerBase: P.playerSpeed({speedLv:0, skull:null}), cap: P.FLY_SPEED_CAP, fly: {} };
    P.ENEMY_SPECIES.filter(function(s){return s.kind==='fly';}).forEach(function(s){
      out.fly[s.name] = +(P.makeEnemy(2,2,s.id,8,1).speed).toFixed(1);
    });
    return out;
  })()`);
  console.log('速度對照', JSON.stringify(spd));

  await br.close();
})().catch(e => { console.error(e); process.exit(1); });
