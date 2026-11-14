const { launch, sleep } = require('./cdp');
(async () => {
  const br = await launch({ w: 1100, h: 900, port: 9433 });
  const page = await br.newPage();
  await page.goto('http://127.0.0.1:3122/?t=' + Date.now(), 2600);
  await page.eval(`(function(){
    var B=window.__BH; B.settings.size='M'; B.settings.ctrl='kb'; B.settings.sd='off';
    B.startSolo(1,false);
    var G=B.Game; G.state='play'; G.countdown=0; G.paused=false;
    try{B.hideOverlay&&B.hideOverlay();}catch(e){}
    var all=document.querySelectorAll('div');
    for(var i=0;i<all.length;i++){var e=all[i];if(e.offsetParent===null)continue;var r=e.getBoundingClientRect();
      if(r.width>innerWidth*.8&&r.height>innerHeight*.6){var bg=getComputedStyle(e).backgroundColor||'';
        if(bg&&bg!=='rgba(0, 0, 0, 0)'&&bg!=='transparent'){e.style.display='none';}}}
    // 換成冰雪主題（地板 #eef5fa 近白）—— 若地板真的不透明，畫面會變白
    G.theme = B.THEMES[2];
    if (B.floorChunkDirty) B.floorChunkDirty(null);
    return 1;})()`);
  await sleep(1200);
  await page.shot(__dirname + '/_diag-floor-ice.png');
  await br.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
