// 量「軟磚腳下的陰影」深度是否與「石牆旁邊的陰影」一致（使用者要求：深度差不多）
//   node test/_probe-softdepth.js
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');
const http = require('http');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json' };
const srv = http.createServer(function (req, res) {
  let f = decodeURIComponent(req.url.split('?')[0]);
  if (f === '/') f = '/index.html';
  fs.readFile(path.join(ROOT, f), function (e, buf) {
    if (e) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
    res.end(buf);
  });
});

(async () => {
  await new Promise(r => srv.listen(8125, '127.0.0.1', r));
  const b = await launch({ port: 9835, w: 430, h: 932 });
  const p = await b.newPage();
  await p.goto('http://127.0.0.1:8125/index.html', 8000);
  for (let i = 0; i < 60; i++) { if (await p.eval('!!(window.__BH && window.__BH.Game)')) break; await sleep(250); }
  await sleep(700);

  const stages = await p.eval(`(function(){
    var BH=window.__BH, out={}, G=BH.Game;
    for (var s=1; s<=32; s++) { try{ BH.startSolo(s,false); }catch(e){continue;}
      var st=(G.theme&&G.theme.style)||'?'; if(!out[st]) out[st]=s; }
    return out; })()`);

  const rows = [];
  for (const st of Object.keys(stages)) {
    const r = await p.eval(`(function(){
      var BH=window.__BH, G=BH.Game;
      BH.startSolo(${stages[st]}, false);
      var T=G.T;
      function lum(cv, px, py) {
        var g=cv.getContext('2d'), d=g.getImageData(Math.round(px), Math.round(py), 1, 1).data;
        return 0.299*d[0]+0.587*d[1]+0.114*d[2];
      }
      // 找「軟磚｜空地」與「石牆｜空地」各一組，比較空地那一格靠牆處 vs 同格遠處
      var soft=null, wall=null;
      for (var y=1;y<G.rows-1;y++) for (var x=1;x<G.cols-2;x++) {
        var v=G.grid[y][x], rv=G.grid[y][x+1];
        if (rv!==0) continue;
        if (v===2 && !soft) soft={x:x,y:y};
        if (v===1 && !wall && !BH.floorCellSkip(x,y)) wall={x:x,y:y};
      }
      function probe(c) {
        if (!c) return null;
        var cv=BH.floorChunk((c.x/8)|0, (c.y/8)|0);
        if (!cv) return null;
        var pr=(cv.width/(Math.min(8,G.cols-((c.x/8)|0)*8)*T)), // 實際縮放（含 pixelRatio）
            ox=(c.x-((c.x/8)|0)*8), oy=(c.y-((c.y/8)|0)*8);
        var midN = lum(cv,(ox+1)*T+3*pr, (oy+0.5)*T);
        var midF = lum(cv,(ox+1)*T+0.62*T*pr, (oy+0.5)*T);   // 同格遠處（柔光帶之外）
        var inN  = lum(cv,(ox+1)*T-2*pr, (oy+0.5)*T);          // 軟磚格內緣（只有軟磚有）
        return {near:+midN.toFixed(1), far:+midF.toFixed(1), inside:+inN.toFixed(1),
                drop:+((1-midN/Math.max(1,midF))*100).toFixed(1)};
      }
      return {soft:probe(soft), wall:probe(wall), T:T};
    })()`);
    if (r && r.soft && r.wall) {
      rows.push([st, r.soft.drop, r.wall.drop, Math.abs(r.soft.inside - r.soft.near)]);
      console.log(st.padEnd(7) + ' 軟磚旁陰影 ' + String(r.soft.drop).padStart(5) + '%   石牆旁 ' +
        String(r.wall.drop).padStart(5) + '%   交界處內外差 ' + Math.abs(r.soft.inside - r.soft.near).toFixed(1));
    } else console.log(st + ' 找不到樣本', JSON.stringify(r && {s:!!r.soft,w:!!r.wall}));
  }
  const avg = (i) => (rows.reduce((a, r) => a + r[i], 0) / Math.max(1, rows.length)).toFixed(1);
  console.log('\n平均：軟磚旁 ' + avg(1) + '%　石牆旁 ' + avg(2) + '%　交界內外差 ' + avg(3));
  try { srv.close(); } catch (e) {}
  b.close();
})();
