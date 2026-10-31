// 放大目檢：首頁左上角版本標籤 + 公告欄 + RPG／商店鈕（2x）
const cdp = require('./cdp');
const fs = require('fs');

(async () => {
  const browser = await cdp.launch({ w: 1280, h: 900, port: 9411 });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:3000/', 1200);
  await cdp.sleep(600);

  const rects = await page.eval(`(() => {
    const g = id => { const e = document.getElementById(id); if (!e) return null; const r = e.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; };
    return { rpg: g('btnRpg'), store: g('btnStore'), chip: g('verLogBtn'), ann: g('annBox') };
  })()`);
  console.log(JSON.stringify(rects));

  async function clipShot(file, x, y, w, h, scale) {
    const r = await page.send('Page.captureScreenshot', {
      format: 'png',
      clip: { x: Math.max(0, x), y: Math.max(0, y), width: w, height: h, scale: scale || 2 },
      captureBeyondViewport: false
    });
    fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
    console.log('  -> ' + file);
  }

  const chip = rects.chip, ann = rects.ann, rpg = rects.rpg;
  await clipShot('test/v40-6-topleft.png', 0, 0, Math.max(chip.w, ann.w) + 40, ann.h + 30, 2);
  if (rpg) await clipShot('test/v40-7-rpgbtn.png', rpg.x - 10, rpg.y - 10, rpg.w + 20, rpg.h + 20, 2.4);

  // 順便量一下有沒有重疊
  const overlap = (a, b) => a && b && !(a.y + a.h <= b.y || b.y + b.h <= a.y || a.x + a.w <= b.x || b.x + b.w <= a.x);
  console.log('chip/ann 重疊？', overlap(chip, ann));
  console.log('chip:', JSON.stringify(chip));
  console.log('ann :', JSON.stringify(ann));

  browser.close();
  process.exit(0);
})();
