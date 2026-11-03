// test/_v465/ts.js — 單頁快查：body.touch 後 tileSize() 是否真的變了
const path = require('path');
const { spawn } = require('child_process');
const { launch, sleep } = require('../cdp');
const PORT = 3419, BASE = 'http://127.0.0.1:' + PORT;
(async function () {
  const srv = spawn(process.execPath, [path.join(__dirname, '../../bomberman-online/server.js')], {
    env: Object.assign({}, process.env, { PORT: String(PORT) }), stdio: 'ignore'
  });
  for (let i = 0; i < 50; i++) { try { const r = await fetch(BASE + '/api/health'); if (r.ok) break; } catch (e) {} await sleep(100); }
  const br = await launch({ port: 9451, w: 760, h: 400 });
  const p = await br.newPage();
  await p.goto(BASE + '/index.html', 2500);
  await p.eval("__BH.startSolo(1,false); 1");
  await sleep(1200);
  console.log('before', await p.eval("JSON.stringify({w:__BH.viewInfo().w,h:__BH.viewInfo().h,T:__BH.Game.T,touch:document.body.classList.contains('touch'),ts:__BH.tileSize(),M:__BH.MOBILE_VIEW_FRAC})"));
  await p.eval("document.body.classList.add('touch'); 1");
  await sleep(60);
  console.log('after +class', await p.eval("JSON.stringify({T:__BH.Game.T,touch:document.body.classList.contains('touch'),ts:__BH.tileSize()})"));
  await p.eval("__BH.resizeView(); 1");
  await sleep(60);
  console.log('after resize', await p.eval("JSON.stringify({T:__BH.Game.T,touch:document.body.classList.contains('touch'),ts:__BH.tileSize()})"));
  await sleep(1500);
  console.log('1.5s later', await p.eval("JSON.stringify({T:__BH.Game.T,touch:document.body.classList.contains('touch')})"));
  br.close(); srv.kill();
})();
