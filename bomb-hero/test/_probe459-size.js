// 量 48 隻小怪的顯示高度（H/T）在各種格子大小下的分佈
const { launch, sleep } = require('./cdp');
const path = require('path');
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

(async () => {
  const b = await launch({ port: 9823, w: 1280, h: 800 });
  const p = await b.newPage();
  await p.goto(URL, 3600);
  for (let i = 0; i < 80; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game&&window.__BH.Game.grid)')) break; await sleep(250); }
  await sleep(400);

  const out = await p.eval(`(function(){
    var BH = window.__BH, G = BH.Game;
    var sp = BH.ENEMY_SPECIES, rows = [];
    Object.keys(sp).forEach(function(k){
      var o = sp[k], id = o.id || k, M = BH.FOE_ART[id] || {};
      rows.push({ id: id, r: o.r, hs: M.hs || 1.9, asp: M.asp || 1 });
    });
    var res = {};
    [18, 20, 24, 32, 44, 62].forEach(function(T){
      var old = G.T; G.T = T;
      var vals = rows.map(function(o){
        var R = BH.enemyArtR({ r: o.r });
        return { id: o.id, h: +(R * o.hs / T).toFixed(2), px: +(R * o.hs).toFixed(0) };
      });
      G.T = old;
      vals.sort(function(a, b){ return a.h - b.h; });
      res['T' + T] = {
        min: vals[0].h + ' ' + vals[0].id, max: vals[vals.length-1].h + ' ' + vals[vals.length-1].id,
        pxmin: vals[0].px, pxmax: vals[vals.length-1].px,
        lo: vals.slice(0,4).map(function(v){return v.id+':'+v.h}), hi: vals.slice(-4).map(function(v){return v.id+':'+v.h})
      };
    });
    res.species = rows.map(function(o){ return o.id+' r'+o.r+' hs'+o.hs; });
    res.nowT = G.T;
    return res;
  })()`);
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
