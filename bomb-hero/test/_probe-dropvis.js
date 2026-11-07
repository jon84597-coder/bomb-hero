// test/_probe-dropvis.js — 看大逃殺空投箱「從天而降」到底長什麼樣
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, '_drop');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}

const SETUP = `(function(){
  try { __BH.settings.size='L'; } catch(e){}
  __BH.startBR();
  var G = __BH.Game, B = __BH.BR;
  B.DROP_FALL = 999;
  G.brDrops.length = 0;
  var p = G.players[0];
  var px = Math.floor(p.x / G.T), py = Math.floor(p.y / G.T);
  G.brDrops.push({ x: px + 2, y: py, h: .5, st: 'fall', t: 999 * .5, glow: 0 });
  G.state = 'play'; G.paused = false;
  try { __BH.ovHide(); } catch(e){}
  return { mode: G.mode, T: G.T, cols: G.cols, rows: G.rows, drop: G.brDrops[0] };
})()`;

(async () => {
  const b = await launch({ w: 430, h: 932, port: 9393 });
  const p = await b.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.goto('http://127.0.0.1:3111/', 1600);
  await sleep(400);
  await p.eval(`(function(){
    try { localStorage.setItem('bombhero-rotskip','1'); } catch(e){}
    var r = document.getElementById('rotHint'); if (r && r.parentNode) r.parentNode.removeChild(r);
    try { __BH.ovHide(); } catch(e){}
    return 1;
  })()`);
  console.log('setup', JSON.stringify(await p.eval(SETUP)));
  await sleep(900);
  for (const h of [1, .75, .5, .25]) {
    await p.eval(`(function(){
      var G=__BH.Game, d=G.brDrops[0], B=__BH.BR;
      d.h=${h}; d.t=B.DROP_FALL*${h};
      return d.h;
    })()`);
    await sleep(320);
    await p.shot(path.join(OUT, 'h' + String(h).replace('.', '') + '.png'));
  }
  // 落地後：確認金色柔光不再是硬邊白圓盤
  await p.eval(`(function(){
    var G=__BH.Game, d=G.brDrops[0];
    d.st='land'; d.h=0; d.glow=1.4; d.t=0;
    return d.st;
  })()`);
  await sleep(500);
  await p.shot(path.join(OUT, 'land.png'));
  console.log('done');
  await p.close();
  await b.close();
})().catch(e => { console.error('ERR', e && e.message); process.exit(1); });
