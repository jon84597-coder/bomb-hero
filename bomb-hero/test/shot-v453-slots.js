// v4.53：對戰選角卡片改版目檢（桌機 / 手機直放）
// 用法：node shot-v453-slots.js [tag]
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const URL = process.env.BH_URL || ('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
const OUT = path.join(__dirname, '_v453');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) { }
const TAG = process.argv[2] || 'x';

async function shoot(b, w, h, tag, touch) {
  const p = await b.newPage();
  if (touch) await p.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: true });
  await p.goto(URL, 3200);
  for (let i = 0; i < 60; i++) {
    if (await p.eval('!!(window.__BH && window.__BH.Game)')) break;
    await sleep(300);
  }
  await sleep(600);
  await p.eval(`(function(){
    try{ document.body.classList.remove('pseudo-full'); }catch(e){}
    var el=document.getElementById('btnBattle'); if(el) el.click();
  })()`);
  await sleep(900);
  // 讓 8 個位子都出現、並把前兩個切成 AI 狀態，順便量尺寸
  const geo = await p.eval(`(function(){
    var out={};
    try{
      var seg=document.querySelectorAll('#segCount button'); if(seg[6]) seg[6].click();
    }catch(e){}
    var boxes=[].slice.call(document.querySelectorAll('#pSlots .pbox'));
    if(boxes[0]){ var b0=boxes[0].querySelector('[data-ai]'); if(b0) b0.click(); }
    boxes=[].slice.call(document.querySelectorAll('#pSlots .pbox'));
    out.count=boxes.length;
    out.cards=boxes.slice(0,2).map(function(d){
      var r=d.getBoundingClientRect();
      var btns=[].slice.call(d.querySelectorAll('button')).map(function(x){
        var q=x.getBoundingClientRect(); return Math.round(q.width)+'x'+Math.round(q.height);
      });
      var cv=d.querySelector('canvas.pav'); var cr=cv?cv.getBoundingClientRect():{width:0};
      return {w:Math.round(r.width),h:Math.round(r.height),btns:btns,av:Math.round(cr.width)};
    });
    var wrap=document.getElementById('pSlots').getBoundingClientRect();
    out.wrap={w:Math.round(wrap.width),left:Math.round(wrap.left),right:Math.round(wrap.right)};
    out.vw=window.innerWidth;
    out.overflow=document.documentElement.scrollWidth>window.innerWidth+1;
    return out;
  })()`);
  await sleep(400);
  await p.fullShot(path.join(OUT, 'slots-' + tag + '.png'));
  // 只拍卡片區（放大目檢）
  const box = await p.eval(`(function(){var r=document.getElementById('pSlots').getBoundingClientRect();
    return {x:r.left,y:r.top,w:r.width,h:r.height};})()`);
  try {
    await p.send('Page.captureScreenshot', { format: 'png', clip: { x: box.x, y: box.y, width: box.w, height: box.h, scale: 2 } });
    const r = await p.send('Page.captureScreenshot', { format: 'png', clip: { x: box.x, y: box.y, width: box.w, height: box.h, scale: 2 } });
    if (r && r.data) fs.writeFileSync(path.join(OUT, 'slots-zoom-' + tag + '.png'), Buffer.from(r.data, 'base64'));
  } catch (e) { }
  console.log(tag, JSON.stringify(geo));
  try { await p.close(); } catch (e) { }
}

(async () => {
  const b = await launch({ port: 9623, w: 1280, h: 900 });
  try {
    await shoot(b, 1280, 900, 'desktop-' + TAG, false);
    await shoot(b, 390, 844, 'phone-' + TAG, true);
  } finally {
    try { await b.close(); } catch (e) { }
  }
  console.log('OK');
})();
