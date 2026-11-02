// 寒冰地圖截圖：找一個 ice 主題關卡，開場後截圖（PC + 手機）
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');

const OUT = path.join(__dirname, '_v423');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

async function shoot(p, tag) {
  // 找 ice 關卡
  const stage = await p.eval(`(function(){
    var P = window.__BH;
    for (var s = 1; s <= 32; s++) { try { if (P.soloInfo(s).theme === 2) return s; } catch(e){} }
    return 0;
  })()`);
  if (!stage) throw new Error('找不到冰關');
  console.log(tag, 'ice stage =', stage);
  await p.eval(`window.__BH.startSolo(${stage})`);
  await sleep(500);
  // 覆蓋層要「真的按出發」才會收起來（直接加 hide 會留著暗色遮罩）
  await p.eval(`(function(){
    var ov = document.getElementById('ovBox');
    var btn = ov && ov.querySelector('button');
    if (btn) btn.click();
    return !!btn;
  })()`);
  await sleep(900);
  // 手機直式會彈「橫著玩更過癮」→ 按「直式繼續玩」(#rhOk)
  await p.eval("(function(){ var b=document.getElementById('rhOk'); if(b){b.click(); return 'closed';} return 'none'; })()");
  await sleep(500);
  await p.eval(`(function(){
    var P = window.__BH;
    P.Game.gameT = 1.2;
    P.Game.camSnap = true;
    if (P.updateCamera) P.updateCamera();
    if (P.render) P.render();
    try { P.hideDoorHint && P.hideDoorHint(); } catch(e){}
  })()`);
  await sleep(400);
  await p.shot(path.join(OUT, tag + '-ice.png'));
  // 放大裁一塊：看四種元件的差異
  const T = await p.eval("window.__BH.Game.T");
  const info = await p.eval(`JSON.stringify({ T: window.__BH.Game.T, cols: window.__BH.Game.cols, rows: window.__BH.Game.rows,
    theme: window.__BH.Game.theme.name, hz: (function(){ var n=0; for (var y=0;y<window.__BH.Game.rows;y++){ var r=window.__BH.Game.hazards[y]||[]; for (var x=0;x<r.length;x++) if(r[x]) n++; } return n; })() })`);
  console.log(tag, info);
  return T;
}

(async () => {
  const b = await launch({ port: 9454, w: 1100, h: 760 });
  try {
    let p = await b.newPage();
    await p.send('Emulation.setDeviceMetricsOverride', { width: 1100, height: 760, deviceScaleFactor: 1, mobile: false });
    await p.goto(URL, 2600);
    await shoot(p, 'pc');
    await p.send('Target.closeTarget', { targetId: p.targetId });

    p = await b.newPage();
    await p.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await p.goto(URL, 2800);
    await shoot(p, 'phone');
    await p.send('Target.closeTarget', { targetId: p.targetId });
  } finally { b.close(); }
  console.log('done');
})();
