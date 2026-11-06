// 軟牆腳下陰影：把八個主題的「軟牆格」與「旁邊空地」的烘焙畫布取出來，量像素剖面
//   node test/_probe-softao.js [shot|prof]
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, '_softao');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}

const TAG = process.argv[2] || 'before';

(async () => {
  const b = await launch({ port: 9831, w: 430, h: 932 });
  const p = await b.newPage();
  await p.resize(430, 932, true);
  await p.goto('file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/'), 5000);
  for (let i = 0; i < 60; i++) { if (await p.eval('!!(window.__BH && window.__BH.Game)')) break; await sleep(250); }
  await sleep(800);

  // 找出每個主題的代表關卡
  const lv = await p.eval(`(function(){
    var BH=window.__BH, out={}, G=BH.Game;
    for (var s=1; s<=32; s++) {
      try { BH.startSolo(s, false); } catch(e) { continue; }
      var st = (G.theme && G.theme.style) || '?';
      if (!out[st]) out[st] = s;
    }
    return out;
  })()`);
  console.log('主題→關卡 ' + JSON.stringify(lv));

  for (const st of Object.keys(lv)) {
    const stage = lv[st];
    const r = await p.eval(`(function(){
      var BH=window.__BH, G=BH.Game, P=BH;
      BH.startSolo(${stage}, false);
      G.state='play'; G.countdown=0;
      var ov=document.getElementById('ovIn'); if(ov) ov.style.setProperty('display','none','important');
      var o2=document.getElementById('ov'); if(o2) o2.style.setProperty('display','none','important');
      // 找一個軟磚：左右或上下有空地，方便比較「軟磚格內側」與「隔壁空地」
      var best=null;
      for (var y=1;y<G.rows-1;y++) for (var x=1;x<G.cols-1;x++) {
        if (G.grid[y][x]!==2) continue;
        if (G.grid[y+1][x]===0 && G.grid[y][x+1]===0) { best={x:x,y:y}; }
      }
      if (!best) return {err:'no soft'};
      // 相機對準那格
      var T=G.T;
      var wx=(best.x+1)*T, wy=(best.y+1)*T;
      G.camX=(BH.VIEW_W||720)/2-wx; G.camY=(BH.VIEW_H||540)/2-wy;
      if (BH.updateCamera) BH.updateCamera();
      G.zoom=2.2;
      BH.render();
      return {x:best.x,y:best.y,T:T,zoom:G.zoom,theme:(G.theme&&G.theme.style),cols:G.cols,rows:G.rows};
    })()`);
    if (r.err) { console.log(st + ' ' + r.err); continue; }
    console.log(st + '  關卡 ' + stage + '  軟磚 (' + r.x + ',' + r.y + ')  T=' + r.T + '  zoom=' + r.zoom);
    await sleep(300);
    await p.shot(path.join(OUT, 'soft-' + TAG + '-' + st + '.png'));
  }
  b.close();
})();
