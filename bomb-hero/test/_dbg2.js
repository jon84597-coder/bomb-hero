const { launch } = require('./cdp');
const path = require('path');
const URL0 = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g,'/');
(async()=>{
  const br = await launch({w:430,h:900,port:9393});
  const p = await br.newPage();
  await p.resize(430,900,true);
  await p.goto(URL0, 3600);
  const r = await p.eval(`(function(){
    var P = window.__BH;
    try { P.Solo.unlocked = 40; } catch(e){}
    try {
      P.Abyss.start(1);
    } catch(e) { return {err: String(e)}; }
    var out = {};
    ['gameTop','abyssBadge','stageName','topBar'].forEach(function(id){
      var el = document.getElementById(id);
      if (!el) { out[id] = null; return; }
      var b = el.getBoundingClientRect();
      out[id] = {x:Math.round(b.left),y:Math.round(b.top),w:Math.round(b.width),h:Math.round(b.height)};
    });
    var gt = document.getElementById('gameTop');
    if (gt) out.kids = Array.prototype.map.call(gt.children, function(c){
      var b = c.getBoundingClientRect();
      return {id:c.id||c.className, x:Math.round(b.left), y:Math.round(b.top), w:Math.round(b.width)};
    });
    out.mode = P.Game.mode;
    return out;
  })()`);
  console.log(JSON.stringify(r,null,1));
  await br.close();
})();
