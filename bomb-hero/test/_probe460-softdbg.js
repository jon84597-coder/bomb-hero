// 讀取 _tmp_soft.html 的軟磚放置統計（候選 / 通過機率 / 被鄰居規則擋掉）
const { launch, sleep } = require('./cdp');
const path = require('path');
const URL = 'file:///' + path.resolve(__dirname, '_tmp_soft.html').replace(/\\/g, '/');

(async () => {
  const b = await launch({ port: 9785, w: 900, h: 700 });
  const p = await b.newPage();
  await p.goto(URL, 3600);
  for (let i = 0; i < 80; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game&&window.__BH.Game.grid)')) break; await sleep(250); }
  await sleep(400);
  for (const st of [6, 24, 21, 29, 1]) {
    const r = await p.eval(`(function(){
      var BH=window.__BH,G=BH.Game;
      window.__SOFTDBG=null;
      BH.startSolo(${st}, false); G.state='play';
      var o=0,s=0;
      for(var y=0;y<G.rows;y++)for(var x=0;x<G.cols;x++){var v=G.grid[y][x];if(v===0)o++;else if(v===2)s++;}
      return {dbg:window.__SOFTDBG, soft:s, open:o};
    })()`);
    console.log('st' + st, JSON.stringify(r));
  }
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
