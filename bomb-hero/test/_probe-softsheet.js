// 把八個主題的「軟磚 + 硬牆 + 地板」拼成 3×3 小片，直接看軟磚跟地板／硬牆的接法
// 用法：node test/_probe-softsheet.js [輸出檔名]
const { launch, sleep } = require('./cdp');
const path = require('path');

const THEMES = ['forest', 'sand', 'ice', 'lava', 'neon', 'sea', 'sky', 'dark'];
// 3×3：H=硬牆  F=地板  S=軟磚（左下角放一組兩塊相鄰的軟磚，看接縫）
const LAYOUT = [
  ['H', 'F', 'S'],
  ['F', 'S', 'S'],
  ['S', 'S', 'F']
];

(async () => {
  const out = path.resolve(__dirname, process.argv[2] || '_softsheet.png');
  const b = await launch({ port: 9841, w: 1600, h: 900 });
  const p = await b.newPage();
  await p.goto('file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/'), 6000);
  for (let i = 0; i < 80; i++) { if (await p.eval('!!(window.__BH && window.__BH.Game)')) break; await sleep(250); }
  await sleep(500);

  const r = await p.eval(`(function(){
    var BH = window.__BH, T = 128, GAP = 14, LBL = 20;
    var themes = ${JSON.stringify(THEMES)}, lay = ${JSON.stringify(LAYOUT)};
    var cols = 4, rows = 2;
    var pw = T*3, ph = T*3;
    var W = cols*pw + (cols+1)*GAP, H = rows*(ph+LBL) + (rows+1)*GAP;
    document.body.innerHTML = '';
    document.body.style.cssText = 'margin:0;background:#101018';
    var cv = document.createElement('canvas'); cv.width=W; cv.height=H;
    cv.style.cssText = 'display:block';
    document.body.appendChild(cv);
    var g = cv.getContext('2d');
    g.fillStyle = '#101018'; g.fillRect(0,0,W,H);

    function bake(kind, st, vi) {
      var c2 = document.createElement('canvas'); c2.width = c2.height = T;
      var gg = c2.getContext('2d');
      if (kind === 'F') BH.paintFloorTile(gg, st, T, 101 + vi*977 + 13, vi);
      else if (kind === 'S') BH.paintSoftTile(gg, st, T, 101 + vi*977 + 71, false, vi);
      else BH.paintHardTile(gg, st, T, 101 + vi*977 + 7, vi);
      return c2;
    }
    var cover = {};
    themes.forEach(function(st, ti){
      var ox = GAP + (ti % cols) * (pw + GAP);
      var oy = GAP + Math.floor(ti / cols) * (ph + LBL + GAP);
      // 底：整片先鋪地板 → 再貼拼片（跟實際烘焙順序一致：地板在牆之前）
      for (var yy=0; yy<3; yy++) for (var xx=0; xx<3; xx++)
        g.drawImage(bake('F', st, (xx*3+yy*7)%4), ox+xx*T, oy+yy*T);
      for (var yy2=0; yy2<3; yy2++) for (var xx2=0; xx2<3; xx2++) {
        var k = lay[yy2][xx2];
        if (k === 'F') continue;
        g.drawImage(bake(k, st, (xx2*5+yy2*11)%4), ox+xx2*T, oy+yy2*T);
      }
      g.fillStyle = '#cfd6e6';
      g.font = 'bold 15px Arial';
      g.fillText(st, ox + 2, oy + ph + 15);
      // 量軟磚貼圖的滿版程度（單張貼圖自己的 alpha 邊界）
      var sc = bake('S', st, 0), sd = sc.getContext('2d').getImageData(0,0,T,T).data;
      var minx=T, maxx=0, miny=T, maxy=0, op=0;
      for (var y3=0; y3<T; y3++) for (var x3=0; x3<T; x3++) {
        var a = sd[(y3*T+x3)*4+3];
        if (a > 16) { op++; if (x3<minx) minx=x3; if (x3>maxx) maxx=x3; if (y3<miny) miny=y3; if (y3>maxy) maxy=y3; }
      }
      cover[st] = { cover: +(op/(T*T)*100).toFixed(1),
        L:+(minx/T*100).toFixed(1), R:+((T-1-maxx)/T*100).toFixed(1),
        T:+(miny/T*100).toFixed(1), B:+((T-1-maxy)/T*100).toFixed(1) };
    });
    window.__COVER = cover;
    return { w: W, h: H };
  })()`);
  console.log('sheet ' + r.w + 'x' + r.h);
  const cov = await p.eval('window.__COVER');
  for (const k in cov) {
    const o = cov[k];
    console.log(k.padEnd(7) + ' 覆蓋 ' + String(o.cover).padStart(5) + '%  邊距 L' + o.L + ' R' + o.R + ' T' + o.T + ' B' + o.B);
  }
  await p.resize(r.w, r.h);
  await sleep(300);
  await p.shot(out);
  console.log('-> ' + out);
  b.close();
})();
