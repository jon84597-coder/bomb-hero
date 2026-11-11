// test/_smoke588.js —— 真瀏覽器冒煙：離線好友畫得出來、狀態五顆可切、重載後狀態還在
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');

(async () => {
  const b = await launch({ port: 9953, w: 430, h: 932 });
  let bad = 0;
  function ok(c, m, x) {
    console.log((c ? '  ✓ ' : '  ✗ FAIL: ') + m + (x === undefined ? '' : ' → ' + JSON.stringify(x)));
    if (!c) bad++;
  }
  try {
    const p = await b.newPage();
    const url = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/') + '?auto=1';
    await p.goto(url, 14000);
    for (let i = 0; i < 120; i++) { if (await p.eval('!!(window.__BH && window.__BH.Social)')) break; await sleep(250); }
    await sleep(600);

    ok(await p.eval('__BH.VERSION === "5.88"'), '版本 5.88', await p.eval('__BH.VERSION'));

    // ① 塞一個「離線好友」→ 好友分頁要畫得出來
    const r1 = await p.eval(`(function(){
      var S=window.__BH.Social, s=S._s, now=Date.now();
      s.me={pid:'p_self000001', name:'我', kind:'guest', seen:now, mode:'大廳', st:'auto', stx:''};
      s.friends=['p_off0000001'];
      s.fdata=[{pid:'p_off0000001', name:'離線阿明', ch:2, kind:'guest', gender:'男', region:'台北',
        seen:now-7200000, sec:3600, pts:20, wins:1, mode:'大逃殺', st:'busy', stx:'', tt:-1, avt:0, eq:[]}];
      s.list=[]; s.reqs=[]; s.blocks=[]; s.at=now; s.total=0;
      S.open('friend');
      var h=document.getElementById('onBody').innerHTML;
      return { name:h.indexOf('離線阿明')>=0, off:h.indexOf('⚪ 離線')>=0, busy:h.indexOf('⛔ 忙碌')>=0,
               cap:h.indexOf('好友 1 / 99')>=0 };
    })()`);
    ok(r1.name, '★ 離線好友畫得出來（以前整列消失）');
    ok(r1.off, '顯示「⚪ 離線」');
    ok(r1.busy, '狀態標籤顯示「⛔ 忙碌」');
    ok(r1.cap, '抬頭寫「好友 1 / 99」');

    // ② 我的資料 → 五顆狀態按鈕
    await p.eval("window.__BH.Social.open('me')");
    await sleep(200);
    const r2 = await p.eval(`(function(){
      var n=document.querySelectorAll('[data-stpick]').length;
      var inp=!!document.getElementById('socStIn');
      var okb=!!document.getElementById('socStOk');
      return { n:n, inp:inp, okb:okb };
    })()`);
    ok(r2.n === 5, '五顆狀態按鈕', r2.n);
    ok(r2.inp && r2.okb, '有自訂輸入框與套用鍵');

    // ③ 點「忙碌」→ 狀態真的變
    const r3 = await p.eval(`(function(){
      var btns=document.querySelectorAll('[data-stpick]');
      for (var i=0;i<btns.length;i++) if (btns[i].getAttribute('data-stpick')==='busy') { btns[i].click(); break; }
      return { k: window.__BH.Social.status().k, stored: localStorage.getItem('bombhero-soc-v1') };
    })()`);
    ok(r3.k === 'busy', '★ 點「忙碌」→ 狀態變成 busy', r3.k);
    ok(r3.stored && r3.stored.indexOf('"busy"') > 0, '狀態寫進 localStorage');

    // ④ 自訂：空白被擋、有字才過
    const r4 = await p.eval(`(function(){
      var S=window.__BH.Social;
      var e=document.getElementById('socStIn'); e.value='   ';
      document.getElementById('socStOk').click();
      var afterBlank=S.status().k;
      e.value='打深淵中，勿擾'; document.getElementById('socStOk').click();
      return { afterBlank:afterBlank, k:S.status().k, x:S.status().x };
    })()`);
    ok(r4.afterBlank === 'busy', '自訂空白被擋（維持忙碌）', r4.afterBlank);
    ok(r4.k === 'custom' && r4.x === '打深淵中，勿擾', '★ 自訂文字生效', r4);

    // ⑤ 重新載入 → 狀態還在（本機持久化）
    await p.goto(url, 14000);
    for (let i = 0; i < 120; i++) { if (await p.eval('!!(window.__BH && window.__BH.Social)')) break; await sleep(250); }
    await sleep(500);
    const r5 = await p.eval('window.__BH.Social.status()');
    ok(r5.k === 'custom' && r5.x === '打深淵中，勿擾', '★ 重新載入後狀態仍是自訂文字', r5);

    // ⑥ 截圖（好友分頁＋我的資料）
    await p.eval("window.__BH.Social.open('friend')");
    await sleep(1500);                       // 等它真的打過心跳，再蓋上示範資料
    await p.eval(`(function(){
      var S=window.__BH.Social, s=S._s, now=Date.now();
      s.me={pid:'p_self000001', name:'我', kind:'guest', seen:now, mode:'大廳', st:'custom', stx:'打深淵中，勿擾'};
      s.friends=['p_off0000001','p_on00000001'];
      s.fdata=[{pid:'p_off0000001', name:'離線阿明', ch:2, kind:'guest', gender:'男', region:'台北',
        seen:now-7200000, sec:3600, pts:20, wins:1, mode:'大逃殺', st:'busy', stx:'', tt:-1, avt:0, eq:[]},
        {pid:'p_on00000001', name:'線上小美', ch:4, kind:'member', gender:'女', region:'高雄',
        seen:now, sec:7200, pts:55, wins:3, mode:'深淵探險', st:'auto', stx:'', tt:-1, avt:0, eq:[]}];
      s.list=[{pid:'p_on00000001', name:'線上小美', ch:4, kind:'member', gender:'女', region:'高雄',
        seen:now, sec:7200, pts:55, wins:3, mode:'深淵探險', st:'auto', stx:'', tt:-1, avt:0, eq:[]}];
      s.reqs=[]; s.blocks=[]; s.at=now; s.total=2;
      /* 只重畫，不呼叫 open()（open 會去打心跳，把剛塞的假資料蓋掉） */
      S._s.tab='friend'; S._s.view='list'; S.render();
    })()`);
    await sleep(300);
    let sh = await p.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(__dirname, '_smoke588a.png'), Buffer.from(sh.data, 'base64'));
    await p.eval("window.__BH.Social._s.tab='me'; window.__BH.Social.render()");
    await sleep(400);
    sh = await p.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(__dirname, '_smoke588b.png'), Buffer.from(sh.data, 'base64'));

    // ⑦ 啟動零錯誤
    const errs = await p.eval('(window.__BHB && window.__BHB.errs) ? window.__BHB.errs.length : 0');
    ok(!errs, '啟動零錯誤', errs);

    console.log(bad ? '\n✗ ' + bad + ' 項失敗' : '\n✅ 全部通過');
    process.exit(bad ? 1 : 0);
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
