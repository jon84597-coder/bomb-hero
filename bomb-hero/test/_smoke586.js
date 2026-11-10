// test/_smoke586.js —— 真瀏覽器冒煙：HUD 金幣、過關結算、隨從等級、核彈音效
const { launch, sleep } = require('./cdp');
const path = require('path');

(async () => {
  const b = await launch({ port: 9941, w: 430, h: 932 });
  let bad = 0;
  function ok(c, m, x) {
    console.log((c ? '  ✓ ' : '  ✗ FAIL: ') + m + (x === undefined ? '' : ' → ' + JSON.stringify(x)));
    if (!c) bad++;
  }
  try {
    const p = await b.newPage();
    const url = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/') + '?auto=1';
    await p.goto(url, 12000);
    for (let i = 0; i < 120; i++) { if (await p.eval('!!(window.__BH && window.__BH.Game)')) break; await sleep(250); }
    await sleep(600);

    ok(await p.eval('__BH.VERSION === "5.86"'), '版本 5.86', await p.eval('__BH.VERSION'));

    // ① 開一關，模擬炸 40 塊磚
    const r1 = await p.eval(`(function(){
      var B=window.__BH, G=B.Game;
      B.setDevBuild(false);
      B.WeekMod.pin([]);
      B.startSolo(4,false,false);
      G.state='play';
      var me=G.players[0];
      for(var i=0;i<40;i++) B.addScore(me,10,2);
      try { B.updateHud(); } catch(e){}
      var hud=document.querySelector('[data-k="score"] b');
      return { score: me.score, coin: me.coin, hud: hud?hud.textContent:'(no hud)' };
    })()`);
    ok(r1.score === 400 && r1.coin === 80, '40 塊磚 → 分數 400／金幣 80（分家）', r1);
    ok(r1.hud === '80', '★ HUD 的 💰 顯示 80（不是 400）', r1.hud);

    // ② 走門過關
    const r2 = await p.eval(`(function(){
      var B=window.__BH, G=B.Game;
      var me=G.players[0];
      G.enemies.length=0;
      G.door={x:2,y:2,open:true,revealed:true};
      me.x=2*G.T+G.T/2; me.y=2*G.T+G.T/2;
      var g0=B.Shop.gold();
      B.updateSolo(1/60);
      return { gain: B.Shop.gold()-g0, state: G.state };
    })()`);
    ok(r2.gain === 80 + 65, '第 4 關：80 金幣 ＋ 過關 65 = 145（實得 ' + r2.gain + '）');
    ok(r2.state === 'roundover', '進入結算', r2.state);

    // ③ 隨從升到 Lv.5 → 重新載入頁面，等級要還在
    await p.eval(`(function(){
      var B=window.__BH;
      B.Shop.reset(); B.Shop.addGold(200000);
      B.Shop.buy('blade');
      for (var i=0;i<4;i++) B.Shop.upgrade('blade');
      return B.Shop.lvOf('blade');
    })()`);
    const lvBefore = await p.eval('__BH.Shop.lvOf("blade")');
    ok(lvBefore === 5, '升到 Lv.5', lvBefore);

    await p.goto(url, 12000);
    for (let i = 0; i < 120; i++) { if (await p.eval('!!(window.__BH && window.__BH.Shop)')) break; await sleep(250); }
    await sleep(800);
    const lvAfter = await p.eval('__BH.Shop.lvOf("blade")');
    ok(lvAfter === 5, '★ 重新載入後仍是 Lv.5（不再跳回 1）', lvAfter);

    // ④ 雲端合併（模擬舊快照沒有 lv）
    const lvMerge = await p.eval(`(function(){
      var B=window.__BH;
      var m=B.Save.merge({stage:1,gold:0,tickets:0,pets:[{kind:'blade',ch:0}]}, B.Shop.state());
      return m.pets[0] && m.pets[0].lv;
    })()`);
    ok(lvMerge === 5, '★ 舊雲端快照合併後仍是 Lv.5', lvMerge);

    // ⑤ 核彈音效：帶座標且不拋錯（近／遠各一次）
    const snd = await p.eval(`(function(){
      var B=window.__BH, G=B.Game;
      var err=null;
      try { B.AudioSys.sfx('nukeBoom', 100, 100); B.AudioSys.sfx('nukeBoom', 3000, 3000); } catch(e){ err=String(e); }
      return { err: err };
    })()`);
    ok(!snd.err, '核彈爆炸音效帶座標播放不拋錯', snd);

    const errs = await p.eval('(window.__BHB && window.__BHB.errs || []).length');
    ok(errs === 0, '頁面零啟動錯誤', errs);
  } finally {
    await b.close();
  }
  console.log(bad === 0 ? '\n✅ 冒煙全過' : '\n❌ ' + bad + ' 項失敗');
  process.exit(bad === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
