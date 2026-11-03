const path = require('path'); const fs = require('fs');
const { launch, sleep } = require('./cdp');
const URL = process.env.BH_URL || ('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
(async function () {
  const b = await launch({ width: 390, height: 844 });
  const p = await b.newPage();
  await p.goto(URL, 3200);
  for (let i = 0; i < 60; i++) { if (await p.eval('!!(window.__BH && window.__BH.Game)')) break; await sleep(300); }
  const d = await p.eval(`(function(){
    var BH=window.__BH; BH.settings.count=4; BH.startBattle();
    var c=document.querySelector('#pkRoster canvas.pav');
    var out={};
    if(c){ out.url=c.toDataURL('image/png'); out.w=c.width; out.h=c.height;
      var s=getComputedStyle(c); out.css=[s.width,s.height,s.borderRadius,s.background.slice(0,40)]; }
    return out;
  })()`);
  if (d.url) fs.writeFileSync(path.join(__dirname, '_v455', 'av-raw.png'), Buffer.from(d.url.split(',')[1], 'base64'));
  console.log(d.w, d.h, JSON.stringify(d.css));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
