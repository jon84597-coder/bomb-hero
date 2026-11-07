// test/_probe-map549.js — v5.49：真瀏覽器確認「地圖模式」預設是隨機、兩顆按鈕順序、單人/RPG 真的長出隨機圖
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, '_v549');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}

const UI = `(function(){
  var seg = document.getElementById('segSoloMap');
  var bs = seg ? Array.prototype.map.call(seg.querySelectorAll('button'), function(b){
    return { v: b.getAttribute('data-v'), txt: b.textContent.trim(), sel: b.classList.contains('sel') };
  }) : null;
  var seg2 = document.getElementById('segRpgMode');
  var bs2 = seg2 ? Array.prototype.map.call(seg2.querySelectorAll('button'), function(b){
    return { v: b.getAttribute('data-v'), sel: b.classList.contains('sel') };
  }) : null;
  return {
    mapMode: __BH.settings.mapMode, mapV: __BH.settings.mapV,
    seg: bs, segRpg: bs2,
    hint: (document.getElementById('soloMapHint')||{}).textContent
  };
})()`;

const SOLO = function (st) {
  return `(function(){
    __BH.clearMapTest(); __BH.startSolo(${st}, false);
    return { stage: ${st}, cols: __BH.Game.cols, rows: __BH.Game.rows,
             boss: !!(__BH.Game.bossArena), seed: __BH.seedTag(),
             name: (__BH.Game.mapInfo||{}).n };
  })()`;
};

(async () => {
  const b = await launch({ w: 900, h: 900, port: 9381 });
  const p = await b.newPage();
  await p.goto('http://127.0.0.1:3111/', 1600);
  await sleep(500);

  const ui = await p.eval(UI);
  console.log('UI      ', JSON.stringify(ui, null, 1));

  console.log('SOLO 3  ', JSON.stringify(await p.eval(SOLO(3))));
  console.log('SOLO 12 ', JSON.stringify(await p.eval(SOLO(12))));
  console.log('SOLO 5  ', JSON.stringify(await p.eval(SOLO(5))));

  const rpg = await p.eval(`(function(){
    try { __BH.RPG.unlocked = __BH.SOLO_STAGES; } catch (e) {}   // 線上會被鎖關，這裡直接全開才驗得到章節尺寸
    var out = [];
    [1, 6, 11].forEach(function(st){
      __BH.startRpg(st, {});
      out.push({ stage: st, cols: __BH.Game.cols, rows: __BH.Game.rows, boss: !!__BH.Game.bossArena, theme: (__BH.Game.theme||{}).name });
    });
    return out;
  })()`);
  console.log('RPG     ', JSON.stringify(rpg));

  // 設定頁截圖（手機橫放 + 直放）
  await p.resize(430, 932, true);
  await p.goto('http://127.0.0.1:3111/', 1500);
  await p.eval(`(function(){ var b=document.getElementById('btnSettings'); if(b) b.click(); return 1; })()`);
  await sleep(400);
  await p.shot(path.join(OUT, 'set-port.png'));
  await p.resize(844, 390, true);
  await sleep(400);
  await p.shot(path.join(OUT, 'set-land.png'));
  // 單人闖關設定頁：地圖模式那一欄
  await p.resize(430, 932, true);
  await p.goto('http://127.0.0.1:3111/', 1500);
  await p.eval(`(function(){ var b=document.getElementById('btnSolo'); if(b) b.click(); return 1; })()`);
  await sleep(500);
  await p.eval(`(function(){ var e=document.getElementById('segSoloMap'); if(e&&e.scrollIntoView) e.scrollIntoView({block:'center'}); return 1; })()`);
  await sleep(300);
  await p.shot(path.join(OUT, 'solo-map.png'));
  console.log('shots →', OUT);
  await b.close();
  process.exit(0);
})().catch(function (e) { console.error('ERR', e); process.exit(1); });
