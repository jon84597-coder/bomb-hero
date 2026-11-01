// test/diag-v412b.js — 精確量測「功能鍵黑底」的真正來源
//   用 elementFromPoint + 像素取樣 + 各層 computed style 逐一排除
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');

const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const OUT = path.join(__dirname, '_v412');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const br = await launch({ w: 390, h: 844, port: 9347 });
  const page = await br.newPage();
  await page.resize(390, 844, true);
  await page.goto(URL + '?touch=1&stage=2&auto=1', 1800);
  await sleep(900);

  // 用 elementFromPoint 找出炸彈鈕中心點的所有層
  const probe = await page.eval(`(function(){
    var btn = document.querySelector('.tact');
    if (!btn) return { err: 'no .tact' };
    var r = btn.getBoundingClientRect();
    var cx = Math.round(r.left + r.width/2), cy = Math.round(r.top + r.height/2);
    var stack = [];
    var el = document.elementFromPoint(cx, cy);
    while (el && stack.length < 8) {
      var cs = getComputedStyle(el);
      stack.push({
        tag: el.tagName, id: el.id, cls: String(el.className),
        bgColor: cs.backgroundColor,
        bgImage: cs.backgroundImage.slice(0,70),
        radius: cs.borderRadius,
        rect: (function(){ var q=el.getBoundingClientRect();
                   return Math.round(q.left)+','+Math.round(q.top)+','+Math.round(q.width)+'x'+Math.round(q.height); })(),
        zIndex: cs.zIndex
      });
      el = el.parentElement;
    }
    // 圖示畫布的實際像素（中央與四角）
    var icon = btn.querySelector('.ticon');
    var px = null;
    if (icon && icon.getContext) {
      try {
        var g = icon.getContext('2d');
        var w = icon.width, h = icon.height;
        function at(fx, fy) {
          var d = g.getImageData(Math.round(w*fx), Math.round(h*fy), 1, 1).data;
          return 'rgba('+d[0]+','+d[1]+','+d[2]+','+(d[3]/255).toFixed(2)+')';
        }
        px = { size: w+'x'+h,
               corner: at(0.03,0.03), q1: at(0.15,0.15),
               center: at(0.5,0.5), q3: at(0.85,0.85), corner2: at(0.97,0.97) };
      } catch(e) { px = { err: e.message }; }
    }
    // ::before / ::after 的內容
    function pseudoOf(sel, which) {
      var b = document.querySelector(sel);
      if (!b) return 'no el';
      var cs = getComputedStyle(b, which);
      return { content: cs.content, bg: cs.backgroundImage.slice(0,60),
               bgColor: cs.backgroundColor, w: cs.width, h: cs.height,
               inset: cs.inset, radius: cs.borderRadius };
    }
    return {
      btnRect: Math.round(r.left)+','+Math.round(r.top)+','+Math.round(r.width)+'x'+Math.round(r.height),
      stack: stack, iconPixels: px,
      before: pseudoOf('.tact','::before'),
      after: pseudoOf('.tact','::after'),
      touchUIRect: (function(){ var t=document.getElementById('touchUI');
        if(!t) return '-'; var q=t.getBoundingClientRect();
        return Math.round(q.left)+','+Math.round(q.top)+','+Math.round(q.width)+'x'+Math.round(q.height); })(),
      stageRect: (function(){ var t=document.getElementById('stageWrap');
        if(!t) return '-'; var q=t.getBoundingClientRect();
        return Math.round(q.left)+','+Math.round(q.top)+','+Math.round(q.width)+'x'+Math.round(q.height); })(),
      cvRect: (function(){ var t=document.getElementById('cv');
        if(!t) return '-'; var q=t.getBoundingClientRect();
        return Math.round(q.left)+','+Math.round(q.top)+','+Math.round(q.width)+'x'+Math.round(q.height); })(),
      winW: window.innerWidth, winH: window.innerHeight
    };
  })()`);
  console.log(JSON.stringify(probe, null, 2));

  // 只截炸彈鈕那一塊（放大）
  const clip = await page.eval(`(function(){
    var b=document.querySelector('.tact'); var r=b.getBoundingClientRect();
    return { x: Math.max(0,Math.round(r.left)-12), y: Math.max(0,Math.round(r.top)-12),
             width: Math.round(r.width)+24, height: Math.round(r.height)+24 };
  })()`);
  const r = await page.send('Page.captureScreenshot', {
    format: 'png', clip: { x: clip.x, y: clip.y, width: clip.width, height: clip.height, scale: 4 }
  });
  fs.writeFileSync(path.join(OUT, 'ZOOM-btn-real.png'), Buffer.from(r.data, 'base64'));
  console.log('\nsaved ZOOM-btn-real.png (4x)');

  await br.close();
})().catch(function (e) { console.error('FAILED', e); process.exit(1); });
