// v4.27/4.28 線上活體驗證：48 隻小怪 / 投擲落點（推車用，角色本身沒有）/ 縮放（鍵盤＋雙指）
const path = require('path');
const { launch, sleep } = require('./cdp');
const URL = process.env.BH_LIVE_URL || 'https://bomb-hero-game.onrender.com/';

let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ FAIL: ' + m); } }

(async () => {
  const b = await launch({ port: 9462, w: 1000, h: 760 });
  try {
    const p = await b.newPage();
    await p.send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 760, deviceScaleFactor: 1, mobile: false });
    await p.goto(URL, 3500);
    let ready = false;
    for (let i = 0; i < 80; i++) {
      if (await p.eval('!!(window.__BH&&window.__BH.Game&&window.__BH.VERSION)')) { ready = true; break; }
      await sleep(400);
    }
    ok(ready, '線上頁面載入（__BH 就緒）');
    if (!ready) { console.log('結果：' + pass + ' 通過 / ' + (fail + 1) + ' 失敗'); await b.close(); return; }

    const ver = await p.eval('window.__BH.VERSION');
    // v4.30：改成跟本機 index.html 的 VERSION 比對（不再寫死版號）
    const localVer = (require('fs').readFileSync(require('path').join(__dirname, '../index.html'), 'utf8')
      .match(/const VERSION = '([0-9.]+)'/) || [])[1];
    ok(ver === localVer, '線上版本與本機相同（線上 ' + ver + ' / 本機 ' + localVer + '）');
    const n = await p.eval('window.__BH.ENEMY_SPECIES.length');
    ok(n === 48, '線上小怪 48 隻（實際 ' + n + '）');
    const blocks = await p.eval('window.__BH.STAGE_ROSTER.length');
    ok(blocks === 8, '八個大關卡生態表都在（' + blocks + '）');
    const t8 = await p.eval("window.__BH.stageTypes(32).join(',')");
    ok(/royalguard|deathknight/.test(t8), '第 8 大關出魔王近衛軍／死亡騎士（' + t8 + '）');
    const t1 = await p.eval("window.__BH.stageTypes(1).join(',')");
    ok(!/ghost|bat|eye|jelly/.test(t1), '第 1 大關沒有穿牆怪（' + t1 + '）');

    // 進第 1 關
    await p.eval('window.__BH.startSolo(1)');
    await sleep(500);
    await p.eval("(function(){var b=document.querySelector('#ovBox button'); if(b)b.click();})()");
    for (let i = 0; i < 60; i++) { if (await p.eval("window.__BH.Game.state==='play'")) break; await sleep(250); }
    ok(await p.eval("window.__BH.Game.state==='play'"), '倒數結束、進入遊戲');

    // 角色【不該】有投擲能力（v4.27 誤加、v4.28 撤除；投擲是場外復仇推車的專利）
    const noThrow = await p.eval("JSON.stringify({fn:typeof window.__BH.throwBomb, btn:!!document.querySelector('#touchUI .tthrow'), cd:('throwCd' in window.__BH.Game.players[0]), sch:!!(window.__BH.Game.players[0].scheme&&window.__BH.Game.players[0].scheme.throwBomb)})");
    const nt = JSON.parse(noThrow);
    ok(nt.fn === 'undefined' && !nt.btn && !nt.cd && !nt.sch,
      '角色沒有投擲能力（無函式／無按鈕／無冷卻／無輸入綁定）');

    // 落點演算法（保留給場外推車）：找一段「前方連續 4 格空地」
    const setup = await p.eval(`(function(){
      var P=window.__BH,G=P.Game,pl=G.players[0];
      for (var y=1;y<G.rows-1;y++){
        for (var x=1;x<G.cols-5;x++){
          var okk=true;
          for (var k=1;k<=4;k++) if (P.cellAt(x+k,y)!==0) okk=false;
          if (!okk) continue;
          pl.invuln=0;
          G.bombs.length=0; G.enemies.length=0;
          return JSON.stringify({cx:x,cy:y});
        }
      }
      return 'none';
    })()`);
    ok(setup !== 'none', '場上找得到「前方 4 格空地」（' + setup + '）');
    const from = JSON.parse(setup);
    const land1 = await p.eval(`(function(){
      var P=window.__BH,G=P.Game;
      var l=P.findThrowLanding(${from.cx},${from.cy},1,0,16);
      return l? l.x : -1;
    })()`);
    ok(land1 === from.cx + 1, '前方是空地 → 就落在第 1 格（實際 ' + land1 + '）');

    // 越牆：正前方塞兩顆硬牆，落點要往後跳
    const jump = await p.eval(`(function(){
      var P=window.__BH,G=P.Game;
      var cx=${from.cx}, cy=${from.cy};
      G.bombs.length=0; G.enemies.length=0;
      G.grid[cy][cx+1]=1; G.grid[cy][cx+2]=1;
      var land=P.findThrowLanding(cx,cy,1,0,16);
      var r = land? land.x : -1;
      G.grid[cy][cx+1]=0; G.grid[cy][cx+2]=0;
      return r;
    })()`);
    ok(jump === from.cx + 3, '前方兩格是牆 → 彈跳過去落在第 3 格（實際 ' + jump + '）');

    // 縮放：鍵盤 1 / 2 / 0
    const z0 = await p.eval('window.__BH.Game.zoomTarget');
    await p.eval('window.__BH.Zoom.by(0.14)');
    const z1 = await p.eval('window.__BH.Game.zoomTarget');
    await p.eval('window.__BH.Zoom.by(-0.28)');
    const z2 = await p.eval('window.__BH.Game.zoomTarget');
    await p.eval('window.__BH.Zoom.reset()');
    const z3 = await p.eval('window.__BH.Game.zoomTarget');
    ok(z0 === 1 && z1 === 1.14 && Math.abs(z2 - 0.86) < .001 && z3 === 1, '縮放鍵：1=放大、2=縮小、0=還原（' + [z0, z1, z2, z3].join(' → ') + '）');
    // 縮放後相機沒跑掉
    const cam = await p.eval(`(function(){
      var P=window.__BH,G=P.Game;
      P.Zoom.set(P.Zoom.max);
      for(var i=0;i<240;i++) P.Zoom.tick(1/60);
      G.camSnap=true; P.updateCamera(0.016);
      var vw=P.viewInfo().w, c=vw/2, z=G.zoom, W=G.cols*G.T;
      var L=(0+G.camX-c)*z+c, R=(W+G.camX-c)*z+c;
      P.Zoom.reset(); for(var j=0;j<240;j++) P.Zoom.tick(1/60);
      return JSON.stringify({z:z,L:Math.round(L),R:Math.round(R),vw:vw});
    })()`);
    const c2 = JSON.parse(cam);
    ok(c2.L <= 1 && c2.R >= c2.vw - 1, '放到最大時畫面仍被地圖填滿（L=' + c2.L + ' R=' + c2.R + ' vw=' + c2.vw + '）');
  } finally {
    await b.close();
  }
  console.log('----------------------------------------');
  console.log('線上 v4.28：' + pass + ' 通過 / ' + fail + ' 失敗');
  process.exit(fail ? 1 : 0);
})();
