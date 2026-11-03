// v4.52：首頁按鈕改版前後對照（桌機 full / hover / active、手機直放）
// 用法：node shot-v452-home.js [tag]
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const URL = process.env.BH_URL || ('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
const OUT = path.join(__dirname, '_v452');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) { }
const TAG = process.argv[2] || 'x';

(async () => {
  const b = await launch({ port: 9621, w: 1280, h: 900 });
  try {
    // ---- 桌機 ----
    const p = await b.newPage();
    await p.goto(URL, 3200);
    for (let i = 0; i < 60; i++) {
      if (await p.eval('!!(window.__BH && window.__BH.Game)')) break;
      await sleep(300);
    }
    await sleep(700);
    await p.fullShot(path.join(OUT, 'home-desktop-full-' + TAG + '.png'));
    // 量按鈕幾何
    const geo = await p.eval(`(function(){
      var out=[];
      ['btnLearn','btnSolo','btnRpg','btnBoss','btnStore','btnAcctBig','btnBattle','btnOnline','btnHelp','btnSettings','btnQuit'].forEach(function(id){
        var el=document.getElementById(id); if(!el) return;
        var r=el.getBoundingClientRect(), cs=getComputedStyle(el);
        out.push({id:id,w:Math.round(r.width),h:Math.round(r.height),bg:cs.backgroundImage.slice(0,40),
          radius:cs.borderRadius,shadow:cs.boxShadow.slice(0,30),fs:cs.fontSize,color:cs.color});
      });
      return out;})()`);
    console.log('BTN-GEO', JSON.stringify(geo, null, 1));

    // hover 狀態
    const r0 = await p.eval(`(function(){var e=document.getElementById('btnSolo');var r=e.getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)};})()`);
    await p.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r0.x, y: r0.y, button: 'none' });
    await sleep(350);
    await p.shot(path.join(OUT, 'home-desktop-hover-' + TAG + '.png'));
    // 按下狀態
    await p.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r0.x, y: r0.y, button: 'left', clickCount: 1 });
    await sleep(180);
    await p.shot(path.join(OUT, 'home-desktop-active-' + TAG + '.png'));
    await p.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r0.x, y: r0.y, button: 'left', clickCount: 1 });
    await sleep(200);

    // ---- 手機直放（先回首頁，避免 hover 測試的點擊把畫面帶走）----
    await p.goto(URL, 2600);
    for (let i = 0; i < 40; i++) {
      if (await p.eval('!!(window.__BH && window.__BH.Game)')) break;
      await sleep(300);
    }
    await p.resize(390, 844, true);
    await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await p.eval("try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}");
    await p.eval("(function(){document.body.classList.add('touch');var BH=window.__BH;if(BH.settings)BH.settings.ctrl='touch';if(BH.applyCtrl)BH.applyCtrl();})()");
    await sleep(600);
    await p.eval("(function(){window.scrollTo(0,0);})()");
    await p.shot(path.join(OUT, 'home-phone-' + TAG + '.png'));
    await p.fullShot(path.join(OUT, 'home-phone-full-' + TAG + '.png'));
    const geo2 = await p.eval(`(function(){
      var e=document.getElementById('btnSolo'), r=e.getBoundingClientRect();
      return {solo:{w:Math.round(r.width),h:Math.round(r.height)},
        scrollH:document.documentElement.scrollHeight, innerH:window.innerHeight};})()`);
    console.log('PHONE', JSON.stringify(geo2));
    console.log('OK');
  } finally { b.close(); }
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
