// test/shot-v478.js — 目檢：別的 AI 扣血時畫面必須乾淨（舊版正中央會閃「♥ 9」）
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');
const URL = 'file:///' + path.join(__dirname, '../index.html').replace(/\\/g, '/');
const OUT = path.join(__dirname, '_v478');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

async function shot(b, name, prep, w, h, opt) {
  const p = await b.newPage();
  if (w) await p.send('Emulation.setDeviceMetricsOverride', { width: w, height: h || 800, deviceScaleFactor: 1, mobile: !!(opt && opt.mobile) });
  await p.goto(URL, 2000);
  for (let i = 0; i < 40; i++) { if (await p.eval('typeof __BH') === 'object') break; await sleep(300); }
  await p.eval("try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}; __BH.settings.ctrl='touch'; __BH.applyCtrl(); 1");
  if (prep) await p.eval(prep);
  await sleep(300);
  // 只收掉開場卡；banner 不碰（就是要看它有沒有冒出來）
  await p.eval("['zoomHint','hzHint','rotHint','ovIn','brOv','brEnd'].forEach(function(id){var e=document.getElementById(id); if(e){e.classList.add('hide'); e.style.display='none';}}); 1");
  await sleep(500);
  const banner = await p.eval("(function(){var b=document.getElementById('banner');return b?getComputedStyle(b).display+'|'+(document.getElementById('bannerTxt')||{}).textContent:'none';})()");
  const tips = await p.eval("(function(){var b=document.getElementById('brTips');return b?Array.prototype.map.call(b.children,function(c){return c.textContent;}).join(' / '):'(無)';})()");
  console.log(name + ' | banner=' + banner + ' | tips=' + tips);
  await p.shot(path.join(OUT, name + '.png'));
  return p;
}

(async () => {
  const b = await launch({ w: 1280, h: 800 });

  // 1) 連打 12 隻 AI → 畫面正中央不能有任何字
  await shot(b, 'br_aihurt', `(function(){
    __BH.BR.opt={n:50,team:1,dur:10}; __BH.startBR();
    var G=__BH.Game; G.state='play'; G.countdown=0; G.zoom=G.zoomTarget=1;
    var ais=G.players.filter(function(p){return p.ai&&p.alive;});
    var me=G.players[0];
    for(var i=0;i<12;i++){ var a=ais[i]; if(!a)break; a.x=me.x+(i%4-1.5)*G.T*2.2; a.y=me.y+(Math.floor(i/4)-1)*G.T*2.0; a.brHp=6; a.invuln=0; }
    for(var k=0;k<12;k++){ var a2=ais[k]; if(!a2)break; try{__BH.killBattlePlayer(a2,null);}catch(e){} }
    for(var i2=0;i2<10;i2++){ G.camSnap=(i2===9); try{__BH.updateCamera(1/60);}catch(e){} }
    try{__BH.render();}catch(e){}
    return 1; })()`, 1280, 800);

  // 2) 自己受傷 → 右上角一則提示（不該有中央字）
  await shot(b, 'br_mehurt', `(function(){
    __BH.BR.opt={n:50,team:1,dur:10}; __BH.startBR();
    var G=__BH.Game; G.state='play'; G.countdown=0; G.zoom=G.zoomTarget=1;
    var me=G.players[0]; me.brHp=5; me.invuln=0;
    try{__BH.killBattlePlayer(me,null);}catch(e){}
    try{__BH.killBattlePlayer(me,null);}catch(e){}
    for(var i=0;i<10;i++){ G.camSnap=(i===9); try{__BH.updateCamera(1/60);}catch(e){} }
    try{__BH.render();}catch(e){}
    return 1; })()`, 1280, 800);

  await b.close();
  console.log('done → ' + OUT);
})();
