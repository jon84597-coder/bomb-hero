// test/diag-v412c.js — 逐像素掃描炸彈鈕周圍，確定「黑色圓角方塊」到底是誰畫的
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');

const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const OUT = path.join(__dirname, '_v412');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const br = await launch({ w: 390, h: 844, port: 9349 });
  const page = await br.newPage();
  await page.resize(390, 844, true);
  await page.goto(URL + '?touch=1&stage=2&auto=1', 1800);
  await sleep(900);
  // 關掉旋轉提示，避免整頁被蒙版蓋住
  await page.eval(`(function(){ try{ var h=document.getElementById('rotHint'); if(h&&h.remove) h.remove(); }catch(e){} return 1; })()`);
  await sleep(300);

  const r = await page.eval(`(function(){
    var btn = document.querySelector('.tact');
    var rr = btn.getBoundingClientRect();
    var icon = btn.querySelector('.ticon');
    var ir = icon.getBoundingClientRect();
    var cs = getComputedStyle(icon);
    var bcs = getComputedStyle(btn);
    return {
      btn: { x: Math.round(rr.left), y: Math.round(rr.top), w: Math.round(rr.width), h: Math.round(rr.height),
             radius: bcs.borderRadius, overflow: bcs.overflow, transform: bcs.transform },
      icon: { x: Math.round(ir.left), y: Math.round(ir.top), w: Math.round(ir.width), h: Math.round(ir.height),
              radius: cs.borderRadius, bg: cs.backgroundColor, bgImg: cs.backgroundImage.slice(0,50),
              display: cs.display, opacity: cs.opacity },
      btnBoxShadow: bcs.boxShadow.slice(0, 200),
      btnBg: bcs.backgroundImage.slice(0, 200),
      btnFilter: bcs.filter
    };
  })()`);
  console.log(JSON.stringify(r, null, 2));

  // 沿水平中線掃描像素（用 screenshot 取得實際合成結果）
  const clip = { x: r.btn.x - 6, y: r.btn.y - 6, width: r.btn.w + 12, height: r.btn.h + 12 };
  const shot = await page.send('Page.captureScreenshot', { format: 'png', clip: { ...clip, scale: 1 } });
  const buf = Buffer.from(shot.data, 'base64');
  fs.writeFileSync(path.join(OUT, 'BTN-raw.png'), buf);

  const { createCanvas, loadImage } = require('@napi-rs/canvas');
  const img = await loadImage(buf);
  const cv = createCanvas(img.width, img.height);
  const g = cv.getContext('2d');
  g.drawImage(img, 0, 0);
  const midY = Math.round(img.height / 2);
  const row = [];
  for (let x = 0; x < img.width; x++) {
    const d = g.getImageData(x, midY, 1, 1).data;
    row.push(d[0] + ',' + d[1] + ',' + d[2]);
  }
  console.log('\n水平中線像素（左=鈕外 右=鈕外），共 ' + img.width + 'px：');
  console.log(row.join(' | '));
  fs.writeFileSync(path.join(OUT, 'BTN-scan.png'), cv.toBuffer('image/png'));

  await br.close();
})().catch(function (e) { console.error('FAILED', e); process.exit(1); });
