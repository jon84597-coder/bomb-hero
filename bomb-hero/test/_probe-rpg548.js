// test/_probe-rpg548.js — v5.48：第 4 格 = 1 點 ＋ 金幣（實機畫面＋行為）
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, '_v548');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}

(async () => {
  const b = await launch({ w: 470, h: 980, port: 9372 });
  const p = await b.newPage();
  await p.resize(430, 932, true);
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.goto('http://127.0.0.1:3111/', 2200);

  const setup = await p.eval(`(function(){
    var out = {};
    try { __BH.Shop.addGold(9000); } catch (e) { out.goldErr = String(e); }
    out.gold = __BH.Shop.gold();
    __BH.rpgSetTotal(20);
    __BH.RPG.alloc = { hp: 3, def: 3, spd: 3, atk: 3 };
    __BH.RPG.paid = { hp: 0, def: 0, spd: 0, atk: 0 };
    __BH.RPG.bought = 0;
    out.left = __BH.rpgLeft();
    __BH.Screen.show('rpg');
    __BH.Rpg.render();
    return out;
  })()`);
  console.log('setup   ', JSON.stringify(setup));
  await sleep(700);

  const before = await p.eval(`(function(){
    var rows = {};
    ['hp','def','spd','atk'].forEach(function(k){
      var r = document.querySelector('.rpgrow[data-k="'+k+'"]');
      var bs = r.querySelectorAll('.rpgstep button');
      var plus = bs[bs.length-1];
      rows[k] = plus.textContent + (plus.disabled ? '(禁用)' : '');
    });
    return { rows: rows,
      hint: (document.getElementById('rpgLeft')||{}).textContent,
      gold: __BH.Shop.gold() };
  })()`);
  console.log('before  ', JSON.stringify(before));
  await p.shot(path.join(OUT, 'rpg-pt-gold.png'));

  // 點「生命」的第 4 格：應該同時扣 1 點與 2000 金幣
  await p.eval(`(function(){
    var r = document.querySelector('.rpgrow[data-k="hp"]');
    var bs = r.querySelectorAll('.rpgstep button');
    bs[bs.length-1].click();
  })()`);
  await sleep(600);
  const after = await p.eval(`(function(){
    return { hp: __BH.RPG.alloc.hp, gold: __BH.Shop.gold(), left: __BH.rpgLeft(),
             bought: __BH.RPG.bought, paid: __BH.RPG.paid.hp,
             leftTxt: (document.getElementById('rpgLeft')||{}).textContent,
             toast: (document.getElementById('toast')||{}).textContent || '' };
  })()`);
  console.log('after+1 ', JSON.stringify(after));
  await p.shot(path.join(OUT, 'rpg-pt-gold-after.png'));

  // 點數用完 → 按鈕全鎖
  await p.eval(`(function(){
    __BH.RPG.alloc = { hp: 5, def: 5, spd: 5, atk: 5 };
    __BH.rpgSetTotal(20);
    __BH.Rpg.renderStats();
  })()`);
  await sleep(400);
  const locked = await p.eval(`(function(){
    var n = document.querySelectorAll('#rpgRows .rpgstep button[data-d="1"][disabled]').length;
    return { disabled: n, left: __BH.rpgLeft() };
  })()`);
  console.log('locked  ', JSON.stringify(locked));
  await p.shot(path.join(OUT, 'rpg-pt-locked.png'));

  // 第 1 隻王：進第 5 關看血條格數
  await p.eval(`(function(){
    try { __BH.Game.daily = false; __BH.settings.soloDiff = 'normal'; } catch(e){}
    document.body.classList.add('touch','in-game');
    __BH.startSolo(5);
    __BH.Game.state = 'play';
    __BH.ovHide();
    var bk = document.querySelector('.ovback'); if (bk) bk.style.display='none';
    var rh = document.getElementById('rotHint'); if (rh) rh.remove();
    try { localStorage.setItem('bombhero-rotskip','1'); } catch(e){}
  })()`);
  await sleep(1400);
  const boss = await p.eval(`(function(){
    var a = __BH.Game.bossArena; var b = a && a.boss;
    return { hp: b && b.hp, maxHp: b && b.maxHp, shield: a && a.shield, shieldMax: a && a.shieldMax };
  })()`);
  console.log('boss    ', JSON.stringify(boss));
  await p.shot(path.join(OUT, 'boss5-hp.png'));

  b.close();
})().catch(e => { console.error('PROBE FAIL', e && e.stack || e); process.exit(1); });
