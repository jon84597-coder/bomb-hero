// v4.27 圖鑑（8 關 × 6 隻）截圖，確認 <b> 粗體與小怪圖示都正常
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const OUT = path.join(__dirname, '_v427');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

(async () => {
  const b = await launch({ port: 9467, w: 1000, h: 780 });
  try {
    for (const [tag, block] of [['foe1', 0], ['foe4', 3], ['foe8', 7]]) {
      const p = await b.newPage();
      await p.send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 780, deviceScaleFactor: 2, mobile: false });
      await p.goto(URL, 2400);
      for (let i = 0; i < 40; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game)')) break; await sleep(300); }
      await p.eval("(function(){var e=document.getElementById('btnHelp'); if(e) e.click();})()");
      await sleep(500);
      const tab = await p.eval(`(function(){
        var t=document.getElementById('helpTabs'); if(!t) return 'noTabs';
        var bs=t.querySelectorAll('button');
        for (var i=0;i<bs.length;i++){ if(bs[i].getAttribute('data-ht')==='foe'){ bs[i].click(); return 'ok'; } }
        return 'noTab';
      })()`);
      await sleep(1000);
      const info = await p.eval(`(function(){
        var h=document.getElementById('helpBody'); if(!h) return 'noBody';
        var subs=h.querySelectorAll('.hsub');
        var el=subs[${block}]; if(el) el.scrollIntoView({block:'start'});
        var n=h.querySelectorAll('canvas[data-sp]').length;
        var raw=h.querySelector('.hd');
        return JSON.stringify({ icons:n, sections:subs.length, bold: h.querySelectorAll('.hd b').length, firstDesc: raw? raw.textContent.slice(0,26):'' });
      })()`);
      await sleep(700);
      await p.shot(path.join(OUT, tag + '.png'));
      console.log(tag, tab, info);
      await p.send('Target.closeTarget', { targetId: p.targetId });
    }
  } finally { await b.close(); }
})();
