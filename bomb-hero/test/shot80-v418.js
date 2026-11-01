// test/shot80-v418.js —— v4.18 截圖（CDP 真瀏覽器）
//   ① 商店：分享拿金幣區（桌機／手機）
//   ② 暱稱留空 → 直接進遊戲（自動取名）
//   ③ 開發者金幣無限（錢包 ∞）
const { launch, sleep } = require('./cdp');
const fs = require('fs');
const path = require('path');

const URL_BASE = process.env.BH_URL || 'http://127.0.0.1:3000/';
const OUT = path.join(__dirname, '_v418');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const B = await launch({ port: 9381, w: 1280, h: 900 });
  const p = await B.newPage();
  const report = {};

  // ---------- ① 桌機商店 ----------
  await p.goto(URL_BASE, 2500);
  await sleep(600);
  await p.eval(`(function(){
    try { localStorage.clear(); } catch(e) {}
    __BH.Shop.addGold(3500);
    __BH.Game.state = 'menu';
    __BH.Screen.show('shop');
    __BH.Shop.render();
    return true;
  })()`);
  await sleep(700);
  report.desktop = await p.eval(`(function(){
    const g = document.getElementById('shareGrid');
    return JSON.stringify({
      scr: document.querySelector('.screen.on') ? document.querySelector('.screen.on').id : null,
      cards: document.getElementById('shopGrid').children.length,
      share: g ? g.children.length : 0,
      wallet: document.getElementById('shopWallet').textContent,
      shareNames: g ? Array.prototype.map.call(g.children, function(b){return b.textContent.trim();}) : [],
      over: document.documentElement.scrollWidth - window.innerWidth,
      scrollH: document.documentElement.scrollHeight, viewH: window.innerHeight
    });
  })()`);
  await p.shot(path.join(OUT, 'shop-share-desktop.png'));

  // ---------- ② 手機商店 ----------
  await p.resize(390, 844, true);
  await sleep(700);
  await p.eval('window.scrollTo(0, 0); true');
  await p.shot(path.join(OUT, 'shop-share-phone.png'));
  report.phone = await p.eval(`(function(){
    return JSON.stringify({
      over: document.documentElement.scrollWidth - window.innerWidth,
      scrollH: document.documentElement.scrollHeight, viewH: window.innerHeight,
      canScroll: document.documentElement.scrollHeight > window.innerHeight
    });
  })()`);
  // 捲到分享區
  await p.eval(`(function(){
    const s = document.querySelector('.sharesec');
    if (s) s.scrollIntoView({ block: 'center' });
    return true;
  })()`);
  await sleep(500);
  await p.shot(path.join(OUT, 'shop-share-phone-scrolled.png'));

  // ---------- ③ 開發者金幣無限 ----------
  await p.resize(1280, 900, false);
  await sleep(400);
  await p.eval(`(function(){
    __BH.Cloud.isDev = function(){ return true; };
    __BH.Shop.reset();
    __BH.Shop.open();
    return true;
  })()`);
  await sleep(600);
  report.dev = await p.eval(`(function(){
    const before = __BH.Shop.gold();
    const r = __BH.Shop.buy('blade');
    return JSON.stringify({
      dev: __BH.Shop.dev(), wallet: document.getElementById('shopWallet').textContent,
      hint: document.getElementById('shopGoldHint').textContent,
      buyOk: r.ok, goldBefore: before, goldAfter: __BH.Shop.gold(),
      btnTexts: Array.prototype.map.call(document.querySelectorAll('#shopGrid .shbuy'), function(b){return b.textContent;})
    });
  })()`);
  await p.shot(path.join(OUT, 'shop-dev-infinity.png'));

  // ---------- ④ 暱稱留空直接玩 ----------
  await p.eval(`(function(){
    __BH.Cloud.isDev = function(){ return false; };
    try { localStorage.removeItem('bombhero-settings'); } catch(e) {}
    return true;
  })()`);
  await p.goto(URL_BASE + '?t=' + Date.now(), 2600);
  await sleep(700);
  report.nickBefore = await p.eval('(function(){ return JSON.stringify({ name: __BH.settings.playerName, val: (document.getElementById("playerName")||{}).value }); })()');
  await p.eval(`(function(){
    const b = document.getElementById('btnSolo');
    if (b) b.click();
    return true;
  })()`);
  await sleep(900);
  report.nickAfter = await p.eval(`(function(){
    const on = document.querySelector('.screen.on');
    return JSON.stringify({
      name: __BH.settings.playerName,
      scr: on ? on.id : null,
      inputVal: (document.getElementById('playerName')||{}).value,
      toast: (document.getElementById('toast')||{}).textContent
    });
  })()`);
  await p.shot(path.join(OUT, 'nickname-blank.png'));

  console.log(JSON.stringify(report, null, 2));
  B.close();
})();
