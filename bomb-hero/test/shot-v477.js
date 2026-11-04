// test/shot-v477.js — v4.77 目檢：地板分塊／牆面快取、裁切、大逃殺說明頁、10 國語系、BOSS 坐騎
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');
const URL = 'file:///' + path.join(__dirname, '../index.html').replace(/\\/g, '/');
const OUT = path.join(__dirname, '_v477');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

async function shot(b, name, prep, w, h, opt) {
  const p = await b.newPage();
  if (w) await p.send('Emulation.setDeviceMetricsOverride', { width: w, height: h || 800, deviceScaleFactor: 1, mobile: !!(opt && opt.mobile) });
  await p.goto(URL, 2000);
  for (let i = 0; i < 40; i++) { if (await p.eval('typeof __BH') === 'object') break; await sleep(300); }
  await p.eval("try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}; __BH.settings.ctrl='touch'; __BH.applyCtrl(); try{__BH.setLang('" + ((opt && opt.lang) || 'zh-TW') + "');}catch(e){}; 1");
  if (prep) await p.eval(prep);
  await sleep(600);
  await p.eval("['zoomHint','hzHint','rotHint','banner','toast','ovIn','brOv'].forEach(function(id){var e=document.getElementById(id); if(e){e.classList.add('hide'); e.style.display='none';}}); 1");
  await sleep(200);
  await p.shot(path.join(OUT, name + '.png'));
  return p;
}

(async () => {
  const b = await launch({ w: 1280, h: 800 });

  // 1) 單人第 1 關（地板＋軟磚＋硬牆全部走分塊快取）
  await shot(b, 'solo', `(function(){
    __BH.startSolo(1,false);
    var G=__BH.Game; G.state='play'; G.countdown=0;
    for(var i=0;i<8;i++){ try{__BH.updateCamera(1/60);}catch(e){} }
    try{__BH.render();}catch(e){}
    return 1; })()`, 1280, 800);

  // 2) 第 8 關（暗黑城，硬牆材質不同）
  await shot(b, 'stage8', `(function(){
    __BH.startSolo(8,false);
    var G=__BH.Game; G.state='play'; G.countdown=0;
    for(var i=0;i<8;i++){ try{__BH.updateCamera(1/60);}catch(e){} }
    try{__BH.render();}catch(e){}
    return 1; })()`, 1280, 800);

  // 3) 大逃殺 50 人（分塊＋裁切主場）
  await shot(b, 'br50', `(function(){
    __BH.BR.opt={n:50,team:1,dur:10}; __BH.startBR();
    var G=__BH.Game; G.state='play'; G.countdown=0; G.zoom=G.zoomTarget=1;
    for(var i=0;i<12;i++){ G.camSnap=(i===11); try{__BH.updateCamera(1/60);}catch(e){} }
    try{__BH.render();}catch(e){}
    return 1; })()`, 1280, 800);

  // 4) 說明頁 → 大逃殺分頁（繁中）
  await shot(b, 'help_br_tw', `(function(){
    __BH.Help.show(); __BH.Help.setTab('br');
    try{__BH.render();}catch(e){}
    return 1; })()`, 1280, 900);

  // 5) 說明頁 → 大逃殺分頁（英文）
  await shot(b, 'help_br_en', `(function(){
    __BH.setLang('en');
    __BH.Help.show(); __BH.Help.setTab('br');
    try{__BH.render();}catch(e){}
    return 1; })()`, 1280, 900);

  // 6) 說明頁 → 基本操作（日文）看排版有沒有被英文撐爆
  await shot(b, 'help_basic_ja', `(function(){
    __BH.setLang('ja');
    __BH.Help.show(); __BH.Help.setTab('basic');
    try{__BH.render();}catch(e){}
    return 1; })()`, 1280, 900);

  // 7) 說明頁 → 怪物圖鑑（德文）
  await shot(b, 'help_foe_de', `(function(){
    __BH.setLang('de');
    __BH.Help.show(); __BH.Help.setTab('foe');
    try{__BH.render();}catch(e){}
    return 1; })()`, 1280, 900);

  // 8) 版本紀錄（英文：最新版有翻譯、舊版標「原文繁中」）
  await shot(b, 'verlog_en', `(function(){
    __BH.setLang('en');
    __BH.VersionLog.show();
    return 1; })()`, 1280, 900);

  // 9) 大逃殺打死 BOSS → 直接騎龍（手機視角）
  await shot(b, 'br_mount', `(function(){
    __BH.BR.opt={n:30,team:1,dur:10}; __BH.startBR();
    var G=__BH.Game; G.state='play'; G.countdown=0; G.zoom=G.zoomTarget=1;
    var me=G.players[0];
    var b=G.enemies.filter(function(e){return e.brBoss;})[0];
    if(b){
      b.x=me.x+G.T*1.6; b.y=me.y; b.hp=1; b.lastHitBy=me;
      __BH.rideDino(me, !!me.dino); me.mountT=1.8;
      try{ __BH.pushPop(me.x, me.y-G.T*.55, '🦖', { col:'#7ee08a' }); }catch(e){}
    }
    for(var i=0;i<12;i++){ G.camSnap=(i===11); try{__BH.updateCamera(1/60);}catch(e){} }
    try{__BH.render();}catch(e){}
    return 1; })()`, 390, 800, { mobile: true });

  await b.close();
  console.log('done → ' + OUT);
})();
