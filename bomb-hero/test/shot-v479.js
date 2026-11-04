// test/shot-v479.js — 目檢：美術外部化後，file:// 直接開也要載得到 spr/*.webp
// 注意：無頭環境 rAF 不推進 → 一律手動 updateCamera() + render()（同 shot-v478）
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');
const URL = 'file:///' + path.join(__dirname, '../index.html').replace(/\\/g, '/');
const OUT = path.join(__dirname, '_v479');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const HIDE = "['zoomHint','hzHint','rotHint','ovIn','brOv','brEnd'].forEach(function(id){var e=document.getElementById(id); if(e){e.classList.add('hide'); e.style.display='none';}}); 1";

async function page(b) {
  const p = await b.newPage();
  await p.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await p.goto(URL, 2500);
  for (let i = 0; i < 40; i++) { if (await p.eval('typeof __BH') === 'object') break; await sleep(300); }
  await sleep(1200);
  return p;
}

async function canvasStat(p) {
  return p.eval("(function(){var c=document.getElementById('cv');return c.width+'x'+c.height;})()");
}

(async () => {
  const b = await launch({ w: 1280, h: 800 });

  const p = await page(b);
  const logo = await p.eval("(function(){var i=document.getElementById('titleLogo');return i? i.complete+'|'+i.naturalWidth+'x'+i.naturalHeight : 'no-el';})()");
  console.log('titleLogo = ' + logo);
  await p.shot(path.join(OUT, 'title.png'));

  await p.eval(`(function(){
    __BH.startSolo(1,false);
    var G=__BH.Game; G.state='play'; G.countdown=0; G.zoom=G.zoomTarget=1;
    for(var i=0;i<40;i++){ G.camSnap=(i===39); try{__BH.updateCamera(1/60);}catch(e){} }
    try{__BH.render();}catch(e){console.log('render '+e)}
    return 1; })()`);
  await p.eval(HIDE);
  await sleep(600);
  console.log('stage1 canvas = ' + await canvasStat(p));
  await p.shot(path.join(OUT, 'stage1.png'));

  await p.eval(`(function(){
    __BH.BR.opt={n:30,team:1,dur:5}; __BH.startBR();
    var G=__BH.Game; G.state='play'; G.countdown=0; G.zoom=G.zoomTarget=1;
    var me=G.players[0]; me.dino=true; me.redDragon=true;
    for(var i=0;i<40;i++){ G.camSnap=(i===39); try{__BH.updateCamera(1/60);}catch(e){} }
    try{__BH.render();}catch(e){console.log('render '+e)}
    return 1; })()`);
  await p.eval(HIDE);
  await sleep(600);
  console.log('br canvas = ' + await canvasStat(p));
  await p.shot(path.join(OUT, 'br.png'));

  await p.eval("try{__BH.Help.open();__BH.Help.tab('foe');}catch(e){console.log('help '+e)}; 1");
  await sleep(900);
  await p.shot(path.join(OUT, 'help_foe.png'));

  console.log('怪物貼圖載入 = ' + (await p.eval('__BH.FoeArt.readyCount()')) + '/48');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
