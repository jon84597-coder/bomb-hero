// test/_probe-respec546.js — 驗證 v5.46：第 4 格起收費 + 洗點退款（實際畫面）
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, '_v546');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}

(async () => {
  const b = await launch({ w: 470, h: 980, port: 9356 });
  const p = await b.newPage();
  await p.resize(430, 932, true);
  await p.goto('http://127.0.0.1:3111/', 2400);

  const setup = await p.eval(`(function(){
    var out = {};
    window.confirm = function () { return true; };
    try { __BH.Shop.addGold(20000); } catch (e) { out.err = String(e); }
    __BH.RPG.alloc = { hp: 5, def: 4, spd: 0, atk: 0 };
    __BH.RPG.paid = { hp: 2, def: 1, spd: 0, atk: 0 };
    __BH.RPG.bought = 3;
    __BH.Screen.show('rpg');
    __BH.Rpg.render();
    out.gold = __BH.Shop.gold();
    out.refund = __BH.rpgPaidRefund();
    out.info = __BH.rpgRespecInfo();
    out.left = __BH.rpgLeft();
    return out;
  })()`);
  console.log('setup   ', JSON.stringify(setup));
  await sleep(700);

  const rows = await p.eval(`(function(){
    var out = [];
    document.querySelectorAll('.rpgrow').forEach(function (r) {
      var bs = r.querySelectorAll('.rpgstep button');
      out.push({ k: r.getAttribute('data-k'), txt: bs[bs.length - 1].textContent, cls: bs[bs.length - 1].className });
    });
    return { rows: out, hint: (document.getElementById('rpgBuyHint') || {}).textContent || '',
             free: (document.querySelector('.field .hint') || {}).textContent || '' };
  })()`);
  console.log('rows    ', JSON.stringify(rows));
  await p.shot(path.join(OUT, 'respec-before.png'));

  await p.eval(`document.getElementById('btnRpgRespec').click()`);
  await sleep(900);

  const after = await p.eval(`(function(){
    return { gold: __BH.Shop.gold(), alloc: __BH.RPG.alloc, paid: __BH.RPG.paid,
             bought: __BH.RPG.bought, left: __BH.rpgLeft(),
             toast: (document.getElementById('toast') || {}).textContent || '' };
  })()`);
  console.log('after   ', JSON.stringify(after));
  await p.shot(path.join(OUT, 'respec-after.png'));

  b.close();
})().catch(function (e) { console.error('PROBE FAIL', e && e.stack || e); process.exit(1); });
