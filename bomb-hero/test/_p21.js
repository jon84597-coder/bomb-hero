// 換語言時有沒有 JS 錯誤（含遊戲中、RPG 配點、商店、說明頁）
const { launch, sleep } = require('./cdp');
const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
(async () => {
  const cdp = await launch({ port: 9496, w: 900, h: 430 });
  const p = await cdp.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.send('Emulation.setUserAgentOverride', { userAgent: UA, platform: 'Android' });
  await p.resize(900, 430, true);
  await p.goto('http://127.0.0.1:3111/index.html', 2400);
  await p.eval(`(function(){
    window.__errs=[];
    window.addEventListener('error', function(e){ window.__errs.push('ERR ' + (e.message||'') + ' @' + (e.filename||'').split('/').pop() + ':' + e.lineno); });
    window.addEventListener('unhandledrejection', function(e){ window.__errs.push('REJ ' + (e.reason && e.reason.message || e.reason)); });
    try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}
    var r=document.getElementById('rotHint'); if(r&&r.parentNode) r.parentNode.removeChild(r);
    __BH.settings.mapMode='classic';
  })()`);
  // 先逛一圈各頁
  for (const s of ['solo','rpg','settings','shop','learn','daily','char','title']) {
    await p.eval(`(function(){ try{ __BH.Screen.show('${s}'); }catch(e){} })()`);
    await sleep(260);
  }
  // 進 RPG 配點頁按幾下配點（讓 renderStats 跑過）
  await p.eval(`(function(){ try{ __BH.Screen.show('rpg'); }catch(e){} })()`);
  await sleep(400);
  // 換語言 5 次（含遊戲中）
  for (const lang of ['en','ja','ko','zh-CN','zh-TW']) {
    await p.eval(`(function(){ try{ __BH.setLang('${lang}'); }catch(e){ window.__errs.push('setLang:'+e.message); } })()`);
    await sleep(300);
  }
  // 遊戲中換語言
  await p.eval(`(function(){ try{ __BH.startSolo(1); }catch(e){} })()`);
  await sleep(1200);
  for (const lang of ['en','ja','ko','zh-TW']) {
    await p.eval(`(function(){ try{ __BH.setLang('${lang}'); }catch(e){ window.__errs.push('setLang2:'+e.message); } })()`);
    await sleep(320);
  }
  console.log('錯誤:', await p.eval('JSON.stringify(window.__errs)'));
  console.log('狀態:', await p.eval(`(function(){ return JSON.stringify({ lang: document.documentElement.lang, inGame: !!document.querySelector('#scr-game.on'), sc: (__BH.Screen.current||'') }); })()`));
  cdp.close();
})().catch(e => { console.error(e); process.exit(2); });
