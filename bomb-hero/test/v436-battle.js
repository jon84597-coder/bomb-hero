// test/v436-battle.js — v4.36 對戰驗證（真瀏覽器）：龍吐火燒得死、AI 走路會轉向
const path = require('path');
const { launch, sleep } = require('./cdp');
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

(async () => {
  const b = await launch({ port: 9587, w: 900, h: 640 });
  let pass = 0, fail = 0;
  const ok = (c, n, x) => { if (c) { pass++; console.log('  ✓ ' + n + (x === undefined ? '' : '（' + x + '）')); } else { fail++; console.log('  ✗ FAIL: ' + n + (x === undefined ? '' : '（' + x + '）')); } };
  try {
    const p = await b.newPage();
    await p.send('Emulation.setDeviceMetricsOverride', { width: 900, height: 640, deviceScaleFactor: 1, mobile: false });
    await p.goto(URL, 3000);
    for (let i = 0; i < 70; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game)')) break; await sleep(250); }
    await p.eval(`(function(){
      var P=window.__BH;
      P.settings.size='M'; P.settings.count=2; P.settings.ctrl='kb'; P.settings.hazards='off';
      P.settings.sd='off'; P.settings.revenge='off'; P.settings.time=120;
      P.Battle.resetSlots(); P.startBattle();
    })()`);
    await sleep(500);
    await p.eval("(function(){var ov=document.getElementById('ovBox');var b2=ov&&ov.querySelector('button');if(b2)b2.click();})()");
    for (let i = 0; i < 50; i++) { if (await p.eval("window.__BH.Game.state==='play'")) break; await sleep(200); }

    // ---------- 1. 龍吐火燒死對手 ----------
    const r1 = await p.eval(`(function(){
      var P=window.__BH, G=P.Game, T=G.T;
      var p0=G.players[0], p1=G.players[1];
      p1.ai=false;
      var found=null;
      for(var y=2;y<G.rows-2&&!found;y++)for(var x=2;x<G.cols-4;x++){
        if(G.grid[y][x]===0&&G.grid[y][x+1]===0&&G.grid[y][x+2]===0){found=[x,y];break;}
      }
      var cx=found[0], cy=found[1];
      p0.x=cx*T+T/2; p0.y=cy*T+T/2; p0.alive=true; p0.invuln=0; p0.carry=null;
      p1.x=(cx+1)*T+T/2; p1.y=cy*T+T/2; p1.alive=true; p1.invuln=0; p1.carry=null; p1.dino=false;
      G.bombs.length=0; G.flames.length=0;
      p0.dino=true; p0.redDragon=false; p0.fireCd=0; p0.facing='right';
      var fired=P.fireBreath(p0);
      return JSON.stringify({fired:fired, flames:G.flames.length});
    })()`);
    await sleep(500);
    const r2 = await p.eval(`(function(){var G=window.__BH.Game,p1=G.players[1];
      return JSON.stringify({alive:p1.alive,dead:p1.dead,cart:p1.cart,wins:G.players.map(function(p){return p.wins;})});})()`);
    console.log('dino', r1, r2);
    ok(JSON.parse(r1).flames >= 5, '吐火燒出扇形火焰', JSON.parse(r1).flames);
    ok(JSON.parse(r2).alive === false, '對手被吐火燒死（不再是無傷）');

    // ---------- 2. AI 走路會轉向 ----------
    const r3 = await p.eval(`(function(){
      var P=window.__BH, G=P.Game, T=G.T;
      // 重新開一局，觀察 AI 的 facing
      P.startBattle();
      return 'ok';
    })()`);
    await sleep(600);
    await p.eval("(function(){var ov=document.getElementById('ovBox');var b2=ov&&ov.querySelector('button');if(b2)b2.click();})()");
    for (let i = 0; i < 50; i++) { if (await p.eval("window.__BH.Game.state==='play'")) break; await sleep(200); }
    await p.eval(`(function(){
      var G=window.__BH.Game;
      G.players.forEach(function(q){ q.invuln=9999; });
      window.__seen = {};
      window.__tick = setInterval(function(){
        G.players.forEach(function(q,i){ if(i>0) window.__seen[q.facing]=1; });
      }, 60);
    })()`);
    await sleep(4000);
    const seen = await p.eval(`(function(){ clearInterval(window.__tick); return JSON.stringify(Object.keys(window.__seen)); })()`);
    console.log('AI facing', seen);
    ok(JSON.parse(seen).length >= 2, 'AI 的面向有變化（不再固定同一邊）', seen);

    // ---------- 3. 截一張對戰圖 ----------
    await p.shot(path.join(__dirname, '_v436battle', 'battle.png'));
  } finally { await b.close(); }
  console.log('\n' + (fail === 0 ? '✅' : '❌') + ' v4.36 對戰：' + pass + ' 通過 / ' + fail + ' 失敗');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e && e.message); process.exit(1); });
