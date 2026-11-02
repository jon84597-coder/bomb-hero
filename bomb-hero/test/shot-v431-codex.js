// v4.31：圖鑑「怪物圖鑑」分頁 —— 第 2 大關 6 隻新美術圖
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const OUT = path.join(__dirname, '_v431');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) { }
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
(async () => {
  const b = await launch({ port: 9526, w: 1000, h: 820 });
  try {
    const p = await b.newPage();
    await p.send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 1200, deviceScaleFactor: 1, mobile: false });
    await p.goto(URL, 2800);
    for (let i = 0; i < 80; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game)')) break; await sleep(300); }
    await p.eval("(function(){ var b=document.getElementById('btnHelp'); if(b) b.click(); })()");
    await sleep(900);
    await p.eval("(function(){ var t=document.querySelector('[data-ht=foe]'); if(t) t.click(); })()");
    await sleep(1200);
    await p.shot(path.join(OUT, 'codex.png'));
    // 捲到第 2 大關
    await p.eval(`(function(){
      var all=document.querySelectorAll('*'); var hit=null;
      for(var i=0;i<all.length;i++){ if(all[i].children.length===0 && /沙漠遺跡/.test(all[i].textContent||'')) { hit=all[i]; break; } }
      if(hit) hit.scrollIntoView({block:'center'});
      // 保險：直接捲動說明容器
      var sc=document.querySelector('#helpBox .hbody, #helpBox .body, #helpBody');
      if(sc && !hit) sc.scrollTop = sc.scrollHeight*0.2;
      return !!hit;
    })()`);
    await sleep(800);
    await p.shot(path.join(OUT, 'codex-s2.png'));
    console.log('DONE');
  } finally { await b.close(); }
})().catch(e => { console.error('ERR', e && e.message); process.exit(1); });
