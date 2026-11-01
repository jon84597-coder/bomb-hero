// shot81-v419.js —— v4.19 截圖：2 格仇恨 / 中高階怪生氣 / BOSS 踱步
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const OUT = path.resolve(__dirname, '_v419');
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
// 局部放大截圖（clip 用 CSS px，scale 放大倍率）
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

(async () => {
  const br = await launch({ w: 1280, h: 900, port: 9451 });
  const p = await newPage(br, 1280, 900);
  const ev = e => p.eval(e);
  const report = {};

  // ---------- 1. 中階怪 2 格內：頭上冒 😡（旁邊的低階怪不會） ----------
  report.mid = await ev(`(function(){
    var P=window.__BH, G=P.Game, T=G.T;
    P.settings.size='M'; P.settings.soloDiff='normal'; P.settings.ctrl='kb';
    P.settings.hazards='off'; P.settings.sd='off';
    P.startSolo(3, false);
    G.state='play';
    G.hazards=[];
    document.getElementById('ovIn').classList.add('hide');
    var me=G.players[0]; me.alive=true; me.invuln=999;
    // 舞台搬到地圖正中央（相機才不會被邊界夾住）
    var mx=Math.floor(G.cols/2)-2, my=Math.floor(G.rows/2);
    me.x=mx*T+T/2; me.y=my*T+T/2;
    for (var y=my-4;y<=my+4;y++) for (var x=mx-4;x<=mx+7;x++){
      if (y>0&&y<G.rows-1&&x>0&&x<G.cols-1) G.grid[y][x]=0;
    }
    G.enemies.length=0; G.bombs.length=0; G.pets.length=0;
    var sk=P.makeEnemy(mx+2, my, 'skull', 1, 1);      // 中階：骷髏兵（2 格 → 會生氣）
    sk.x=(mx+2)*T+T/2; sk.y=my*T+T/2;
    var far=P.makeEnemy(mx-2, my-3, 'skull', 1, 1);   // 中階但距離 3.6 格 → 不會生氣
    far.x=(mx-2)*T+T/2; far.y=(my-3)*T+T/2; far.dirT=999;
    var sl=P.makeEnemy(mx-2, my+2, 'slime', 1, 1);    // 低階：史萊姆（2 格內但不會生氣）
    sl.x=(mx-2)*T+T/2; sl.y=(my+2)*T+T/2; sl.dirT=999;
    G.enemies.push(sk); G.enemies.push(sl); G.enemies.push(far);
    for (var i=0;i<20;i++) P.updateEnemy(sk, 1/60);
    for (var i2=0;i2<6;i2++) P.updateEnemy(sl, 1/60);
    for (var i3=0;i3<6;i3++) P.updateEnemy(far, 1/60);
    P.updateCamera(1/60); P.updateHud(); P.render();
    return JSON.stringify({
      me:[mx,my], skullAggro:sk.aggro, skullAnger:+sk.angerT.toFixed(2), wind:+sk.windT.toFixed(2),
      slimeAggro:sl.aggro, slimeAngry:P.isAngryFoe(sl), skullAngry:P.isAngryFoe(sk),
      farAggro:far.aggro, farDist:+(Math.hypot(far.x-me.x,far.y-me.y)/T).toFixed(2),
      tierSkull:P.foeTier('skull'), tierSlime:P.foeTier('slime')
    });
  })()`);
  await sleep(400);
  await p.shot(path.join(OUT, 'v419-anger-mid.png'));
  await cshot(p, path.join(OUT, 'zoom-anger-mid.png'), await centerBox(p, 380, 300), 2);

  // ---------- 2. 把骷髏兵拉到 4 格外：不會冒 😡（沒被發現） ----------
  report.far = await ev(`(function(){
    var P=window.__BH, G=P.Game, T=G.T;
    var me=G.players[0];
    var sk=G.enemies.filter(function(e){return e.type==='skull';})[0];
    sk.x=me.x+4*T; sk.y=me.y; sk.windT=0; sk.dashT=0; sk.angerT=0; sk.aggro=false;
    sk.dirT=999;
    P.updateCamera(1/60); P.render();
    return JSON.stringify({ aggro:P.enemyAggro(sk), dist:+(Math.hypot(sk.x-me.x,sk.y-me.y)/T).toFixed(2) });
  })()`);
  await sleep(300);
  await p.shot(path.join(OUT, 'v419-anger-far.png'));
  await cshot(p, path.join(OUT, 'zoom-anger-far.png'), await centerBox(p, 420, 260), 2);

  // ---------- 3. BOSS：4 格外只踱步（沒有 😡、不放彈） ----------
  report.bossCalm = await ev(`(function(){
    var P=window.__BH, G=P.Game, T=G.T;
    P.startBossRush();
    G.state='play';
    G.hazards=[];
    document.getElementById('ovIn').classList.add('hide');
    var me=G.players[0]; me.alive=true; me.invuln=999; me.dino=false;
    var mx=Math.floor(G.cols/2)-2, my=Math.floor(G.rows/2);
    me.x=mx*T+T/2; me.y=my*T+T/2;
    for (var y=my-4;y<=my+4;y++) for (var x=mx-4;x<=mx+7;x++){
      if (y>0&&y<G.rows-1&&x>0&&x<G.cols-1) G.grid[y][x]=0;
    }
    G.enemies.length=0; G.bombs.length=0; G.pets.length=0;
    var boss=P.makeBoss(mx+4, my, 12);
    boss.x=(mx+4)*T+T/2; boss.y=my*T+T/2;
    G.enemies.push(boss);
    for (var i=0;i<60;i++) P.updateBoss(boss, 1/60);
    P.updateCamera(1/60); P.updateHud(); P.render();
    window.__BOSS = boss;
    return JSON.stringify({
      aggro:boss.aggro, anger:+boss.angerT.toFixed(2), bombs:G.bombs.length,
      dist:+(Math.hypot(boss.x-me.x,boss.y-me.y)/T).toFixed(2), homeR:boss.homeTiles
    });
  })()`);
  await sleep(400);
  await p.shot(path.join(OUT, 'v419-boss-patrol.png'));

  // ---------- 4. BOSS：踏進 2 格 → 😡 發火 ----------
  report.bossAnger = await ev(`(function(){
    var P=window.__BH, G=P.Game, T=G.T;
    var me=G.players[0], boss=window.__BOSS;
    me.invuln=999;
    boss.x=me.x+2*T; boss.y=me.y;
    for (var i=0;i<8;i++) P.updateBoss(boss, 1/60);
    P.updateCamera(1/60); P.updateHud(); P.render();
    return JSON.stringify({ aggro:boss.aggro, anger:+boss.angerT.toFixed(2),
      dist:+(Math.hypot(boss.x-me.x,boss.y-me.y)/T).toFixed(2) });
  })()`);
  await sleep(400);
  await p.shot(path.join(OUT, 'v419-boss-anger.png'));
  await cshot(p, path.join(OUT, 'zoom-boss-anger.png'), await centerBox(p, 400, 340), 2);

  // ---------- 5. 說明書：怪物圖鑑的中階／高階標籤 ----------
  await ev(`(function(){
    var P=window.__BH;
    P.Screen.show('title');
    P.Help.show();
    P.Help.setTab('foe');
    return 1;
  })()`);
  await sleep(700);
  report.help = await ev(`(function(){
    var body=document.getElementById('helpBody');
    var txt=body?body.textContent:'';
    var badges=(body?body.querySelectorAll('.hbadge'):[]);
    var t=[];
    Array.prototype.forEach.call(badges,function(b){ if(/中階|高階/.test(b.textContent)) t.push(b.textContent); });
    return JSON.stringify({ len:txt.length, tiers:t.slice(0,8), has2:(txt.indexOf('2 格內')>=0) });
  })()`);
  await ev(`(function(){
    var body=document.getElementById('helpBody');
    var hs=body?body.querySelectorAll('.hsub'):[];
    for (var i=0;i<hs.length;i++){ if(hs[i].textContent.indexOf('地面怪')>=0){ hs[i].scrollIntoView({block:'start'}); break; } }
    return 1;
  })()`);
  await sleep(400);
  await p.shot(path.join(OUT, 'v419-help-tiers.png'));

  // ---------- 6. 說明書：v4.13 新怪的名稱不再顯示 sp.xxx ----------
  report.codex = await ev(`(function(){
    var body=document.getElementById('helpBody');
    var txt=body?body.textContent:'';
    var bad=(txt.match(/sp\\.[a-z]+/g)||[]);
    var want=['撿彈怪','拆彈怪','放彈怪','貓熊','企鵝','章魚','機器人','鬼火','小巫師','大黃蜂'];
    var hit=[]; for (var i=0;i<want.length;i++){ if(txt.indexOf(want[i])>=0) hit.push(want[i]); }
    return JSON.stringify({ keys:bad.slice(0,6), hit:hit.length, list:hit });
  })()`);
  await ev(`(function(){
    var body=document.getElementById('helpBody');
    var cs=body?body.querySelectorAll('.hcard'):[];
    for (var i=0;i<cs.length;i++){ if(cs[i].textContent.indexOf('撿彈怪')>=0){ cs[i].scrollIntoView({block:'center'}); break; } }
    return 1;
  })()`);
  await sleep(400);
  await p.shot(path.join(OUT, 'v419-help-codex.png'));

  console.log(JSON.stringify(report, null, 2));
  br.close();
})();
