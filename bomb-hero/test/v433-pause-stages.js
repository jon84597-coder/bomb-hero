// v4.33：暫停選單的「回關卡清單」—— 單人 → scr-solo、RPG → scr-rpg、對戰 → 按鈕要隱藏
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const OUT = path.join(__dirname, '_v433');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) { }
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

let pass = 0, fail = 0;
function ok(c, n, x) {
  if (c) { pass++; console.log('  ✓ ' + n + (x === undefined ? '' : '（' + x + '）')); }
  else { fail++; console.log('  ✗ FAIL: ' + n + (x === undefined ? '' : '（' + x + '）')); }
}

(async () => {
  const b = await launch({ port: 9554, w: 1000, h: 700 });
  try {
    const p = await b.newPage();
    await p.send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 700, deviceScaleFactor: 1, mobile: false });
    await p.goto(URL, 3000);
    for (let i = 0; i < 80; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game)')) break; await sleep(300); }

    async function enterGame(stage) {
      await p.eval('window.__BH.startSolo(' + stage + ')');
      await sleep(700);
      await p.eval("(function(){ var ov=document.getElementById('ovBox'); var b2=ov&&ov.querySelector('button'); if(b2) b2.click(); })()");
      await sleep(400);
      await p.eval("(function(){ var ok2=document.getElementById('rhOk'); if(ok2) ok2.click(); })()");
      for (let i = 0; i < 40; i++) { if (await p.eval("window.__BH.Game.state==='play'")) break; await sleep(250); }
      await sleep(500);
    }

    // ---- 單人 ----
    console.log('\n=== 單人模式 ===');
    await enterGame(3);
    ok(await p.eval("window.__BH.Game.mode") === 'solo', '遊戲模式 = solo');
    await p.eval('window.__BH.togglePause()');
    await sleep(400);
    const vis = await p.eval(`(function(){
      var b=document.getElementById('pmStages');
      if(!b) return 'missing';
      var r=b.getBoundingClientRect();
      return JSON.stringify({w:Math.round(r.width),h:Math.round(r.height),disp:getComputedStyle(b).display,txt:b.textContent});
    })()`);
    console.log('  pmStages', vis);
    ok(vis !== 'missing', '暫停選單有 pmStages 按鈕');
    const vb = JSON.parse(vis === 'missing' ? '{}' : vis);
    ok(vb.h >= 44, '按鈕高度 ≥ 44px（' + vb.h + '）');
    ok(vb.disp !== 'none', '單人模式下按鈕可見');
    await p.shot(path.join(OUT, 'pause-solo.png'));
    await p.eval("document.getElementById('pmStages').click()");
    await sleep(700);
    ok(await p.eval("window.__BH.Screen ? window.__BH.Screen.current : document.querySelector('.screen.on').id") === 'solo'
      || await p.eval("document.querySelector('.screen.on').id") === 'scr-solo', '回到單人關卡清單');
    ok(await p.eval("window.__BH.isPaused()") === false, '回去後不再是暫停狀態');
    ok(await p.eval("document.getElementById('stageGrid') && document.getElementById('stageGrid').children.length > 0"),
      '關卡格有重畫出來');

    // ---- RPG ----
    console.log('\n=== RPG 模式 ===');
    await p.eval("(function(){ document.querySelector('#scr-rpg') && window.__BH.Screen.show('rpg'); })()");
    await sleep(400);
    await p.eval('window.__BH.startRpg(1)');
    await sleep(500);
    await p.eval("(function(){ var ov=document.getElementById('ovBox'); var b2=ov&&ov.querySelector('button'); if(b2) b2.click(); })()");
    await sleep(500);
    for (let i = 0; i < 40; i++) { if (await p.eval("window.__BH.Game.state==='play'")) break; await sleep(250); }
    await sleep(400);
    ok(await p.eval("window.__BH.Game.mode") === 'rpg', '遊戲模式 = rpg');
    await p.eval('window.__BH.togglePause()');
    await sleep(400);
    ok(await p.eval("(function(){var b=document.getElementById('pmStages');return !!b && getComputedStyle(b).display!=='none';})()"),
      'RPG 模式下按鈕可見');
    await p.eval("document.getElementById('pmStages').click()");
    await sleep(700);
    ok(await p.eval("document.querySelector('.screen.on').id") === 'scr-rpg', '回到 RPG 選單');
    ok(await p.eval("document.getElementById('segRpgMap') && document.getElementById('segRpgMap').children.length === 4"),
      'RPG 地圖清單有重畫');

    // ---- 對戰（按鈕要藏）----
    console.log('\n=== 對戰模式 ===');
    // 直接改模式再開暫停（暫停選單每次開啟都會重新建立，會依 Game.mode 決定藏不藏）
    await p.eval("(function(){ window.__BH.Screen.show('game'); window.__BH.Game.state='play'; window.__BH.Game.mode='battle'; })()");
    await sleep(300);
    await p.eval("(function(){ if(!window.__BH.isPaused()) window.__BH.togglePause(); })()");
    await sleep(400);
    ok(await p.eval("(function(){var b=document.getElementById('pmStages');return !!b && getComputedStyle(b).display==='none';})()"),
      '對戰模式把按鈕藏起來');
    await p.eval("(function(){ try{window.__BH.togglePause();}catch(e){} })()");
    await sleep(200);

    console.log('\n' + (fail === 0 ? '✅' : '❌') + ' pause-stages：' + pass + ' 通過 / ' + fail + ' 失敗');
  } finally { await b.close(); }
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e && e.message); process.exit(1); });
