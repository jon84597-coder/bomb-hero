// test/probe-v465-online.js — 用真實 buildSnap → applySnap 餵 10Hz 快照，驗證客人畫面不再抖
//   房主：桌機 1100x700（15x13 → T=62）　客人：手機 390x844（T=54）
const { launch, sleep } = require('./cdp');
const path = require('path');

const FILE = 'file:///' + path.join(__dirname, '../index.html').replace(/\\/g, '/');

(async function () {
  const host = await launch({ port: 9501, w: 1100, h: 700 });
  const hp = await host.newPage();
  const gp = await host.newPage();

  await hp.resize(1100, 700, false);
  await gp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await gp.resize(390, 844, true);

  await hp.goto(FILE, 3500);
  await gp.goto(FILE, 3500);
  for (let i = 0; i < 60; i++) {
    const a = await hp.eval('typeof __BH').catch(() => 'err');
    const b = await gp.eval('typeof __BH').catch(() => 'err');
    if (a === 'object' && b === 'object') break;
    if (i === 59) {
      console.log('載入失敗 host=' + a + ' guest=' + b);
      console.log('  host href =', await hp.eval('location.href + " / " + document.readyState'));
      console.log('  guest href =', await gp.eval('location.href + " / " + document.readyState'));
    }
    await sleep(300);
  }
  await hp.eval('__BH.startSolo(1); 1');
  await gp.eval("__BH.settings.ctrl='touch'; __BH.applyCtrl(); __BH.Screen.show('game'); 1");
  await sleep(2500);

  const hostT = await hp.eval('__BH.Game.T');
  const guestT0 = await gp.eval('__BH.tileSize()');
  console.log('房主 T =', hostT, '／客人自己算的 T =', guestT0);

  // 客人身份
  await gp.eval(`(function(){
    var N = __BH.Net; N.on = true; N.role = 'guest'; N.pid = 'g1'; N.mySlot = 0;
    __BH.resizeView();
    return 1;
  })()`);

  const samples = [];
  for (let i = 0; i < 25; i++) {
    const snap = await hp.eval('JSON.stringify(__BH.buildSnap())');
    await gp.eval(`(function(s){ window.__snap = JSON.parse(s); return 1; })(${JSON.stringify(snap)})`);
    await gp.eval('__BH.applySnap(window.__snap); 1');
    await gp.eval('(function(){ for (var j = 0; j < 6; j++) { __BH.Net.guestTick(1/60); __BH.updateCamera(1/60); } __BH.resizeView(); __BH.render(); return 1; })()');
    const r = await gp.eval(`(function(){
      var G = __BH.Game, p = G.players[0];
      return [G.T, Math.round(p.x), Math.round(p.tx), Math.round(G.camX), G.cols, G.rows];
    })()`);
    samples.push({ i, T: r[0], x: r[1], tx: r[2], camX: r[3], cols: r[4], rows: r[5] });
    await sleep(100);
    // 房主動一下（讓快照有變化）
    await hp.eval('(function(){ var p=__BH.Game.players[0]; p.x += 18; p.y += 6; return 1; })()');
  }

  const Ts = samples.map(s => s.T);
  const camXs = samples.map(s => s.camX);
  const dxs = samples.slice(1).map((s, i) => Math.abs(s.x - samples[i].x));
  const camJumps = camXs.slice(1).map((v, i) => Math.abs(v - camXs[i]));

  console.log('客人 T 序列 :', [...new Set(Ts)].join(', '));
  console.log('客人 x 序列 :', samples.slice(0, 12).map(s => s.x).join(' '));
  console.log('客人 camX   :', camXs.slice(0, 12).join(' '));
  console.log('T 變動次數 =', Ts.slice(1).filter((v, i) => v !== Ts[i]).length);
  console.log('x 單幀最大位移 =', Math.max(...dxs).toFixed(0), 'px（地圖寬 ' + samples[0].cols * samples[0].T + 'px）');
  console.log('camX 單幀最大跳動 =', Math.max(...camJumps).toFixed(0), 'px');

  await gp.eval('(function(){ var e=document.getElementById("rotHint"); if(e) e.remove(); __BH.render(); return 1; })()');
  await gp.shot(path.join(__dirname, '_v465/guest-view.png'));
  console.log('客人端截圖 → test/_v465/guest-view.png');
  host.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
