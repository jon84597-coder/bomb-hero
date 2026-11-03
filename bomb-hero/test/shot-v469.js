// test/shot-v469.js — v4.69 目檢：地圖模式 / 出生點 / 商店門票 / 線上組隊
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');
const URL = 'file:///' + path.join(__dirname, '../index.html').replace(/\\/g, '/');
const OUT = path.join(__dirname, '_v469');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const HIDE = `['rotHint','zoomHint'].forEach(function(id){var e=document.getElementById(id); if(e) e.remove();});
['zoomPill','banner','toast'].forEach(function(id){var e=document.getElementById(id); if(e) e.style.display='none';});
var ov=document.getElementById('ovIn'); if(ov) ov.classList.add('hide');`;

(async function () {
  const br = await launch({ port: 9601, w: 390, h: 844 });
  const p = await br.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.resize(390, 844, true);
  await p.goto(URL, 3200);
  for (let i = 0; i < 40; i++) {
    const a = await p.eval('typeof __BH').catch(() => 'x');
    if (a === 'object') break;
    await sleep(300);
  }
  await p.eval("try{localStorage.setItem('bombhero-rotstip','1');localStorage.setItem('bombhero-rotskip','1')}catch(e){}; __BH.settings.ctrl='touch'; __BH.applyCtrl(); 1");

  // 1) 單人頁：地圖模式
  await p.eval(`(function(){
    document.getElementById('btnSolo').click();
    setTimeout(function(){ var el=document.getElementById('segSoloMap'); if(el) el.scrollIntoView({block:'center'}); }, 120);
    return 1;
  })()`);
  await sleep(700);
  await p.shot(path.join(OUT, 'solo-mapmode.png'));

  // 2) 商店：大逃殺門票
  await p.eval(`(function(){
    __BH.Shop.addGold(6000);
    __BH.Shop.buyTicket(); __BH.Shop.buyTicket();
    __BH.Shop.open();
    setTimeout(function(){ var g=document.getElementById('shopGrid'); if(g) g.scrollIntoView({block:'end'}); }, 150);
    return __BH.Shop.tickets();
  })()`);
  await sleep(700);
  await p.shot(path.join(OUT, 'shop-ticket.png'));

  // 3) 隨機地圖出生點：半徑 1 空、第 2 格起有牆
  const r3 = await p.eval(`(function(){
    __BH.settings.mapMode='random'; __BH.clearMapTest(); __BH.startSolo(2, false);
    var G=__BH.Game; G.state='play'; G.zoom=G.zoomTarget=2.1; G.camSnap=true;
    ${HIDE}
    __BH.updateCamera(1); __BH.render();
    return JSON.stringify({T:G.T, cols:G.cols, rows:G.rows, sp:G.spawnCell});
  })()`);
  console.log('map', r3);
  await sleep(250);
  await p.shot(path.join(OUT, 'spawn-clear.png'));

  // 4) 線上配對入口（含延遲說明）
  await p.eval(`(function(){
    __BH.Screen.show('online');
    var n=document.getElementById('netLagNote');
    if(n) n.textContent=__BH.t('net.lag');
    return 1;
  })()`);
  await sleep(600);
  await p.shot(path.join(OUT, 'net-entry.png'));

  // 5) 線上房間：組隊模式
  await p.eval(`(function(){
    __BH.Net.role='host'; __BH.Net.on=true; __BH.Net.code='1234'; __BH.Net.count=4;
    document.getElementById('netEntry').style.display='none';
    document.getElementById('netRoom').style.display='grid';
    document.getElementById('netCodeShow').textContent='1234';
    document.getElementById('btnNetStart').style.display='';
    __BH.settings.teams=2;
    __BH.Net.renderCountSeg(); __BH.Net.renderNetTeamSeg(); __BH.Net.renderRoster();
    return 1;
  })()`);
  await sleep(600);
  await p.shot(path.join(OUT, 'net-teams.png'));

  console.log('shots ok');
  br.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
