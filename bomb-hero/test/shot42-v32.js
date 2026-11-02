// v3.2 目檢＋實測：玩家卡移到最上面工具列左側（紅框處）→ 遊戲畫面往上延伸
//   A. PC 對戰（1280×720）：玩家卡在左上工具列那條、畫布 top 變小
//   B. 手機橫式對戰 8 人（844×390）：玩家卡貼左上、不蓋工具列、畫布變大
const path = require('path');
const { launch, sleep } = require('./cdp');
const URL = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const OUT = __dirname + '/';

async function emulatePhone(page) {
  await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await page.send('Emulation.setEmulatedMedia', { features: [
    { name: 'pointer', value: 'coarse' }, { name: 'hover', value: 'none' }] });
}

(async () => {
  // ---------- A. PC 對戰 ----------
  const br = await launch({ w: 1280, h: 720, port: 9481 });
  const page = await br.newPage();
  await page.goto(URL, 1800);
  await sleep(400);
  const a = await page.eval(`(function(){
    var P=window.__BH;
    P.settings.count=4; P.Battle.resetSlots(); P.startBattle(); P.Game.state='play'; P.updateHud();
    function box(sel){ var e=document.querySelector(sel); if(!e) return null;
      var b=e.getBoundingClientRect(); return { w:Math.round(b.width), h:Math.round(b.height),
        l:Math.round(b.left), r:Math.round(b.right), t:Math.round(b.top), b:Math.round(b.bottom) }; }
    var nav = document.querySelector('#navBar .navright').getBoundingClientRect();
    var ro = box('#pkRoster');
    return { ver:P.VERSION, roster: ro, stage: box('#stageWrap'), navR: Math.round(nav.left),
             overlap: ro && ro.r > Math.round(nav.left) };
  })()`);
  console.log('A. PC 對戰 1280×720:', JSON.stringify(a));
  console.log('   玩家卡 top =', a.roster.t, '（應 ≈ 工具列同條）、右緣', a.roster.r, 'vs 工具列左緣', a.navR,
              '→', a.overlap ? '重疊 ✗' : '不重疊 ✓', '、畫布 top =', a.stage.t);
  await sleep(600);
  await page.shot(OUT + 'v32-1-pc-battle.png');

  // ---------- B. 手機橫式 8 人 ----------
  const br2 = await launch({ w: 844, h: 390, port: 9482 });
  const p2 = await br2.newPage();
  await emulatePhone(p2);
  await p2.goto(URL, 1800);
  await sleep(500);
  const b = await p2.eval(`(function(){
    var P=window.__BH; P.settings.ctrl='touch'; P.applyCtrl();
    P.settings.count=8; P.Battle.resetSlots(); P.startBattle(); P.Game.state='play'; P.updateHud();
    function box(sel){ var e=document.querySelector(sel); if(!e) return null;
      var b=e.getBoundingClientRect(); return { w:Math.round(b.width), h:Math.round(b.height),
        l:Math.round(b.left), r:Math.round(b.right), t:Math.round(b.top), b:Math.round(b.bottom) }; }
    var nav = document.querySelector('#navBar .navright').getBoundingClientRect();
    var ro = box('#pkRoster'), st = box('#stageWrap');
    return { roster: ro, stage: st, navL: Math.round(nav.left),
             overlap: ro && ro.r > Math.round(nav.left) };
  })()`);
  console.log('B. 手機橫式 8 人:', JSON.stringify(b));
  console.log('   玩家卡 top =', b.roster.t, '、右緣', b.roster.r, 'vs 工具列左緣', b.navL,
              '→', b.overlap ? '重疊（可橫捲）' : '不重疊 ✓', '、畫布 top =', b.stage.t, '（舊版約 70+）');
  await sleep(600);
  await p2.shot(OUT + 'v32-2-phone-battle8.png');
  await br.close(); await br2.close();
})().catch(e => { console.error(e); process.exit(1); });
