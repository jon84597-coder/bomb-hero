// v4.34 線上確認：48 隻小怪全部載入、朝向全部 dir=+1、貼圖不透明、第 5~8 大關可玩、撿彈不搶放彈
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const OUT = path.join(__dirname, '_v434live');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const URL = process.argv[2] || 'https://bomb-hero-game.onrender.com/';
let bad = 0;
function ck(name, ok, extra) {
  if (!ok) bad++;
  console.log((ok ? '  ok ' : '  FAIL ') + name + (extra === undefined ? '' : '  ' + extra));
}

(async () => {
  const b = await launch({ port: 9571, w: 1000, h: 700 });
  try {
    const p = await b.newPage();
    await p.send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 700, deviceScaleFactor: 1, mobile: false });
    await p.goto(URL, 4500);
    for (let i = 0; i < 90; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game&&window.__BH.FoeArt&&window.__BH.MountArt)')) break; await sleep(400); }

    const boot = await p.eval(`JSON.stringify({
      ver: window.__BH.VERSION,
      logVer: (window.__BH.VERSION_LOG && window.__BH.VERSION_LOG[0] || {}).v,
      verTxt: (document.getElementById('verTxt')||{}).textContent,
      sw: (window.__BH.SW_VER || null),
      ready: window.__BH.FoeArt.readyCount(),
      total: Object.keys(window.__BH.FOE_ART).length,
      mount: window.__BH.MountArt.readyCount(),
      errs: (window.__BHB && window.__BHB.errs || []).length
    })`);
    console.log('LIVE BOOT', boot);
    const B = JSON.parse(boot);
    ck('VERSION 與 VERSION_LOG[0] 一致', B.ver === B.logVer, B.ver + ' / ' + B.logVer);
    ck('verTxt 與 VERSION 一致', String(B.verTxt || '') === B.ver, B.verTxt);
    ck('FoeArt 48 隻全載入', B.ready === 48, B.ready);
    ck('FOE_ART 表 48 筆', B.total === 48, B.total);
    ck('坐騎載入', B.mount >= 2, B.mount);
    ck('開機無錯', B.errs === 0, B.errs);

    // 朝向：全部 dir=+1
    const dirs = await p.eval(`JSON.stringify((function(){
      var out={plus:0,minus:0,other:0,z:0,bad:[]};
      Object.keys(window.__BH.FOE_ART).forEach(function(k){
        var d = window.__BH.FOE_ART[k].dir;
        if (d === 1) out.plus++; else if (d === -1) out.minus++;
        else if (d === 0 || d === undefined) out.z++; else out.other++;
        if (d !== 1) out.bad.push(k+':'+d);
      });
      return out; })())`);
    console.log('LIVE DIRS', dirs);
    const D = JSON.parse(dirs);
    ck('全部 dir=+1（面朝右）', D.plus === 48 && D.minus === 0, JSON.stringify(D.bad));

    // 第 5~8 大關各截一張
    const stages = [17, 21, 25, 29];
    for (const st of stages) {
      await p.eval('window.__BH.startSolo(' + st + ')');
      await sleep(900);
      await p.eval("(function(){ var ov=document.getElementById('ovBox'); var b2=ov&&ov.querySelector('button'); if(b2) b2.click(); })()");
      await sleep(600);
      await p.eval("(function(){ var ok=document.getElementById('rhOk'); if(ok) ok.click(); })()");
      for (let i = 0; i < 40; i++) { if (await p.eval("window.__BH.Game.state==='play'")) break; await sleep(300); }
      await sleep(1000);
      const info = await p.eval(`JSON.stringify((function(){
        var G=window.__BH.Game, p=G.players[0], T=G.T, i=0;
        G.enemies.forEach(function(e){ e.x=p.x+((i%3)-1)*T*1.5; e.y=p.y-T*(1.3+Math.floor(i/3)*1.4);
          e.dirName=(i%2)?'left':'right'; e.dirT=99; e.aggro=false; i++; });
        G.zoom=1.9; G.zoomTarget=1.9; G.camSnap=true;
        var types={}; G.enemies.forEach(function(e){ types[e.type]=(types[e.type]||0)+1; });
        return { stage:G.stage, n:G.enemies.length, types:Object.keys(types).sort() };
      })())`);
      console.log('LIVE STAGE ' + st, info);
      await sleep(800);
      await p.shot(path.join(OUT, 'live-s' + st + '.png'));
      const I = JSON.parse(info);
      ck('第 ' + st + ' 關有怪物 ' + I.n + ' 隻', I.n > 0);
      ck('第 ' + st + ' 關用的都是 5~8 關新怪',
        I.types.every(function (t) { return ['wisp', 'scavenger', 'robot', 'pulser', 'laserbee', 'neonbot',
          'octopus', 'angler', 'ghost', 'hermit', 'jelly', 'urchin',
          'hornet', 'airship', 'sapper', 'thunder', 'windwisp', 'galehawk',
          'skull', 'imp', 'darkbat', 'wizard', 'royalguard', 'deathknight'].indexOf(t) >= 0; }),
        I.types.join(','));
    }

    // 撿彈：站在自己剛放的炸彈上不該撿起來
    const pick = await p.eval(`JSON.stringify((function(){
      var G=window.__BH.Game, T=G.T, p=G.players[0];
      G.enemies.forEach(function(e){ e.dead=true; });
      var cx=Math.floor(p.x/T), cy=Math.floor(p.y/T);
      p.alive=true; p.invuln=999; p.facing='right'; p.carry=null; p.glove=false;
      var r={ placed:[], picked:0 };
      for (var k=0;k<4;k++){
        window.__BH.placeBomb(p);
        r.placed.push(G.bombs.filter(function(b){ return b.owner===p; }).length);
        if (window.__BH.tryGlovePickup(p)) r.picked++;
      }
      r.carry = !!p.carry; r.bombs = G.bombs.length;
      return r; })())`);
    console.log('LIVE PICKUP', pick);
    const K = JSON.parse(pick);
    ck('站在自己炸彈上連按不撿', K.picked === 0, K.picked);
    ck('連按仍能放置', K.bombs >= 1, K.bombs);

    console.log(bad === 0 ? 'LIVE-OK' : 'LIVE-FAIL ' + bad);
  } finally { await b.close(); }
})().catch(e => { console.error('ERR', e && e.message); process.exit(1); });
