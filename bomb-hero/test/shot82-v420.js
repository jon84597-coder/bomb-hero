// shot82-v420.js —— v4.20 截圖：BOSS 3 格內就發火（小怪同距離還看不到）
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const OUT = path.resolve(__dirname, '_v420');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);

async function newPage(br, w, h) {
  const p = await br.newPage();
  await p.resize(w, h, false);
  await p.send('Page.addScriptToEvaluateOnNewDocument', {
    source: 'window.requestAnimationFrame=function(){return 0;};'
  });
  await p.goto(URL, 1800);
  await sleep(700);
  return p;
}
async function cshot(p, file, rect, scale) {
  const r = await p.send('Page.captureScreenshot', {
    format: 'png', captureBeyondViewport: false,
    clip: { x: rect.x, y: rect.y, width: rect.w, height: rect.h, scale: scale || 2 }
  });
  fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
  return file;
}
async function centerBox(p, w, h) {
  return JSON.parse(await p.eval(`(function(){
    var c=document.querySelector('canvas'); var r=c.getBoundingClientRect();
    return JSON.stringify({x:r.left+r.width/2-${w / 2},y:r.top+r.height/2-${h / 2},w:${w},h:${h}});
  })()`));
}

// 共用：清空整張地圖當舞台、玩家站地圖中央偏左、BOSS 的家在右邊 5 格
const SETUP = `(function(){
  var P=window.__BH, G=P.Game, T=G.T;
  P.settings.size='M'; P.settings.soloDiff='normal'; P.settings.ctrl='kb';
  P.settings.hazards='off'; P.settings.sd='off';
  // 用一般單人關卡當舞台（BOSS 另外塞進來）—— 實測 BOSS 快打模式的玩家不會被畫出來
  P.startSolo(3, false);
  G.state='play'; G.hazards=[];
  document.getElementById('ovIn').classList.add('hide');
  var me=G.players[0]; me.alive=true; me.invuln=0; me.dino=false;   // 不能設 999：drawPlayer 會閃爍，gameT 凍住時可能整場都不畫
  // 玩家搬到地圖正中央（出生點在最角落，BOSS 擺旁邊會撞到畫面邊界 → 😡 被切掉）
  var mx=Math.floor(G.cols/2)-2, my=Math.floor(G.rows/2);
  for (var y=1;y<G.rows-1;y++) for (var x=1;x<G.cols-1;x++) G.grid[y][x]=0;
  me.x=mx*T+T/2; me.y=my*T+T/2;
  G.enemies.length=0; G.bombs.length=0; G.pets.length=0;
  var boss=P.makeBoss(2, 2, 12);
  boss.homeCX=Math.floor(me.x/T); boss.homeCY=Math.floor(me.y/T);
  G.enemies.push(boss);
  G.camSnap=true; P.updateCamera(1/60);      // 相機立刻對準玩家（不然平滑跟隨會拍到畫面外）
  window.__BOSS=boss; window.__ME=me;
  return 1;
})()`;

(async () => {
  const br = await launch({ w: 1280, h: 900, port: 9452 });
  const p = await newPage(br, 1280, 900);
  const ev = e => p.eval(e);
  const report = {};

  // ---------- 1. 玩家離 BOSS 5 格 → 牠只在自己地盤踱步（沒有 😡、不放彈） ----------
  await ev(SETUP);
  report.bossCalm = await ev(`(function(){
    var P=window.__BH, G=P.Game, T=G.T, boss=window.__BOSS, me=window.__ME;
    boss.x = me.x + 3.4*T; boss.y = me.y;  // 3.4 格：範圍外 → 冷靜
    boss.patrolRest=5;                     // 截圖當下先站著，免得踱步剛好走到玩家旁邊
    for (var i=0;i<20;i++) P.updateBoss(boss, 1/60);
    G.camSnap=true; P.updateCamera(1/60);
    P.updateHud(); P.render();
    return JSON.stringify({
      aggro:boss.aggro, anger:+boss.angerT.toFixed(2), bombs:G.bombs.length,
      dist:+(Math.hypot(boss.x-me.x,boss.y-me.y)/T).toFixed(2), homeR:boss.homeTiles
    });
  })()`);
  await sleep(400);
  await p.shot(path.join(OUT, 'v420-boss-patrol.png'));

  // ---------- 2. 2.6 格（3 格內、2 格外）→ BOSS 發火 ----------
  report.bossAnger = await ev(`(function(){
    var P=window.__BH, G=P.Game, T=G.T, boss=window.__BOSS, me=window.__ME;
    me.invuln=0;
    boss.x=me.x+2.6*T; boss.y=me.y;
    for (var i=0;i<10;i++) P.updateBoss(boss, 1/60);
    G.camSnap=true; P.updateCamera(1/60);
    P.updateHud(); P.render();
    return JSON.stringify({ aggro:boss.aggro, anger:+boss.angerT.toFixed(2),
      dist:+(Math.hypot(boss.x-me.x,boss.y-me.y)/T).toFixed(2) });
  })()`);
  await sleep(400);
  await p.shot(path.join(OUT, 'v420-boss-anger26.png'));
  await cshot(p, path.join(OUT, 'zoom-boss-anger26.png'), await centerBox(p, 420, 320), 2);

  // ---------- 3. 同一距離（2.6 格）的中階小怪：還看不到 ----------
  report.mobSame = await ev(`(function(){
    var P=window.__BH, G=P.Game, T=G.T, me=window.__ME;
    G.enemies.length=0; G.bombs.length=0;
    var sk=P.makeEnemy(1, 1, 'skull', 1, 1);
    sk.x=me.x+2.6*T; sk.y=me.y; sk.speed=0;
    G.enemies.push(sk); window.__SK=sk;
    for (var i=0;i<10;i++) P.updateEnemy(sk, 1/60);
    G.camSnap=true; P.updateCamera(1/60);
    P.updateHud(); P.render();
    return JSON.stringify({ aggro:!!sk.aggro, anger:+(sk.angerT||0).toFixed(2),
      dist:+(Math.hypot(sk.x-me.x,sk.y-me.y)/T).toFixed(2),
      bossR:P.BOSS_AGGRO_TILES, mobR:P.AGGRO_TILES });
  })()`);
  await sleep(400);
  await p.shot(path.join(OUT, 'v420-mob-26.png'));
  await cshot(p, path.join(OUT, 'zoom-mob-26.png'), await centerBox(p, 420, 300), 2);

  // ---------- 4. 3.4 格 → BOSS 沒被惹到 ----------
  report.bossFar = await ev(`(function(){
    var P=window.__BH, G=P.Game, T=G.T, boss=window.__BOSS, me=window.__ME;
    G.enemies.length=0; G.bombs.length=0;
    boss.aggro=false; boss.aggroPrev=false; boss.angerT=0; boss.windT=0; boss.dashT=0;
    boss.x=me.x+3.4*T; boss.y=me.y; boss.patrolRest=5;
    G.enemies.push(boss);
    for (var i=0;i<10;i++) P.updateBoss(boss, 1/60);
    G.camSnap=true; P.updateCamera(1/60);
    P.updateHud(); P.render();
    return JSON.stringify({ aggro:boss.aggro, anger:+(boss.angerT||0).toFixed(2),
      dist:+(Math.hypot(boss.x-me.x,boss.y-me.y)/T).toFixed(2) });
  })()`);
  await sleep(400);
  await p.shot(path.join(OUT, 'v420-boss-34.png'));

  // ---------- 5. 說明書：BOSS 條目寫 3 格 ----------
  report.help = await ev(`(function(){
    var P=window.__BH;
    P.Screen.show('title');
    P.Help.show();
    P.Help.setTab('foe');
    var body=document.getElementById('helpBody');
    var txt=body?body.textContent:'';
    var subs=body?body.querySelectorAll('.hsub'):[];
    for (var i=0;i<subs.length;i++){ if(subs[i].textContent.indexOf('BOSS')>=0){ subs[i].scrollIntoView({block:'start'}); break; } }
    return JSON.stringify({ has3:txt.indexOf('踏進 3 格內')>=0, len:txt.length });
  })()`);
  await sleep(600);
  await p.shot(path.join(OUT, 'v420-help-boss.png'));

  console.log(JSON.stringify(report, null, 2));
  br.close();
})();
