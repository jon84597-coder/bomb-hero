// test/shot-v484.js —— 下滑提示＋首頁橫屏重排 實測截圖
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');
const F = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const OUT = 'test/_v484/';
fs.mkdirSync(OUT, { recursive: true });

async function open(w, h, touch) {
  const b = await launch({ w, h });
  const p = await b.newPage();
  await p.send('Runtime.enable');
  await p.goto(F, 2500);
  for (let i = 0; i < 40; i++) {
    if (await p.eval('typeof __BH') === 'object') break;
    await sleep(200);
  }
  if (touch) await p.eval("document.body.classList.add('touch');1");
  await sleep(700);
  return { b, p };
}

(async () => {
  // ── 手機橫屏：首頁第一屏 → 滑到底 ──
  let { b, p } = await open(844, 390, true);
  await p.shot(OUT + 'ls-home-top.png');
  console.log('橫屏 首屏 hint =', await p.eval("document.getElementById('scrollHint').className"), 
    '| menu.y =', await p.eval("Math.round(document.getElementById('homeMenu').getBoundingClientRect().y)"));
  await p.eval("window.scrollTo(0, 9999);1");
  await sleep(500);
  await p.shot(OUT + 'ls-home-bottom.png');
  console.log('滑到底 hint =', await p.eval("document.getElementById('scrollHint').className"));
  await p.eval("window.scrollTo(0,0);1");
  await sleep(400);
  await p.eval("document.getElementById('btnMoreMenu').click();1");
  await sleep(600);
  await p.shot(OUT + 'ls-home-drawer.png');
  console.log('展開抽屜 hint =', await p.eval("document.getElementById('scrollHint').className"));
  try { await b.close(); } catch (e) {}

  // ── 手機橫屏：設定 / 說明 / 商店 / 單人 ──
  const pages = [['settings', 'ls-settings.png'], ['help', 'ls-help.png'], ['shop', 'ls-shop.png'], ['solo', 'ls-solo.png']];
  for (const [name, file] of pages) {
    ({ b, p } = await open(844, 390, true));
    await p.eval(`__BH.Screen.show(${JSON.stringify(name)});1`);
    await sleep(700);
    if (name === 'solo') await p.eval("try{__BH.Solo.renderGrid();__BH.Solo.renderChar();}catch(e){}1");
    if (name === 'help') await p.eval("try{__BH.Help.render();}catch(e){}1");
    await sleep(500);
    await p.shot(OUT + file);
    console.log(name, 'hint =', await p.eval("document.getElementById('scrollHint').className"),
      '| active =', await p.eval("window.ScrollHint && window.ScrollHint.active"));
    try { await b.close(); } catch (e) {}
  }

  // ── 手機豎屏首頁 ──
  ({ b, p } = await open(390, 844, true));
  await p.shot(OUT + 'pt-home.png');
  console.log('豎屏 hint =', await p.eval("document.getElementById('scrollHint').className"));
  try { await b.close(); } catch (e) {}

  // ── 桌機 ──
  ({ b, p } = await open(1280, 900, false));
  await p.shot(OUT + 'pc-home.png');
  console.log('桌機 hint 可見 =', await p.eval("getComputedStyle(document.getElementById('scrollHint')).display"));
  try { await b.close(); } catch (e) {}

  console.log('OK');
})().catch(e => { console.error(e); process.exit(1); });
