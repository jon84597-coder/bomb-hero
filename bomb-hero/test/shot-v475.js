const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');
const URL = 'file:///' + path.join(__dirname, '../index.html').replace(/\\/g, '/');
const OUT = path.join(__dirname, '_v475');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await launch({ w: 390, h: 800 });
  const p = await b.newPage();
  await p.goto(URL, 2000);
  for (let i = 0; i < 40; i++) { if (await p.eval('typeof __BH') === 'object') break; await sleep(300); }
  await p.eval("try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}; __BH.settings.ctrl='touch'; __BH.applyCtrl(); 1");

  // 1) 入口卡
  await p.eval("(function(){var b=document.getElementById('btnBR'); if(b) b.click(); return 1;})()");
  await sleep(600);
  await p.shot(path.join(OUT, 'card.png'));

  // 2) 選 50 人 / 4 人組隊 / 5 分鐘
  await p.eval(`(function(){
    var ov = document.getElementById('brOv');
    var pick = function (k, v) {
      var seg = ov.querySelector('.brseg[data-k="' + k + '"]');
      var bs = seg.querySelectorAll('b');
      for (var i = 0; i < bs.length; i++) if (+bs[i].dataset.v === v) bs[i].click();
    };
    pick('n', 50); pick('team', 4); pick('dur', 5);
    return 1;
  })()`);
  await sleep(500);
  await p.shot(path.join(OUT, 'card-pick.png'));

  // 3) 出發（50 人 / 4 人隊 / 5 分鐘）
  const st = await p.eval(`(function(){
    document.getElementById('brGo').click();
    var G = __BH.Game;
    return JSON.stringify({n: G.players.length, teamsOn: G.teamsOn, ph: __BH.BR.PH.length,
      team0: G.players.filter(function(q){return q.team===0;}).length});
  })()`);
  console.log('start', st);
  await sleep(1400);
  const r1 = await p.eval(`(function(){ var G=__BH.Game;
    var ov=document.getElementById('ovIn'); if(ov) ov.classList.add('hide');
    G.state='play'; G.countdown=0; G.zoom=G.zoomTarget=1; G.camSnap=true;
    for (var i=0;i<180;i++){ try{__BH.updateBR(1/60);}catch(e){} }
    try{__BH.updateCamera(1);}catch(e){}
    try{__BH.render();}catch(e){}
    return JSON.stringify({alive:G.brAlive, tips:document.querySelectorAll('#brTips .btip').length});
  })()`);
  console.log('play', r1);
  await sleep(300);
  await p.shot(path.join(OUT, 'play50.png'));

  // 4) 提示：縮圈 + 淘汰 + 受傷
  await p.eval(`(function(){
    __BH.brTip('🌀','毒圈收縮 · 半徑 18 格','warn',9);
    __BH.brTip('☠️','AI·7 出局 · 剩 41 人','',9);
    __BH.brTip('💔','受到傷害 · 剩 3 點血','bad',9);
    try{__BH.render();}catch(e){}
    return 1;
  })()`);
  await sleep(500);
  await p.shot(path.join(OUT, 'tips.png'));

  // 5) 50 人跑 60 秒的幀時間
  const perf = await p.eval(`(function(){ var G=__BH.Game;
    G.state='play';
    var t0=Date.now();
    for (var i=0;i<600;i++){ try{__BH.updateBR(1/60);}catch(e){} }
    var t1=Date.now();
    for (var k=0;k<60;k++){ try{__BH.render();}catch(e){} }
    var t2=Date.now();
    return JSON.stringify({update60fps_ms:+((t1-t0)/600).toFixed(2), render_ms:+((t2-t1)/60).toFixed(2), alive:G.brAlive});
  })()`);
  console.log('perf', perf);
  b.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
