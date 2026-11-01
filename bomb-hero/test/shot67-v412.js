// test/shot67-v412.js — v4.12 視覺目檢：功能鍵黑底移除 + 旋轉後版面
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');

const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const OUT = path.join(__dirname, '_v412');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const br = await launch({ w: 390, h: 844, port: 9351 });
  const page = await br.newPage();

  // --- 直放：按鈕（把旋轉提示移掉，避免整頁被蒙版蓋住） ---
  await page.resize(390, 844, true);
  await page.goto(URL + '?touch=1&stage=2&auto=1', 1900);
  await sleep(700);
  await page.eval(`(function(){ try{ var h=document.getElementById('rotHint'); if(h&&h.remove) h.remove(); }catch(e){} return 1; })()`);
  await sleep(250);

  // 只截右下的按鈕區
  const clip = await page.eval(`(function(){
    var b=document.querySelector('.tact'); var r=b.getBoundingClientRect();
    return { x: Math.max(0,Math.round(r.left)-16), y: Math.max(0,Math.round(r.top)-16),
             width: Math.round(r.width)+32, height: Math.round(r.height)+32 };
  })()`);
  let r = await page.send('Page.captureScreenshot', { format: 'png', clip: { ...clip, scale: 3 } });
  fs.writeFileSync(path.join(OUT, 'E-btn-transparent.png'), Buffer.from(r.data, 'base64'));
  console.log('saved E-btn-transparent.png (3x)');

  // 全畫面（直放）
  await page.shot(path.join(OUT, 'E-portrait.png'));
  console.log('saved E-portrait.png');

  // --- 轉橫 ---
  await page.resize(844, 390, true);
  await sleep(1400);
  const probe = await page.eval(`(function(){
    var de=document.documentElement, cv=document.getElementById('cv');
    var rr=cv.getBoundingClientRect();
    var cs=getComputedStyle(document.querySelector('.wrap.game'));
    return {
      win: window.innerWidth+'x'+window.innerHeight,
      cv: Math.round(rr.width)+'x'+Math.round(rr.height),
      vvhVar: getComputedStyle(de).getPropertyValue('--vvh').trim(),
      wrapH: cs.height, wrapMaxH: cs.maxHeight,
      overflowX: de.scrollWidth - de.clientWidth,
      overflowY: de.scrollHeight - de.clientHeight,
      bodyH: Math.round(document.body.getBoundingClientRect().height),
      gameT: __BH.Game.T
    };
  })()`);
  console.log('轉橫後：' + JSON.stringify(probe));
  await page.shot(path.join(OUT, 'E-landscape.png'));
  console.log('saved E-landscape.png');

  // --- 偽全螢幕 ---
  const fsRes = await page.eval(`(function(){
    try { __BH.setPseudoFull(true); } catch(e){ return 'ERR '+e.message; }
    return 'pseudo-full=' + document.body.classList.contains('pseudo-full');
  })()`);
  console.log('偽全螢幕：' + fsRes);
  await sleep(500);
  await page.shot(path.join(OUT, 'E-pseudo-full.png'));
  console.log('saved E-pseudo-full.png');

  await br.close();
  console.log('\n輸出：' + OUT);
})().catch(function (e) { console.error('FAILED', e); process.exit(1); });
