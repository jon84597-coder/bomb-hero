// test/shot-v472.js — v4.72 目檢：大逃殺三島（全景／遊玩視角／毒圈／入口卡）
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');
const URL = 'file:///' + path.join(__dirname, '../index.html').replace(/\\/g, '/');
const OUT = path.join(__dirname, '_v472');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const CLEAN = `(function(){
  ['rotHint','zoomHint'].forEach(function(id){var e=document.getElementById(id); if(e) e.remove();});
  ['banner','toast'].forEach(function(id){var e=document.getElementById(id); if(e) e.style.display='none';});
  return 1;
})()`;

function br(zoom, secs, god) {
  return `(function(){
    var G = __BH.Game;
    __BH.settings.ctrl = 'touch';
    __BH.startBR();
    var ov = document.getElementById('ovIn'); if (ov) ov.classList.add('hide');
    G.state = 'play';
    G.players.forEach(function(p){ p.invuln = ${god ? 9999 : 0}; if (${god ? 'true' : 'false'}) p.brHp = 99; });
    G.zoom = G.zoomTarget = ${zoom}; G.camSnap = true;
    for (var i = 0; i < 60 * ${secs}; i++) { try { __BH.updateBR(1/60); } catch (e) {} }
    try { __BH.updateCamera(1); } catch (e) {}
    try { __BH.render(); } catch (e) {}
    return JSON.stringify({ T: G.T, map: G.cols + 'x' + G.rows, zone: +G.brZone.r.toFixed(1),
      phase: G.brZone.phase, alive: G.players.filter(function(p){return p.alive;}).length,
      enemies: G.enemies.length, mini: __BH.miniMapOn() });
  })()`;
}

(async function () {
  const br2 = await launch({ port: 9616, w: 390, h: 844 });
  const p = await br2.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.resize(390, 844, true);
  await p.goto(URL, 3200);
  for (let i = 0; i < 40; i++) {
    if (await p.eval('typeof __BH') === 'object') break;
    await sleep(300);
  }
  await p.eval("try{localStorage.setItem('bombhero-rotstip','1');localStorage.setItem('bombhero-rotskip','1');localStorage.setItem('bombhero-br-ticket','9');localStorage.setItem('bombhero-br-free','2000-01-01')}catch(e){}; __BH.settings.ctrl='touch'; __BH.applyCtrl(); 1");

  // 0) 入口卡
  await p.eval("(function(){var b=document.getElementById('btnBR'); if(b) b.click(); return 1;})()");
  await sleep(400);
  await p.shot(path.join(OUT, 'lobby.png'));
  await p.eval("(function(){var o=document.getElementById('brOv'); if(o) o.classList.add('hide'); return 1;})()");

  // 1) 全景（縮到最小看三島）
  console.log('panorama', await p.eval(br(0.42, 1)));
  await sleep(300);
  await p.eval(CLEAN); await p.eval('try{__BH.render()}catch(e){}');
  await sleep(200);
  await p.shot(path.join(OUT, 'panorama.png'));

  // 2) 正常遊玩視角
  console.log('play    ', await p.eval(br(1, 2)));
  await sleep(300);
  await p.eval(CLEAN); await p.eval('try{__BH.render()}catch(e){}');
  await sleep(200);
  await p.shot(path.join(OUT, 'play.png'));

  // 3) 毒圈收縮後（40 秒）
  console.log('zone    ', await p.eval(br(0.55, 40, true)));
  await sleep(300);
  await p.eval(CLEAN); await p.eval('try{__BH.render()}catch(e){}');
  await sleep(200);
  await p.shot(path.join(OUT, 'zone.png'));

  br2.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
