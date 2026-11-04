// test/shot-v476.js — v4.76 目檢：首頁按鈕 / 隊友標記＋HUD / 亂入 BOSS
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');
const URL = 'file:///' + path.join(__dirname, '../index.html').replace(/\\/g, '/');
const OUT = path.join(__dirname, '_v476');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await launch({ w: 390, h: 800 });
  const p = await b.newPage();
  await p.goto(URL, 2000);
  for (let i = 0; i < 40; i++) { if (await p.eval('typeof __BH') === 'object') break; await sleep(300); }
  await p.eval("try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}; __BH.settings.ctrl='touch'; __BH.applyCtrl(); 1");

  // 1) 首頁（HOT 按鈕）
  await p.eval("(function(){var s=document.getElementById('scr-title'); if(s) s.classList.remove('hide'); return 1;})()");
  await sleep(400);
  await p.shot(path.join(OUT, 'home.png'));

  // 2) 入口卡
  await p.eval("document.getElementById('btnBR').click(); 1");
  await sleep(600);
  await p.shot(path.join(OUT, 'card.png'));

  // 3) 4 人組隊開局 → 隊友標記 + HUD 隊友列
  await p.eval(`(function(){
    var b=document.getElementById('brGo');
    __BH.BR.opt={n:20,team:4,dur:10};
    __BH.startBR();
    var G=__BH.Game;
    var ov=document.getElementById('ovIn'); if(ov) ov.classList.add('hide');
    var o2=document.getElementById('brOv'); if(o2) o2.classList.add('hide');
    G.state='play'; G.countdown=0;
    // 把兩個隊友搬到附近，才看得到標記
    var me=G.players[0], mates=[];
    for(var i=1;i<G.players.length && mates.length<2;i++){ if(G.players[i].team===me.team && G.players[i].alive) mates.push(G.players[i]); }
    // 找兩個「空地、不是草叢」的格子放隊友，才看得到人＋標記
    var cand=[];
    for(var dy=-2;dy<=2;dy++) for(var dx=-2;dx<=2;dx++){
      if(!dx && !dy) continue;
      var cx=Math.floor(me.x/G.T)+dx, cy=Math.floor(me.y/G.T)+dy;
      if(G.grid[cy] && G.grid[cy][cx]===0 && !__BH.hideTileAt(cx,cy)) cand.push([cx,cy]);
    }
    mates.forEach(function(q,k){ var c=cand[k*3]||cand[0]; if(c){ q.x=(c[0]+.5)*G.T; q.y=(c[1]+.5)*G.T; } q.brHp = k? 3 : 7; q.invuln=0; });
    G.players.forEach(function(q){ q.invuln=0; });
    return 1; })()`);
  await sleep(500);
  await p.eval(`(function(){
    var G=__BH.Game; G.zoom=G.zoomTarget=1; G.camSnap=true;
    for(var i=0;i<10;i++){ G.camSnap=(i===9); try{__BH.updateCamera(1/60);}catch(e){} }
    ['zoomHint','hzHint','rotHint','banner','toast'].forEach(function(id){var e=document.getElementById(id); if(e){e.style.display='none';}});
    try{__BH.render();}catch(e){}
    return 1; })()`);
  await sleep(300);
  await p.shot(path.join(OUT, 'mates.png'));

  // 4) 把 BOSS 搬到鏡頭前（含血條）
  await p.eval(`(function(){
    var G=__BH.Game, me=G.players[0];
    var b=G.enemies.filter(function(e){return e.brBoss;})[0];
    b.x=me.x+2.4*G.T; b.y=me.y-0.6*G.T; b.hp=13; b.aggro=true;
    G.zoom=G.zoomTarget=1; G.camSnap=true;
    for(var i=0;i<10;i++){ G.camSnap=(i===9); try{__BH.updateCamera(1/60);}catch(e){} }
    try{__BH.render();}catch(e){}
    return JSON.stringify({stage:b.brStage, hp:b.hp, aggro:b.aggro}); })()`).then(function(r){ console.log('boss', r); });
  await sleep(300);
  await p.shot(path.join(OUT, 'boss.png'));

  // 5) 42% 遠景：兩隻 BOSS 都在圖上
  await p.eval(`(function(){
    var G=__BH.Game; G.zoom=G.zoomTarget=0.42; G.camSnap=true;
    try{__BH.updateCamera(1);}catch(e){}
    try{__BH.render();}catch(e){}
    return 1; })()`);
  await sleep(300);
  await p.shot(path.join(OUT, 'boss-map.png'));
  b.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
