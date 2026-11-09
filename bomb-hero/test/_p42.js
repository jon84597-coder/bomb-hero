/* _p42.js — v5.64 真瀏覽器驗收：金幣出口四項（重抽／復活／隨從升級／押注）
   全部走真 DOM＋真 localStorage，不靠讀原始碼猜。 */
const path = require('path');
const CDP = require('./cdp');
const OUT = path.join(__dirname, '_v564');
try { require('fs').mkdirSync(OUT, { recursive: true }); } catch (e) {}

(async function () {
  const br = await CDP.launch({ port: 9431, w: 900, h: 820 });
  const p = await br.newPage();
  let pass = 0, fail = 0;
  const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };
  const sec = (t) => console.log('\n=== ' + t + ' ===');
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const E = (code) => p.eval(code);

  try {
    /* ?unlock=all 是 unlock.js 內建的逃生口（首頁入口全部解鎖）。
       大逃殺入口正常要通關 6 關才開，探針用全新遊客 → 不解鎖的話
       btnBR 帶著 .locked，js/unlock.js 會在捕獲階段把點擊吃掉，卡片永遠長不出來。
       P42_URL 可指向正式站（v5.64 上線後跑一次線上驗收）。 */
    const BASE = process.env.P42_URL || 'http://localhost:4999/';
    await p.goto(BASE + '?unlock=all', BASE.indexOf('localhost') >= 0 ? 7000 : 14000);
    await wait(BASE.indexOf('localhost') >= 0 ? 2600 : 4200);

    sec('① 版本與基礎');
    const v = await E(`__BH.VERSION`);
    ok(!!v && Number(String(v).split('.')[1]) >= 64, '線上主檔 VERSION = ' + v);

    /* 這份主檔預設是「開發者版」（DEV_BUILD=true → 金幣 ∞、買東西不扣錢）。
       要驗金幣出口就得先關掉，否則 Shop.spend() 永遠回 ok 卻不扣款。 */
    const devOff = JSON.parse(await E(`(function(){
      var was = __BH.Shop.dev();
      __BH.setDevBuild(false);
      __BH.Shop.reset(); __BH.Shop.addGold(60000);
      return JSON.stringify({ was: was, now: __BH.Shop.dev(), gold: __BH.Shop.gold() });
    })()`) || '{}');
    ok(devOff.was === true && devOff.now === false, '★ 關掉開發者模式（金幣 ∞ → 真扣款）');
    ok(devOff.gold === 60000, '錢包是真的 60,000（' + devOff.gold + '）');

    /* ---------- ② 起手三選一：重抽 ＋ 鎖卡 ---------- */
    sec('② 起手強化：重抽與鎖卡');
    await E(`(function(){ __BH.Shop.reset(); __BH.Shop.addGold(60000);
      localStorage.removeItem('bombhero-revenge');
      __BH.startSolo(1); return 1; })()`);
    await wait(800);
    /* 開場卡上的那顆按鈕 → 才會彈起手三選一 */
    const opened = await E(`(async function(){
      var ov = document.getElementById('ovBox');
      var b = ov && ov.querySelector('button');
      if (b) b.click();
      await new Promise(function(r){ setTimeout(r, 500); });
      var bp = document.getElementById('buffPick');
      return !!(bp && bp.classList.contains('on'));
    })()`);
    ok(opened === true, '第一關出發 → 彈出起手三選一');

    const bar = JSON.parse(await E(`(function(){
      var r = document.getElementById('bpReroll');
      var lk = document.querySelectorAll('#bpRow .bplock');
      return JSON.stringify({ has: !!r, txt: r ? r.textContent : '', dis: r ? r.disabled : null,
        locks: lk.length, cards: document.querySelectorAll('#bpRow .bpcard').length });
    })()`) || '{}');
    ok(bar.has === true, '有重抽按鈕（#bpReroll）');
    ok(bar.cards === 3, '三張卡');
    ok(bar.locks === 3, '每張卡都有鎖頭');
    ok(/200/.test(bar.txt), '★ 第一次重抽顯示 200 金幣（' + bar.txt + '）');
    ok(bar.dis === false, '一開始可以按');

    /* 鎖第 1 張 → 重抽 → 那一張不能變 */
    const lockTest = JSON.parse(await E(`(function(){
      var cards = document.querySelectorAll('#bpRow .bpcard');
      var name0 = cards[0].querySelector('.bpname').textContent;
      cards[0].querySelector('.bplock').click();
      /* toggleLock 內部會 render() 重建 #bpRow → 舊節點已經不在畫面上，必須重查 */
      var on = document.querySelectorAll('#bpRow .bplock')[0].classList.contains('on');
      var g0 = __BH.Shop.gold();
      document.getElementById('bpReroll').click();
      var cards2 = document.querySelectorAll('#bpRow .bpcard');
      var name1 = cards2[0].querySelector('.bpname').textContent;
      var g1 = __BH.Shop.gold();
      return JSON.stringify({ on: on, same: name0 === name1, n0: name0, n1: name1,
        g0: g0, g1: g1, txt: document.getElementById('bpReroll').textContent });
    })()`) || '{}');
    ok(lockTest.on === true, '點鎖頭會鎖住');
    ok(lockTest.same === true, '★ 重抽後鎖住的那張沒被換掉（' + lockTest.n1 + '）');
    ok(lockTest.g0 - lockTest.g1 === 200, '★ 扣了 200 金幣（' + lockTest.g0 + ' → ' + lockTest.g1 + '）');
    ok(/400/.test(lockTest.txt), '第二次重抽漲到 400（' + lockTest.txt + '）');

    const twice = JSON.parse(await E(`(function(){
      var g0 = __BH.Shop.gold();
      document.getElementById('bpReroll').click();
      var g1 = __BH.Shop.gold();
      var t2 = document.getElementById('bpReroll').textContent;
      document.getElementById('bpReroll').click();
      return JSON.stringify({ d: g0 - g1, t: t2, dis: document.getElementById('bpReroll').disabled });
    })()`) || '{}');
    ok(twice.d === 400, '第三次扣 400');
    ok(twice.dis === true, '★ 三次用完之後按鈕變灰');

    await p.shot(path.join(OUT, 'p42-reroll.png'));

    /* 選一張進遊戲 */
    const picked = await E(`(function(){
      var c = document.querySelector('#bpRow .bpcard'); if (c) c.click();
      return { on: document.getElementById('buffPick').classList.contains('on'), st: __BH.Game.state };
    })()`);
    ok(picked.on === false, '選完面板關閉');
    await wait(400);

    /* ---------- ③ 局內復活 ---------- */
    sec('③ 局內復活');
    await wait(1200);
    const price = JSON.parse(await E(`(function(){
      __BH.Shop.reset(); __BH.Shop.addGold(30000);
      var g = __BH.Game, pl = g.players[0];
      g.state = 'play'; pl.lives = 0; pl.dead = true; pl.respawnT = 0.01; pl.alive = false;
      __BH.updateSolo(0.05);
      return JSON.stringify({ stage: g.stage });
    })()`) || '{}');
    await wait(600);
    const end1 = JSON.parse(await E(`(function(){
      var b = document.getElementById('btnRevive');
      return JSON.stringify({ has: !!b, txt: b ? b.textContent : '',
        gold: __BH.Shop.gold(), over: __BH.Game.state });
    })()`) || '{}');
    ok(end1.has === true, '★ 陣亡結算畫面有「原地復活」按鈕');
    ok(/340/.test(end1.txt), '第 1 關價格 340（' + end1.txt + '）');
    ok(end1.over === 'over', '這時遊戲是凍結的（over）');
    await p.shot(path.join(OUT, 'p42-revive.png'));

    const revived = JSON.parse(await E(`(function(){
      var b = document.getElementById('btnRevive'); if (b) b.click();
      var g = __BH.Game, pl = g.players[0];
      return JSON.stringify({ state: g.state, alive: !!pl.alive, dead: !!pl.dead,
        lives: pl.lives, hp: pl.sHp, hpMax: pl.sHpMax, used: !!g.revived,
        gold: __BH.Shop.gold() });
    })()`) || '{}');
    ok(revived.state === 'play', '★ 復活後解除凍結（state=play）');
    ok(revived.alive === true && revived.dead === false, '人站起來了');
    ok(revived.used === true, '本局已用過復活');
    ok(end1.gold - revived.gold === 340, '★ 扣了 340 金幣（' + end1.gold + ' → ' + revived.gold + '）');
    ok(revived.hpMax <= 1 || revived.hp <= Math.ceil(revived.hpMax / 2), '★ 只回半血（' + revived.hp + '/' + revived.hpMax + '）');

    /* 再用一次 → 不該再出現 */
    await E(`(function(){
      var g = __BH.Game, pl = g.players[0];
      g.state = 'play'; pl.lives = 0; pl.dead = true; pl.respawnT = 0.01; pl.alive = false;
      __BH.updateSolo(0.05);
      return 1;
    })()`);
    await wait(600);
    const noAgain = await E(`(function(){ return !document.getElementById('btnRevive'); })()`);
    ok(noAgain === true, '★ 同一局不能再復活第二次');

    /* ---------- ④ 隨從升級 ---------- */
    sec('④ 隨從升級');
    await E(`(function(){ __BH.Shop.reset(); __BH.Shop.addGold(200000); __BH.Shop.buy('blade'); return 1; })()`);
    const lv = JSON.parse(await E(`(function(){
      return JSON.stringify({ lv: __BH.Shop.lvOf('blade'), gold: __BH.Shop.gold() });
    })()`) || '{}');
    ok(lv.lv === 1, '★ 剛雇用是 Lv.1');
    const upUi = JSON.parse(await E(`(function(){
      __BH.Shop.open();
      var b = document.querySelector('[data-petup="blade"]');
      var row = b ? b.parentNode.parentNode : null;
      return JSON.stringify({ has: !!b, txt: b ? b.textContent : '', price: b ? b.parentNode.textContent : '',
        lvTxt: row ? row.textContent.slice(0, 60) : '' });
    })()`) || '{}');
    ok(upUi.has === true, '商店卡片有升級按鈕');
    ok(upUi.txt.length > 0, '按鈕有字（' + upUi.txt + '）');
    ok(/4[,\s]?000/.test(upUi.price), '顯示升級價 4,000');
    const uped = JSON.parse(await E(`(function(){
      var g0 = __BH.Shop.gold();
      var b = document.querySelector('[data-petup="blade"]'); if (b) b.click();
      return JSON.stringify({ lv: __BH.Shop.lvOf('blade'), d: g0 - __BH.Shop.gold() });
    })()`) || '{}');
    ok(uped.lv === 2, '★ 升級到 Lv.2');
    ok(uped.d === 4000, '★ 扣 4,000 金幣');
    await p.shot(path.join(OUT, 'p42-petup.png'));

    /* ---------- ⑤ 大逃殺押注 ---------- */
    sec('⑤ 大逃殺押注');
    await E(`(function(){
      /* 前面跑完復活流程後遊戲停在 over；首頁的入口才點得動，先收回標題畫面 */
      try { __BH.Game.state = 'idle'; } catch (e) {}
      var o = document.getElementById('ovBox'); if (o) o.classList.add('hide');
      var bp = document.getElementById('buffPick'); if (bp) bp.classList.remove('on');
      __BH.Shop.reset(); __BH.Shop.addGold(99999); return 1;
    })()`);
    await wait(200);
    const brOpen = await E(`(function(){
      var b = document.getElementById('btnBR');
      if (!b) return 'no-btn';
      if (b.classList.contains('locked')) return 'locked';
      b.click();
      return document.getElementById('brOv') ? 'ok' : 'no-ov';
    })()`);
    ok(brOpen === 'ok', '點大逃殺入口 → 卡片長出來（' + brOpen + '）');
    const betUi = JSON.parse(await E(`(function(){
      var seg = document.querySelector('#brOv .brseg[data-k="bet"]');
      var bs = seg ? seg.querySelectorAll('b') : [];
      var out = []; for (var i=0;i<bs.length;i++) out.push(bs[i].textContent.trim());
      return JSON.stringify({ has: !!seg, n: bs.length, labels: out, def: __BH.BR.opt.bet });
    })()`) || '{}');
    ok(betUi.has === true, '★ 大逃殺卡片有押注列');
    ok(betUi.n === 4, '四個選項（' + (betUi.labels || []).join('／') + '）');
    ok(betUi.def === 0, '預設不押注');
    const betPick = JSON.parse(await E(`(function(){
      var seg = document.querySelector('#brOv .brseg[data-k="bet"]');
      if (!seg) return JSON.stringify({ err: 'no-seg' });
      var b = seg.querySelector('b[data-v="500"]'); if (b) b.click();
      var on = seg.querySelector('b.on');
      return JSON.stringify({ v: __BH.BR.opt.bet, on: on ? on.getAttribute('data-v') : null });
    })()`) || '{}');
    ok(betPick.v === 500, '★ 點 500 真的寫進 BR.opt.bet');
    ok(betPick.on === '500', '選中的那一顆會亮');
    const betOff = JSON.parse(await E(`(function(){
      var seg = document.querySelector('#brOv .brseg[data-k="bet"]');
      if (!seg) return JSON.stringify({ err: 'no-seg' });
      var b = seg.querySelector('b[data-v="0"]'); if (b) b.click();
      return JSON.stringify({ v: __BH.BR.opt.bet });
    })()`) || '{}');
    ok(betOff.v === 0, '★ 可以選回「不押注」（0 沒有被 || 1 吃掉）');

    /* 出發當下就要扣款（不能等結算，否則關視窗就逃帳） */
    const charged = JSON.parse(await E(`(function(){
      __BH.Shop.reset(); __BH.Shop.addGold(5000);
      var g0 = __BH.Shop.gold();
      var seg = document.querySelector('#brOv .brseg[data-k="bet"]');
      seg.querySelector('b[data-v="500"]').click();
      document.getElementById('brGo').click();
      return JSON.stringify({ g0: g0, g1: __BH.Shop.gold(), bet: __BH.Game.brBet | 0 });
    })()`) || '{}');
    ok(charged.g0 - charged.g1 === 500, '★ 出發就扣 500（' + charged.g0 + ' → ' + charged.g1 + '）');
    ok(charged.bet === 500, '★ 記在 Game.brBet 等結算（' + charged.bet + '）');
    await wait(1200);
    await p.shot(path.join(OUT, 'p42-bet.png'));

    /* ---------- ⑥ 例外 ---------- */
    sec('⑥ 例外');
    const errs = await E(`(window.__errs && window.__errs.length) || 0`);
    ok(!errs, '沒有未捕捉例外（' + errs + ' 筆）');

  } catch (e) {
    fail++;
    console.log('  ✗ 例外：' + (e && e.message || e));
  }
  console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + ' 通過 / ' + fail + ' 失敗');
  try { await br.close(); } catch (e) {}
  process.exit(fail ? 1 : 0);
})();
