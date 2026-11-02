// test/shot69-v413-monsters.js — 用真實瀏覽器截 20 隻小怪（保證是真的遊戲繪製）
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');

const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const OUT = path.join(__dirname, '_v413');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const br = await launch({ w: 1100, h: 700, port: 9371 });
  const page = await br.newPage();
  await page.goto(URL, 1500);

  // 在頁面裡畫一張「20 隻小怪」的圖（用遊戲自己的 drawEnemyArt）
  const res = await page.eval(`(function(){
    var P = window.__BH;
    var out = document.createElement('div');
    out.id = 'monsterSheet';
    out.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#8fc98a;padding:14px;';
    var cv = document.createElement('canvas');
    cv.width = 1080; cv.height = 620;
    cv.style.cssText = 'display:block;width:1080px;height:620px;';
    out.appendChild(cv);
    document.body.appendChild(out);
    var g = cv.getContext('2d');
    // 草地
    g.fillStyle = '#8fc98a'; g.fillRect(0,0,1080,620);
    g.fillStyle = 'rgba(60,90,55,.28)';
    for (var i=0;i<150;i++) g.fillRect((i*97)%1080,(i*53)%620,2,2);
    // 標題
    g.fillStyle = '#20301c'; g.font = '700 20px sans-serif';
    g.fillText('v4.13  20 \u55ae\u5c0f\u602a\uff08\u2605 = \u6709\u6280\u80fd\uff09', 18, 30);
    g.font = '13px sans-serif';
    g.fillText('\u65b0 10 \u55ae\uff1a\u6469\u5f39\u602a / \u62c6\u5f39\u602a / \u653e\u5f39\u602a / \u8c93\u718a / \u4f01\u9e5d / \u7ae0\u9c7c / \u6a5f\u5668\u4eba / \u5c0f\u5deb\u5e2b / \u9b3c\u706b / \u5927\u9ec4\u8702', 18, 52);
    // 逐隻畫（用遊戲真正的繪製）
    var list = P.ENEMY_SPECIES;
    for (var r=0;r<2;r++) {
      for (var c=0;c<10;c++) {
        var sp = list[r*10+c]; if (!sp) continue;
        var x = 54 + c*104, y = 148 + r*238;
        // 影子
        g.fillStyle='rgba(0,0,0,.22)';
        g.beginPath(); g.ellipse(x,y+40,25,8,0,0,6.283); g.fill();
        var e = { type:sp.id, spec:sp.id, color:sp.color, color2:sp.color2, r:sp.r,
                  kind:sp.kind, wing:sp.wing, walkT:1.2, vx:1, dirName:'right', bobP:0.3 };
        try { P.drawEnemyArt(e, x, y, false, 1.2); } catch(err) {}
        // 名稱
        g.fillStyle='#20301c'; g.font='700 12px sans-serif'; g.textAlign='center';
        g.fillText(sp.name + (sp.skill ? ' \\u2605' : ''), x, y+62);
        g.textAlign='left';
      }
    }
    return { ok:true, count:list.length };
  })()`);
  console.log('rendered: ' + JSON.stringify(res));

  await sleep(500);
  await page.shot(path.join(OUT, 'monsters-20.png'));
  console.log('saved monsters-20.png');

  await br.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
