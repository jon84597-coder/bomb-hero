// test/shot70-v413-monsters.js — 20 隻小怪視覺圖（直接畫進遊戲自己的 canvas，確保是真的繪製）
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');

const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const OUT = path.join(__dirname, '_v413');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const br = await launch({ w: 1120, h: 700, port: 9373 });
  const page = await br.newPage();
  await page.goto(URL + '?stage=1&auto=1', 1800);
  await sleep(900);

  const res = await page.eval(`(function(){
    var P = window.__BH, G = P.Game;
    var cv = document.getElementById('cv');
    var g = cv.getContext('2d');
    var W = cv.width, H = cv.height;
    // 直接在遊戲 canvas 上畫一張「20 隻小怪」圖（用遊戲自己的 drawEnemyArt）
    var oldCtx = null;
    // 找 drawEnemyArt 用的 ctx：drawEnemyArt 會呼叫 drawEnemyArt(e, x, y, flash, wob)
    // → 用 P.drawEnemy 會多畫影子；這裡直接呼叫 P.drawEnemyArt 但它用的是全域 ctx（遊戲 canvas）
    var list = P.ENEMY_SPECIES;
    var T = G.T || 40;
    // 清空畫面 + 畫草地
    g.setTransform(1,0,0,1,0,0);
    g.fillStyle = '#8fc98a'; g.fillRect(0,0,W,H);
    g.fillStyle = 'rgba(60,90,55,.28)';
    for (var i=0;i<220;i++) g.fillRect((i*97)%W,(i*53)%H,2,2);
    // 標題
    g.fillStyle = '#20301c'; g.font = '700 26px sans-serif';
    g.fillText('v4.13  20 \u55ae\u5c0f\u602a\uff08\u2605 = \u6709\u6280\u80fd\uff09', 20, 40);
    g.font = '16px sans-serif';
    g.fillText('\u65b0 10 \u55ae\uff1a\u6469\u5f39\u602a / \u62c6\u5f39\u602a / \u653e\u5f39\u602a / \u8c93\u718a / \u4f01\u9e5d / \u7ae0\u9c7c / \u6a5f\u5668\u4eba / \u5c0f\u5deb\u5e2b / \u9b3c\u706b / \u5927\u9ec4\u8702', 20, 66);
    // 逐隻畫
    var cols = 10, cw = W / cols, ch = (H - 90) / 2;
    for (var r=0;r<2;r++) {
      for (var c=0;c<cols;c++) {
        var sp = list[r*cols+c]; if (!sp) continue;
        var x = cw*c + cw/2, y = 90 + ch*r + ch/2 - 10;
        // 影子
        g.fillStyle='rgba(0,0,0,.22)';
        g.beginPath(); g.ellipse(x, y+40, 25, 8, 0, 0, 6.283); g.fill();
        var e = { type:sp.id, spec:sp.id, color:sp.color, color2:sp.color2, r:sp.r,
                  kind:sp.kind, wing:sp.wing, walkT:1.2, vx:1, dirName:'right', bobP:0.3 };
        try { P.drawEnemyArt(e, x, y, false, 1.2); } catch(err) {}
        g.fillStyle='#20301c'; g.font='700 15px sans-serif'; g.textAlign='center';
        g.fillText(sp.name + (sp.skill ? ' \\u2605' : ''), x, y+68);
        g.textAlign='left';
      }
    }
    return { ok:true, count:list.length, W:W, H:H };
  })()`);
  console.log('rendered: ' + JSON.stringify(res));

  // 截「遊戲 canvas」這個元素
  const box = await page.eval(`(function(){
    var cv = document.getElementById('cv');
    var r = cv.getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
  })()`);
  const shot = await page.send('Page.captureScreenshot', {
    format: 'png', clip: { x: box.x, y: box.y, width: box.w, height: box.h, scale: 1 }
  });
  fs.writeFileSync(path.join(OUT, 'monsters-20.png'), Buffer.from(shot.data, 'base64'));
  console.log('saved monsters-20.png');

  await br.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
