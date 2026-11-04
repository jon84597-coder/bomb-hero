// 目檢：「我」的牌子在大逃殺裡也畫得出來（把玩家搬到地圖中心、鏡頭對準）
const { launch, sleep } = require('./cdp');
const path = require('path');
const URL = 'file:///' + path.join(__dirname, '../index.html').replace(/\\/g, '/');
const OUT = path.join(__dirname, '_v474');
(async () => {
  const b = await launch({ w: 390, h: 780 });
  const p = await b.newPage();
  await p.goto(URL);
  for (let i = 0; i < 40; i++) { if (await p.eval('typeof __BH') === 'object') break; await sleep(300); }
  await p.eval("try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}; __BH.settings.ctrl='touch'; __BH.applyCtrl(); 1");
  for (const zoom of [1, 0.42]) {
    const r = await p.eval(`(function(){
      var G=__BH.Game; __BH.startBR();
      var ov=document.getElementById('ovIn'); if(ov) ov.classList.add('hide');
      var o2=document.getElementById('brOv'); if(o2) o2.classList.add('hide');
      G.state='play';
      G.players.forEach(function(pp){pp.invuln=9999;});
      var me=G.players[0];
      me.x=(G.cols/2)*G.T; me.y=(G.rows/2)*G.T;
      G.zoom=G.zoomTarget=${zoom}; G.camSnap=true;
      for(var i=0;i<30;i++){ G.camSnap=(i===29); __BH.updateCamera(1/60); }
      ['rotHint','zoomHint'].forEach(function(id){var e=document.getElementById(id); if(e) e.remove();});
      ['banner','toast','hint'].forEach(function(id){var e=document.getElementById(id); if(e) e.style.display='none';});
      try{__BH.render();}catch(e){}
      var sx=(me.x+G.camX)*G.zoom, sy=(me.y+G.camY)*G.zoom;
      return JSON.stringify({T:+G.T.toFixed(1),zoom:G.zoom,sx:Math.round(sx),sy:Math.round(sy),alive:G.players.filter(function(q){return q.alive;}).length});
    })()`);
    console.log('zoom', zoom, r);
    await sleep(250);
    await p.shot(path.join(OUT, 'me-' + String(zoom).replace('.', '') + '.png'));
  }
  b.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
