// test/_probe-rpgbuy.js — 驗證「免費點用完 → 金幣買點」的實際畫面與行為
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, '_v544');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}

(async () => {
  const b = await launch({ w: 470, h: 980, port: 9347 });
  const p = await b.newPage();
  await p.resize(430, 932, true);
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.goto('http://127.0.0.1:3111/', 2200);

  // 給金幣 5000、全部免費點花掉，然後進 RPG 配點畫面
  const setup = await p.eval(`(function(){
    var out = {};
    try { __BH.Shop.addGold(5000); } catch (e) { out.goldErr = String(e); }
    out.gold = __BH.Shop.gold();
    __BH.RPG.alloc = { hp: 10, def: 0, spd: 0, atk: 0 };
    __BH.RPG.bought = 0;
    out.total = __BH.rpgTotalPoints();
    out.left = __BH.rpgLeft();
    __BH.Screen.show('rpg');
    __BH.Rpg.render();          // 這一步才會 wire() 綁事件
    return out;
  })()`);
  console.log('setup', JSON.stringify(setup));
  await sleep(700);

  const btn = await p.eval(`(function(){
    var row = document.querySelector('.rpgrow[data-k="def"]');
    if (!row) return 'no-row';
    var bs = row.querySelectorAll('.rpgstep button');
    var plus = bs[bs.length-1];
    return { txt: plus.textContent, cls: plus.className, dis: plus.disabled,
             hint: (document.getElementById('rpgBuyHint')||{}).textContent || '',
             left: (document.getElementById('rpgLeft')||{}).textContent };
  })()`);
  console.log('button  ', JSON.stringify(btn));
  await p.shot(path.join(OUT, 'rpg-buy-before.png'));

  const clicked = await p.eval(`(function(){
    var row = document.querySelector('.rpgrow[data-k="def"]');
    var bs = row.querySelectorAll('.rpgstep button');
    bs[bs.length-1].click();
    return 1;
  })()`);
  await sleep(600);
  const after = await p.eval(`(function(){
    return { gold: __BH.Shop.gold(), def: __BH.RPG.alloc.def, bought: __BH.RPG.bought,
             left: __BH.rpgLeft(),
             toastTxt: (document.getElementById('coreToasts')||document.querySelector('.toasts')||{}).textContent || '' };
  })()`);
  console.log('after +1', JSON.stringify(after));
  await p.shot(path.join(OUT, 'rpg-buy-after.png'));

  // 金幣不足的情況
  const poor = await p.eval(`(function(){
    try { __BH.Shop.spend(__BH.Shop.gold()); } catch (e) {}
    __BH.RPG.bought = 0; __BH.RPG.alloc = { hp: 10, def: 0, spd: 0, atk: 0 };
    __BH.Rpg.render();
    var row = document.querySelector('.rpgrow[data-k="atk"]');
    var bs = row.querySelectorAll('.rpgstep button');
    var t0 = __BH.Shop.gold();
    var r = __BH.rpgBuyPoint('atk');
    return { gold: t0, ret: r, atk: __BH.RPG.alloc.atk, bought: __BH.RPG.bought };
  })()`);
  console.log('no gold ', JSON.stringify(poor));

  b.close();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
