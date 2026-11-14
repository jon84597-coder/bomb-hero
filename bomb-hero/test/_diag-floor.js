const { launch, sleep } = require('./cdp');
(async () => {
  const br = await launch({ w: 1100, h: 900, port: 9431 });
  const page = await br.newPage();
  await page.goto('http://127.0.0.1:3122/?t=' + Date.now(), 2600);
  await page.eval(`(function(){
    var B=window.__BH;
    B.settings.size='M'; B.settings.ctrl='kb'; B.settings.sd='off';
    B.startSolo(1,false);
    var G=B.Game; G.state='play'; G.countdown=0; G.paused=false;
    try{B.hideOverlay&&B.hideOverlay();}catch(e){}
    var all=document.querySelectorAll('div');
    for(var i=0;i<all.length;i++){var e=all[i];if(e.offsetParent===null)continue;var r=e.getBoundingClientRect();
      if(r.width>innerWidth*.8&&r.height>innerHeight*.6){var bg=getComputedStyle(e).backgroundColor||'';
        if(bg&&bg!=='rgba(0, 0, 0, 0)'&&bg!=='transparent'){e.style.display='none';}}}
    return 1;})()`);
  await sleep(900);
  console.log(await page.eval(`(function(){
    var B=window.__BH,G=B.Game;
    var cv=document.querySelector('canvas');
    var g=cv.getContext('2d');
    // 找一片純地板區（用 Game.grid 找連續空地）
    var T=G.T, best=null;
    for(var y=1;y<G.rows-2;y++){for(var x=1;x<G.cols-2;x++){
      var ok=true; for(var dy=0;dy<2;dy++)for(var dx=0;dx<2;dx++) if(G.grid[y+dy][x+dx]) ok=false;
      if(ok){best=[x,y];break;}} if(best)break;}
    var d=g.getImageData(Math.round(best[0]*T+T*0.5), Math.round(best[1]*T+T*0.5),1,1).data;
    var th=G.theme||{};
    return JSON.stringify({cell:best, floorPx:[d[0],d[1],d[2],d[3]], themeFloor:th.floor, themeFloor2:th.floor2, style:th.style, T:T});
  })()`));
  await page.shot(__dirname + '/_diag-floor.png');
  await br.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
