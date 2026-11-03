// test/shot-v465-map.js — 手機直放隨機地圖：舊版格子(21px) vs 新版格子(35px)
const { launch, sleep } = require('./cdp');
const path = require('path');

const FILE = 'file:///' + path.join(__dirname, '../bomb-hero/index.html').replace(/\\/g, '/');

(async function () {
  const br = await launch({ port: 9491, w: 390, h: 844 });
  const page = await br.newPage();
  await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await page.resize(390, 844, true);
  await page.goto(FILE, 3500);
  await page.eval("__BH.settings.ctrl='touch'; __BH.applyCtrl(); 1");
  await page.eval('__BH.startMapTest(1); 1');
  await sleep(2500);

  // 收掉開場卡 / 橫向提示 / 提示條
  await page.eval(`(function(){
    var e = document.getElementById('rotHint'); if (e) e.remove();
    try { __BH.ovHide(); } catch (e) {}
    var G = __BH.Game;
    G.state = 'play'; G.bannerT = 0; G.toastT = 0; G.zoom = G.zoomTarget = 1;
    var b = document.getElementById('banner'); if (b) b.style.display = 'none';
    var t = document.getElementById('toast'); if (t) t.style.display = 'none';
    return 1;
  })()`);
  await sleep(300);

  const shotAt = async (T, file) => {
    await page.eval(`(function(){
      var G = __BH.Game;
      var k = ${T} / G.T;
      (G.players || []).forEach(function (p) { p.x *= k; p.y *= k; if (p.tx != null) { p.tx *= k; p.ty *= k; } });
      (G.enemies || []).forEach(function (e) { e.x *= k; e.y *= k; });
      (G.bombs || []).forEach(function (b) { b.px *= k; b.py *= k; });
      (G.items || []).forEach(function (i) { if (i.x) { i.x *= k; i.y *= k; } });
      G.T = ${T};
      G.ox = Math.floor((__BH.viewInfo().w - G.T * G.cols) / 2);
      G.oy = Math.floor((__BH.viewInfo().h - G.T * G.rows) / 2);
      G.camSnap = true; __BH.updateCamera(0); __BH.render();
      return 1;
    })()`);
    await sleep(250);
    await page.shot(file);
    return file;
  };

  await shotAt(21, path.join(__dirname, '_v465/map-old.png'));
  await shotAt(35, path.join(__dirname, '_v465/map-new.png'));

  // 縮到 42% 的整張視野
  await page.eval(`(function(){ var G=__BH.Game; G.zoom=G.zoomTarget=0.42; G.camSnap=true; __BH.updateCamera(0); __BH.render(); return 1; })()`);
  await sleep(250);
  await page.shot(path.join(__dirname, '_v465/map-zoom42.png'));

  console.log('done');
  br.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
