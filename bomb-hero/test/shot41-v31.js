// v3.1 目檢＋實測
//   A. PC 對戰獲勝畫面：獲獎人物縮小、「再來一場／回主選單」按鈕看得到
//   B. PC 對戰設定頁：右上角「開戰！」快捷鈕
//   C. 手機橫式單人關卡頁：右上角「開始遊戲」快捷鈕（不用滑到底）
//   D. 手機直式對戰設定頁：快捷鈕顯示且不超出螢幕
const path = require('path');
const { launch, sleep } = require('./cdp');
const URL = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const OUT = __dirname + '/';

async function emulatePhone(page) {
  await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await page.send('Emulation.setEmulatedMedia', { features: [
    { name: 'pointer', value: 'coarse' }, { name: 'hover', value: 'none' }] });
}
const BOX = `(function(sel){ var e=document.querySelector(sel); if(!e) return null;
  var b=e.getBoundingClientRect(); return { w:Math.round(b.width), h:Math.round(b.height),
    l:Math.round(b.left), r:Math.round(b.right), t:Math.round(b.top), b:Math.round(b.bottom) }; })`;

(async () => {
  // ---------- A. PC 獲勝畫面 ----------
  const br = await launch({ w: 1100, h: 560, port: 9471 });   // 模擬使用者截圖的矮 PC 視窗
  const page = await br.newPage();
  await page.goto(URL, 1800);
  await sleep(400);
  const a = await page.eval(`(function(){
    var P = window.__BH;
    P.settings.count = 4; P.Battle.resetSlots(); P.startBattle(); P.Game.state = 'play'; P.updateHud();
    P.showEnd('🏆 貓咪NANA 奪冠！', '比分：貓咪NANA 2 ／ 柴犬KIKI 1 ／ 青蛙GUGU 0 ／ 兔兔BIBI 0', true, 2);
    var box = ${BOX};
    return { cv: box('#winJumpCv'), again: box('#btnAgain'), home: box('#btnHome'),
             vh: window.innerHeight, shown: !document.querySelector('#ovIn').classList.contains('hide') };
  })()`);
  console.log('A. PC 1100×560 獲勝畫面:', JSON.stringify(a));
  console.log('   人物=' + a.cv.w + '×' + a.cv.h + '、按鈕 bottom=' + a.home.b + ' / 視窗高=' + a.vh +
              ' → ' + (a.home.b <= a.vh ? '按鈕看得到 ✓' : '超出 ✗'));
  await sleep(700);
  await page.shot(OUT + 'v31-1-pc-end.png');
  await page.eval(`(function(){ window.__BH.Game.endShown=false; document.querySelector('#ovIn').classList.add('hide'); return 1; })()`);
  await br.close();

  // ---------- B. PC 對戰設定頁 ----------
  const br2 = await launch({ w: 1100, h: 560, port: 9472 });
  const p2 = await br2.newPage();
  await p2.goto(URL, 1800);
  await sleep(400);
  await p2.eval(`(function(){ window.__BH.Screen.show('battle'); return 1; })()`);
  await sleep(400);
  const b = await p2.eval(`(function(){ var box = ${BOX};
    var bar = box('#ctaBar'), go = box('#btnStartBattle');
    return { cta: bar, go: go, txt: document.querySelector('#ctaBtn').innerText, vh: window.innerHeight,
             visible: document.querySelector('#ctaBar').getClientRects().length > 0 }; })()`);
  console.log('B. PC 對戰設定頁:', JSON.stringify(b));
  console.log('   快捷鈕 top=' + b.cta.t + ' right-緣=' + b.cta.r + '；主按鈕 bottom=' + b.go.b + ' / 視窗=' + b.vh +
              ' → ' + (b.go.b > b.vh ? '主按鈕在折疊線下（快捷鈕派上用場）' : '主按鈕一屏可見') + '、快捷鈕顯示=' + b.visible);
  await p2.shot(OUT + 'v31-2-pc-battle.png');
  await br2.close();

  // ---------- C. 手機橫式單人關卡頁 ----------
  const br3 = await launch({ w: 844, h: 390, port: 9473 });
  const p3 = await br3.newPage();
  await emulatePhone(p3);
  await p3.goto(URL, 1800);
  await sleep(500);
  await p3.eval(`(function(){ var P=window.__BH; P.settings.ctrl='touch'; P.applyCtrl(); P.Screen.show('solo'); return 1; })()`);
  await sleep(400);
  const c = await p3.eval(`(function(){ var box = ${BOX};
    var bar = box('#ctaBar'), go = box('#btnSoloGo');
    return { cta: bar, go: go, txt: document.querySelector('#ctaBtn').innerText, vw: window.innerWidth, vh: window.innerHeight,
             visible: document.querySelector('#ctaBar').getClientRects().length > 0 }; })()`);
  console.log('C. 手機橫式單人:', JSON.stringify(c));
  console.log('   快捷鈕 right=' + c.cta.r + ' / 視窗=' + c.vw + '、主按鈕 bottom=' + c.go.b + ' / 視窗=' + c.vh +
              ' → 快捷鈕顯示=' + c.visible);
  await p3.shot(OUT + 'v31-3-phone-solo.png');
  await br3.close();

  // ---------- D. 手機直式對戰設定頁 ----------
  const br4 = await launch({ w: 390, h: 844, port: 9474 });
  const p4 = await br4.newPage();
  await emulatePhone(p4);
  await p4.goto(URL, 1800);
  await sleep(500);
  await p4.eval(`(function(){ var P=window.__BH; P.settings.ctrl='touch'; P.applyCtrl(); P.Screen.show('battle'); return 1; })()`);
  await sleep(400);
  const d = await p4.eval(`(function(){ var box = ${BOX};
    var bar = box('#ctaBar');
    return { cta: bar, txt: document.querySelector('#ctaBtn').innerText, vw: window.innerWidth, vh: window.innerHeight,
             visible: document.querySelector('#ctaBar').getClientRects().length > 0 }; })()`);
  console.log('D. 手機直式對戰:', JSON.stringify(d));
  console.log('   快捷鈕右緣=' + d.cta.r + ' / 視窗=' + d.vw + ' → ' +
              (d.cta.r <= d.vw && d.cta.b <= d.vh && d.visible ? '顯示且不超出 ✓' : '超出/沒顯示 ✗'));
  await p4.shot(OUT + 'v31-4-phone-battle.png');
  await br4.close();
})().catch(e => { console.error(e); process.exit(1); });
