// 把八個主題的軟牆貼圖／硬牆貼圖直接倒出來看（含透明資訊）
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, '_softao');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}

(async () => {
  const b = await launch({ port: 9833, w: 900, h: 640 });
  const p = await b.newPage();
  await p.goto('file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/'), 5000);
  for (let i = 0; i < 60; i++) { if (await p.eval('!!(window.__BH && window.__BH.Game)')) break; await sleep(250); }
  await sleep(600);
  const data = await p.eval(`(function(){
    var BH=window.__BH, out={}, S0=128;
    ['forest','sand','ice','lava','neon','sea','sky','dark'].forEach(function(st){
      var cv=document.createElement('canvas'); cv.width=S0; cv.height=S0;
      var g=cv.getContext('2d');
      BH.paintSoftTile(g, st, S0, 101+71, false, 0);
      out[st]=cv.toDataURL('image/png');
    });
    return out;
  })()`);
  const html = ['<html><body style="margin:0;background:#2a2f3a;display:flex;flex-wrap:wrap;gap:6px;padding:8px;font:11px sans-serif;color:#cfd8e6">'];
  for (const k in data) {
    html.push('<div style="text-align:center">' +
      '<div style="width:190px;height:190px;background-image:linear-gradient(45deg,#556 25%,transparent 25%,transparent 75%,#556 75%),linear-gradient(45deg,#556 25%,#7a8 25%,#7a8 75%,#556 75%);background-size:16px 16px;background-position:0 0,8px 8px">' +
      '<img src="' + data[k] + '" style="width:190px;height:190px;image-rendering:pixelated"></div>' + k + '</div>');
  }
  html.push('</body></html>');
  fs.writeFileSync(path.join(OUT, 'softballs.html'), html.join(''));
  const p2 = await b.newPage();
  await p2.resize(820, 460, false);
  await p2.goto('file:///' + path.join(OUT, 'softballs.html').replace(/\\/g, '/'), 1200);
  await sleep(400);
  await p2.shot(path.join(OUT, 'softballs.png'));
  console.log('ok');
  b.close();
})();
