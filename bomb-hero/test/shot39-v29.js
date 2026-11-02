// v2.9 目檢＋實測：對戰 HUD 玩家卡一橫排（右上）＋ 遊戲中鎖定畫面
//   A. PC 對戰（1280×720）：橫排玩家卡在右上、側欄消失、畫面左右延伸
//   B. 手機橫式對戰 8 人（844×390）：橫排塞得下
//   C. 拖曳方向鍵不會再捲動整頁（scrollY 不動、body.in-game）
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
  const br = await launch({ w: 1280, h: 720, port: 9451 });
  const page = await br.newPage();
  await page.goto(URL, 1800);
  await sleep(400);
  const a = await page.eval(`(function(){
    var P=window.__BH;
    P.settings.count=4; P.Battle.resetSlots(); P.startBattle(); P.Game.state='play'; P.updateHud();
    function box(sel){ var e=document.querySelector(sel); if(!e) return null;
      var b=e.getBoundingClientRect(); return { w:Math.round(b.width), h:Math.round(b.height),
        l:Math.round(b.left), r:Math.round(b.right), t:Math.round(b.top) }; }
    return { ver:P.VERSION, roster: box('#pkRoster'), stage: box('#stageWrap'),
             sideL: box('#sideL'), inGame: document.body.classList.contains('in-game') };
  })()`);
  console.log('A. PC 對戰 1280×720:', JSON.stringify(a));
  console.log('   畫布寬 =', a.stage && a.stage.w, 'px（側欄收掉後應接近滿版）、body.in-game =', a.inGame);
  await sleep(600);
  await page.shot(OUT + 'v29-1-pc-battle.png');

  // ---------- B/C. 手機橫式 ----------
  const br2 = await launch({ w: 844, h: 390, port: 9452 });
  const p2 = await br2.newPage();
  await emulatePhone(p2);
  await p2.goto(URL, 1800);
  await sleep(500);
  const b = await p2.eval(`(function(){
    var P=window.__BH; P.settings.ctrl='touch'; P.applyCtrl();
    P.settings.count=8; P.Battle.resetSlots(); P.startBattle(); P.Game.state='play'; P.updateHud();
    function box(sel){ var e=document.querySelector(sel); if(!e) return null;
      var b=e.getBoundingClientRect(); return { w:Math.round(b.width), h:Math.round(b.height),
        l:Math.round(b.left), r:Math.round(b.right), t:Math.round(b.top) }; }
    return { roster: box('#pkRoster'), stage: box('#stageWrap'), vw: window.innerWidth };
  })()`);
  console.log('B. 手機橫式 8 人:', JSON.stringify(b));
  if (b.roster) console.log('   橫排寬 =', b.roster.w, '/ 視窗 =', b.vw, '、右緣 =', b.roster.r, '（不可超出）');
  await sleep(600);
  await p2.shot(OUT + 'v29-2-phone-battle8.png');

  // ---------- C. 拖曳方向鍵不再捲動整頁 ----------
  const c0 = await p2.eval(`(function(){
    return { sy: window.scrollY, docH: document.body.scrollHeight, ih: window.innerHeight,
             pad: (function(){ var b=document.querySelector('#touchUI .tpad').getBoundingClientRect();
                                  return { x: Math.round(b.left+b.width/2), y: Math.round(b.top+b.height/2) }; })() };
  })()`);
  console.log('C0. 拖曳前 scrollY =', c0.sy, '、docH =', c0.docH, '/ vh =', c0.ih, '、搖桿中心', JSON.stringify(c0.pad));
  // 從搖桿中心往上拖 80px（模擬「方向鍵上下拖曳」）
  const x = c0.pad.x, y0 = c0.pad.y;
  await p2.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x, y: y0 }] });
  for (let i = 1; i <= 8; i++) {
    await p2.send('Input.dispatchTouchEvent', { type: 'touchMove',
      touchPoints: [{ x: x, y: y0 - i * 10 }] });
    await sleep(30);
  }
  await p2.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(200);
  const c1 = await p2.eval(`(function(){
    return { sy: window.scrollY, inGame: document.body.classList.contains('in-game'),
             pageShifted: (function(){ var b=document.querySelector('#stageWrap').getBoundingClientRect();
                                       return Math.round(b.top); })() };
  })()`);
  console.log('C1. 拖曳後 scrollY =', c1.sy, '（應為 0）、body.in-game =', c1.inGame,
              '、畫面 top =', c1.pageShifted, '→', c1.sy === 0 ? '畫面固定 ✓' : '仍會被拖走 ✗');
  await p2.shot(OUT + 'v29-3-after-drag.png');

  await br.close(); await br2.close();
  console.log('done');
})().catch(function (e) { console.error(e); process.exit(1); });
