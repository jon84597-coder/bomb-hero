// 進遊戲把小怪拍近照（可指定 html 檔，用來新舊比對）
// 用法：node test/shot-foe-live.js <html> <輸出名前綴> [stage]
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const OUT = path.join(__dirname, '_v430');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}

const FILE = process.argv[2] || path.resolve(__dirname, '../index.html');
const TAG = process.argv[3] || 'new';
const STAGE = parseInt(process.argv[4] || '4', 10);
const URL = 'file:///' + path.resolve(FILE).replace(/\\/g, '/');

(async () => {
  const b = await launch({ port: 9486, w: 1000, h: 700 });
  try {
    const p = await b.newPage();
    await p.send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 700, deviceScaleFactor: 1, mobile: false });
    await p.goto(URL, 2600);
    for (let i = 0; i < 60; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game)')) break; await sleep(300); }
    await p.eval('window.__BH.startSolo(' + STAGE + ')');
    await sleep(600);
    await p.eval("(function(){ var ov=document.getElementById('ovBox'); var b2=ov&&ov.querySelector('button'); if(b2) b2.click(); })()");
    await sleep(350);
    await p.eval("(function(){ var ok=document.getElementById('rhOk'); if(ok) ok.click(); })()");
    for (let i = 0; i < 40; i++) { if (await p.eval("window.__BH.Game.state==='play'")) break; await sleep(250); }
    await sleep(900);

    // 逐隻小怪：把玩家移到牠旁邊 2 格 → 相機跟著玩家過去 → 拍近照
    const n = await p.eval("window.__BH.Game.enemies.length") || 0;
    const picks = [];
    for (let i = 0; i < Math.min(n, 6); i++) picks.push(i);
    let k = 0;
    for (const i of picks) {
      const ok = await p.eval(`(function(){
        var G=window.__BH.Game, e=G.enemies[${i}], p=G.players[0];
        if(!e) return false;
        var T=G.T;
        p.x = e.x; p.y = e.y + T*1.6; p.invuln = 999;
        e.dirName = ${i % 2 ? "'left'" : "'right'"}; e.dirT = 99; e.aggro = false;
        G.zoom = 2.6; G.zoomTarget = 2.6; G.camSnap = true;
        return e.type;
      })()`);
      if (!ok) continue;
      await sleep(420);
      const f = 'e' + (k++) + '-' + ok + '.png';
      await p.shot(path.join(OUT, TAG + '-' + f));
      console.log('shot', f);
    }
    console.log('DONE', TAG);
  } finally {
    await b.close();
  }
})().catch(e => { console.error('ERR', e && e.message); process.exit(1); });
