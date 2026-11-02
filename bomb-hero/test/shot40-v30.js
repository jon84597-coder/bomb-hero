// v3.0 目檢＋實測：首頁左上角「作者公告欄」
//   A. PC 寬螢幕（1440×900）：預設展開，左上角、不壓到 LOGO
//   B. PC 收起：只剩一顆小膠囊
//   C. 手機直式（390×844）：預設收起成膠囊，點一下展開可捲動
//   D. 非首頁（單人關卡頁）：公告欄不出現
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
  // ---------- A. PC 寬螢幕 ----------
  const br = await launch({ w: 1440, h: 900, port: 9461 });
  const page = await br.newPage();
  await page.goto(URL, 1800);
  await sleep(500);
  const a = await page.eval(`(function(){
    var box = ${BOX};
    var ann = box('#annBox'), logo = box('.title-logo');
    return { ver: window.__BH.VERSION, ann: ann, logo: logo,
             min: document.querySelector('#annBox').classList.contains('min'),
             bodyText: document.querySelector('#annBody').innerText.slice(0, 24),
             fb: document.querySelector('#annBody a').href,
             vw: window.innerWidth, vh: window.innerHeight };
  })()`);
  console.log('A. PC 1440×900:', JSON.stringify(a));
  console.log('   公告欄 left=' + a.ann.l + ' top=' + a.ann.t + ' 寬=' + a.ann.w +
              '｜LOGO left=' + a.logo.l + ' → ' + (a.ann.r <= a.logo.l ? '不壓到 LOGO ✓' : '重疊 ✗'));
  await sleep(400);
  await page.shot(OUT + 'v30-1-pc-open.png');

  // ---------- B. 收起 ----------
  await page.eval(`(function(){ window.__BH.setAnnMin(true); return 1; })()`);
  await sleep(300);
  const b = await page.eval(`(function(){ var box = ${BOX}; return { ann: box('#annBox'),
    min: document.querySelector('#annBox').classList.contains('min') }; })()`);
  console.log('B. 收起後：寬=' + b.ann.w + ' 高=' + b.ann.h + '（膠囊）、min=' + b.min);
  await page.shot(OUT + 'v30-2-pc-min.png');
  await br.close();

  // ---------- C. 手機直式 ----------
  const br2 = await launch({ w: 390, h: 844, port: 9462 });
  const p2 = await br2.newPage();
  await emulatePhone(p2);
  await p2.goto(URL, 1800);
  await sleep(500);
  await p2.eval(`(function(){ try{ localStorage.removeItem('bombhero.ann.min'); }catch(e){}
    var P=window.__BH; P.settings.ctrl='touch'; P.applyCtrl(); return 1; })()`);
  await p2.goto(URL, 1800);
  await sleep(500);
  const c1 = await p2.eval(`(function(){ var box = ${BOX};
    return { ann: box('#annBox'), min: document.querySelector('#annBox').classList.contains('min'),
             vw: window.innerWidth }; })()`);
  console.log('C1. 手機直式預設：' + JSON.stringify(c1) +
              ' → ' + (c1.min ? '收起成膠囊 ✓' : '展開 ✗') + '（寬 ' + c1.ann.w + '）');
  await p2.shot(OUT + 'v30-3-phone-min.png');

  // 點標題展開
  await p2.eval(`(function(){ document.querySelector('#annHead').click(); return 1; })()`);
  await sleep(350);
  const c2 = await p2.eval(`(function(){ var box = ${BOX}; var e=document.querySelector('#annBody');
    return { ann: box('#annBox'), body: box('#annBody'), min: document.querySelector('#annBox').classList.contains('min'),
             scrollable: e.scrollHeight > e.clientHeight + 2, vw: window.innerWidth, vh: window.innerHeight }; })()`);
  console.log('C2. 點開後：' + JSON.stringify(c2));
  console.log('   寬=' + c2.ann.w + '（視窗 ' + c2.vw + '）、底部=' + c2.ann.b + '（視窗高 ' + c2.vh + '）→ ' +
              (c2.ann.r <= c2.vw && c2.ann.b <= c2.vh ? '不超出螢幕 ✓' : '超出 ✗'));
  await p2.shot(OUT + 'v30-4-phone-open.png');
  await br2.close();

  // ---------- D. 非首頁不出現 ----------
  const br3 = await launch({ w: 1440, h: 900, port: 9463 });
  const p3 = await br3.newPage();
  await p3.goto(URL, 1800);
  await sleep(400);
  await p3.eval(`(function(){ var b=document.querySelector('#btnSolo'); if(b) b.click(); return 1; })()`);
  await sleep(400);
  const d = await p3.eval(`(function(){ var e=document.querySelector('#annBox');
    return { visible: e ? e.getClientRects().length > 0 : false,
             titleShown: document.querySelector('#scr-title').classList.contains('on') }; })()`);
  console.log('D. 進單人關卡頁：#annBox 有畫面=' + d.visible + '、首頁還在=' + d.titleShown +
              ' → ' + (!d.visible ? '公告欄已隱藏 ✓' : '仍顯示 ✗'));
  await p3.shot(OUT + 'v30-5-other-screen.png');
  await br3.close();
})().catch(e => { console.error(e); process.exit(1); });
