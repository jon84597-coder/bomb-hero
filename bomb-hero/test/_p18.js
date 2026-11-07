// test/_p18.js — v5.54 真瀏覽器驗收：
//   ① 三種尺寸的 HUD 讓位（計時器有沒有被右上工具列壓到）
//   ② 矮視窗開場卡的「出發！」是否完整可見
//   ③ 縮放提示會不會蓋住結算卡
//   ④ 語言切換後各頁殘留（截圖）
const fs = require('fs');
const path = require('path');
const { launch, sleep } = require('./cdp');
const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const OUT = path.join(__dirname, '_audit');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const cdp = await launch({ port: 9490, w: 900, h: 430 });
  const p = await cdp.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.send('Emulation.setUserAgentOverride', { userAgent: UA, platform: 'Android' });

  const SIZES = [[844, 390], [900, 430], [1024, 600], [430, 932]];
  for (const [w, h] of SIZES) {
    await p.resize(w, h, true);
    await p.goto('http://127.0.0.1:3111/index.html', 2200);
    await p.eval(`(function(){try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}var r=document.getElementById('rotHint');if(r&&r.parentNode)r.parentNode.removeChild(r);__BH.settings.mapMode='classic';})()`);
    // 進第一關
    await p.eval(`(function(){ try{ __BH.startSolo(1); }catch(e){} })()`);
    await sleep(1400);
    const r = await p.eval(`(function(){
      var t = document.getElementById('gameTime') || document.querySelector('#gameTop .tm, #gameTop time');
      var bar = document.getElementById('navBar');
      var de = document.documentElement;
      var top = document.getElementById('gameTop');
      if (!top) return JSON.stringify({ err: 'no gameTop' });
      var btns = bar ? bar.querySelectorAll('button, a') : [];
      var minL = 1e9;
      for (var i = 0; i < btns.length; i++) {
        var b = btns[i].getBoundingClientRect();
        if (b.width < 2 || b.height < 2) continue;
        if (b.left < minL) minL = b.left;
      }
      var tt = t ? t.getBoundingClientRect() : null;
      return JSON.stringify({
        navreserve: de.style.getPropertyValue('--navreserve'),
        timerRight: tt ? Math.round(tt.right) : null,
        timerText: t ? t.textContent.trim() : null,
        minBtnLeft: minL === 1e9 ? null : Math.round(minL),
        overlap: (tt && minL < 1e9) ? Math.round(tt.right - minL) : null,
        topH: Math.round(top.getBoundingClientRect().height)
      });
    })()`);
    console.log(w + 'x' + h + ' → ' + r);
  }

  // 矮視窗開場卡
  await p.resize(900, 430, true);
  await p.goto('http://127.0.0.1:3111/index.html', 2200);
  await p.eval(`(function(){try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}var r=document.getElementById('rotHint');if(r&&r.parentNode)r.parentNode.removeChild(r);})()`);
  await p.eval(`(function(){ try{ __BH.startSolo(1); }catch(e){} })()`);
  await sleep(1500);
  console.log('開場卡: ' + await p.eval(`(function(){
    var ov = document.getElementById('ovIn'), b = document.querySelector('#ovIn .mbtn'), box = document.querySelector('#ovIn .ov-box');
    if (!ov || !b) return 'no ov';
    var r1 = ov.getBoundingClientRect(), r2 = b.getBoundingClientRect(), r3 = box ? box.getBoundingClientRect() : null;
    return JSON.stringify({ ovTop: Math.round(r1.top), ovBottom: Math.round(r1.bottom), btnTop: Math.round(r2.top), btnBottom: Math.round(r2.bottom), boxH: r3 ? Math.round(r3.height) : null, visible: r2.bottom <= r1.bottom + 1 && r2.top >= r1.top - 1 });
  })()`));

  // 結算卡 vs 縮放提示
  console.log('縮放提示: ' + await p.eval(`(function(){
    var ov = document.getElementById('ovIn'), zh = document.getElementById('zoomHint');
    var cs = zh ? getComputedStyle(zh) : null;
    return JSON.stringify({ zOv: ov ? getComputedStyle(ov).zIndex : null, zZh: cs ? cs.zIndex : null, zhOn: zh ? zh.classList.contains('on') : null });
  })()`));

  // 語言切換後各頁截圖
  for (const lang of ['en', 'ja', 'ko']) {
    await p.eval(`(function(){ try{ localStorage.setItem('bombhero-lang','${lang}'); location.reload(); }catch(e){} })()`);
    await sleep(2400);
    await p.eval(`(function(){try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}var r=document.getElementById('rotHint');if(r&&r.parentNode)r.parentNode.removeChild(r);})()`);
    const cur = await p.eval('document.documentElement.lang');
    for (const s of ['shop', 'settings']) {
      await p.eval(`(function(){ try{ __BH.Screen.show('${s}'); }catch(e){} })()`);
      await sleep(500);
      await p.shot(OUT + s + '-' + lang + '.png');
    }
    console.log(lang + ' 截圖完成 lang=' + cur);
  }
  cdp.close();
})().catch(e => { console.error(e); process.exit(2); });
