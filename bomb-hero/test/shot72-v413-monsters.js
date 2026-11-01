// test/shot72-v413-monsters.js — 20 隻小怪圖（先擋掉 rAF，遊戲就不會重畫蓋掉）
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');

const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const OUT = path.join(__dirname, '_v413');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const br = await launch({ w: 1120, h: 700, port: 9375 });
  const page = await br.newPage();

  // 關鍵：在頁面載入前把 requestAnimationFrame 換掉 → 遊戲主迴圈不會跑、不會重畫
  await page.send('Page.addScriptToEvaluateOnNewDocument', {
    source: 'window.requestAnimationFrame = function(){ return 0; };'
  });

  await page.goto(URL, 1800);
  await sleep(600);

  const res = await page.eval(`(function(){
    var P = window.__BH;
    if (!P) return { ok:false, err:'no __BH' };
    var cv = document.getElementById('cv');
    var g = cv.getContext('2d');
    var W = cv.width, H = cv.height;
    g.setTransform(1,0,0,1,0,0);
    g.fillStyle = '#8fc98a'; g.fillRect(0,0,W,H);
    g.fillStyle = 'rgba(60,90,55,.28)';
    for (var i=0;i<260;i++) g.fillRect((i*97)%W,(i*53)%H,2,2);
    g.fillStyle = '#20301c'; g.font = '700 26px sans-serif';
    g.fillText('v4.13  20 monsters  (* = has skill)', 20, 40);
    g.font = '16px sans-serif';
    g.fillText('new 10: scavenger / sapper / bomber / panda / penguin / octopus / robot / wizard / wisp / hornet', 20, 66);
    var list = P.ENEMY_SPECIES;
    var cols = 10, cw = W / cols, ch = (H - 90) / 2;
    var drawn = 0, errs = [];
    for (var r=0;r<2;r++) {
      for (var c=0;c<cols;c++) {
        var sp = list[r*cols+c]; if (!sp) continue;
        var x = cw*c + cw/2, y = 90 + ch*r + ch/2 - 10;
        g.fillStyle='rgba(0,0,0,.22)';
        g.beginPath(); g.ellipse(x, y+40, 25, 8, 0, 0, 6.283); g.fill();
        var e = { type:sp.id, spec:sp.id, color:sp.color, color2:sp.color2, r:sp.r,
                  kind:sp.kind, wing:sp.wing, walkT:1.2, vx:1, dirName:'right', bobP:0.3 };
        try { P.drawEnemyArt(e, x, y, false, 1.2); drawn++; } catch(err) { errs.push(sp.id+':'+err.message); }
        g.fillStyle='#20301c'; g.font='700 15px sans-serif'; g.textAlign='center';
        g.fillText(sp.name + (sp.skill ? ' *' : ''), x, y+68);
        g.textAlign='left';
      }
    }
    return { ok:true, count:list.length, drawn:drawn, errs:errs, W:W, H:H };
  })()`);
  console.log('rendered: ' + JSON.stringify(res));

  // 直接從 canvas 取 PNG（canvas 的 CSS 尺寸可能是 0，截圖會失敗）
  const dataUrl = await page.eval(`(function(){
    var cv = document.getElementById('cv');
    return cv.toDataURL('image/png');
  })()`);
  fs.writeFileSync(path.join(OUT, 'monsters-20.png'),
    Buffer.from(String(dataUrl).split(',')[1], 'base64'));
  console.log('saved monsters-20.png');

  await br.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
