// 量測 48 隻小怪貼圖：不透明內容的外接框佔畫布多少（找出「大小不一」的真正來源）
const { launch, sleep } = require('./cdp');
const path = require('path');
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

(async () => {
  const b = await launch({ port: 9761, w: 1280, h: 900 });
  const p = await b.newPage();
  await p.goto(URL, 3200);
  for (let i = 0; i < 80; i++) { if (await p.eval('!!(window.__BH&&window.__BH.FOE_ART)')) break; await sleep(250); }

  const out = await p.eval(`(function(){
    var BH = window.__BH, res = [];
    var keys = Object.keys(BH.FOE_ART);
    keys.forEach(function(sp){
      var img = new Image(); img.src = BH.FOE_ART[sp].u;
      if (!img.width) { res.push({sp: sp, err: 'noimg'}); return; }
      var W = img.width, H = img.height;
      var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      var g = cv.getContext('2d'); g.drawImage(img, 0, 0);
      var d = g.getImageData(0, 0, W, H).data;
      var x0 = W, x1 = -1, y0 = H, y1 = -1;
      for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
        if (d[(y * W + x) * 4 + 3] > 12) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
      var M = BH.FOE_ART[sp];
      res.push({ sp: sp, hs: M.hs, asp: M.asp, w: W, h: H,
                 fillH: +((y1 - y0 + 1) / H).toFixed(3), fillW: +((x1 - x0 + 1) / W).toFixed(3) });
    });
    return res;
  })()`);

  const R0 = 14 * 1.42 * 1.2650;
  out.filter(r => !r.err).forEach(r => {
    const visH = R0 * r.hs * r.fillH;      // 實際看到的高度（px，T=62）
    console.log(r.sp.padEnd(11), 'hs', String(r.hs).padEnd(5), 'fillH', String(r.fillH).padEnd(6),
                'visH', visH.toFixed(1), '=', (visH / 62).toFixed(2) + 'T');
  });
  console.log('n =', out.filter(r => !r.err).length);
  require('fs').writeFileSync(path.join(__dirname, '_probe459-foe.json'), JSON.stringify(out));
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
