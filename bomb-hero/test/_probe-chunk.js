// 直接把「烘好的地板分塊」倒出來看（沒有 HUD／角色干擾），用來判斷軟磚腳下的陰影
//   node test/_probe-chunk.js [before|after]
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');
// 一定要用 http：file:// 載入的貼圖會 taint 畫布 → toDataURL 會拋 SecurityError
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
const OUT = path.join(__dirname, '_softao');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const TAG = process.argv[2] || 'after';

(async () => {
  await new Promise(function (r) { srv.listen(8124, '127.0.0.1', r); });
  const b = await launch({ port: 9834, w: 430, h: 932 });
  const p = await b.newPage();
  await p.goto('http://127.0.0.1:8124/index.html', 8000);
  for (let i = 0; i < 60; i++) { if (await p.eval('!!(window.__BH && window.__BH.Game)')) break; await sleep(250); }
  await sleep(700);

  const stages = await p.eval(`(function(){
    var BH=window.__BH, out={}, G=BH.Game;
    for (var s=1; s<=32; s++) { try { BH.startSolo(s,false); } catch(e){ continue; }
      var st=(G.theme&&G.theme.style)||'?'; if(!out[st]) out[st]=s; }
    return out; })()`);

  for (const st of Object.keys(stages)) {
    const r = await p.eval(`(function(){
      var BH=window.__BH, G=BH.Game;
      BH.startSolo(${stages[st]}, false);
      var best=null, bestN=-1;
      for (var cy=0; cy*8<G.rows; cy++) for (var cx=0; cx*8<G.cols; cx++) {
        var n=0, soft=0;
        for (var y=cy*8;y<Math.min(G.rows,cy*8+8);y++) for (var x=cx*8;x<Math.min(G.cols,cx*8+8);x++) {
          if (G.grid[y][x]===2) { soft++; if (G.grid[y+1]&&G.grid[y+1][x]===0) n++; }
        }
        if (n > bestN) { bestN=n; best={cx:cx,cy:cy,soft:soft}; }
      }
      if (!best || bestN<=0) return null;
      var cv = BH.floorChunk(best.cx, best.cy);
      if (!cv) return null;
      return { img: cv.toDataURL('image/png'), cx:best.cx, cy:best.cy, soft:best.soft, T:G.T };
    })()`);
    if (!r) { console.log(st + ' 沒有合適的分塊'); continue; }
    const b64 = r.img.split(',')[1];
    fs.writeFileSync(path.join(OUT, 'chunk-' + TAG + '-' + st + '.png'), Buffer.from(b64, 'base64'));
    console.log(st + '  分塊(' + r.cx + ',' + r.cy + ')  軟磚 ' + r.soft + ' 格  T=' + r.T);
  }
  b.close();
  try { srv.close(); } catch (e) {}
})();
