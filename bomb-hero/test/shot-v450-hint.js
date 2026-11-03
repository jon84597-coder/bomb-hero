// v4.50：教學提示「點開」＋手機捏合縮放手勢 —— 三種版面截圖與尺寸量測
//   node test/shot-v450-hint.js          本機
//   BH_URL=... node test/shot-v450-hint.js   打線上
const path = require('path');
const { launch, sleep } = require('./cdp');
const URL = process.env.BH_URL || ('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
const OUT = path.join(__dirname, '_v450');

let pass = 0, fail = 0;
function ok(c, n, extra) {
  if (c) { pass++; console.log('  ✓ ' + n); }
  else { fail++; console.log('  ✗ FAIL: ' + n + (extra ? ' :: ' + extra : '')); }
}

async function run(port, W, H, mobile, label) {
  const b = await launch({ port, w: W, h: H });
  const p = await b.newPage();
  await p.send('Emulation.setDeviceMetricsOverride', {
    width: W, height: H, deviceScaleFactor: mobile ? 2 : 1, mobile: !!mobile
  });
  if (mobile) await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.goto(URL, mobile ? 2600 : 2800);
  await p.eval("try{localStorage.setItem('bombhero-rotskip','1');localStorage.removeItem('bombhero-zoomtip');}catch(e){}");
  if (mobile) {
    await p.eval("(function(){var B=window.__BH;B.settings.ctrl='touch';B.applyCtrl();document.body.classList.add('touch');})()");
    await sleep(400);
  }

  // ---- A. 教學第 2 步（窄條 / 完整卡）----
  await p.eval("window.__BH.Tut.startPlay()");
  await sleep(900);
  await p.eval("window.__BH.Tut._next()");
  await sleep(800);
  const a = await p.eval(`(function(){
    var c=document.getElementById('tutCard'), r=c.getBoundingClientRect();
    var tp=document.getElementById('tutMiniTap');
    var tap=c.querySelector('#tutMini .tap');
    return JSON.stringify({mini:c.classList.contains('mini'),peek:c.classList.contains('peek'),
      rect:[Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)],
      tapText:tp?tp.textContent:null, tapAnim:tap?getComputedStyle(tap).animationName:null});})()`);
  const A = JSON.parse(a);
  console.log('[' + label + '] 第 2 步:', a);

  if (mobile) {
    ok(A.mini === true, label + '：手機第 2 步收成窄條');
    ok(A.rect[3] <= 56, label + '：窄條高度 ≤56px（不吃畫面）', A.rect[3]);
    ok(A.tapText === '點開', label + '：右端有「點開」文案', A.tapText);
    ok(A.tapAnim === 'tapPulse', label + '：手指徽章在脈動');
    ok(A.peek === true, label + '：第一次收窄條有 peek 提醒動畫');
  } else {
    ok(A.mini === false, label + '：桌機不觸發窄條（永遠完整卡）');
    ok(A.rect[3] > 120, label + '：桌機卡片是完整高度', A.rect[3]);
  }
  await p.shot(path.join(OUT, label + '-mini.png'));

  // ---- B. 點窄條展開 →「收起」----
  if (mobile) {
    await p.eval("document.getElementById('tutMini').click()");
    await sleep(600);
    const e = await p.eval(`(function(){
      var f=document.getElementById('tutFoldTxt');
      var c=document.getElementById('tutCard'), r=c.getBoundingClientRect();
      var tp=document.getElementById('tpad'), tb=document.querySelector('#touchUI .tact,#touchUI .bomb');
      var pr=tp?tp.getBoundingClientRect():null, br=tb?tb.getBoundingClientRect():null;
      return JSON.stringify({fold:f?f.textContent:null, mini:c.classList.contains('mini'),
        rect:[Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)],
        padTop: pr?Math.round(pr.top):null, bombTop: br?Math.round(br.top):null});})()`);
    const E = JSON.parse(e);
    console.log('[' + label + '] 展開:', e);
    ok(E.fold === '收起', label + '：展開卡右上寫「收起」');
    await p.shot(path.join(OUT, label + '-fold.png'));
  }

  // ---- C. 手勢提示（真正開打後）----
  await p.eval("window.__BH.Tut._close && window.__BH.Tut._close()");
  await sleep(300);
  await p.eval("(function(){var B=window.__BH;B.Screen.show('title');B.startSolo(1);})()");
  await sleep(1100);
  await p.eval("var b=document.querySelector('.overlay-in .mbtn'); if(b)b.click();");
  await sleep(4700);
  const z = await p.eval(`(function(){
    var h=document.getElementById('zoomHint'), r=h.getBoundingClientRect();
    var g=document.querySelector('#zoomPill .zh');
    return JSON.stringify({cls:h.className, rect:[Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)],
      txt:(document.getElementById('zhTxt')||{}).textContent,
      sub:(document.getElementById('zhSub')||{}).textContent,
      pillZh:g?getComputedStyle(g).display:null});})()`);
  const Z = JSON.parse(z);
  console.log('[' + label + '] 手勢提示:', z);

  if (mobile) {
    ok(Z.cls === 'on', label + '：手機開打後彈出捏合提示');
    ok(Z.txt === '兩指捏合縮放', label + '：提示文字正確');
    ok(Z.rect[2] > 0 && Z.rect[3] > 0, label + '：提示卡有實際尺寸');
    ok(Z.rect[0] >= 0 && Z.rect[0] + Z.rect[2] <= W, label + '：提示卡沒有超出螢幕左右邊界');
    ok(Z.pillZh === 'block', label + '：縮放百分比旁的手勢小圖有顯示');
  } else {
    ok(Z.cls === '', label + '：桌機不彈捏合提示（桌機用滾輪／按鍵）');
    ok(Z.pillZh === 'none', label + '：桌機不顯示手勢小圖');
  }
  await p.shot(path.join(OUT, label + '-zoom.png'));

  const errs = await p.eval("(window.__BHB&&window.__BHB.errs||[]).length");
  ok(errs === 0, label + '：沒有 JS 錯誤', errs);
  b.close();
}

(async () => {
  console.log('URL:', URL);
  console.log('\n=== 手機直放 390×844 ===');
  await run(9741, 390, 844, true, 'portrait');
  console.log('\n=== 手機橫放 844×390 ===');
  await run(9742, 844, 390, true, 'landscape');
  console.log('\n=== 桌機 1280×900 ===');
  await run(9743, 1280, 900, false, 'desktop');
  console.log('\n========================================');
  console.log('通過 ' + pass + ' / 失敗 ' + fail);
  process.exit(fail ? 1 : 0);
})();
