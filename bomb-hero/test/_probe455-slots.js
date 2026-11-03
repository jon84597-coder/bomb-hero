// v4.55 探測：對戰「選角畫面」在 4 人時的頭像尺寸
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const URL = process.env.BH_URL || ('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
const OUT = path.join(__dirname, '_v455');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) { }

(async function () {
  const W = +(process.argv[2] || 1280), H = +(process.argv[3] || 800), N = +(process.argv[4] || 4);
  const b = await launch({ width: W, height: H });
  const p = await b.newPage();
  await p.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: W < 800 });
  await p.goto(URL, 3200);
  for (let i = 0; i < 60; i++) {
    if (await p.eval('!!(window.__BH && window.__BH.Game)')) break;
    await sleep(300);
  }
  await sleep(500);
  await p.eval(`(function(){ try{ document.body.classList.remove('pseudo-full'); }catch(e){} var el=document.getElementById('btnBattle'); if(el) el.click(); })()`);
  await sleep(700);
  const info = await p.eval(`(function(){
    var BH=window.__BH;
    BH.settings.count = ${N};
    try{ BH.updateCountHint(); }catch(e){}
    var seg=document.querySelectorAll('#segCount button');
    if(seg.length){ seg[Math.min(${N}-2, seg.length-1)].click(); }
    var out={count:${N}, boxes:[]};
    [].slice.call(document.querySelectorAll('#pSlots .pbox')).forEach(function(d){
      var r=d.getBoundingClientRect();
      var cv=d.querySelector('canvas.pav'); var cr=cv?cv.getBoundingClientRect():null;
      out.boxes.push({w:Math.round(r.width),h:Math.round(r.height),
        av:cr?Math.round(cr.width)+'x'+Math.round(cr.height):'none'});
    });
    return out;
  })()`);
  console.log(W + 'x' + H, JSON.stringify(info));
  await sleep(500);
  const shot = await p.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT, 'slots-' + W + '-' + N + '.png'), Buffer.from(shot.data, 'base64'));
  await b.close();
})().catch(function (e) { console.error(e); process.exit(1); });
