// v4.51：地圖生成測試關 —— 實機截圖與量測（手機直放／手機橫放／桌機）
//   node test/shot-v451-map.js
//   BH_URL=... node test/shot-v451-map.js
//   BH_LEVEL=1..5  只拍某一檔（預設全拍）
const fs = require('fs');
const path = require('path');
const { launch, sleep } = require('./cdp');
const URL = process.env.BH_URL || ('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
const OUT = path.join(__dirname, '_v451');
const ONLY = parseInt(process.env.BH_LEVEL || '0', 10);

let pass = 0, fail = 0;
function ok(c, n, extra) {
  if (c) { pass++; console.log('  ✓ ' + n); }
  else { fail++; console.log('  ✗ FAIL: ' + n + (extra ? ' :: ' + extra : '')); }
}

async function run(port, W, H, mobile, label) {
  const b = await launch({ port, w: W, h: H });
  const p = await b.newPage();
  await p.send('Emulation.setDeviceMetricsOverride', {
    width: W, height: H, deviceScaleFactor: 1, mobile: !!mobile
  });
  if (mobile) await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  // 手機直放會先彈「建議轉橫式」並暫停遊戲 → 必須在頁面載入前就寫好跳過旗標
  await p.send('Page.addScriptToEvaluateOnNewDocument', {
    source: "try{localStorage.setItem('bombhero-rotskip','1');localStorage.setItem('bombhero-zoomtip','1');}catch(e){}"
  });

  for (let lv = 1; lv <= 5; lv++) {
    if (ONLY && lv !== ONLY) continue;
    await p.goto(URL + '?maptest=' + lv, mobile ? 3600 : 3600);
    await p.eval("try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}");
    if (mobile) {
      await p.eval("(function(){var B=window.__BH;B.settings.ctrl='touch';B.applyCtrl();document.body.classList.add('touch');})()");
      await sleep(350);
    }
    // 按掉「出發」→ 進 countdown → 輪詢到 play（手機第一次載入慢，固定等待會誤判）
    await p.eval("(function(){var b=document.querySelector('.overlay-in .mbtn'); if(b)b.click();})()");
    await sleep(700);
    // 第一次載入時 overlay 可能還沒進場 → 補點一次
    if ((await p.eval("window.__BH.Game.state")) === 'idle') {
      await p.eval("(function(){var b=document.querySelector('.overlay-in .mbtn')||document.querySelector('.overlay .mbtn'); if(b)b.click();})()");
    }
    for (let t = 0; t < 24; t++) {
      await sleep(420);
      const st0 = await p.eval("window.__BH.Game.state");
      if (st0 === 'play') break;
    }

    const st = JSON.parse(await p.eval(`(function(){
      var B=window.__BH, G=B.Game, cv=document.getElementById('cv');
      var r=cv.getBoundingClientRect();
      var sp=G.spawnCell||{x:1,y:1};
      function cnt(){var n=0;for(var y=0;y<G.rows;y++)for(var x=0;x<G.cols;x++)if(G.grid[y][x]!==1)n++;return n;}
      return JSON.stringify({
        state:G.state, cols:G.cols, rows:G.rows, T:G.T, big:!!G.bigMap, zoom:G.zoom,
        spawn:[sp.x,sp.y], foes:G.enemies.length, floor:cnt(),
        canvas:[Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)],
        mapW:G.T*G.cols, mapH:G.T*G.rows,
        viewW:G.viewW||null, door:G.door?[G.door.x,G.door.y]:null,
        warps:(G.warps||[]).length
      });})()`));

    console.log('[' + label + '] T' + lv + '：' + JSON.stringify(st));
    ok(st.state === 'play', label + ' T' + lv + '：真的進到遊戲（state=' + st.state + '）');
    ok(st.big === true, label + ' T' + lv + '：bigMap 生效');
    ok(st.T >= 18, label + ' T' + lv + '：格子不小於 18px（' + st.T + 'px）');
    ok(st.mapW <= W * 1.03 || st.T <= 18,
      label + ' T' + lv + '：寬度整張可見或已用 18px 下限（' + st.mapW + ' / 視窗 ' + W + '）');
    ok(st.mapH <= st.canvas[3] * 1.03 || st.T <= 18,
      label + ' T' + lv + '：高度整張可見或已用 18px 下限（' + st.mapH + ' / 畫布 ' + st.canvas[3] + '）');
    const wantN = [0, 100, 150, 200, 250, 300][lv];
    ok(st.floor > 0 && Math.abs(st.floor - wantN) / wantN <= .08,
      label + ' T' + lv + '：可走格 ' + st.floor + ' 格（目標 ' + wantN + '）');

    const shot = path.join(OUT, label + '-T' + lv + '.png');
    await p.shot(shot);
    console.log('    → ' + shot);
  }
  await b.close();
}

(async () => {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  await run(9501, 390, 844, true, 'portrait');
  await run(9502, 844, 390, true, 'landscape');
  await run(9503, 1280, 800, false, 'desktop');
  console.log('\n========================================');
  console.log('v4.51 截圖：' + pass + ' 通過 / ' + fail + ' 失敗');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
