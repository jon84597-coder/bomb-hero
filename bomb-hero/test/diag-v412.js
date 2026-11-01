// test/diag-v412.js — v4.12 問題診斷（用真實瀏覽器量測）
//   D1. 手機直放 → 轉橫：畫面是否變巨大、能否拖曳、canvas 尺寸是否正確
//   D2. 觸控三顆按鈕（放彈／遙控／吐火）實際算繪出什麼（黑底從哪來）
//   D3. 全螢幕 API 在此瀏覽器是否可用
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');

const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const OUT = path.join(__dirname, '_v412');
fs.mkdirSync(OUT, { recursive: true });

function head(t) { console.log('\n=== ' + t + ' ==='); }

(async () => {
  const br = await launch({ w: 390, h: 844, port: 9345 });
  const page = await br.newPage();

  // ---------------------------------------------------------------
  head('D2. 觸控按鈕實際算繪（黑底來源）');
  await page.resize(390, 844, true);
  await page.goto(URL + '?touch=1', 1500);
  // 進遊戲
  await page.eval(`(function(){ try { __BH.startSolo(1,false); __BH.Game.state='play'; } catch(e){ return 'ERR '+e.message; } return 'ok'; })()`);
  await sleep(600);

  const btnInfo = await page.eval(`(function(){
    var out = [];
    ['.tact','.tdet','.tfire','.tpause','.tfs'].forEach(function(sel){
      var el = document.querySelector(sel);
      if (!el) { out.push(sel+': MISSING'); return; }
      var cs = getComputedStyle(el);
      var r = el.getBoundingClientRect();
      var icon = el.querySelector('.ticon');
      out.push({
        sel: sel, w: Math.round(r.width), h: Math.round(r.height),
        bgImage: cs.backgroundImage.slice(0, 90),
        bgColor: cs.backgroundColor,
        radius: cs.borderRadius,
        face: cs.getPropertyValue('--tb-face').trim(),
        ring: cs.getPropertyValue('--tb-ring').trim(),
        iconW: icon ? Math.round(icon.getBoundingClientRect().width) : -1,
        iconH: icon ? Math.round(icon.getBoundingClientRect().height) : -1,
        iconAttr: icon ? (icon.width + 'x' + icon.height) : '-'
      });
    });
    return out;
  })()`);
  btnInfo.forEach(function (b) {
    if (typeof b === 'string') { console.log('  ' + b); return; }
    console.log('  ' + b.sel + ' size=' + b.w + 'x' + b.h + ' radius=' + b.radius);
    console.log('      --tb-face=' + b.face + '  --tb-ring=' + b.ring);
    console.log('      bgColor=' + b.bgColor);
    console.log('      bgImage=' + b.bgImage);
    console.log('      icon=' + b.iconW + 'x' + b.iconH + ' (attr ' + b.iconAttr + ')');
  });

  // 實際截圖看按鈕
  await page.shot(path.join(OUT, 'D2-buttons-portrait.png'));
  console.log('  saved D2-buttons-portrait.png');

  // ---------------------------------------------------------------
  head('D1. 直放 → 轉橫（模擬 LINE WebView 旋轉）');
  const probe = `(function(){
    var de = document.documentElement, cv = document.getElementById('cv');
    var r = cv.getBoundingClientRect();
    var wrap = document.querySelector('.wrap.game');
    var wr = wrap ? wrap.getBoundingClientRect() : null;
    var sw = document.querySelector('#stageWrap');
    var sr = sw ? sw.getBoundingClientRect() : null;
    return {
      innerW: window.innerWidth, innerH: window.innerHeight,
      clientW: de.clientWidth, clientH: de.clientHeight,
      scrollW: de.scrollWidth, scrollH: de.scrollHeight,
      cvCss: Math.round(r.width) + 'x' + Math.round(r.height),
      cvAttr: cv.width + 'x' + cv.height,
      wrapCss: wr ? Math.round(wr.width) + 'x' + Math.round(wr.height) : '-',
      stageCss: sr ? Math.round(sr.width) + 'x' + Math.round(sr.height) : '-',
      bodyCls: document.body.className,
      bodyH: Math.round(document.body.getBoundingClientRect().height),
      overflowX: de.scrollWidth - de.clientWidth,
      gameT: __BH.Game ? __BH.Game.T : -1,
      view: __BH.viewInfo ? JSON.stringify(__BH.viewInfo()) : '-'
    };
  })()`;
  console.log('  --- 直放 390x844 ---');
  const p1 = await page.eval(probe);
  console.log('    ' + JSON.stringify(p1));

  // 旋轉成橫向
  await page.resize(844, 390, true);
  await sleep(900);
  console.log('  --- 轉橫 844x390（旋轉後 900ms）---');
  const p2 = await page.eval(probe);
  console.log('    ' + JSON.stringify(p2));
  await page.shot(path.join(OUT, 'D1-landscape.png'));
  console.log('  saved D1-landscape.png');

  // 再等久一點（有些 WebView 旋轉後要更久才重算）
  await sleep(1800);
  const p3 = await page.eval(probe);
  console.log('  --- 轉橫後 2.7s ---');
  console.log('    ' + JSON.stringify(p3));

  // ---------------------------------------------------------------
  head('D3. 全螢幕 API 可用性');
  const fs2 = await page.eval(`(function(){
    var el = document.documentElement;
    return {
      hasRequestFS: typeof el.requestFullscreen === 'function',
      hasWebkitRequestFS: typeof el.webkitRequestFullscreen === 'function',
      hasExitFS: typeof document.exitFullscreen === 'function',
      hasWebkitExitFS: typeof document.webkitExitFullscreen === 'function',
      hasFSEl: 'fullscreenEnabled' in document,
      fsEnabled: document.fullscreenEnabled,
      hasDisplayMode: !!(window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches),
      canEnterImmersive: typeof __BH.enterImmersive === 'function'
    };
  })()`);
  console.log('  ' + JSON.stringify(fs2));

  // 實際點全螢幕鈕，看會不會失敗
  const fsRes = await page.eval(`(function(){
    return new Promise(function(res){
      var el = document.documentElement;
      if (!el.requestFullscreen) { res('no requestFullscreen'); return; }
      try {
        var pr = el.requestFullscreen({ navigationUI: 'hide' });
        if (pr && pr.then) {
          pr.then(function(){ res('OK, fullscreenElement=' + !!document.fullscreenElement); })
             .catch(function(e){ res('REJECTED: ' + e.name + ' - ' + e.message); });
        } else res('no promise');
      } catch (e) { res('THREW: ' + e.name + ' - ' + e.message); }
      setTimeout(function(){ res('TIMEOUT (no resolution)'); }, 3000);
    });
  })()`);
  console.log('  requestFullscreen → ' + fsRes);

  // ---------------------------------------------------------------
  head('D4. 使用者情境：從 LINE 開啟（?stage 直接進關）+ 立即旋轉');
  await page.resize(390, 844, true);
  await page.goto(URL + '?touch=1&stage=2&auto=1', 1800);
  await sleep(500);
  const s1 = await page.eval(probe);
  console.log('  直放: ' + JSON.stringify(s1));
  await page.resize(844, 390, true);
  await sleep(1000);
  const s2 = await page.eval(probe);
  console.log('  轉橫: ' + JSON.stringify(s2));
  await page.shot(path.join(OUT, 'D4-stage-rotate.png'));

  await br.close();
  console.log('\n輸出：' + OUT);
})().catch(function (e) { console.error('FAILED', e); process.exit(1); });
