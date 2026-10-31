// v2.4 目檢：對戰「我」牌子 / BOSS 5 格血條 / 小怪放大
const path = require('path');
const { launch, sleep } = require('./cdp');
const URL = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const OUT = __dirname + '/';

(async () => {
  const br = await launch({ w: 1100, h: 720, port: 9406 });
  const page = await br.newPage();
  await page.goto(URL, 1800);

  // ================= A. 對戰：自己的角色頭上要有「我」 =================
  const me = await page.eval(`(function(){
    var P = window.__BH, G = P.Game;
    P.settings.size='M'; P.settings.hazards='off'; P.settings.sd='off'; P.settings.ctrl='kb';
    P.Battle.resetSlots();
    P.startBattle();
    G.state='play'; G.countdown=0;
    var ps = G.players;
    // P1 = 我（人類），P2/P3/P4 = AI
    var who = ps.map(function(p){ return { slot:p.slot, ai:!!p.ai, mine:P.isMyPlayer(p) }; });
    // 把大家擠到中間一排，方便同框比較
    var T = G.T, cy = Math.floor(G.rows/2);
    ps.forEach(function(p,i){ p.x=(3+i*2)*T+T/2; p.y=cy*T+T/2; p.invuln=0; p.alive=true; p.moving=false; });
    G.enemies.length=0; G.bombs.length=0; G.flames.length=0;
    var ovIn = document.getElementById('ovIn');
    if (ovIn) ovIn.classList.add('hide');
    G.state='paused';
    P.render();
    return { mode:G.mode, who:who, version:P.VERSION };
  })()`);
  console.log('對戰「我」判定', JSON.stringify(me));
  await sleep(400);
  await page.shot(OUT + 'v24-1-battle-me.png');

  // ================= B. BOSS 血條：滿格 5，打 5 下倒下 =================
  const boss = await page.eval(`(function(){
    var P = window.__BH, G = P.Game;
    P.settings.soloDiff='normal'; P.settings.size='M'; P.settings.hazards='off'; P.settings.sd='off';
    P.startSolo(8, false);
    G.state='play';
    var T=G.T;
    // 清場，只留一隻 BOSS + 玩家
    G.enemies.length=0; G.bombs.length=0; G.flames.length=0; G.items.length=0;
    var b = P.makeBoss(6, 5, P.SOLO_DIFF.normal.bossHp);
    b.bombT = 999;                       // 先別丟炸彈，專心看血條
    G.enemies.push(b);
    var p=G.players[0]; p.invuln=999; p.x=2*T+T/2; p.y=5*T+T/2;
    var ovIn = document.getElementById('ovIn');
    if (ovIn) ovIn.classList.add('hide');
    var log=[];
    function burn(){
      b.hitT=0; G.flames.length=0;
      G.flames.push({cx:Math.floor(b.x/T), cy:Math.floor(b.y/T), owner:p, t:.5, life:.5, type:'c', dir:0, src:null});
      P.updateBoss(b, 1/60);
      G.flames.length=0;
      log.push({hp:b.hp, dead:!!b.dead});
    }
    // 打 2 下後先拍一張（血條剩 3/5）
    burn(); burn();
    var mid = {hp:b.hp, max:b.maxHp, dead:!!b.dead};
    G.state='paused'; P.render();
    return { BOSS_HITS:P.BOSS_HITS, maxHp:b.maxHp, after2:mid, log:log };
  })()`);
  console.log('BOSS 血條', JSON.stringify(boss));
  await page.shot(OUT + 'v24-2-boss-hp.png');

  const kill = await page.eval(`(function(){
    var P = window.__BH, G = P.Game, T=G.T;
    var b = G.enemies.filter(function(e){return e.boss;})[0];
    var p = G.players[0];
    var n=0;
    for (var i=0;i<6 && b && !b.dead;i++){
      b.hitT=0; G.flames.length=0;
      G.flames.push({cx:Math.floor(b.x/T), cy:Math.floor(b.y/T), owner:p, t:.5, life:.5, type:'c', dir:0, src:null});
      P.updateBoss(b, 1/60); G.flames.length=0; n++;
    }
    return { hits:n, hp:b.hp, dead:!!b.dead };
  })()`);
  console.log('打完', JSON.stringify(kill));

  // ================= C. 小怪放大：同框比較舊／新尺寸 =================
  const size = await page.eval(`(function(){
    var P = window.__BH, G = P.Game;
    P.startSolo(1, false);
    G.state='play';
    var T=G.T;
    G.enemies.length=0; G.bombs.length=0; G.flames.length=0; G.items.length=0;
    var ids = P.ENEMY_SPECIES.map(function(s){return s.id;});
    // 上排：v2.3 舊尺寸（把 r 除以倍率還原）；下排：v2.4 新尺寸
    function measure(e){
      var cv = document.getElementById('cv');
      var c = cv.getContext('2d');
      // 用離屏量測：直接取 drawEnemyArt 畫出的最大半徑
      var mx=0; var old={};
      var keys=['arc','ellipse','fillRect','strokeRect'];
      var of={};
      keys.forEach(function(k){ of[k]=c[k]; });
      keys.forEach(function(k){
        c[k]=function(){
          var a=arguments;
          var v=0;
          if(k==='arc') v=Math.abs(a[2]||0);
          else if(k==='ellipse') v=Math.max(Math.abs(a[2]||0),Math.abs(a[3]||0));
          else v=Math.max(Math.abs(a[2]||0),Math.abs(a[3]||0))/2;
          if(v>mx) mx=v;
          return of[k].apply(c, arguments);
        };
      });
      P.drawEnemyArt(e, 100, 100, false, 0);
      keys.forEach(function(k){ c[k]=of[k]; });
      return mx;
    }
    var rows=[];
    ids.forEach(function(id){
      var e=P.makeEnemy(3,3,id,1,1);
      var nowR=measure(e);
      var oldE=JSON.parse(JSON.stringify(e)); oldE.r=e.r/P.ENEMY_ART_MUL;
      var oldR=measure(oldE);
      rows.push({id:id, r:e.r, old:+oldR.toFixed(1), now:+nowR.toFixed(1), ratio:+(nowR/(oldR||1)).toFixed(2)});
    });
    // 排一排實際畫面：上排舊、下排新
    G.enemies.length=0;
    var half=Math.ceil(ids.length/2);
    ids.forEach(function(id,i){
      var col=i%half, rowi=Math.floor(i/half);
      var e=P.makeEnemy(2+col*2, 2+rowi*3, id, 1, 1);
      e.vx=0; e.vy=0;
      G.enemies.push(e);
    });
    G.state='paused'; P.render();
    return { MUL:P.ENEMY_ART_MUL, rows:rows, T:T };
  })()`);
  console.log('小怪放大倍率', JSON.stringify(size, null, 1));
  await sleep(300);
  await page.shot(OUT + 'v24-3-enemy-size.png');

  // ================= D. 快捷：同螢幕同時看小怪 + 玩家（相對大小） =================
  const rel = await page.eval(`(function(){
    var P = window.__BH, G = P.Game, T=G.T;
    P.startSolo(3, false); G.state='play';
    var p=G.players[0]; p.invuln=999; p.x=3*T+T/2; p.y=5*T+T/2;
    G.state='paused'; P.render();
    return { playerR: +(T*0.40).toFixed(1), enemyArtR: +P.enemyArtR(P.makeEnemy(1,1,'slime',1,1)).toFixed(1), T:T };
  })()`);
  console.log('相對大小', JSON.stringify(rel));

  await br.close();
})().catch(function (e) { console.error('ERR', e); process.exit(1); });
