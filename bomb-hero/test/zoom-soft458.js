// v4.58 目檢：沙／天空／水的軟牆是否滿版一格（相機對準一片軟牆，放大 SC 倍）
// 用法：node zoom-soft458.js [stage] [scale]
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const URL = process.env.BH_URL || ('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
const OUT = path.join(__dirname, '_v458');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) { }
const ST = Number(process.argv[2] || 5);
const SC = Number(process.argv[3] || 3);

(async () => {
  const b = await launch({ port: 9711, w: 1280, h: 900 });
  try {
    const p = await b.newPage();
    await p.goto(URL, 3200);
    for (let i = 0; i < 60; i++) {
      if (await p.eval('!!(window.__BH && window.__BH.Game)')) break;
      await sleep(250);
    }
    const info = await p.eval(`(function(){
      var BH = window.__BH;
      try{ localStorage.setItem('bombhero-tut2','999'); }catch(e){}
      document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('on'); });
      BH.startSolo(${ST}, true); BH.Game.state='play';
      try{ BH.beginCountdown('battle'); }catch(e){}
      for(var i=0;i<60;i++){ try{ BH.updateWorld(1/60); }catch(e){} }
      var T = BH.Game.T, g = BH.Game.grid, R = BH.Game.rows, C = BH.Game.cols;
      var bx = -1, by = -1, best = -1;
      for (var y = 1; y < R-1; y++) for (var x = 1; x < C-1; x++) {
        if (g[y][x] !== 2) continue;
        var n = 0;
        for (var dy=-2; dy<=2; dy++) for (var dx=-2; dx<=2; dx++) {
          var yy=y+dy, xx=x+dx;
          if (yy>=0&&yy<R&&xx>=0&&xx<C&&g[yy][xx]===2) n++;
        }
        if (n > best) { best = n; bx = x; by = y; }
      }
      var cv0 = document.getElementById('cv');
      var W = cv0.width, H = cv0.height;
      BH.Game.zoom = 1;
      BH.Game.camX = bx*T + T/2 - W/2;
      BH.Game.camY = by*T + T/2 - H/2;
      try{ BH.render(); }catch(e){}
      return { x: bx, y: by, T: T, ox: BH.Game.ox, oy: BH.Game.oy, cw: W, chh: H };
    })()`);
    await sleep(400);
    const rect = await p.eval(`(function(){
      var cv=document.getElementById('cv'), r=cv.getBoundingClientRect();
      return {l:r.left,t:r.top,w:r.width,h:r.height};
    })()`);
    // 精準裁切：邊界就是格線（2×2 格），一眼看得出有沒有滿版
    const T = info.T * (rect.w / info.cw), cw = T * 2, ch = T * 2;
    const sc = rect.w / info.cw;                 // canvas 內部像素 → CSS 像素
    const ox0 = rect.l + (info.x * T + info.ox) * sc;
    const oy0 = rect.t + (info.y * T + info.oy) * sc;
    const r2 = await p.send('Page.captureScreenshot', {
      format: 'png',
      clip: { x: ox0, y: oy0, width: cw, height: ch, scale: SC },
      captureBeyondViewport: false
    });
    const f = path.join(OUT, 'soft-s' + ST + '-x' + SC + '.png');
    fs.writeFileSync(f, Buffer.from(r2.data, 'base64'));
    console.log(JSON.stringify(info), f);
  } finally { try { await b.close(); } catch (e) { } }
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
