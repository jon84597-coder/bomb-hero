// test/_smoke487g.js —— v4.87 實機煙霧測試（真的開 Chrome 跑首頁 → 🎁 面板 → 簽到 → 任務 → 進關卡）
// 前置：在 bomb-hero/ 底下開 python -m http.server 8777
// 跑法：node test/_smoke487g.js
const { launch, sleep } = require('./cdp');
const URL = process.env.BH_URL || 'http://127.0.0.1:8777/index.html';
let pass = 0, fail = 0;
function ok(c, m, extra) {
  if (c) { pass++; console.log('  ✓ ' + m); }
  else { fail++; console.log('  ✗ FAIL: ' + m + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}
(async () => {
  console.log('目標：' + URL);
  const b = await launch({ w: 900, h: 700 });
  const p = await b.newPage();
  await p.goto(URL + '?cb=' + Date.now(), 1200);
  for (let i = 0; i < 80; i++) { if (await p.eval('typeof __BH') === 'object') break; await sleep(250); }
  await sleep(600);

  ok(await p.eval('__BH.VERSION') !== null, '頁面載入、VERSION 讀得到（' + await p.eval('__BH.VERSION') + '）');
  ok(await p.eval("document.getElementById('bootDiag').className").then(c => String(c).indexOf('hide') >= 0), '沒有出現「模組載入失敗」警告');
  ok(await p.eval('typeof __BH.Gift === "object" && typeof __BH.GiftUI === "object"'), 'Gift／GiftUI 都初始化成功');

  // ① 🎁 按鈕在首頁左下角，而且看得到
  const btn = await p.eval(`(function(){
    const b = document.getElementById('giftBtn');
    if (!b) return null;
    const r = b.getBoundingClientRect();
    const cs = getComputedStyle(b);
    return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width),
             vis: cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > .2,
             alert: b.classList.contains('alert') };
  })()`);
  ok(btn && btn.w >= 44 && btn.vis, '🎁 按鈕在首頁可見、尺寸 ≥44px', btn);
  ok(btn && btn.y > 300, '🎁 按鈕貼在畫面下半部（不擋選單）', btn);
  ok(btn && btn.alert === true, '今天還沒簽到 → 紅點亮著');

  // ② 打開面板
  await p.eval("document.getElementById('giftBtn').click();1");
  await sleep(450);
  const open = await p.eval(`(function(){
    const pn = document.getElementById('giftPanel');
    const cs = getComputedStyle(pn);
    const body = document.getElementById('giftBody');
    return { on: pn.classList.contains('on'), display: cs.display,
             days: body.querySelectorAll('.gday').length,
             rows: body.querySelectorAll('.gmrow').length,
             hasWeek: body.innerHTML.indexOf('gweek') >= 0,
             claimTxt: document.getElementById('giftClaim').textContent,
             title: document.getElementById('giftTitle').textContent };
  })()`);
  ok(open.on && open.display === 'block', '點 🎁 打開面板（.on / display:block）');
  ok(open.days === 7, '簽到日曆 7 格（實際 ' + open.days + '）');
  ok(open.rows === 3, '每日任務 3 列（實際 ' + open.rows + '）');
  ok(open.hasWeek, '每週榜區塊有畫出來');
  ok(open.title.indexOf('🎁') >= 0, '標題有翻譯（' + open.title + '）');
  await p.shot('test/_smoke487g-panel.png');

  // ③ 領簽到
  const before = await p.eval('__BH.Gift.checkin().done');
  await p.eval("document.getElementById('giftClaim').click();1");
  await sleep(500);
  const after = await p.eval(`(function(){
    return { done: __BH.Gift.checkin().done, streak: __BH.Gift._data().streak,
             gold: __BH.Shop ? __BH.Shop.state().gold : null,
             btn: document.getElementById('giftClaim').disabled };
  })()`);
  ok(before === false, '領之前是「今天還沒簽到」');
  ok(after.done === true && after.streak === 1, '點「領取」→ 簽到成功、連續 1 天', after);
  ok(after.btn === true, '領完按鈕變 disabled');
  ok(after.gold >= 120, '金幣真的進帳（' + after.gold + '）');

  // ④ 關閉 + 紅點熄掉
  await p.eval("document.getElementById('giftClose').click();1");
  await sleep(350);
  const closed = await p.eval(`(function(){
    return { on: document.getElementById('giftPanel').classList.contains('on'),
             alert: document.getElementById('giftBtn').classList.contains('alert') };
  })()`);
  ok(closed.on === false, '點 ✕ 關得掉面板');
  ok(closed.alert === false, '簽到領完 → 沒有其他可領時紅點熄掉');

  // ⑤ 打一關，驗三星資料流（不通關也能驗 hurtCount 與計時器初始化）
  await p.eval("__BH.startSolo(1);1");
  await sleep(900);
  const g = await p.eval(`(function(){
    const G = __BH.Game;
    return { mode: G.mode, st: G.state, hurt: G.hurtCount, tmax: G.timerMax, timer: G.timer,
             rows: (G.players||[]).length };
  })()`);
  ok(g.mode === 'solo' && g.rows === 1, '進得了單人第 1 關', g);
  ok(g.hurt === 0, '開場受傷次數是 0（三星判定起點）');
  ok(typeof g.tmax === 'number' && g.tmax > 0, 'timerMax 有記下來（' + g.tmax + '）');

  // ⑥ 說明頁的坐騎分頁要畫得出鴕鳥（不會白畫面 / 拋錯）
  const helpOk = await p.eval(`(function(){
    try {
      __BH.Screen.show('title');
      __BH.Help.setTab('ride');
      const box = document.getElementById('helpBody');
      const html = box ? box.innerHTML : '';
      return { len: html.length,
               ostrich: html.indexOf('ostrich') >= 0,
               purple: html.indexOf('purple') >= 0,
               canvas: box ? box.querySelectorAll('canvas').length : 0 };
    } catch (e) { return 'err:' + e.message; }
  })()`);
  ok(helpOk && helpOk.len > 500, '說明頁「坐騎」分頁畫得出來', helpOk);
  ok(helpOk && helpOk.ostrich && helpOk.purple, '說明頁有鴕鳥與紫蛋兩張卡', helpOk);
  ok(helpOk && helpOk.canvas >= 5, '坐騎小圖都畫出來了（' + (helpOk && helpOk.canvas) + ' 張）');
  await p.eval("__BH.Screen.show('title');1");
  await sleep(300);
  await p.eval("document.getElementById('giftBtn').click();1");
  await sleep(400);
  await p.shot('test/_smoke487g-panel2.png');

  console.log('\n========================================');
  console.log('v4.87 實機煙霧：' + pass + ' 通過 / ' + fail + ' 失敗');
  b.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('SMOKE ERROR', e); process.exit(2); });
