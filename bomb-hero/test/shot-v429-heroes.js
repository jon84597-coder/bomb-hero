// v4.29：確認新主角群真的接進遊戲 —— 部件載入、自然狀態沒有頭頂圖示、面向、表情特效、尺寸
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const OUT = path.join(__dirname, '_v429');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

(async () => {
  const b = await launch({ port: 9479, w: 1000, h: 700 });
  try {
    const p = await b.newPage();
    await p.send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 700, deviceScaleFactor: 1, mobile: false });
    await p.goto(URL, 2600);
    for (let i = 0; i < 60; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game)')) break; await sleep(300); }

    // 部件是否真的載入（Parts.has 檢查 head+torso）
    const st = await p.eval(`(function(){
      var BH=window.__BH, out={};
      ['rabbit','bear','dog','cat','pig','panda','frog','chick'].forEach(function(k){
        out[k] = BH.Parts && BH.Parts.has ? BH.Parts.has(k) : null;
      });
      return JSON.stringify({ has: out, ready: BH.Parts.readyCount(), ver: BH.VERSION,
        asp: Object.keys(BH.IMG_PARTS).reduce(function(o,k){ o[k]=BH.IMG_PARTS[k].asp; return o; }, {}) });
    })()`);
    console.log('PARTS', st);

    await p.eval('window.__BH.startSolo(1)');
    await sleep(600);
    await p.eval("(function(){ var ov=document.getElementById('ovBox'); var b2=ov&&ov.querySelector('button'); if(b2) b2.click(); })()");
    await sleep(400);
    await p.eval("(function(){ var ok=document.getElementById('rhOk'); if(ok) ok.click(); })()");
    for (let i = 0; i < 40; i++) { if (await p.eval("window.__BH.Game.state==='play'")) break; await sleep(250); }
    await sleep(900);

    // 量角色的實際繪製尺寸＋包圍盒（與 R 的關係）
    const size = await p.eval(`(function(){
      var BH=window.__BH, p=BH.Game.players[0];
      var T=BH.Game.T||40, R=T*.40, H=R*3.75;
      var M=BH.IMG_PARTS[p.ch.animal];
      return JSON.stringify({ animal:p.ch.animal, T:T, R:R, H:H, asp:M.asp, dir:M.dir,
        drawW:H*M.asp, footY:p.y+R*.82 });
    })()`);
    console.log('SIZE', size);

    // 1) 自然狀態（idle）—— 頭上不該有表情圖示
    await p.eval("(function(){var p=window.__BH.Game.players[0]; p.cry=0; p.gloat=0; p.cheerT=0; p.invuln=0;})()");
    await sleep(500);
    await p.shot(path.join(OUT, 'a-idle.png'));

    // 2) 往左走 3) 往右走 —— 驗面向
    await p.eval("(function(){var G=window.__BH.Game,p=G.players[0]; p.facing='left'; p.moving=true; p.walkT=.42;})()");
    await sleep(400);
    await p.shot(path.join(OUT, 'b-left.png'));
    await p.eval("(function(){var G=window.__BH.Game,p=G.players[0]; p.facing='right'; p.moving=true; p.walkT=.42;})()");
    await sleep(400);
    await p.shot(path.join(OUT, 'c-right.png'));

    // 4) 大哭 5) 大笑
    await p.eval("(function(){var p=window.__BH.Game.players[0]; p.moving=false; p.cry=3; p.gloat=0;})()");
    await sleep(600);
    await p.shot(path.join(OUT, 'd-cry.png'));
    await p.eval("(function(){var p=window.__BH.Game.players[0]; p.cry=0; p.gloat=3;})()");
    await sleep(600);
    await p.shot(path.join(OUT, 'e-laugh.png'));

    console.log('DONE');
  } finally {
    await b.close();
  }
})().catch(e => { console.error('ERR', e && e.message); process.exit(1); });
