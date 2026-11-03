// test/_probe-v469-ui.js — 實際 DOM：兩頁的地圖模式按鈕存不存在、點得動、會不會改設定
const { launch, sleep } = require('./cdp');
const path = require('path');
const URL = 'file:///' + path.join(__dirname, '../index.html').replace(/\\/g, '/');

(async function () {
  const br = await launch({ port: 9603, w: 390, h: 844 });
  const p = await br.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.resize(390, 844, true);
  await p.goto(URL, 3200);
  for (let i = 0; i < 40; i++) { if ((await p.eval('typeof __BH').catch(() => 'x')) === 'object') break; await sleep(300); }
  await p.eval("try{localStorage.setItem('bombhero-rotstip','1')}catch(e){}; 1");

  const solo = await p.eval(`(function(){
    document.getElementById('btnSolo').click();
    var seg=document.getElementById('segSoloMap');
    var bs=[].slice.call(seg.querySelectorAll('button'));
    var txt=bs.map(function(b){return b.textContent;});
    return JSON.stringify({n:bs.length, txt:txt, sel:bs.filter(function(b){return b.className.indexOf('sel')>=0;}).length});
  })()`);
  console.log('單人 seg:', solo);

  const clickSolo = await p.eval(`(function(){
    var seg=document.getElementById('segSoloMap');
    var b=[].slice.call(seg.querySelectorAll('button')).filter(function(x){return x.getAttribute('data-v')==='random';})[0];
    b.click();
    return JSON.stringify({mode:__BH.settings.mapMode, hint:(document.getElementById('soloMapHint')||{}).textContent});
  })()`);
  console.log('點「隨機生成」後:', clickSolo);

  const rpg = await p.eval(`(function(){
    document.getElementById('btnRpg').click();
    var seg=document.getElementById('segRpgMode');
    var bs=[].slice.call(seg.querySelectorAll('button'));
    var before=__BH.settings.mapMode;
    var b=bs.filter(function(x){return x.getAttribute('data-v')==='classic';})[0];
    if(b) b.click();
    return JSON.stringify({n:bs.length, txt:bs.map(function(x){return x.textContent;}),
      before:before, after:__BH.settings.mapMode});
  })()`);
  console.log('RPG seg:', rpg);

  await p.eval("__BH.settings.mapMode='random'; 1");
  const shot = await p.eval(`(function(){
    try { document.getElementById('btnRpgStart').click(); return 'clicked'; }
    catch(e){ return 'ERR ' + e.message; }
  })()`);
  console.log('click:', shot);
  await sleep(2500);
  const game = await p.eval(`(function(){
    var G=__BH.Game;
    return JSON.stringify({screen:__BH.Screen.current, stage:G.stage, cols:G.cols, rows:G.rows,
      bigMap:G.bigMap, mode:__BH.settings.mapMode, enemies:G.enemies.length});
  })()`);
  console.log('RPG 開始冒險:', game);

  br.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
