const path = require('path');
const { launch, sleep } = require('./cdp');
const URL = process.env.BH_URL || ('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
(async function () {
  const b = await launch({ width: 390, height: 844 });
  const p = await b.newPage();
  await p.goto(URL, 3200);
  for (let i = 0; i < 60; i++) { if (await p.eval('!!(window.__BH && window.__BH.Game)')) break; await sleep(300); }
  const out = await p.eval(`(function(){
    var BH=window.__BH, res=[];
    BH.CHARACTERS.forEach(function(c){
      var im=BH.Sprites.get(c.animal);
      res.push({ch:c.name||c.animal, animal:c.animal, tag:im&&im.tagName, nw:im&&im.naturalWidth, nh:im&&im.naturalHeight,
        w:im&&im.width, h:im&&im.height});
    });
    return res;
  })()`);
  console.log(JSON.stringify(out));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
