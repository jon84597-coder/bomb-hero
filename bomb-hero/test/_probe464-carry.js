// 量測「上一局的分類被帶到下一局」造成的掉圖：縮圈填滿 → 換場 → 統計不畫的牆格
//   node test/_probe464-carry.js new
//   node test/_probe464-carry.js old      （先 git show HEAD:bomb-hero/index.html > _oldbh/index.html）
const { launch, sleep } = require('./cdp');
const path = require('path');
const WHICH = process.argv[2] === 'old' ? '_oldbh/index.html' : 'index.html';

(async () => {
  const b = await launch({ port: 9801, w: 1300, h: 1150 });
  const p = await b.newPage();
  await p.goto('file:///' + path.resolve(__dirname, '..', WHICH).replace(/\\/g, '/'), 6000);
  for (let i = 0; i < 100; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game&&window.__BH.Game.grid)')) break; await sleep(250); }
  await sleep(600);

  const r = await p.eval(`(function(){
    var BH = window.__BH, G = BH.Game;
    BH.settings.count = 4; BH.settings.size = 'M'; BH.settings.hazards = 'on'; BH.settings.sd = 'off';
    BH.Battle.resetSlots(); BH.startBattle();
    var ov = document.getElementById('ovIn'); if (ov) ov.style.setProperty('display','none','important');
    G.state = 'play'; G.countdown = 0;
    function stat() {
      var c = G.cols, rr = G.rows, g = G.grid, wk = G.wallKind, solid = 0, nd = 0;
      for (var y = 0; y < rr; y++) for (var x = 0; x < c; x++) {
        if (g[y][x] !== 1) continue;
        solid++;
        if (wk && wk[y] && wk[y][x] === 0) nd++;
      }
      return solid + '/' + nd;
    }
    BH.render();
    var before = stat();
    // 模擬突死縮圈：外圈填 5 圈
    var cols = G.cols, rows = G.rows;
    for (var k = 0; k < 5; k++) {
      var x0 = 1 + k, y0 = 1 + k, x1 = cols - 2 - k, y1 = rows - 2 - k;
      for (var x = x0; x <= x1; x++) { G.grid[y0][x] = 1; G.grid[y1][x] = 1; }
      for (var y = y0; y <= y1; y++) { G.grid[y][x0] = 1; G.grid[y][x1] = 1; }
      if (G.sdRock) for (var xx = x0; xx <= x1; xx++) { G.sdRock[y0 * cols + xx] = 1; G.sdRock[y1 * cols + xx] = 1; }
    }
    if (typeof G.sdActive !== 'undefined') G.sdActive = true;
    G.wallKind = null; BH.render();
    var shrunk = stat();
    // 下一局（同尺寸）→ 舊版會把上面那份分類原封不動套上去
    BH.buildBattleRound(); G.state = 'play'; G.countdown = 0;
    BH.render();
    var next = stat();
    return { before: before, shrunk: shrunk, nextRound: next };
  })()`);

  console.log(WHICH + '  開局(牆/不畫)=' + r.before + '  縮圈後=' + r.shrunk + '  下一局=' + r.nextRound);
  // 縮到整張圖都看得到，截「下一局」那張
  // 新版才有氛圍層的 NaN 防護；舊版在縮放時可能拋錯，所以包 try
  await p.eval(`(function(){var BH=window.__BH,G=BH.Game;var cv=document.getElementById('cv');
    try{
      var zz=Math.min(cv.width/((G.cols+2.4)*G.T),cv.height/((G.rows+2.4)*G.T));
      G.zoom=(isFinite(zz)&&zz>.05)?zz:1; if(BH.updateCamera)BH.updateCamera(); BH.render();
    }catch(e){ G.zoom=1; BH.render(); }
    return 1;})()`);
  await sleep(200);
  const rr = await p.eval(`(function(){var cv=document.getElementById('cv');var q=cv.getBoundingClientRect();return {l:q.left,t:q.top,w:q.width,h:q.height};})()`);
  const shot = await p.send('Page.captureScreenshot', { format: 'png', clip: { x: rr.l, y: rr.t, width: rr.w, height: rr.h, scale: 1 } });
  const fs = require('fs');
  const dir = path.join(__dirname, '_v464');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, 'carry-' + (process.argv[2] === 'old' ? 'old' : 'new') + '.png'), Buffer.from(shot.data, 'base64'));
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
