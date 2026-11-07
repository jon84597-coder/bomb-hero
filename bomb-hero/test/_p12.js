const { launch, sleep } = require('./cdp');
const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
(async () => {
  const cdp = await launch({ port: 9459, w: 900, h: 430 });
  const p = await cdp.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.send('Emulation.setUserAgentOverride', { userAgent: UA, platform: 'Android' });
  await p.resize(900, 430, true);
  await p.send('Page.addScriptToEvaluateOnNewDocument', { source: `(function(){window.__PROBE={errs:[]};window.addEventListener('error',function(e){window.__PROBE.errs.push({t:'e',m:String(e.message||''),s:String((e.error&&e.error.stack)||'').split('\\n').slice(0,3).join(' | ').slice(0,240)});},true);window.addEventListener('unhandledrejection',function(e){var r=e.reason;window.__PROBE.errs.push({t:'r',m:String((r&&r.message)||r).slice(0,200)});});})();` });
  await p.goto('http://127.0.0.1:3111/index.html', 2400);
  await p.eval(`(function(){try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}var r=document.getElementById('rotHint');if(r&&r.parentNode)r.parentNode.removeChild(r);__BH.settings.mapMode='classic';})()`);

  // ---- 過關流程 ----
  await p.eval(`__BH.startSolo(3)`); await sleep(600);
  await p.eval(`(function(){var b=document.querySelector('#ovBox button'); if(b)b.click();})()`);
  await sleep(3400);
  // 殺光怪、開門、把玩家送到門上
  const moved = await p.eval(`(function(){
    var G=__BH.Game, me=G.players[0];
    G.enemies.forEach(function(e){ e.dead=true; });
    if (!G.door) return 'no door';
    G.door.open = true;
    me.x = (G.door.x + .5) * G.T; me.y = (G.door.y + .5) * G.T;
    me.tx = null; me.ty = null;
    return 'ok';
  })()`);
  console.log('送進門:', moved);
  await sleep(2600);
  await p.shot(__dirname + '/_audit/win-1.png');
  console.log('過關後:', await p.eval(`JSON.stringify({ state: __BH.Game.state, ov: (function(){var o=document.getElementById('ovIn'); return o? !o.classList.contains('hide'):null;})(), title: (document.querySelector('#ovBox h3')||{}).textContent, btns: [].map.call(document.querySelectorAll('#ovBox button'), function(b){return b.textContent.trim();}) })`));
  await sleep(1200);
  await p.shot(__dirname + '/_audit/win-2.png');

  // ---- 結算卡按鈕可點（下一關） ----
  const nb = await p.eval(`(function(){
    var bs=[].slice.call(document.querySelectorAll('#ovBox button'));
    if(!bs.length) return 'none';
    var txt = bs.map(function(b){return b.textContent.trim();}).join('/');
    bs[0].click();
    return txt;
  })()`);
  console.log('結算按鈕:', nb);
  await sleep(2000);
  console.log('按下去之後:', await p.eval(`JSON.stringify({ state:__BH.Game.state, stage:__BH.Game.stage, mode:__BH.Game.mode })`));
  await p.shot(__dirname + '/_audit/win-3.png');

  const e = await p.eval('JSON.stringify((window.__PROBE&&__PROBE.errs)||[])');
  console.log('錯誤:', e);
  cdp.close();
})().catch(e => { console.error(e); process.exit(2); });
