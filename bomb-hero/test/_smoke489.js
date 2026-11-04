// test/_smoke489.js —— v4.89 實機：落地重擊特效 / 風暴鴕鳥外觀 / 俯衝
// 跑法：node test/_smoke489.js
const { launch, sleep } = require('./cdp');
const URL = process.env.BH_URL || 'file:///C:/Users/jon84/WorkBuddy/2026-10-30-12-58-54/bomb-hero/index.html';

const SETUP = `(function(storm){
  const G=__BH.Game, pl=G.players[0], T=G.T;
  // 為了拍照：把地圖中央 9×9 清成空地，角色站中間，環形才看得完整
  const cx=Math.floor(G.cols/2), cy=Math.floor(G.rows/2);
  for (let y=cy-4;y<=cy+4;y++) for (let x=cx-4;x<=cx+4;x++){
    if (y>0&&x>0&&y<G.rows-1&&x<G.cols-1) G.grid[y][x]=0;
  }
  const best={x:cx,y:cy};
  pl.x=best.x*T+T/2; pl.y=best.y*T+T/2; pl.invuln=0; pl.slamGuard=0;
  pl.dino=true; pl.ostrich=true; pl.storm=!!storm; pl.dived=false; pl.air=0; pl.jumpLift=0;
  pl.fireCd=0; pl.facing='right';
  G.state='play';
  G.rings=[]; G.particles=[];
  return best;
})`;

(async () => {
  const b = await launch({ w: 900, h: 700 });
  const p = await b.newPage();
  await p.goto(URL + '?cb=' + Date.now(), 1500);
  for (let i = 0; i < 80; i++) { if (await p.eval('typeof __BH') === 'object') break; await sleep(250); }
  await sleep(600);
  console.log('VERSION', await p.eval('__BH.VERSION'));

  await p.eval('__BH.startSolo(1);1');
  await sleep(900);
  // 關卡開場卡 → 按「出發！」，等倒數結束
  await p.eval("(function(){ var b=document.querySelector('#ovBox button'); if(b) b.click(); return !!b; })()");
  await sleep(4200);
  console.log('spot', JSON.stringify(await p.eval(SETUP + '(false)')));

  // 旁邊放兩隻怪（有血條），看得到被打到
  await p.eval(`(function(){
    const G=__BH.Game, pl=G.players[0], T=G.T;
    G.enemies.slice(0,3).forEach(function(e,i){
      e.x=pl.x+(i+1)*T; e.y=pl.y+(i>1?T:0); if (e.maxHp>1) e.hp=e.maxHp;
    });
    return 1;
  })()`);

  // ---------- ① 落地重擊（把時間軸拉長並固定在 25%／55%，才截得到那兩瞬） ----------
  for (const [k, tag] of [[.25, 'a'], [.55, 'b']]) {
    await p.eval(`(function(){
      const G=__BH.Game, pl=G.players[0];
      __BH.ostrichLand(pl);
      const gt=G.gameT;
      (G.rings||[]).forEach(function(r){ r.dur*=10; r.born=gt-r.dur*${k}; });
      return G.rings.length;
    })()`);
    await p.shot('test/_smoke489-slam-' + tag + '.png');
    await sleep(400);
  }
  console.log('rings after slam', await p.eval('(__BH.Game.rings||[]).length'));
  await sleep(900);

  // ---------- ② 風暴鴕鳥外觀（靜止 + 移動各一張） ----------
  await p.eval(SETUP + '(true)');
  await sleep(400);
  await p.shot('test/_smoke489-storm-idle.png');
  await p.eval("window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyD',key:'d',bubbles:true}));1");
  await sleep(500);
  await p.shot('test/_smoke489-storm-run.png');
  await p.eval("window.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyD',key:'d',bubbles:true}));1");

  // ---------- ③ 俯衝 ----------
  const j = await p.eval(SETUP + '(true)');
  await sleep(120);
  const jumped = await p.eval('(function(){ const pl=__BH.Game.players[0]; pl.fireCd=0; const r=__BH.mountJump(pl); return r+" air="+pl.air.toFixed(2)+" cd="+pl.fireCd; })()');
  console.log('jump', jumped, 'state', await p.eval('__BH.Game.state'));
  await sleep(140);
  const dv = await p.eval('(function(){ const pl=__BH.Game.players[0]; return __BH.ostrichDive(pl) ? "ok" : ("no air="+pl.air); })()');
  console.log('dive', dv);
  await p.eval('(function(){ const G=__BH.Game; (G.rings||[]).forEach(function(r){ r.dur*=6; }); return 1; })()');
  await p.shot('test/_smoke489-dive.png');

  b.close();
  console.log('done');
})().catch(e => { console.error(e); process.exit(1); });
