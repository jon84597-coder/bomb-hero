// test/_smoke587.js —— 真瀏覽器冒煙：磚幣封頂、過關基數、深淵入場、外觀購買、重載持久
const { launch, sleep } = require('./cdp');
const path = require('path');

(async () => {
  const b = await launch({ port: 9947, w: 430, h: 932 });
  let bad = 0;
  function ok(c, m, x) {
    console.log((c ? '  ✓ ' : '  ✗ FAIL: ') + m + (x === undefined ? '' : ' → ' + JSON.stringify(x)));
    if (!c) bad++;
  }
  try {
    const p = await b.newPage();
    const url = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/') + '?auto=1';
    await p.goto(url, 14000);
    for (let i = 0; i < 120; i++) { if (await p.eval('!!(window.__BH && window.__BH.Game)')) break; await sleep(250); }
    await sleep(700);

    ok(await p.eval('__BH.VERSION === "5.87"'), '版本 5.87', await p.eval('__BH.VERSION'));
    ok(await p.eval('!!window.__BHSkins'), '外觀模組已載入');

    // ① 磚幣封頂
    const r1 = await p.eval(`(function(){
      var B=window.__BH, G=B.Game;
      B.setDevBuild(false); B.WeekMod.pin([]);
      B.startSolo(4,false,false);
      G.state='play';
      var me=G.players[0];
      for(var i=0;i<40;i++) B.addScore(me,10,B.brickCoinOf(me,2));
      try { B.updateHud(); } catch(e){}
      var hud=document.querySelector('[data-k="score"] b');
      return { score: me.score, coin: me.coin, hud: hud?hud.textContent:'(no hud)' };
    })()`);
    ok(r1.score === 400, '★ 40 塊磚分數仍 400（排行榜不受影響）', r1.score);
    ok(r1.coin === 60, '★ 金幣封頂在 60（原本 80）', r1.coin);
    ok(r1.hud === '60', 'HUD 的 💰 顯示 60', r1.hud);

    // ② 過關：75 + 60
    const r2 = await p.eval(`(function(){
      var B=window.__BH, G=B.Game, me=G.players[0];
      G.enemies.length=0;
      G.door={x:2,y:2,open:true,revealed:true};
      me.x=2*G.T+G.T/2; me.y=2*G.T+G.T/2;
      var g0=B.Shop.gold();
      B.updateSolo(1/60);
      return { gain: B.Shop.gold()-g0, state: G.state };
    })()`);
    ok(r2.gain === 60 + 75, '★ 第 4 關：60 金幣 ＋ 過關 75 = 135（實得 ' + r2.gain + '）');
    ok(r2.state === 'roundover', '進入結算', r2.state);

    // ③ 深淵入場費
    const r3 = await p.eval(`(function(){
      var B=window.__BH;
      var fee=B.Abyss.entryFee();
      B.Shop.setState({gold: 1000, tickets: 0, pets: []});
      var g0=B.Shop.gold();
      var r=B.Shop.spend(fee);
      return { fee: fee, ok: r && r.ok, spent: g0 - B.Shop.gold(), left: B.Shop.gold() };
    })()`);
    ok(r3.fee === 300, '深淵入場費 300', r3.fee);
    ok(r3.ok === true && r3.spent === 300 && r3.left === 700, '實扣 300、剩 700', r3);

    // ④ 外觀：兩段確認 → 扣款 → 直接換上
    const r4 = await p.eval(`(function(){
      var B=window.__BH, S=window.__BHSkins;
      B.Shop.setState({gold: 20000, tickets: 0, pets: []});
      var g0=B.Shop.gold();
      var first = S.buy('flame.plasma');            // 只是問
      var g1 = B.Shop.gold();
      var second = S.buy('flame.plasma');           // 真的買
      var g2 = B.Shop.gold();
      return { first: first, afterAsk: g0-g1, second: second, paid: g0-g2,
               own: !!S.state().own['flame.plasma'], eq: S.state().eq.flame, gold: g2 };
    })()`);
    ok(r4.first === false && r4.afterAsk === 0, '★ 第一次點只是「問」，不扣錢', r4.afterAsk);
    ok(r4.second === true && r4.paid === 6000, '★ 第二次點才扣 6,000', r4.paid);
    ok(r4.own === true && r4.eq === 'flame.plasma', '買到就擁有、直接換上', r4);
    ok(r4.gold === 14000, '餘額 14,000', r4.gold);

    // ⑤ 面板有價格標示
    const r5 = await p.eval(`(function(){
      var S=window.__BHSkins, B=window.__BH;
      try { S.open(true); } catch(e){}
      var n = document.querySelectorAll('#skinPanel .skitem.buy').length;
      var golds = document.querySelectorAll('#skinPanel .skitem.buy.ask').length;
      var el = document.querySelector('#skinPanel .skitem.buy small');
      var txt = el ? el.textContent : '';
      try { S.open(false); } catch(e){}
      return { buy: n, ask: golds, txt: txt };
    })()`);
    ok(r5.buy >= 1, '★ 面板標出金幣商品（' + r5.buy + ' 件）', r5.buy);
    ok(/6,000|15,000/.test(r5.txt), '價格帶千分位', r5.txt);

    // ⑥ 重載後仍擁有
    await p.goto(url, 14000);
    for (let i = 0; i < 120; i++) { if (await p.eval('!!(window.__BHSkins && window.__BHSkins.state)')) break; await sleep(250); }
    await sleep(500);
    const r6 = await p.eval('(function(){var s=window.__BHSkins.state();return {own:!!s.own["flame.plasma"],eq:s.eq.flame};})()');
    ok(r6.own === true && r6.eq === 'flame.plasma', '★ 重新載入後仍擁有並裝備中', r6);

    // ⑦ 啟動零錯誤
    const errs = await p.eval('(window.__BHB && window.__BHB.errs ? window.__BHB.errs.length : 0)');
    ok(errs === 0, '啟動零錯誤', errs);
  } catch (e) {
    console.error(e);
    bad++;
  } finally {
    await b.close();
  }
  console.log('\n' + (bad === 0 ? '全部通過' : bad + ' 項失敗'));
  process.exit(bad === 0 ? 0 : 1);
})();
