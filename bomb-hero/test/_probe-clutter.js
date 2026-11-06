// 把烘好的地板分塊倒出來（沒有角色／HUD 干擾），專看地板雜物
//   node test/_probe-clutter.js
//   輸出 test/_clutter/<style>.png（3 倍放大）＋ sheet.png（4×2 對照表）
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');
const http = require('http');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json', '.jpg': 'image/jpeg' };
const srv = http.createServer(function (req, res) {
  let f = decodeURIComponent(req.url.split('?')[0]);
  if (f === '/') f = '/index.html';
  const fp = path.join(ROOT, f);
  fs.readFile(fp, function (e, buf) {
    if (e) { res.writeHead(404); res.end('nope'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
    res.end(buf);
  });
});
const OUT = path.join(__dirname, '_clutter');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}

(async () => {
  await new Promise(function (r) { srv.listen(8127, '127.0.0.1', r); });
  const b = await launch({ port: 9851, w: 900, h: 900 });
  const p = await b.newPage();
  await p.goto('http://127.0.0.1:8127/index.html', 8000);
  for (let i = 0; i < 60; i++) { if (await p.eval('!!(window.__BH && window.__BH.Game)')) break; await sleep(250); }
  await sleep(700);

  const list = [[1, 'forest'], [5, 'sand'], [9, 'ice'], [13, 'lava'], [17, 'neon'], [21, 'sea'], [25, 'sky'], [29, 'dark']];
  for (const [stage, name] of list) {
    const data = await p.eval(`(function(){
      var BH=window.__BH, G=BH.Game;
      BH.startSolo(${stage}, false); G.state='play';
      // 找一個「空地最多」的 8×8 分塊
      var best=null, bestN=-1, N=BH.FLR_N || 8;
      for (var cy=0; cy*N < G.rows; cy++) for (var cx=0; cx*N < G.cols; cx++) {
        var n=0;
        for (var y=cy*N; y<Math.min(G.rows,(cy+1)*N); y++)
          for (var x=cx*N; x<Math.min(G.cols,(cx+1)*N); x++)
            if (G.grid[y] && G.grid[y][x]===0) n++;
        if (n>bestN) { bestN=n; best=[cx,cy]; }
      }
      var cv = BH.floorChunk(best[0], best[1]);
      if (!cv) return null;
      var K=3, big=document.createElement('canvas');
      big.width=cv.width*K; big.height=cv.height*K;
      var bg=big.getContext('2d'); bg.imageSmoothingEnabled=false;
      bg.drawImage(cv,0,0,big.width,big.height);
      var url = big.toDataURL('image/png');
      (window.__SH = window.__SH || []).push({ n: '${name}', d: url });
      return url;
    })()`);
    if (!data) { console.log(name + ' → 沒有分塊'); continue; }
    fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(data.split(',')[1], 'base64'));
    console.log(name + ' → ' + path.join(OUT, name + '.png'));
  }

  /* 4×2 對照表（左到右、上到下＝八個主題的順序）
     注意：不要把 dataURL 傳回 node —— 幾 MB 的字串走 CDP 會卡死（實測 30 秒逾時）。
     改成「在頁面裡畫好 → 塞進 DOM → Page.captureScreenshot 整頁截圖」。 */
  await p.eval(`(function(){
    window.__SHD = 0;
    var L = window.__SH || [];
    if (L.length !== 8) { window.__SHD = -1; return 0; }
    var ims = L.map(function (o) { var im = new Image(); im.src = o.d; return im; });
    var left = ims.length;
    ims.forEach(function (im) {
      im.onload = function () {
        if (--left) return;
        var K = .28, LBL = 20;   // 整張表壓到 ~1600px 寬（再大 Page.captureScreenshot 會逾時）
        var cw = Math.round(im.width * K), ch = Math.round(im.height * K);
        var C = 4, R = 2;
        var cv = document.createElement('canvas');
        cv.width = C * cw; cv.height = R * (ch + LBL);
        var g = cv.getContext('2d');
        g.fillStyle = '#141018'; g.fillRect(0, 0, cv.width, cv.height);
        ims.forEach(function (m, k) {
          var cx = (k % C) * cw, cy = Math.floor(k / C) * (ch + LBL);
          g.drawImage(m, cx, cy + LBL, cw, ch);
          g.fillStyle = '#ffe9b0'; g.font = 'bold 20px sans-serif';
          g.fillText(L[k].n, cx + 8, cy + 17);
        });
        window.__SHEET = cv;
        window.__SHD = 1;
      };
    });
    return 8;
  })()`);
  let ready = 0;
  for (let i = 0; i < 60; i++) { ready = await p.eval('window.__SHD'); if (ready) break; await sleep(200); }
  if (ready === 1) {
    const size = await p.eval(`(function(){
      var cv = window.__SHEET;
      document.documentElement.style.overflow = 'hidden';
      document.body.style.margin = '0';
      document.body.innerHTML = '';
      cv.style.position = 'fixed'; cv.style.left = '0'; cv.style.top = '0';
      document.body.appendChild(cv);
      window.scrollTo(0, 0);
      return [cv.width, cv.height];
    })()`);
    await p.resize(size[0], size[1], false);      // 視窗也要一起放大，否則只截得到左上角
    await sleep(500);
    await p.fullShot(path.join(OUT, 'sheet.png'));
    console.log('sheet → ' + path.join(OUT, 'sheet.png') + '（' + size.join('x') + '）');
  } else {
    console.log('sheet → 合成失敗（' + ready + '）');
  }
  b.close();
  srv.close();
})();
