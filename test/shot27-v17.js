// v1.7 目檢截圖：大哭臉 / 大笑臉 / BOSS 紫色火焰 / 輸送帶炸彈 / 勝利跳躍
const path = require('path');
const { launch, sleep } = require('./cdp');
const URL = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const OUT = __dirname + '/';

(async () => {
  const br = await launch({ w: 900, h: 620, port: 9371 });
  const page = await br.newPage();
  await page.goto(URL, 1600);

  // 1) 大哭臉：讓玩家被炸死
  await page.eval(`(function(){
    var P = window.__BH, G = P.Game;
    P.settings.size='M'; P.settings.hazards='off'; P.settings.sd='off';
    P.startSolo(3, false);
    P.Screen.show('game');
    document.getElementById('ovIn').classList.add('hide');
    document.getElementById('touchUI').style.display='none';
    G.state='play';
    G.enemies.length=0; G.bombs.length=0; G.flames.length=0;
    var p=G.players[0]; p.invuln=0;
    P.killPlayer(p,false,null);
    p.cry=2.8;
    p.x=7*G.T+G.T/2; p.y=5*G.T+G.T/2;
    G.gameT=1.2;
    P.updateCamera();
    P.render();
    return 1;
  })()`);
  await sleep(200);
  await page.shot(OUT + 'v17-1-cry.png');
  console.log('v17-1-cry.png');

  // 2) 大笑臉：炸到人的人
  await page.eval(`(function(){
    var P = window.__BH, G = P.Game;
    P.startSolo(1, false);
    P.Screen.show('game');
    document.getElementById('ovIn').classList.add('hide');
    document.getElementById('touchUI').style.display='none';
    G.state='play';
    G.enemies.length=0; G.bombs.length=0; G.flames.length=0;
    var p=G.players[0];
    p.x=7*G.T+G.T/2; p.y=5*G.T+G.T/2; p.invuln=0; p.alive=true; p.cry=0;
    p.gloat=2.2;            // 剛炸到人 → 大笑
    G.gameT=1.5;
    P.render();
    return 1;
  })()`);
  await sleep(200);
  await page.shot(OUT + 'v17-2-laugh.png');
  console.log('v17-2-laugh.png');

  // 3) BOSS 紫色火焰 + 玩家的橘色火焰
  await page.eval(`(function(){
    var P = window.__BH, G = P.Game;
    P.startSolo(8, false);
    P.Screen.show('game');
    document.getElementById('ovIn').classList.add('hide');
    document.getElementById('touchUI').style.display='none';
    G.state='play';
    G.bombs.length=0; G.flames.length=0;
    var T=G.T, me=G.players[0];
    me.x=2*T; me.y=2*T; me.invuln=99;
    var boss=P.makeBoss(7,5,10); boss.x=7*T+T/2; boss.y=5*T+T/2; boss.bombT=999;
    G.enemies=[boss];
    // BOSS 的紫色火焰
    for (var i=0;i<4;i++) G.flames.push({cx:7+i-1, cy:5, type:'mid', dir:'right', t:.46, owner:null});
    for (var j=1;j<3;j++) G.flames.push({cx:7, cy:5+j, type:'mid', dir:'down', t:.46, owner:null});
    // 玩家的橘色火焰
    for (var k=0;k<3;k++) G.flames.push({cx:2, cy:8+k, type:'mid', dir:'down', t:.46, owner:me});
    G.gameT=2.0;
    P.render();
    return { flames: G.flames.length, bossHp: boss.hp };
  })()`);
  await sleep(200);
  await page.shot(OUT + 'v17-3-purple.png');
  console.log('v17-3-purple.png');

  // 4) 輸送帶上的炸彈
  await page.eval(`(function(){
    var P = window.__BH, G = P.Game;
    P.settings.hazards='on';
    P.startSolo(2, false);
    P.Screen.show('game');
    document.getElementById('ovIn').classList.add('hide');
    document.getElementById('touchUI').style.display='none';
    G.state='play';
    G.bombs.length=0; G.flames.length=0; G.enemies.length=0;
    var T=G.T, me=G.players[0]; me.x=T*1.5; me.y=T*1.5; me.invuln=99;
    var cell=null;
    for (var y=1;y<G.rows-1&&!cell;y++) for (var x=1;x<G.cols-1;x++){
      var h=G.hazards[y][x];
      if (h&&h.type==='convey'){ cell={x:x,y:y,dir:h.dir}; break; }
    }
    // 在帶子上放兩顆很長的定時炸彈
    [[cell.x,cell.y],[G.cols-2,1]].forEach(function(c){
      G.bombs.push({cx:c[0],cy:c[1],px:c[0]*T+T/2,py:c[1]*T+T/2,timer:999,power:2,
        owner:me,passers:[],flying:null,moving:null,held:false,beltAcc:0});
    });
    var before = G.bombs.map(function(b){return b.cx+','+b.cy;}).join(' | ');
    for (var i=0;i<90;i++) P.updateWorld(1/60);
    var after = G.bombs.map(function(b){return b.cx+','+b.cy;}).join(' | ');
    P.render();
    return { dir: cell.dir, before: before, after: after };
  })()`).then(r => console.log('炸彈位置', JSON.stringify(r)));
  await sleep(200);
  await page.shot(OUT + 'v17-4-beltbomb.png');
  console.log('v17-4-beltbomb.png');

  // 5) 最終獲勝：結束畫面上一直跳
  await page.eval(`(function(){
    var P = window.__BH;
    P.showEnd('🏆 測試奪冠！','比分 2 / 1　·　難易度：普通',true,0);
    return 1;
  })()`);
  await sleep(700);
  await page.shot(OUT + 'v17-5-winjump.png');
  console.log('v17-5-winjump.png');

  await br.close();
})().catch(e => { console.error(e); process.exit(1); });
